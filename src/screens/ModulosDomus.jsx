import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import DataTable from "../Component/DataTable";
import ActionBar from "../Component/ActionBar";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import ConfirmDelete from "../Component/ConfirmDelete";

const API = "https://integral-backend-production.up.railway.app";

// Familia de una fórmula de producción (columna `familia` de
// formulas_produccion). Si el backend la manda con otro nombre, cambiarlo acá.
const CAMPO_FAMILIA_FORMULA = "familia";
const familiaDe = (f) => String(f?.[CAMPO_FAMILIA_FORMULA] ?? "").trim();

// ── Componente ────────────────────────────────────────────────────────────
//
// CRUD de `modulos-domus`: guarda las PIEZAS que componen cada artículo
// (codartint), cada una con dos fórmulas asociadas INDEPENDIENTES
// (formulax → Alto, formulay → Ancho, ambas referencias a
// formulas_produccion) y los datos que completa el CSV de fórmulas de
// producción (bpp, cant1-4, color) — ver GET /produccion/:id/formulas-csv
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
];

// Cant1 a Cant4 dejan de ser texto libre: son un desplegable fijo con
// estas opciones (más "—" vacío), usado tanto en la grilla principal
// como en el mini-table de piezas del panel.
const OPCIONES_CANT = ["1", "2", "3", "4", "BLANCO-045"];

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
// Alto/Ancho/Profundidad se resuelven después en el backend contra el
// Valor 1 (`formula`), Valor 2 (`formula2`) y Valor 3 (`formula3`) de ese
// registro. El desplegable usa
// un portal a document.body, posicionado con getBoundingClientRect(),
// para que no quede recortado por el overflow-x del mini-table.
function SelectorFormulaMadre({ formulas, cargarFormulas, onElegir, familia = "" }) {
  const [busqueda, setBusqueda] = useState("");
  const [focus, setFocus] = useState(false);
  const [coords, setCoords] = useState(null);
  const inputRef = useRef(null);

  const fq = busqueda.trim().toLowerCase();
  // Con una familia elegida se listan sus fórmulas aunque todavía no se haya
  // escrito nada; sin familia ni texto no se muestra nada (como antes).
  const resultados =
    fq || familia
      ? formulas
          .filter(
            (f) =>
              (!familia || familiaDe(f) === familia) &&
              (!fq ||
                (f.codform ?? "").toLowerCase().includes(fq) ||
                (f.descripcion ?? "").toLowerCase().includes(fq)),
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
// fórmula", que recalcula los tres (Alto, Ancho y Profundidad) juntos.
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

// Muestra en texto plano el Valor 1 (`formula`), Valor 2 (`formula2`) o
// Valor 3 (`formula3`) de la fórmula asignada a la pieza (según `campo`),
// buscándola en el catálogo ya cargado por `codform`. Es puramente
// informativo — no evalúa la expresión (eso solo pasa en el backend al
// generar el CSV) — sirve para que el usuario vea de un vistazo qué
// expresión va a aplicar como Alto (Valor 1), cuál como Ancho (Valor 2) y
// cuál como Profundidad (Valor 3) al elegir una fórmula.
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
  // Subcódigo elegido dentro del panel: `null` = todavía no se eligió
  // ninguno, se muestra el selector de variantes; string ("" incluido,
  // para "sin variante") = ya se eligió una y se muestra su lista de
  // piezas. Se resetea a `null` cada vez que se abre/cierra el panel de un
  // artículo (ver abrirPanel/cerrarPanel).
  const [panelSubcodigo, setPanelSubcodigo] = useState(null);
  // Texto del campo "nueva variante" en el selector, para crear un
  // subcódigo que todavía no tiene ninguna pieza cargada.
  const [nuevoSubcodigoInput, setNuevoSubcodigoInput] = useState("");
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
  // de la pieza nueva. Alto/Ancho/Profundidad se resuelven después en el
  // backend contra el Valor 1 (`formula`), Valor 2 (`formula2`) y Valor 3
  // (`formula3`) de ese registro — formulas_produccion no tiene columnas
  // separadas "formula_ancho"/"formula_alto"/"formula_profundidad".
  const [busquedaFormula, setBusquedaFormula] = useState("");
  // Filtro por familia de fórmula: aplica a todos los buscadores de fórmula
  // del panel (el de cada pieza y el de "Nueva pieza"). "" = todas.
  const [filtroFamiliaFormula, setFiltroFamiliaFormula] = useState("");
  const [formulaFocus, setFormulaFocus] = useState(false);
  const [piezaFormula, setPiezaFormula] = useState("");
  const [piezaTitulo, setPiezaTitulo] = useState("");
  // Subcódigo (variante puntual, ej. "02BAJO10MDF" para el codartint
  // "02BAJO10") al que pertenece la pieza nueva. Vacío = pieza compartida
  // por todas las variantes del artículo (ver nota en el backend,
  // formulas-csv_routes.js).
  const [piezaSubcodigo, setPiezaSubcodigo] = useState("");
  const [guardandoPieza, setGuardandoPieza] = useState(false);
  const [errorPieza, setErrorPieza] = useState(null);

  // "Traer piezas del código": copia las piezas SIN variante (comunes al
  // artículo) al subcódigo que se está viendo, para no tener que cargar de
  // cero una variante que comparte casi todo con la base.
  const [trayendoPiezas, setTrayendoPiezas] = useState(false);
  const [errorTraer, setErrorTraer] = useState(null);

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

  // Colores de melamina: artículos con area=MELAMINA, para el desplegable
  // de la columna Color (reemplaza el texto libre — el color de cada
  // pieza tiene que ser uno de los artículos de melamina existentes).
  const [coloresMelamina, setColoresMelamina] = useState([]);
  useEffect(() => {
    authFetch(`${API}/articulos/colores-melamina`)
      .then((r) => r.json())
      .then((data) => setColoresMelamina(Array.isArray(data) ? data : []))
      .catch(() => setColoresMelamina([]));
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
    setPiezaSubcodigo("");
    setErrorPieza(null);
  };

  const abrirPanel = (row) => {
    setPanelCodartint(row.codartint);
    setPanelArticulo(row.articulo_descripcion ?? "");
    setPanelSubcodigo(null);
    setNuevoSubcodigoInput("");
    fetchPiezas(row.codartint);
    fetchFormulas();
  };

  const cerrarPanel = () => {
    setPanelCodartint(null);
    setPanelArticulo("");
    setPanelSubcodigo(null);
    setNuevoSubcodigoInput("");
    setPiezas([]);
    setPiezasError(null);
    cerrarPieza();
  };

  // Elegir una variante en el selector: pasa a mostrar solo sus piezas.
  // Cierra el formulario de "nueva pieza" si había quedado abierto de la
  // variante anterior (evita cargar una pieza en el subcódigo equivocado).
  const abrirSubcodigo = (subcodigo) => {
    setPanelSubcodigo(subcodigo);
    setErrorTraer(null);
    cerrarPieza();
  };

  // Volver del listado de piezas de una variante al selector de variantes.
  const volverASubcodigos = () => {
    setPanelSubcodigo(null);
    setNuevoSubcodigoInput("");
    setErrorTraer(null);
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
  // formulas-csv) es el que resuelve Alto con el Valor 1 (`formula`),
  // Ancho con el Valor 2 (`formula2`) y Profundidad con el Valor 3
  // (`formula3`) de ese mismo registro — acá no hace falta pedirle
  // columnas distintas a formulas_produccion, que no existen (esa tabla no
  // tiene "formula_ancho"/"formula_alto"/"formula_profundidad").
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
    setPiezaSubcodigo(panelSubcodigo ?? "");
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

  const familiasFormulas = [
    ...new Set(formulas.map(familiaDe).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "es"));

  // Trae al subcódigo actual una copia de cada pieza "sin variante" (las
  // comunes del artículo, subcodigo NULL/vacío) — así se arranca una
  // variante nueva con el set completo de piezas y después solo se
  // modifica la que haga falta, en vez de cargar todo de cero.
  const handleTraerPiezasDelCodigo = async () => {
    if (!panelCodartint || !panelSubcodigo) return;
    const piezasBase = piezas.filter((p) => !String(p.subcodigo ?? "").trim());
    if (piezasBase.length === 0) return;
    if (
      !window.confirm(
        `Esto copia ${piezasBase.length} pieza(s) sin variante de ${panelCodartint} al subcódigo ${panelSubcodigo}. Después vas a poder modificar las que hagan falta. ¿Continuar?`,
      )
    ) {
      return;
    }
    setTrayendoPiezas(true);
    setErrorTraer(null);
    try {
      for (const p of piezasBase) {
        const {
          id: _id,
          codform: _cf,
          articulo_descripcion: _ad,
          formulax_descripcion: _fxd,
          formulay_descripcion: _fyd,
          ...resto
        } = p;
        const res = await authFetch(`${API}/modulos-domus`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...resto, subcodigo: panelSubcodigo }),
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
      }
      fetchPiezas(panelCodartint);
      fetchModulosDomus();
    } catch (e) {
      console.error("Error trayendo piezas del código:", e);
      setErrorTraer(e.message || "No se pudieron traer todas las piezas.");
    } finally {
      setTrayendoPiezas(false);
    }
  };

  const filtrarFormulas = (busqueda) => {
    const fq = busqueda.trim().toLowerCase();
    if (!fq && !filtroFamiliaFormula) return [];
    return formulas
      .filter(
        (f) =>
          (!filtroFamiliaFormula || familiaDe(f) === filtroFamiliaFormula) &&
          (!fq ||
            (f.codform ?? "").toLowerCase().includes(fq) ||
            (f.descripcion ?? "").toLowerCase().includes(fq)),
      )
      .slice(0, 20);
  };
  // Piezas de la variante elegida en el selector (panelSubcodigo) — lo que
  // se muestra en la vista de detalle, ya filtrado.
  const piezasDeVarianteActual = piezas.filter(
    (p) => String(p.subcodigo ?? "").trim() === (panelSubcodigo ?? ""),
  );
  // Piezas "sin variante" del artículo — la fuente de "Traer piezas del
  // código" (ver handleTraerPiezasDelCodigo).
  const piezasBaseSinVariante = piezas.filter(
    (p) => !String(p.subcodigo ?? "").trim(),
  );

  const formulasFiltradas = filtrarFormulas(busquedaFormula);

  // Subcódigos (variantes) ya usados entre las piezas de ESTE artículo —
  // sugerencias para el datalist, tanto al editar una pieza existente como
  // al cargar una nueva. No incluye "" (piezas compartidas/sin variante).
  const subcodigosDelArticulo = [
    ...new Set(
      piezas.map((p) => String(p.subcodigo ?? "").trim()).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));

  // Piezas del panel agrupadas por subcodigo — el listado ya no es una
  // sola tabla mezclada: cada variante tiene su propio grupo, y las piezas
  // sin subcodigo (compartidas por todas las variantes) quedan en un grupo
  // aparte al final.
  const gruposPiezas = (() => {
    const mapa = new Map();
    piezas.forEach((p) => {
      const key = String(p.subcodigo ?? "").trim();
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key).push(p);
    });
    return [...mapa.entries()].sort(([a], [b]) => {
      if (a === b) return 0;
      if (a === "") return 1; // "sin variante" siempre al final
      if (b === "") return -1;
      return a.localeCompare(b, "es");
    });
  })();

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
          subcodigo: piezaSubcodigo.trim() || null,
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
        (r.color ?? "").toLowerCase().includes(q)),
  );

  // La grilla principal muestra UN renglón por artículo (no una fila por
  // pieza) — se queda con la primera pieza de cada codartint, en el mismo
  // orden en que vino de `filtered`. Al hacer clic en el renglón igual se
  // abre el panel con TODAS las piezas de ese artículo (fetchPiezas más
  // abajo no depende de esto, sigue trayendo todo por codartint).
  const vistos = new Set();
  const filteredPorArticulo = filtered.filter((r) => {
    if (vistos.has(r.codartint)) return false;
    vistos.add(r.codartint);
    return true;
  });

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
      // Muestra la EXPRESIÓN (Valor 1 de formulax), no la descripción —
      // es lo que el backend evalúa como Alto en el CSV, en los dos modos
      // (una sola fórmula o independientes): siempre Valor 1 de formulax.
      key: "formulax",
      label: "Fórmula Alto",
      render: (v, row) => (
        <span style={{ fontSize: 11 }} title={row.formulax_descripcion || ""}>
          {row.formulax ? (
            row.formulax_formula || <em style={{ color: "#b8cfe0" }}>(sin cargar)</em>
          ) : (
            <em style={{ color: "#b8cfe0" }}>sin fórmula</em>
          )}
        </span>
      ),
    },
    {
      // Idem, pero lo que el backend evalúa como Ancho: Valor 2 de
      // formulax si formulax===formulay (una sola fórmula, el flujo
      // actual del panel), o Valor 1 de formulay si son distintas
      // (piezas viejas, modo independiente).
      key: "formulay",
      label: "Fórmula Ancho",
      render: (v, row) => {
        const unaSolaFormula = !!row.formulax && row.formulax === row.formulay;
        const expresion = unaSolaFormula ? row.formulax_formula2 : row.formulay_formula;
        const descripcion = unaSolaFormula ? row.formulax_descripcion : row.formulay_descripcion;
        return (
          <span style={{ fontSize: 11 }} title={descripcion || ""}>
            {row.formulay ? (
              expresion || <em style={{ color: "#b8cfe0" }}>(sin cargar)</em>
            ) : (
              <em style={{ color: "#b8cfe0" }}>sin fórmula</em>
            )}
          </span>
        );
      },
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
    ...CAMPOS_TEXTO.map(({ campo, label, maxLength }) => {
      if (campo.startsWith("cant")) {
        return {
          key: campo,
          label,
          render: (v, row) => (
            <select
              value={row[campo] ?? ""}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const valor = e.target.value;
                handleCampoChange(row.id, campo, valor);
                handleCampoBlur({ ...row, [campo]: valor }, campo);
              }}
              style={estiloInput(row.id, campo, "100px")}
            >
              <option value="">—</option>
              {OPCIONES_CANT.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          ),
        };
      }
      return {
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
            style={estiloInput(row.id, campo, "100px")}
          />
        ),
      };
    }),
    {
      key: "color",
      label: "Color",
      render: (v, row) => (
        <select
          value={row.color ?? ""}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const valor = e.target.value;
            handleCampoChange(row.id, "color", valor);
            handleCampoBlur({ ...row, color: valor }, "color");
          }}
          style={estiloInput(row.id, "color", "140px")}
        >
          <option value="">—</option>
          {coloresMelamina.map((c) => (
            <option key={c.codartint} value={c.articulo}>
              {c.articulo}
            </option>
          ))}
        </select>
      ),
    },
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
      key: "subcodigo",
      label: "Subcódigo",
      render: (v, row) => (
        <input
          type="text"
          value={row.subcodigo ?? ""}
          placeholder="Sin variante"
          list={`subcodigos-pieza-${panelCodartint}`}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handlePiezaCampoChange(row.id, "subcodigo", e.target.value)}
          onBlur={() => handlePiezaCampoBlur(row, "subcodigo")}
          maxLength={50}
          style={estiloInput(row.id, "subcodigo", "140px")}
        />
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
          familia={filtroFamiliaFormula}
          onElegir={(f) => elegirFormulaPieza(row, f)}
        />
      ),
    },
    {
      // Solo lectura: la fórmula guardada en la pieza (formulax y formulay
      // son siempre el mismo código desde acá — Alto sale de su Valor 1,
      // Ancho de su Valor 2 y Profundidad de su Valor 3 en el backend). No
      // se edita acá directo — se recarga eligiendo de nuevo en "Buscar
      // fórmula".
      key: "formula_resuelta",
      label: "Fórmula asignada",
      render: (v, row) => <CodigoFormulaResuelto codigo={row.formulax} formulas={formulas} />,
    },
    {
      // Solo lectura, solo informativo: el texto de la expresión (Valor 1
      // de formulas_produccion) que el backend va a evaluar como Alto al
      // generar el CSV. No se calcula acá — se recarga solo al elegir de
      // nuevo en "Buscar fórmula". Va primero en la tabla por ser la
      // primera columna del CSV.
      key: "formula",
      label: "Fórmula (Alto)",
      render: (v, row) => <TextoFormulaCampo codigo={row.formulax} formulas={formulas} campo="formula" />,
    },
    {
      // Ídem anterior, pero Valor 2 (`formula2`) — lo que el backend
      // evalúa como Ancho. Segunda columna, igual que en el CSV.
      key: "formula2",
      label: "Fórmula (Ancho)",
      render: (v, row) => <TextoFormulaCampo codigo={row.formulax} formulas={formulas} campo="formula2" />,
    },
    {
      // Ídem anterior, pero Valor 3 (`formula3`) — lo que el backend
      // evalúa como Profundidad. Tercera columna, igual que en el CSV.
      key: "formula3",
      label: "Fórmula (Profundidad)",
      render: (v, row) => <TextoFormulaCampo codigo={row.formulax} formulas={formulas} campo="formula3" />,
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
    ...CAMPOS_TEXTO.map(({ campo, label, maxLength }) => {
      if (campo.startsWith("cant")) {
        return {
          key: campo,
          label,
          render: (v, row) => (
            <select
              value={row[campo] ?? ""}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const valor = e.target.value;
                handlePiezaCampoChange(row.id, campo, valor);
                guardarPiezaCampo(row.id, campo, valor);
              }}
              style={estiloInput(row.id, campo, "90px")}
            >
              <option value="">—</option>
              {OPCIONES_CANT.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          ),
        };
      }
      return {
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
      };
    }),
    {
      key: "color",
      label: "Color",
      render: (v, row) => (
        <select
          value={row.color ?? ""}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const valor = e.target.value;
            handlePiezaCampoChange(row.id, "color", valor);
            guardarPiezaCampo(row.id, "color", valor);
          }}
          style={estiloInput(row.id, "color", "120px")}
        >
          <option value="">—</option>
          {coloresMelamina.map((c) => (
            <option key={c.codartint} value={c.articulo}>
              {c.articulo}
            </option>
          ))}
        </select>
      ),
    },
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
          { label: "Filtrados", value: filteredPorArticulo.length },
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
      ) : filteredPorArticulo.length === 0 ? (
        <p style={{ padding: "24px", color: "#8aabb8", fontFamily: "'Space Mono',monospace" }}>
          No hay artículos cargados todavía. Usá "Nuevo" para agregar el primero.
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredPorArticulo}
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

            {subcodigosDelArticulo.length > 0 && (
              <datalist id={`subcodigos-pieza-${panelCodartint}`}>
                {subcodigosDelArticulo.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}

            {panelSubcodigo === null ? (
              // ── Paso 1: elegir variante ──────────────────────────────
              <>
                <p style={{ margin: "8px 0 16px", fontSize: 12, color: "#4a8ab5" }}>
                  Elegí un subcódigo para ver (o empezar a cargar) sus piezas.
                </p>

                {piezasLoading ? (
                  <p style={{ color: "#4a8ab5", fontSize: 12 }}>⏳ Cargando piezas...</p>
                ) : piezasError ? (
                  <p style={{ color: "#c0392b", fontSize: 12 }}>⚠ {piezasError}</p>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 16,
                      }}
                    >
                      {gruposPiezas
                        .filter(([subcodigo]) => subcodigo !== "")
                        .map(([subcodigo, piezasDelGrupo]) => (
                          <button
                            key={subcodigo}
                            onClick={() => abrirSubcodigo(subcodigo)}
                            style={{
                              padding: "10px 16px",
                              borderRadius: 6,
                              border: "1.5px solid #b8d6ef",
                              background: "#eaf3fb",
                              color: "#0a3a5c",
                              cursor: "pointer",
                              fontFamily: "'Space Mono', monospace",
                              fontSize: 12,
                              fontWeight: 700,
                              textAlign: "left",
                            }}
                          >
                            {subcodigo}
                            <span style={{ fontWeight: 400, color: "#5a86ab", marginLeft: 6 }}>
                              ({piezasDelGrupo.length})
                            </span>
                          </button>
                        ))}
                      <button
                        onClick={() => abrirSubcodigo("")}
                        style={{
                          padding: "10px 16px",
                          borderRadius: 6,
                          border: "1.5px dashed #b8d6ef",
                          background: "#fff",
                          color: "#5a86ab",
                          cursor: "pointer",
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 12,
                          fontStyle: "italic",
                          textAlign: "left",
                        }}
                      >
                        Sin variante (compartidas)
                        <span style={{ fontStyle: "normal", marginLeft: 6 }}>
                          ({(gruposPiezas.find(([s]) => s === "")?.[1] ?? []).length})
                        </span>
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="text"
                        value={nuevoSubcodigoInput}
                        onChange={(e) => setNuevoSubcodigoInput(e.target.value)}
                        placeholder="Nuevo subcódigo, ej: 02BAJO10MDF"
                        maxLength={50}
                        style={{
                          padding: "6px 8px",
                          fontSize: 12,
                          fontFamily: "'Space Mono',monospace",
                          border: "1.5px solid #b8d6ef",
                          borderRadius: 4,
                          color: "#0a3a5c",
                          flex: 1,
                          maxWidth: 260,
                        }}
                      />
                      <button
                        onClick={() => {
                          const v = nuevoSubcodigoInput.trim();
                          if (v) abrirSubcodigo(v);
                        }}
                        disabled={!nuevoSubcodigoInput.trim()}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 4,
                          border: "none",
                          background: "#0a3a5c",
                          color: "#fff",
                          cursor: nuevoSubcodigoInput.trim() ? "pointer" : "default",
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 12,
                          fontWeight: 700,
                          opacity: nuevoSubcodigoInput.trim() ? 1 : 0.5,
                        }}
                      >
                        + Nueva variante
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              // ── Paso 2: piezas de la variante elegida ────────────────
              <>
                <button
                  onClick={volverASubcodigos}
                  style={{
                    border: "none",
                    background: "none",
                    color: "#4a8ab5",
                    cursor: "pointer",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 12,
                    padding: 0,
                    marginBottom: 12,
                  }}
                >
                  ← Variantes
                </button>

                <p style={{ margin: "0 0 16px", fontSize: 12, color: "#4a8ab5" }}>
                  {panelSubcodigo ? (
                    <>
                      Subcódigo <strong>{panelSubcodigo}</strong> — cada pieza con
                      fórmula asignada genera un renglón en el CSV de fórmulas de
                      producción de esta variante.
                    </>
                  ) : (
                    <>
                      Piezas <em>sin variante</em> (compartidas por todos los
                      subcódigos de este artículo) — cada una con fórmula asignada
                      genera un renglón en el CSV, además de las propias de cada
                      variante puntual.
                    </>
                  )}
                </p>

                {panelSubcodigo && piezasBaseSinVariante.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <button
                      onClick={handleTraerPiezasDelCodigo}
                      disabled={trayendoPiezas}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 4,
                        border: "1.5px solid #0a3a5c",
                        background: "#fff",
                        color: "#0a3a5c",
                        cursor: trayendoPiezas ? "wait" : "pointer",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 12,
                        fontWeight: 700,
                        opacity: trayendoPiezas ? 0.6 : 1,
                      }}
                    >
                      {trayendoPiezas
                        ? "Trayendo piezas…"
                        : `⇩ Traer piezas del código (${piezasBaseSinVariante.length})`}
                    </button>
                    {errorTraer && (
                      <p style={{ color: "#c0392b", fontSize: 12, margin: "6px 0 0" }}>
                        ⚠ {errorTraer}
                      </p>
                    )}
                  </div>
                )}

                {familiasFormulas.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      margin: "0 0 12px",
                    }}
                  >
                    <label
                      htmlFor="filtro-familia-formula"
                      style={{ fontSize: 11, color: "#5a86ab" }}
                    >
                      Familia de fórmula
                    </label>
                    <select
                      id="filtro-familia-formula"
                      value={filtroFamiliaFormula}
                      onChange={(e) => setFiltroFamiliaFormula(e.target.value)}
                      style={{
                        padding: "4px 8px",
                        fontSize: 12,
                        fontFamily: "'Space Mono',monospace",
                        border: "1.5px solid #b8d6ef",
                        borderRadius: 4,
                        color: "#0a3a5c",
                        background: "#fff",
                        maxWidth: 260,
                      }}
                    >
                      <option value="">Todas</option>
                      {familiasFormulas.map((fam) => (
                        <option key={fam} value={fam}>
                          {fam}
                        </option>
                      ))}
                    </select>
                    {filtroFamiliaFormula && (
                      <button
                        onClick={() => setFiltroFamiliaFormula("")}
                        style={{
                          border: "none",
                          background: "none",
                          color: "#4a8ab5",
                          cursor: "pointer",
                          fontSize: 11,
                          textDecoration: "underline",
                        }}
                      >
                        Quitar filtro
                      </button>
                    )}
                  </div>
                )}

                {errorDuplicar && (
                  <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 8px" }}>
                    ⚠ {errorDuplicar}
                  </p>
                )}

                {piezasLoading ? (
                  <p style={{ color: "#4a8ab5", fontSize: 12 }}>⏳ Cargando piezas...</p>
                ) : piezasError ? (
                  <p style={{ color: "#c0392b", fontSize: 12 }}>⚠ {piezasError}</p>
                ) : piezasDeVarianteActual.length === 0 ? (
                  <p style={{ color: "#8aabb8", fontSize: 12 }}>
                    Todavía no cargaste piezas para esta variante.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto", marginBottom: 16 }}>
                    <DataTable
                      columns={columnasPieza}
                      rows={piezasDeVarianteActual}
                      selectedId={null}
                      onSelect={() => {}}
                      storageKey={`modulos-domus-piezas-${panelCodartint}-${panelSubcodigo || "sin-variante"}`}
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
                      label="Fórmula (Alto, Ancho y Profundidad) — buscar por código o descripción"
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
                      Subcódigo (variante — dejalo vacío si la pieza es compartida por todas)
                    </label>
                    <input
                      type="text"
                      value={piezaSubcodigo}
                      onChange={(e) => setPiezaSubcodigo(e.target.value)}
                      placeholder="Ej: 02BAJO10MDF"
                      list={`subcodigos-pieza-${panelCodartint}`}
                      maxLength={50}
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
