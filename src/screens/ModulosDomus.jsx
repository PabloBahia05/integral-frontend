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
// MODELO (rediseño): la pieza de `modulos-domus` cuelga SOLO de un
// `codigo_produccion_id` (catálogo `codigos_produccion`) — ya no de un
// artículo. Cargás una pieza una sola vez para un código y esa misma pieza
// aplica a TODOS los artículos que ese código tenga vinculados en
// `articulo_produccion` (el modal "🔗 Relaciones", que sigue siendo el
// único lugar donde se ata código↔artículo — eso no cambió). `codartint`
// por pieza queda como dato histórico de piezas viejas; ya no se pide al
// cargar una pieza nueva ni se usa para nada acá.
//
// La pantalla principal lista CÓDIGOS DE PRODUCCIÓN (no artículos). Al
// hacer clic en uno se abre su panel de piezas, con el mismo flujo de
// variantes (subcódigo) y alta guiada por búsqueda de fórmula que ya
// existía, ahora escapado por código en vez de por artículo.

const CAMPOS_TEXTO = [
  { campo: "bpp", label: "BPP", maxLength: 30 },
  { campo: "cant1", label: "Cant1", maxLength: 100 },
  { campo: "cant2", label: "Cant2", maxLength: 100 },
  { campo: "cant3", label: "Cant3", maxLength: 100 },
  { campo: "cant4", label: "Cant4", maxLength: 100 },
];

// Cant1 a Cant4 dejan de ser texto libre: son un desplegable fijo con
// estas opciones (más "—" vacío), usado en el mini-table de piezas del panel.
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
  const [search, setSearch] = useState("");

  // ── Catálogo de códigos de producción (grilla principal) ────────────
  const [codigosProduccion, setCodigosProduccion] = useState([]);
  const [loadingCodigos, setLoadingCodigos] = useState(true);
  const [errorCargaCodigos, setErrorCargaCodigos] = useState(null);
  // Fila resaltada de la grilla principal, para que "Editar"/"Eliminar" del
  // toolbar tengan algo sobre qué actuar.
  const [seleccionado, setSeleccionado] = useState(null);

  const fetchCodigosProduccion = () => {
    setLoadingCodigos(true);
    setErrorCargaCodigos(null);
    authFetch(`${API}/codigos-produccion`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        setCodigosProduccion(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error("Error cargando códigos de producción:", e);
        setErrorCargaCodigos(e.message);
        setCodigosProduccion([]);
      })
      .finally(() => setLoadingCodigos(false));
  };

  useEffect(() => {
    fetchCodigosProduccion();
  }, []);

  // Colores de melamina: artículos con area=MELAMINA, para el desplegable
  // de la columna Color del panel de piezas.
  const [coloresMelamina, setColoresMelamina] = useState([]);
  useEffect(() => {
    authFetch(`${API}/articulos/colores-melamina`)
      .then((r) => r.json())
      .then((data) => setColoresMelamina(Array.isArray(data) ? data : []))
      .catch(() => setColoresMelamina([]));
  }, []);

  // Materiales de fondo: mismo endpoint, filtrando area=FONDO. Se ofrecen
  // en el desplegable de Color en vez de coloresMelamina cuando la fórmula
  // de la pieza es de fondo (ver `esPiezaDeFondo` más abajo).
  const [coloresFondo, setColoresFondo] = useState([]);
  useEffect(() => {
    authFetch(`${API}/articulos/colores-melamina?area=FONDO`)
      .then((r) => r.json())
      .then((data) => setColoresFondo(Array.isArray(data) ? data : []))
      .catch(() => setColoresFondo([]));
  }, []);

  // ── Piezas sin código de producción asignado ─────────────────────────
  //
  // El único caso que necesita atención con este modelo: una pieza que
  // todavía no cuelga de ningún código, así que no aparece bajo ninguna
  // fila de la grilla principal. Se resuelve asignándole un código
  // existente acá mismo, sin tener que abrir ningún panel.
  const [sinCodigo, setSinCodigo] = useState([]);
  const [sinCodigoAbierto, setSinCodigoAbierto] = useState(false);
  const [sinCodigoLoading, setSinCodigoLoading] = useState(false);
  const [sinCodigoError, setSinCodigoError] = useState(null);
  const [asignandoSinCodigoId, setAsignandoSinCodigoId] = useState(null);

  const fetchSinCodigo = () => {
    setSinCodigoLoading(true);
    setSinCodigoError(null);
    authFetch(`${API}/modulos-domus/sin-codigo`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setSinCodigo(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error("Error cargando piezas sin código:", e);
        setSinCodigoError(e.message || "No se pudo cargar.");
        setSinCodigo([]);
      })
      .finally(() => setSinCodigoLoading(false));
  };

  useEffect(() => {
    fetchSinCodigo();
  }, []);

  const abrirSinCodigo = () => {
    setSinCodigoAbierto(true);
    fetchSinCodigo();
  };

  const cerrarSinCodigo = () => setSinCodigoAbierto(false);

  const handleAsignarSinCodigo = async (fila, codigoId) => {
    if (!codigoId) return;
    setAsignandoSinCodigoId(fila.id);
    try {
      const res = await authFetch(`${API}/modulos-domus/${fila.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo_produccion_id: Number(codigoId) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSinCodigo((prev) => prev.filter((f) => f.id !== fila.id));
      setCodigosProduccion((prev) =>
        prev.map((c) =>
          String(c.id) === String(codigoId)
            ? { ...c, cant_piezas: Number(c.cant_piezas ?? 0) + 1 }
            : c,
        ),
      );
    } catch (e) {
      console.error("Error asignando código a la pieza:", e);
      alert(e.message || "No se pudo asignar el código.");
    } finally {
      setAsignandoSinCodigoId(null);
    }
  };

  // ── Modal "Relaciones" (códigos de producción → artículos vinculados) ───
  //
  // Trae de una el catálogo completo (`/codigos-produccion`) y TODOS los
  // vínculos (`/articulo-produccion`, sin filtro) y arma, por cada código,
  // la lista de artículos que lo tienen habilitado. Incluye también los
  // códigos sin ningún artículo vinculado todavía (lista vacía), para
  // poder detectarlos de un vistazo. Este modal es el ÚNICO lugar donde se
  // edita el vínculo código↔artículo — no cambió con el rediseño.
  const [relacionesAbierto, setRelacionesAbierto] = useState(false);
  const [relacionesLoading, setRelacionesLoading] = useState(false);
  const [relacionesError, setRelacionesError] = useState(null);
  const [relacionesCodigos, setRelacionesCodigos] = useState([]);
  const [quitandoVinculoId, setQuitandoVinculoId] = useState(null);
  // Borrado del código de producción EN SÍ (no solo su vínculo con un
  // artículo puntual). El backend bloquea con 409 "en_uso" si el código
  // todavía está vinculado a algún artículo y/o tiene piezas de
  // modulos-domus con ese codigo_produccion_id — con ?forzar=true se
  // salta el bloqueo: borra los vínculos y desasigna (no borra) las piezas.
  const [eliminandoCodigoId, setEliminandoCodigoId] = useState(null);
  const [errorEliminarCodigoId, setErrorEliminarCodigoId] = useState(null);
  // Alta de un vínculo artículo↔código directamente desde una tarjeta del
  // modal de Relaciones ("+ Agregar artículo").
  const [agregarArticuloCodigoId, setAgregarArticuloCodigoId] = useState(null);
  const [agregarBusqueda, setAgregarBusqueda] = useState("");
  const [agregarResultados, setAgregarResultados] = useState([]);
  const [agregarFocus, setAgregarFocus] = useState(false);
  const [buscandoArticuloAgregar, setBuscandoArticuloAgregar] = useState(false);
  const [agregandoVinculo, setAgregandoVinculo] = useState(false);
  const [errorAgregarVinculo, setErrorAgregarVinculo] = useState(null);

  const fetchRelaciones = () => {
    setRelacionesLoading(true);
    setRelacionesError(null);
    Promise.all([
      authFetch(`${API}/codigos-produccion`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
      authFetch(`${API}/articulo-produccion`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    ])
      .then(([codigos, vinculos]) => {
        const listaCodigos = Array.isArray(codigos) ? codigos : [];
        const listaVinculos = Array.isArray(vinculos) ? vinculos : [];
        const armado = listaCodigos
          .map((c) => ({
            id: c.id,
            codigo: c.codigo,
            descripcion: c.descripcion,
            piezas: Number(c.cant_piezas ?? 0),
            articulos: listaVinculos
              .filter((v) => v.codigo_produccion_id === c.id)
              .map((v) => ({
                vinculoId: v.id,
                codartint: v.codartint,
                articulo_descripcion: v.articulo_descripcion,
              }))
              .sort((a, b) => a.codartint.localeCompare(b.codartint, "es")),
          }))
          .sort((a, b) => a.codigo.localeCompare(b.codigo, "es"));
        setRelacionesCodigos(armado);
      })
      .catch((e) => {
        console.error("Error cargando relaciones:", e);
        setRelacionesError(e.message || "No se pudieron cargar las relaciones.");
        setRelacionesCodigos([]);
      })
      .finally(() => setRelacionesLoading(false));
  };

  const abrirRelaciones = () => {
    setRelacionesAbierto(true);
    fetchRelaciones();
  };

  const cerrarRelaciones = () => {
    setRelacionesAbierto(false);
    setRelacionesError(null);
  };

  // Quita el vínculo artículo↔código (no borra el código ni las piezas ya
  // cargadas con ese codigo_produccion_id).
  const handleQuitarVinculo = async (vinculo, codigoId) => {
    const codigo = relacionesCodigos.find((c) => c.id === codigoId);
    const esUltimoVinculo = (codigo?.articulos.length ?? 0) <= 1;
    const advertenciaPiezas =
      esUltimoVinculo && codigo?.piezas > 0
        ? `\n\n⚠ Este código tiene ${codigo.piezas} pieza${codigo.piezas === 1 ? "" : "s"} cargada${codigo.piezas === 1 ? "" : "s"} en Módulos Domus — van a quedar sin ningún artículo vinculado al código.`
        : "";
    if (
      !window.confirm(
        `¿Quitar ${vinculo.codartint} del código de producción seleccionado? No borra piezas ni el código en sí.${advertenciaPiezas}`,
      )
    ) {
      return;
    }
    setQuitandoVinculoId(vinculo.vinculoId);
    try {
      const res = await authFetch(`${API}/articulo-produccion/${vinculo.vinculoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRelacionesCodigos((prev) =>
        prev.map((c) =>
          c.id === codigoId
            ? { ...c, articulos: c.articulos.filter((a) => a.vinculoId !== vinculo.vinculoId) }
            : c,
        ),
      );
      setCodigosProduccion((prev) =>
        prev.map((c) =>
          c.id === codigoId
            ? { ...c, cant_articulos: Math.max(0, Number(c.cant_articulos ?? 1) - 1) }
            : c,
        ),
      );
    } catch (e) {
      console.error("Error quitando vínculo:", e);
      alert("No se pudo quitar el vínculo. Revisá la consola.");
    } finally {
      setQuitandoVinculoId(null);
    }
  };

  // Borra el código de producción en sí (no un vínculo puntual). Por
  // defecto el backend devuelve 409 { error: "en_uso", detail, enUso,
  // conPiezas } si todavía está vinculado a algún artículo y/o tiene
  // piezas con ese codigo_produccion_id — con forzar=true se salta el
  // bloqueo: borra los vínculos en articulo_produccion y desasigna (NO
  // borra) las piezas de modulos-domus que tenían este código.
  const handleEliminarCodigo = async (codigo, forzar = false) => {
    const confirmMsg = forzar
      ? `¿Forzar el borrado de "${codigo.codigo}"? Se van a quitar todos sus vínculos con artículos y las piezas que tenía asignado este código van a quedar SIN código de producción (podés reasignarlas después desde "⚠ Piezas sin código"). Esta acción no se puede deshacer.`
      : `¿Eliminar el código de producción "${codigo.codigo}" del catálogo? Esta acción no se puede deshacer.`;
    if (!window.confirm(confirmMsg)) return;

    setEliminandoCodigoId(codigo.id);
    setErrorEliminarCodigoId(null);
    try {
      const res = await authFetch(
        `${API}/codigos-produccion/${codigo.id}${forzar ? "?forzar=true" : ""}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 409 && data?.detail) {
          setErrorEliminarCodigoId({
            id: codigo.id,
            mensaje: data.detail,
            enUso: data.enUso,
            conPiezas: data.conPiezas,
          });
          return;
        }
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setRelacionesCodigos((prev) => prev.filter((c) => c.id !== codigo.id));
      setCodigosProduccion((prev) => prev.filter((c) => c.id !== codigo.id));
      if (panelCodigo?.id === codigo.id) cerrarPanel();
      if (forzar) fetchSinCodigo();
    } catch (e) {
      console.error("Error eliminando código de producción:", e);
      alert(e.message || "No se pudo eliminar el código de producción.");
    } finally {
      setEliminandoCodigoId(null);
    }
  };

  const abrirAgregarArticulo = (codigoId) => {
    setAgregarArticuloCodigoId(codigoId);
    setAgregarBusqueda("");
    setAgregarResultados([]);
    setErrorAgregarVinculo(null);
  };

  const cerrarAgregarArticulo = () => {
    setAgregarArticuloCodigoId(null);
    setAgregarBusqueda("");
    setAgregarResultados([]);
    setErrorAgregarVinculo(null);
  };

  // Vincula un artículo ya existente (elegido del buscador) al código de
  // producción de la tarjeta abierta.
  const handleAgregarVinculo = async (codigo, articulo) => {
    const yaVinculado = codigo.articulos.some(
      (a) => String(a.codartint).trim().toUpperCase() === String(articulo.codartint).trim().toUpperCase(),
    );
    if (yaVinculado) {
      setErrorAgregarVinculo("Ese artículo ya está vinculado a este código.");
      return;
    }
    setAgregandoVinculo(true);
    setErrorAgregarVinculo(null);
    try {
      const res = await authFetch(`${API}/articulo-produccion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codartint: articulo.codartint,
          codigo_produccion_id: codigo.id,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setRelacionesCodigos((prev) =>
        prev.map((c) =>
          c.id === codigo.id
            ? {
                ...c,
                articulos: [
                  ...c.articulos,
                  {
                    vinculoId: data?.id,
                    codartint: articulo.codartint,
                    articulo_descripcion: articulo.articulo,
                  },
                ].sort((a, b) => a.codartint.localeCompare(b.codartint, "es")),
              }
            : c,
        ),
      );
      setCodigosProduccion((prev) =>
        prev.map((c) =>
          c.id === codigo.id
            ? { ...c, cant_articulos: Number(c.cant_articulos ?? 0) + 1 }
            : c,
        ),
      );
      cerrarAgregarArticulo();
    } catch (e) {
      console.error("Error vinculando artículo:", e);
      setErrorAgregarVinculo(e.message || "No se pudo vincular el artículo.");
    } finally {
      setAgregandoVinculo(false);
    }
  };

  // Búsqueda server-side (con debounce) de artículos para "+ Agregar
  // artículo" dentro de una tarjeta del modal de Relaciones.
  useEffect(() => {
    if (!agregarBusqueda.trim()) {
      setAgregarResultados([]);
      setBuscandoArticuloAgregar(false);
      return;
    }
    setBuscandoArticuloAgregar(true);
    const timer = setTimeout(() => {
      authFetch(
        `${API}/articulos/buscar-descripcion?q=${encodeURIComponent(agregarBusqueda.trim())}`,
      )
        .then((r) => r.json())
        .then((data) => setAgregarResultados(Array.isArray(data) ? data : []))
        .catch(() => setAgregarResultados([]))
        .finally(() => setBuscandoArticuloAgregar(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [agregarBusqueda, authFetch]);

  // ── Edición inline del catálogo de códigos (grilla principal) ────────

  const [guardandoCampo, setGuardandoCampo] = useState(null);
  const [errorCampo, setErrorCampo] = useState(null);

  const handleCodigoCampoChange = (id, campo, valor) => {
    setCodigosProduccion((prev) => prev.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)));
  };

  const handleCodigoCampoBlur = async (row, campo) => {
    const key = `${row.id}-${campo}`;
    setGuardandoCampo(key);
    setErrorCampo(null);
    try {
      const res = await authFetch(`${API}/codigos-produccion/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: row[campo] === "" ? null : row[campo] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (panelCodigo?.id === row.id) {
        setPanelCodigo((prev) => (prev ? { ...prev, [campo]: row[campo] } : prev));
      }
    } catch (e) {
      console.error(`Error guardando ${campo} del código:`, e);
      setErrorCampo(key);
    } finally {
      setGuardandoCampo(null);
    }
  };

  // ── Alta de un código de producción nuevo ────────────────────────────

  const [nuevoCodigoAbierto, setNuevoCodigoAbierto] = useState(false);
  const [nuevoCodigoTexto, setNuevoCodigoTexto] = useState("");
  const [nuevoCodigoDescripcion, setNuevoCodigoDescripcion] = useState("");
  const [guardandoNuevoCodigo, setGuardandoNuevoCodigo] = useState(false);
  const [errorNuevoCodigo, setErrorNuevoCodigo] = useState(null);

  const cerrarNuevoCodigo = () => {
    setNuevoCodigoAbierto(false);
    setNuevoCodigoTexto("");
    setNuevoCodigoDescripcion("");
    setErrorNuevoCodigo(null);
  };

  const handleCrearCodigoNuevo = async () => {
    if (!nuevoCodigoTexto.trim()) return;
    setGuardandoNuevoCodigo(true);
    setErrorNuevoCodigo(null);
    try {
      const res = await authFetch(`${API}/codigos-produccion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: nuevoCodigoTexto.trim(),
          descripcion: nuevoCodigoDescripcion.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const nuevo = {
        id: data.id,
        codigo: data.codigo,
        descripcion: data.descripcion ?? null,
        cant_articulos: 0,
        cant_piezas: 0,
      };
      setCodigosProduccion((prev) => [...prev, nuevo].sort((a, b) => a.codigo.localeCompare(b.codigo, "es")));
      cerrarNuevoCodigo();
      abrirPanel(nuevo);
    } catch (e) {
      console.error("Error creando código de producción:", e);
      setErrorNuevoCodigo(e.message || "No se pudo guardar.");
    } finally {
      setGuardandoNuevoCodigo(false);
    }
  };

  // ── Duplicar un código de producción completo (con sus piezas) ──────
  //
  // Copia código+descripción y TODAS las piezas de todos los subcódigos
  // del original, colgándolas del nuevo código. NO duplica los artículos
  // vinculados (eso se arma aparte desde "🔗 Relaciones").

  const [duplicarCodigoOrigen, setDuplicarCodigoOrigen] = useState(null);
  const [duplicarCodigoTexto, setDuplicarCodigoTexto] = useState("");
  const [duplicandoCodigo, setDuplicandoCodigo] = useState(false);
  const [errorDuplicarCodigo, setErrorDuplicarCodigo] = useState(null);

  const abrirDuplicarCodigo = (codigo) => {
    setDuplicarCodigoOrigen(codigo);
    setDuplicarCodigoTexto("");
    setErrorDuplicarCodigo(null);
  };

  const cerrarDuplicarCodigo = () => {
    if (duplicandoCodigo) return;
    setDuplicarCodigoOrigen(null);
    setDuplicarCodigoTexto("");
    setErrorDuplicarCodigo(null);
  };

  const handleDuplicarCodigo = async () => {
    if (!duplicarCodigoOrigen || !duplicarCodigoTexto.trim()) return;
    setDuplicandoCodigo(true);
    setErrorDuplicarCodigo(null);
    try {
      // 1. Alta del nuevo código, con la misma descripción que el original.
      const resCodigo = await authFetch(`${API}/codigos-produccion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: duplicarCodigoTexto.trim(),
          descripcion: duplicarCodigoOrigen.descripcion ?? null,
        }),
      });
      const dataCodigo = await resCodigo.json().catch(() => null);
      if (!resCodigo.ok) throw new Error(dataCodigo?.error || `HTTP ${resCodigo.status}`);
      const nuevoId = dataCodigo.id;

      // 2. Traer TODAS las piezas del código original (todos los
      //    subcódigos/variantes, más las piezas sin variante).
      const resPiezas = await authFetch(
        `${API}/modulos-domus/por-codigo-produccion/${duplicarCodigoOrigen.id}`,
      );
      const piezasOriginales = await resPiezas.json().catch(() => null);
      if (!resPiezas.ok) throw new Error(piezasOriginales?.error || `HTTP ${resPiezas.status}`);

      // 3. Duplicar cada pieza colgándola del nuevo código — mismo criterio
      //    de limpieza de campos que ya usa handleDuplicarPieza (saca id y
      //    los campos derivados/join de fórmula, que se resuelven solos
      //    por formulax/formulay).
      for (const pieza of Array.isArray(piezasOriginales) ? piezasOriginales : []) {
        const {
          id: _id,
          codform: _cf,
          formulax_descripcion: _fxd,
          formulay_descripcion: _fyd,
          formulax_formula: _fxf,
          formulax_formula2: _fxf2,
          formulax_formula3: _fxf3,
          formulay_formula: _fyf,
          ...resto
        } = pieza;
        const resPieza = await authFetch(`${API}/modulos-domus`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...resto, codigo_produccion_id: nuevoId }),
        });
        if (!resPieza.ok) {
          const body = await resPieza.json().catch(() => null);
          throw new Error(body?.error || `HTTP ${resPieza.status} al duplicar una pieza`);
        }
      }

      // 4. Reflejar el nuevo código en la lista principal.
      const nuevo = {
        id: nuevoId,
        codigo: dataCodigo.codigo,
        descripcion: dataCodigo.descripcion ?? null,
        cant_articulos: 0,
        cant_piezas: Array.isArray(piezasOriginales) ? piezasOriginales.length : 0,
      };
      setCodigosProduccion((prev) =>
        [...prev, nuevo].sort((a, b) => a.codigo.localeCompare(b.codigo, "es")),
      );
      cerrarDuplicarCodigo();
    } catch (e) {
      console.error("Error duplicando código de producción:", e);
      setErrorDuplicarCodigo(e.message || "No se pudo duplicar el código.");
    } finally {
      setDuplicandoCodigo(false);
    }
  };

  // ── Panel de un código de producción (sus piezas) ────────────────────

  // Código abierto en el panel: { id, codigo, descripcion } o null.
  const [panelCodigo, setPanelCodigo] = useState(null);
  // Artículos vinculados a este código (solo lectura acá — se editan desde
  // "🔗 Relaciones"), para que quede a la vista sin tener que ir y volver.
  const [panelVinculos, setPanelVinculos] = useState([]);
  const [panelVinculosLoading, setPanelVinculosLoading] = useState(false);
  // Subcódigo elegido dentro del panel: `null` = todavía no se eligió
  // ninguno, se muestra el selector de variantes; string ("" incluido,
  // para "sin variante") = ya se eligió una y se muestra su lista de
  // piezas.
  const [panelSubcodigo, setPanelSubcodigo] = useState(null);
  const [nuevoSubcodigoInput, setNuevoSubcodigoInput] = useState("");
  const [piezas, setPiezas] = useState([]);
  const [piezasLoading, setPiezasLoading] = useState(false);
  const [piezasError, setPiezasError] = useState(null);
  const [duplicandoId, setDuplicandoId] = useState(null);
  const [errorDuplicar, setErrorDuplicar] = useState(null);

  // Alta de pieza nueva, dentro del panel.
  const [piezaAbierta, setPiezaAbierta] = useState(false);
  const [formulas, setFormulas] = useState([]);
  const [formulasCargadas, setFormulasCargadas] = useState(false);
  const [busquedaFormula, setBusquedaFormula] = useState("");
  const [filtroFamiliaFormula, setFiltroFamiliaFormula] = useState("");
  const [formulaFocus, setFormulaFocus] = useState(false);
  const [piezaFormula, setPiezaFormula] = useState("");
  const [piezaTitulo, setPiezaTitulo] = useState("");
  const [piezaSubcodigo, setPiezaSubcodigo] = useState("");
  const [guardandoPieza, setGuardandoPieza] = useState(false);
  const [errorPieza, setErrorPieza] = useState(null);

  const [trayendoPiezas, setTrayendoPiezas] = useState(false);
  const [errorTraer, setErrorTraer] = useState(null);

  // Pieza a eliminar (ConfirmDelete).
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const fetchPiezas = (codigoId) => {
    setPiezasLoading(true);
    setPiezasError(null);
    authFetch(`${API}/modulos-domus/por-codigo-produccion/${codigoId}`)
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

  const fetchVinculosDelCodigo = (codigoId) => {
    setPanelVinculosLoading(true);
    authFetch(`${API}/articulo-produccion?codigo_produccion_id=${codigoId}`)
      .then((r) => r.json())
      .then((data) => setPanelVinculos(Array.isArray(data) ? data : []))
      .catch((e) => {
        console.error("Error cargando artículos vinculados:", e);
        setPanelVinculos([]);
      })
      .finally(() => setPanelVinculosLoading(false));
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
    setSeleccionado(row);
    setPanelCodigo(row);
    setPanelSubcodigo(null);
    setNuevoSubcodigoInput("");
    fetchPiezas(row.id);
    fetchVinculosDelCodigo(row.id);
    fetchFormulas();
  };

  const cerrarPanel = () => {
    setPanelCodigo(null);
    setPanelVinculos([]);
    setPanelSubcodigo(null);
    setNuevoSubcodigoInput("");
    setPiezas([]);
    setPiezasError(null);
    cerrarPieza();
  };

  // Elegir una variante en el selector: pasa a mostrar solo sus piezas.
  const abrirSubcodigo = (subcodigo) => {
    setPanelSubcodigo(subcodigo);
    setErrorTraer(null);
    cerrarPieza();
  };

  const volverASubcodigos = () => {
    setPanelSubcodigo(null);
    setNuevoSubcodigoInput("");
    setErrorTraer(null);
    cerrarPieza();
  };

  const handlePiezaCampoChange = (id, campo, valor) => {
    setPiezas((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  };

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
  // MISMO codform en formulax Y formulay.
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

  // Una pieza es "de fondo" cuando la descripción de su fórmula asignada
  // (formulax, buscada en el catálogo `formulas`) contiene la palabra
  // "fondo" (sin importar mayúsculas). En ese caso el desplegable de Color
  // debe ofrecer materiales con area=FONDO en vez de area=MELAMINA.
  const esPiezaDeFondo = (row) => {
    const f = formulas.find((f) => f.codform === row.formulax);
    return (f?.descripcion ?? "").toLowerCase().includes("fondo");
  };

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
  // los campos resueltos por JOIN) como alta nueva, en el mismo código.
  const handleDuplicarPieza = async (row) => {
    if (!panelCodigo) return;
    setDuplicandoId(row.id);
    setErrorDuplicar(null);
    try {
      const {
        id: _id,
        codform: _cf,
        formulax_descripcion: _fxd,
        formulay_descripcion: _fyd,
        formulax_formula: _fxf,
        formulax_formula2: _fxf2,
        formulax_formula3: _fxf3,
        formulay_formula: _fyf,
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
      fetchPiezas(panelCodigo.id);
      setCodigosProduccion((prev) =>
        prev.map((c) =>
          c.id === panelCodigo.id ? { ...c, cant_piezas: Number(c.cant_piezas ?? 0) + 1 } : c,
        ),
      );
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
  // comunes del código), para no tener que cargar de cero una variante
  // que comparte casi todo con la base.
  const handleTraerPiezasDelCodigo = async () => {
    if (!panelCodigo || !panelSubcodigo) return;
    const piezasBase = piezas.filter((p) => !String(p.subcodigo ?? "").trim());
    if (piezasBase.length === 0) return;
    if (
      !window.confirm(
        `Esto copia ${piezasBase.length} pieza(s) sin variante de ${panelCodigo.codigo} al subcódigo ${panelSubcodigo}. Después vas a poder modificar las que hagan falta. ¿Continuar?`,
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
          formulax_descripcion: _fxd,
          formulay_descripcion: _fyd,
          formulax_formula: _fxf,
          formulax_formula2: _fxf2,
          formulax_formula3: _fxf3,
          formulay_formula: _fyf,
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
      fetchPiezas(panelCodigo.id);
      setCodigosProduccion((prev) =>
        prev.map((c) =>
          c.id === panelCodigo.id
            ? { ...c, cant_piezas: Number(c.cant_piezas ?? 0) + piezasBase.length }
            : c,
        ),
      );
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

  // Piezas de la variante elegida en el selector (panelSubcodigo).
  const piezasDeVarianteActual = piezas.filter(
    (p) => String(p.subcodigo ?? "").trim() === (panelSubcodigo ?? ""),
  );
  // Piezas "sin variante" del código — la fuente de "Traer piezas del
  // código" (ver handleTraerPiezasDelCodigo).
  const piezasBaseSinVariante = piezas.filter(
    (p) => !String(p.subcodigo ?? "").trim(),
  );

  const formulasFiltradas = filtrarFormulas(busquedaFormula);

  // Subcódigos (variantes) ya usados entre las piezas de ESTE código —
  // sugerencias para el datalist. Se calculan del lado del cliente, del
  // mismo `piezas` que ya está cargado (no hace falta pegarle al backend).
  const subcodigosDelCodigo = [
    ...new Set(
      piezas.map((p) => String(p.subcodigo ?? "").trim()).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));

  // Piezas del panel agrupadas por subcodigo — cada variante tiene su
  // propio grupo, y las piezas sin subcodigo (compartidas por todas las
  // variantes) quedan en un grupo aparte al final.
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
    if (!panelCodigo) return;
    setGuardandoPieza(true);
    setErrorPieza(null);
    try {
      const res = await authFetch(`${API}/modulos-domus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo_produccion_id: panelCodigo.id,
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
      fetchPiezas(panelCodigo.id);
      setCodigosProduccion((prev) =>
        prev.map((c) =>
          c.id === panelCodigo.id ? { ...c, cant_piezas: Number(c.cant_piezas ?? 0) + 1 } : c,
        ),
      );
    } catch (e) {
      console.error("Error creando pieza:", e);
      setErrorPieza(e.message || "No se pudo guardar.");
    } finally {
      setGuardandoPieza(false);
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
      setPiezas((prev) => prev.filter((p) => p.id !== aEliminar.id));
      setCodigosProduccion((prev) =>
        prev.map((c) =>
          panelCodigo && c.id === panelCodigo.id
            ? { ...c, cant_piezas: Math.max(0, Number(c.cant_piezas ?? 1) - 1) }
            : c,
        ),
      );
      setAEliminar(null);
    } catch (e) {
      console.error("Error borrando pieza de modulos-domus:", e);
      alert("No se pudo borrar la pieza. Revisá la consola.");
    } finally {
      setEliminando(false);
    }
  };

  // ── Filtro por búsqueda (grilla principal) ───────────────────────────

  const q = search.toLowerCase();
  const filtrados = codigosProduccion.filter(
    (c) =>
      (c.codigo ?? "").toLowerCase().includes(q) ||
      (c.descripcion ?? "").toLowerCase().includes(q),
  );

  const totalCodigos = codigosProduccion.length;
  const codigosSinArticulo = codigosProduccion.filter(
    (c) => Number(c.cant_articulos ?? 0) === 0,
  ).length;

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

  // ── Columnas de la grilla principal (catálogo de códigos) ────────────

  const columns = [
    {
      key: "codigo",
      label: "Código",
      render: (v, row) => (
        <input
          type="text"
          value={row.codigo ?? ""}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleCodigoCampoChange(row.id, "codigo", e.target.value)}
          onBlur={() => handleCodigoCampoBlur(row, "codigo")}
          maxLength={50}
          style={estiloInput(row.id, "codigo", "160px")}
        />
      ),
    },
    {
      key: "descripcion",
      label: "Descripción",
      render: (v, row) => (
        <input
          type="text"
          value={row.descripcion ?? ""}
          placeholder="Sin descripción"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleCodigoCampoChange(row.id, "descripcion", e.target.value)}
          onBlur={() => handleCodigoCampoBlur(row, "descripcion")}
          maxLength={255}
          style={estiloInput(row.id, "descripcion", "260px")}
        />
      ),
    },
    {
      key: "cant_articulos",
      label: "Artículos",
      render: (v, row) => (
        <span
          style={{
            fontSize: 12,
            fontFamily: "'Space Mono',monospace",
            color: Number(row.cant_articulos ?? 0) === 0 ? "#c0392b" : "#0a3a5c",
          }}
        >
          {row.cant_articulos ?? 0}
        </span>
      ),
    },
    {
      key: "cant_piezas",
      label: "Piezas",
      render: (v, row) => (
        <span style={{ fontSize: 12, fontFamily: "'Space Mono',monospace" }}>
          {row.cant_piezas ?? 0}
        </span>
      ),
    },
    {
      key: "_borrar",
      label: "",
      render: (v, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEliminarCodigo(row);
          }}
          disabled={eliminandoCodigoId === row.id}
          title="Eliminar este código de producción del catálogo"
          style={{
            border: "1.5px solid #f0c2c2",
            background: "#fff",
            color: "#c0392b",
            cursor: eliminandoCodigoId === row.id ? "default" : "pointer",
            fontSize: 11,
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            borderRadius: 4,
            padding: "3px 8px",
            whiteSpace: "nowrap",
            opacity: eliminandoCodigoId === row.id ? 0.5 : 1,
          }}
        >
          {eliminandoCodigoId === row.id ? "⏳" : "🗑 Eliminar"}
        </button>
      ),
    },
  ];

  // Columnas del mini-table de piezas dentro del panel — ya no incluyen
  // "Código de producción" (el panel entero ya está fijo en un código, no
  // hay nada que elegir pieza por pieza).
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
          list={`subcodigos-pieza-${panelCodigo?.id}`}
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
      key: "formula_resuelta",
      label: "Fórmula asignada",
      render: (v, row) => <CodigoFormulaResuelto codigo={row.formulax} formulas={formulas} />,
    },
    {
      key: "formula",
      label: "Fórmula (Alto)",
      render: (v, row) => <TextoFormulaCampo codigo={row.formulax} formulas={formulas} campo="formula" />,
    },
    {
      key: "formula2",
      label: "Fórmula (Ancho)",
      render: (v, row) => <TextoFormulaCampo codigo={row.formulax} formulas={formulas} campo="formula2" />,
    },
    {
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
            style={estiloInput(row.id, campo, "100px")}
          />
        ),
      };
    }),
    {
      key: "color",
      label: "Color",
      render: (v, row) => {
        const opciones = esPiezaDeFondo(row) ? coloresFondo : coloresMelamina;
        return (
          <select
            value={row.color ?? ""}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const valor = e.target.value;
              handlePiezaCampoChange(row.id, "color", valor);
              guardarPiezaCampo(row.id, "color", valor);
            }}
            style={estiloInput(row.id, "color", "140px")}
          >
            <option value="">—</option>
            {opciones.map((c) => (
              <option key={c.codartint} value={c.articulo}>
                {c.articulo}
              </option>
            ))}
          </select>
        );
      },
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
        subtitle="Piezas por código de producción para el CSV de fórmulas de producción"
      />

      <StatCards
        stats={[
          { label: "Códigos de producción", value: totalCodigos },
          { label: "Sin artículos vinculados", value: codigosSinArticulo },
          { label: "Piezas sin código", value: sinCodigo.length },
          { label: "Filtrados", value: filtrados.length },
        ]}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ActionBar
          selected={seleccionado}
          onNew={() => setNuevoCodigoAbierto(true)}
          onEdit={seleccionado ? () => abrirPanel(seleccionado) : null}
          onDuplicate={seleccionado ? () => abrirDuplicarCodigo(seleccionado) : null}
          onDelete={seleccionado ? () => handleEliminarCodigo(seleccionado) : null}
          search={search}
          onSearch={setSearch}
        />
        <button
          onClick={abrirRelaciones}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1.5px solid #b8d6ef",
            background: "#fff",
            color: "#0a3a5c",
            cursor: "pointer",
            fontFamily: "'Space Mono', monospace",
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          🔗 Relaciones
        </button>
        {sinCodigo.length > 0 && (
          <button
            onClick={abrirSinCodigo}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "1.5px solid #f0c2c2",
              background: "#fdecea",
              color: "#c0392b",
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            ⚠ Piezas sin código ({sinCodigo.length})
          </button>
        )}
      </div>

      <p style={{ margin: "4px 0 12px", fontSize: 11, color: "#8aabb8", fontFamily: "'Space Mono',monospace" }}>
        Hacé clic en un código para ver y cargar sus piezas.
      </p>

      {loadingCodigos ? (
        <p style={{ padding: "24px", color: "#4a8ab5", fontFamily: "'Space Mono',monospace" }}>
          ⏳ Cargando códigos de producción...
        </p>
      ) : errorCargaCodigos ? (
        <p style={{ padding: "24px", color: "#c0392b", fontFamily: "'Space Mono',monospace" }}>
          ⚠ No se pudo cargar: {errorCargaCodigos}
        </p>
      ) : filtrados.length === 0 ? (
        <p style={{ padding: "24px", color: "#8aabb8", fontFamily: "'Space Mono',monospace" }}>
          No hay códigos de producción cargados todavía. Usá "Nuevo" para agregar el primero.
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={filtrados}
          selectedId={seleccionado?.id ?? null}
          onSelect={(row) => row && abrirPanel(row)}
          storageKey="modulos-domus-codigos"
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
              </strong>
              . Esto la saca del próximo CSV de producción que se genere para este
              código. Esta acción no se puede deshacer.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => !eliminando && setAEliminar(null)}
        />
      )}

      {nuevoCodigoAbierto && (
        <div
          onClick={() => !guardandoNuevoCodigo && cerrarNuevoCodigo()}
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
              Nuevo código de producción
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#4a8ab5" }}>
              Esto da de alta el código en el catálogo y abre su panel para
              empezar a cargar piezas. Para vincularlo a artículos, usá
              "🔗 Relaciones" después de crearlo.
            </p>

            <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
              Código (ej: PRD-00123)
            </label>
            <input
              type="text"
              value={nuevoCodigoTexto}
              onChange={(e) => setNuevoCodigoTexto(e.target.value)}
              placeholder="Ej: 02BAJO2P"
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
              Descripción (opcional)
            </label>
            <input
              type="text"
              value={nuevoCodigoDescripcion}
              onChange={(e) => setNuevoCodigoDescripcion(e.target.value)}
              placeholder="Ej: Bajomesada 2 puertas"
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

            {errorNuevoCodigo && (
              <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 12px" }}>{errorNuevoCodigo}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={cerrarNuevoCodigo}
                disabled={guardandoNuevoCodigo}
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
                onClick={handleCrearCodigoNuevo}
                disabled={guardandoNuevoCodigo || !nuevoCodigoTexto.trim()}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  border: "none",
                  background: "#1a7a44",
                  color: "#fff",
                  cursor: guardandoNuevoCodigo ? "wait" : "pointer",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  opacity: guardandoNuevoCodigo ? 0.6 : 1,
                }}
              >
                {guardandoNuevoCodigo ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {duplicarCodigoOrigen && (
        <div
          onClick={cerrarDuplicarCodigo}
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
              Duplicar código de producción
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#4a8ab5" }}>
              Se va a crear un código nuevo con la misma descripción y una
              copia de TODAS las piezas de{" "}
              <strong>{duplicarCodigoOrigen.codigo}</strong> (todos los
              subcódigos). Los artículos vinculados no se copian — se
              vinculan aparte desde "🔗 Relaciones".
            </p>

            <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
              Código nuevo (ej: PRD-00123)
            </label>
            <input
              type="text"
              value={duplicarCodigoTexto}
              onChange={(e) => setDuplicarCodigoTexto(e.target.value)}
              placeholder="Ej: 02BAJO2P"
              maxLength={50}
              autoFocus
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

            {errorDuplicarCodigo && (
              <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 12px" }}>
                {errorDuplicarCodigo}
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={cerrarDuplicarCodigo}
                disabled={duplicandoCodigo}
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
                onClick={handleDuplicarCodigo}
                disabled={duplicandoCodigo || !duplicarCodigoTexto.trim()}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  border: "none",
                  background: "#1a7a44",
                  color: "#fff",
                  cursor: duplicandoCodigo ? "wait" : "pointer",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  opacity: duplicandoCodigo ? 0.6 : 1,
                }}
              >
                {duplicandoCodigo ? "Duplicando…" : "Duplicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {relacionesAbierto && (
        <div
          onClick={cerrarRelaciones}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,58,92,0.55)",
            zIndex: 1100,
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
              maxWidth: 700,
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
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
              <h3 style={{ margin: 0, fontSize: 15 }}>
                Relaciones — códigos de producción → artículos
              </h3>
              <button
                onClick={cerrarRelaciones}
                style={{
                  border: "none",
                  background: "none",
                  color: "#4a8ab5",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#4a8ab5" }}>
              Cada código de producción con los artículos (codartint) que lo
              tienen habilitado — vínculos de <code>articulo_produccion</code>.
            </p>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {relacionesLoading ? (
                <p style={{ color: "#4a8ab5", fontSize: 12 }}>⏳ Cargando relaciones...</p>
              ) : relacionesError ? (
                <p style={{ color: "#c0392b", fontSize: 12 }}>⚠ {relacionesError}</p>
              ) : (
                relacionesCodigos.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      border: "1.5px solid #dbe9f5",
                      borderRadius: 8,
                      padding: "10px 14px",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <div>
                        <button
                          onClick={() => {
                            cerrarRelaciones();
                            abrirPanel(c);
                          }}
                          style={{
                            border: "none",
                            background: "none",
                            color: "#0a3a5c",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: "'Space Mono', monospace",
                            padding: 0,
                            textDecoration: "underline",
                          }}
                          title="Abrir piezas de este código"
                        >
                          {c.codigo}
                        </button>
                        <span style={{ fontWeight: 400, color: "#8aabb8", marginLeft: 8, fontSize: 11 }}>
                          ({c.articulos.length} artículo{c.articulos.length === 1 ? "" : "s"})
                        </span>
                        {c.piezas > 0 && (
                          <span
                            style={{
                              fontWeight: 400,
                              marginLeft: 8,
                              fontSize: 11,
                              color: c.articulos.length === 0 ? "#c0392b" : "#8aabb8",
                            }}
                          >
                            · {c.piezas} pieza{c.piezas === 1 ? "" : "s"} en Módulos Domus
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleEliminarCodigo(c)}
                        disabled={eliminandoCodigoId === c.id}
                        title="Eliminar este código de producción del catálogo"
                        style={{
                          border: "1.5px solid #f0c2c2",
                          background: "#fff",
                          color: "#c0392b",
                          cursor: eliminandoCodigoId === c.id ? "default" : "pointer",
                          fontSize: 11,
                          fontFamily: "'Space Mono', monospace",
                          fontWeight: 700,
                          borderRadius: 4,
                          padding: "3px 8px",
                          whiteSpace: "nowrap",
                          opacity: eliminandoCodigoId === c.id ? 0.5 : 1,
                        }}
                      >
                        {eliminandoCodigoId === c.id ? "⏳" : "🗑 Eliminar código"}
                      </button>
                    </div>
                    {errorEliminarCodigoId?.id === c.id && (
                      <div
                        style={{
                          margin: "0 0 8px",
                          fontSize: 11,
                          color: "#c0392b",
                          background: "#fdecea",
                          padding: "6px 8px",
                          borderRadius: 4,
                        }}
                      >
                        <p style={{ margin: "0 0 6px" }}>⚠ {errorEliminarCodigoId.mensaje}</p>
                        <button
                          onClick={() => handleEliminarCodigo(c, true)}
                          disabled={eliminandoCodigoId === c.id}
                          style={{
                            border: "1.5px solid #c0392b",
                            background: "#fff",
                            color: "#c0392b",
                            cursor: eliminandoCodigoId === c.id ? "default" : "pointer",
                            fontSize: 11,
                            fontFamily: "'Space Mono', monospace",
                            fontWeight: 700,
                            borderRadius: 4,
                            padding: "3px 8px",
                          }}
                        >
                          {eliminandoCodigoId === c.id ? "⏳" : "Forzar borrado"}
                        </button>
                      </div>
                    )}
                    {c.articulos.length === 0 ? (
                      <>
                        <p style={{ margin: 0, fontSize: 11, color: "#b8cfe0" }}>
                          Sin artículos vinculados todavía.
                        </p>
                        {c.piezas > 0 && (
                          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#c0392b" }}>
                            ⚠ Igual tiene {c.piezas} pieza{c.piezas === 1 ? "" : "s"} cargada
                            {c.piezas === 1 ? "" : "s"} en Módulos Domus con este código — por eso
                            "Eliminar código" lo va a rechazar. Para poder borrarlo, primero hay que
                            reasignar o borrar esas piezas desde el panel del código.
                          </p>
                        )}
                      </>
                    ) : (
                      c.articulos.map((a) => (
                        <div
                          key={a.vinculoId}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "4px 0",
                            fontSize: 12,
                          }}
                        >
                          <span>
                            <strong>{a.codartint}</strong>
                            {a.articulo_descripcion ? ` — ${a.articulo_descripcion}` : ""}
                          </span>
                          <button
                            onClick={() => handleQuitarVinculo(a, c.id)}
                            disabled={quitandoVinculoId === a.vinculoId}
                            style={{
                              border: "none",
                              background: "none",
                              color: "#c0392b",
                              cursor: quitandoVinculoId === a.vinculoId ? "default" : "pointer",
                              fontSize: 11,
                              fontFamily: "'Space Mono', monospace",
                            }}
                          >
                            {quitandoVinculoId === a.vinculoId ? "⏳" : "Quitar ✕"}
                          </button>
                        </div>
                      ))
                    )}

                    {agregarArticuloCodigoId === c.id ? (
                      <div style={{ position: "relative", marginTop: 8 }}>
                        <input
                          type="text"
                          value={agregarBusqueda}
                          onChange={(e) => setAgregarBusqueda(e.target.value)}
                          onFocus={() => setAgregarFocus(true)}
                          onBlur={() => setTimeout(() => setAgregarFocus(false), 160)}
                          placeholder="Buscar artículo por código o nombre..."
                          autoComplete="off"
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "6px 8px",
                            fontSize: 12,
                            fontFamily: "'Space Mono',monospace",
                            border: "1.5px solid #b8d6ef",
                            borderRadius: 4,
                          }}
                        />
                        {agregarFocus && agregarResultados.length > 0 && (
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
                            {agregarResultados.map((a) => (
                              <div
                                key={a.codartint}
                                onMouseDown={() => handleAgregarVinculo(c, a)}
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
                        {errorAgregarVinculo && (
                          <p style={{ color: "#c0392b", fontSize: 11, margin: "4px 0 0" }}>
                            {errorAgregarVinculo}
                          </p>
                        )}
                        <button
                          onClick={cerrarAgregarArticulo}
                          style={{
                            border: "none",
                            background: "none",
                            color: "#4a8ab5",
                            cursor: "pointer",
                            fontSize: 11,
                            fontFamily: "'Space Mono', monospace",
                            marginTop: 4,
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => abrirAgregarArticulo(c.id)}
                        style={{
                          marginTop: 8,
                          border: "1.5px dashed #b8d6ef",
                          background: "#fff",
                          color: "#0a3a5c",
                          cursor: "pointer",
                          fontSize: 11,
                          fontFamily: "'Space Mono', monospace",
                          fontWeight: 700,
                          borderRadius: 4,
                          padding: "4px 10px",
                        }}
                      >
                        + Agregar artículo
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {sinCodigoAbierto && (
        <div
          onClick={cerrarSinCodigo}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,58,92,0.55)",
            zIndex: 1100,
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
              maxWidth: 700,
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
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
              <h3 style={{ margin: 0, fontSize: 15 }}>Piezas sin código de producción</h3>
              <button
                onClick={cerrarSinCodigo}
                style={{
                  border: "none",
                  background: "none",
                  color: "#4a8ab5",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#4a8ab5" }}>
              Piezas viejas que todavía no cuelgan de ningún código de
              producción — no aparecen bajo ninguna fila de la grilla
              principal hasta que se les asigne uno.
            </p>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {sinCodigoLoading ? (
                <p style={{ color: "#4a8ab5", fontSize: 12 }}>⏳ Cargando...</p>
              ) : sinCodigoError ? (
                <p style={{ color: "#c0392b", fontSize: 12 }}>⚠ {sinCodigoError}</p>
              ) : sinCodigo.length === 0 ? (
                <p style={{ color: "#8aabb8", fontSize: 12 }}>
                  Sin pendientes — todas las piezas tienen un código de producción asignado.
                </p>
              ) : (
                sinCodigo.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      border: "1.5px solid #f0c2c2",
                      borderRadius: 6,
                      padding: "8px 12px",
                      marginBottom: 8,
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <strong>{f.titulo || `Pieza #${f.id}`}</strong>
                      <div style={{ color: "#8aabb8", fontSize: 11, marginTop: 2 }}>
                        {f.codartint ? `${f.codartint} — ` : ""}
                        {f.articulo_descripcion || "artículo histórico sin datos"}
                        {f.modulo ? ` · módulo ${f.modulo}` : ""}
                      </div>
                    </div>
                    <select
                      onChange={(e) => handleAsignarSinCodigo(f, e.target.value)}
                      disabled={asignandoSinCodigoId === f.id}
                      defaultValue=""
                      style={{
                        border: "1.5px solid #b8d6ef",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 11,
                        fontFamily: "'Space Mono', monospace",
                        color: "#0a3a5c",
                      }}
                    >
                      <option value="" disabled>
                        {asignandoSinCodigoId === f.id ? "Asignando…" : "Asignar código…"}
                      </option>
                      {codigosProduccion.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.codigo}
                          {c.descripcion ? ` — ${c.descripcion}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {panelCodigo && (
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
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  {panelCodigo.codigo}
                  {panelCodigo.descripcion ? (
                    <span style={{ fontWeight: 400, color: "#5a86ab", marginLeft: 8, fontSize: 13 }}>
                      — {panelCodigo.descripcion}
                    </span>
                  ) : null}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#8aabcc" }}>
                  {panelVinculosLoading
                    ? "Cargando artículos vinculados..."
                    : panelVinculos.length === 0
                    ? "Sin artículos vinculados todavía — gestionalo desde 🔗 Relaciones."
                    : `Artículos: ${panelVinculos
                        .map((v) => v.codartint)
                        .join(", ")}`}
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

            {subcodigosDelCodigo.length > 0 && (
              <datalist id={`subcodigos-pieza-${panelCodigo.id}`}>
                {subcodigosDelCodigo.map((s) => (
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
                      subcódigos de este código) — cada una con fórmula asignada
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
                      storageKey={`modulos-domus-piezas-${panelCodigo.id}-${panelSubcodigo || "sin-variante"}`}
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
                      list={`subcodigos-pieza-${panelCodigo.id}`}
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
