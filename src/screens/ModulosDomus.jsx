import { useState, useEffect } from "react";
import DataTable from "../Component/DataTable";
import ActionBar from "../Component/ActionBar";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import ConfirmDelete from "../Component/ConfirmDelete";

const API = "https://integral-backend-production.up.railway.app";

// ── Componente ────────────────────────────────────────────────────────────
//
// Tabla ÚNICA de piezas (`modulos-domus`) para todos los artículos, pero la
// pantalla opera "por artículo": la tabla de arriba agrupa las piezas por
// codartint (una fila = un artículo, con la cuenta de piezas), y al hacer
// clic en un artículo se abre un panel con SOLO las piezas de ese artículo
// (filtradas de la misma tabla), donde se cargan/editan una por una.
//
// Cada pieza se vincula a una fórmula puntual de Producción (`codform`) —
// eso es lo que después usa el generador del CSV de fórmulas
// (GET /produccion/:id/formulas-csv en tabla-produccion_routes.js) para
// saber qué BPP/CANT1-4/VETA le corresponde a cada renglón del CSV. La
// pantalla "Asociaciones de Fórmulas" ya no cumple ese rol.
//
// Guardado: alta = POST /modulos-domus, edición = PUT /modulos-domus/:id,
// borrado = DELETE /modulos-domus/:id (antes todo era upsert por
// codartint; ahora cada pieza es su propia fila con `id`).

const CAMPOS_TEXTO_PIEZA = [
  { campo: "bpp", label: "BPP", maxLength: 30 },
  { campo: "cant1", label: "Cant1", maxLength: 100 },
  { campo: "cant2", label: "Cant2", maxLength: 100 },
  { campo: "cant3", label: "Cant3", maxLength: 100 },
  { campo: "cant4", label: "Cant4", maxLength: 100 },
  { campo: "veta", label: "Veta", maxLength: 100 },
  { campo: "formulax", label: "Fórmula X", maxLength: 255 },
  { campo: "formulay", label: "Fórmula Y", maxLength: 255 },
];

const CAMPOS_NUMERICOS_PIEZA = [
  { campo: "ancho", label: "Ancho" },
  { campo: "alto", label: "Alto" },
  { campo: "cantidad", label: "Cantidad" },
];

const ESTILO_INPUT_BASE = {
  width: "100%",
  padding: "4px 8px",
  fontSize: "12px",
  fontFamily: "'Space Mono',monospace",
  borderRadius: "4px",
  color: "#0a3a5c",
};

export default function ModulosDomus({ authFetch, token }) {
  // ── Tabla de arriba (todas las piezas, agrupadas por artículo) ────────
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null); // artículo seleccionado (para ActionBar)
  const [filtroModulo, setFiltroModulo] = useState(null);

  const [aEliminarArticulo, setAEliminarArticulo] = useState(null);
  const [eliminandoArticulo, setEliminandoArticulo] = useState(false);

  // ── Panel de piezas de un artículo ──────────────────────────────────
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [articuloPanel, setArticuloPanel] = useState(null); // { codartint, articulo_descripcion }
  const [piezasPanel, setPiezasPanel] = useState([]);
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [errorPanel, setErrorPanel] = useState(null);
  const [agregandoPieza, setAgregandoPieza] = useState(false);
  const [aEliminarPieza, setAEliminarPieza] = useState(null);
  const [eliminandoPieza, setEliminandoPieza] = useState(false);

  // Guardado inline por campo: key = `${id}-${campo}`, mismo patrón que
  // `guardandoCampo`/`errorCampo` de Producción.jsx.
  const [guardandoCampo, setGuardandoCampo] = useState(null);
  const [errorCampo, setErrorCampo] = useState(null);

  // Desplegable de fórmula ↔ pieza: solo una fila puede estar editando su
  // fórmula a la vez.
  const [formulaEditId, setFormulaEditId] = useState(null);
  const [formulaQuery, setFormulaQuery] = useState("");
  const [formulaResultados, setFormulaResultados] = useState([]);
  const [formulaFocus, setFormulaFocus] = useState(false);
  const [buscandoFormula, setBuscandoFormula] = useState(false);

  // ── Modal de alta de artículo NUEVO (crea la primera pieza) ───────────
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nuevoCodartint, setNuevoCodartint] = useState("");
  const [nuevoDescripcion, setNuevoDescripcion] = useState("");
  const [nuevoModulo, setNuevoModulo] = useState("");
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState(null);
  const [nuevoBusqueda, setNuevoBusqueda] = useState("");
  const [nuevoResultados, setNuevoResultados] = useState([]);
  const [nuevoFocus, setNuevoFocus] = useState(false);
  const [buscandoArticulo, setBuscandoArticulo] = useState(false);

  // Búsqueda server-side con debounce contra /articulos/buscar-descripcion.
  useEffect(() => {
    if (!nuevoBusqueda.trim()) {
      setNuevoResultados([]);
      setBuscandoArticulo(false);
      return;
    }
    setBuscandoArticulo(true);
    const timer = setTimeout(() => {
      authFetch(
        `${API}/articulos/buscar-descripcion?q=${encodeURIComponent(nuevoBusqueda.trim())}`,
      )
        .then((r) => r.json())
        .then((data) => setNuevoResultados(Array.isArray(data) ? data : []))
        .catch(() => setNuevoResultados([]))
        .finally(() => setBuscandoArticulo(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [nuevoBusqueda, authFetch]);

  // Búsqueda server-side con debounce contra /modulos-domus/formulas-buscar,
  // para el desplegable de fórmula de la pieza que se esté editando.
  useEffect(() => {
    if (formulaEditId === null || !formulaQuery.trim()) {
      setFormulaResultados([]);
      setBuscandoFormula(false);
      return;
    }
    setBuscandoFormula(true);
    const timer = setTimeout(() => {
      authFetch(
        `${API}/modulos-domus/formulas-buscar?q=${encodeURIComponent(formulaQuery.trim())}`,
      )
        .then((r) => r.json())
        .then((data) => setFormulaResultados(Array.isArray(data) ? data : []))
        .catch(() => setFormulaResultados([]))
        .finally(() => setBuscandoFormula(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [formulaQuery, formulaEditId, authFetch]);

  // ── Fetch tabla de arriba ─────────────────────────────────────────────

  const fetchModulosDomus = () => {
    setLoading(true);
    setErrorCarga(null);
    authFetch(`${API}/modulos-domus`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error(e);
        setErrorCarga(e.message);
        setRows([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchModulosDomus();
  }, []);

  // ── Fetch + acciones del panel de piezas ─────────────────────────────

  const fetchPiezasArticulo = (codartint) => {
    setLoadingPanel(true);
    setErrorPanel(null);
    authFetch(`${API}/modulos-domus/por-articulo/${encodeURIComponent(codartint)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        setPiezasPanel(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error(e);
        setErrorPanel(e.message);
        setPiezasPanel([]);
      })
      .finally(() => setLoadingPanel(false));
  };

  const abrirPanel = (articulo) => {
    setArticuloPanel(articulo);
    setPanelAbierto(true);
    setFormulaEditId(null);
    fetchPiezasArticulo(articulo.codartint);
  };

  const cerrarPanel = () => {
    setPanelAbierto(false);
    setArticuloPanel(null);
    setPiezasPanel([]);
    setFormulaEditId(null);
    fetchModulosDomus(); // refresca cuenta de piezas en la tabla de arriba
  };

  // ── Edición inline de una pieza (guarda al salir del campo) ──────────

  const handleCampoChange = (id, campo, valor) => {
    setPiezasPanel((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)),
    );
  };

  const handleCampoBlur = async (pieza, campo) => {
    const key = `${pieza.id}-${campo}`;
    setGuardandoCampo(key);
    setErrorCampo(null);
    try {
      const res = await authFetch(`${API}/modulos-domus/${pieza.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: pieza[campo] === "" ? null : pieza[campo] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error(`Error guardando ${campo}:`, e);
      setErrorCampo(key);
    } finally {
      setGuardandoCampo(null);
    }
  };

  // `modulo` no cambia el agrupamiento de arriba en vivo (se refresca recién
  // al cerrar el panel), así que se guarda igual que cualquier otro campo.

  // ── Fórmula ↔ pieza ────────────────────────────────────────────────

  const handleSeleccionarFormula = async (pieza, formula) => {
    const tituloNuevo = pieza.titulo && pieza.titulo.trim() ? pieza.titulo : formula.descripcion || "";
    setPiezasPanel((prev) =>
      prev.map((p) =>
        p.id === pieza.id
          ? { ...p, codform: formula.codform, titulo: tituloNuevo, formula_descripcion: formula.descripcion }
          : p,
      ),
    );
    setFormulaEditId(null);
    setFormulaQuery("");
    setFormulaResultados([]);
    const key = `${pieza.id}-codform`;
    setGuardandoCampo(key);
    setErrorCampo(null);
    try {
      const res = await authFetch(`${API}/modulos-domus/${pieza.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codform: formula.codform, titulo: tituloNuevo || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Error guardando fórmula de la pieza:", e);
      setErrorCampo(key);
    } finally {
      setGuardandoCampo(null);
    }
  };

  // ── Alta de pieza nueva (dentro del panel, codartint ya fijo) ────────

  const handleAgregarPieza = async () => {
    if (!articuloPanel) return;
    setAgregandoPieza(true);
    try {
      const res = await authFetch(`${API}/modulos-domus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codartint: articuloPanel.codartint }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      fetchPiezasArticulo(articuloPanel.codartint);
    } catch (e) {
      console.error("Error agregando pieza:", e);
      alert("No se pudo agregar la pieza. Revisá la consola.");
    } finally {
      setAgregandoPieza(false);
    }
  };

  // ── Borrado de una pieza puntual ──────────────────────────────────

  const handleDeletePieza = async () => {
    if (!aEliminarPieza) return;
    setEliminandoPieza(true);
    try {
      const res = await authFetch(`${API}/modulos-domus/${aEliminarPieza.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPiezasPanel((prev) => prev.filter((p) => p.id !== aEliminarPieza.id));
      setAEliminarPieza(null);
    } catch (e) {
      console.error("Error borrando pieza:", e);
      alert("No se pudo borrar la pieza. Revisá la consola.");
    } finally {
      setEliminandoPieza(false);
    }
  };

  // ── Alta de artículo nuevo (crea la primera pieza) ───────────────────

  const handleCrearNuevo = async () => {
    if (!nuevoCodartint.trim()) return;
    setGuardandoNuevo(true);
    setErrorNuevo(null);
    try {
      const res = await authFetch(`${API}/modulos-domus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codartint: nuevoCodartint.trim(),
          modulo: nuevoModulo.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const articulo = {
        codartint: nuevoCodartint.trim(),
        articulo_descripcion: nuevoDescripcion || null,
      };
      setNuevoAbierto(false);
      setNuevoCodartint("");
      setNuevoDescripcion("");
      setNuevoModulo("");
      setNuevoBusqueda("");
      setNuevoResultados([]);
      fetchModulosDomus();
      setSelected(articulo);
      abrirPanel(articulo);
    } catch (e) {
      console.error("Error creando artículo en modulos-domus:", e);
      setErrorNuevo(e.message || "No se pudo guardar.");
    } finally {
      setGuardandoNuevo(false);
    }
  };

  // ── Borrado de TODAS las piezas de un artículo (desde la tabla de arriba) ─

  const handleDeleteArticulo = async () => {
    if (!aEliminarArticulo) return;
    setEliminandoArticulo(true);
    try {
      const ids = aEliminarArticulo.piezas.map((p) => p.id);
      for (const id of ids) {
        const res = await authFetch(`${API}/modulos-domus/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      if (selected?.codartint === aEliminarArticulo.codartint) setSelected(null);
      if (articuloPanel?.codartint === aEliminarArticulo.codartint) cerrarPanel();
      setAEliminarArticulo(null);
      fetchModulosDomus();
    } catch (e) {
      console.error("Error borrando piezas del artículo:", e);
      alert("No se pudo borrar el artículo. Revisá la consola.");
    } finally {
      setEliminandoArticulo(false);
    }
  };

  // ── Filtro por módulo + búsqueda (sobre las piezas, luego se agrupa) ──

  const modulos = [...new Set(rows.map((r) => r.modulo).filter(Boolean))].sort();

  const q = search.toLowerCase();
  const piezasFiltradas = rows.filter(
    (r) =>
      (!filtroModulo || r.modulo === filtroModulo) &&
      ((r.codartint ?? "").toLowerCase().includes(q) ||
        (r.articulo_descripcion ?? "").toLowerCase().includes(q) ||
        (r.modulo ?? "").toLowerCase().includes(q) ||
        (r.bpp ?? "").toLowerCase().includes(q) ||
        (r.veta ?? "").toLowerCase().includes(q) ||
        (r.titulo ?? "").toLowerCase().includes(q) ||
        (r.codform ?? "").toLowerCase().includes(q)),
  );

  // Agrupado por artículo: una fila de la tabla de arriba = un codartint.
  const articulosMap = new Map();
  piezasFiltradas.forEach((r) => {
    if (!articulosMap.has(r.codartint)) {
      articulosMap.set(r.codartint, {
        codartint: r.codartint,
        articulo_descripcion: r.articulo_descripcion,
        piezas: [],
      });
    }
    articulosMap.get(r.codartint).piezas.push(r);
  });
  const articulos = [...articulosMap.values()]
    .map((a) => ({
      ...a,
      totalPiezas: a.piezas.length,
      sinFormula: a.piezas.filter((p) => !p.codform).length,
      modulosTexto: [...new Set(a.piezas.map((p) => p.modulo).filter(Boolean))].join(", "),
    }))
    .sort((a, b) => (a.codartint > b.codartint ? 1 : -1));

  const totalArticulos = new Set(rows.map((r) => r.codartint)).size;
  const totalPiezasSinFormula = rows.filter((r) => !r.codform).length;

  // ── Estilos de los inputs editables del panel ───────────────────────

  const estiloInputPanel = (pieza, campo, ancho = "100px") => ({
    ...ESTILO_INPUT_BASE,
    maxWidth: ancho,
    border: `1.5px solid ${
      errorCampo === `${pieza.id}-${campo}` ? "#e57373" : "#b8d6ef"
    }`,
    background: guardandoCampo === `${pieza.id}-${campo}` ? "#fffbe6" : "#fff",
  });

  // ── Columnas de la tabla de arriba (artículos) ───────────────────────

  const columnsArticulos = [
    { key: "codartint", label: "Código", render: (v) => v ?? "—" },
    { key: "articulo_descripcion", label: "Artículo", render: (v) => v ?? "—" },
    { key: "modulosTexto", label: "Módulo(s)", render: (v) => v || "—" },
    { key: "totalPiezas", label: "Piezas" },
    {
      key: "sinFormula",
      label: "Sin fórmula",
      render: (v) =>
        v > 0 ? <span style={{ color: "#c0392b", fontWeight: 700 }}>{v}</span> : "0",
    },
  ];

  // ── Columnas de la tabla del panel (piezas del artículo) ─────────────

  const columnsPiezas = [
    {
      key: "codform",
      label: "Fórmula",
      render: (v, pieza) =>
        formulaEditId === pieza.id ? (
          <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              autoFocus
              value={formulaQuery}
              onChange={(e) => setFormulaQuery(e.target.value)}
              onFocus={() => setFormulaFocus(true)}
              onBlur={() => setTimeout(() => setFormulaFocus(false), 160)}
              placeholder="Buscar por código o descripción..."
              autoComplete="off"
              style={{ ...ESTILO_INPUT_BASE, maxWidth: "180px", border: "1.5px solid #b8d6ef" }}
            />
            {formulaFocus && formulaResultados.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1px solid #b8cfe0",
                  borderTop: "none",
                  zIndex: 1300,
                  boxShadow: "0 6px 18px #0002",
                  maxHeight: 200,
                  overflowY: "auto",
                  borderRadius: "0 0 3px 3px",
                }}
              >
                {formulaResultados.map((f) => (
                  <div
                    key={f.codform}
                    onMouseDown={() => handleSeleccionarFormula(pieza, f)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: "'Space Mono',monospace",
                      borderBottom: "1px solid #eef2f6",
                      color: "#0a3a5c",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#ddeefa")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    <span style={{ fontWeight: 700 }}>{f.descripcion}</span>
                    <span style={{ color: "#8aabcc", marginLeft: 8, fontSize: 10 }}>
                      {f.codform}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {formulaFocus &&
              !buscandoFormula &&
              formulaResultados.length === 0 &&
              formulaQuery.trim().length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #b8cfe0",
                    borderTop: "none",
                    zIndex: 1300,
                    padding: "8px 12px",
                    color: "#8aabcc",
                    fontSize: 11,
                  }}
                >
                  Sin resultados
                </div>
              )}
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFormulaEditId(pieza.id);
              setFormulaQuery("");
              setFormulaResultados([]);
            }}
            title="Elegir fórmula"
            style={{
              padding: "4px 8px",
              fontSize: 11,
              fontFamily: "'Space Mono',monospace",
              border: `1.5px solid ${pieza.codform ? "#b8d6ef" : "#e57373"}`,
              borderRadius: 4,
              background: "#fff",
              color: pieza.codform ? "#0a3a5c" : "#c0392b",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
              maxWidth: 180,
            }}
          >
            {pieza.codform
              ? `${pieza.formula_descripcion || pieza.codform}`
              : "Sin asignar"}
          </button>
        ),
    },
    {
      key: "titulo",
      label: "Título",
      render: (v, pieza) => (
        <input
          type="text"
          value={pieza.titulo ?? ""}
          placeholder="—"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleCampoChange(pieza.id, "titulo", e.target.value)}
          onBlur={() => handleCampoBlur(pieza, "titulo")}
          maxLength={255}
          style={estiloInputPanel(pieza, "titulo", "160px")}
        />
      ),
    },
    {
      key: "modulo",
      label: "Módulo",
      render: (v, pieza) => (
        <input
          type="text"
          value={pieza.modulo ?? ""}
          placeholder="Sin cargar"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleCampoChange(pieza.id, "modulo", e.target.value)}
          onBlur={() => handleCampoBlur(pieza, "modulo")}
          maxLength={50}
          style={estiloInputPanel(pieza, "modulo", "120px")}
        />
      ),
    },
    ...CAMPOS_NUMERICOS_PIEZA.map(({ campo, label }) => ({
      key: campo,
      label,
      render: (v, pieza) => (
        <input
          type="number"
          step="0.1"
          value={pieza[campo] ?? ""}
          placeholder="—"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleCampoChange(pieza.id, campo, e.target.value)}
          onBlur={() => handleCampoBlur(pieza, campo)}
          style={estiloInputPanel(pieza, campo, "80px")}
        />
      ),
    })),
    ...CAMPOS_TEXTO_PIEZA.map(({ campo, label, maxLength }) => ({
      key: campo,
      label,
      render: (v, pieza) => (
        <input
          type="text"
          value={pieza[campo] ?? ""}
          placeholder="—"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleCampoChange(pieza.id, campo, e.target.value)}
          onBlur={() => handleCampoBlur(pieza, campo)}
          maxLength={maxLength}
          style={estiloInputPanel(
            pieza,
            campo,
            campo === "bpp" || campo.startsWith("cant") || campo === "veta" ? "90px" : "150px",
          )}
        />
      ),
    })),
    {
      key: "acciones",
      label: "",
      render: (v, pieza) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setAEliminarPieza(pieza);
          }}
          title="Eliminar pieza"
          style={{
            padding: "4px 8px",
            fontSize: 12,
            border: "1.5px solid #e57373",
            borderRadius: 4,
            background: "#fff",
            color: "#c0392b",
            cursor: "pointer",
          }}
        >
          🗑
        </button>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      <ScreenHeader
        icon="🧩"
        title="Módulos Domus"
        subtitle="Piezas por artículo para el CSV de fórmulas de producción"
      />

      <StatCards
        stats={[
          { label: "Total artículos", value: totalArticulos },
          { label: "Piezas sin fórmula", value: totalPiezasSinFormula },
          { label: "Artículos filtrados", value: articulos.length },
        ]}
      />

      {modulos.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            margin: "12px 0",
            flexWrap: "wrap",
          }}
        >
          {modulos.map((m) => {
            const activo = filtroModulo === m;
            return (
              <button
                key={m}
                onClick={() => setFiltroModulo(activo ? null : m)}
                style={{
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: `1.5px solid ${activo ? "#0a3a5c" : "#b8d6ef"}`,
                  background: activo ? "#0a3a5c" : "#fff",
                  color: activo ? "#fff" : "#0a3a5c",
                  cursor: "pointer",
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ActionBar
          selected={selected}
          onNew={() => setNuevoAbierto(true)}
          onEdit={null}
          onDelete={
            selected
              ? () =>
                  setAEliminarArticulo(
                    articulos.find((a) => a.codartint === selected.codartint) ?? null,
                  )
              : null
          }
          search={search}
          onSearch={setSearch}
        />
      </div>

      {loading ? (
        <p style={{ padding: "24px", color: "#4a8ab5", fontFamily: "'Space Mono',monospace" }}>
          ⏳ Cargando módulos Domus...
        </p>
      ) : errorCarga ? (
        <p style={{ padding: "24px", color: "#c0392b", fontFamily: "'Space Mono',monospace" }}>
          ⚠ No se pudo cargar: {errorCarga}
        </p>
      ) : articulos.length === 0 ? (
        <p style={{ padding: "24px", color: "#8aabb8", fontFamily: "'Space Mono',monospace" }}>
          No hay artículos cargados todavía. Usá "Nuevo" para agregar el primero.
        </p>
      ) : (
        <DataTable
          columns={columnsArticulos}
          rows={articulos}
          selectedId={selected?.codartint}
          onSelect={(row) => {
            if (!row) {
              setSelected(null);
              return;
            }
            setSelected(row);
            abrirPanel(row);
          }}
          storageKey={`modulos-domus-articulos-${filtroModulo ?? "todos"}`}
        />
      )}

      {/* ── Panel de piezas del artículo seleccionado ──────────────────── */}
      {panelAbierto && articuloPanel && (
        <div
          onClick={cerrarPanel}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,58,92,0.55)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "40px 16px",
            overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 1100,
              background: "#fff",
              borderRadius: 10,
              padding: "20px 22px",
              fontFamily: "'Space Mono', monospace",
              color: "#0a3a5c",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>
                  {articuloPanel.articulo_descripcion || articuloPanel.codartint}
                </h3>
                <p style={{ margin: 0, fontSize: 11, color: "#8aabcc" }}>
                  {articuloPanel.codartint}
                </p>
              </div>
              <button
                onClick={cerrarPanel}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 18,
                  cursor: "pointer",
                  color: "#4a8ab5",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button
                onClick={handleAgregarPieza}
                disabled={agregandoPieza}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  border: "none",
                  background: "#1a7a44",
                  color: "#fff",
                  cursor: agregandoPieza ? "wait" : "pointer",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  opacity: agregandoPieza ? 0.6 : 1,
                }}
              >
                {agregandoPieza ? "Agregando…" : "+ Nueva pieza"}
              </button>
            </div>

            {loadingPanel ? (
              <p style={{ padding: "16px", color: "#4a8ab5", fontSize: 13 }}>
                ⏳ Cargando piezas...
              </p>
            ) : errorPanel ? (
              <p style={{ padding: "16px", color: "#c0392b", fontSize: 13 }}>
                ⚠ No se pudo cargar: {errorPanel}
              </p>
            ) : piezasPanel.length === 0 ? (
              <p style={{ padding: "16px", color: "#8aabb8", fontSize: 13 }}>
                Este artículo todavía no tiene piezas. Usá "+ Nueva pieza" para agregar la primera.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <DataTable
                  columns={columnsPiezas}
                  rows={piezasPanel}
                  selectedId={null}
                  onSelect={() => {}}
                  storageKey={`modulos-domus-piezas-${articuloPanel.codartint}`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {aEliminarArticulo && (
        <ConfirmDelete
          item={aEliminarArticulo}
          title="¿Eliminar artículo de Módulos Domus?"
          message={
            <>
              Vas a eliminar las <strong>{aEliminarArticulo.totalPiezas}</strong> pieza(s) de{" "}
              <strong>
                {aEliminarArticulo.articulo_descripcion ?? aEliminarArticulo.codartint}
              </strong>
              . Esto vacía los renglones de ese artículo en el próximo CSV de producción que se
              genere. Esta acción no se puede deshacer.
            </>
          }
          onConfirm={handleDeleteArticulo}
          onClose={() => !eliminandoArticulo && setAEliminarArticulo(null)}
        />
      )}

      {aEliminarPieza && (
        <ConfirmDelete
          item={aEliminarPieza}
          title="¿Eliminar esta pieza?"
          message={
            <>
              Vas a eliminar la pieza <strong>{aEliminarPieza.titulo || aEliminarPieza.codform || `#${aEliminarPieza.id}`}</strong>.
              Esta acción no se puede deshacer.
            </>
          }
          onConfirm={handleDeletePieza}
          onClose={() => !eliminandoPieza && setAEliminarPieza(null)}
        />
      )}

      {nuevoAbierto && (
        <div
          onClick={() => !guardandoNuevo && setNuevoAbierto(false)}
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
              maxWidth: 380,
              background: "#fff",
              borderRadius: 10,
              padding: "20px 22px",
              fontFamily: "'Space Mono', monospace",
              color: "#0a3a5c",
            }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>
              Nuevo artículo en Módulos Domus
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#4a8ab5" }}>
              Se crea la primera pieza del artículo. El resto (fórmula, BPP, Cant1-4,
              Veta, medidas) se carga después en el panel del artículo.
            </p>

            <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
              Artículo (buscar por código o nombre)
            </label>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                type="text"
                value={nuevoBusqueda}
                onChange={(e) => {
                  setNuevoBusqueda(e.target.value);
                  setNuevoCodartint(e.target.value);
                  setNuevoDescripcion("");
                }}
                onFocus={() => setNuevoFocus(true)}
                onBlur={() => setTimeout(() => setNuevoFocus(false), 160)}
                placeholder="Ej: KITMP000 o Kit Melamina..."
                autoComplete="off"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "6px 8px",
                  fontSize: 13,
                  fontFamily: "'Space Mono',monospace",
                  border: "1.5px solid #b8d6ef",
                  borderRadius: 4,
                }}
              />
              {nuevoFocus && nuevoResultados.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #b8cfe0",
                    borderTop: "none",
                    zIndex: 1200,
                    boxShadow: "0 6px 18px #0002",
                    maxHeight: 220,
                    overflowY: "auto",
                    borderRadius: "0 0 3px 3px",
                  }}
                >
                  {nuevoResultados.map((a) => (
                    <div
                      key={a.codartint}
                      onMouseDown={() => {
                        setNuevoCodartint(a.codartint);
                        setNuevoDescripcion(a.articulo);
                        setNuevoBusqueda(`${a.articulo} — ${a.codartint}`);
                        setNuevoResultados([]);
                      }}
                      style={{
                        padding: "8px 14px",
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: "'Space Mono',monospace",
                        borderBottom: "1px solid #eef2f6",
                        color: "#0a3a5c",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#ddeefa")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "#fff")
                      }
                    >
                      <span style={{ fontWeight: 700 }}>{a.articulo}</span>
                      <span
                        style={{ color: "#8aabcc", marginLeft: 8, fontSize: 10 }}
                      >
                        {a.codartint}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {nuevoFocus &&
                !buscandoArticulo &&
                nuevoResultados.length === 0 &&
                nuevoBusqueda.trim().length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "1px solid #b8cfe0",
                      borderTop: "none",
                      zIndex: 1200,
                      padding: "10px 14px",
                      color: "#8aabcc",
                      fontSize: 11,
                      borderRadius: "0 0 3px 3px",
                    }}
                  >
                    Sin resultados — se usará el código tipeado tal cual
                  </div>
                )}
            </div>

            <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
              Módulo (opcional)
            </label>
            <input
              type="text"
              value={nuevoModulo}
              onChange={(e) => setNuevoModulo(e.target.value)}
              placeholder="Ej: MP-01"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "6px 8px",
                fontSize: 13,
                fontFamily: "'Space Mono',monospace",
                border: "1.5px solid #b8d6ef",
                borderRadius: 4,
                marginBottom: 12,
              }}
            />

            {errorNuevo && (
              <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 12px" }}>
                {errorNuevo}
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => {
                  setNuevoAbierto(false);
                  setNuevoBusqueda("");
                  setNuevoResultados([]);
                }}
                disabled={guardandoNuevo}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  border: "1.5px solid #b8d6ef",
                  background: "#fff",
                  color: "#4a8ab5",
                  cursor: "pointer",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearNuevo}
                disabled={guardandoNuevo || !nuevoCodartint.trim()}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  border: "none",
                  background: "#1a7a44",
                  color: "#fff",
                  cursor: guardandoNuevo ? "wait" : "pointer",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  opacity: guardandoNuevo ? 0.6 : 1,
                }}
              >
                {guardandoNuevo ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
