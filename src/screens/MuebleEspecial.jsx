import { useState, useEffect, useRef } from "react";

const API = "http://https://integral-backend-production.up.railway.app";

const EMPTY = {
  ancho: "100",
  alto: "50",
  profundidad: "50",
  // Placa color: nombre + precio (igual que form.material en Vanitory)
  material: "", // nombre de la placa COLOR elegida
  materialPrecio: 0,
  // Placa blanco: nombre + precio (igual que form.materialBlanco en Vanitory)
  materialBlanco: "",
  materialBlancoPrecio: 0,
  // Tipo por parte: "COLOR" | "BLANCO" | "SIN"
  lat_izq: "COLOR",
  lat_der: "COLOR",
  techo: "COLOR",
  piso: "COLOR",
  // Herrajes
  bisagra_id: null,
  guia_id: null,
  intermedios: "",
  // Cajones
  cajon1_ancho: "0",
  cajon1_alto: "0",
  cajon1_cantidad: "0",
  cajon2_ancho: "0",
  cajon2_alto: "0",
  cajon2_cantidad: "0",
  cajon3_ancho: "0",
  cajon3_alto: "0",
  cajon3_cantidad: "0",
  // Puertas
  puerta1_ancho: "0",
  puerta1_alto: "0",
  puerta1_cantidad: "0",
  puerta2_ancho: "0",
  puerta2_alto: "0",
  puerta2_cantidad: "0",
  puerta3_ancho: "0",
  puerta3_alto: "0",
  puerta3_cantidad: "0",
  // Mano de obra por fórmula (slot 1..10)
  mo_form1: 0,
  mo_form2: 0,
  mo_form3: 0,
  mo_form4: 0,
  mo_form5: 0,
  mo_form6: 0,
  mo_form7: 0,
  mo_form8: 0,
  mo_form9: 0,
  mo_form10: 0,
  // Expresión de mano de obra (texto libre evaluable)
  mo_expr1: "",
  mo_expr2: "",
  mo_expr3: "",
  mo_expr4: "",
  mo_expr5: "",
  mo_expr6: "",
  mo_expr7: "",
  mo_expr8: "",
  mo_expr9: "",
  mo_expr10: "",
};

// ── Dropdown autocomplete — idéntico al de material/materialBlanco en Vanitory
function PlacaDropdown({
  label,
  emoji,
  nombreKey,
  precioKey,
  form,
  setForm,
  opciones,
  cargando,
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const nombre = form[nombreKey];
  const precio = form[precioKey];

  const filtradas = opciones.filter(
    (p) =>
      !search ||
      (p.articulo ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.codartint ?? p.codart ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const formatPrecio = (n) =>
    n > 0 ? `$${Number(n).toLocaleString("es-AR")}` : "";

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#6699bb",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          display: "block",
          marginBottom: 6,
        }}
      >
        {emoji} {label}
        {nombre && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 10,
              color: "#2563eb",
              fontWeight: 600,
            }}
          >
            {formatPrecio(precio)}
          </span>
        )}
      </label>

      {cargando ? (
        <div
          style={{
            fontSize: 12,
            color: "#4a8ab5",
            fontStyle: "italic",
            padding: "10px 0",
          }}
        >
          ⏳ Cargando...
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              style={{
                flex: 1,
                padding: "9px 12px",
                borderRadius: 6,
                border: "1.5px solid #b8cfe0",
                fontSize: 13,
                outline: "none",
                background: "#fff",
                color: "#0a3a5c",
                fontFamily: "inherit",
                transition: "border-color 0.2s",
              }}
              placeholder="Escribí para buscar placa..."
              value={search !== "" || open ? search : nombre}
              onFocus={() => {
                setSearch("");
                setOpen(true);
              }}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
              }}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {nombre && (
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, [nombreKey]: "", [precioKey]: 0 }));
                  setSearch("");
                }}
                style={{
                  padding: "0 10px",
                  height: 38,
                  borderRadius: 6,
                  border: "1.5px solid #d0dde8",
                  background: "#f5f8fa",
                  color: "#c0392b",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                }}
                title="Quitar placa"
              >
                ✕
              </button>
            )}
          </div>

          {open && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 999,
                background: "#fff",
                border: "1px solid #b8d6ef",
                borderRadius: 6,
                boxShadow: "0 4px 18px rgba(0,40,80,0.13)",
                maxHeight: 220,
                overflowY: "auto",
                marginTop: 2,
              }}
            >
              <div
                style={{
                  padding: "9px 14px",
                  fontSize: 12,
                  color: "#6a8aa0",
                  cursor: "pointer",
                  borderBottom: "1px solid #e8f0f7",
                }}
                onMouseDown={() => {
                  setForm((f) => ({ ...f, [nombreKey]: "", [precioKey]: 0 }));
                  setSearch("");
                  setOpen(false);
                }}
              >
                — Sin placa —
              </div>
              {filtradas.slice(0, 60).map((p, i) => {
                const pu = parseFloat(p.precio_un ?? p.precio ?? 0);
                const codart = p.codartint ?? p.codart ?? "";
                return (
                  <div
                    key={p.id ?? codart ?? i}
                    style={{
                      padding: "9px 14px",
                      fontSize: 13,
                      cursor: "pointer",
                      background:
                        nombre === p.articulo ? "#e8f4fb" : "transparent",
                      borderBottom: "1px solid #f0f5fa",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    onMouseDown={() => {
                      setForm((f) => ({
                        ...f,
                        [nombreKey]: p.articulo,
                        [precioKey]: pu,
                      }));
                      setSearch("");
                      setOpen(false);
                    }}
                    onMouseEnter={(e) => {
                      if (nombre !== p.articulo)
                        e.currentTarget.style.background = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      if (nombre !== p.articulo)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span>
                      {codart && (
                        <span
                          style={{
                            color: "#4a8ab5",
                            fontFamily: "monospace",
                            marginRight: 6,
                            fontSize: 11,
                          }}
                        >
                          [{codart}]
                        </span>
                      )}
                      {p.articulo}
                    </span>
                    {pu > 0 && (
                      <span
                        style={{
                          color: "#2563eb",
                          fontWeight: 700,
                          fontSize: 12,
                          marginLeft: 8,
                          flexShrink: 0,
                        }}
                      >
                        ${pu.toLocaleString("es-AR")}
                      </span>
                    )}
                  </div>
                );
              })}
              {filtradas.length === 0 && (
                <div
                  style={{
                    padding: "12px 14px",
                    fontSize: 12,
                    color: "#b0c0d0",
                    fontStyle: "italic",
                  }}
                >
                  Sin resultados
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Selector autocomplete para herrajes (bisagra / guía) ─────────────────────
function ArticuloSelect({ label, endpoint, value, onChange }) {
  const [opciones, setOpciones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setCargando(true);
    fetch(`${API}${endpoint}`)
      .then((r) => r.json())
      .then((data) => setOpciones(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [endpoint]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const seleccionado = opciones.find((o) => o.id === value);
  const filtradas = busqueda.trim()
    ? opciones.filter((o) =>
        o.articulo?.toLowerCase().includes(busqueda.toLowerCase()),
      )
    : opciones;

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        position: "relative",
      }}
    >
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#6699bb",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <div
        onClick={() => setAbierto((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 12px",
          borderRadius: 6,
          border: `1.5px solid ${abierto ? "#2563eb" : "#b8cfe0"}`,
          background: "#fff",
          cursor: "pointer",
          fontSize: 13,
          color: seleccionado ? "#0a3a5c" : "#94a3b8",
          minHeight: 38,
          userSelect: "none",
        }}
      >
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cargando
            ? "Cargando…"
            : seleccionado
              ? seleccionado.articulo
              : "Seleccionar…"}
        </span>
        {seleccionado && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            style={{
              fontSize: 14,
              color: "#94a3b8",
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="Limpiar"
          >
            ×
          </span>
        )}
        <span style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>▾</span>
      </div>

      {abierto && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "#fff",
            border: "1.5px solid #b8cfe0",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            maxHeight: 240,
            display: "flex",
            flexDirection: "column",
            marginTop: 4,
          }}
        >
          <div
            style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}
          >
            <input
              autoFocus
              type="text"
              placeholder="Buscar…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontSize: 13,
                color: "#0a3a5c",
                background: "transparent",
              }}
            />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtradas.length === 0 && (
              <div
                style={{ padding: "10px 12px", fontSize: 12, color: "#94a3b8" }}
              >
                Sin resultados
              </div>
            )}
            {filtradas.map((op) => (
              <div
                key={op.id}
                onClick={() => {
                  onChange(op.id);
                  setAbierto(false);
                  setBusqueda("");
                }}
                style={{
                  padding: "9px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                  background: op.id === value ? "#eff6ff" : "transparent",
                  color: op.id === value ? "#2563eb" : "#0a3a5c",
                  borderBottom: "1px solid #f1f5f9",
                }}
                onMouseEnter={(e) => {
                  if (op.id !== value)
                    e.currentTarget.style.background = "#f8fafc";
                }}
                onMouseLeave={(e) => {
                  if (op.id !== value)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                {op.articulo}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, unit = "cm", integer = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#6699bb",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="number"
          min="0"
          step={integer ? "1" : "0.1"}
          value={value}
          onChange={(e) =>
            onChange(
              integer ? String(parseInt(e.target.value) || "") : e.target.value,
            )
          }
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: 6,
            border: "1.5px solid #b8cfe0",
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
            background: "#fff",
            color: "#0a3a5c",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
          onBlur={(e) => (e.target.style.borderColor = "#b8cfe0")}
        />
        <span style={{ fontSize: 12, color: "#94a3b8", minWidth: 20 }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

function CajonSection({ num, form, setForm }) {
  const set = (key) => (val) =>
    setForm((f) => ({ ...f, [`cajon${num}_${key}`]: val }));
  const filled =
    form[`cajon${num}_ancho`] ||
    form[`cajon${num}_alto`] ||
    form[`cajon${num}_cantidad`];
  return (
    <div
      style={{
        background: filled ? "#f0f7ff" : "#f8fafc",
        border: `1.5px solid ${filled ? "#93c5fd" : "#e2e8f0"}`,
        borderRadius: 10,
        padding: "18px 20px",
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#0a3a5c",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            background: filled ? "#2563eb" : "#94a3b8",
            color: "#fff",
            borderRadius: "50%",
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {num}
        </span>
        CAJÓN {num}
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
      >
        <Field
          label="Ancho"
          value={form[`cajon${num}_ancho`]}
          onChange={set("ancho")}
        />
        <Field
          label="Alto"
          value={form[`cajon${num}_alto`]}
          onChange={set("alto")}
        />
        <Field
          label="Cantidad"
          value={form[`cajon${num}_cantidad`]}
          onChange={set("cantidad")}
          unit="u."
        />
      </div>
    </div>
  );
}

function PuertaSection({ num, form, setForm }) {
  const set = (key) => (val) =>
    setForm((f) => ({ ...f, [`puerta${num}_${key}`]: val }));
  const filled =
    form[`puerta${num}_ancho`] ||
    form[`puerta${num}_alto`] ||
    form[`puerta${num}_cantidad`];
  return (
    <div
      style={{
        background: filled ? "#f0f7ff" : "#f8fafc",
        border: `1.5px solid ${filled ? "#93c5fd" : "#e2e8f0"}`,
        borderRadius: 10,
        padding: "18px 20px",
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#0a3a5c",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            background: filled ? "#2563eb" : "#94a3b8",
            color: "#fff",
            borderRadius: "50%",
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {num}
        </span>
        PUERTA {num}
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
      >
        <Field
          label="Ancho"
          value={form[`puerta${num}_ancho`]}
          onChange={set("ancho")}
        />
        <Field
          label="Alto"
          value={form[`puerta${num}_alto`]}
          onChange={set("alto")}
        />
        <Field
          label="Cantidad"
          value={form[`puerta${num}_cantidad`]}
          onChange={set("cantidad")}
          unit="u."
          integer
        />
      </div>
    </div>
  );
}

export default function MuebleEspecial() {
  const [form, setForm] = useState(EMPTY);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [placas, setPlacas] = useState([]);
  const [cargandoPlacas, setCargandoPlacas] = useState(false);

  // ── Fórmulas (igual que PresupuestoVanitory) ──────────────────────────────
  const [slotsFormulas, setSlotsFormulas] = useState([]);
  const [totalSlots, setTotalSlots] = useState(0);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const preciosBD = useRef({});

  // ── Margen ────────────────────────────────────────────────────────────────
  const [margen, setMargen] = useState(0);
  const [margenBD, setMargenBD] = useState(null);

  // Cargar margen desde BD para codart ESPECIAL
  useEffect(() => {
    fetch(`${API}/margen/por-codart?codart=${encodeURIComponent("ESPECIAL")}`)
      .then((r) => r.json())
      .then((d) => {
        const row = Array.isArray(d) ? d[0] : d;
        if (!row) {
          setMargenBD(null);
          return;
        }
        let raw = NaN;
        for (const k of Object.keys(row)) {
          if (/margen|margin/i.test(k)) {
            const v = parseFloat(row[k]);
            if (!isNaN(v)) {
              raw = v;
              break;
            }
          }
        }
        if (isNaN(raw)) {
          setMargenBD(null);
          return;
        }
        // BD guarda multiplicador (1.30 = 30%) o porcentaje directo (>10)
        const m =
          raw > 10
            ? Math.round(raw * 100) / 100
            : Math.round((raw - 1) * 10000) / 100;
        setMargenBD(m);
        setMargen(m);
      })
      .catch(() => setMargenBD(null));
  }, []);

  // ── Colocación ────────────────────────────────────────────────────────────
  const [colocacionModo, setColocacionModo] = useState("valor"); // "valor" | "porcentaje"
  const [colocacionValor, setColocacionValor] = useState(0);
  const [colocacionPct, setColocacionPct] = useState(0);
  const [colocacionBD, setColocacionBD] = useState(null); // { valor, porcentaje }

  useEffect(() => {
    fetch(`${API}/colocacion/buscar?codart=${encodeURIComponent("ESPECIAL")}`)
      .then((r) => r.json())
      .then((d) => {
        const row = Array.isArray(d) ? d[0] : d;
        if (!row) {
          setColocacionBD(null);
          return;
        }
        const val = parseFloat(
          row.precio ?? row.PRECIO ?? row.valor ?? row.VALOR ?? NaN,
        );
        const pct = parseFloat(
          row.porcentaje ?? row.PORCENTAJE ?? row.pct ?? NaN,
        );
        const bd = {
          valor: isNaN(val) ? null : val,
          porcentaje: isNaN(pct) ? null : pct,
        };
        setColocacionBD(bd);
        // Precargar el modo y valor que tenga dato
        if (bd.valor !== null) {
          setColocacionModo("valor");
          setColocacionValor(bd.valor);
        } else if (bd.porcentaje !== null) {
          setColocacionModo("porcentaje");
          setColocacionPct(bd.porcentaje);
        }
      })
      .catch(() => setColocacionBD(null));
  }, []);
  useEffect(() => {
    setCargandoPlacas(true);
    fetch(`${API}/productos/placas-muebles-esp`)
      .then((r) => r.json())
      .then((data) => {
        const norm = (p) => ({
          ...p,
          articulo: p.articulo ?? p.ARTICULO ?? "",
          codartint: p.codartint ?? p.CODARTINT ?? p.codart ?? "",
          precio: parseFloat(p.precio_un ?? p.precio ?? 0) || 0,
          precio_un: parseFloat(p.precio_un ?? p.precio ?? 0) || 0,
        });
        setPlacas(Array.isArray(data) ? data.map(norm) : []);
      })
      .catch(() => {})
      .finally(() => setCargandoPlacas(false));
  }, []);

  // ── Helpers de evaluación ─────────────────────────────────────────────────
  const evalExpr = (expr, vars) => {
    if (!expr || !expr.trim()) return null;
    try {
      let e = expr;
      Object.entries(vars).forEach(([k, v]) => {
        e = e.replace(new RegExp(`\\b${k}\\b`, "gi"), v);
      });
      // eslint-disable-next-line no-new-func
      const r = new Function(`"use strict"; return (${e});`)();
      return isNaN(r) || !isFinite(r) ? 0 : Math.round(r * 100) / 100;
    } catch {
      return 0;
    }
  };

  const makeVars = (f) => ({
    ancho: Number(f.ancho) || 0,
    alto: Number(f.alto) || 0,
    profundo: Number(f.profundidad) || 0,
    profundidad: Number(f.profundidad) || 0,
    precio_material: Number(f.materialPrecio) || 0,
    precio_lateral_izq:
      f.lat_izq === "COLOR"
        ? Number(f.materialPrecio) || 0
        : f.lat_izq === "BLANCO"
          ? Number(f.materialBlancoPrecio) || 0
          : 0,
    precio_lateral_der:
      f.lat_der === "COLOR"
        ? Number(f.materialPrecio) || 0
        : f.lat_der === "BLANCO"
          ? Number(f.materialBlancoPrecio) || 0
          : 0,
    precio_techo:
      f.techo === "COLOR"
        ? Number(f.materialPrecio) || 0
        : f.techo === "BLANCO"
          ? Number(f.materialBlancoPrecio) || 0
          : 0,
    precio_base:
      f.piso === "COLOR"
        ? Number(f.materialPrecio) || 0
        : f.piso === "BLANCO"
          ? Number(f.materialBlancoPrecio) || 0
          : 0,
    // Cajones
    cajon1_ancho: Number(f.cajon1_ancho) || 0,
    cajon1_alto: Number(f.cajon1_alto) || 0,
    cajon1_cantidad: Number(f.cajon1_cantidad) || 0,
    cajon2_ancho: Number(f.cajon2_ancho) || 0,
    cajon2_alto: Number(f.cajon2_alto) || 0,
    cajon2_cantidad: Number(f.cajon2_cantidad) || 0,
    cajon3_ancho: Number(f.cajon3_ancho) || 0,
    cajon3_alto: Number(f.cajon3_alto) || 0,
    cajon3_cantidad: Number(f.cajon3_cantidad) || 0,
    // Puertas
    puerta1_ancho: Number(f.puerta1_ancho) || 0,
    puerta1_alto: Number(f.puerta1_alto) || 0,
    puerta1_cantidad: Number(f.puerta1_cantidad) || 0,
    puerta2_ancho: Number(f.puerta2_ancho) || 0,
    puerta2_alto: Number(f.puerta2_alto) || 0,
    puerta2_cantidad: Number(f.puerta2_cantidad) || 0,
    puerta3_ancho: Number(f.puerta3_ancho) || 0,
    puerta3_alto: Number(f.puerta3_alto) || 0,
    puerta3_cantidad: Number(f.puerta3_cantidad) || 0,
    ...preciosBD.current,
  });

  // ── Cargar fórmulas cuando se monta el componente ─────────────────────────
  // MuebleEspecial no tiene un "modelo con codart" fijo, pero carga las fórmulas
  // del código especial "MUEBLE_ESP" (ajustá este valor al codart real de tu BD).
  const CODART_ESP = "ESPECIAL";

  useEffect(() => {
    setCargandoSlots(true);

    const VARS_FORM = new Set([
      "material",
      "base",
      "mano_obra",
      "manoobra",
      "vidrio",
    ]);
    const extraerCodarts = (expr) => {
      if (!expr) return [];
      const matches = [...expr.matchAll(/precio_([A-Z0-9]+)/gi)];
      return matches
        .map((m) => m[1])
        .filter((cod) => !VARS_FORM.has(cod.toLowerCase()));
    };

    Promise.all([
      fetch(`${API}/asociaciones-form?codart=${encodeURIComponent(CODART_ESP)}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch(`${API}/formulas`)
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(async ([asocData, allFormulas]) => {
        const todos = Array.isArray(asocData)
          ? asocData
          : asocData
            ? [asocData]
            : [];
        const row =
          todos.find(
            (a) =>
              (a.codart ?? a.CODART ?? "").toUpperCase() ===
              CODART_ESP.toUpperCase(),
          ) ?? null;
        if (!row) {
          setSlotsFormulas([]);
          setTotalSlots(0);
          return;
        }

        const formulasMap = {};
        (Array.isArray(allFormulas) ? allFormulas : []).forEach((f) => {
          const cod = f.codform ?? f.CODFORM ?? "";
          if (cod) formulasMap[cod.toUpperCase()] = f;
        });

        const slotsRaw = [];
        for (let i = 1; i <= 10; i++) {
          const codform = row[`codf${i}`] ?? row[`CODF${i}`] ?? null;
          const expresion = row[`form${i}`] ?? row[`FORM${i}`] ?? null;
          if (!codform && !expresion) continue;
          const fDef = codform ? formulasMap[codform.toUpperCase()] : null;
          const nombre = fDef
            ? (fDef.articulo ??
              fDef.ARTICULO ??
              fDef.nombre ??
              fDef.NOMBRE ??
              fDef.descripcion ??
              codform)
            : (codform ?? `Fórmula ${i}`);
          const exprFinal =
            (fDef
              ? (fDef.formula ?? fDef.FORMULA ?? fDef.expresion ?? "")
              : "") ||
            expresion ||
            "";
          slotsRaw.push({ codform, nombre, expresion: exprFinal, slot: i });
        }

        // Precios BD desde expresiones
        const todasExpresiones = slotsRaw.map((s) => s.expresion).join(" ");
        const codartsBD = [...new Set(extraerCodarts(todasExpresiones))];
        const nuevosPrecios = {};
        await Promise.all(
          codartsBD.map(async (cod) => {
            try {
              const res = await fetch(
                `${API}/articulos/${encodeURIComponent(cod)}`,
              );
              const data = await res.json();
              const r2 = Array.isArray(data) ? data[0] : data;
              let precio = NaN;
              for (const campo of [
                "PRECIO1",
                "precio1",
                "PRECIO",
                "precio",
                "PREC1",
                "prec1",
                "COSTO",
                "costo",
                "VALOR",
                "valor",
              ]) {
                const v = parseFloat(r2?.[campo]);
                if (!isNaN(v) && v > 0) {
                  precio = v;
                  break;
                }
              }
              if (isNaN(precio) && r2) {
                for (const k of Object.keys(r2)) {
                  if (/prec|price|cost|valor/i.test(k)) {
                    const v = parseFloat(r2[k]);
                    if (!isNaN(v) && v > 0) {
                      precio = v;
                      break;
                    }
                  }
                }
              }
              if (!isNaN(precio)) nuevosPrecios[`precio_${cod}`] = precio;
            } catch (e) {
              /* ignorar */
            }
          }),
        );
        preciosBD.current = { ...preciosBD.current, ...nuevosPrecios };

        const vars = makeVars(form);
        const slots = slotsRaw.map((s) => ({
          ...s,
          resultado: evalExpr(s.expresion, vars),
        }));
        const suma = slots.reduce((a, s) => a + (s.resultado ?? 0), 0);
        setSlotsFormulas(slots);
        setTotalSlots(Math.round(suma * 100) / 100);
      })
      .finally(() => setCargandoSlots(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-evaluar cuando cambian dimensiones o materiales ────────────────────
  useEffect(() => {
    if (!slotsFormulas.length) return;
    const vars = makeVars(form);
    const actualizados = slotsFormulas.map((s) => ({
      ...s,
      resultado: evalExpr(s.expresion, vars),
    }));
    const suma = actualizados.reduce((a, s) => a + (s.resultado ?? 0), 0);
    setSlotsFormulas(actualizados);
    setTotalSlots(Math.round(suma * 100) / 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.ancho,
    form.alto,
    form.profundidad,
    form.materialPrecio,
    form.materialBlancoPrecio,
    form.lat_izq,
    form.lat_der,
    form.techo,
    form.piso,
    form.cajon1_ancho,
    form.cajon1_alto,
    form.cajon1_cantidad,
    form.cajon2_ancho,
    form.cajon2_alto,
    form.cajon2_cantidad,
    form.cajon3_ancho,
    form.cajon3_alto,
    form.cajon3_cantidad,
    form.puerta1_ancho,
    form.puerta1_alto,
    form.puerta1_cantidad,
    form.puerta2_ancho,
    form.puerta2_alto,
    form.puerta2_cantidad,
    form.puerta3_ancho,
    form.puerta3_alto,
    form.puerta3_cantidad,
  ]);

  // ── Re-evaluar expresiones de mano de obra cuando cambian dimensiones ────
  useEffect(() => {
    if (!slotsFormulas.length) return;
    const updates = {};
    let changed = false;
    for (let i = 1; i <= 10; i++) {
      const exprKey = `mo_expr${i}`;
      const moKey = `mo_form${i}`;
      const expr = form[exprKey];
      if (!expr || !expr.trim()) continue;
      // Re-evalúa con vars actuales
      const vars = makeVars(form);
      let e = expr.trim().replace(/^\$/, "");
      if (!/^[\d.]+$/.test(e)) {
        try {
          Object.entries(vars).forEach(([k, v]) => {
            e = e.replace(new RegExp(`\\b${k}\\b`, "gi"), v);
          });
          // eslint-disable-next-line no-new-func
          const r = new Function(`"use strict"; return (${e});`)();
          const res = isNaN(r) || !isFinite(r) ? 0 : Math.round(r * 100) / 100;
          if (res !== form[moKey]) {
            updates[moKey] = res;
            changed = true;
          }
        } catch {
          /* expr inválida, no actualizar */
        }
      }
    }
    if (changed) setForm((f) => ({ ...f, ...updates }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.ancho,
    form.alto,
    form.profundidad,
    form.materialPrecio,
    form.materialBlancoPrecio,
    form.cajon1_ancho,
    form.cajon1_alto,
    form.cajon1_cantidad,
    form.cajon2_ancho,
    form.cajon2_alto,
    form.cajon2_cantidad,
    form.cajon3_ancho,
    form.cajon3_alto,
    form.cajon3_cantidad,
    form.puerta1_ancho,
    form.puerta1_alto,
    form.puerta1_cantidad,
    form.puerta2_ancho,
    form.puerta2_alto,
    form.puerta2_cantidad,
    form.puerta3_ancho,
    form.puerta3_alto,
    form.puerta3_cantidad,
    slotsFormulas.length,
  ]);

  const set = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setGuardado(false);
    setError(null);
  };
  const setId = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setGuardado(false);
    setError(null);
  };

  const handleLimpiar = () => {
    setForm(EMPTY);
    setGuardado(false);
    setError(null);
  };

  const handleGuardar = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API}/muebles-esp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Error ${res.status}`);
      }
      const data = await res.json();
      console.log("[MuebleEspecial] guardado:", data);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  // ── Totales (mismo patrón que Vanitory) ──────────────────────────────────
  const baseMargen = totalSlots;
  const totalMargen = (baseMargen * (Number(margen) || 0)) / 100;
  const totalManoObra = slotsFormulas.reduce((sum, slot) => {
    const moKey = `mo_form${slot.slot}`;
    return sum + (Number(form[moKey]) || 0);
  }, 0);
  const subtotal = baseMargen + totalMargen + totalManoObra;
  const totalColocacion =
    colocacionModo === "porcentaje"
      ? (subtotal * (Number(colocacionPct) || 0)) / 100
      : Number(colocacionValor) || 0;
  const total = subtotal + totalColocacion;

  const formatPeso = (n) =>
    "$" + Number(n).toLocaleString("es-AR").replace(/,/g, ".");

  const tieneAlgo = Object.entries(form).some(([k, v]) =>
    ["bisagra_id", "guia_id"].includes(k) ? v !== null : v !== "" && v !== 0,
  );

  const PARTES = [
    { label: "LATERAL IZQUIERDO", key: "lat_izq" },
    { label: "LATERAL DERECHO", key: "lat_der" },
    { label: "TECHO", key: "techo" },
    { label: "PISO", key: "piso" },
  ];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#0a3a5c",
            fontFamily: "Syne, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          🪚 Mueble Especial
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#6699bb",
            letterSpacing: 3,
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          Ingresá las medidas del mueble y sus cajones
        </div>
      </div>

      {/* Medidas */}
      <div
        style={{
          background: "#fff",
          border: "1.5px solid #b8cfe0",
          borderRadius: 12,
          padding: "22px 24px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#0a3a5c",
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          📐 Medidas del mueble
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}
        >
          <Field label="Ancho" value={form.ancho} onChange={set("ancho")} />
          <Field label="Alto" value={form.alto} onChange={set("alto")} />
          <Field
            label="Profundidad"
            value={form.profundidad}
            onChange={set("profundidad")}
          />
        </div>
      </div>

      {/* Placas + Laterales y base */}
      <div
        style={{
          background: "#fff",
          border: "1.5px solid #b8cfe0",
          borderRadius: 12,
          padding: "22px 24px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#0a3a5c",
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          🎨 Placas y partes
        </div>

        {/* Placa COLOR — idéntico al dropdown de MATERIAL en Vanitory */}
        <div style={{ marginBottom: 16 }}>
          <PlacaDropdown
            label="Placa Color"
            emoji="🪵"
            nombreKey="material"
            precioKey="materialPrecio"
            form={form}
            setForm={setForm}
            opciones={placas}
            cargando={cargandoPlacas}
          />
        </div>

        {/* Placa BLANCO — idéntico al dropdown de MATERIAL BLANCO en Vanitory */}
        <div style={{ marginBottom: 20 }}>
          <PlacaDropdown
            label="Placa Blanco"
            emoji="🪵"
            nombreKey="materialBlanco"
            precioKey="materialBlancoPrecio"
            form={form}
            setForm={setForm}
            opciones={placas}
            cargando={cargandoPlacas}
          />
        </div>

        {/* Selector COLOR / BLANCO / SIN por parte — idéntico a Laterales y Base de Vanitory */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PARTES.map(({ label, key }) => (
            <div
              key={key}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "#6a8aa0",
                  width: 148,
                  flexShrink: 0,
                }}
              >
                {label}
              </span>
              <select
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  border: "1.5px solid #b8cfe0",
                  fontSize: 13,
                  fontFamily: "inherit",
                  background: "#fff",
                  color: "#0a3a5c",
                  outline: "none",
                }}
              >
                <option value="COLOR">COLOR</option>
                <option value="BLANCO">BLANCO</option>
                <option value="SIN">SIN</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Herrajes */}
      <div
        style={{
          background: "#fff",
          border: "1.5px solid #b8cfe0",
          borderRadius: 12,
          padding: "22px 24px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#0a3a5c",
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          🔩 Herrajes
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}
        >
          <ArticuloSelect
            label="Bisagra"
            endpoint="/productos/bisagras-muebles-esp"
            value={form.bisagra_id}
            onChange={setId("bisagra_id")}
          />
          <ArticuloSelect
            label="Guía telescópica"
            endpoint="/productos/guias-muebles-esp"
            value={form.guia_id}
            onChange={setId("guia_id")}
          />
          <Field
            label="Intermedios"
            value={form.intermedios}
            onChange={set("intermedios")}
            unit="u."
            integer
          />
        </div>
      </div>

      {/* Cajones */}
      <div
        style={{
          background: "#fff",
          border: "1.5px solid #b8cfe0",
          borderRadius: 12,
          padding: "22px 24px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#0a3a5c",
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          🗂 Cajones
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <CajonSection num={1} form={form} setForm={setForm} />
          <CajonSection num={2} form={form} setForm={setForm} />
          <CajonSection num={3} form={form} setForm={setForm} />
        </div>
      </div>

      {/* Puertas */}
      <div
        style={{
          background: "#fff",
          border: "1.5px solid #b8cfe0",
          borderRadius: 12,
          padding: "22px 24px",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#0a3a5c",
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          🚪 Puertas
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <PuertaSection num={1} form={form} setForm={setForm} />
          <PuertaSection num={2} form={form} setForm={setForm} />
          <PuertaSection num={3} form={form} setForm={setForm} />
        </div>
      </div>

      {/* ── Fórmulas asociadas ── */}
      <div
        style={{
          background: "#f4f8fb",
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 20,
          border: "1px solid #e0eaf2",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#0f2944",
            borderRadius: 7,
            padding: "9px 14px",
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#fff",
            }}
          >
            🧮 Fórmulas
          </span>
          {cargandoSlots && (
            <span
              style={{ fontSize: 11, color: "#7ab2d4", fontStyle: "italic" }}
            >
              ⏳ Calculando...
            </span>
          )}
          {!cargandoSlots && slotsFormulas.length > 0 && (
            <span
              style={{
                fontSize: 11,
                color: "#7ab2d4",
                letterSpacing: "0.08em",
              }}
            >
              {slotsFormulas.length} ítem{slotsFormulas.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {!cargandoSlots && slotsFormulas.length === 0 && (
          <p
            style={{
              fontSize: 12,
              color: "#8aabb8",
              fontStyle: "italic",
              padding: "6px 2px",
            }}
          >
            Sin fórmulas asociadas para este mueble.
          </p>
        )}

        {/* Slots */}
        {slotsFormulas.map((slot, i) => {
          const slotNum = slot.slot ?? i + 1;
          const moKey = `mo_form${slotNum}`;
          const exprKey = `mo_expr${slotNum}`;
          const exprVal = form[exprKey] ?? "";
          const moVal = Number(form[moKey]) || 0;

          // Evalúa la expresión usando las mismas vars del form
          const evalMO = (expr) => {
            if (!expr || !expr.trim()) return 0;
            const pure = expr.trim().replace(/^\$/, "");
            // Si es número puro, devolverlo directo
            if (/^[\d.]+$/.test(pure)) return Number(pure) || 0;
            try {
              const vars = makeVars(form);
              let e = pure;
              Object.entries(vars).forEach(([k, v]) => {
                e = e.replace(new RegExp(`\\b${k}\\b`, "gi"), v);
              });
              // eslint-disable-next-line no-new-func
              const r = new Function(`"use strict"; return (${e});`)();
              return isNaN(r) || !isFinite(r) ? 0 : Math.round(r * 100) / 100;
            } catch {
              return null;
            }
          };

          const moEvaluado = evalMO(exprVal);
          const esError = exprVal.trim() !== "" && moEvaluado === null;

          return (
            <div
              key={slotNum}
              style={{
                background: "#fff",
                borderRadius: 7,
                border: "1px solid #e0eaf2",
                marginBottom: 7,
                padding: "10px 12px",
              }}
            >
              {/* Encabezado fórmula */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#0f2944",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {slot.nombre}
                  </div>
                  {slot.codform && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "#4a8ab5",
                        fontFamily: "monospace",
                        marginTop: 2,
                        letterSpacing: "0.04em",
                      }}
                    >
                      #{slot.codform}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: slot.resultado > 0 ? "#0f2944" : "#b0c8d8",
                    minWidth: 100,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {slot.resultado != null ? formatPeso(slot.resultado) : "—"}
                </div>
              </div>

              {/* Expresión de la fórmula */}
              {slot.expresion && (
                <div
                  style={{
                    marginTop: 7,
                    padding: "4px 8px",
                    background: "#eaf3fb",
                    border: "1px solid #b8d6ef",
                    borderRadius: 5,
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: "#1a4a70",
                    wordBreak: "break-all",
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "#4a8ab5",
                      textTransform: "uppercase",
                      fontFamily: "sans-serif",
                      marginRight: 4,
                    }}
                  >
                    expr ·
                  </span>
                  {slot.expresion}
                </div>
              )}

              {/* ── Mano de obra ── */}
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  background: "#fffbeb",
                  border: `1.5px solid ${esError ? "#f87171" : moVal > 0 ? "#f59e0b" : "#fde68a"}`,
                  borderRadius: 7,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#92400e",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    🛠 Mano de obra
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: "#b45309",
                      fontStyle: "italic",
                    }}
                  >
                    — número fijo o expresión (ej:{" "}
                    <code
                      style={{
                        fontFamily: "monospace",
                        background: "#fef3c7",
                        padding: "0 3px",
                        borderRadius: 3,
                      }}
                    >
                      ancho * alto * 500
                    </code>
                    )
                  </span>
                </div>

                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {/* Input de texto para la expresión */}
                  <input
                    type="text"
                    placeholder="0  ó  ancho * alto * 500"
                    value={exprVal}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const res = evalMO(raw);
                      setForm((f) => ({
                        ...f,
                        [exprKey]: raw,
                        [moKey]: res !== null ? res : (f[moKey] ?? 0),
                      }));
                    }}
                    style={{
                      flex: 1,
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: `1.5px solid ${esError ? "#f87171" : "#fcd34d"}`,
                      fontSize: 13,
                      fontFamily: "monospace",
                      outline: "none",
                      background: "#fff",
                      color: "#78350f",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = esError
                        ? "#f87171"
                        : "#fcd34d")
                    }
                  />
                  {/* Resultado evaluado */}
                  <div
                    style={{
                      minWidth: 90,
                      textAlign: "right",
                      fontWeight: 800,
                      fontSize: 14,
                      color: esError
                        ? "#ef4444"
                        : moVal > 0
                          ? "#b45309"
                          : "#d1d5db",
                      flexShrink: 0,
                    }}
                  >
                    {esError ? "⚠ error" : moVal > 0 ? formatPeso(moVal) : "—"}
                  </div>
                </div>

                {/* Hint de variables disponibles */}
                {exprVal.trim() !== "" && !esError && moVal === 0 && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#b45309",
                      marginTop: 4,
                      fontStyle: "italic",
                    }}
                  >
                    Resultado 0 — variables disponibles: ancho, alto, profundo,
                    precio_material, precio_lateral_izq/der, precio_techo,
                    precio_base, cajon1_ancho, cajon1_alto, cajon1_cantidad…
                  </div>
                )}
                {esError && (
                  <div style={{ fontSize: 10, color: "#ef4444", marginTop: 4 }}>
                    Expresión inválida. Revisá la sintaxis.
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Margen + Subtotal */}
        {slotsFormulas.length > 0 && (
          <div
            style={{
              marginTop: 8,
              padding: "10px 14px",
              background: "#f0f7f0",
              border: "1px solid #b8dfc8",
              borderRadius: 7,
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
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color: "#16a34a",
                  textTransform: "uppercase",
                }}
              >
                📈 MARGEN (%)
              </span>
              {margenBD !== null && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    background:
                      Number(margen) !== margenBD ? "#fff3cd" : "#eaf3fb",
                    color: Number(margen) !== margenBD ? "#856404" : "#2d7fc1",
                    border: `1px solid ${Number(margen) !== margenBD ? "#ffc107" : "#b8d6ef"}`,
                    borderRadius: 4,
                    padding: "1px 7px",
                    cursor: Number(margen) !== margenBD ? "pointer" : "default",
                  }}
                  onClick={() =>
                    Number(margen) !== margenBD && setMargen(margenBD)
                  }
                  title={
                    Number(margen) !== margenBD
                      ? `Restaurar BD (${margenBD}%)`
                      : "Valor de BD"
                  }
                >
                  {Number(margen) !== margenBD
                    ? `⚠️ BD: ${margenBD}% — restaurar`
                    : `📊 BD: ${margenBD}%`}
                </span>
              )}
            </div>
            <input
              type="number"
              min="0"
              step="0.5"
              value={margen}
              onChange={(e) => setMargen(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 6,
                border: "1.5px solid #b8cfe0",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                background: "#fff",
                color: "#0a3a5c",
                marginBottom: 10,
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 4,
                padding: "8px 12px",
                background: "linear-gradient(90deg,#1a3a5c,#0f2944)",
                borderRadius: 5,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color: "#7ab2d4",
                  textTransform: "uppercase",
                }}
              >
                Subtotal
              </span>
              <span style={{ fontWeight: 700, fontSize: 20, color: "#60b4f0" }}>
                {formatPeso(baseMargen + totalMargen)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Colocación */}
      <div
        style={{
          background: "#fff",
          border: "1.5px solid #b8cfe0",
          borderRadius: 12,
          padding: "22px 24px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#0a3a5c",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            🚚 Colocación
          </div>
          {colocacionBD !== null && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                background: "#eaf3fb",
                color: "#2d7fc1",
                border: "1px solid #b8d6ef",
                borderRadius: 4,
                padding: "1px 7px",
              }}
            >
              📊 BD:
              {colocacionBD.valor !== null
                ? ` $${colocacionBD.valor.toLocaleString("es-AR")}`
                : ""}
              {colocacionBD.valor !== null && colocacionBD.porcentaje !== null
                ? " / "
                : ""}
              {colocacionBD.porcentaje !== null
                ? ` ${colocacionBD.porcentaje}%`
                : ""}
            </span>
          )}
        </div>

        {/* Selector de modo */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[
            { key: "valor", label: "💲 Valor fijo" },
            { key: "porcentaje", label: "📊 % del subtotal" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setColocacionModo(key)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
                border:
                  colocacionModo === key
                    ? "2px solid #2563eb"
                    : "1.5px solid #b8cfe0",
                background: colocacionModo === key ? "#eff6ff" : "#f8fafc",
                color: colocacionModo === key ? "#2563eb" : "#6a8aa0",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Campos según modo — ambos visibles, el activo resaltado */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          {/* Valor fijo */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: `2px solid ${colocacionModo === "valor" ? "#2563eb" : "#e2e8f0"}`,
              background: colocacionModo === "valor" ? "#eff6ff" : "#f8fafc",
              opacity: colocacionModo === "valor" ? 1 : 0.5,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: colocacionModo === "valor" ? "#2563eb" : "#94a3b8",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Valor ($)
              {colocacionBD?.valor !== null &&
                colocacionBD?.valor !== undefined && (
                  <span
                    onClick={() => {
                      setColocacionValor(colocacionBD.valor);
                      setColocacionModo("valor");
                    }}
                    style={{
                      marginLeft: 6,
                      cursor: "pointer",
                      color: "#2563eb",
                      fontWeight: 600,
                    }}
                    title="Restaurar BD"
                  >
                    ↺ BD
                  </span>
                )}
            </div>
            <input
              type="number"
              min="0"
              step="100"
              value={colocacionValor}
              onChange={(e) => {
                setColocacionValor(Number(e.target.value));
                setColocacionModo("valor");
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1.5px solid #b8cfe0",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                background: "#fff",
                color: "#0a3a5c",
              }}
            />
            <div
              style={{
                fontSize: 11,
                color: colocacionModo === "valor" ? "#2563eb" : "#94a3b8",
                marginTop: 6,
                fontWeight: 600,
              }}
            >
              = {formatPeso(colocacionValor)}
            </div>
          </div>

          {/* Porcentaje */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: `2px solid ${colocacionModo === "porcentaje" ? "#7c3aed" : "#e2e8f0"}`,
              background:
                colocacionModo === "porcentaje" ? "#f5f3ff" : "#f8fafc",
              opacity: colocacionModo === "porcentaje" ? 1 : 0.5,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: colocacionModo === "porcentaje" ? "#7c3aed" : "#94a3b8",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              % del subtotal
              {colocacionBD?.porcentaje !== null &&
                colocacionBD?.porcentaje !== undefined && (
                  <span
                    onClick={() => {
                      setColocacionPct(colocacionBD.porcentaje);
                      setColocacionModo("porcentaje");
                    }}
                    style={{
                      marginLeft: 6,
                      cursor: "pointer",
                      color: "#7c3aed",
                      fontWeight: 600,
                    }}
                    title="Restaurar BD"
                  >
                    ↺ BD
                  </span>
                )}
            </div>
            <input
              type="number"
              min="0"
              step="0.5"
              value={colocacionPct}
              onChange={(e) => {
                setColocacionPct(Number(e.target.value));
                setColocacionModo("porcentaje");
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1.5px solid #b8cfe0",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                background: "#fff",
                color: "#0a3a5c",
              }}
            />
            <div
              style={{
                fontSize: 11,
                color: colocacionModo === "porcentaje" ? "#7c3aed" : "#94a3b8",
                marginTop: 6,
                fontWeight: 600,
              }}
            >
              = {formatPeso((subtotal * (Number(colocacionPct) || 0)) / 100)}
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown final */}
      {slotsFormulas.length > 0 && (
        <div
          style={{
            background: "#f4f8fb",
            borderRadius: 8,
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 16px",
              fontSize: 14,
              color: "#4a6a80",
              borderBottom: "1px solid #e0eaf2",
              fontWeight: 600,
            }}
          >
            <span>Fórmulas ({slotsFormulas.length} ítems)</span>
            <span>{formatPeso(totalSlots)}</span>
          </div>
          {Number(margen) > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 16px",
                fontSize: 14,
                color: "#4a6a80",
                borderBottom: "1px solid #e0eaf2",
              }}
            >
              <span>Margen ({margen}%)</span>
              <span>{formatPeso(totalMargen)}</span>
            </div>
          )}
          {totalManoObra > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 16px",
                fontSize: 14,
                color: "#92400e",
                borderBottom: "1px solid #e0eaf2",
                background: "#fffbeb",
              }}
            >
              <span>🛠 Mano de obra</span>
              <span style={{ fontWeight: 700 }}>
                {formatPeso(totalManoObra)}
              </span>
            </div>
          )}
          {totalColocacion > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 16px",
                fontSize: 14,
                color: "#4a6a80",
                borderBottom: "1px solid #e0eaf2",
              }}
            >
              <span>
                Colocación{" "}
                {colocacionModo === "porcentaje" ? `(${colocacionPct}%)` : ""}
              </span>
              <span>{formatPeso(totalColocacion)}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 16px",
              background: "#0f2944",
              color: "#fff",
            }}
          >
            <span
              style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.14em" }}
            >
              TOTAL
            </span>
            <span style={{ fontWeight: 700, fontSize: 22 }}>
              {formatPeso(total)}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 16px",
            borderRadius: 8,
            background: "#fef2f2",
            border: "1.5px solid #fca5a5",
            color: "#b91c1c",
            fontSize: 13,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        {tieneAlgo && (
          <button
            onClick={handleLimpiar}
            disabled={cargando}
            style={{
              padding: "10px 22px",
              borderRadius: 8,
              border: "1.5px solid #b8cfe0",
              background: "#fff",
              color: "#6699bb",
              fontSize: 13,
              fontFamily: "inherit",
              cursor: "pointer",
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#f1f5f9";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#fff";
            }}
          >
            Limpiar
          </button>
        )}
        <button
          onClick={handleGuardar}
          disabled={cargando}
          style={{
            padding: "10px 28px",
            borderRadius: 8,
            border: "none",
            background: guardado ? "#22c55e" : cargando ? "#93c5fd" : "#2563eb",
            color: "#fff",
            fontSize: 13,
            fontFamily: "inherit",
            cursor: cargando ? "not-allowed" : "pointer",
            fontWeight: 700,
            transition: "background 0.3s",
          }}
        >
          {cargando ? "Guardando…" : guardado ? "✓ Guardado" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
