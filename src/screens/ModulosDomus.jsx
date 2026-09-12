import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import DataTable from "../Component/DataTable";
import ActionBar from "../Component/ActionBar";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import ConfirmDelete from "../Component/ConfirmDelete";

const API = "https://integral-backend-production.up.railway.app";

// ── Componente ────────────────────────────────────────────────────────────
//
// CRUD de `modulos-domus`: guarda las PIEZAS que componen cada artículo
// (codartint), cada una con dos fórmulas asociadas INDEPENDIENTES
// (formulax → Ancho, formulay → Alto, ambas referencias a
// formulas_produccion) y los datos que completa el CSV de fórmulas de
// producción (bpp, cant1-4, veta) — ver GET /produccion/:id/formulas-csv
// en tabla-produccion_routes.js, que arma un renglón de CSV por cada pieza
// con formulax y/o formulay asignada.
//
// Un mismo codartint puede tener varias piezas, así que ya no hay upsert
// por codartint: alta = POST /modulos-domus (siempre inserta), edición y
// borrado = PUT/DELETE /modulos-domus/:id (id de la pieza puntual).
//
// La grilla principal muestra TODAS las piezas de TODOS los artículos
// mezcladas (como siempre). Al hacer clic en una fila se abre un panel
// filtrado por ese artículo, con sus piezas y un alta guiada por
// búsqueda de fórmula (mismo patrón de buscador+desplegable que el modal
// "Nuevo artículo").

const CAMPOS_TEXTO = [
  { campo: "bpp", label: "BPP", maxLength: 30 },
  { campo: "cant1", label: "Cant1", maxLength: 100 },
  { campo: "cant2", label: "Cant2", maxLength: 100 },
  { campo: "cant3", label: "Cant3", maxLength: 100 },
  { campo: "cant4", label: "Cant4", maxLength: 100 },
  { campo: "veta", label: "Veta", maxLength: 100 },
];

const CAMPOS_NUMERICOS = [
  { campo: "ancho", label: "Ancho" },
  { campo: "alto", label: "Alto" },
  { campo: "cantidad", label: "Cantidad" },
];

// Buscador de fórmula para una pieza existente (mini-table del panel): al
// elegir un resultado dispara onElegir(f) y se vacía solo, listo para la
// próxima búsqueda — es un buscador tipo comando, no queda mostrando el
// valor persistido (eso lo muestra la columna de solo lectura de al
// lado). El mismo codform elegido acá se guarda en formulax Y formulay;
// Ancho/Alto se resuelven después en el backend contra el Valor 1
// (`formula`) y Valor 2 (`formula2`) de ese registro. El desplegable usa
// un portal a document.body, posicionado con getBoundingClientRect(),
// para que no quede recortado por el overflow-x del mini-table.
function SelectorFormulaMadre({ formulas, cargarFormulas, onElegir }) {
  const [busqueda, setBusqueda] = useState("");
  const [focus, setFocus] = useState(false);
  const [coords, setCoords] = useState(null);
  const inputRef = useRef(null);

  const fq = busqueda.trim().toLowerCase();
  const resultados = fq
    ? formulas
        .filter(
          (f) =>
            (f.codform ?? "").toLowerCase().includes(fq) ||
            (f.descripcion ?? "").toLowerCase().includes(fq),
        )
        .slice(0, 15)
    : [];

  const actualizarCoords = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom, left: r.left, width: r.width });
  }, []);

  useEffect(() => {
    if (!focus) return;
    actualizarCoords();
    window.addEventListener("scroll", actualizarCoords, true);
    window.addEventListener("resize", actualizarCoords);
    return () => {
      window.removeEventListener("scroll", actualizarCoords, true);
      window.removeEventListener("resize", actualizarCoords);
    };
  }, [focus, actualizarCoords]);

  const mostrarLista = focus && resultados.length > 0;
  const mostrarSinResultados = focus && fq && resultados.length === 0;

  return (
    <div style={{ position: "relative", minWidth: 140 }} onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="text"
        value={busqueda}
        placeholder="Buscar fórmula..."
        onFocus={() => {
          cargarFormulas();
          setFocus(true);
          actualizarCoords();
        }}
        onChange={(e) => {
          setBusqueda(e.target.value);
          actualizarCoords();
        }}
        onBlur={() => setTimeout(() => setFocus(false), 160)}
        autoComplete="off"
        style={{
          width: "100%",
          padding: "4px 8px",
          fontSize: 11,
          fontFamily: "'Space Mono',monospace",
          border: "1.5px solid #b8d6ef",
          borderRadius: 4,
          color: "#0a3a5c",
        }}
      />
      {(mostrarLista || mostrarSinResultados) &&
        coords &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: mostrarLista ? "max-content" : coords.width,
              minWidth: mostrarLista ? 240 : 200,
              maxWidth: 360,
              background: "#fff",
              border: "1px solid #b8cfe0",
              zIndex: 3000,
              boxShadow: "0 6px 18px #0003",
              maxHeight: 180,
              overflowY: "auto",
              borderRadius: "0 0 4px 4px",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {mostrarLista
              ? resultados.map((f) => (
                  <div
                    key={f.codform}
                    onMouseDown={() => {
                      onElegir(f);
                      setBusqueda("");
                      setFocus(false);
                    }}
                    style={{
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "'Space Mono',monospace",
                      borderBottom: "1px solid #eef2f6",
                      color: "#0a3a5c",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#ddeefa")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    <span style={{ fontWeight: 700 }}>
                      {f.descripcion || "(sin descripción)"}
                    </span>
                    <span style={{ color: "#8aabcc", marginLeft: 6, fontSize: 9 }}>
                      {f.codform}
                    </span>
                  </div>
                ))
              : (
                  <div style={{ padding: "6px 10px", color: "#8aabcc", fontSize: 10 }}>
                    Sin resultados
                  </div>
                )}
          </div>,
          document.body,
        )}
    </div>
  );
}

// Vidriera de solo lectura: dado un código de fórmula ya guardado
// (formulax o formulay de la pieza), resuelve su descripción contra el
// catálogo cargado y lo muestra como "descripción — código". No es
// editable acá — para cambiarlo hay que volver a elegir en "Buscar
// fórmula", que recalcula ambos (Ancho y Alto) juntos.
function CodigoFormulaResuelto({ codigo, formulas }) {
  if (!codigo) {
    return (
      <span style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: "#a9c1d6" }}>
        —
      </span>
    );
  }
  const encontrada = formulas.find((f) => f.codform === codigo);
  const etiqueta = encontrada ? `${encontrada.descripcion || "(sin descripción)"} — ${codigo}` : codigo;
  return (
    <span
      style={{
        display: "inline-block",
        width: "100%",
        maxWidth: "160px",
        padding: "4px 8px",
        fontSize: 11,
        fontFamily: "'Space Mono',monospace",
        border: "1.5px solid #dbe9f5",
        borderRadius: 4,
        background: "#f4f9fd",
        color: "#0a3a5c",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={etiqueta}
    >
      {etiqueta}
    </span>
  );
}

// Muestra en texto plano el Valor 1 (`formula`) o Valor 2 (`formula2`) de
// la fórmula asignada a la pieza (según `campo`), buscándola en el
// catálogo ya cargado por `codform`. Es puramente informativo — no
// evalúa la expresión (eso solo pasa en el backend al generar el CSV) —
// sirve para que el usuario vea de un vistazo qué expresión va a aplicar
// como Ancho (Valor 1) y cuál como Alto (Valor 2) al elegir una fórmula.
function TextoFormulaCampo({ codigo, formulas, campo }) {
  if (!codigo) {
    return (
      <span style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: "#a9c1d6" }}>
        —
      </span>
    );
  }
  const encontrada = formulas.find((f) => f.codform === codigo);
  const texto = encontrada ? encontrada[campo] || "(sin cargar)" : "(fórmula no encontrada)";
  return (
    <span
      style={{
        display: "inline-block",
        width: "100%",
        maxWidth: "160px",
        padding: "4px 8px",
        fontSize: 11,
        fontFamily: "'Space Mono',monospace",
        border: "1.5px solid #dbe9f5",
        borderRadius: 4,
        background: "#f4f9fd",
        color: "#0a3a5c",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={texto}
    >
      {texto}
    </span>
  );
}

// propio estado de busqueda/foco/resultados manejado por el padre.
function BuscadorFormulaCampo({
  label,
  placeholder,
  busqueda,
  onBusquedaChange,
  focus,
  onFocus,
  onBlur,
  resultados,
  onElegir,
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
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
        {focus && resultados.length > 0 && (
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
              maxHeight: 200,
              overflowY: "auto",
              borderRadius: "0 0 3px 3px",
            }}
          >
            {resultados.map((f) => (
              <div
                key={f.codform}
                onMouseDown={() => onElegir(f)}
                style={{
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "'Space Mono',monospace",
                  borderBottom: "1px solid #eef2f6",
                  color: "#0a3a5c",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#ddeefa")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
              >
                <span style={{ fontWeight: 700 }}>{f.descripcion || "(sin descripción)"}</span>
                <span style={{ color: "#8aabcc", marginLeft: 8, fontSize: 10 }}>
                  {f.codform}
                </span>
              </div>
            ))}
          </div>
        )}
        {focus && busqueda.trim().length > 0 && resultados.length === 0 && (
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
            Sin resultados en Fórmulas de Producción
          </div>
        )}
      </div>
    </div>
  );
}

export default function ModulosDomus({ authFetch, token }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [search, setSearch] = useState("");
  const [filtroModulo, setFiltroModulo] = useState(null);

  // Pieza a eliminar — puede venir de la grilla principal o del panel de
  // un artículo, por eso no distingue origen, solo necesita `id`.
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // Guardado inline por campo: key = `${id}-${campo}`, ahora por `id` de
  // PIEZA (antes era por codartint — dejó de servir porque un mismo
  // codartint puede repetirse en varias filas).
  const [guardandoCampo, setGuardandoCampo] = useState(null);
  const [errorCampo, setErrorCampo] = useState(null);

  // Modal "Nuevo artículo": da de alta la primera pieza de un artículo
  // (nuevo o ya existente), buscándolo por código o nombre.
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nuevoCodartint, setNuevoCodartint] = useState("");
  const [nuevoModulo, setNuevoModulo] = useState("");
  const [nuevoBusqueda, setNuevoBusqueda] = useState("");
  const [nuevoResultados, setNuevoResultados] = useState([]);
  const [nuevoFocus, setNuevoFocus] = useState(false);
  const [buscandoArticulo, setBuscandoArticulo] = useState(false);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState(null);

  // Panel de un artículo puntual: sus piezas + alta de piezas nuevas.
  const [panelCodartint, setPanelCodartint] = useState(null);
  const [panelArticulo, setPanelArticulo] = useState("");
  const [piezas, setPiezas] = useState([]);
  const [piezasLoading, setPiezasLoading] = useState(false);
  const [piezasError, setPiezasError] = useState(null);
  // Duplicar una pieza existente: id de la pieza que se está copiando
  // (para deshabilitar/mostrar spinner solo en ese renglón) y un error
  // puntual si el POST falla, sin tapar la tabla como hace piezasError.
  const [duplicandoId, setDuplicandoId] = useState(null);
  const [errorDuplicar, setErrorDuplicar] = useState(null);

  // Alta de pieza nueva, dentro del panel: buscador de fórmula (catálogo
  // completo de formulas_produccion, cargado una vez y filtrado acá
  // mismo — a diferencia de la búsqueda de artículos, esta lista no suele
  // ser gigante, así que no hace falta pegarle al backend en cada tecla).
  const [piezaAbierta, setPiezaAbierta] = useState(false);
  const [formulas, setFormulas] = useState([]);
  const [formulasCargadas, setFormulasCargadas] = useState(false);
  // Un solo buscador: se guarda el MISMO codform en formulax y formulay
  // de la pieza nueva. Ancho/Alto se resuelven después en el backend
  // contra el Valor 1 (`formula`) y Valor 2 (`formula2`) de ese registro
  // — formulas_produccion no tiene columnas separadas "formula_ancho"/
  // "formula_alto".
  const [busquedaFormula, setBusquedaFormula] = useState("");
  const [formulaFocus, setFormulaFocus] = useState(false);
  const [piezaFormula, setPiezaFormula] = useState("");
  const [piezaTitulo, setPiezaTitulo] = useState("");
  const [guardandoPieza, setGuardandoPieza] = useState(false);
  const [errorPieza, setErrorPieza] = useState(null);

  // ── Fetch principal (grilla mezclada) ────────────────────────────────

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

  // Búsqueda server-side (con debounce) de artículos para "Nuevo
  // artículo" — mismo patrón que el buscador de Material Placa/Guías en
  // PresupuestoNuevo.jsx, contra /articulos/buscar-descripcion.
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

  // ── Edición inline de la grilla principal (por id de pieza) ──────────

  const handleCampoChange = (id, campo, valor) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));
  };

  const handleCampoBlur = async (row, campo) => {
    const key = `${row.id}-${campo}`;
    setGuardandoCampo(key);
    setErrorCampo(null);
    try {
      const res = await authFetch(`${API}/modulos-domus/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: row[campo] === "" ? null : row[campo] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error(`Error guardando ${campo}:`, e);
      setErrorCampo(key);
    } finally {
      setGuardandoCampo(null);
    }
  };

  // `modulo` cambia el agrupamiento, así que además de guardarlo hay que
  // refrescar la lista de módulos (para los botones de filtro).
  const handleModuloBlur = async (row) => {
    await handleCampoBlur(row, "modulo");
    fetchModulosDomus();
  };

  // ── Alta de artículo nuevo (su primera pieza) ────────────────────────

  const cerrarNuevo = () => {
    setNuevoAbierto(false);
    setNuevoBusqueda("");
    setNuevoResultados([]);
  };

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
      if (!res.ok) {
        let detalle = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) detalle = body.error;
        } catch {
          // el body no era JSON parseable, nos quedamos con el status
        }
        throw new Error(detalle);
      }
      setNuevoAbierto(false);
      setNuevoCodartint("");
      setNuevoModulo("");
      setNuevoBusqueda("");
      setNuevoResultados([]);
      fetchModulosDomus();
    } catch (e) {
      console.error("Error creando pieza en modulos-domus:", e);
      setErrorNuevo(e.message || "No se pudo guardar.");
    } finally {
      setGuardandoNuevo(false);
    }
  };

  // ── DELETE de una pieza puntual (id) ─────────────────────────────────

  const handleDelete = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      const res = await authFetch(`${API}/modulos-domus/${aEliminar.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows((prev) => prev.filter((r) => r.id !== aEliminar.id));
      setPiezas((prev) => prev.filter((p) => p.id !== aEliminar.id));
      setAEliminar(null);
    } catch (e) {
      console.error("Error borrando pieza de modulos-domus:", e);
      alert("No se pudo borrar la pieza. Revisá la consola.");
    } finally {
      setEliminando(false);
    }
  };

  // ── Panel de un artículo (sus piezas) ────────────────────────────────

  const fetchPiezas = (codartint) => {
    setPiezasLoading(true);
    setPiezasError(null);
    authFetch(`${API}/modulos-domus/por-articulo/${encodeURIComponent(codartint)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        setPiezas(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error(e);
        setPiezasError(e.message);
        setPiezas([]);
      })
      .finally(() => setPiezasLoading(false));
  };

  const cerrarPieza = () => {
    setPiezaAbierta(false);
    setBusquedaFormula("");
    setPiezaFormula("");
    setPiezaTitulo("");
    setErrorPieza(null);
  };

  const abrirPanel = (row) => {
    setPanelCodartint(row.codartint);
    setPanelArticulo(row.articulo_descripcion ?? "");
    fetchPiezas(row.codartint);
    fetchFormulas();
  };

  const cerrarPanel = () => {
    setPanelCodartint(null);
    setPanelArticulo("");
    setPiezas([]);
    setPiezasError(null);
    cerrarPieza();
  };

  const handlePiezaCampoChange = (id, campo, valor) => {
    setPiezas((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  };

  // Guarda un campo de una pieza por `id` directo (sin depender de leer el
  // valor de un objeto `row` completo) — lo usa tanto el blur de los
  // inputs de texto/número como el selector de fórmula.
  const guardarPiezaCampo = async (id, campo, valor) => {
    const key = `${id}-${campo}`;
    setGuardandoCampo(key);
    setErrorCampo(null);
    try {
      const res = await authFetch(`${API}/modulos-domus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor === "" ? null : valor }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // La grilla principal muestra todo mezclado — reflejar el cambio
      // ahí también, sin esperar a un refetch completo.
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));
    } catch (e) {
      console.error(`Error guardando ${campo} de la pieza:`, e);
      setErrorCampo(key);
    } finally {
      setGuardandoCampo(null);
    }
  };

  const handlePiezaCampoBlur = (pieza, campo) =>
    guardarPiezaCampo(pieza.id, campo, pieza[campo]);

  // Elegir una fórmula del catálogo para una pieza existente: se guarda el
  // MISMO codform en formulax Y formulay. El backend (/produccion/:id/
  // formulas-csv) es el que resuelve Ancho con el Valor 1 (`formula`) y
  // Alto con el Valor 2 (`formula2`) de ese mismo registro — acá no hace
  // falta pedirle dos columnas distintas a formulas_produccion, que no
  // existen (esa tabla no tiene "formula_ancho"/"formula_alto").
  // Además el título se completa SOLO si la pieza todavía no tenía uno
  // propio cargado (no pisa un título que el usuario ya haya editado).
  const elegirFormulaPieza = (row, f) => {
    const yaTeniaTitulo = (row.titulo ?? "").trim().length > 0;
    const nuevoTitulo = yaTeniaTitulo ? row.titulo : f.descripcion || "";
    setPiezas((prev) =>
      prev.map((p) =>
        p.id === row.id ? { ...p, formulax: f.codform, formulay: f.codform, titulo: nuevoTitulo } : p,
      ),
    );
    guardarPiezaCampo(row.id, "formulax", f.codform);
    guardarPiezaCampo(row.id, "formulay", f.codform);
    if (!yaTeniaTitulo) {
      guardarPiezaCampo(row.id, "titulo", nuevoTitulo);
    }
  };

  // ── Alta de pieza nueva (buscador de fórmula) ────────────────────────

  const fetchFormulas = () => {
    if (formulasCargadas) return;
    authFetch(`${API}/formulas-produccion`)
      .then((r) => r.json())
      .then((data) => {
        setFormulas(Array.isArray(data) ? data : []);
        setFormulasCargadas(true);
      })
      .catch((e) => console.error("Error cargando fórmulas de producción:", e));
  };

  const abrirPieza = () => {
    fetchFormulas();
    setPiezaAbierta(true);
  };

  // Duplica una pieza tal cual está: manda todo su contenido (menos id y
  // los campos resueltos por JOIN, que el backend igual descarta en el
  // POST) como alta nueva. Queda en el mismo artículo, con el mismo
  // título — el usuario la distingue y ajusta a mano después (es más
  // rápido partir de una copia que cargar todo de cero).
  const handleDuplicarPieza = async (row) => {
    if (!panelCodartint) return;
    setDuplicandoId(row.id);
    setErrorDuplicar(null);
    try {
      const {
        id: _id,
        codform: _cf,
        articulo_descripcion: _ad,
        formulax_descripcion: _fxd,
        formulay_descripcion: _fyd,
        ...resto
      } = row;
      const res = await authFetch(`${API}/modulos-domus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resto),
      });
      if (!res.ok) {
        let detalle = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) detalle = body.error;
        } catch {
          // el body no era JSON parseable, nos quedamos con el status
        }
        throw new Error(detalle);
      }
      fetchPiezas(panelCodartint);
      fetchModulosDomus();
    } catch (e) {
      console.error("Error duplicando pieza:", e);
      setErrorDuplicar(e.message || "No se pudo duplicar la pieza.");
    } finally {
      setDuplicandoId(null);
    }
  };

  const filtrarFormulas = (busqueda) => {
    const fq = busqueda.trim().toLowerCase();
    if (!fq) return [];
    return formulas
      .filter(
        (f) =>
          (f.codform ?? "").toLowerCase().includes(fq) ||
          (f.descripcion ?? "").toLowerCase().includes(fq),
      )
      .slice(0, 20);
  };
  const formulasFiltradas = filtrarFormulas(busquedaFormula);

  const handleCrearPieza = async () => {
    if (!panelCodartint) return;
    setGuardandoPieza(true);
    setErrorPieza(null);
    try {
      const res = await authFetch(`${API}/modulos-domus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codartint: panelCodartint,
          formulax: String(piezaFormula ?? "").trim() || null,
          formulay: String(piezaFormula ?? "").trim() || null,
          titulo: piezaTitulo.trim() || null,
        }),
      });
      if (!res.ok) {
        let detalle = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) detalle = body.error;
        } catch {
          // el body no era JSON parseable, nos quedamos con el status
        }
        throw new Error(detalle);
      }
      cerrarPieza();
      fetchPiezas(panelCodartint);
      fetchModulosDomus();
    } catch (e) {
      console.error("Error creando pieza:", e);
      setErrorPieza(e.message || "No se pudo guardar.");
    } finally {
      setGuardandoPieza(false);
    }
  };

  // ── Filtro por módulo + búsqueda (grilla principal) ──────────────────

  const modulos = [...new Set(rows.map((r) => r.modulo).filter(Boolean))].sort();

  const q = search.toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (!filtroModulo || r.modulo === filtroModulo) &&
      ((r.codartint ?? "").toLowerCase().includes(q) ||
        (r.articulo_descripcion ?? "").toLowerCase().includes(q) ||
        (r.modulo ?? "").toLowerCase().includes(q) ||
        (r.titulo ?? "").toLowerCase().includes(q) ||
        (r.bpp ?? "").toLowerCase().includes(q) ||
        (r.veta ?? "").toLowerCase().includes(q)),
  );

  // "Sin módulo" y "Total artículos" cuentan ARTÍCULOS distintos, no
  // piezas — si un artículo tiene 3 piezas sin módulo, sigue siendo 1
  // artículo sin módulo.
  const totalArticulos = new Set(rows.map((r) => r.codartint)).size;
  const articulosSinModulo = new Set(
    rows.filter((r) => !r.modulo || !r.modulo.trim()).map((r) => r.codartint),
  ).size;

  // ── Estilos de los inputs editables ─────────────────────────────────

  const estiloInput = (id, campo, ancho = "100px") => ({
    width: "100%",
    maxWidth: ancho,
    padding: "4px 8px",
    fontSize: "12px",
    fontFamily: "'Space Mono',monospace",
    border: `1.5px solid ${errorCampo === `${id}-${campo}` ? "#e57373" : "#b8d6ef"}`,
    borderRadius: "4px",
    background: guardandoCampo === `${id}-${campo}` ? "#fffbe6" : "#fff",
    color: "#0a3a5c",
  });

  // ── Columnas de la grilla principal (todo mezclado) ──────────────────

  const columns = [
    { key: "codartint", label: "Código", render: (v) => v ?? "—" },
    { key: "articulo_descripcion", label: "Artículo", render: (v) => v ?? "—" },
    {
      key: "modulo",
      label: "Módulo",
      render: (v, row) => (
        <input
          type="text"
          value={row.modulo ?? ""}
          placeholder="Sin cargar"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleCampoChange(row.id, "modulo", e.target.value)}
          onBlur={() => handleModuloBlur(row)}
          maxLength={50}
          style={estiloInput(row.id, "modulo", "140px")}
        />
      ),
    },
    {
      key: "titulo",
      label: "Pieza",
      render: (v, row) => (
        <span style={{ fontSize: 11 }}>
          {row.titulo || <em style={{ color: "#b8cfe0" }}>sin nombre</em>}
        </span>
      ),
    },
    {
      key: "formulax",
      label: "Fórmula Ancho",
      render: (v, row) => (
        <span style={{ fontSize: 11 }}>
          {row.formulax ? (
            <>
              {row.formulax_descripcion || "(sin descripción)"}
              <span style={{ color: "#8aabcc", marginLeft: 6 }}>({row.formulax})</span>
            </>
          ) : (
            <em style={{ color: "#b8cfe0" }}>sin fórmula</em>
          )}
        </span>
      ),
    },
    {
      key: "formulay",
      label: "Fórmula Alto",
      render: (v, row) => (
        <span style={{ fontSize: 11 }}>
          {row.formulay ? (
            <>
              {row.formulay_descripcion || "(sin descripción)"}
              <span style={{ color: "#8aabcc", marginLeft: 6 }}>({row.formulay})</span>
            </>
          ) : (
            <em style={{ color: "#b8cfe0" }}>sin fórmula</em>
          )}
        </span>
      ),
    },
    ...CAMPOS_NUMERICOS.map(({ campo, label }) => ({
      key: campo,
      label,
      render: (v, row) => (
        <input
          type="number"
          step="0.1"
          value={row[campo] ?? ""}
          placeholder="—"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleCampoChange(row.id, campo, e.target.value)}
          onBlur={() => handleCampoBlur(row, campo)}
          style={estiloInput(row.id, campo, "90px")}
        />
      ),
    })),
    ...CAMPOS_TEXTO.map(({ campo, label, maxLength }) => ({
      key: campo,
      label,
      render: (v, row) => (
        <input
          type="text"
          value={row[campo] ?? ""}
          placeholder="—"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleCampoChange(row.id, campo, e.target.value)}
          onBlur={() => handleCampoBlur(row, campo)}
          maxLength={maxLength}
          style={estiloInput(
            row.id,
            campo,
            campo === "bpp" || campo.startsWith("cant") || campo === "veta" ? "100px" : "160px",
          )}
        />
      ),
    })),
  ];

  // Columnas del mini-table de piezas dentro del panel: mismos campos que
  // la grilla grande (menos Código/Artículo, que ya están fijos por el
  // panel), más el nombre de la pieza, la fórmula asignada y un borrar
  // puntual.
  const columnasPieza = [
    {
      key: "_duplicar",
      label: "",
      render: (v, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDuplicarPieza(row);
          }}
          disabled={duplicandoId === row.id}
          title="Duplicar pieza"
          style={{
            border: "none",
            background: "none",
            color: "#0a3a5c",
            cursor: duplicandoId === row.id ? "default" : "pointer",
            fontSize: 14,
            opacity: duplicandoId === row.id ? 0.4 : 1,
          }}
        >
          {duplicandoId === row.id ? "⏳" : "⧉"}
        </button>
      ),
    },
    {
      key: "titulo",
      label: "Pieza",
      render: (v, row) => (
        <input
          type="text"
          value={row.titulo ?? ""}
          placeholder="Sin nombre"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handlePiezaCampoChange(row.id, "titulo", e.target.value)}
          onBlur={() => handlePiezaCampoBlur(row, "titulo")}
          maxLength={255}
          style={estiloInput(row.id, "titulo", "160px")}
        />
      ),
    },
    {
      key: "formula_madre",
      label: "Buscar fórmula",
      render: (v, row) => (
        <SelectorFormulaMadre
          formulas={formulas}
          cargarFormulas={fetchFormulas}
          onElegir={(f) => elegirFormulaPieza(row, f)}
        />
      ),
    },
    {
      // Solo lectura: la fórmula guardada en la pieza (formulax y formulay
      // son siempre el mismo código desde acá — Ancho sale de su Valor 1 y
      // Alto de su Valor 2 en el backend). No se edita acá directo — se
      // recarga eligiendo de nuevo en "Buscar fórmula".
      key: "formula_resuelta",
      label: "Fórmula asignada",
      render: (v, row) => <CodigoFormulaResuelto codigo={row.formulax} formulas={formulas} />,
    },
    {
      // Solo lectura, solo informativo: el texto de la expresión (Valor 1
      // de formulas_produccion) que el backend va a evaluar como Ancho al
      // generar el CSV. No se calcula acá — se recarga solo al elegir de
      // nuevo en "Buscar fórmula".
      key: "formula",
      label: "Fórmula (Ancho)",
      render: (v, row) => <TextoFormulaCampo codigo={row.formulax} formulas={formulas} campo="formula" />,
    },
    {
      // Ídem anterior, pero Valor 2 (`formula2`) — lo que el backend evalúa
      // como Alto.
      key: "formula1",
      label: "Fórmula (Alto)",
      render: (v, row) => <TextoFormulaCampo codigo={row.formulax} formulas={formulas} campo="formula2" />,
    },
    ...CAMPOS_NUMERICOS.map(({ campo, label }) => ({
      key: campo,
      label,
      render: (v, row) => (
        <input
          type="number"
          step="0.1"
          value={row[campo] ?? ""}
          placeholder="—"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handlePiezaCampoChange(row.id, campo, e.target.value)}
          onBlur={() => handlePiezaCampoBlur(row, campo)}
          style={estiloInput(row.id, campo, "80px")}
        />
      ),
    })),
    ...CAMPOS_TEXTO.map(({ campo, label, maxLength }) => ({
      key: campo,
      label,
      render: (v, row) => (
        <input
          type="text"
          value={row[campo] ?? ""}
          placeholder="—"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handlePiezaCampoChange(row.id, campo, e.target.value)}
          onBlur={() => handlePiezaCampoBlur(row, campo)}
          maxLength={maxLength}
          style={estiloInput(row.id, campo, "90px")}
        />
      ),
    })),
    {
      key: "_borrar",
      label: "",
      render: (v, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setAEliminar(row);
          }}
          title="Eliminar pieza"
          style={{
            border: "none",
            background: "none",
            color: "#c0392b",
            cursor: "pointer",
            fontSize: 14,
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
          { label: "Sin módulo", value: articulosSinModulo },
          { label: "Filtrados", value: filtered.length },
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
          selected={null}
          onNew={() => setNuevoAbierto(true)}
          onEdit={null}
          onDelete={null}
          search={search}
          onSearch={setSearch}
        />
      </div>

      <p style={{ margin: "4px 0 12px", fontSize: 11, color: "#8aabb8", fontFamily: "'Space Mono',monospace" }}>
        Hacé clic en una fila para ver y cargar las piezas de ese artículo.
      </p>

      {loading ? (
        <p style={{ padding: "24px", color: "#4a8ab5", fontFamily: "'Space Mono',monospace" }}>
          ⏳ Cargando módulos Domus...
        </p>
      ) : errorCarga ? (
        <p style={{ padding: "24px", color: "#c0392b", fontFamily: "'Space Mono',monospace" }}>
          ⚠ No se pudo cargar: {errorCarga}
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ padding: "24px", color: "#8aabb8", fontFamily: "'Space Mono',monospace" }}>
          No hay artículos cargados todavía. Usá "Nuevo" para agregar el primero.
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          selectedId={null}
          onSelect={(row) => row && abrirPanel(row)}
          storageKey={`modulos-domus-${filtroModulo ?? "todos"}`}
        />
      )}

      {aEliminar && (
        <ConfirmDelete
          item={aEliminar}
          title="¿Eliminar esta pieza?"
          message={
            <>
              Vas a eliminar la pieza{" "}
              <strong>
                {aEliminar.titulo || aEliminar.formulax || aEliminar.formulay || `#${aEliminar.id}`}
              </strong>{" "}
              de <strong>{aEliminar.articulo_descripcion ?? aEliminar.codartint}</strong>.
              Esto la saca del próximo CSV de producción que se genere para ese
              artículo. Esta acción no se puede deshacer.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => !eliminando && setAEliminar(null)}
        />
      )}

      {nuevoAbierto && (
        <div
          onClick={() => !guardandoNuevo && cerrarNuevo()}
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
              Esto da de alta la primera pieza del artículo. El resto de las
              piezas se agregan después, abriendo su panel desde la tabla.
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
                      onMouseOver={(e) => (e.currentTarget.style.background = "#ddeefa")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
                    >
                      <span style={{ fontWeight: 700 }}>{a.articulo}</span>
                      <span style={{ color: "#8aabcc", marginLeft: 8, fontSize: 10 }}>
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
              <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 12px" }}>{errorNuevo}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={cerrarNuevo}
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

      {panelCodartint && (
        <div
          onClick={cerrarPanel}
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
              maxWidth: 920,
              maxHeight: "85vh",
              overflowY: "auto",
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
                marginBottom: 4,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>{panelArticulo || panelCodartint}</h3>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#8aabcc" }}>
                  {panelCodartint}
                </p>
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
              Cada pieza con fórmula asignada genera un renglón en el CSV de
              fórmulas de producción de este artículo.
            </p>

            {errorDuplicar && (
              <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 8px" }}>
                ⚠ {errorDuplicar}
              </p>
            )}

            {piezasLoading ? (
              <p style={{ color: "#4a8ab5", fontSize: 12 }}>⏳ Cargando piezas...</p>
            ) : piezasError ? (
              <p style={{ color: "#c0392b", fontSize: 12 }}>⚠ {piezasError}</p>
            ) : piezas.length === 0 ? (
              <p style={{ color: "#8aabb8", fontSize: 12 }}>
                Todavía no cargaste piezas para este artículo.
              </p>
            ) : (
              <div style={{ overflowX: "auto", marginBottom: 16 }}>
                <DataTable
                  columns={columnasPieza}
                  rows={piezas}
                  selectedId={null}
                  onSelect={() => {}}
                  storageKey={`modulos-domus-piezas-${panelCodartint}`}
                />
              </div>
            )}

            {!piezaAbierta ? (
              <button
                onClick={abrirPieza}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  border: "none",
                  background: "#0a3a5c",
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                + Nueva pieza
              </button>
            ) : (
              <div
                style={{
                  border: "1.5px solid #b8d6ef",
                  borderRadius: 8,
                  padding: 14,
                  marginTop: 4,
                }}
              >
                <BuscadorFormulaCampo
                  label="Fórmula (Ancho y Alto) — buscar por código o descripción"
                  placeholder="Ej: FORM-01 o Lateral..."
                  busqueda={busquedaFormula}
                  onBusquedaChange={setBusquedaFormula}
                  focus={formulaFocus}
                  onFocus={() => setFormulaFocus(true)}
                  onBlur={() => setTimeout(() => setFormulaFocus(false), 160)}
                  resultados={formulasFiltradas}
                  onElegir={(f) => {
                    setPiezaFormula(f.codform);
                    if (!piezaTitulo.trim()) setPiezaTitulo(f.descripcion || "");
                    setBusquedaFormula(`${f.descripcion || f.codform} — ${f.codform}`);
                    setFormulaFocus(false);
                  }}
                />

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: "#5a86ab", marginBottom: 2 }}>
                    Fórmula asignada
                  </div>
                  <CodigoFormulaResuelto codigo={piezaFormula} formulas={formulas} />
                </div>

                <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                  Título de la pieza (editable)
                </label>
                <input
                  type="text"
                  value={piezaTitulo}
                  onChange={(e) => setPiezaTitulo(e.target.value)}
                  placeholder="Ej: Lateral izquierdo"
                  maxLength={255}
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

                {errorPieza && (
                  <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 12px" }}>
                    {errorPieza}
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    onClick={cerrarPieza}
                    disabled={guardandoPieza}
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
                    onClick={handleCrearPieza}
                    disabled={guardandoPieza}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 4,
                      border: "none",
                      background: "#1a7a44",
                      color: "#fff",
                      cursor: guardandoPieza ? "wait" : "pointer",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 12,
                      fontWeight: 700,
                      opacity: guardandoPieza ? 0.6 : 1,
                    }}
                  >
                    {guardandoPieza ? "Guardando…" : "Guardar pieza"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
