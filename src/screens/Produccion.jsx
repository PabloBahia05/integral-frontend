import { useState, useEffect } from "react";
import DataTable from "../Component/DataTable";
import ActionBar from "../Component/ActionBar";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import ConfirmDelete from "../Component/ConfirmDelete";
import EscanerBarcode from "../Component/EscanerBarcode";
import VisorDWG from "./VisorDWG";

const API = "https://integral-backend-production.up.railway.app";

// ── Componente ────────────────────────────────────────────────────────────
//
// Lista los ítems que caen en `produccion` al confirmar un presupuesto
// (ver PUT /tabla-presupuestos/confirmar/:numeropres/:revision en
// tabla-presupuestos_routes.js). Los campos pensados para editarse acá son
// `modulo` y las columnas de seguimiento de proceso (DOMUS/OP/PERFORADO/
// USPER/ARMADO/USARM/DESPACHO/USDES) — quedan vacíos al confirmar y se
// completan a mano, ítem por ítem, en esta pantalla.

// Campos SI-NO de seguimiento de proceso y el campo de usuario asociado a
// cada uno (queda vacío si el proceso todavía no se marcó). Se define acá
// para no repetir la lista en columnas + handlers.
const ETAPAS = [
  { campo: "DOMUS", label: "Domus", usuario: null },
  { campo: "PERFORADO", label: "Perforado", usuario: "USPER" },
  { campo: "ARMADO", label: "Armado", usuario: "USARM" },
  { campo: "DESPACHO", label: "Despacho", usuario: "USDES" },
];

// Detecta celular vs escritorio por JavaScript (ancho real de pantalla),
// en vez de depender de @media queries en CSS. Se recalcula si el usuario
// rota el celular o cambia el tamaño de la ventana.
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}

// ── Modal de detalle (se abre al clickear el código) ───────────────────────
//
// Solo muestra datos que ya vienen en la fila de `produccion` (no pega a
// ningún endpoint nuevo): cliente, grupo, producto, módulo, color resuelto,
// y el estado de las 4 etapas con su usuario y OP.
//
// El layout mobile vs desktop se resuelve acá mismo por JS (useIsMobile),
// no con clases + @media: cada estilo de acá abajo ya es el valor final
// para el dispositivo actual, sin depender de que ninguna cascada CSS
// externa lo pise ni de que el navegador respete el media query.
function DetalleProduccion({ row, nombreMelamina, onClose }) {
  const isMobile = useIsMobile();

  if (!row) return null;

  const fuente = "'Space Mono', monospace";

  const badgeEtapa = (valor) => (
    <span
      style={{
        display: "inline-block",
        background: valor === "SI" ? "#eaf7ea" : "#f3f3f3",
        color: valor === "SI" ? "#2e7d32" : "#888",
        border: `1px solid ${valor === "SI" ? "#a5d6a7" : "#ddd"}`,
        borderRadius: "4px",
        padding: isMobile ? "4px 12px" : "2px 10px",
        fontSize: isMobile ? "15px" : "12px",
        fontWeight: 700,
        fontFamily: fuente,
      }}
    >
      {valor === "SI" ? "✓ SI" : "NO"}
    </span>
  );

  const fila = (label, valor) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: isMobile ? "12px" : "16px",
        padding: isMobile ? "16px 0" : "8px 0",
        borderBottom: "1px solid #eaf3fb",
        fontSize: isMobile ? "19px" : "13px",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <span
        style={{
          color: "#4a8ab5",
          fontFamily: fuente,
          flexShrink: 0,
          fontSize: isMobile ? "17px" : "13px",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "#0a3a5c",
          fontWeight: 600,
          textAlign: "right",
          minWidth: 0,
          overflowWrap: "break-word",
        }}
      >
        {valor}
      </span>
    </div>
  );

  const subTexto = {
    fontSize: isMobile ? "15px" : "11px",
    color: "#8aabb8",
    fontFamily: fuente,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,58,92,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: isMobile ? 0 : "8px",
          padding: isMobile ? "32px 20px" : "24px",
          width: isMobile ? "100%" : "90%",
          maxWidth: isMobile ? "100%" : "420px",
          height: isMobile ? "100%" : "auto",
          maxHeight: isMobile ? "100%" : "85vh",
          boxSizing: "border-box",
          overflowY: "auto",
          boxShadow: isMobile ? "none" : "0 8px 30px rgba(10,58,92,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              background: "#0a3a5c",
              color: "#fff",
              borderRadius: "4px",
              padding: isMobile ? "6px 14px" : "2px 10px",
              fontSize: isMobile ? "18px" : "13px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              fontFamily: fuente,
            }}
          >
            {row.codpro ?? "—"}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: isMobile ? "30px" : "20px",
              lineHeight: 1,
              cursor: "pointer",
              color: "#8aabb8",
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <p style={{ ...subTexto, marginTop: 0, marginBottom: "16px" }}>
          Presupuesto N° {row.numeropres ? String(row.numeropres).padStart(4, "0") : "—"}
          {" · "}Rev. {row.revision ?? 0}
        </p>

        {fila("Cliente", row.cliente_nombre ?? "(sin cliente)")}
        {fila("Grupo", row.grupo ?? "—")}
        {fila("Producto", row.producto ?? "—")}
        {fila("Módulo", row.modulo ?? "Sin cargar")}
        {fila("Color", row.color ? nombreMelamina(row.color) : "Sin color")}
        {fila("OP", row.OP ?? "—")}

        <p style={{ ...subTexto, marginTop: "16px", marginBottom: "8px" }}>
          ETAPAS DE PROCESO
        </p>

        {(() => {
          // Solo se listan las etapas que ya tienen algún dato cargado (SI
          // marcado, o un usuario asociado) — si una etapa sigue en NO y sin
          // usuario, no se muestra fila para no ensuciar el detalle con
          // "NO" en todo lo que todavía no se hizo.
          const completadas = ETAPAS.filter(
            ({ campo, usuario }) =>
              row[campo] === "SI" || (usuario && row[usuario]),
          );

          if (completadas.length === 0) {
            return (
              <p
                style={{
                  fontSize: isMobile ? "17px" : "13px",
                  color: "#8aabb8",
                  fontFamily: fuente,
                  padding: "8px 0",
                }}
              >
                Sin etapas completadas todavía.
              </p>
            );
          }

          return completadas.map(({ campo, label, usuario }) => (
            <div
              key={campo}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                padding: isMobile ? "16px 0" : "8px 0",
                borderBottom: "1px solid #eaf3fb",
                fontSize: isMobile ? "19px" : "13px",
                boxSizing: "border-box",
                width: "100%",
              }}
            >
              <span
                style={{
                  color: "#4a8ab5",
                  fontFamily: fuente,
                  fontSize: isMobile ? "17px" : "13px",
                }}
              >
                {label}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {usuario && row[usuario] ? (
                  <span
                    style={{
                      color: "#0a3a5c",
                      fontSize: isMobile ? "15px" : "12px",
                    }}
                  >
                    {row[usuario]}
                  </span>
                ) : null}
                {badgeEtapa(row[campo] ?? "NO")}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}

export default function Produccion({ authFetch }) {
  const isMobile = useIsMobile();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  // Guardado de `modulo` por fila: id de la fila que se está guardando en
  // este momento (para mostrar feedback) y último error de guardado, si lo
  // hubo (para marcar el input en rojo).
  const [guardandoId, setGuardandoId] = useState(null);
  const [errorGuardadoId, setErrorGuardadoId] = useState(null);

  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // Fila que se está mostrando en el modal de detalle (se abre al
  // clickear el código de producción, ver columna `codpro` más abajo).
  const [detalle, setDetalle] = useState(null);

  // Modal de escaneo de código de barras (ver EscanerBarcode.jsx). Al
  // detectar un código busca la fila por `codpro` y abre el mismo modal
  // de detalle que se abre al clickear la columna "Cód.".
  const [escaneando, setEscaneando] = useState(false);

  // Fila para la que está abierto el modal del visor 3D (columna "🧊 Ver").
  // El visor guarda/lee el modelo por codpro contra la tabla modelos_3d
  // (independiente de produccion, ver modelos3d.routes.js).
  const [modelo3D, setModelo3D] = useState(null);

  // Melaminas disponibles para el desplegable de `color` (ver
  // GET /productos/melaminas en articulos_controller.js — filtra
  // articulos por rubro "melamina"/"MELAMINA"). Se guarda el `codartint`
  // en produccion.color, pero en pantalla siempre se muestra `articulo`
  // (el nombre), vía este mapa.
  const [melaminas, setMelaminas] = useState([]);
  const nombreMelamina = (codartint) =>
    melaminas.find((m) => m.codartint === codartint)?.articulo ?? codartint;

  // Guardado de `color` por fila: mismo patrón de feedback que `modulo`.
  const [guardandoColorId, setGuardandoColorId] = useState(null);
  const [errorColorId, setErrorColorId] = useState(null);

  // Guardado de las columnas de seguimiento de proceso (DOMUS/OP/PERFORADO/
  // USPER/ARMADO/USARM/DESPACHO/USDES). Mismo patrón de feedback que
  // `modulo`/`color`, pero indexado por "id-campo" porque hay varias
  // columnas editables de este tipo en la misma fila.
  const [guardandoCampo, setGuardandoCampo] = useState(null); // `${id}-${campo}`
  const [errorCampo, setErrorCampo] = useState(null);

  // Filtro por etapa de proceso (los 3 botones DOMUS/PERFORADO/ARMADO arriba
  // de la tabla). `null` = sin filtro (se ven todos los ítems). Cada botón
  // muestra la "cola" de esa etapa: lo que ya pasó la etapa anterior (SI)
  // pero todavía no pasó la propia (NO). DOMUS es la primera etapa, así que
  // su cola es simplemente todo lo que sigue en NO.
  const [filtroEtapa, setFiltroEtapa] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchProduccion = () => {
    setLoading(true);
    authFetch(`${API}/produccion`)
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProduccion();
    authFetch(`${API}/productos/melaminas`)
      .then((r) => r.json())
      .then((data) => setMelaminas(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  // ── Edición de `modulo` (inline, se guarda al salir del campo) ─────────

  const handleModuloChange = (id, valor) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, modulo: valor } : r)),
    );
  };

  const handleModuloBlur = async (row) => {
    setGuardandoId(row.id);
    setErrorGuardadoId(null);
    try {
      const res = await authFetch(`${API}/produccion/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modulo: row.modulo || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Error guardando módulo:", e);
      setErrorGuardadoId(row.id);
    } finally {
      setGuardandoId(null);
    }
  };

  const handleColorChange = async (row, valor) => {
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, color: valor } : r)),
    );
    setGuardandoColorId(row.id);
    setErrorColorId(null);
    try {
      const res = await authFetch(`${API}/produccion/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: valor || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Error guardando color:", e);
      setErrorColorId(row.id);
    } finally {
      setGuardandoColorId(null);
    }
  };

  // ── Edición de las columnas de seguimiento de proceso ───────────────────

  // Select SI/NO (DOMUS, PERFORADO, ARMADO, DESPACHO): se guarda al cambiar,
  // igual que `color`.
  const handleEtapaChange = async (row, campo, valor) => {
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, [campo]: valor } : r)),
    );
    const key = `${row.id}-${campo}`;
    setGuardandoCampo(key);
    setErrorCampo(null);
    try {
      const res = await authFetch(`${API}/produccion/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error(`Error guardando ${campo}:`, e);
      setErrorCampo(key);
    } finally {
      setGuardandoCampo(null);
    }
  };

  // Input de texto (OP, USPER, USARM, USDES): se guarda al salir del campo,
  // igual que `modulo`.
  const handleTextoCampoChange = (id, campo, valor) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)),
    );
  };

  const handleTextoCampoBlur = async (row, campo) => {
    const key = `${row.id}-${campo}`;
    setGuardandoCampo(key);
    setErrorCampo(null);
    try {
      const res = await authFetch(`${API}/produccion/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: row[campo] || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error(`Error guardando ${campo}:`, e);
      setErrorCampo(key);
    } finally {
      setGuardandoCampo(null);
    }
  };

  // ── Escaneo de código de barras ─────────────────────────────────────────

  const handleCodigoDetectado = (codigo) => {
    setEscaneando(false);
    const limpio = codigo.trim();
    const fila = rows.find(
      (r) => (r.codpro ?? "").toLowerCase() === limpio.toLowerCase(),
    );
    if (fila) {
      setDetalle(fila);
    } else {
      alert(`No se encontró ningún ítem con el código "${limpio}".`);
    }
  };

  // ── Filtro ────────────────────────────────────────────────────────────

  // Evalúa si una fila cae dentro de la "cola" de la etapa seleccionada.
  // DOMUS: todo lo que sigue en NO (primera etapa, sin requisito previo).
  // PERFORADO: DOMUS=SI y PERFORADO=NO (ya pasó Domus, falta perforar).
  // ARMADO: DOMUS=SI, PERFORADO=SI y ARMADO=NO (ya pasó las dos anteriores,
  // falta armar).
  const cumpleEtapa = (r) => {
    if (!filtroEtapa) return true;
    if (filtroEtapa === "DOMUS") return (r.DOMUS ?? "NO") !== "SI";
    if (filtroEtapa === "PERFORADO")
      return r.DOMUS === "SI" && (r.PERFORADO ?? "NO") !== "SI";
    if (filtroEtapa === "ARMADO")
      return (
        r.DOMUS === "SI" &&
        r.PERFORADO === "SI" &&
        (r.ARMADO ?? "NO") !== "SI"
      );
    return true;
  };

  const q = search.toLowerCase();
  const filtered = rows.filter(
    (r) =>
      cumpleEtapa(r) &&
      ((r.codpro ?? "").toLowerCase().includes(q) ||
        (r.cliente_nombre ?? "").toLowerCase().includes(q) ||
        String(r.numeropres ?? "").includes(q) ||
        (r.grupo ?? "").toLowerCase().includes(q) ||
        (r.producto ?? "").toLowerCase().includes(q) ||
        (r.modulo ?? "").toLowerCase().includes(q) ||
        nombreMelamina(r.color).toLowerCase().includes(q) ||
        (r.OP ?? "").toLowerCase().includes(q) ||
        (r.USPER ?? "").toLowerCase().includes(q) ||
        (r.USARM ?? "").toLowerCase().includes(q) ||
        (r.USDES ?? "").toLowerCase().includes(q)),
  );

  const pendientes = rows.filter((r) => !r.modulo || !r.modulo.trim()).length;

  // Cantidades para los badges de los 3 botones de etapa (siempre contadas
  // sobre `rows` completo, no sobre `filtered`, para que el número no
  // cambie según qué botón esté activo).
  const countDomus = rows.filter((r) => (r.DOMUS ?? "NO") !== "SI").length;
  const countPerforado = rows.filter(
    (r) => r.DOMUS === "SI" && (r.PERFORADO ?? "NO") !== "SI",
  ).length;
  const countArmado = rows.filter(
    (r) =>
      r.DOMUS === "SI" && r.PERFORADO === "SI" && (r.ARMADO ?? "NO") !== "SI",
  ).length;

  // ── Selección ─────────────────────────────────────────────────────────

  const handleSelect = (row) => {
    setSelected(row?.id === selected?.id ? null : row);
  };

  // ── DELETE fila puntual ──────────────────────────────────────────────

  const handleDelete = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      const res = await authFetch(`${API}/produccion/${aEliminar.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows((prev) => prev.filter((r) => r.id !== aEliminar.id));
      if (selected?.id === aEliminar.id) setSelected(null);
      setAEliminar(null);
    } catch (e) {
      console.error("Error borrando fila de producción:", e);
      alert("No se pudo borrar la fila. Revisá la consola.");
    } finally {
      setEliminando(false);
    }
  };

  // ── Estilos compartidos por los campos editables de la tabla ───────────

  const estiloInput = (row, campo, guardandoId, errorId) => ({
    width: "100%",
    maxWidth: "140px",
    padding: "4px 8px",
    fontSize: "12px",
    fontFamily: "'Space Mono',monospace",
    border: `1.5px solid ${errorId === (campo ? `${row.id}-${campo}` : row.id) ? "#e57373" : "#b8d6ef"}`,
    borderRadius: "4px",
    background: guardandoId === (campo ? `${row.id}-${campo}` : row.id) ? "#fffbe6" : "#fff",
    color: "#0a3a5c",
  });

  // ── Columnas ──────────────────────────────────────────────────────────

  // Columnas base: siempre se muestran (código, presupuesto, cliente,
  // producto, módulo y color) sin importar qué botón de etapa esté activo.
  const columnasBase = [
    {
      key: "codpro",
      label: "Cód.",
      render: (v, row) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setDetalle(row);
          }}
          title="Ver detalle"
          style={{
            display: "inline-block",
            background: "#0a3a5c",
            color: "#fff",
            borderRadius: "4px",
            padding: "1px 8px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.5px",
            fontFamily: "'Space Mono', monospace",
            cursor: "pointer",
          }}
        >
          {v ?? "—"}
        </span>
      ),
    },
    {
      key: "numeropres",
      label: "N°",
      render: (v) => (v ? String(v).padStart(4, "0") : "—"),
    },
    {
      key: "revision",
      label: "Rev.",
      render: (v) => (
        <span
          style={{
            display: "inline-block",
            background: Number(v) === 0 ? "#eaf3fb" : "#fff3cd",
            color: Number(v) === 0 ? "#2d7fc1" : "#856404",
            border: `1px solid ${Number(v) === 0 ? "#b8d6ef" : "#ffc107"}`,
            borderRadius: "4px",
            padding: "1px 8px",
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: "'Space Mono', monospace",
          }}
        >
          Rev. {v ?? 0}
        </span>
      ),
    },
    {
      key: "cliente_nombre",
      label: "Cliente",
      render: (v) => v ?? "(sin cliente)",
    },
    { key: "grupo", label: "Grupo", render: (v) => v ?? "—" },
    { key: "producto", label: "Producto", render: (v) => v ?? "—" },
    {
      key: "modulo",
      label: "Módulo",
      render: (v, row) => (
        <input
          type="text"
          value={row.modulo ?? ""}
          placeholder="Sin cargar"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleModuloChange(row.id, e.target.value)}
          onBlur={() => handleModuloBlur(row)}
          maxLength={50}
          style={{
            width: "100%",
            maxWidth: "180px",
            padding: "4px 8px",
            fontSize: "12px",
            fontFamily: "'Space Mono',monospace",
            border: `1.5px solid ${
              errorGuardadoId === row.id ? "#e57373" : "#b8d6ef"
            }`,
            borderRadius: "4px",
            background: guardandoId === row.id ? "#fffbe6" : "#fff",
            color: "#0a3a5c",
          }}
        />
      ),
    },
    {
      key: "color",
      label: "Color",
      render: (v, row) => (
        <select
          value={row.color ?? ""}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleColorChange(row, e.target.value)}
          style={{
            width: "100%",
            maxWidth: "200px",
            padding: "4px 8px",
            fontSize: "12px",
            fontFamily: "'Space Mono',monospace",
            border: `1.5px solid ${
              errorColorId === row.id ? "#e57373" : "#b8d6ef"
            }`,
            borderRadius: "4px",
            background: guardandoColorId === row.id ? "#fffbe6" : "#fff",
            color: "#0a3a5c",
          }}
        >
          <option value="">Sin color</option>
          {melaminas.map((m) => (
            <option key={m.codartint} value={m.codartint}>
              {m.articulo}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "modelo3d",
      label: "3D",
      render: (v, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setModelo3D(row);
          }}
          title="Ver módulo en 3D"
          style={{
            background: "#eaf3fb",
            color: "#0a3a5c",
            border: "1px solid #b8d6ef",
            borderRadius: "4px",
            padding: "3px 10px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Space Mono', monospace",
          }}
        >
          🧊 Ver
        </button>
      ),
    },
  ];

  const columnaOP = {
    key: "OP",
    label: "OP",
    render: (v, row) => (
      <input
        type="text"
        value={row.OP ?? ""}
        placeholder="—"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => handleTextoCampoChange(row.id, "OP", e.target.value)}
        onBlur={() => handleTextoCampoBlur(row, "OP")}
        maxLength={10}
        style={estiloInput(row, "OP", guardandoCampo, errorCampo)}
      />
    ),
  };

  // Columnas de cada etapa (Domus/Perforado/Armado/Despacho), agrupadas por
  // etapa para poder elegir cuáles mostrar según el filtro activo. Cada una
  // sigue el mismo patrón: select SI/NO que guarda al cambiar, y si tiene
  // usuario asociado, un input de texto al lado que guarda al salir del
  // campo.
  const columnasPorEtapa = {};
  ETAPAS.forEach(({ campo, label, usuario }) => {
    const cols = [
      {
        key: campo,
        label,
        render: (v, row) => (
          <select
            value={row[campo] ?? "NO"}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => handleEtapaChange(row, campo, e.target.value)}
            style={estiloInput(row, campo, guardandoCampo, errorCampo)}
          >
            <option value="NO">NO</option>
            <option value="SI">SI</option>
          </select>
        ),
      },
    ];
    if (usuario) {
      cols.push({
        key: usuario,
        label: `Usuario (${label})`,
        render: (v, row) => (
          <input
            type="text"
            value={row[usuario] ?? ""}
            placeholder="—"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) =>
              handleTextoCampoChange(row.id, usuario, e.target.value)
            }
            onBlur={() => handleTextoCampoBlur(row, usuario)}
            maxLength={50}
            style={estiloInput(row, usuario, guardandoCampo, errorCampo)}
          />
        ),
      });
    }
    columnasPorEtapa[campo] = cols;
  });

  // Qué columnas de etapa se agregan después de las base, según el botón
  // activo. Sin filtro: todo (OP + las 4 etapas). Con un filtro activo, solo
  // se muestran las etapas YA completadas (para confirmar que están en SI)
  // — nunca la etapa que se está filtrando ni las siguientes, porque ahí
  // todavía no hay nada cargado.
  //   DOMUS      → solo columnas base (hasta Color)
  //   PERFORADO  → base + Domus
  //   ARMADO     → base + Domus + Perforado
  const columnasEtapasSegunFiltro = {
    DOMUS: [],
    PERFORADO: [...columnasPorEtapa.DOMUS],
    ARMADO: [...columnasPorEtapa.DOMUS, ...columnasPorEtapa.PERFORADO],
  };

  const columns = filtroEtapa
    ? [...columnasBase, ...columnasEtapasSegunFiltro[filtroEtapa]]
    : [
        ...columnasBase,
        columnaOP,
        ...ETAPAS.flatMap(({ campo }) => columnasPorEtapa[campo]),
      ];

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      <ScreenHeader
        icon="🏭"
        title="Producción"
        subtitle="Ítems de presupuestos confirmados — completar módulo"
      />

      <StatCards
        stats={[
          { label: "Total ítems", value: rows.length },
          { label: "Sin módulo", value: pendientes },
          { label: "Filtrados", value: filtered.length },
        ]}
      />

      <button
        type="button"
        onClick={() => setEscaneando(true)}
        style={{
          WebkitAppearance: "none",
          appearance: "none",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: "10px",

          width: "100%",
          height: isMobile ? "52px" : "56px",
          minHeight: isMobile ? "52px" : "56px",
          maxHeight: isMobile ? "52px" : "56px",

          margin: "10px 0",
          padding: isMobile ? "0 12px" : "0 20px",

          borderRadius: "6px",
          border: "1.5px solid #0a3a5c",
          background: "#0a3a5c",
          cursor: "pointer",
          overflow: "hidden",
        }}
        title="Escanear código de barras"
      >
        <span
          style={{
            display: "block",
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "left",
            color: "#ffffff",
            fontWeight: 700,
            lineHeight: "1.2",
            fontFamily: "'Space Mono', monospace",
            fontSize: isMobile ? "clamp(10px, 3.6vw, 14px)" : "18px",
            letterSpacing: isMobile ? "0.2px" : "0.5px",
          }}
        >
          📷 ESCANEAR CÓDIGO DE BARRAS
        </span>
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          margin: "12px 0",
          flexWrap: "wrap",
        }}
      >
        {[
          { etapa: "DOMUS", label: "Domus", count: countDomus },
          { etapa: "PERFORADO", label: "Perforado", count: countPerforado },
          { etapa: "ARMADO", label: "Armado", count: countArmado },
        ].map(({ etapa, label, count }) => {
          const activo = filtroEtapa === etapa;
          return (
            <button
              key={etapa}
              onClick={() => setFiltroEtapa(activo ? null : etapa)}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.5px",
                fontFamily: "'Space Mono', monospace",
                borderRadius: "4px",
                border: `1.5px solid ${activo ? "#0a3a5c" : "#b8d6ef"}`,
                background: activo ? "#0a3a5c" : "#fff",
                color: activo ? "#fff" : "#0a3a5c",
                cursor: "pointer",
              }}
              title={`Ver ítems pendientes de ${label}`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ActionBar
          selected={selected}
          onNew={null}
          onEdit={null}
          onDelete={selected ? () => setAEliminar(selected) : null}
          search={search}
          onSearch={setSearch}
        />
      </div>

      {loading ? (
        <p
          style={{
            padding: "24px",
            color: "#4a8ab5",
            fontFamily: "'Space Mono',monospace",
          }}
        >
          ⏳ Cargando producción...
        </p>
      ) : filtered.length === 0 ? (
        <p
          style={{
            padding: "24px",
            color: "#8aabb8",
            fontFamily: "'Space Mono',monospace",
          }}
        >
          No hay ítems en producción todavía. Se cargan solos al confirmar un
          presupuesto.
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          selectedId={selected?.id}
          onSelect={handleSelect}
          storageKey={`produccion-${filtroEtapa ?? "todos"}`}
        />
      )}

      {aEliminar && (
        <ConfirmDelete
          item={aEliminar}
          title="¿Eliminar ítem de producción?"
          message={
            <>
              Vas a eliminar de producción el ítem{" "}
              <strong>{aEliminar.producto ?? "sin nombre"}</strong> del
              presupuesto{" "}
              <strong>
                N° {String(aEliminar.numeropres).padStart(4, "0")}
              </strong>
              . Esta acción no se puede deshacer.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => !eliminando && setAEliminar(null)}
        />
      )}

      {detalle && (
        <DetalleProduccion
          row={detalle}
          nombreMelamina={nombreMelamina}
          onClose={() => setDetalle(null)}
        />
      )}

      {escaneando && (
        <EscanerBarcode
          onDetected={handleCodigoDetectado}
          onClose={() => setEscaneando(false)}
        />
      )}

      {modelo3D && (
        <div
          onClick={() => setModelo3D(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,58,92,0.55)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              maxWidth: 900,
              height: "80vh",
              background: "#0f1115",
              borderRadius: 10,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <button
              onClick={() => setModelo3D(null)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 10,
                background: "rgba(20,22,28,0.65)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
            <VisorDWG
              codigo={modelo3D.codpro}
              modelosApiUrl={API}
              apiUrl={`${API}/api/dwg`}
            />
          </div>
        </div>
      )}
    </>
  );
}
