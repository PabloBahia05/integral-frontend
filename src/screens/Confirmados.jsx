import { useState, useEffect, useRef, useMemo } from "react";
import DataTable from "../Component/DataTable";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import ConfirmDelete from "../Component/ConfirmDelete";

const API = "https://integral-backend-production.up.railway.app";

// ── Pantalla de la tabla `confirmados` ────────────────────────────────────
//
// `confirmados` es la copia congelada de los ítems de cada revisión en el
// momento de confirmarla (ver tabla-presupuestos_routes.js). Es la única
// fuente de la que se sincroniza `produccion`.
//
// Esta pantalla:
//  1. Lista las revisiones confirmadas   → GET /tabla-presupuestos/revisiones-confirmadas
//  2. Al hacer clic en una, abre sus ítems → GET /confirmados/:numeropres/:revision
//  3. Edita un campo al salir del input   → PUT /confirmados/:id
//     (producto, grupo, color, código de artículo, medidas y cantidad se
//     propagan solos a la fila de producción vinculada; módulo, codpro y
//     las etapas de producción no se tocan)
//  4. Agrega un ítem NUEVO a la obra      → POST /confirmados
//     (lo suma a confirmados y lo envía a Producción como fila nueva del
//     mismo cliente; todo o nada). Producto y código se eligen del catálogo
//     de `articulos` (GET /productos) o se escriben a mano si es un ítem nuevo
//  5. Elimina un ítem                     → DELETE /confirmados/:id
//     (NO borra la fila de producción: solo la desvincula)
//
// `onInicio` (opcional): función que lleva a la pantalla de inicio. Si el
// padre no la pasa, el botón "Inicio" navega a la raíz del sitio ("/").

const FUENTE = "'Space Mono', monospace";
const CAMPOS_NUMERICOS = ["ancho", "alto", "profundidad", "cantidad"];

const fmtNumPres = (n) =>
  n != null && n !== "" ? String(n).padStart(4, "0") : "—";

// Fechas tipo "2026-03-01..." → "01/03/2026" sin pasar por Date (evita el
// corrimiento de un día por zona horaria).
const fmtFecha = (v) => {
  if (!v) return "—";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v);
};

const fmtFechaHora = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
};

const fmtMonto = (v) =>
  v == null || v === ""
    ? "—"
    : "$ " +
      Number(v).toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

// ── Selector de artículos (catálogo `articulos`) ──────────────────────────
//
// Input con lista desplegable que filtra el catálogo por nombre o código.
// Elegir una opción llama a `onElegir(articulo)`; si lo escrito no está en el
// catálogo se puede seguir tal cual (ítem nuevo, texto libre).
//
// Va definido acá afuera (a nivel módulo) a propósito: si estuviera dentro de
// `Confirmados` se re-crearía en cada render y el input perdería el foco en
// cada tecla.

const MAX_OPCIONES = 50;

function ArticuloCombo({
  label,
  value,
  onTexto,
  onElegir,
  catalogo,
  estadoCatalogo,
  errorCatalogo,
  estiloInput,
  maxLength = 255,
}) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const listaRef = useRef(null);

  const texto = String(value ?? "");
  const t = texto.trim().toLowerCase();

  const opciones = useMemo(() => {
    if (!t) return catalogo.slice(0, MAX_OPCIONES);
    const palabras = t.split(/\s+/);
    const res = [];
    for (const a of catalogo) {
      if (palabras.every((p) => a.hay.includes(p))) {
        res.push(a);
        if (res.length >= MAX_OPCIONES) break;
      }
    }
    return res;
  }, [t, catalogo]);

  const hayExacto =
    !!t &&
    catalogo.some(
      (a) => a.nombre.toLowerCase() === t || a.codartint.toLowerCase() === t,
    );
  const mostrarComoNuevo = !!t && !hayExacto && estadoCatalogo === "ok";
  const total = opciones.length + (mostrarComoNuevo ? 1 : 0);

  useEffect(() => {
    if (activo < 0) return;
    listaRef.current?.children[activo]?.scrollIntoView({ block: "nearest" });
  }, [activo]);

  const elegir = (a) => {
    onElegir(a);
    setAbierto(false);
    setActivo(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAbierto(true);
      setActivo((i) => Math.min(i + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (abierto && activo >= 0 && activo < opciones.length) {
        e.preventDefault();
        elegir(opciones[activo]);
      } else {
        setAbierto(false);
      }
    } else if (e.key === "Escape") {
      if (abierto) {
        e.stopPropagation();
        setAbierto(false);
      }
    }
  };

  const filaBase = {
    padding: "6px 10px",
    fontSize: 12,
    fontFamily: FUENTE,
    cursor: "pointer",
    color: "#0a3a5c",
  };

  return (
    <div style={{ position: "relative", fontSize: 11, color: "#5a86ab" }}>
      <span>{label}</span>
      <input
        type="text"
        role="combobox"
        aria-expanded={abierto}
        aria-label={label}
        autoComplete="off"
        value={texto}
        maxLength={maxLength}
        onChange={(e) => {
          onTexto(e.target.value);
          setAbierto(true);
          setActivo(-1);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={handleKeyDown}
        style={{ ...estiloInput, display: "block", marginTop: 2 }}
      />

      {abierto && (
        <div
          ref={listaRef}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 30,
            width: "max(100%, 340px)",
            maxWidth: "min(480px, 80vw)",
            maxHeight: 240,
            overflowY: "auto",
            marginTop: 2,
            background: "#fff",
            border: "1.5px solid #b8d6ef",
            borderRadius: 4,
            boxShadow: "0 4px 14px rgba(10,58,92,0.18)",
          }}
        >
          {estadoCatalogo === "cargando" && (
            <div style={{ ...filaBase, cursor: "default", color: "#4a8ab5" }}>
              ⏳ Cargando artículos...
            </div>
          )}
          {estadoCatalogo === "error" && (
            <div style={{ ...filaBase, cursor: "default", color: "#c0392b" }}>
              ⚠ No se pudo cargar el catálogo{errorCatalogo ? ` (${errorCatalogo})` : ""}.
              Podés escribir el ítem a mano.
            </div>
          )}
          {estadoCatalogo === "ok" && opciones.length === 0 && !mostrarComoNuevo && (
            <div style={{ ...filaBase, cursor: "default", color: "#8aabb8" }}>
              No hay artículos en el catálogo.
            </div>
          )}

          {opciones.map((a, i) => (
            <div
              key={`${a.codartint}-${i}`}
              // onMouseDown (no onClick) para elegir antes de que el input pierda el foco
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(a);
              }}
              onMouseEnter={() => setActivo(i)}
              style={{ ...filaBase, background: i === activo ? "#eaf3fb" : "#fff" }}
            >
              <span style={{ color: "#4a8ab5", fontWeight: 700, marginRight: 8 }}>
                {a.codartint || "—"}
              </span>
              {a.nombre}
            </div>
          ))}

          {mostrarComoNuevo && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setAbierto(false);
                setActivo(-1);
              }}
              onMouseEnter={() => setActivo(opciones.length)}
              style={{
                ...filaBase,
                borderTop: opciones.length ? "1px solid #d6e6f5" : "none",
                fontWeight: 700,
                background: activo === opciones.length ? "#eaf3fb" : "#f5faff",
              }}
            >
              ＋ Usar «{texto.trim()}» como ítem nuevo
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Confirmados({ authFetch, token, onInicio }) {
  // ── Lista de revisiones confirmadas ────────────────────────────────
  const [revisiones, setRevisiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [search, setSearch] = useState("");

  // ── Panel con los ítems de una revisión ────────────────────────────
  const [abierta, setAbierta] = useState(null); // fila de `revisiones`
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState(null);

  // Último valor guardado por ítem: evita un PUT si al salir del input no
  // cambió nada. Map<id, fila>.
  const guardados = useRef(new Map());
  const [guardandoCampo, setGuardandoCampo] = useState(null);
  const [errorCampo, setErrorCampo] = useState(null);

  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // Alta de un ítem nuevo en la obra abierta
  const NUEVO_VACIO = {
    nombreart: "",
    codartint: "",
    grupo: "",
    color: "",
    ancho: "",
    alto: "",
    profundidad: "",
    cantidad: "1",
  };
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [nuevo, setNuevo] = useState(NUEVO_VACIO);
  const [agregando, setAgregando] = useState(false);
  const [resultadoNuevo, setResultadoNuevo] = useState(null); // { ok, texto }

  const [coloresMelamina, setColoresMelamina] = useState([]);

  // Catálogo de la tabla `articulos` para elegir producto/código en "Nuevo ítem".
  // Se carga una sola vez, la primera vez que se abre el formulario.
  const [catalogo, setCatalogo] = useState([]);
  const [estadoCatalogo, setEstadoCatalogo] = useState("idle"); // idle | cargando | ok | error
  const [errorCatalogo, setErrorCatalogo] = useState(null);

  // ── Carga ──────────────────────────────────────────────────────────

  const fetchRevisiones = () => {
    setLoading(true);
    setErrorCarga(null);
    authFetch(`${API}/tabla-presupuestos/revisiones-confirmadas`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        setRevisiones(
          (Array.isArray(data) ? data : []).map((x) => ({
            ...x,
            id: `${x.numeropres}-${x.revision}`,
          })),
        );
      })
      .catch((e) => {
        console.error(e);
        setErrorCarga(e.message);
        setRevisiones([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRevisiones();
    authFetch(`${API}/articulos/colores-melamina`)
      .then((r) => r.json())
      .then((data) => setColoresMelamina(Array.isArray(data) ? data : []))
      .catch(() => setColoresMelamina([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mostrarNuevo || estadoCatalogo !== "idle") return;
    setEstadoCatalogo("cargando");
    setErrorCatalogo(null);
    authFetch(`${API}/productos`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        const lista = (Array.isArray(data) ? data : [])
          .map((a) => {
            const cod = String(a.codartint ?? a.codart ?? "").trim();
            const nom = String(a.articulo ?? a.nombreart ?? a.nombre ?? "").trim();
            return { codartint: cod, nombre: nom, hay: `${cod} ${nom}`.toLowerCase() };
          })
          .filter((a) => a.codartint || a.nombre)
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        setCatalogo(lista);
        setEstadoCatalogo("ok");
      })
      .catch((e) => {
        console.error("Error cargando artículos:", e);
        setErrorCatalogo(e.message);
        setEstadoCatalogo("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarNuevo]);

  const fetchItems = (numeropres, revision) => {
    setItemsLoading(true);
    setItemsError(null);
    authFetch(
      `${API}/confirmados/${encodeURIComponent(numeropres)}/${encodeURIComponent(revision)}`,
    )
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        const lista = Array.isArray(data) ? data : [];
        guardados.current = new Map(lista.map((it) => [it.id, { ...it }]));
        setItems(lista);
      })
      .catch((e) => {
        console.error(e);
        setItemsError(e.message);
        setItems([]);
      })
      .finally(() => setItemsLoading(false));
  };

  const abrirRevision = (row) => {
    setAbierta(row);
    setErrorCampo(null);
    setMostrarNuevo(false);
    setNuevo(NUEVO_VACIO);
    setResultadoNuevo(null);
    fetchItems(row.numeropres, row.revision);
  };

  const cerrarPanel = () => {
    setAbierta(null);
    setItems([]);
    setItemsError(null);
    setErrorCampo(null);
    setAEliminar(null);
  };

  // ── Edición inline ─────────────────────────────────────────────────

  const handleCampoChange = (id, campo, valor) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));
  };

  const handleCampoBlur = async (row, campo) => {
    const anterior = guardados.current.get(row.id)?.[campo];
    if (String(anterior ?? "") === String(row[campo] ?? "")) return;

    const key = `${row.id}-${campo}`;
    let valor = row[campo];
    if (valor === "" || valor === undefined) valor = null;
    if (valor !== null && CAMPOS_NUMERICOS.includes(campo)) {
      valor = Number(valor);
      if (Number.isNaN(valor)) {
        setErrorCampo(key);
        return;
      }
    }

    setGuardandoCampo(key);
    setErrorCampo(null);
    try {
      const res = await authFetch(`${API}/confirmados/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      guardados.current.set(row.id, { ...guardados.current.get(row.id), [campo]: row[campo] });
    } catch (e) {
      console.error(`Error guardando ${campo}:`, e);
      setErrorCampo(key);
    } finally {
      setGuardandoCampo(null);
    }
  };

  // ── Alta de un ítem nuevo ──────────────────────────────────────────

  const agregarItem = async () => {
    setResultadoNuevo(null);
    if (!nuevo.nombreart.trim() && !nuevo.codartint.trim()) {
      setResultadoNuevo({ ok: false, texto: "Completá el producto o el código de artículo." });
      return;
    }
    setAgregando(true);
    try {
      const res = await authFetch(`${API}/confirmados`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nuevo,
          numeropres: abierta.numeropres,
          revision: abierta.revision,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const n = data.produccion?.insertados;
      setResultadoNuevo({
        ok: true,
        texto:
          n > 0
            ? "✓ Ítem agregado a la obra y enviado a Producción como fila nueva."
            : "✓ Ítem agregado a la obra y vinculado con una fila de Producción que ya existía.",
      });
      setNuevo(NUEVO_VACIO);
      fetchItems(abierta.numeropres, abierta.revision);
    } catch (e) {
      console.error("Error agregando ítem a confirmados:", e);
      setResultadoNuevo({ ok: false, texto: e.message });
    } finally {
      setAgregando(false);
    }
  };

  // ── Baja de un ítem ────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      const res = await authFetch(`${API}/confirmados/${aEliminar.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      guardados.current.delete(aEliminar.id);
      setItems((prev) => prev.filter((r) => r.id !== aEliminar.id));
      setAEliminar(null);
    } catch (e) {
      console.error("Error borrando ítem de confirmados:", e);
      alert("No se pudo borrar el ítem. Revisá la consola.");
    } finally {
      setEliminando(false);
    }
  };

  // ── Filtro de la lista ─────────────────────────────────────────────

  const q = search.trim().toLowerCase();
  const filtered = revisiones.filter(
    (r) =>
      !q ||
      String(r.numeropres ?? "").toLowerCase().includes(q) ||
      fmtNumPres(r.numeropres).includes(q) ||
      String(r.nombre ?? "").toLowerCase().includes(q) ||
      String(r.direccion ?? "").toLowerCase().includes(q),
  );
  const totalObras = new Set(revisiones.map((r) => r.numeropres)).size;

  // ── Estilos ────────────────────────────────────────────────────────

  const estiloInput = (id, campo, ancho = "100px") => ({
    width: "100%",
    maxWidth: ancho,
    padding: "4px 8px",
    fontSize: "12px",
    fontFamily: FUENTE,
    border: `1.5px solid ${errorCampo === `${id}-${campo}` ? "#e57373" : "#b8d6ef"}`,
    borderRadius: "4px",
    background: guardandoCampo === `${id}-${campo}` ? "#fffbe6" : "#fff",
    color: "#0a3a5c",
  });

  const inputTexto = (row, campo, ancho, maxLength = 255) => (
    <input
      type="text"
      value={row[campo] ?? ""}
      onChange={(e) => handleCampoChange(row.id, campo, e.target.value)}
      onBlur={() => handleCampoBlur(row, campo)}
      maxLength={maxLength}
      style={estiloInput(row.id, campo, ancho)}
    />
  );

  const inputNumero = (row, campo) => (
    <input
      type="number"
      step="any"
      value={row[campo] ?? ""}
      onChange={(e) => handleCampoChange(row.id, campo, e.target.value)}
      onBlur={() => handleCampoBlur(row, campo)}
      style={estiloInput(row.id, campo, "90px")}
    />
  );

  // ── Columnas ───────────────────────────────────────────────────────

  const columnasRevisiones = [
    { key: "numeropres", label: "Presup.", render: (v) => fmtNumPres(v) },
    { key: "revision", label: "Rev.", render: (v) => v ?? "—" },
    { key: "nombre", label: "Cliente", render: (v) => v ?? "—" },
    { key: "direccion", label: "Dirección", render: (v) => v ?? "—" },
    { key: "fecha", label: "Fecha", render: (v) => fmtFecha(v) },
    { key: "total1", label: "Total", render: (v) => fmtMonto(v) },
  ];

  const columnasItems = [
    {
      key: "id",
      label: "#",
      render: (v) => <span style={{ fontSize: 11, color: "#8aabcc" }}>{v}</span>,
    },
    {
      key: "nombreart",
      label: "Producto",
      render: (v, row) => inputTexto(row, "nombreart", "230px"),
    },
    {
      key: "grupo",
      label: "Grupo",
      render: (v, row) => inputTexto(row, "grupo", "130px"),
    },
    {
      key: "codartint",
      label: "Cód. artículo",
      render: (v, row) => inputTexto(row, "codartint", "120px", 50),
    },
    {
      key: "color",
      label: "Color",
      render: (v, row) => {
        const actual = row.color ?? "";
        const enLista = coloresMelamina.some((c) => c.articulo === actual);
        return (
          <select
            value={actual}
            onChange={(e) => {
              const valor = e.target.value;
              handleCampoChange(row.id, "color", valor);
              handleCampoBlur({ ...row, color: valor }, "color");
            }}
            style={estiloInput(row.id, "color", "180px")}
          >
            <option value="">—</option>
            {actual && !enLista && <option value={actual}>{actual}</option>}
            {coloresMelamina.map((c) => (
              <option key={c.codartint} value={c.articulo}>
                {c.articulo}
              </option>
            ))}
          </select>
        );
      },
    },
    { key: "ancho", label: "Ancho", render: (v, row) => inputNumero(row, "ancho") },
    { key: "alto", label: "Alto", render: (v, row) => inputNumero(row, "alto") },
    {
      key: "profundidad",
      label: "Prof.",
      render: (v, row) => inputNumero(row, "profundidad"),
    },
    {
      key: "cantidad",
      label: "Cant.",
      render: (v, row) => inputNumero(row, "cantidad"),
    },
    {
      key: "eliminar",
      label: "",
      render: (v, row) => (
        <button
          onClick={() => setAEliminar(row)}
          title="Eliminar ítem"
          style={{
            border: "1px solid #f0a0a0",
            background: "#fdf0f0",
            color: "#c0392b",
            borderRadius: 4,
            padding: "3px 8px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          🗑
        </button>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────

  const primero = items[0];

  // Estado del ítem que se está cargando en "Nuevo ítem" respecto del catálogo
  const codNuevo = nuevo.codartint.trim().toLowerCase();
  const nomNuevo = nuevo.nombreart.trim().toLowerCase();
  const articuloDelCatalogo = codNuevo
    ? catalogo.find((a) => a.codartint.toLowerCase() === codNuevo)
    : null;
  const coincidePorNombre =
    !codNuevo && nomNuevo
      ? catalogo.find((a) => a.nombre.toLowerCase() === nomNuevo)
      : null;
  const esItemNuevo =
    estadoCatalogo === "ok" &&
    !articuloDelCatalogo &&
    !coincidePorNombre &&
    (nomNuevo || codNuevo);

  return (
    <>
      <button
        type="button"
        onClick={() => (onInicio ? onInicio() : window.location.assign("/"))}
        title="Volver al inicio"
        style={{
          background: "#eaf3fb",
          color: "#0a3a5c",
          border: "1px solid #b8d6ef",
          borderRadius: "4px",
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: FUENTE,
          margin: "0 0 12px",
        }}
      >
        ← Inicio
      </button>

      <ScreenHeader
        icon="✅"
        title="Confirmados"
        subtitle="Copia de cada obra al confirmarla — lo que se edita acá se refleja en Producción"
      />

      <StatCards
        stats={[
          { label: "Revisiones confirmadas", value: revisiones.length },
          { label: "Obras", value: totalObras },
          { label: "Filtradas", value: filtered.length },
        ]}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          margin: "12px 0 4px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar por N°, cliente o dirección..."
          style={{
            padding: "8px 12px",
            fontSize: 13,
            fontFamily: FUENTE,
            border: "1.5px solid #b8d6ef",
            borderRadius: 4,
            minWidth: 280,
            color: "#0a3a5c",
          }}
        />
        <button
          onClick={fetchRevisiones}
          title="Volver a cargar la lista"
          style={{
            padding: "8px 12px",
            fontSize: 12,
            fontFamily: FUENTE,
            fontWeight: 700,
            border: "1.5px solid #b8d6ef",
            borderRadius: 4,
            background: "#fff",
            color: "#0a3a5c",
            cursor: "pointer",
          }}
        >
          ↻ Actualizar
        </button>
      </div>

      <p style={{ margin: "4px 0 12px", fontSize: 11, color: "#8aabb8", fontFamily: FUENTE }}>
        Hacé clic en una fila para ver y editar los ítems confirmados de esa revisión.
      </p>

      {loading ? (
        <p style={{ padding: 24, color: "#4a8ab5", fontFamily: FUENTE }}>
          ⏳ Cargando confirmados...
        </p>
      ) : errorCarga ? (
        <p style={{ padding: 24, color: "#c0392b", fontFamily: FUENTE }}>
          ⚠ No se pudo cargar: {errorCarga}
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ padding: 24, color: "#8aabb8", fontFamily: FUENTE }}>
          {revisiones.length === 0
            ? "Todavía no hay obras confirmadas."
            : "Ninguna obra coincide con la búsqueda."}
        </p>
      ) : (
        <DataTable
          columns={columnasRevisiones}
          rows={filtered}
          selectedId={abierta?.id ?? null}
          onSelect={(row) => row && abrirRevision(row)}
          storageKey="confirmados-revisiones"
        />
      )}

      {abierta && (
        <div
          onClick={() => !eliminando && cerrarPanel()}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,58,92,0.55)",
            zIndex: 1150,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 1180,
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 10,
              padding: "20px 22px",
              fontFamily: FUENTE,
              color: "#0a3a5c",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 4,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  Presupuesto N° {fmtNumPres(abierta.numeropres)} — Rev. {abierta.revision}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#8aabcc" }}>
                  {[abierta.nombre, abierta.direccion].filter(Boolean).join(" · ") || "—"}
                </p>
                {primero && (
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#8aabcc" }}>
                    Confirmado el {fmtFechaHora(primero.confirmado_en)}
                    {primero.confirmado_por ? ` por ${primero.confirmado_por}` : ""}
                  </p>
                )}
              </div>
              <button
                onClick={cerrarPanel}
                style={{
                  border: "none",
                  background: "none",
                  color: "#4a8ab5",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: "8px 0 16px", fontSize: 12, color: "#4a8ab5" }}>
              Los cambios se guardan al salir de cada campo. Producto, grupo, color,
              código, medidas y cantidad se actualizan también en la fila de
              Producción vinculada; el módulo y las etapas de producción no se tocan.
            </p>

            <div style={{ margin: "0 0 14px" }}>
              <button
                onClick={() => setMostrarNuevo((v) => !v)}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  fontFamily: FUENTE,
                  fontWeight: 700,
                  border: "1.5px solid #0a3a5c",
                  borderRadius: 4,
                  background: mostrarNuevo ? "#0a3a5c" : "#fff",
                  color: mostrarNuevo ? "#fff" : "#0a3a5c",
                  cursor: "pointer",
                }}
              >
                {mostrarNuevo ? "− Cerrar" : "＋ Nuevo ítem"}
              </button>

              {mostrarNuevo && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 12,
                    border: "1px solid #b8d6ef",
                    borderRadius: 6,
                    background: "#f5faff",
                  }}
                >
                  <p style={{ margin: "0 0 10px", fontSize: 11, color: "#4a8ab5" }}>
                    Se agrega a esta obra y se envía a Producción como un ítem nuevo del
                    mismo cliente. No cambia el monto de la obra.
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                      gap: 8,
                    }}
                  >
                    {[
                      ["nombreart", "Producto *", 255],
                      ["codartint", "Cód. artículo", 50],
                    ].map(([campo, label, maxLength]) => (
                      <ArticuloCombo
                        key={campo}
                        label={label}
                        value={nuevo[campo]}
                        maxLength={maxLength}
                        catalogo={catalogo}
                        estadoCatalogo={estadoCatalogo}
                        errorCatalogo={errorCatalogo}
                        estiloInput={estiloInput("nuevo", campo, "100%")}
                        onTexto={(v) => setNuevo((n) => ({ ...n, [campo]: v }))}
                        onElegir={(a) =>
                          setNuevo((n) => ({
                            ...n,
                            nombreart: a.nombre,
                            codartint: a.codartint,
                          }))
                        }
                      />
                    ))}
                    <label style={{ fontSize: 11, color: "#5a86ab" }}>
                      Grupo
                      <input
                        type="text"
                        value={nuevo.grupo}
                        onChange={(e) => setNuevo((n) => ({ ...n, grupo: e.target.value }))}
                        style={{ ...estiloInput("nuevo", "grupo", "100%"), display: "block", marginTop: 2 }}
                      />
                    </label>
                    <label style={{ fontSize: 11, color: "#5a86ab" }}>
                      Color
                      <select
                        value={nuevo.color}
                        onChange={(e) => setNuevo((n) => ({ ...n, color: e.target.value }))}
                        style={{ ...estiloInput("nuevo", "color", "100%"), display: "block", marginTop: 2 }}
                      >
                        <option value="">—</option>
                        {coloresMelamina.map((c) => (
                          <option key={c.codartint} value={c.articulo}>
                            {c.articulo}
                          </option>
                        ))}
                      </select>
                    </label>
                    {[
                      ["ancho", "Ancho"],
                      ["alto", "Alto"],
                      ["profundidad", "Prof."],
                      ["cantidad", "Cant."],
                    ].map(([campo, label]) => (
                      <label key={campo} style={{ fontSize: 11, color: "#5a86ab" }}>
                        {label}
                        <input
                          type="number"
                          step="any"
                          value={nuevo[campo]}
                          onChange={(e) => setNuevo((n) => ({ ...n, [campo]: e.target.value }))}
                          style={{ ...estiloInput("nuevo", campo, "100%"), display: "block", marginTop: 2 }}
                        />
                      </label>
                    ))}
                  </div>
                  {(articuloDelCatalogo || coincidePorNombre || esItemNuevo) && (
                    <p style={{ margin: "8px 0 0", fontSize: 11, color: "#4a8ab5" }}>
                      {articuloDelCatalogo
                        ? `✓ Artículo del catálogo: ${articuloDelCatalogo.codartint} — ${articuloDelCatalogo.nombre}`
                        : coincidePorNombre
                          ? "Hay un artículo con ese nombre en el catálogo: elegilo de la lista para completar el código."
                          : "＋ Ítem nuevo: no está en el catálogo de artículos, se envía tal cual lo escribiste."}
                    </p>
                  )}
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      onClick={agregarItem}
                      disabled={agregando}
                      style={{
                        padding: "7px 14px",
                        fontSize: 12,
                        fontFamily: FUENTE,
                        fontWeight: 700,
                        border: "none",
                        borderRadius: 4,
                        background: "#0a3a5c",
                        color: "#fff",
                        cursor: agregando ? "wait" : "pointer",
                        opacity: agregando ? 0.6 : 1,
                      }}
                    >
                      {agregando ? "Agregando…" : "Agregar y enviar a Producción"}
                    </button>
                    {resultadoNuevo && (
                      <span style={{ fontSize: 12, color: resultadoNuevo.ok ? "#1a7a44" : "#c0392b" }}>
                        {resultadoNuevo.ok ? "" : "⚠ "}
                        {resultadoNuevo.texto}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {itemsLoading ? (
              <p style={{ color: "#4a8ab5", fontSize: 12 }}>⏳ Cargando ítems...</p>
            ) : itemsError ? (
              <p style={{ color: "#c0392b", fontSize: 12 }}>⚠ {itemsError}</p>
            ) : items.length === 0 ? (
              <p style={{ color: "#8aabb8", fontSize: 12 }}>
                Esta revisión no tiene ítems en confirmados.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <DataTable
                  columns={columnasItems}
                  rows={items}
                  selectedId={null}
                  onSelect={() => {}}
                  storageKey="confirmados-items"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {aEliminar && (
        <ConfirmDelete
          item={aEliminar}
          title="¿Eliminar este ítem confirmado?"
          message={
            <>
              Vas a eliminar{" "}
              <strong>{aEliminar.nombreart || aEliminar.codartint || `#${aEliminar.id}`}</strong>{" "}
              de la obra confirmada. La fila de Producción vinculada{" "}
              <strong>no se borra</strong>: queda desvinculada para que decidas a
              mano qué hacer con ella. Esta acción no se puede deshacer.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => !eliminando && setAEliminar(null)}
        />
      )}
    </>
  );
}
