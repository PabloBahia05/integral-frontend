import { useState, useEffect, useRef } from "react";
import "./PresupuestoNuevo.css";
import PresupuestoMamparas from "./PresupuestoMamparas";
import TiposVanitory from "./TiposVanitory";
import ArmarVanitory from "./ArmarVanitory";
import BreakdownFormulasVanitory from "./BreakdownFormulasVanitory";
import PresupuestoVanitory from "./PresupuestoVanitory";
import PresupuestoWallPanel from "./PresupuestoWallPanel";
import TiposDespensero from "./TiposDespensero";
import TabComponentes from "./TabComponentes";
import PresupuestoDespensero from "./PresupuestoDespensero";
import TabMampara from "./TabMampara";
import TabPuertas from "./TabPuertas";
import TabEspeciales from "./TabEspeciales";
import TabCocina from "./TabCocina";
import TablaArticulos from "./TablaArticulos";
import PlacardSection from "./PlacardSection";
import Observaciones from "./Observaciones";
import EncabezadoSection from "./EncabezadoSection";
import useCocinaPlacard from "../Hooks/useCocinaPlacard";
import { generarPresupuestoPDF } from "./pdfPresupuesto";

const WALLPANEL_IMG =
  "data:image/jpeg;base64,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";


// Texto estándar de seña/condiciones (recuadro destacado en el PDF, entre el
// detalle/valores y las fotos). Es editable desde el botón "Texto de seña"
// del Encabezado; esto es solo el valor inicial para presupuestos nuevos.
const TEXTO_SENA_DEFAULT = `IMPORTANTE: SE ENTREGA UNA SEÑA DEL 50%, EL 50% RESTANTE AL MOMENTO DE LA ENTREGA
EN CASO DE QUE SE RETRASE LA OBRA POR RAZONES AJENAS A LA EMPRESA,
EL SALDO SE PUEDE CANCELAR DENTRO DE LOS PLAZOS ESTIPULADOS O SE ACTUALIZARA EL SALDO

ES RESPONSABILIDAD DEL CLIENTE INFORMAR DE MANERA ESCRITA LAS MEDIDAS Y MODELOS DE LOS ARTEFACTOS QUE PONDRA EN SU COCINA, ESTO IMPLICA PORTA HORNO, ANAFE, COCINA, SPAR/CAMPANA, PILETA, ESPESOR DEL MARMOL Y CUALQUIER OTRO ARTEFACTO A TENER EN CUANTA.
LA EMPRESA NO SE HACE CARGO DE LA OMISION U OLVIDO DE DICHOS DATOS`;

const API = "https://integral-backend-production.up.railway.app";

// Máximo de imágenes que se pueden asignar a un mismo grupo del presupuesto
// (se persisten en la tabla presupuesto_imagenes, columnas grupoim1..grupoim5).
const MAX_IMAGENES_POR_GRUPO = 5;

async function uploadImageToCloud(file, token) {
  const formData = new FormData();
  formData.append("imagen", file);
  const res = await fetch(`${API}/api/upload-imagen`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Error al subir imagen");
  return (await res.json()).url;
}

const LOCALIDADES = [
  "Bahía Blanca",
  "Punta Alta",
  "Monte Hermoso",
  "Coronel Rosales",
  "Otra",
];

const formatFechaLarga = (fecha) => {
  const d = fecha ? new Date(fecha + "T12:00:00") : new Date();
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// Formatea un DATETIME de MySQL (creado_en/actualizado_en) a "DD/MM/AAAA HH:MM".
const formatFechaHora = (dt) => {
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return String(dt);
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ── Componente reutilizable: formulario de medidas para Especiales ──────────
function EspecialesMedidasForm({
  tipo,
  icono,
  titulo,
  medidas,
  setMedidas,
  materialSearch,
  setMaterialSearch,
  materialFocus,
  setMaterialFocus,
  materialesFiltrados,
  guiasSearch,
  setGuiasSearch,
  guiasFocus,
  setGuiasFocus,
  guiasFiltradas,
  onVolver,
  onContinuar,
}) {
  const inputStyle = {
    width: "100%",
    fontFamily: "'Space Mono',monospace",
    fontSize: 13,
    border: "1px solid #b8cfe0",
    padding: "8px 12px",
    borderRadius: 3,
    boxSizing: "border-box",
    background: "#fff",
    color: "#0a3a5c",
    outline: "none",
  };
  const labelStyle = {
    display: "block",
    fontSize: 10,
    color: "#6699bb",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: 5,
    fontFamily: "'Space Mono',monospace",
  };
  const fieldWrap = {
    flex: "1 1 120px",
    display: "flex",
    flexDirection: "column",
  };

  const canContinue =
    medidas.ancho &&
    medidas.alto &&
    medidas.profundidad &&
    medidas.materialPlaca;

  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "#fff",
    border: "1px solid #b8cfe0",
    borderTop: "none",
    zIndex: 60,
    boxShadow: "0 6px 18px #0002",
    maxHeight: 220,
    overflowY: "auto",
    borderRadius: "0 0 3px 3px",
  };
  const dropItemStyle = {
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "'Space Mono',monospace",
    borderBottom: "1px solid #eef2f6",
    color: "#0a3a5c",
  };

  return (
    <div style={{ fontFamily: "'Space Mono',monospace" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#e8f0f7",
          border: "1px solid #c8dae8",
          borderRadius: 3,
          padding: "12px 18px",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{icono}</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#0a3a5c",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {titulo}
          </span>
          <span style={{ fontSize: 11, color: "#6699bb", marginLeft: 4 }}>
            — Medidas y materiales
          </span>
        </div>
        <button
          onClick={onVolver}
          style={{
            padding: "5px 14px",
            background: "#fff",
            border: "1px solid #b8cfe0",
            borderRadius: 2,
            fontFamily: "'Space Mono',monospace",
            fontSize: 12,
            cursor: "pointer",
            color: "#0a3a5c",
          }}
        >
          ← Volver
        </button>
      </div>

      {/* Formulario */}
      <div
        style={{
          background: "#f5f9fc",
          border: "1px solid #c8dae8",
          borderRadius: 4,
          padding: "22px 24px",
        }}
      >
        {/* Fila: medidas numéricas */}
        <div
          style={{
            marginBottom: 6,
            fontSize: 10,
            color: "#8aabcc",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Medidas (cm)
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          {[
            { key: "ancho", label: "Ancho", placeholder: "ej: 60" },
            { key: "alto", label: "Alto", placeholder: "ej: 90" },
            { key: "profundidad", label: "Profundidad", placeholder: "ej: 45" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} style={fieldWrap}>
              <label style={labelStyle}>{label} *</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={medidas[key]}
                onChange={(e) =>
                  setMedidas((m) => ({ ...m, [key]: e.target.value }))
                }
                placeholder={placeholder}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        {/* Línea divisoria */}
        <div style={{ borderTop: "1px solid #d0e4f0", marginBottom: 20 }} />

        {/* Material Placa */}
        <div
          style={{
            marginBottom: 6,
            fontSize: 10,
            color: "#8aabcc",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Materiales
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 0,
          }}
        >
          {/* Material Placa */}
          <div
            style={{ ...fieldWrap, flex: "2 1 220px", position: "relative" }}
          >
            <label style={labelStyle}>Material Placa *</label>
            <input
              value={materialSearch}
              onChange={(e) => {
                setMaterialSearch(e.target.value);
                setMedidas((m) => ({ ...m, materialPlaca: e.target.value }));
              }}
              onFocus={() => setMaterialFocus(true)}
              onBlur={() => setTimeout(() => setMaterialFocus(false), 160)}
              placeholder="Tipear para filtrar..."
              style={{
                ...inputStyle,
                borderColor: medidas.materialPlaca ? "#7aaac8" : "#b8cfe0",
              }}
            />
            {materialFocus && materialesFiltrados.length > 0 && (
              <div style={dropdownStyle}>
                {materialesFiltrados.map((m, i) => {
                  const nombre =
                    m.nombreart ??
                    m.NOMBREART ??
                    m.articulo ??
                    m.ARTICULO ??
                    "";
                  const codigo = m.articulo ?? m.ARTICULO ?? "";
                  return (
                    <div
                      key={i}
                      style={dropItemStyle}
                      onMouseDown={() => {
                        const val = nombre || codigo;
                        setMaterialSearch(val);
                        setMedidas((md) => ({ ...md, materialPlaca: val }));
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#ddeefa")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "#fff")
                      }
                    >
                      <span style={{ fontWeight: 700 }}>{nombre}</span>
                      {codigo && nombre !== codigo && (
                        <span
                          style={{
                            color: "#8aabcc",
                            marginLeft: 8,
                            fontSize: 10,
                          }}
                        >
                          {codigo}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {materialFocus &&
              materialesFiltrados.length === 0 &&
              materialSearch.length > 0 && (
                <div
                  style={{
                    ...dropdownStyle,
                    padding: "10px 14px",
                    color: "#8aabcc",
                    fontSize: 11,
                  }}
                >
                  Sin resultados — se usará el texto ingresado
                </div>
              )}
          </div>

          {/* Guías */}
          <div
            style={{ ...fieldWrap, flex: "2 1 220px", position: "relative" }}
          >
            <label style={labelStyle}>Guías</label>
            <input
              value={guiasSearch}
              onChange={(e) => {
                setGuiasSearch(e.target.value);
                setMedidas((m) => ({ ...m, guias: e.target.value }));
              }}
              onFocus={() => setGuiasFocus(true)}
              onBlur={() => setTimeout(() => setGuiasFocus(false), 160)}
              placeholder="Tipear para filtrar..."
              style={inputStyle}
            />
            {guiasFocus && guiasFiltradas.length > 0 && (
              <div style={dropdownStyle}>
                {guiasFiltradas.map((g, i) => {
                  const nombre =
                    g.nombreart ??
                    g.NOMBREART ??
                    g.articulo ??
                    g.ARTICULO ??
                    "";
                  const codigo = g.articulo ?? g.ARTICULO ?? "";
                  return (
                    <div
                      key={i}
                      style={dropItemStyle}
                      onMouseDown={() => {
                        const val = nombre || codigo;
                        setGuiasSearch(val);
                        setMedidas((md) => ({ ...md, guias: val }));
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#ddeefa")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "#fff")
                      }
                    >
                      <span style={{ fontWeight: 700 }}>{nombre}</span>
                      {codigo && nombre !== codigo && (
                        <span
                          style={{
                            color: "#8aabcc",
                            marginLeft: 8,
                            fontSize: 10,
                          }}
                        >
                          {codigo}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {guiasFocus &&
              guiasFiltradas.length === 0 &&
              guiasSearch.length > 0 && (
                <div
                  style={{
                    ...dropdownStyle,
                    padding: "10px 14px",
                    color: "#8aabcc",
                    fontSize: 11,
                  }}
                >
                  Sin resultados — se usará el texto ingresado
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Resumen + botón continuar */}
      {(medidas.ancho ||
        medidas.alto ||
        medidas.profundidad ||
        medidas.materialPlaca ||
        medidas.guias) && (
        <div
          style={{
            marginTop: 16,
            background: "#fff",
            border: "1px solid #c8dae8",
            borderRadius: 3,
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "#6699bb",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Resumen:
          </span>
          {medidas.ancho && (
            <span style={{ fontSize: 12, color: "#0a3a5c" }}>
              📐 <b>{medidas.ancho}</b> × <b>{medidas.alto || "—"}</b> ×{" "}
              <b>{medidas.profundidad || "—"}</b> cm
            </span>
          )}
          {medidas.materialPlaca && (
            <span style={{ fontSize: 12, color: "#0a3a5c" }}>
              🪵 <b>{medidas.materialPlaca}</b>
            </span>
          )}
          {medidas.guias && (
            <span style={{ fontSize: 12, color: "#0a3a5c" }}>
              🔩 <b>{medidas.guias}</b>
            </span>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
        }}
      >
        <button
          onClick={onVolver}
          style={{
            padding: "8px 20px",
            background: "#fff",
            border: "1px solid #b8cfe0",
            borderRadius: 2,
            fontFamily: "'Space Mono',monospace",
            fontSize: 12,
            cursor: "pointer",
            color: "#0a3a5c",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={onContinuar}
          disabled={!canContinue}
          style={{
            padding: "8px 28px",
            background: canContinue ? "#0a3a5c" : "#c8dae8",
            color: "#fff",
            border: "none",
            borderRadius: 2,
            fontFamily: "'Space Mono',monospace",
            fontSize: 13,
            fontWeight: 700,
            cursor: canContinue ? "pointer" : "default",
            letterSpacing: "0.04em",
          }}
        >
          {tipo === "vanitory" ? "Continuar →" : "Confirmar medidas ✓"}
        </button>
      </div>
      {!canContinue && (
        <div
          style={{
            marginTop: 8,
            textAlign: "right",
            fontSize: 10,
            color: "#c0392b",
            fontFamily: "'Space Mono',monospace",
          }}
        >
          * Ancho, Alto, Profundidad y Material Placa son obligatorios
        </div>
      )}
    </div>
  );
}

export default function PresupuestoNuevo({
  onVolver,
  onGuardado,
  onVerTabla,
  presupuestoInicial = null,
  tiposDespensero = [],
  tiposDespenseroRUD = {},
  token,
}) {
  const listaPendienteRef = useRef(null);

  // ── Helper autenticado: agrega el JWT a todas las requests ──
  const authFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });

  // ── Nombre del usuario logueado, extraído del payload del JWT ──
  // El token no se valida acá (para eso está el backend), solo se lee el
  // payload para saber quién es. El backend firma el token con nombre y
  // apellido por separado (ver POST /login en server.js), así que se arman
  // combinados acá.
  const payloadTokenActual = (() => {
    if (!token) return null;
    try {
      const payloadB64 = token.split(".")[1];
      let base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4 !== 0) base64 += "="; // base64url no lleva padding
      const payloadJson = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join(""),
      );
      return JSON.parse(payloadJson);
    } catch {
      return null;
    }
  })();

  const nombreUsuarioActual = payloadTokenActual
    ? `${payloadTokenActual.nombre ?? ""} ${payloadTokenActual.apellido ?? ""}`.trim()
    : "";

  const esLucianaRoque =
    nombreUsuarioActual.trim().toLowerCase().includes("luciana") &&
    nombreUsuarioActual.trim().toLowerCase().includes("roque");

  const [numero, setNumero] = useState("Nuevo");
  const [numeroPres, setNumeroPres] = useState(null); // número real asignado tras primer guardado
  // Quién creó / actualizó por última vez esta revisión, y cuándo (para
  // mostrar en pantalla). null mientras es un presupuesto nuevo sin guardar.
  const [metaPresupuesto, setMetaPresupuesto] = useState(null);
  const [presmv, setPresmv] = useState(null); // id de presupuesto_mampara vinculado
  const [mamparaAEditar, setMamparaAEditar] = useState(null); // datos para editar mampara existente
  const [prespv, setPrespv] = useState(null); // id de presupuesto_puerta vinculado
  const [puertaAEditar, setPuertaAEditar] = useState(null); // datos para editar puerta existente
  const [revision, setRevision] = useState(1);
  const [cliente, setCliente] = useState("");
  const [codcliente, setCodcliente] = useState(null);
  const cargandoPresupuestoRef = useRef(false); // true mientras cargarPresupuesto está en curso
  const [clientesSugeridos, setClientesSugeridos] = useState([]);
  const [lineasBD, setLineasBD] = useState([]); // valores distintos de columna 'linea' en articulos
  const [telefonoSearch, setTelefonoSearch] = useState("");
  const [telefonosSugeridos, setTelefonosSugeridos] = useState([]);
  const [telefono1, setTelefono1] = useState("");
  const [telefono2, setTelefono2] = useState("");
  const [wapp, setWapp] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [domicilioFiscal, setDomicilioFiscal] = useState("");
  // Resolución automática de cliente: busca por nombre, luego por teléfono,
  // y si no existe lo da de alta solo, sin que el usuario elija de una lista.
  const [resolviendoCliente, setResolviendoCliente] = useState(false);
  const [clienteAutoResuelto, setClienteAutoResuelto] = useState(null); // "existente" | "nuevo" | null
  const [localidad, setLocalidad] = useState("Bahía Blanca");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [leyenda, setLeyenda] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [error, setError] = useState("");

  // Lista de precios
  const [listasDB, setListasDB] = useState([]); // listas traídas de BD
  const [listaPrecio, setListaPrecio] = useState("");

  // Porcentaje de la lista activa (0 si no hay porcentaje)
  const listaActiva = listasDB.find((l) => l.lista === listaPrecio);
  const listaPorcentaje =
    parseFloat(listaActiva?.porcentaje ?? listaActiva?.PORCENTAJE ?? 0) || 0;

  // Aplica el porcentaje de la lista al precio base
  const aplicarPorcentaje = (precioBase) => {
    if (!precioBase && precioBase !== 0) return "";
    const base = parseFloat(precioBase) || 0;
    if (listaPorcentaje === 0) return String(base);
    return String(Math.round(base * (1 + listaPorcentaje / 100) * 100) / 100);
  };
  const [mostrarCosto, setMostrarCosto] = useState(false);
  const [incluirPrecio, setIncluirPrecio] = useState(false);
  const [incluirSubtotalItem, setIncluirSubtotalItem] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [incluirTotal, setIncluirTotal] = useState(true);
  const [color, setColor] = useState("");
  const [incluirTextoColoc, setIncluirTextoColoc] = useState(false);
  const [agregarIVA, setAgregarIVA] = useState(true);
  // Texto de seña/condiciones que va destacado (fondo amarillo) en el PDF,
  // entre el último bloque de detalle/valores y las fotos. Editable desde
  // el botón "Texto de seña" del Encabezado; arranca con el texto estándar
  // de Daniel Roque S.R.L. y queda incluido por defecto en presupuestos nuevos.
  const [incluirTextoSena, setIncluirTextoSena] = useState(true);
  const [textoSena, setTextoSena] = useState(TEXTO_SENA_DEFAULT);
  // Controla el modal donde se ve/edita textoSena (se abre con el botón
  // del Encabezado, mismo patrón que el modal de descripción del PDF).
  const [mostrarModalTextoSena, setMostrarModalTextoSena] = useState(false);
  // Si mostrar o no el campo "descripcion" (texto libre del ítem, separado
  // de nombreart) en el PDF. Se pregunta con un confirm() justo antes de
  // generar, no es un checkbox fijo en pantalla.
  const [incluirDescripcion, setIncluirDescripcion] = useState(false);
  // Controla el modal "¿Incluir descripción en el PDF? Sí/No" que reemplaza
  // al window.confirm() anterior. Para Luciana Roque nunca se muestra: se
  // asume que la respuesta es "No" directamente (ver iniciarGeneracionPDF).
  const [mostrarModalDescripcionPDF, setMostrarModalDescripcionPDF] =
    useState(false);
  // Imágenes y/o PDFs adjuntos. Cada uno puede asignarse a un grupo del
  // presupuesto (se pega bajo el detalle de ese grupo, hasta 5 imágenes por
  // grupo) o quedar "sin grupo" (se agrega al final del presupuesto).
  // Las imágenes (no los PDF) se persisten en la tabla presupuesto_imagenes
  // ligada a numeropres + grupo, así sobreviven a recargar/reabrir.
  // Imagen: { id, tipo: "imagen", nombre, url, grupo: string | null }
  // PDF:    { id, tipo: "pdf", nombre, dataUrl, grupo: null } (no se persiste)
  const [imagenesFinal, setImagenesFinal] = useState([]);
  const [mostrarGestorImagenes, setMostrarGestorImagenes] = useState(false);
  const [subiendoImagenes, setSubiendoImagenes] = useState(false);
  const imagenInputRef = useRef(null);
  // Archivos ya elegidos por el usuario pero todavía no subidos: primero se
  // pregunta a qué grupo pertenecen (obligatorio elegir "Sin grupo" a
  // propósito, o un grupo existente/nuevo) y recién ahí se suben.
  // { validos: [{file, esPDF}], grupoSeleccionado: string, sinGrupo: boolean }
  const [pendienteGrupo, setPendienteGrupo] = useState(null);

  const handleImagenSeleccionada = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (!files.length) return;

    const validos = [];
    for (const file of files) {
      const esPDF =
        file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      const esImagen =
        file.type.startsWith("image/") || /\.(jpe?g|png)$/i.test(file.name);
      if (!esPDF && !esImagen) continue;
      validos.push({ file, esPDF });
    }
    if (!validos.length) {
      alert("Solo se permiten archivos PDF, JPG o PNG.");
      return;
    }

    // No se sube nada todavía: primero hay que elegir el grupo.
    setPendienteGrupo({ validos, grupoSeleccionado: "", sinGrupo: false });
  };

  // Confirma el grupo elegido para el lote pendiente y recién ahí sube los
  // archivos (las imágenes a la nube, los PDF quedan en memoria como antes).
  const confirmarGrupoYSubir = async () => {
    if (!pendienteGrupo) return;
    const { validos, grupoSeleccionado, sinGrupo } = pendienteGrupo;
    const grupoFinal = sinGrupo ? null : grupoSeleccionado.trim() || null;

    if (!sinGrupo && !grupoFinal) {
      alert(
        'Elegí un grupo para estas fotos, o tocá "Sin grupo" si van al final del presupuesto.',
      );
      return;
    }

    if (grupoFinal) {
      const cantImagenesLote = validos.filter((v) => !v.esPDF).length;
      const yaEnEseGrupo = imagenesFinal.filter(
        (im) => im.tipo === "imagen" && im.grupo === grupoFinal,
      ).length;
      if (yaEnEseGrupo + cantImagenesLote > MAX_IMAGENES_POR_GRUPO) {
        alert(
          `El grupo "${grupoFinal}" ya tiene ${yaEnEseGrupo} imagen(es). ` +
            `No se pueden agregar ${cantImagenesLote} más (máximo ${MAX_IMAGENES_POR_GRUPO} por grupo).`,
        );
        return;
      }
    }

    setPendienteGrupo(null);
    setSubiendoImagenes(true);
    try {
      const nuevas = await Promise.all(
        validos.map(async ({ file, esPDF }) => {
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          if (esPDF) {
            const dataUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.readAsDataURL(file);
            });
            // Los PDF siempre van al final, no llevan grupo.
            return { id, tipo: "pdf", nombre: file.name, dataUrl, grupo: null };
          }
          // Las imágenes se suben directo a la nube: se persisten como URL
          // (no como base64), que es lo que viaja a presupuesto_imagenes.
          const url = await uploadImageToCloud(file, token);
          return { id, tipo: "imagen", nombre: file.name, url, grupo: grupoFinal };
        }),
      );
      setImagenesFinal((prev) => [...prev, ...nuevas]);
      setMostrarGestorImagenes(true);
    } catch (err) {
      alert("Error al subir una o más imágenes: " + err.message);
    } finally {
      setSubiendoImagenes(false);
    }
  };

  const cancelarPendienteGrupo = () => setPendienteGrupo(null);

  const actualizarGrupoImagen = (id, grupo) => {
    const grupoFinal = grupo || null;
    setImagenesFinal((prev) => {
      if (grupoFinal) {
        const yaEnEseGrupo = prev.filter(
          (im) =>
            im.id !== id && im.tipo === "imagen" && im.grupo === grupoFinal,
        ).length;
        if (yaEnEseGrupo >= MAX_IMAGENES_POR_GRUPO) {
          alert(
            `El grupo "${grupoFinal}" ya tiene el máximo de ${MAX_IMAGENES_POR_GRUPO} imágenes.`,
          );
          return prev;
        }
      }
      return prev.map((im) =>
        im.id === id ? { ...im, grupo: grupoFinal } : im,
      );
    });
  };

  const eliminarImagen = (id) => {
    setImagenesFinal((prev) => prev.filter((im) => im.id !== id));
  };

  // ── Persistencia de imágenes (tabla presupuesto_imagenes) ──────────────
  const guardarImagenesPresupuesto = async (numPres, rev) => {
    const imagenes = imagenesFinal.filter((im) => im.tipo === "imagen");
    const porGrupo = new Map();
    imagenes.forEach((im) => {
      const key = im.grupo || null;
      if (!porGrupo.has(key)) porGrupo.set(key, []);
      const arr = porGrupo.get(key);
      if (arr.length < MAX_IMAGENES_POR_GRUPO) arr.push(im.url);
    });
    const grupos = Array.from(porGrupo.entries()).map(([grupo, urls]) => ({
      grupo,
      imagenes: urls,
    }));
    try {
      await authFetch(`${API}/presupuesto-imagenes/${numPres}/${rev ?? 0}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grupos }),
      });
    } catch (err) {
      console.error("Error guardando imágenes del presupuesto:", err);
    }
  };

  // Persiste leyenda/observaciones/texto de seña de este presupuesto
  // (tabla presupuesto_info, key = numeropres — se pisa en cada guardado,
  // no depende de la revisión).
  const guardarInfoPresupuesto = async (numPres) => {
    try {
      await authFetch(`${API}/presupuesto-info/${numPres}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leyenda,
          observaciones,
          texto_sena: textoSena,
          incluir_texto_sena: incluirTextoSena,
        }),
      });
    } catch (err) {
      console.error("Error guardando info del presupuesto:", err);
    }
  };

  const cargarMetaPresupuesto = async (numPres, rev) => {
    try {
      const r = await authFetch(
        `${API}/tabla-presupuestos/meta/${numPres}/${rev}`,
      );
      const data = await r.json();
      setMetaPresupuesto(data ?? null);
    } catch (err) {
      console.error("Error cargando metadata del presupuesto:", err);
      setMetaPresupuesto(null);
    }
  };

  // Info del presupuesto (tabla nueva presupuesto_info, key = numeropres):
  // leyenda, observaciones y el texto de seña/condiciones tal como quedaron
  // guardados la última vez para ESTE presupuesto puntual.
  const cargarInfoPresupuesto = async (numPres) => {
    try {
      const r = await authFetch(`${API}/presupuesto-info/${numPres}`);
      const data = await r.json();
      if (data) {
        setLeyenda(data.leyenda ?? "");
        setObservaciones(data.observaciones ?? "");
        if (data.texto_sena) setTextoSena(data.texto_sena);
        setIncluirTextoSena(
          data.incluir_texto_sena != null ? !!data.incluir_texto_sena : true,
        );
      }
    } catch (err) {
      console.error("Error cargando info del presupuesto:", err);
    }
  };

  const cargarImagenesPresupuesto = async (numPres, rev) => {
    try {
      const r = await authFetch(
        `${API}/presupuesto-imagenes/${numPres}/${rev ?? 0}`,
      );
      const filas = await r.json();
      if (!Array.isArray(filas)) {
        setImagenesFinal([]);
        return;
      }
      const cargadas = [];
      filas.forEach((fila) => {
        const grupo = fila.grupo ?? fila.GRUPO ?? null;
        const urls = (fila.imagenes ?? []).filter(Boolean);
        urls.forEach((url, i) => {
          cargadas.push({
            id: `${fila.id ?? numPres}-${grupo ?? "sin-grupo"}-${i}`,
            tipo: "imagen",
            nombre: `imagen-${i + 1}.jpg`,
            url,
            grupo,
          });
        });
      });
      setImagenesFinal(cargadas);
    } catch (err) {
      console.error("Error cargando imágenes del presupuesto:", err);
      setImagenesFinal([]);
    }
  };

  // Líneas (3 slots)
  const [lineas, setLineas] = useState([
    { linea: "[Sin líneas]", col2: "", col3: "" },
    { linea: "[Sin líneas]", col2: "", col3: "" },
    { linea: "[Sin líneas]", col2: "", col3: "" },
  ]);

  // Pestañas
  const [tab, setTab] = useState("encabezado"); // "encabezado" | "cocina" | "placard" | "mampara" | "puertas" | "componentes" | "especiales" | "presupuesto"

  // Sub-navegación Especiales
  const [especialesVista, setEspecialesVista] = useState("selector"); // "selector" | "vanitory" | "escritorio" | "despensero"
  const [vanitoryVista, setVanitoryVista] = useState("tipos"); // "tipos" | "medidas" | "armar" | "breakdown"
  const [despenseroModelo, setDespenseroModelo] = useState(null);
  const [despenseroVista, setDespenseroVista] = useState("tipos"); // "tipos" | "presupuesto"
  const [vanitoryModelo, setVanitoryModelo] = useState(null);

  // ── Formulario de medidas para Especiales ────────────────
  const MEDIDAS_INIT = {
    ancho: "",
    alto: "",
    profundidad: "",
    materialPlaca: "",
    guias: "",
  };
  const [especialesMedidas, setEspecialesMedidas] = useState(MEDIDAS_INIT);
  const [especialesTipo, setEspecialesTipo] = useState(null); // "vanitory"|"escritorio"|"despensero"
  // Búsqueda material placa
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialFocus, setMaterialFocus] = useState(false);
  const [materialesDB, setMaterialesDB] = useState([]);
  // Búsqueda guías
  const [guiasSearch, setGuiasSearch] = useState("");
  const [guiasFocus, setGuiasFocus] = useState(false);
  const [guiasDB, setGuiasDB] = useState([]);

  // Cargar materiales/guias desde BD al montar
  useEffect(() => {
    authFetch(`${API}/articulos/por-familia?familia=placas`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMaterialesDB(data);
      })
      .catch(() => {});
    authFetch(`${API}/articulos/por-familia?familia=guias`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setGuiasDB(data);
      })
      .catch(() => {});
  }, []);

  const materialesFiltrados = materialesDB
    .filter(
      (m) =>
        (m.articulo ?? m.ARTICULO ?? "")
          .toLowerCase()
          .includes(materialSearch.toLowerCase()) ||
        (m.nombreart ?? m.NOMBREART ?? "")
          .toLowerCase()
          .includes(materialSearch.toLowerCase()),
    )
    .slice(0, 12);

  const guiasFiltradas = guiasDB
    .filter(
      (g) =>
        (g.articulo ?? g.ARTICULO ?? "")
          .toLowerCase()
          .includes(guiasSearch.toLowerCase()) ||
        (g.nombreart ?? g.NOMBREART ?? "")
          .toLowerCase()
          .includes(guiasSearch.toLowerCase()),
    )
    .slice(0, 12);

  const irAMedidas = (tipo, modelo = null) => {
    setEspecialesTipo(tipo);
    setEspecialesMedidas(MEDIDAS_INIT);
    setMaterialSearch("");
    setGuiasSearch("");
    if (tipo === "vanitory") {
      setVanitoryModelo(modelo);
      setVanitoryVista("medidas");
    } else {
      setEspecialesVista(tipo); // va a escritorio o despensero directamente
    }
  };

  // ── Tabla resumen presupuesto (solapa Presupuesto) ───────
  // Cada ítem: { id, seccion, descripcion, cantidad, precio, subtotal }
  const [presupuestoItems, setPresupuestoItems] = useState([]);

  // ── Grupos personalizados ─────────────────────────────────
  // Permite subdividir manualmente los ítems en grupos propios dentro del
  // PDF (ej: separar "Cocina / Bajomesadas" en "Bajomesadas 76 Alto" y
  // "Bajomesadas Isla 76 Alto"). Se guarda por id de ítem; si un ítem no
  // tiene grupo asignado, se sigue usando la sección automática de siempre.
  // { [itemId]: "Nombre de grupo elegido por el usuario" }
  const [gruposCustom, setGruposCustom] = useState({});

  const grupoDe = (it) => {
    const gManual = gruposCustom[it.id];
    if (gManual && gManual.trim()) return gManual.trim();
    if (it.grupo && it.grupo.trim()) return it.grupo.trim();
    return it.seccion;
  };

  const nombresGruposUsados = [
    ...new Set(
      presupuestoItems.map((it) => grupoDe(it)).filter((g) => g && g.trim()),
    ),
  ];

  // ── Popover de edición inline de ítem en Presupuesto ───
  const [presItemPopover, setPresItemPopover] = useState(null); // { id, lineaIdx (null = sin líneas), precioActual, rect }
  const [presItemModo, setPresItemModo] = useState("valor"); // "valor" | "porcentaje"
  const [presItemInput, setPresItemInput] = useState("");

  const abrirPresItemPopover = (id, lineaIdx, precioActual, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPresItemPopover({ id, lineaIdx, precioActual, rect });
    setPresItemModo("valor");
    setPresItemInput(String(precioActual ?? ""));
  };

  const cerrarPresItemPopover = () => {
    setPresItemPopover(null);
    setPresItemInput("");
  };

  const confirmarPresItemPopover = () => {
    if (!presItemPopover) return;
    const val = parseFloat(presItemInput);
    if (isNaN(val)) {
      cerrarPresItemPopover();
      return;
    }
    const { id, lineaIdx } = presItemPopover;

    // baseActual = precio mostrado hoy (puede ya tener un % previo aplicado).
    // baseOriginal = precio base sin ningún % de ítem aplicado, si existe.
    // En modo "porcentaje" SIEMPRE calculamos sobre baseOriginal para que
    // cambiar de 20% a 10% (o a 30%) reemplace el ajuste anterior en vez de
    // acumularse sobre él. En modo "valor" seguimos usando baseActual (el
    // +/- monto es relativo a lo que se ve hoy en pantalla).
    const calcNuevo = (baseActual, baseOriginal) => {
      const b = parseFloat(baseActual) || 0;
      if (presItemModo === "valor") return val < 0 ? Math.max(0, b + val) : val;
      const bOrig = parseFloat(baseOriginal ?? baseActual) || 0;
      return Math.round(bOrig * (1 + val / 100) * 100) / 100;
    };

    // Si el ítem viene de Cocina o Placard, escribimos el cambio en el
    // estado fuente (cocinaItems/placardItems) para que el % quede
    // asociado al ítem real: sobrevive a "Actualizar"/cambio de lista y
    // se puede mostrar combinado con el % de la lista (badge "21+10").
    const match = id.match(/^(cocina|placard)-(.+)-(\d+)$/);
    if (match) {
      const [, seccionTipo, familia, idxStr] = match;
      const idx = parseInt(idxStr, 10);
      const PCT_POR_IDX = ["porcentaje1", "porcentaje2", "porcentaje3"];

      const actualizar = (prev) => {
        const filas = prev[familia] ?? [];
        const fila = filas[idx];
        if (!fila) return prev;

        let nuevaFila;
        if (lineaIdx == null) {
          // Fijamos precioBase la primera vez que se aplica un % a este
          // ítem: así un cambio posterior de 20% a 10%/30% se recalcula
          // siempre desde el precio original, no desde el último ajustado.
          const baseOriginal = fila.precioBase ?? fila.precio;
          const nuevo = calcNuevo(fila.precio, baseOriginal);
          nuevaFila = {
            ...fila,
            precio: String(nuevo),
            precioBase:
              presItemModo === "porcentaje" ? baseOriginal : fila.precioBase,
            porcentaje1:
              presItemModo === "porcentaje" ? val : fila.porcentaje1,
          };
        } else {
          const precios = (fila.precios ?? []).map((p, li) => {
            if (li !== lineaIdx) return p;
            const baseOriginalLinea = p.precioBase ?? p.precio;
            return {
              ...p,
              precio: String(calcNuevo(p.precio, baseOriginalLinea)),
              precioBase:
                presItemModo === "porcentaje" ? baseOriginalLinea : p.precioBase,
            };
          });
          const nuevoPrecio = precios[0]?.precio ?? fila.precio;
          const slot = PCT_POR_IDX[lineaIdx];
          const extra = slot
            ? {
                [slot]: presItemModo === "porcentaje" ? val : fila[slot],
              }
            : {};
          nuevaFila = {
            ...fila,
            precios,
            precio: String(nuevoPrecio),
            ...extra,
          };
        }
        return {
          ...prev,
          [familia]: filas.map((f, i) => (i === idx ? nuevaFila : f)),
        };
      };

      if (seccionTipo === "cocina") {
        setCocinaItems(actualizar);
      } else {
        setPlacardItems(actualizar);
      }
      cerrarPresItemPopover();
      return;
    }

    // Ítems "otros" (mampara/vanitory/especiales): no tienen estado fuente
    // aparte, se editan directo en presupuestoItems.
    setPresupuestoItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        if (lineaIdx == null) {
          const baseOriginal = it.precioBase ?? it.precio;
          const nuevo = calcNuevo(it.precio, baseOriginal);
          return {
            ...it,
            precio: nuevo,
            precioBase:
              presItemModo === "porcentaje" ? baseOriginal : it.precioBase,
            subtotal: nuevo * (parseFloat(it.cantidad) || 1),
          };
        }
        const precios = (it.precios ?? []).map((p, li) => {
          if (li !== lineaIdx) return p;
          const baseOriginalLinea = p.precioBase ?? p.precio;
          return {
            ...p,
            precio: String(calcNuevo(p.precio, baseOriginalLinea)),
            precioBase:
              presItemModo === "porcentaje" ? baseOriginalLinea : p.precioBase,
          };
        });
        const nuevoPrecio = parseFloat(precios[0]?.precio ?? it.precio) || 0;
        return {
          ...it,
          precios,
          precio: nuevoPrecio,
          subtotal: nuevoPrecio * (parseFloat(it.cantidad) || 1),
        };
      }),
    );
    cerrarPresItemPopover();
  };

  // ── Ajuste de precios ────────────────────────────────────
  const [ajusteModo, setAjusteModo] = useState("porcentaje"); // "porcentaje" | "monto"
  const [ajusteValor, setAjusteValor] = useState("");
  const [ajusteScope, setAjusteScope] = useState("todos"); // "todos" | id de item
  const [preciosOriginales, setPreciosOriginales] = useState({}); // { [id]: { precio, precios } }
  const [ajusteAplicado, setAjusteAplicado] = useState(false);

  // NOTA: presupuestoItems para las filas de cocina/placard se REGENERA
  // automáticamente a partir de cocinaItems/placardItems (ver el useEffect
  // "Sincronizar cocina y placard con la tabla de presupuesto" más abajo).
  // Por eso el ajuste NO puede aplicarse solo sobre presupuestoItems: en
  // cuanto cocinaItems/placardItems cambian por cualquier otro motivo, ese
  // efecto pisa el precio ajustado con el precio "limpio" de origen. Hay
  // que tocar la fuente de verdad (cocinaItems/placardItems) para los ids
  // que empiezan con "cocina-"/"placard-", y presupuestoItems directo para
  // el resto (mampara/especiales, que no tienen fuente propia).
  const calcularAjuste = (base, val) => {
    const b = parseFloat(base) || 0;
    const n =
      ajusteModo === "porcentaje"
        ? Math.round(b * (1 + val / 100) * 100) / 100
        : Math.round((b + val) * 100) / 100;
    return n < 0 ? 0 : n;
  };

  // Líneas activas elegidas en el encabezado (sin "[Sin líneas]")
  const lineasActivas = lineas.filter(
    (l) => l.linea && l.linea !== "[Sin líneas]",
  );

  // ── Cocina + Placard (estado y lógica extraídos a un hook propio) ──
  const {
    cocinaItemsRef,
    placardItemsRef,
    cocinaFamilia,
    setCocinaFamilia,
    cocinaItems,
    setCocinaItems,
    placardFamilia,
    setPlacardFamilia,
    placardItems,
    setPlacardItems,
    productosDB,
    setProductosDB,
    placardEditIdx,
    setPlacardEditIdx,
    placardFila,
    setPlacardFila,
    placardSearch,
    setPlacardSearch,
    placardSearchFocus,
    setPlacardSearchFocus,
    articulosFamilia,
    setArticulosFamilia,
    precioPopover,
    popoverModo,
    setPopoverModo,
    popoverInput,
    setPopoverInput,
    abrirPrecioPopover,
    cerrarPopover,
    confirmarPopover,
    placard_total,
    normalizar,
    getProductoFamilia,
    nombreBase,
    getPrecioParaLinea,
    resolverPrecioBasePlacard,
    productosFiltrados,
    recalcFila,
    handleActualizar,
    placardAgregarFila,
    placardEliminarFila,
    placardGuardarEdit,
    placardIniciarEdit,
    aplicarFrenoATodosCocina,
    aplicarFrenoATodosPlacard,
    setFrenoItemCocina,
    setFrenoItemPlacard,
    accesoriosDisponibles,
    accesorioMenu,
    abrirAccesorioMenu,
    cerrarAccesorioMenu,
    toggleAccesorioItem,
    toggleAccesorioEnArray,
    confirmarAccesoriosItem,
  } = useCocinaPlacard({
    authFetch,
    tab,
    lineasActivas,
    listaPrecio,
    listasDB,
    aplicarPorcentaje,
    ajusteAplicado,
    ajusteScope,
    ajusteValor,
    ajusteModo,
    calcularAjuste,
    cargandoPresupuestoRef,
    setPresupuestoItems,
  });

  const aplicarAjuste = () => {
    const val = parseFloat(ajusteValor);
    if (!val || isNaN(val)) return;

    // Guardar originales antes del primer ajuste (precio + precios[] por línea)
    if (!ajusteAplicado) {
      const orig = {};
      presupuestoItems.forEach((it) => {
        orig[it.id] = {
          precio: it.precio,
          precios: (it.precios ?? []).map((p) => ({ ...p })),
        };
      });
      setPreciosOriginales(orig);
    }

    const ajustarFila = (id, f, origenPreciosOriginales) => {
      if (ajusteScope !== "todos" && id !== ajusteScope) return f;
      const origItem = ajusteAplicado
        ? origenPreciosOriginales[id]
        : { precio: f.precio, precios: f.precios };
      const precioBase = parseFloat(origItem?.precio ?? f.precio) || 0;
      const nuevoPrecio = calcularAjuste(precioBase, val);
      const nuevosPrecios = (origItem?.precios ?? f.precios ?? []).map((p) => ({
        ...p,
        precio: String(calcularAjuste(p.precio, val)),
      }));
      return {
        ...f,
        precio: nuevoPrecio,
        precios: nuevosPrecios.length ? nuevosPrecios : f.precios,
      };
    };

    // preciosOriginales puede no estar actualizado en este mismo tick si es
    // el primer ajuste (setPreciosOriginales es async): armamos el mapa a
    // usar de forma síncrona para no depender del timing de React.
    const origenActual = ajusteAplicado
      ? preciosOriginales
      : Object.fromEntries(
          presupuestoItems.map((it) => [
            it.id,
            { precio: it.precio, precios: (it.precios ?? []).map((p) => ({ ...p })) },
          ]),
        );

    // Cocina/Placard con scope "todos": el efecto de recálculo (deps
    // [listaPrecio, ajusteAplicado, ajusteValor, ajusteModo, ajusteScope])
    // ya se encarga de recalcular esas filas de forma reproducible en
    // cuanto seteamos ajusteAplicado(true) más abajo. Si mutáramos acá
    // también, el ajuste se aplicaría dos veces.
    if (ajusteScope !== "todos") {
      setCocinaItems((prev) => {
        const next = {};
        for (const [familia, filas] of Object.entries(prev)) {
          next[familia] = filas.map((f, i) =>
            ajustarFila(`cocina-${familia}-${i}`, f, origenActual),
          );
        }
        return next;
      });
      setPlacardItems((prev) => {
        const next = {};
        for (const [familia, filas] of Object.entries(prev)) {
          next[familia] = filas.map((f, i) =>
            ajustarFila(`placard-${familia}-${i}`, f, origenActual),
          );
        }
        return next;
      });
    }
    setPresupuestoItems((prev) =>
      prev.map((it) => {
        if (it.id.startsWith("cocina-") || it.id.startsWith("placard-")) {
          // Estos se actualizan solos vía el efecto de sincronización
          // cuando cocinaItems/placardItems cambien arriba.
          return it;
        }
        const ajustado = ajustarFila(it.id, it, origenActual);
        if (ajustado === it) return it;
        const nuevaCantidad = parseFloat(it.cantidad) || 1;
        return { ...ajustado, subtotal: ajustado.precio * nuevaCantidad };
      }),
    );

    setAjusteAplicado(true);
  };

  const revertirAjuste = () => {
    if (!ajusteAplicado) return;

    const revertirFila = (id, f) => {
      const orig = preciosOriginales[id];
      if (orig == null) return f;
      const p = parseFloat(orig.precio) || 0;
      return {
        ...f,
        precio: p,
        precios: orig.precios?.length ? orig.precios : f.precios,
      };
    };

    // Cocina/Placard con scope "todos": alcanza con apagar ajusteAplicado
    // más abajo — el efecto de recálculo las vuelve a calcular sin el
    // ajuste general (recalcFila ya no lo aplica). Esto además soluciona
    // la limitación anterior de "no se puede revertir después de reabrir":
    // ahora no depende de preciosOriginales en memoria para estas filas.
    if (ajusteScope !== "todos") {
      setCocinaItems((prev) => {
        const next = {};
        for (const [familia, filas] of Object.entries(prev)) {
          next[familia] = filas.map((f, i) =>
            revertirFila(`cocina-${familia}-${i}`, f),
          );
        }
        return next;
      });
      setPlacardItems((prev) => {
        const next = {};
        for (const [familia, filas] of Object.entries(prev)) {
          next[familia] = filas.map((f, i) =>
            revertirFila(`placard-${familia}-${i}`, f),
          );
        }
        return next;
      });
    }
    setPresupuestoItems((prev) =>
      prev.map((it) => {
        if (it.id.startsWith("cocina-") || it.id.startsWith("placard-")) return it;
        const orig = preciosOriginales[it.id];
        if (orig == null) return it;
        const p = parseFloat(orig.precio) || 0;
        return {
          ...it,
          precio: p,
          precios: orig.precios?.length ? orig.precios : it.precios,
          subtotal: p * (parseFloat(it.cantidad) || 1),
        };
      }),
    );

    setAjusteAplicado(false);
    setAjusteValor("");
    setPreciosOriginales({});
  };

  const agregarAPresupuesto = (item) => {
    setPresupuestoItems((prev) => {
      // Evitar duplicados por id único
      const existe = prev.find((p) => p.id === item.id);
      if (existe) return prev.map((p) => (p.id === item.id ? item : p));
      return [...prev, item];
    });
  };

  const quitarDePresupuesto = (id) =>
    setPresupuestoItems((prev) => prev.filter((p) => p.id !== id));

  useEffect(() => {
    // Próximo número (solo aplica a un presupuesto nuevo; si viene
    // presupuestoInicial, cargarPresupuesto ya setea el número real y
    // este fetch no debe pisarlo)
    if (!presupuestoInicial) {
      authFetch(`${API}/tabla-presupuestos/proximo-numero`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.proximo != null) setNumero(String(d.proximo).padStart(4, "0"));
        })
        .catch(() => {});
      // Precargar el texto de seña/condiciones tal como quedó la última vez
      // que se editó en CUALQUIER presupuesto — así un cambio hecho hoy
      // queda como punto de partida de todos los presupuestos siguientes,
      // en vez de volver siempre al TEXTO_SENA_DEFAULT fijo del código.
      authFetch(`${API}/presupuesto-info/ultimo-texto-sena`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.texto_sena) setTextoSena(d.texto_sena);
          if (d?.incluir_texto_sena != null)
            setIncluirTextoSena(!!d.incluir_texto_sena);
        })
        .catch(() => {});
    }
    // Líneas disponibles desde BD (columna linea de articulos)
    authFetch(`${API}/articulos/lineas`)
      .then((r) => r.json())
      .then((data) => setLineasBD(Array.isArray(data) ? data : []))
      .catch(() => {});
    // Listas de precios desde BD
    authFetch(`${API}/lista`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setListasDB(data);
          if (listaPendienteRef.current) {
            setListaPrecio(listaPendienteRef.current);
            listaPendienteRef.current = null;
          } else if (!presupuestoInicial) {
            setListaPrecio(data[0].lista);
          }
        }
      })
      .catch(() => {});
  }, []);

  // ── Cargar presupuesto existente desde BD ────────────────
  const cargarPresupuesto = async (pres) => {
    if (!pres) return;
    const num = pres.numeropres ?? pres.id;
    cargandoPresupuestoRef.current = true;
    try {
      // 1. Traer items de tabla_presupuestos
      const rev = pres.revision ?? pres.REVISION ?? 0;
      const r = await authFetch(
        `${API}/tabla-presupuestos?numeropres=${num}&revision=${rev}`,
      );
      const items = await r.json();
      if (!Array.isArray(items)) return;

      // Defensa contra filas duplicadas: si el guardado se disparó más de
      // una vez para la misma revisión (ej: varios clics en "Nueva
      // Revisión" mientras el backend calculaba el próximo número de
      // revisión sin bloqueo atómico), puede haber varias filas para el
      // mismo ítem con la misma revisión. El backend las devuelve
      // ordenadas por id ASC, así que nos quedamos con la ÚLTIMA (id más
      // alto = el guardado más reciente) por cada ítem lógico.
      const dedupKey = (it) =>
        [
          it.articulo ?? it.ARTICULO ?? "",
          it.tipo ?? it.TIPO ?? "",
          it.ancho ?? it.ANCHO ?? "",
          it.alto ?? it.ALTO ?? "",
          it.presmv ?? it.PRESMV ?? "",
          it.presp ?? it.PRESP ?? "",
          it.grupo ?? it.GRUPO ?? "",
        ].join("||");
      const itemsPorKey = new Map();
      items.forEach((it) => {
        itemsPorKey.set(dedupKey(it), it); // el de id más alto pisa a los anteriores (orden ASC)
      });
      const itemsDedup = Array.from(itemsPorKey.values());

      // 1.b Restaurar ajuste general (%/monto) si se guardó aplicado
      const itemConAjuste = itemsDedup.find(
        (it) => it.ajuste_valor ?? it.AJUSTE_VALOR,
      );
      if (itemConAjuste) {
        const valGuardado = parseFloat(
          itemConAjuste.ajuste_valor ?? itemConAjuste.AJUSTE_VALOR,
        );
        const modoGuardado =
          itemConAjuste.ajuste_modo ?? itemConAjuste.AJUSTE_MODO ?? "porcentaje";
        setAjusteValor(String(valGuardado));
        setAjusteModo(modoGuardado);
        setAjusteAplicado(true);
        // ajusteScope queda en su default ("todos") al recargar — la BD no
        // guarda el scope, así que un ajuste con scope puntual se restaura
        // como si fuera global. Con scope "todos" (el caso normal), tanto
        // el precio como el botón "Revertir" funcionan bien tras reabrir:
        // recalcFila deriva el precio de base1/2/3 + porcentaje1/2/3 +
        // %lista + ajusteValor/Modo, no depende de preciosOriginales en
        // memoria.
        setPreciosOriginales({});
      } else {
        setAjusteValor("");
        setAjusteAplicado(false);
        setPreciosOriginales({});
      }

      // 2. Restaurar encabezado
      setNumeroPres(num);
      setNumero(String(num).padStart(4, "0"));
      cargarImagenesPresupuesto(num, rev);
      cargarMetaPresupuesto(num, rev);
      cargarInfoPresupuesto(num);
      setCliente(pres.nombre ?? pres.NOMBRE ?? "");
      const codclienteRestaurado = pres.codcliente ?? pres.CODCLIENTE ?? null;
      setCodcliente(codclienteRestaurado);
      // Restaurar teléfono del cliente. Si el objeto `pres` (proveniente del
      // listado de presupuestos) ya trae telefono1/telefono2 -porque el
      // endpoint hace JOIN con clientes- lo usamos directo. Si no, lo
      // buscamos por codcliente. Sin esto, telefono1 queda "" y el guardado
      // de una nueva revisión lo rechaza (línea ~2129: telefonoOk exige
      // telefono1 no vacío).
      const tel1Pres = pres.telefono1 ?? pres.TELEFONO1 ?? "";
      const tel2Pres = pres.telefono2 ?? pres.TELEFONO2 ?? "";
      console.log("[DEBUG telefono] pres completo:", JSON.stringify(pres));
      console.log("[DEBUG telefono] tel1Pres:", tel1Pres, "| tel2Pres:", tel2Pres, "| codclienteRestaurado:", codclienteRestaurado);
      if (tel1Pres || tel2Pres) {
        console.log("[DEBUG telefono] usando telefono desde pres");
        setTelefono1(tel1Pres);
        setTelefono2(tel2Pres);
        setTelefonoSearch(tel1Pres || tel2Pres);
      } else if (codclienteRestaurado) {
        try {
          console.log("[DEBUG telefono] pres no traia telefono, pidiendo a /clientes/", codclienteRestaurado);
          const rc = await authFetch(`${API}/clientes/${codclienteRestaurado}`);
          console.log("[DEBUG telefono] status fetch clientes/:id:", rc.status);
          const cli = await rc.json();
          console.log("[DEBUG telefono] respuesta clientes/:id:", JSON.stringify(cli));
          const ct1 = cli?.telefono1 ?? cli?.TELEFONO1 ?? "";
          const ct2 = cli?.telefono2 ?? cli?.TELEFONO2 ?? "";
          setTelefono1(ct1);
          setTelefono2(ct2);
          setTelefonoSearch(ct1 || ct2 || "");
        } catch (e) {
          console.error("[DEBUG telefono] Error restaurando teléfono del cliente:", e);
        }
      } else {
        console.log("[DEBUG telefono] no hay tel en pres NI codcliente -> no se puede restaurar");
      }
      setFecha((pres.fecha ?? pres.FECHA ?? "").slice(0, 10));
      setRevision(Number(pres.revision ?? pres.REVISION ?? 1));
      const itemConLista = itemsDedup.find((it) => it.lista ?? it.LISTA);
      const listaGuardada =
        pres.lista ?? pres.LISTA ?? itemConLista?.lista ?? itemConLista?.LISTA ?? null;
      if (listaGuardada) {
        // cargandoPresupuestoRef.current ya está en true desde el arranque
        // de esta función (línea ~1446) y el efecto que recalcula precios
        // por listaPrecio lo respeta (línea ~1875: "if
        // (cargandoPresupuestoRef.current) return;"), así que es seguro
        // setear listaPrecio ya mismo sin esperar a que /lista haya
        // resuelto. Antes esto dependía de listasDB.length > 0, pero
        // listasDB es un valor capturado por closure en el momento en que
        // se creó esta función: si el fetch a /lista resolvía DESPUÉS de
        // este punto, listasDB seguía viendo [] acá (aunque el estado ya
        // se hubiera actualizado en otro render), la condición daba falso,
        // y listaPrecio se quedaba en "" para siempre en esa carga — el
        // encabezado terminaba mostrando "Lista 1" por defecto aunque el
        // presupuesto fuera de otra lista.
        setListaPrecio(listaGuardada);
        // Igual dejamos el ref por si en algún reorden futuro /lista
        // resuelve ANTES de llegar a esta línea (poco probable, pero no
        // cuesta nada como red de seguridad).
        listaPendienteRef.current = listaGuardada;
      }

      const itemConLinea =
        itemsDedup.find((it) => it.linea1 ?? it.LINEA1) ?? itemsDedup[0];
      const l1 =
        itemConLinea?.linea1 ?? itemConLinea?.LINEA1 ?? pres.linea1 ?? null;
      const l2 =
        itemConLinea?.linea2 ?? itemConLinea?.LINEA2 ?? pres.linea2 ?? null;
      const l3 =
        itemConLinea?.linea3 ?? itemConLinea?.LINEA3 ?? pres.linea3 ?? null;
      setLineas([
        { linea: l1 ?? "[Sin líneas]", col2: "", col3: "" },
        { linea: l2 ?? "[Sin líneas]", col2: "", col3: "" },
        { linea: l3 ?? "[Sin líneas]", col2: "", col3: "" },
      ]);

      const nuevaCocina = { bajomesadas: [], alacenas: [] };
      const nuevoPlacard = {
        placard: [],
        frente: [],
        auxiliares: [],
        accesorios: [],
      };
      const otrosItems = [];

      itemsDedup.forEach((it) => {
        const tipo = (it.tipo ?? it.TIPO ?? "").toLowerCase();
        const articulo = it.articulo ?? it.ARTICULO ?? "";
        const nombreart = it.nombreart ?? it.NOMBREART ?? "";
        const v1 = parseFloat(it.valor1 ?? it.VALOR1) || null;
        const v2 = parseFloat(it.valor2 ?? it.VALOR2) || null;
        const v3 = parseFloat(it.valor3 ?? it.VALOR3) || null;
        // Costo puro (sin % de lista ni % de ítem) guardado en base1/2/3.
        // Fallback a valorN para presupuestos guardados ANTES de este cambio
        // (no van a ser 100% exactos si tenían % aplicado, pero es lo mejor
        // disponible sin ese dato — "Actualizar" ya no va a duplicar % de
        // acá en adelante).
        const b1raw = parseFloat(it.base1 ?? it.BASE1);
        const b2raw = parseFloat(it.base2 ?? it.BASE2);
        const b3raw = parseFloat(it.base3 ?? it.BASE3);
        const b1 = !isNaN(b1raw) ? b1raw : v1;
        const b2 = !isNaN(b2raw) ? b2raw : v2;
        const b3 = !isNaN(b3raw) ? b3raw : v3;
        const precios = [
          ...(l1 && v1 != null
            ? [{ linea: l1, precioBase: String(b1 ?? v1), precio: String(v1) }]
            : []),
          ...(l2 && v2 != null
            ? [{ linea: l2, precioBase: String(b2 ?? v2), precio: String(v2) }]
            : []),
          ...(l3 && v3 != null
            ? [{ linea: l3, precioBase: String(b3 ?? v3), precio: String(v3) }]
            : []),
        ];
        const fila = {
          articulo,
          nombreart,
          cantidad: parseFloat(it.cantidad ?? it.CANTIDAD) || 1,
          precio: String(v1 ?? 0),
          precioBase: String(b1 ?? v1 ?? 0),
          precios,
          preciosBase: precios.map((p) => ({
            linea: p.linea,
            precioBase: p.precioBase,
          })),
          margen: it.margen ?? null,
          valor1: v1,
          porcentaje1: parseFloat(it.porcentaje1 ?? it.PORCENTAJE1) || null,
          valor2: v2,
          porcentaje2: parseFloat(it.porcentaje2 ?? it.PORCENTAJE2) || null,
          valor3: v3,
          porcentaje3: parseFloat(it.porcentaje3 ?? it.PORCENTAJE3) || null,
          area: parseFloat(it.area ?? it.AREA) || null,
          // accesorio/accesorio1/accesorio2 en BD guardan el codartint de
          // hasta 3 artículos tildados en el ítem (null en los slots sin
          // usar). Al recargar, se busca cada codartint en
          // accesoriosDisponibles para volver a tildarlos. Además de
          // resolverlo ya (si accesoriosDisponibles ya está cargado), se
          // guardan los códigos crudos en _accesorioCods: si el fetch de
          // /articulos/accesorios todavía no terminó en este momento (carga
          // en paralelo), un efecto aparte los vuelve a resolver apenas
          // esa lista esté lista — ver useCocinaPlacard.js.
          _accesorioCods: [
            it.accesorio ?? it.ACCESORIO ?? null,
            it.accesorio1 ?? it.ACCESORIO1 ?? null,
            it.accesorio2 ?? it.ACCESORIO2 ?? null,
          ].filter((cod) => cod != null && cod !== ""),
          accesorios: [
            it.accesorio ?? it.ACCESORIO ?? null,
            it.accesorio1 ?? it.ACCESORIO1 ?? null,
            it.accesorio2 ?? it.ACCESORIO2 ?? null,
          ]
            .filter((cod) => cod != null && cod !== "")
            .map(
              (cod) =>
                accesoriosDisponibles.find(
                  (a) => String(a.codartint) === String(cod),
                )?.articulo,
            )
            .filter(Boolean),
          grupo: it.grupo ?? it.GRUPO ?? "",
        };
        if (tipo.includes("cocina") && tipo.includes("bajomesada"))
          nuevaCocina.bajomesadas.push(fila);
        else if (tipo.includes("cocina") && tipo.includes("alacena"))
          nuevaCocina.alacenas.push(fila);
        else if (tipo.includes("placard") && tipo.includes("frente"))
          nuevoPlacard.frente.push(fila);
        else if (tipo.includes("placard") && tipo.includes("auxiliar"))
          nuevoPlacard.auxiliares.push(fila);
        else if (tipo.includes("placard") && tipo.includes("accesorio"))
          nuevoPlacard.accesorios.push(fila);
        else if (tipo.includes("placard")) nuevoPlacard.placard.push(fila);
        else {
          const precio0 = v1 ?? 0;
          const seccion = it.tipo ?? it.TIPO ?? "Otros";
          // Si es mampara, restaurar presmv desde la BD
          console.log(
            "[cargar] item seccion:",
            seccion,
            "| presmv:",
            it.presmv,
            "| raw:",
            JSON.stringify(it),
          );
          if (seccion.toLowerCase() === "mampara") {
            const pmv = it.presmv ?? it.PRESMV ?? null;
            console.log("[cargar] mampara encontrada, pmv:", pmv);
            if (pmv != null) setPresmv(pmv);
          }
          // Si es puerta, restaurar prespv desde la BD
          if (seccion.toLowerCase() === "puerta") {
            const ppv = it.presp ?? it.PRESP ?? null;
            console.log("[cargar] puerta encontrada, ppv:", ppv);
            if (ppv != null) setPrespv(ppv);
          }
          // Si es vanitory, restaurar presv desde presmv guardado en BD
          const esVanitory = seccion.toLowerCase() === "vanitory";
          const presvRestaurado = esVanitory
            ? (it.presmv ?? it.PRESMV ?? null)
            : null;
          if (esVanitory && presvRestaurado) {
            console.log(
              "[cargar] vanitory encontrado, presv restaurado:",
              presvRestaurado,
            );
          }
          const esMampara = seccion.toLowerCase() === "mampara";
          const presmvRestaurado = esMampara
            ? (it.presmv ?? it.PRESMV ?? null)
            : null;
          const esPuerta = seccion.toLowerCase() === "puerta";
          const prespRestaurado = esPuerta
            ? (it.presp ?? it.PRESP ?? null)
            : null;
          otrosItems.push({
            id: `otros-${it.id}`,
            seccion,
            descripcion: articulo,
            nombreart,
            codherraje: it.codherraje ?? it.CODHERRAJE ?? null,
            nombreherraje: it.nombreherraje ?? it.NOMBREHERRAJE ?? null,
            cantidad: parseFloat(it.cantidad ?? it.CANTIDAD) || 1,
            precio: precio0,
            subtotal: precio0 * (parseFloat(it.cantidad ?? it.CANTIDAD) || 1),
            precios,
            margen: it.margen ?? null,
            valor1: v1,
            porcentaje1: parseFloat(it.porcentaje1 ?? it.PORCENTAJE1) || null,
            valor2: v2,
            porcentaje2: parseFloat(it.porcentaje2 ?? it.PORCENTAJE2) || null,
            valor3: v3,
            porcentaje3: parseFloat(it.porcentaje3 ?? it.PORCENTAJE3) || null,
            // Vinculación vanitory
            ...(esVanitory && presvRestaurado
              ? { presv: presvRestaurado }
              : {}),
            // Vinculación mampara
            ...(esMampara && presmvRestaurado
              ? { presmv: presmvRestaurado }
              : {}),
            // Vinculación puerta
            ...(esPuerta && prespRestaurado
              ? { presp: prespRestaurado }
              : {}),
            // Medidas (mampara, puerta y vanitory)
            ancho: it.ancho ?? it.ANCHO ?? null,
            alto: it.alto ?? it.ALTO ?? null,
            grupo: it.grupo ?? it.GRUPO ?? null,
          });
        }
      });

      setCocinaItems(nuevaCocina);
      setPlacardItems(nuevoPlacard);
      // Los otros se fusionarán en el useEffect de sincronización
      if (otrosItems.length > 0) {
        setPresupuestoItems((prev) => {
          const sinOtros = prev.filter(
            (p) => p.id.startsWith("cocina-") || p.id.startsWith("placard-"),
          );
          return [...sinOtros, ...otrosItems];
        });
      }
    } catch (e) {
      console.error("Error cargando presupuesto:", e);
    } finally {
      cargandoPresupuestoRef.current = false;
    }
  };

  // Cargar si viene presupuestoInicial como prop (desde la tabla)
  useEffect(() => {
    if (presupuestoInicial) {
      cargarPresupuesto(presupuestoInicial);
      return;
    }
    // presupuestoInicial === null → "presupuesto nuevo". El componente no
    // siempre se remonta al alternar entre editar y nuevo, así que sin este
    // reset el encabezado (cliente, teléfono, etc.) queda con los datos del
    // presupuesto anterior y permite guardar uno nuevo sin cargarlos.
    setNumeroPres(null);
    setNumero("Nuevo");
    setRevision(1);
    setCliente("");
    setCodcliente(null);
    setTelefonoSearch("");
    setTelefono1("");
    setTelefono2("");
    setWapp("");
    setDomicilio("");
    setDomicilioFiscal("");
    setClienteAutoResuelto(null);
    setImagenesFinal([]);
    setMetaPresupuesto(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presupuestoInicial]);

  // ── Resolución automática de cliente ────────────────────────────────────
  // Cuando el usuario carga nombre + teléfono a mano (sin elegir una
  // sugerencia de la lista):
  //   1) Busca coincidencia de nombre en nombre / nombre1 / nombre2.
  //   2) Si no hay, busca coincidencia de teléfono en telefono1 / telefono2 / wapp.
  //   3) Si encontró cliente por nombre pero el teléfono no coincide con
  //      ninguna de sus 3 casillas, agrega el teléfono a la primera casilla
  //      vacía (telefono1 → telefono2 → wapp).
  //   4) Si encontró cliente por teléfono pero el nombre no coincide con
  //      ninguna de sus 3 casillas, agrega el nombre a la primera casilla
  //      vacía de nombre (nombre1 → nombre2). No pisa el campo "nombre" principal.
  //   5) Si no encuentra nada por ninguno de los dos, da de alta el cliente solo.
  //
  // ⚠️ Asunciones sobre el backend (ajustar si no coinciden con tu API real):
  //   - GET /clientes/buscar-nombre?q=   ya busca también en nombre1 y nombre2.
  //   - GET /clientes/buscar-telefono?q= ya busca en telefono1, telefono2 y wapp.
  //   - PUT /clientes/:id  acepta un body parcial, ej { telefono2: "..." }.
  //   - POST /clientes acepta { nombre, telefono1 } y devuelve el cliente creado.
  useEffect(() => {
    if (cargandoPresupuestoRef.current) return; // no autoresolver mientras se está cargando un presupuesto existente
    if (codcliente) return; // ya está vinculado a un cliente (elegido o ya resuelto)

    const nombreVal = cliente.trim();
    const telVal = telefonoSearch.trim();
    if (!nombreVal || !telVal) return; // esperamos nombre Y teléfono

    // Compara ignorando mayúsculas/tildes/espacios
    const norm = (s) =>
      String(s ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const nombresDe = (c) => [
      c.nombre ?? c.NOMBRE ?? "",
      c.nombre1 ?? c.NOMBRE1 ?? "",
      c.nombre2 ?? c.NOMBRE2 ?? "",
    ];
    const telefonosDe = (c) => [
      c.telefono1 ?? c.TELEFONO1 ?? "",
      c.telefono2 ?? c.TELEFONO2 ?? "",
      c.wapp ?? c.WAPP ?? "",
    ];

    // Actualiza en el cliente encontrado el primer campo vacío de una lista dada
    const completarCasillaVacia = async (encontrado, campos, valor) => {
      const idCliente = encontrado.id ?? encontrado.codcliente ?? encontrado.CODCLIENTE;
      if (idCliente == null) return;
      const actual = {};
      campos.forEach((campo) => {
        actual[campo] = encontrado[campo] ?? encontrado[campo.toUpperCase()] ?? "";
      });
      const campoVacio = campos.find((campo) => !String(actual[campo] ?? "").trim());
      if (!campoVacio) return; // las 3 casillas ya están ocupadas, no forzamos nada
      try {
        await authFetch(`${API}/clientes/${idCliente}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [campoVacio]: valor }),
        });
      } catch (e) {
        console.error(`[autoresolverCliente] no se pudo completar ${campoVacio}:`, e);
      }
      return campoVacio;
    };

    const timer = setTimeout(async () => {
      setResolviendoCliente(true);
      try {
        let encontrado = null;
        let viaNombre = false;

        // 1) Buscar coincidencia en nombre / nombre1 / nombre2
        try {
          const rNombre = await authFetch(
            `${API}/clientes/buscar-nombre?q=${encodeURIComponent(nombreVal)}`,
          );
          const dNombre = await rNombre.json();
          if (Array.isArray(dNombre)) {
            encontrado = dNombre.find((c) =>
              nombresDe(c).some((n) => n && norm(n) === norm(nombreVal)),
            );
          }
        } catch (e) {
          console.error("[autoresolverCliente] error buscando por nombre:", e);
        }
        if (encontrado) viaNombre = true;

        // 2) Si no hay match por nombre, buscar coincidencia de teléfono
        if (!encontrado) {
          try {
            const rTel = await authFetch(
              `${API}/clientes/buscar-telefono?q=${encodeURIComponent(telVal)}`,
            );
            const dTel = await rTel.json();
            if (Array.isArray(dTel)) {
              encontrado =
                dTel.find((c) =>
                  telefonosDe(c).some((t) => t && norm(t) === norm(telVal)),
                ) ?? dTel[0] ?? null;
            }
          } catch (e) {
            console.error("[autoresolverCliente] error buscando por teléfono:", e);
          }
        }

        if (encontrado) {
          if (viaNombre) {
            // Encontrado por nombre → si el teléfono no está en ninguna de
            // sus 3 casillas, lo agregamos en la primera vacía.
            const telCoincide = telefonosDe(encontrado).some(
              (t) => t && norm(t) === norm(telVal),
            );
            if (!telCoincide) {
              await completarCasillaVacia(
                encontrado,
                ["telefono1", "telefono2", "wapp"],
                telVal,
              );
            }
          } else {
            // Encontrado por teléfono → si el nombre no está en ninguna de
            // sus 3 casillas, lo agregamos en nombre1/nombre2 (no tocamos "nombre").
            const nombreCoincide = nombresDe(encontrado).some(
              (n) => n && norm(n) === norm(nombreVal),
            );
            if (!nombreCoincide) {
              await completarCasillaVacia(
                encontrado,
                ["nombre1", "nombre2"],
                nombreVal,
              );
            }
          }

          // Vinculamos el cliente encontrado sin pisar lo que el usuario ya escribió
          setCodcliente(encontrado.codcliente ?? encontrado.CODCLIENTE ?? null);
          setTelefono1(encontrado.telefono1 ?? encontrado.TELEFONO1 ?? telVal);
          setTelefono2(encontrado.telefono2 ?? encontrado.TELEFONO2 ?? "");
          setWapp(encontrado.wapp ?? encontrado.WAPP ?? "");
          setDomicilio(encontrado.domrem ?? encontrado.DOMREM ?? "");
          setDomicilioFiscal(
            encontrado.domiciliofiscal ??
              encontrado["domicilio fiscal"] ??
              encontrado.DOMICILIO_FISCAL ??
              "",
          );
          setClienteAutoResuelto("existente");
        } else {
          // 3) No existe ni por nombre ni por teléfono → alta automática
          const rNuevo = await authFetch(`${API}/clientes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: nombreVal, telefono1: telVal }),
          });
          const dNuevo = await rNuevo.json();
          if (rNuevo.ok) {
            setCodcliente(
              dNuevo.codcliente ?? dNuevo.CODCLIENTE ?? dNuevo.id ?? null,
            );
            setTelefono1(telVal);
            setClienteAutoResuelto("nuevo");
          } else {
            console.error("[autoresolverCliente] no se pudo crear el cliente:", dNuevo);
          }
        }
      } finally {
        setResolviendoCliente(false);
      }
    }, 900); // esperamos a que el usuario termine de tipear ambos campos

    return () => clearTimeout(timer);
  }, [cliente, telefonoSearch, codcliente, numeroPres]);

  const setLinea = (idx, field, val) => {
    setLineas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l)),
    );
  };

  const handleGuardar = async (esNuevaRev = false) => {
    const nombreOk = cliente.trim().length > 0;
    const telefonoOk = telefono1.trim().length > 0;
    if (!nombreOk || !telefonoOk) {
      const faltantes = [];
      if (!nombreOk) faltantes.push("el nombre");
      if (!telefonoOk) faltantes.push("el teléfono");
      setError(
        `Completá ${faltantes.join(" y ")} del cliente en el encabezado antes de guardar.`,
      );
      return;
    }
    setError("");
    setGuardando(true);

    // esEdicion ya no fuerza nueva revisión: "Guardar" ahora sobrescribe la
    // revisión actual (revisionActual) tanto si es la primera vez (rev 0)
    // como si ya se guardó antes. "Nueva Revisión" (esNuevaRev=true) es la
    // única acción que efectivamente crea una revisión nueva.
    const lineasElegidas = lineas
      .filter((l) => l.linea && l.linea !== "[Sin líneas]")
      .map((l) => l.linea);
    const payload = {
      numero: numeroPres ?? null,
      nombre: cliente,
      codcliente: codcliente,
      fecha: new Date().toISOString().slice(0, 10),
      lista: listaPrecio,
      lineasElegidas,
      // true → crea una revisión nueva (append, nunca borra las anteriores)
      // false → sobrescribe la revisión actual (revisionActual)
      nuevaRevision: esNuevaRev,
      revisionActual: revision,
      presmv: presmv ?? null,
      prespv: prespv ?? null,
      ajusteValor: ajusteAplicado ? parseFloat(ajusteValor) || null : null,
      ajusteModo: ajusteAplicado ? ajusteModo : null,
      items: presupuestoItems.map((it) => {
        const v1 =
          parseFloat(it.precios?.[0]?.precio ?? it.valor1 ?? it.precio) || null;
        const v2 = parseFloat(it.precios?.[1]?.precio ?? it.valor2) || null;
        const v3 = parseFloat(it.precios?.[2]?.precio ?? it.valor3) || null;
        return {
          descripcion: it.descripcion,
          nombreart: it.nombreart ?? "",
          codherraje: it.codherraje ?? null,
          nombreherraje: it.nombreherraje ?? null,
          seccion: it.seccion,
          cantidad: it.cantidad,
          precio: it.precio,
          subtotal: it.subtotal,
          margen: it.margen ?? null,
          valor1: v1,
          porcentaje1: it.porcentaje1 ?? null,
          base1: parseFloat(it.preciosBase?.[0]?.precioBase ?? it.precioBase) || null,
          valor2: v2,
          porcentaje2: it.porcentaje2 ?? null,
          base2: parseFloat(it.preciosBase?.[1]?.precioBase) || null,
          valor3: v3,
          porcentaje3: it.porcentaje3 ?? null,
          base3: parseFloat(it.preciosBase?.[2]?.precioBase) || null,
          precios: it.precios ?? [],
          ancho: it.ancho ?? null,
          alto: it.alto ?? null,
          // Área del artículo (columna AREA en tabla articulos), guardada
          // en el ítem al elegirlo del buscador. Se manda tal cual para
          // que sobreviva al recargar el presupuesto (antes se perdía:
          // solo se usaba para calcular cantacc/cantacc1/cantacc2 más
          // abajo, nunca se mandaba como campo propio del ítem).
          area: parseFloat(it.area) || null,
          // Hasta 3 accesorios por ítem: cada uno se manda como su
          // codartint (columnas accesorio/accesorio1/accesorio2) + el área
          // del artículo del ítem (columnas cantacc/cantacc1/cantacc2 —
          // el área del ítem, no una cantidad de accesorios). Slots sin
          // usar quedan en null.
          ...(() => {
            const nombres = (it.accesorios ?? []).slice(0, 3);
            const areaItem = parseFloat(it.area) || null;
            const cods = nombres.map((nombre) => {
              const art = accesoriosDisponibles.find(
                (a) => a.articulo === nombre,
              );
              return art?.codartint ?? null;
            });
            return {
              accesorio: cods[0] ?? null,
              cantacc: cods[0] != null ? areaItem : null,
              accesorio1: cods[1] ?? null,
              cantacc1: cods[1] != null ? areaItem : null,
              accesorio2: cods[2] ?? null,
              cantacc2: cods[2] != null ? areaItem : null,
            };
          })(),
          // Vinculación vanitory
          tabla: it.tabla ?? null,
          vtabla: it.vtabla ?? null,
          presv: it.presv ?? null,
          // Vinculación mampara
          presmv: it.presmv ?? null,
          // Vinculación puerta
          presp: it.presp ?? null,
          // Grupo personalizado para el PDF/tabla — solo se guarda si es
          // distinto del automático (sección); si no, se recalcula solo.
          grupo: (() => {
            const g = grupoDe(it);
            return g && g !== it.seccion ? g : null;
          })(),
        };
      }),
    };
    console.log(
      "[handleGuardar] payload:",
      JSON.stringify({
        numero: payload.numero,
        nuevaRevision: payload.nuevaRevision,
        itemsCount: payload.items?.length,
        cliente: payload.nombre,
      }),
    );
    console.log(
      "[handleGuardar] items con accesorio:",
      JSON.stringify(
        payload.items
          ?.filter((it) => it.accesorio || it.accesorio1 || it.accesorio2)
          .map((it) => ({
            seccion: it.seccion,
            nombreart: it.nombreart,
            accesorio: it.accesorio,
            cantacc: it.cantacc,
            accesorio1: it.accesorio1,
            cantacc1: it.cantacc1,
            accesorio2: it.accesorio2,
            cantacc2: it.cantacc2,
          })),
      ),
    );
    try {
      const res = await authFetch(`${API}/tabla-presupuestos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");

      // El servidor devuelve numero (= numeropres de tabla_indice) y revision
      const numAsignado = data.numero ?? data.NUMERO ?? data.id;
      const revAsignada = data.revision ?? data.REVISION ?? revision;
      if (numAsignado != null) {
        setNumeroPres(numAsignado);
        setNumero(String(numAsignado).padStart(4, "0"));

        // ── Vincular subpresupuestos vanitory huérfanos ──
        const vanitoryIds = presupuestoItems
          .filter((it) => it.seccion === "Vanitory" && it.vtabla != null)
          .map((it) => Number(it.vtabla));

        if (vanitoryIds.length > 0) {
          authFetch(`${API}/presupuestos-vanitory/vincular`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ numeropres: numAsignado, ids: vanitoryIds }),
          }).catch(() => {});
        }

        // ── Persistir imágenes (hasta 5 por grupo) ──
        // imagenesFinal no se vacía al crear una "Nueva Revisión": sigue
        // teniendo las fotos cargadas de la revisión de origen (más lo que
        // se haya agregado/sacado en esta edición). Al guardar bajo
        // revAsignada (el nuevo número de revisión), esas fotos quedan
        // copiadas ahí — la revisión anterior conserva las suyas intactas,
        // sin verse afectada.
        guardarImagenesPresupuesto(numAsignado, Number(revAsignada));

        // ── Persistir leyenda/observaciones/texto de seña ──
        guardarInfoPresupuesto(numAsignado);

        // ── Refrescar quién/cuándo guardó, para mostrar en pantalla ──
        cargarMetaPresupuesto(numAsignado, Number(revAsignada));
      }
      setRevision(Number(revAsignada));

      setGuardadoOk(true);
      onGuardado?.();
      setTimeout(() => setGuardadoOk(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Generar PDF del presupuesto ─────────────────────────────────────────────
  // Punto de entrada del botón "Generar PDF". Antes preguntaba con un
  // window.confirm() (OK/Cancelar); ahora se pregunta con un modal propio
  // con botones "Sí" / "No". Para Luciana Roque nunca se pregunta: se
  // genera directo con querDescripcion = false.
  const iniciarGeneracionPDF = () => {
    if (esLucianaRoque) {
      generarPDFConDescripcion(false);
    } else {
      setMostrarModalDescripcionPDF(true);
    }
  };

  const generarPDFConDescripcion = (querDescripcion) => {
    setMostrarModalDescripcionPDF(false);
    // Uso la respuesta local (querDescripcion) para el HTML de este PDF
    // puntual, y además la guardo en el state por si el resto de la UI la
    // necesita después.
    setIncluirDescripcion(querDescripcion);

    // El armado del HTML/CSS y la generación + descarga del PDF viven en
    // pdfPresupuesto.js (separado de este archivo para no mezclar la lógica
    // de UI con la de armado del documento).
    generarPresupuestoPDF({
      querDescripcion,
      fecha,
      numeroPres,
      numero,
      revision,
      cliente,
      domicilio,
      localidad,
      telefono1,
      telefono2,
      observaciones,
      leyenda,
      lineasActivas,
      presupuestoItems,
      grupoDe,
      mostrarCosto,
      incluirPrecio,
      incluirSubtotalItem,
      incluirTotal,
      agregarIVA,
      incluirTextoColoc,
      incluirTextoSena,
      textoSena,
      imagenesFinal,
      setGenerandoPDF,
    });
  };

  return (
    <>

      <div className="pn-root">
        {/* ── ¿Incluir descripción en el PDF? Sí / No ── */}
        {mostrarModalDescripcionPDF && (
          <>
            <div
              className="pn-popover-backdrop"
              onClick={() => setMostrarModalDescripcionPDF(false)}
            />
            <div
              style={{
                position: "fixed",
                top: "5%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(360px, 92vw)",
                background: "#fff",
                borderRadius: 10,
                boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                padding: 18,
                zIndex: 1100,
                textAlign: "center",
              }}
            >
              <strong style={{ fontSize: 15 }}>
                ¿Incluir la descripción de cada ítem en el PDF?
              </strong>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 18,
                  justifyContent: "center",
                }}
              >
                <button
                  className="pn-tool-btn"
                  onClick={() => generarPDFConDescripcion(true)}
                  style={{
                    fontWeight: 700,
                    background: "#e6f7ff",
                    borderColor: "#1890ff",
                    minWidth: 90,
                  }}
                >
                  Sí
                </button>
                <button
                  className="pn-tool-btn"
                  onClick={() => generarPDFConDescripcion(false)}
                  style={{ minWidth: 90 }}
                >
                  No
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Ver / editar el texto de seña y condiciones (recuadro amarillo del PDF) ── */}
        {mostrarModalTextoSena && (
          <>
            <div
              className="pn-popover-backdrop"
              onClick={() => setMostrarModalTextoSena(false)}
            />
            <div
              style={{
                position: "fixed",
                top: "8%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(560px, 92vw)",
                background: "#fff",
                borderRadius: 10,
                boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                padding: 18,
                zIndex: 1100,
              }}
            >
              <strong style={{ fontSize: 15 }}>
                Texto de seña y condiciones
              </strong>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                Se muestra destacado (fondo amarillo) en el PDF, entre el
                detalle/valores y las fotos.
              </div>
              <textarea
                value={textoSena}
                onChange={(e) => setTextoSena(e.target.value)}
                rows={12}
                style={{
                  width: "100%",
                  marginTop: 12,
                  fontFamily: "'Space Mono', 'Courier New', monospace",
                  fontSize: 12,
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  resize: "vertical",
                }}
              />
              <label
                className="pn-check-row"
                style={{ marginTop: 10, display: "block" }}
              >
                <input
                  type="checkbox"
                  checked={incluirTextoSena}
                  onChange={(e) => setIncluirTextoSena(e.target.checked)}
                />{" "}
                Incluir este texto en el PDF
              </label>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 16,
                  justifyContent: "flex-end",
                }}
              >
                <button
                  className="pn-tool-btn"
                  onClick={() => setMostrarModalTextoSena(false)}
                  style={{
                    fontWeight: 700,
                    background: "#e6f7ff",
                    borderColor: "#1890ff",
                    minWidth: 90,
                  }}
                >
                  Listo
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Elegir grupo ANTES de subir las fotos/PDF recién seleccionados ── */}
        {pendienteGrupo && (
          <>
            <div className="pn-popover-backdrop" onClick={cancelarPendienteGrupo} />
            <div
              style={{
                position: "fixed",
                top: "5%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(420px, 92vw)",
                background: "#fff",
                borderRadius: 10,
                boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                padding: 18,
                zIndex: 1100,
              }}
            >
              <strong style={{ fontSize: 15 }}>
                ¿A qué grupo pertenece
                {pendienteGrupo.validos.length === 1 ? " esta foto" : "n estas fotos"}?
              </strong>
              <div style={{ fontSize: 12, color: "#666", margin: "6px 0 14px" }}>
                {pendienteGrupo.validos.length} archivo(s) seleccionado(s). Cada
                foto queda ligada al presupuesto N° {numero || "(nuevo)"}, la
                revisión actual y este grupo.
              </div>

              <select
                value={
                  pendienteGrupo.sinGrupo ? "" : pendienteGrupo.grupoSeleccionado
                }
                onChange={(e) =>
                  setPendienteGrupo((prev) => ({
                    ...prev,
                    grupoSeleccionado: e.target.value,
                    sinGrupo: false,
                  }))
                }
                style={{ fontSize: 13, padding: "6px 8px", width: "100%" }}
              >
                <option value="">— Elegí un grupo —</option>
                {nombresGruposUsados.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="...o escribí un grupo nuevo"
                value={pendienteGrupo.sinGrupo ? "" : pendienteGrupo.grupoSeleccionado}
                onChange={(e) =>
                  setPendienteGrupo((prev) => ({
                    ...prev,
                    grupoSeleccionado: e.target.value,
                    sinGrupo: false,
                  }))
                }
                style={{
                  fontSize: 13,
                  padding: "6px 8px",
                  width: "100%",
                  marginTop: 8,
                  boxSizing: "border-box",
                }}
              />

              <button
                className="pn-tool-btn"
                onClick={() =>
                  setPendienteGrupo((prev) => ({
                    ...prev,
                    sinGrupo: true,
                    grupoSeleccionado: "",
                  }))
                }
                style={{
                  marginTop: 10,
                  width: "100%",
                  fontWeight: pendienteGrupo.sinGrupo ? 700 : 400,
                  background: pendienteGrupo.sinGrupo ? "#e6f7ff" : "#fff",
                  borderColor: pendienteGrupo.sinGrupo ? "#1890ff" : undefined,
                }}
              >
                {pendienteGrupo.sinGrupo ? "✓ " : ""}Sin grupo (van al final del
                presupuesto)
              </button>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 16,
                  justifyContent: "flex-end",
                }}
              >
                <button className="pn-tool-btn" onClick={cancelarPendienteGrupo}>
                  Cancelar
                </button>
                <button
                  className="pn-tool-btn"
                  onClick={confirmarGrupoYSubir}
                  style={{ fontWeight: 700, background: "#e6f7ff", borderColor: "#1890ff" }}
                >
                  Confirmar y subir
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Gestor de fotos/PDF adjuntos ── */}
        {mostrarGestorImagenes && (
          <>
            <div
              className="pn-popover-backdrop"
              onClick={() => setMostrarGestorImagenes(false)}
            />
            <div
              style={{
                position: "fixed",
                top: "5%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(560px, 92vw)",
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#fff",
                borderRadius: 10,
                boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                padding: 18,
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <strong style={{ fontSize: 15 }}>Fotos y PDF adjuntos</strong>
                <button
                  className="pn-tool-btn"
                  onClick={() => setMostrarGestorImagenes(false)}
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>

              {imagenesFinal.length === 0 && (
                <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
                  Todavía no agregaste ninguna foto o PDF.
                </div>
              )}

              {imagenesFinal.map((im) => (
                <div
                  key={im.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {im.tipo === "imagen" ? (
                    <img
                      src={im.url}
                      alt={im.nombre}
                      style={{
                        width: 56,
                        height: 56,
                        objectFit: "cover",
                        borderRadius: 6,
                        border: "1px solid #ddd",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        background: "#f5f5f5",
                        borderRadius: 6,
                        border: "1px solid #ddd",
                        flexShrink: 0,
                      }}
                    >
                      📄
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#333",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginBottom: 4,
                      }}
                      title={im.nombre}
                    >
                      {im.nombre}
                    </div>

                    {im.tipo === "imagen" ? (
                      <>
                        <select
                          value={im.grupo ?? ""}
                          onChange={(e) =>
                            actualizarGrupoImagen(im.id, e.target.value)
                          }
                          style={{
                            fontSize: 12,
                            padding: "4px 6px",
                            width: "100%",
                            maxWidth: 260,
                          }}
                        >
                          <option value="">
                            Sin grupo (al final del presupuesto)
                          </option>
                          {nombresGruposUsados.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="...o escribí el grupo manualmente"
                          defaultValue={
                            im.grupo && !nombresGruposUsados.includes(im.grupo)
                              ? im.grupo
                              : ""
                          }
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val) actualizarGrupoImagen(im.id, val);
                          }}
                          style={{
                            fontSize: 12,
                            padding: "4px 6px",
                            width: "100%",
                            maxWidth: 260,
                            marginTop: 4,
                          }}
                        />
                      </>
                    ) : (
                      <div style={{ fontSize: 11, color: "#888" }}>
                        Los PDF se agregan siempre al final del presupuesto.
                      </div>
                    )}
                  </div>

                  <button
                    className="pn-tool-btn"
                    onClick={() => eliminarImagen(im.id)}
                    title="Quitar este adjunto"
                    style={{ flexShrink: 0 }}
                  >
                    🗑️
                  </button>
                </div>
              ))}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 14,
                }}
              >
                <button
                  className="pn-tool-btn"
                  onClick={() =>
                    imagenInputRef.current && imagenInputRef.current.click()
                  }
                >
                  ➕ Agregar más fotos/PDF
                </button>
                <button
                  className="pn-tool-btn"
                  onClick={() => setMostrarGestorImagenes(false)}
                  style={{
                    background: "#0a3a5c",
                    color: "#60efff",
                    fontWeight: 700,
                  }}
                >
                  Listo
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Popover de ajuste de precio ── */}
        {precioPopover &&
          (() => {
            const rect = precioPopover.rect;
            const top = Math.min(rect.bottom + 6, window.innerHeight - 180);
            const left = Math.min(rect.left, window.innerWidth - 260);
            return (
              <>
                <div className="pn-popover-backdrop" onClick={cerrarPopover} />
                <div
                  className="pn-popover"
                  style={{ top, left }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="pn-popover-title">Ajustar precio</div>
                  <div className="pn-pop-toggle">
                    <button
                      className={popoverModo === "valor" ? "active" : ""}
                      onClick={() => {
                        setPopoverModo("valor");
                        setPopoverInput(
                          String(precioPopover.precioActual ?? ""),
                        );
                      }}
                    >
                      $ Valor
                    </button>
                    <button
                      className={popoverModo === "porcentaje" ? "active" : ""}
                      onClick={() => {
                        setPopoverModo("porcentaje");
                        setPopoverInput("");
                      }}
                    >
                      % Porcentaje
                    </button>
                  </div>
                  <div className="pn-pop-input-row">
                    <span style={{ color: "#6699bb", fontSize: 13 }}>
                      {popoverModo === "valor" ? "$" : "%"}
                    </span>
                    <input
                      autoFocus
                      type="number"
                      className="pn-pop-input"
                      value={popoverInput}
                      onChange={(e) => setPopoverInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmarPopover();
                        if (e.key === "Escape") cerrarPopover();
                      }}
                      placeholder={
                        popoverModo === "valor" ? "Nuevo precio" : "ej: 10 ó -5"
                      }
                    />
                    <button
                      className="pn-pop-confirm"
                      onClick={confirmarPopover}
                    >
                      ✓
                    </button>
                    <button className="pn-pop-cancel" onClick={cerrarPopover}>
                      ✕
                    </button>
                  </div>
                  <div className="pn-pop-hint">
                    {popoverModo === "valor"
                      ? `Precio actual: $${Number(precioPopover.precioActual).toLocaleString("es-AR", { minimumFractionDigits: 2 })}${precioPopover.porcentajeActual != null ? ` (${precioPopover.porcentajeActual > 0 ? "+" : ""}${precioPopover.porcentajeActual}% aplicado)` : ""}`
                      : precioPopover.porcentajeActual != null
                        ? `% actual: ${precioPopover.porcentajeActual > 0 ? "+" : ""}${precioPopover.porcentajeActual}% · Positivo = aumento · Negativo = descuento`
                        : "Positivo = aumento · Negativo = descuento"}
                  </div>
                </div>
              </>
            );
          })()}

        {/* ── Popover de accesorios (Cocina/Placard) ── */}
        {accesorioMenu &&
          (() => {
            const rect = accesorioMenu.rect;
            const top = Math.min(rect.bottom + 6, window.innerHeight - 260);
            const left = Math.min(rect.left, window.innerWidth - 240);
            return (
              <>
                <div
                  className="pn-popover-backdrop"
                  onClick={cerrarAccesorioMenu}
                />
                <div
                  className="pn-popover"
                  style={{ top, left, maxHeight: 260, overflowY: "auto" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="pn-popover-title">Accesorios</div>
                  {accesoriosDisponibles.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#6699bb", padding: "6px 2px" }}>
                      No hay artículos cargados con área "accesorio".
                    </div>
                  ) : (
                    accesoriosDisponibles.map((a) => {
                      const marcado = accesorioMenu.actuales.includes(a.articulo);
                      return (
                        <label
                          key={a.articulo}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "5px 2px",
                            fontSize: 12,
                            color: "#0a3a5c",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => accesorioMenu.onToggle(a.articulo)}
                          />
                          <span style={{ flex: 1 }}>{a.articulo}</span>
                          <span style={{ color: "#6699bb", fontFamily: "'Space Mono',monospace" }}>
                            {Number(a.precio || 0).toLocaleString("es-AR", {
                              style: "currency",
                              currency: "ARS",
                            })}
                          </span>
                        </label>
                      );
                    })
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      accesorioMenu.onConfirm?.();
                      cerrarAccesorioMenu();
                    }}
                    style={{
                      marginTop: 8,
                      width: "100%",
                      padding: "6px 10px",
                      background: "#0a6cbc",
                      color: "#fff",
                      border: "none",
                      borderRadius: 3,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Ingresar
                  </button>
                </div>
              </>
            );
          })()}

        {/* ── Popover de edición de precio en solapa Presupuesto ── */}
        {presItemPopover &&
          (() => {
            const rect = presItemPopover.rect;
            const top = Math.min(rect.bottom + 6, window.innerHeight - 200);
            const left = Math.min(rect.left, window.innerWidth - 260);
            return (
              <>
                <div
                  className="pn-popover-backdrop"
                  onClick={cerrarPresItemPopover}
                />
                <div
                  className="pn-popover"
                  style={{ top, left }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="pn-popover-title">Editar precio</div>
                  <div className="pn-pop-toggle">
                    <button
                      className={presItemModo === "valor" ? "active" : ""}
                      onClick={() => {
                        setPresItemModo("valor");
                        setPresItemInput(
                          String(presItemPopover.precioActual ?? ""),
                        );
                      }}
                    >
                      $ Monto
                    </button>
                    <button
                      className={presItemModo === "porcentaje" ? "active" : ""}
                      onClick={() => {
                        setPresItemModo("porcentaje");
                        setPresItemInput("");
                      }}
                    >
                      % Porcentaje
                    </button>
                  </div>
                  <div className="pn-pop-input-row">
                    <span style={{ color: "#6699bb", fontSize: 13 }}>
                      {presItemModo === "valor" ? "$" : "%"}
                    </span>
                    <input
                      autoFocus
                      type="number"
                      className="pn-pop-input"
                      value={presItemInput}
                      onChange={(e) => setPresItemInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmarPresItemPopover();
                        if (e.key === "Escape") cerrarPresItemPopover();
                      }}
                      placeholder={
                        presItemModo === "valor"
                          ? "Nuevo precio"
                          : "ej: 10 ó -5"
                      }
                    />
                    <button
                      className="pn-pop-confirm"
                      onClick={confirmarPresItemPopover}
                    >
                      ✓
                    </button>
                    <button
                      className="pn-pop-cancel"
                      onClick={cerrarPresItemPopover}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="pn-pop-hint">
                    {presItemModo === "valor"
                      ? `Precio actual: $${Number(presItemPopover.precioActual).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                      : "Positivo = aumento · Negativo = descuento"}
                  </div>
                </div>
              </>
            );
          })()}

        {/* Toolbar */}
        <div className="pn-toolbar">
          <button
            className="pn-tool-btn"
            onClick={onVolver}
            style={{
              background: "#0a3a5c",
              color: "#60efff",
              borderColor: "#0a3a5c",
              fontWeight: 700,
            }}
            title="Volver al inicio"
          >
            🏠 Inicio
          </button>
          <input
            type="file"
            ref={imagenInputRef}
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleImagenSeleccionada}
          />
          <button
            className="pn-tool-btn"
            disabled={subiendoImagenes}
            onClick={() => {
              if (imagenesFinal.length) {
                setMostrarGestorImagenes(true);
              } else if (imagenInputRef.current) {
                imagenInputRef.current.click();
              }
            }}
            title={
              subiendoImagenes
                ? "Subiendo imágenes..."
                : imagenesFinal.length
                  ? `${imagenesFinal.length} adjunto(s). Click para gestionarlos y asignarlos a un grupo (máx. ${MAX_IMAGENES_POR_GRUPO} por grupo).`
                  : `Adjuntar una o más imágenes/PDF y asignarlas a un grupo del presupuesto (máx. ${MAX_IMAGENES_POR_GRUPO} imágenes por grupo)`
            }
            style={{
              background: imagenesFinal.length ? "#e6f7ff" : "#fff",
              borderColor: imagenesFinal.length ? "#1890ff" : undefined,
              color: imagenesFinal.length ? "#0a3a5c" : undefined,
              fontWeight: 700,
              opacity: subiendoImagenes ? 0.6 : 1,
            }}
          >
            {subiendoImagenes
              ? "⏳ Subiendo..."
              : `🖼️ ${imagenesFinal.length ? `Imagen ✓ (${imagenesFinal.length})` : "Imagen"}`}
          </button>
          <button
            className="pn-tool-btn"
            onClick={handleActualizar}
            title="Actualiza el presupuesto con los parámetros actuales del encabezado"
            style={{
              background: "#e8f5e9",
              borderColor: "#4caf50",
              color: "#1b5e20",
              fontWeight: 700,
            }}
          >
            🔄 Actualizar
          </button>
          <button
            className="pn-tool-btn save"
            onClick={() => handleGuardar(false)}
            disabled={guardando}
            title={
              numeroPres !== null
                ? `Guarda los cambios sobrescribiendo la Rev. ${revision} actual`
                : "Guarda el presupuesto nuevo (Rev. 0)"
            }
          >
            💾 {guardando ? "Guardando..." : "Guardar"}
          </button>
          {numeroPres !== null && (
            <button
              className="pn-tool-btn"
              onClick={() => handleGuardar(true)}
              disabled={guardando}
              title="Crea una revisión nueva sin modificar las anteriores"
              style={{
                background: "#fff3cd",
                borderColor: "#ffc107",
                color: "#856404",
                fontWeight: 700,
              }}
            >
              🔖 {guardando ? "Guardando..." : "Nueva Revisión"}
            </button>
          )}
          <button
            className="pn-tool-btn"
            onClick={iniciarGeneracionPDF}
            disabled={presupuestoItems.length === 0 || generandoPDF}
            title={
              presupuestoItems.length === 0
                ? "Agregá al menos un ítem al presupuesto para generar el PDF"
                : "Genera y descarga el PDF del presupuesto"
            }
            style={{
              background: "#e8f0f7",
              borderColor: "#2277bb",
              color: "#0a3a5c",
              fontWeight: 700,
              opacity: presupuestoItems.length === 0 || generandoPDF ? 0.5 : 1,
            }}
          >
            🖨️ {generandoPDF ? "Generando..." : "Generar PDF"}
          </button>
          <button
            className="pn-tool-btn"
            onClick={() => onVerTabla && onVerTabla()}
            title="Ver todos los presupuestos"
            style={{
              background: "#f3e8ff",
              borderColor: "#8e44ad",
              color: "#5b2c6f",
              fontWeight: 700,
            }}
          >
            📋 Presupuestos
          </button>
        </div>

        {/* Tabs */}
        <div className="pn-tabs">
          <button
            className={`pn-tab${tab === "encabezado" ? " active" : ""}`}
            onClick={() => setTab("encabezado")}
          >
            Encabezado
          </button>
          <button
            className={`pn-tab${tab === "cocina" ? " active" : ""}`}
            onClick={() => setTab("cocina")}
          >
            Cocina
          </button>
          <button
            className={`pn-tab${tab === "placard" ? " active" : ""}`}
            onClick={() => setTab("placard")}
          >
            Placard
          </button>
          <button
            className={`pn-tab${tab === "mampara" ? " active" : ""}`}
            onClick={() => setTab("mampara")}
          >
            Mampara
          </button>
          <button
            className={`pn-tab${tab === "puertas" ? " active" : ""}`}
            onClick={() => setTab("puertas")}
          >
            Puertas
          </button>
          <button
            className={`pn-tab${tab === "componentes" ? " active" : ""}`}
            onClick={() => setTab("componentes")}
          >
            Componentes
          </button>
          <button
            className={`pn-tab${tab === "especiales" ? " active" : ""}`}
            onClick={() => setTab("especiales")}
          >
            Especiales
          </button>
          <button
            className={`pn-tab${tab === "presupuesto" ? " active" : ""}`}
            onClick={() => setTab("presupuesto")}
          >
            Presupuesto
          </button>
        </div>

        {/* Cuerpo */}
        <div className="pn-body">
          {error && <div className="pn-error">⚠️ {error}</div>}
          {guardadoOk && (
            <div className="pn-ok">✅ Presupuesto guardado correctamente</div>
          )}

          {metaPresupuesto &&
            (metaPresupuesto.creado_por || metaPresupuesto.actualizado_por) && (
              <div
                style={{
                  fontSize: 12,
                  color: "#555",
                  marginBottom: 10,
                  padding: "6px 10px",
                  background: "#f5f5f5",
                  border: "1px solid #e5e5e5",
                  borderRadius: 6,
                  display: "flex",
                  gap: 20,
                  flexWrap: "wrap",
                }}
              >
                {metaPresupuesto.creado_por && (
                  <span>
                    📝 Creado por <strong>{metaPresupuesto.creado_por}</strong>
                    {metaPresupuesto.creado_en
                      ? ` — ${formatFechaHora(metaPresupuesto.creado_en)}`
                      : ""}
                  </span>
                )}
                {metaPresupuesto.actualizado_por && (
                  <span>
                    🔄 Última actualización:{" "}
                    <strong>{metaPresupuesto.actualizado_por}</strong>
                    {metaPresupuesto.actualizado_en
                      ? ` — ${formatFechaHora(metaPresupuesto.actualizado_en)}`
                      : ""}
                  </span>
                )}
              </div>
            )}

          {tab === "encabezado" && (
            <>
              <EncabezadoSection
                numero={numero}
                revision={revision}
                setRevision={setRevision}
                fecha={fecha}
                setFecha={setFecha}
                formatFechaLarga={formatFechaLarga}
                cliente={cliente}
                setCliente={setCliente}
                setCodcliente={setCodcliente}
                clienteAutoResuelto={clienteAutoResuelto}
                setClienteAutoResuelto={setClienteAutoResuelto}
                clientesSugeridos={clientesSugeridos}
                setClientesSugeridos={setClientesSugeridos}
                telefono1={telefono1}
                setTelefono1={setTelefono1}
                telefono2={telefono2}
                setTelefono2={setTelefono2}
                wapp={wapp}
                setWapp={setWapp}
                domicilio={domicilio}
                setDomicilio={setDomicilio}
                domicilioFiscal={domicilioFiscal}
                setDomicilioFiscal={setDomicilioFiscal}
                telefonoSearch={telefonoSearch}
                setTelefonoSearch={setTelefonoSearch}
                telefonosSugeridos={telefonosSugeridos}
                setTelefonosSugeridos={setTelefonosSugeridos}
                resolviendoCliente={resolviendoCliente}
                localidad={localidad}
                setLocalidad={setLocalidad}
                LOCALIDADES={LOCALIDADES}
                authFetch={authFetch}
                lineas={lineas}
                setLinea={setLinea}
                lineasBD={lineasBD}
                listaPrecio={listaPrecio}
                setListaPrecio={setListaPrecio}
                listasDB={listasDB}
                listaPorcentaje={listaPorcentaje}
                mostrarCosto={mostrarCosto}
                setMostrarCosto={setMostrarCosto}
                incluirPrecio={incluirPrecio}
                setIncluirPrecio={setIncluirPrecio}
                incluirSubtotalItem={incluirSubtotalItem}
                setIncluirSubtotalItem={setIncluirSubtotalItem}
                incluirTotal={incluirTotal}
                setIncluirTotal={setIncluirTotal}
                color={color}
                setColor={setColor}
                incluirTextoColoc={incluirTextoColoc}
                setIncluirTextoColoc={setIncluirTextoColoc}
                agregarIVA={agregarIVA}
                setAgregarIVA={setAgregarIVA}
                incluirTextoSena={incluirTextoSena}
                setIncluirTextoSena={setIncluirTextoSena}
                onAbrirTextoSena={() => setMostrarModalTextoSena(true)}
              />

              <Observaciones
                leyenda={leyenda}
                setLeyenda={setLeyenda}
                observaciones={observaciones}
                setObservaciones={setObservaciones}
              />
            </>
          )}

          {tab === "cocina" && (
            <TabCocina
              cocinaItems={cocinaItems}
              setCocinaItems={setCocinaItems}
              cocinaFamilia={cocinaFamilia}
              setCocinaFamilia={setCocinaFamilia}
              lineasActivas={lineasActivas}
              listaPorcentaje={listaPorcentaje}
              aplicarPorcentaje={aplicarPorcentaje}
              authFetch={authFetch}
              onVerPresupuesto={() => setTab("presupuesto")}
              abrirPrecioPopover={abrirPrecioPopover}
              nombresGruposUsados={nombresGruposUsados}
              aplicarFrenoATodosCocina={aplicarFrenoATodosCocina}
              setFrenoItemCocina={setFrenoItemCocina}
              accesoriosDisponibles={accesoriosDisponibles}
              accesorioMenu={accesorioMenu}
              abrirAccesorioMenu={abrirAccesorioMenu}
              cerrarAccesorioMenu={cerrarAccesorioMenu}
              toggleAccesorioItem={toggleAccesorioItem}
              toggleAccesorioEnArray={toggleAccesorioEnArray}
              confirmarAccesoriosItem={confirmarAccesoriosItem}
              recalcFila={recalcFila}
            />
          )}
          <PlacardSection
            tab={tab}
            lineasActivas={lineasActivas}
            placardFamilia={placardFamilia}
            setPlacardFamilia={setPlacardFamilia}
            placardItems={placardItems}
            placardEditIdx={placardEditIdx}
            setPlacardEditIdx={setPlacardEditIdx}
            placardFila={placardFila}
            setPlacardFila={setPlacardFila}
            placardSearch={placardSearch}
            setPlacardSearch={setPlacardSearch}
            placardSearchFocus={placardSearchFocus}
            setPlacardSearchFocus={setPlacardSearchFocus}
            placardAgregarFila={placardAgregarFila}
            placardEliminarFila={placardEliminarFila}
            placardGuardarEdit={placardGuardarEdit}
            placardIniciarEdit={placardIniciarEdit}
            placard_total={placard_total}
            productosFiltrados={productosFiltrados}
            articulosFamilia={articulosFamilia}
            resolverPrecioBasePlacard={resolverPrecioBasePlacard}
            aplicarPorcentaje={aplicarPorcentaje}
            listaPorcentaje={listaPorcentaje}
            abrirPrecioPopover={abrirPrecioPopover}
            setTab={setTab}
            nombresGruposUsados={nombresGruposUsados}
            aplicarFrenoATodosPlacard={aplicarFrenoATodosPlacard}
            setFrenoItemPlacard={setFrenoItemPlacard}
            accesoriosDisponibles={accesoriosDisponibles}
            accesorioMenu={accesorioMenu}
            abrirAccesorioMenu={abrirAccesorioMenu}
            cerrarAccesorioMenu={cerrarAccesorioMenu}
            toggleAccesorioItem={toggleAccesorioItem}
            toggleAccesorioEnArray={toggleAccesorioEnArray}
            confirmarAccesoriosItem={confirmarAccesoriosItem}
            recalcFila={recalcFila}
          />

          {tab === "mampara" && (
            <TabMampara
              cliente={cliente}
              codcliente={codcliente}
              telefono1={telefono1}
              wapp={wapp}
              numeroPres={numeroPres}
              mamparaAEditar={mamparaAEditar}
              setPresmv={setPresmv}
              setPresupuestoItems={setPresupuestoItems}
            />
          )}

          {tab === "puertas" && (
            <TabPuertas
              cliente={cliente}
              codcliente={codcliente}
              telefono1={telefono1}
              wapp={wapp}
              numeroPres={numeroPres}
              puertaAEditar={puertaAEditar}
              setPrespv={setPrespv}
              setPresupuestoItems={setPresupuestoItems}
            />
          )}

          {tab === "componentes" && (
            <TabComponentes
              token={token}
              agregarAPresupuesto={agregarAPresupuesto}
            />
          )}

          {tab === "especiales" && (
            <TabEspeciales
              token={token}
              numeroPres={numeroPres}
              cliente={cliente}
              codcliente={codcliente}
              revision={revision}
              tiposDespensero={tiposDespensero}
              tiposDespenseroRUD={tiposDespenseroRUD}
              onVerTabla={onVerTabla}
              agregarAPresupuesto={agregarAPresupuesto}
            />
          )}

          {tab === "presupuesto" && (
            <TablaArticulos
              cliente={cliente}
              telefono1={telefono1}
              telefono2={telefono2}
              wapp={wapp}
              listaPrecio={listaPrecio}
              numero={numero}
              revision={revision}
              presupuestoItems={presupuestoItems}
              ajusteModo={ajusteModo}
              setAjusteModo={setAjusteModo}
              ajusteValor={ajusteValor}
              setAjusteValor={setAjusteValor}
              ajusteScope={ajusteScope}
              setAjusteScope={setAjusteScope}
              aplicarAjuste={aplicarAjuste}
              ajusteAplicado={ajusteAplicado}
              revertirAjuste={revertirAjuste}
              lineasActivas={lineasActivas}
              listaPorcentaje={listaPorcentaje}
              presmv={presmv}
              prespv={prespv}
              abrirPresItemPopover={abrirPresItemPopover}
              quitarDePresupuesto={quitarDePresupuesto}
              authFetch={authFetch}
              API={API}
              setMamparaAEditar={setMamparaAEditar}
              setPuertaAEditar={setPuertaAEditar}
              setTab={setTab}
              gruposCustom={gruposCustom}
              setGruposCustom={setGruposCustom}
              nombresGruposUsados={nombresGruposUsados}
              accesoriosDisponibles={accesoriosDisponibles}
            />
          )}
        </div>
      </div>
    </>
  );
}
