import { useState, useEffect, useRef } from "react";
import DataTable from "../Component/DataTable";
import ActionBar from "../Component/ActionBar";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import ConfirmDelete from "../Component/ConfirmDelete";
import Modal from "../Component/Modal";
import {
  API,
  COLS_ENCABEZADO,
  COLS_ITEMS,
  cruzarConProduccion,
  grupoEfectivo,
  lineasActivasDe,
  PRESUPUESTOS_CSS,
  ItemsPanel,
} from "./presupuestosShared";

// Columnas de la lista principal en "Obras": COLS_ENCABEZADO sin Teléfono,
// Referencia, Estado, Por, Lista ni Última modificación (ya se ve al abrir
// el panel de ítems de la obra picada) — filtrado acá (no en
// presupuestosShared.jsx) para no afectar a ListaPresupuestos.jsx ni a
// ObrasConfirmadas.jsx, que siguen usando el set completo. Reconstruimos
// cada columna que necesitamos reordenar/renombrar en un objeto nuevo (no
// mutamos las entradas de COLS_ENCABEZADO) para no pisarle el label o el
// orden a las otras dos pantallas, que comparten el mismo array en memoria.
// Orden final pedido: Cliente, N° obra, Rev, Línea, Imágenes, Planos.
const colEncabezadoPorKey = (key) => COLS_ENCABEZADO.find((c) => c.key === key);

const COLS_OBRAS_BASE = [
  colEncabezadoPorKey("nombre"), // Cliente
  { ...colEncabezadoPorKey("numeropres"), label: "N° obra" },
  colEncabezadoPorKey("revision"), // Rev.
  colEncabezadoPorKey("linea1"), // Línea (usa formatLineas vía su propio render)
];

const BTN_ACCION_ARCHIVO_STYLE = {
  background: "none",
  border: "1px solid #b8cfe0",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
  padding: "3px 7px",
  color: "#3a7abf",
  lineHeight: 1,
  whiteSpace: "nowrap",
};

// Botón desplegable (▶/▼) para el resumen rápido de artículos — independiente
// de la selección de fila (que sigue disparando ItemsPanel al pie). onToggle
// recibe la fila entera porque el fetch de items necesita numeropres/revision.
const buildColsObras = (onImagenes, onPlanos, expandedId, onToggleExpand) => [
  {
    key: "__expand__",
    label: "",
    width: 36,
    render: (_, row) => (
      <button
        title="Ver artículos de la obra"
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand(row);
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          color: "#3a7abf",
          padding: 0,
          lineHeight: 1,
        }}
      >
        {expandedId === row.id ? "▼" : "▶"}
      </button>
    ),
  },
  ...COLS_OBRAS_BASE,
  {
    key: "__imagenes__",
    label: "Imágenes",
    render: (_, row) => (
      <button
        title="Imágenes de la obra"
        onClick={(e) => {
          e.stopPropagation();
          onImagenes(row);
        }}
        style={BTN_ACCION_ARCHIVO_STYLE}
      >
        🖼️ Imágenes
      </button>
    ),
  },
  {
    key: "__planos__",
    label: "Planos",
    render: (_, row) => (
      <button
        title="Planos de la obra"
        onClick={(e) => {
          e.stopPropagation();
          onPlanos(row);
        }}
        style={BTN_ACCION_ARCHIVO_STYLE}
      >
        📐 Planos
      </button>
    ),
  },
];

// ── Galería de archivos por obra (Imágenes / Planos) ────────────────────
// Sube contra /obras/:numeropres/archivos (ver
// obras/obras-archivos.controller.js en el backend). Igual que
// uploadImageToCloud en Productos.jsx, la subida NO usa authFetch (que
// fuerza Content-Type: application/json y rompe el multipart/form-data) —
// pega directo con fetch + el token crudo. Listar y borrar sí usan
// authFetch porque no llevan body multipart.
async function subirArchivoObra(numeropres, tipo, file, token) {
  const formData = new FormData();
  formData.append("archivo", file);
  formData.append("tipo", tipo);
  const res = await fetch(`${API}/obras/${numeropres}/archivos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    // Mensaje con status + texto del backend: sin esto, un 401 (token que no
    // llegó como prop), un 404 (router no montado en server.js) y un 500
    // (Cloudinary/tabla obra_archivos) se ven todos igual en pantalla.
    let detalle = "";
    try {
      const body = await res.json();
      detalle = body?.error || "";
    } catch {
      detalle = "";
    }
    throw new Error(
      `HTTP ${res.status}${detalle ? ` — ${detalle}` : ""}`,
    );
  }
  return res.json();
}

const getIconoArchivo = (archivo) => {
  if (archivo.resource_type === "image") return "🖼️";
  const ext = (archivo.nombre_original || "").split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📄";
  if (ext === "dwg" || ext === "dxf") return "📐";
  return "📎";
};

// "Obras": clon de ObrasConfirmadas.jsx (mismos endpoints, mismo filtro de
// 1 fila por numeropres con al menos una revisión confirmada) pero sin
// precio en la lista principal — usa COLS_ENCABEZADO (sin la columna
// Total) en vez de COLS_ENCABEZADO_CONFIRMADAS. El panel de ítems al
// seleccionar una fila sigue mostrando Precio u./Subtotal/Total igual que
// en Obras Confirmadas (no se tocó ItemsPanel) — decisión explícita: acá
// solo se sacó el Total de la lista, no todo lo que sea precio.

export default function Obras({
  onAbrirPresupuesto,
  onNuevoPresupuesto,
  authFetch,
  token,
}) {
  // "Obras Confirmadas" necesita 1 fila POR REVISIÓN confirmada (una obra
  // puede tener varias revisiones ya cerradas), así que usa un endpoint
  // distinto al de "Lista Presupuestos" (que trae solo 1 fila por
  // numeropres — la última revisión guardada).
  const [encabezados, setEncabezados] = useState([]);
  const [loadingEnc, setLoadingEnc] = useState(true);

  const [itemsDetalle, setItemsDetalle] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [produccionSeleccionada, setProduccionSeleccionada] = useState([]);
  const [melaminas, setMelaminas] = useState([]);
  const [guardandoColorId, setGuardandoColorId] = useState(null);
  const [errorColorId, setErrorColorId] = useState(null);

  const [manijas, setManijas] = useState([]);
  const [guardandoManijaId, setGuardandoManijaId] = useState(null);
  const [errorManijaId, setErrorManijaId] = useState(null);

  // Línea de precio confirmada por grupo (numeropres/revision seleccionado).
  // Formato { "ALACENAS": 0, "BAJO MESADA": 1 } — 0/1/2 → valor1/valor2/valor3.
  const [lineaPorGrupo, setLineaPorGrupo] = useState({});

  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const [presupuestoAEliminar, setPresupuestoAEliminar] = useState(null);
  const [eliminandoPresupuesto, setEliminandoPresupuesto] = useState(false);

  // Fila expandida (resumen rápido de artículos) — a propósito un estado
  // separado de `selected`: expandir NO selecciona la fila ni dispara el
  // ItemsPanel de abajo (que sigue funcionando igual, con color/manija/
  // línea de precio editables). Acá solo mostramos tipo/artículo/medidas.
  const [expandedId, setExpandedId] = useState(null);
  const [itemsExpandido, setItemsExpandido] = useState([]);
  const [loadingExpandido, setLoadingExpandido] = useState(false);
  // Línea por grupo de la fila EXPANDIDA (resumen rápido) — estado propio,
  // separado de lineaPorGrupo (que es de la fila SELECCIONADA/ItemsPanel),
  // porque ambas pueden estar activas a la vez sobre obras distintas.
  const [lineaPorGrupoExpandido, setLineaPorGrupoExpandido] = useState({});

  const toggleExpand = (row) => {
    setExpandedId((prev) => (prev === row.id ? null : row.id));
  };

  // { numeropres, tipo: "imagen" | "plano", nombre } | null
  const [archivosModal, setArchivosModal] = useState(null);
  const abrirImagenes = (row) =>
    setArchivosModal({ numeropres: row.numeropres, tipo: "imagen", nombre: row.nombre });
  const abrirPlanos = (row) =>
    setArchivosModal({ numeropres: row.numeropres, tipo: "plano", nombre: row.nombre });

  // ── Fetch encabezados ──────────────────────────────────────────────────

  const fetchEncabezados = () => {
    setLoadingEnc(true);
    authFetch(`${API}/tabla-presupuestos/revisiones-confirmadas`)
      .then((r) => r.json())
      .then((data) =>
        setEncabezados(
          Array.isArray(data)
            ? data.map((e) => ({
                ...e,
                id: `${e.numeropres}-${e.revision}`,
              }))
            : [],
        ),
      )
      .catch(console.error)
      .finally(() => setLoadingEnc(false));
  };

  useEffect(() => {
    fetchEncabezados();
    authFetch(`${API}/productos/melaminas`)
      .then((r) => r.json())
      .then((data) => setMelaminas(Array.isArray(data) ? data : []))
      .catch(console.error);
    authFetch(`${API}/productos/manijas`)
      .then((r) => r.json())
      .then((data) => setManijas(Array.isArray(data) ? data : []))
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch ítems + producción al seleccionar ───────────────────────────

  useEffect(() => {
    if (!selected) {
      setItemsDetalle([]);
      setProduccionSeleccionada([]);
      setLineaPorGrupo({});
      return;
    }
    setLoadingItems(true);
    Promise.all([
      authFetch(
        `${API}/tabla-presupuestos?numeropres=${selected.numeropres}&revision=${selected.revision}`,
      ).then((r) => r.json()),
      authFetch(
        `${API}/produccion?numeropres=${selected.numeropres}&revision=${selected.revision}`,
      ).then((r) => r.json()),
      authFetch(
        `${API}/tabla-presupuestos/linea-grupo/${selected.numeropres}/${selected.revision}`,
      ).then((r) => r.json()),
    ])
      .then(([items, produccion, lineaGrupo]) => {
        setItemsDetalle(Array.isArray(items) ? items : []);
        setProduccionSeleccionada(Array.isArray(produccion) ? produccion : []);
        setLineaPorGrupo(lineaGrupo?.lineaPorGrupo ?? {});
      })
      .catch(console.error)
      .finally(() => setLoadingItems(false));
  }, [selected]);

  // ── Selección ──────────────────────────────────────────────────────────

  const handleSelect = (row) => {
    setSelected(row?.id === selected?.id ? null : row);
  };

  // ── Filtro ─────────────────────────────────────────────────────────────

  const q = search.toLowerCase();

  // Presupuestos (numeropres) que tienen AL MENOS UNA revisión confirmada.
  // Una vez que un presupuesto quedó confirmado, todas sus revisiones
  // (incluidas las nuevas que se generen después, aunque su propio flag
  // "confirmado" todavía esté en 0) deben verse acá.
  const numeroprosConfirmados = new Set(
    encabezados.filter((e) => !!e.confirmado).map((e) => e.numeropres),
  );

  const filtradosBase = encabezados
    .filter((e) => numeroprosConfirmados.has(e.numeropres))
    .filter(
      (e) =>
        (e.nombre ?? "").toLowerCase().includes(q) ||
        String(e.numeropres ?? "").includes(q) ||
        (e.telefono1 ?? "").toLowerCase().includes(q) ||
        (e.telefono2 ?? "").toLowerCase().includes(q),
    );

  // El endpoint (/revisiones-confirmadas) trae 1 fila por CADA revisión
  // confirmada, no 1 por presupuesto — así, si un presupuesto tiene varias
  // revisiones ya confirmadas, aparecía repetido en la tabla. Acá lo
  // colapsamos a la última revisión de cada numeropres, igual que en "Lista
  // Presupuestos" (acá no hay botón de historial de revisiones). El SELECT
  // del backend ya viene ordenado numeropres DESC,
  // revision DESC, así que la primera ocurrencia de cada numeropres en el
  // array ya es la más nueva.
  const filtered = Array.from(
    filtradosBase
      .reduce((map, e) => {
        if (!map.has(e.numeropres)) map.set(e.numeropres, e);
        return map;
      }, new Map())
      .values(),
  );

  // Fetch liviano de ítems + producción + línea-por-grupo para el resumen
  // rápido del desplegable — producción da el código (_produccionCodpro y
  // _produccionColor, vía cruzarConProduccion) y linea-grupo permite
  // resolver qué línea de precio quedó confirmada para el grupo de cada
  // ítem (columnas "Color" y "Línea" del resumen).
  useEffect(() => {
    if (!expandedId) {
      setItemsExpandido([]);
      setLineaPorGrupoExpandido({});
      return;
    }
    const fila = filtered.find((f) => f.id === expandedId);
    if (!fila) return;
    setLoadingExpandido(true);
    Promise.all([
      authFetch(
        `${API}/tabla-presupuestos?numeropres=${fila.numeropres}&revision=${fila.revision}`,
      ).then((r) => r.json()),
      authFetch(
        `${API}/produccion?numeropres=${fila.numeropres}&revision=${fila.revision}`,
      ).then((r) => r.json()),
      authFetch(
        `${API}/tabla-presupuestos/linea-grupo/${fila.numeropres}/${fila.revision}`,
      ).then((r) => r.json()),
    ])
      .then(([items, produccion, lineaGrupo]) => {
        const cruzados = cruzarConProduccion(
          Array.isArray(items) ? items : [],
          Array.isArray(produccion) ? produccion : [],
        );
        setItemsExpandido(cruzados);
        setLineaPorGrupoExpandido(lineaGrupo?.lineaPorGrupo ?? {});
      })
      .catch(console.error)
      .finally(() => setLoadingExpandido(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedId, filtered.length]);

  const itemsConColor = cruzarConProduccion(
    itemsDetalle,
    produccionSeleccionada,
  );

  const totalSeleccionado = itemsDetalle.reduce(
    (s, it) => s + Number(it.valor1 ?? 0) * (Number(it.cantidad) || 1),
    0,
  );

  const handleColorChange = async (produccionId, valor) => {
    setProduccionSeleccionada((prev) =>
      prev.map((p) => (p.id === produccionId ? { ...p, color: valor } : p)),
    );
    setGuardandoColorId(produccionId);
    setErrorColorId(null);
    try {
      const res = await authFetch(`${API}/produccion/${produccionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: valor || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Error guardando color:", e);
      setErrorColorId(produccionId);
    } finally {
      setGuardandoColorId(null);
    }
  };

  const handleManijaChange = async (produccionId, valor) => {
    setProduccionSeleccionada((prev) =>
      prev.map((p) => (p.id === produccionId ? { ...p, manija: valor } : p)),
    );
    setGuardandoManijaId(produccionId);
    setErrorManijaId(null);
    try {
      const res = await authFetch(`${API}/produccion/${produccionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manija: valor || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Error guardando manija:", e);
      setErrorManijaId(produccionId);
    } finally {
      setGuardandoManijaId(null);
    }
  };

  // Confirma qué línea de precio (0/1/2) quedó vendida para un grupo. Envía
  // el objeto lineaPorGrupo COMPLETO (no solo el grupo tocado) — mismo
  // patrón que ya usa el editor con este mismo estado.
  const handleLineaGrupoChange = async (grupo, lineaIdx) => {
    if (!selected) return;
    const next = { ...lineaPorGrupo, [grupo]: lineaIdx };
    setLineaPorGrupo(next);
    try {
      const res = await authFetch(
        `${API}/tabla-presupuestos/linea-grupo/${selected.numeropres}/${selected.revision}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineaPorGrupo: next }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Error guardando línea por grupo:", e);
      // Revertir en caso de error, para no dejar la UI mintiendo sobre lo guardado.
      setLineaPorGrupo(lineaPorGrupo);
      alert(
        "No se pudo guardar la línea confirmada para ese grupo. Probá de nuevo.",
      );
    }
  };

  // ── DELETE presupuesto completo ───────────────────────────────────────

  const handleDeletePresupuesto = async () => {
    if (!presupuestoAEliminar) return;
    setEliminandoPresupuesto(true);
    try {
      const res = await authFetch(
        `${API}/tabla-indice/${presupuestoAEliminar.numeropres}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEncabezados((prev) =>
        prev.filter((e) => e.numeropres !== presupuestoAEliminar.numeropres),
      );
      if (selected?.numeropres === presupuestoAEliminar.numeropres)
        setSelected(null);
      setPresupuestoAEliminar(null);
    } catch (e) {
      console.error("Error borrando presupuesto:", e);
      alert("No se pudo borrar el presupuesto. Revisá la consola.");
    } finally {
      setEliminandoPresupuesto(false);
    }
  };

  // Resumen rápido del desplegable: variante de COLS_ITEMS (de
  // presupuestosShared.jsx) sin Sección ni Precio u./Subtotal — eso ya lo
  // muestra el ItemsPanel de abajo al seleccionar la fila — con "Artículo"
  // reemplazado por "Código" (codpro, de la tabla producción, cruzado en
  // el fetch de arriba vía cruzarConProduccion) y con Color/Línea sumadas
  // al final. No usa DataTable (resize/localStorage de anchos sería
  // overkill acá) sino una tabla simple embebida en la fila expandida, con
  // `width` fijo por columna (salvo Descripción, que se lleva el resto del
  // ancho) para que las columnas angostas no se estiren de más.
  const filaExpandida = filtered.find((f) => f.id === expandedId);
  const lineasActivasExpandido = lineasActivasDe(filaExpandida ?? {});

  const nombreColorDe = (codartint) => {
    if (!codartint) return "—";
    const m = melaminas.find((m) => m.codartint === codartint);
    return m?.articulo ?? codartint;
  };

  const nombreLineaDe = (it) => {
    const idx = lineaPorGrupoExpandido?.[grupoEfectivo(it)];
    if (idx == null) return "—";
    const linea = lineasActivasExpandido.find((l) => l.idx === idx);
    return linea?.nombre ?? "—";
  };

  const COLS_RESUMEN_ARTICULOS = [
    {
      key: "_produccionCodpro",
      label: "Código",
      width: 90,
      render: (v) => v ?? "—",
    },
    ...COLS_ITEMS.filter((c) => c.key === "nombreart"), // Descripción — sin width, se lleva el resto
    ...COLS_ITEMS.filter((c) => c.key === "cantidad").map((c) => ({ ...c, width: 60 })),
    ...COLS_ITEMS.filter((c) => c.key === "ancho").map((c) => ({ ...c, width: 70 })),
    ...COLS_ITEMS.filter((c) => c.key === "alto").map((c) => ({ ...c, width: 70 })),
    {
      key: "_color",
      label: "Color",
      width: 150,
      render: (_, it) => nombreColorDe(it._produccionColor),
    },
    {
      key: "_linea",
      label: "Línea",
      width: 130,
      render: (_, it) => nombreLineaDe(it),
    },
  ];

  const renderResumenArticulos = () => {
    if (loadingExpandido) {
      return (
        <p
          style={{
            margin: 0,
            padding: "8px 12px",
            color: "#4a8ab5",
            fontFamily: "'Space Mono', monospace",
            fontSize: 12,
          }}
        >
          ⏳ Cargando artículos...
        </p>
      );
    }
    if (itemsExpandido.length === 0) {
      return (
        <p style={{ margin: 0, padding: "8px 12px", color: "#888", fontSize: 12 }}>
          — Sin artículos —
        </p>
      );
    }
    return (
      <table
        style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontSize: 12 }}
      >
        <colgroup>
          {COLS_RESUMEN_ARTICULOS.map((c) => (
            <col key={c.key} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {COLS_RESUMEN_ARTICULOS.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: "left",
                  padding: "4px 12px",
                  borderBottom: "1px solid #d8e6f0",
                  color: "#3a7abf",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {itemsExpandido.map((it, i) => (
            <tr key={it.id ?? i}>
              {COLS_RESUMEN_ARTICULOS.map((c) => (
                <td
                  key={c.key}
                  style={{
                    padding: "4px 12px",
                    borderBottom: "1px solid #eef4f9",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.render ? c.render(it[c.key], it) : it[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <style>{PRESUPUESTOS_CSS}</style>

      <ScreenHeader
        icon="🏗️"
        title="Obras"
        subtitle="Presupuestos confirmados"
      />

      <StatCards
        stats={[
          { label: "Total confirmadas", value: numeroprosConfirmados.size },
          { label: "Filtrados", value: filtered.length },
        ]}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ActionBar
          selected={selected}
          onNew={onNuevoPresupuesto ?? null}
          onEdit={null}
          onDelete={selected ? () => setPresupuestoAEliminar(selected) : null}
          search={search}
          onSearch={setSearch}
        />
        {onAbrirPresupuesto && (
          <button
            className="btn-abrir"
            disabled={!selected}
            onClick={() => selected && onAbrirPresupuesto(selected)}
            title="Abrir este presupuesto en el editor"
          >
            📝 Abrir
          </button>
        )}
      </div>

      {loadingEnc ? (
        <p
          style={{
            padding: "24px",
            color: "#4a8ab5",
            fontFamily: "'Space Mono',monospace",
          }}
        >
          ⏳ Cargando presupuestos...
        </p>
      ) : (
        <DataTable
          columns={buildColsObras(abrirImagenes, abrirPlanos, expandedId, toggleExpand)}
          rows={filtered}
          selectedId={selected?.id}
          onSelect={handleSelect}
          storageKey="lista-obras"
          expandedRowId={expandedId}
          renderExpandedRow={renderResumenArticulos}
        />
      )}

      <ItemsPanel
        selected={selected}
        loadingItems={loadingItems}
        itemsConColor={itemsConColor}
        totalSeleccionado={totalSeleccionado}
        melaminas={melaminas}
        guardandoColorId={guardandoColorId}
        errorColorId={errorColorId}
        onChangeColor={handleColorChange}
        manijas={manijas}
        guardandoManijaId={guardandoManijaId}
        errorManijaId={errorManijaId}
        onChangeManija={handleManijaChange}
        lineaPorGrupo={lineaPorGrupo}
        onChangeLineaGrupo={handleLineaGrupoChange}
      />

      {presupuestoAEliminar && (
        <ConfirmDelete
          item={presupuestoAEliminar}
          title="¿Eliminar presupuesto completo?"
          message={
            <>
              Vas a eliminar el presupuesto{" "}
              <strong>
                N° {String(presupuestoAEliminar.numeropres).padStart(4, "0")}
              </strong>{" "}
              ({presupuestoAEliminar.nombre ?? "sin cliente"}) y{" "}
              <strong>TODAS sus revisiones</strong>. Esta acción no se puede
              deshacer.
            </>
          }
          onConfirm={handleDeletePresupuesto}
          onClose={() =>
            !eliminandoPresupuesto && setPresupuestoAEliminar(null)
          }
        />
      )}

      {archivosModal && (
        <ArchivosObraModal
          numeropres={archivosModal.numeropres}
          tipo={archivosModal.tipo}
          nombreObra={archivosModal.nombre}
          token={token}
          authFetch={authFetch}
          onClose={() => setArchivosModal(null)}
        />
      )}
    </>
  );
}

// ── Modal de galería (Imágenes / Planos) ──────────────────────────────────

function ArchivosObraModal({ numeropres, tipo, nombreObra, token, authFetch, onClose }) {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [archivoAEliminar, setArchivoAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const inputRef = useRef(null);

  const esImagen = tipo === "imagen";
  const titulo = esImagen ? "Imágenes de la obra" : "Planos de la obra";
  const accept = esImagen ? "image/*" : "image/*,.pdf,application/pdf,.dwg,.dxf";

  useEffect(() => {
    setLoading(true);
    authFetch(`${API}/obras/${numeropres}/archivos?tipo=${tipo}`)
      .then((r) => r.json())
      .then((data) => setArchivos(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeropres, tipo]);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      // Secuencial (no Promise.all) para no saturar Cloudinary con varios
      // archivos pesados (planos/DWG) al mismo tiempo.
      for (const file of files) {
        const nuevo = await subirArchivoObra(numeropres, tipo, file, token);
        setArchivos((prev) => [nuevo, ...prev]);
      }
    } catch (e) {
      console.error("Error subiendo archivo:", e);
      setError(`No se pudo subir uno o más archivos. ${e.message || ""}`.trim());
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!archivoAEliminar) return;
    setEliminando(true);
    try {
      const res = await authFetch(
        `${API}/obras/archivos/${archivoAEliminar.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setArchivos((prev) => prev.filter((a) => a.id !== archivoAEliminar.id));
      setArchivoAEliminar(null);
    } catch (e) {
      console.error("Error borrando archivo:", e);
      alert("No se pudo borrar el archivo. Revisá la consola.");
    } finally {
      setEliminando(false);
    }
  };

  return (
    <Modal
      title={`${titulo}${nombreObra ? " — " + nombreObra : ""}`}
      onClose={onClose}
    >
      <div
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#3a7abf" : "#b8cfe0"}`,
          borderRadius: 8,
          padding: "20px",
          textAlign: "center",
          cursor: uploading ? "default" : "pointer",
          background: dragging ? "#eef6fc" : "#fafcfe",
          color: "#4a8ab5",
          fontFamily: "'Space Mono',monospace",
          fontSize: 13,
          marginBottom: 16,
        }}
      >
        {uploading
          ? "⏳ Subiendo..."
          : dragging
            ? "Soltá los archivos acá"
            : `Arrastrá o hacé clic para subir ${esImagen ? "imágenes" : "planos (PDF, imagen o DWG)"}`}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p style={{ color: "red", fontSize: "0.85rem", marginTop: -8 }}>
          {error}
        </p>
      )}

      {loading ? (
        <p style={{ color: "#4a8ab5" }}>⏳ Cargando...</p>
      ) : archivos.length === 0 ? (
        <p style={{ color: "#888" }}>
          Todavía no hay {esImagen ? "imágenes" : "planos"} para esta obra.
        </p>
      ) : esImagen ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 10,
          }}
        >
          {archivos.map((a) => (
            <div
              key={a.id}
              style={{
                position: "relative",
                border: "1px solid #e0e8f0",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <a href={a.url} target="_blank" rel="noreferrer">
                <img
                  src={a.url}
                  alt={a.nombre_original || "imagen"}
                  style={{
                    width: "100%",
                    height: 100,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </a>
              <button
                title="Borrar"
                onClick={() => setArchivoAEliminar(a)}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid #e0a0a0",
                  borderRadius: 4,
                  color: "#c0392b",
                  cursor: "pointer",
                  fontSize: 12,
                  lineHeight: 1,
                  padding: "3px 6px",
                }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {archivos.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid #e0e8f0",
                borderRadius: 6,
                padding: "8px 10px",
              }}
            >
              <span style={{ fontSize: 20 }}>{getIconoArchivo(a)}</span>
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  color: "#3a7abf",
                  textDecoration: "none",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {a.nombre_original || "Ver archivo"}
              </a>
              <button
                title="Borrar"
                onClick={() => setArchivoAEliminar(a)}
                style={{
                  background: "none",
                  border: "1px solid #e0a0a0",
                  borderRadius: 4,
                  color: "#c0392b",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: "3px 8px",
                }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {archivoAEliminar && (
        <ConfirmDelete
          item={archivoAEliminar}
          title="¿Eliminar archivo?"
          message={
            <>
              Vas a eliminar{" "}
              <strong>{archivoAEliminar.nombre_original || "este archivo"}</strong>.
              Esta acción no se puede deshacer.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => !eliminando && setArchivoAEliminar(null)}
        />
      )}
    </Modal>
  );
}
