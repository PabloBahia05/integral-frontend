import { useState, useEffect } from "react";
import TiposVanitory from "./TiposVanitory";
import ArmarVanitory from "./ArmarVanitory";
import BreakdownFormulasVanitory from "./BreakdownFormulasVanitory";
import PresupuestoVanitory from "./PresupuestoVanitory";
import PresupuestoWallPanel from "./PresupuestoWallPanel";
import TiposDespensero from "./TiposDespensero";
import PresupuestoDespensero from "./PresupuestoDespensero";

const WALLPANEL_IMG =
  "data:image/jpeg;base64,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";

const API = "https://integral-backend-production.up.railway.app";

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
                    m.nombreart ?? m.NOMBREART ?? m.articulo ?? m.ARTICULO ?? "";
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
                    g.nombreart ?? g.NOMBREART ?? g.articulo ?? g.ARTICULO ?? "";
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

// ─────────────────────────────────────────────────────────────────────────────
// TabEspeciales
//
// Props:
//   token            – JWT para authFetch
//   numeroPres       – número de presupuesto actual (puede ser null)
//   cliente          – nombre del cliente
//   codcliente       – código del cliente
//   revision         – revisión actual
//   tiposVanitory    – array de modelos de vanitory
//   tiposVanitoryRUD – handlers CRUD de vanitory (pasados a TiposVanitory)
//   tiposDespensero  – array de modelos de despensero
//   tiposDespenseroRUD – handlers CRUD de despensero (pasados a TiposDespensero)
//   onVerTabla       – callback para navegar a tablas de administración
//   agregarAPresupuesto – función para agregar un ítem al presupuesto padre
// ─────────────────────────────────────────────────────────────────────────────
export default function TabEspeciales({
  token,
  numeroPres,
  cliente,
  codcliente,
  revision,
  tiposVanitory = [],
  tiposVanitoryRUD = {},
  tiposDespensero = [],
  tiposDespenseroRUD = {},
  onVerTabla,
  agregarAPresupuesto,
}) {
  const authFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });

  // ── Sub-navegación ───────────────────────────────────────
  const [vista, setVista] = useState("selector"); // "selector" | "vanitory" | "escritorio" | "despensero" | "wallpanel"
  const [vanitoryVista, setVanitoryVista] = useState("tipos"); // "tipos" | "medidas" | "armar" | "breakdown" | "presupuesto"
  const [vanitoryModelo, setVanitoryModelo] = useState(null);
  const [despenseroVista, setDespenseroVista] = useState("tipos"); // "tipos" | "presupuesto"
  const [despenseroModelo, setDespenseroModelo] = useState(null);

  // ── Formulario de medidas ────────────────────────────────
  const MEDIDAS_INIT = { ancho: "", alto: "", profundidad: "", materialPlaca: "", guias: "" };
  const [medidas, setMedidas] = useState(MEDIDAS_INIT);
  const [tipo, setTipo] = useState(null); // "vanitory" | "escritorio" | "despensero"

  // Búsqueda material placa
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialFocus, setMaterialFocus] = useState(false);
  const [materialesDB, setMaterialesDB] = useState([]);

  // Búsqueda guías
  const [guiasSearch, setGuiasSearch] = useState("");
  const [guiasFocus, setGuiasFocus] = useState(false);
  const [guiasDB, setGuiasDB] = useState([]);

  // Cargar materiales/guías al montar
  useEffect(() => {
    authFetch(`${API}/articulos/por-familia?familia=placas`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMaterialesDB(data); })
      .catch(() => {});
    authFetch(`${API}/articulos/por-familia?familia=guias`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setGuiasDB(data); })
      .catch(() => {});
  }, []);

  const materialesFiltrados = materialesDB
    .filter(
      (m) =>
        (m.articulo ?? m.ARTICULO ?? "").toLowerCase().includes(materialSearch.toLowerCase()) ||
        (m.nombreart ?? m.NOMBREART ?? "").toLowerCase().includes(materialSearch.toLowerCase()),
    )
    .slice(0, 12);

  const guiasFiltradas = guiasDB
    .filter(
      (g) =>
        (g.articulo ?? g.ARTICULO ?? "").toLowerCase().includes(guiasSearch.toLowerCase()) ||
        (g.nombreart ?? g.NOMBREART ?? "").toLowerCase().includes(guiasSearch.toLowerCase()),
    )
    .slice(0, 12);

  // Inicializar medidas y navegar
  const irAMedidas = (tipoElegido, modelo = null) => {
    setTipo(tipoElegido);
    setMedidas(MEDIDAS_INIT);
    setMaterialSearch("");
    setGuiasSearch("");
    if (tipoElegido === "vanitory") {
      setVanitoryModelo(modelo);
      setVanitoryVista("medidas");
    } else {
      setVista(tipoElegido);
    }
  };

  // ── SELECTOR ─────────────────────────────────────────────
  if (vista === "selector") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 12,
          padding: "24px 0",
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "#6699bb",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Seleccionar tipo de especial
        </span>
        {[
          { key: "vanitory", icon: "🚿", label: "Vanitory" },
          { key: "escritorio", icon: "🖥️", label: "Escritorio" },
          { key: "despensero", icon: "🗄️", label: "Despensero" },
          { key: "wallpanel", icon: null, label: "Wall Panel" },
        ].map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => {
              if (key === "vanitory") {
                setVista("vanitory");
                setVanitoryVista("tipos");
              } else if (key === "despensero") {
                setTipo("despensero");
                setDespenseroVista("tipos");
                setDespenseroModelo(null);
                setVista("despensero");
              } else {
                setTipo(key);
                setMedidas(MEDIDAS_INIT);
                setMaterialSearch("");
                setGuiasSearch("");
                setVista(key);
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 28px",
              background: "#fff",
              border: "1px solid #b8cfe0",
              borderRadius: 3,
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              color: "#0a3a5c",
              cursor: "pointer",
              minWidth: 220,
              transition: "all 0.12s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#ddeefa";
              e.currentTarget.style.borderColor = "#7aaac8";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "#b8cfe0";
            }}
          >
            {key === "wallpanel" ? (
              <img
                src={WALLPANEL_IMG}
                alt="Wall Panel"
                style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 4 }}
              />
            ) : (
              <span style={{ fontSize: 22 }}>{icon}</span>
            )}
            {label}
          </button>
        ))}
      </div>
    );
  }

  // ── VANITORY: TIPOS ──────────────────────────────────────
  if (vista === "vanitory" && vanitoryVista === "tipos") {
    return (
      <TiposVanitory
        tiposVanitory={tiposVanitory}
        selected={null}
        modal={null}
        {...tiposVanitoryRUD}
        modoSelector={true}
        onArmar={(modelo) => {
          setVanitoryModelo(modelo);
          setVanitoryVista("presupuesto");
        }}
        onPrueba={() => setVanitoryVista("breakdown")}
        onVolver={() => {
          setVista("selector");
          setVanitoryVista("tipos");
          setVanitoryModelo(null);
        }}
      />
    );
  }

  // ── VANITORY: ARMAR ──────────────────────────────────────
  if (vista === "vanitory" && vanitoryVista === "armar") {
    return (
      <ArmarVanitory
        modelo={vanitoryModelo}
        onVolver={() => {
          setVanitoryVista("tipos");
          setVanitoryModelo(null);
        }}
      />
    );
  }

  // ── VANITORY: BREAKDOWN ──────────────────────────────────
  if (vista === "vanitory" && vanitoryVista === "breakdown") {
    return (
      <BreakdownFormulasVanitory onVolver={() => setVanitoryVista("tipos")} />
    );
  }

  // ── VANITORY: MEDIDAS ────────────────────────────────────
  if (vista === "vanitory" && vanitoryVista === "medidas") {
    return (
      <EspecialesMedidasForm
        tipo="vanitory"
        icono="🚿"
        titulo={vanitoryModelo ? `Vanitory — ${vanitoryModelo}` : "Vanitory"}
        medidas={medidas}
        setMedidas={setMedidas}
        materialSearch={materialSearch}
        setMaterialSearch={setMaterialSearch}
        materialFocus={materialFocus}
        setMaterialFocus={setMaterialFocus}
        materialesFiltrados={materialesFiltrados}
        guiasSearch={guiasSearch}
        setGuiasSearch={setGuiasSearch}
        guiasFocus={guiasFocus}
        setGuiasFocus={setGuiasFocus}
        guiasFiltradas={guiasFiltradas}
        onVolver={() => {
          setVanitoryVista("tipos");
          setVanitoryModelo(null);
        }}
        onContinuar={() => setVanitoryVista("armar")}
      />
    );
  }

  // ── VANITORY: PRESUPUESTO ────────────────────────────────
  if (vista === "vanitory" && vanitoryVista === "presupuesto") {
    return (
      <PresupuestoVanitory
        modelo={vanitoryModelo}
        numeroPres={numeroPres}
        cliente={cliente}
        codcliente={codcliente}
        revision={revision}
        onGuardado={(data) => {
          if (!data) return;
          const vtablaId = data.vtabla ?? data.id ?? null;
          const presv =
            data.presv ??
            (vtablaId != null ? `V${String(vtablaId).padStart(5, "0")}` : null);
          agregarAPresupuesto?.({
            id: `vanitory-${vtablaId ?? Date.now()}`,
            seccion: "Vanitory",
            descripcion: `Vanitory ${data.vmodelo ?? "Personalizado"}`,
            nombreart: `${data.vmodelo ?? ""} ${data.vancho}x${data.valto}x${data.vprofundidad}cm`,
            cantidad: Number(data.cantidad ?? 1),
            precio: Number(data.vprecio ?? 0),
            subtotal: Number(data.vprecio ?? 0),
            ancho: data.vancho ?? null,
            alto: data.valto ?? null,
            tabla: "V",
            vtabla: vtablaId != null ? Number(vtablaId) : null,
            presv,
          });
        }}
        onVolver={() => {
          setVanitoryVista("tipos");
          setVanitoryModelo(null);
        }}
      />
    );
  }

  // ── WALL PANEL ───────────────────────────────────────────
  if (vista === "wallpanel") {
    return <PresupuestoWallPanel onVolver={() => setVista("selector")} />;
  }

  // ── ESCRITORIO: MEDIDAS ──────────────────────────────────
  if (vista === "escritorio") {
    return (
      <EspecialesMedidasForm
        tipo="escritorio"
        icono="🖥️"
        titulo="Escritorio"
        medidas={medidas}
        setMedidas={setMedidas}
        materialSearch={materialSearch}
        setMaterialSearch={setMaterialSearch}
        materialFocus={materialFocus}
        setMaterialFocus={setMaterialFocus}
        materialesFiltrados={materialesFiltrados}
        guiasSearch={guiasSearch}
        setGuiasSearch={setGuiasSearch}
        guiasFocus={guiasFocus}
        setGuiasFocus={setGuiasFocus}
        guiasFiltradas={guiasFiltradas}
        onVolver={() => setVista("selector")}
        onContinuar={() => {
          // TODO: navegar a pantalla de armado de escritorio cuando esté disponible
          alert(
            `Escritorio cargado:\nAncho: ${medidas.ancho}cm | Alto: ${medidas.alto}cm | Prof: ${medidas.profundidad}cm\nPlaca: ${medidas.materialPlaca} | Guías: ${medidas.guias}`,
          );
        }}
      />
    );
  }

  // ── DESPENSERO: TIPOS ────────────────────────────────────
  if (vista === "despensero" && despenseroVista === "tipos") {
    if (tiposDespensero.length === 0) {
      return (
        <div
          style={{
            fontFamily: "'Space Mono',monospace",
            padding: "40px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <span style={{ fontSize: 48 }}>🗄️</span>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#0a3a5c",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            No hay tipos de despensero cargados
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#6699bb",
              textAlign: "center",
              maxWidth: 340,
            }}
          >
            Primero cargá los modelos desde la tabla de administración y luego volvé para armar el presupuesto.
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              onClick={() => {
                setVista("selector");
                setDespenseroVista("tipos");
                setDespenseroModelo(null);
              }}
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
              ← Volver
            </button>
            <button
              onClick={() => onVerTabla && onVerTabla("despensero-tipos")}
              style={{
                padding: "8px 24px",
                background: "#2ec4b6",
                color: "#fff",
                border: "none",
                borderRadius: 2,
                fontFamily: "'Space Mono',monospace",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.04em",
              }}
            >
              🗄️ Ir a Tipos de Despensero →
            </button>
          </div>
        </div>
      );
    }

    return (
      <TiposDespensero
        tiposDespensero={tiposDespensero}
        selected={null}
        modal={null}
        {...tiposDespenseroRUD}
        modoSelector={true}
        onArmar={(modelo) => {
          setDespenseroModelo(modelo);
          setDespenseroVista("presupuesto");
        }}
        onVolver={() => {
          setVista("selector");
          setDespenseroVista("tipos");
          setDespenseroModelo(null);
        }}
      />
    );
  }

  // ── DESPENSERO: PRESUPUESTO ──────────────────────────────
  if (vista === "despensero" && despenseroVista === "presupuesto") {
    return (
      <PresupuestoDespensero
        modelo={despenseroModelo}
        onVolver={() => {
          setDespenseroVista("tipos");
          setDespenseroModelo(null);
        }}
      />
    );
  }

  return null;
}
