import { useState, useEffect } from "react";

const API = "https://integral-backend-production.up.railway.app";

// ─────────────────────────────────────────────────────────────────────────────
// TabComponentes
//
// Mismo patrón que Mampara (ver PresupuestoMamparas.jsx): NO hay una tabla de
// "tipos" administrada a mano. En su lugar se pega al catálogo real —
// GET /productos/componentes, que en el backend ya viene filtrado por
// rubro = Componentes y proveedor = Daniel Roque — y se muestran como
// opciones las FAMILIAS distintas presentes en ese catálogo. Al elegir una
// familia, se listan sus artículos; al elegir un artículo, se completa
// cantidad + precio (autocompletado desde el catálogo, editable) y se agrega
// al presupuesto.
//
// Props:
//   token                – JWT para authFetch
//   agregarAPresupuesto   – función para agregar un ítem al presupuesto padre
// ─────────────────────────────────────────────────────────────────────────────
export default function TabComponentes({ token, agregarAPresupuesto }) {
  const authFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });

  const [articulos, setArticulos] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [vista, setVista] = useState("familias"); // "familias" | "articulos" | "cantidad"
  const [familiaElegida, setFamiliaElegida] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [articuloElegido, setArticuloElegido] = useState(null);
  const [cantidad, setCantidad] = useState("1");
  const [precio, setPrecio] = useState("");
  const [agregado, setAgregado] = useState(false);

  // ── Catálogo: mismo endpoint/normalización que Mampara ──
  useEffect(() => {
    setCargando(true);
    authFetch(`${API}/productos/componentes`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setError("Respuesta inesperada del servidor.");
          setCargando(false);
          return;
        }
        const normalized = data.map((a) => ({
          ...a,
          codart: a.codart ?? a.codartint ?? "",
          familia:
            a.familia && a.familia.trim() ? a.familia.trim() : (a.rubro ?? ""),
        }));
        setArticulos(normalized);
        const fams = [
          ...new Set(normalized.map((a) => a.familia).filter(Boolean)),
        ].sort();
        setFamilias(fams);
        setCargando(false);
      })
      .catch(() => {
        setError("No se pudo cargar el catálogo de componentes.");
        setCargando(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Precio de referencia del catálogo: soporta tanto un campo plano `precio`
  // (como en /productos/mamparas) como un objeto `precios` por línea.
  const precioDeArticulo = (a) => {
    if (!a) return "";
    if (a.precio != null && a.precio !== "") return a.precio;
    if (a.precios && typeof a.precios === "object") {
      const v = a.precios["1"] ?? Object.values(a.precios)[0];
      if (v != null && v !== "") return v;
    }
    return "";
  };

  const articulosDeLaFamilia = familiaElegida
    ? articulos.filter((a) => a.familia === familiaElegida)
    : [];
  const articulosFiltrados = busqueda.trim()
    ? articulosDeLaFamilia.filter((a) =>
        (a.articulo ?? "").toLowerCase().includes(busqueda.toLowerCase()),
      )
    : articulosDeLaFamilia;

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
  const volverBtnStyle = {
    padding: "5px 14px",
    background: "#fff",
    border: "1px solid #b8cfe0",
    borderRadius: 2,
    fontFamily: "'Space Mono',monospace",
    fontSize: 12,
    cursor: "pointer",
    color: "#0a3a5c",
  };

  const elegirFamilia = (fam) => {
    setFamiliaElegida(fam);
    setBusqueda("");
    setVista("articulos");
  };

  const elegirArticulo = (a) => {
    setArticuloElegido(a);
    setCantidad("1");
    setPrecio(String(precioDeArticulo(a) ?? ""));
    setAgregado(false);
    setVista("cantidad");
  };

  const volverAFamilias = () => {
    setVista("familias");
    setFamiliaElegida(null);
    setBusqueda("");
    setArticuloElegido(null);
  };

  const volverAArticulos = () => {
    setVista("articulos");
    setArticuloElegido(null);
    setAgregado(false);
  };

  // ── VISTA: familias ──────────────────────────────────────
  if (vista === "familias") {
    return (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 28 }}>🔩</span>
          <div>
            <div
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: "#0a3a5c",
                textTransform: "uppercase",
              }}
            >
              Componentes
            </div>
            <div style={{ fontSize: 12, color: "#6699bb", letterSpacing: 2 }}>
              Elegí una familia
            </div>
          </div>
        </div>

        {cargando && (
          <p style={{ color: "#88aacc", fontSize: 13 }}>Cargando catálogo…</p>
        )}
        {error && <p className="form-error">{error}</p>}
        {!cargando && !error && familias.length === 0 && (
          <p style={{ color: "#88aacc", fontSize: 13 }}>
            No hay componentes cargados en el catálogo (rubro Componentes,
            proveedor Daniel Roque).
          </p>
        )}

        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 22 }}
        >
          {familias.map((fam) => {
            const cantidadItems = articulos.filter(
              (a) => a.familia === fam,
            ).length;
            return (
              <div
                key={fam}
                onClick={() => elegirFamilia(fam)}
                style={{
                  width: 200,
                  borderRadius: 12,
                  border: "1.5px solid #d0dde8",
                  background: "#fff",
                  cursor: "pointer",
                  padding: "20px 16px",
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(0,0,0,0.13)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(0,0,0,0.06)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔩</div>
                <div
                  style={{
                    fontFamily: "Rajdhani, sans-serif",
                    fontWeight: 700,
                    fontSize: 15,
                    color: "#0a3a5c",
                    textTransform: "uppercase",
                  }}
                >
                  {fam}
                </div>
                <div style={{ fontSize: 11, color: "#6699bb", marginTop: 4 }}>
                  {cantidadItems} artículo{cantidadItems !== 1 ? "s" : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── VISTA: artículos de la familia elegida ───────────────
  if (vista === "articulos") {
    return (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: "Rajdhani, sans-serif",
              fontWeight: 700,
              fontSize: 18,
              color: "#0a3a5c",
              textTransform: "uppercase",
            }}
          >
            🔩 {familiaElegida}
          </div>
          <button onClick={volverAFamilias} style={volverBtnStyle}>
            ← Volver a familias
          </button>
        </div>

        <input
          className="form-input"
          placeholder="Buscar artículo…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ ...inputStyle, marginBottom: 14 }}
          autoFocus
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {articulosFiltrados.map((a) => (
            <div
              key={a.id ?? a.codart}
              onClick={() => elegirArticulo(a)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                background: "#fff",
                border: "1.5px solid #d0dde8",
                borderRadius: 8,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#eff4ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
              }}
            >
              {a.artfoto ? (
                <img
                  src={a.artfoto}
                  alt=""
                  style={{
                    width: 40,
                    height: 40,
                    objectFit: "cover",
                    borderRadius: 5,
                    border: "1px solid #d0dde8",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    background: "#e8f0f7",
                    borderRadius: 5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                >
                  🔩
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 13, fontWeight: 600, color: "#0a3a5c" }}
                >
                  {a.articulo}
                </div>
                <div style={{ fontSize: 11, color: "#6699bb" }}>
                  {a.codart}
                </div>
              </div>
              {precioDeArticulo(a) !== "" && (
                <div
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#2563eb",
                  }}
                >
                  $
                  {Number(precioDeArticulo(a)).toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              )}
            </div>
          ))}
          {articulosFiltrados.length === 0 && (
            <div style={{ fontSize: 12, color: "#6699bb" }}>
              Sin resultados en esta familia.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── VISTA: cantidad / precio ─────────────────────────────
  const cantidadNum = parseFloat(cantidad) || 0;
  const precioNum = parseFloat(precio) || 0;
  const subtotal = cantidadNum * precioNum;
  const puedeAgregar = cantidadNum > 0 && precioNum > 0;

  const confirmar = () => {
    if (!puedeAgregar) return;
    agregarAPresupuesto?.({
      id: `componente-${articuloElegido?.id ?? articuloElegido?.codart ?? Date.now()}`,
      seccion: "Componentes",
      descripcion: familiaElegida ?? "",
      nombreart: articuloElegido?.articulo ?? "",
      cantidad: cantidadNum,
      precio: precioNum,
      subtotal,
      foto: articuloElegido?.artfoto ?? null,
      codart: articuloElegido?.codart ?? null,
    });
    setAgregado(true);
  };

  return (
    <div style={{ fontFamily: "'Space Mono',monospace" }}>
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
          <span style={{ fontSize: 22 }}>🔩</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#0a3a5c",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {articuloElegido?.articulo ?? "Componente"}
          </span>
          <span style={{ fontSize: 11, color: "#6699bb", marginLeft: 4 }}>
            — Cantidad y precio
          </span>
        </div>
        <button onClick={volverAArticulos} style={volverBtnStyle}>
          ← Volver
        </button>
      </div>

      <div
        style={{
          background: "#f5f9fc",
          border: "1px solid #c8dae8",
          borderRadius: 4,
          padding: "22px 24px",
        }}
      >
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 140px" }}>
            <label style={labelStyle}>Cantidad *</label>
            <input
              type="number"
              min="1"
              step="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <label style={labelStyle}>Precio unit. *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="0.00"
              style={inputStyle}
              title="Autocompletado desde el catálogo — editable"
            />
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <label style={labelStyle}>Subtotal</label>
            <div
              style={{ ...inputStyle, background: "#eef4fb", fontWeight: 700 }}
            >
              {subtotal.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </div>
          </div>
        </div>
      </div>

      {agregado && (
        <div
          style={{
            marginTop: 14,
            background: "#eafaf3",
            border: "1px solid #2ec4b6",
            color: "#0a5c47",
            borderRadius: 3,
            padding: "10px 16px",
            fontSize: 12,
          }}
        >
          ✓ Agregado al presupuesto.
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
        <button onClick={volverAFamilias} style={volverBtnStyle}>
          Cancelar
        </button>
        <button
          onClick={confirmar}
          disabled={!puedeAgregar}
          style={{
            padding: "8px 28px",
            background: puedeAgregar ? "#0a3a5c" : "#c8dae8",
            color: "#fff",
            border: "none",
            borderRadius: 2,
            fontFamily: "'Space Mono',monospace",
            fontSize: 13,
            fontWeight: 700,
            cursor: puedeAgregar ? "pointer" : "default",
            letterSpacing: "0.04em",
          }}
        >
          Agregar al presupuesto ✓
        </button>
      </div>
      {!puedeAgregar && (
        <div
          style={{
            marginTop: 8,
            textAlign: "right",
            fontSize: 10,
            color: "#c0392b",
            fontFamily: "'Space Mono',monospace",
          }}
        >
          * Cantidad y precio son obligatorios
        </div>
      )}
    </div>
  );
}
