import { useState } from "react";
import TiposComponente from "./TiposComponente";

// ─────────────────────────────────────────────────────────────────────────────
// TabComponentes
//
// Solapa "Componentes" del presupuesto: igual patrón que Despensero/Vanitory
// (elegís un tipo predefinido de una lista, no se busca/arma libremente).
//
// Flujo: tipos (selector de TiposComponente) → cantidad (cantidad + precio) →
// se agrega al presupuesto con agregarAPresupuesto y vuelve al selector.
//
// Props:
//   token                 – JWT para authFetch
//   tiposComponente       – array de tipos de componente
//   tiposComponenteRUD    – handlers CRUD (onSave/onDelete/selected/onSelect/
//                           modal/onOpenModal/onCloseModal), pasados a TiposComponente
//   onVerTabla            – callback para navegar a "Ver Tablas" (ej. cuando no
//                           hay tipos cargados todavía)
//   agregarAPresupuesto    – función para agregar un ítem al presupuesto padre
// ─────────────────────────────────────────────────────────────────────────────
export default function TabComponentes({
  token,
  tiposComponente = [],
  tiposComponenteRUD = {},
  onVerTabla,
  agregarAPresupuesto,
}) {
  const [vista, setVista] = useState("tipos"); // "tipos" | "cantidad"
  const [tipoElegido, setTipoElegido] = useState(null);
  const [cantidad, setCantidad] = useState("1");
  const [precio, setPrecio] = useState("");
  const [agregado, setAgregado] = useState(false);

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

  const volverATipos = () => {
    setVista("tipos");
    setTipoElegido(null);
    setCantidad("1");
    setPrecio("");
    setAgregado(false);
  };

  // ── TIPOS ────────────────────────────────────────────────
  if (vista === "tipos") {
    return (
      <TiposComponente
        tiposComponente={tiposComponente}
        selected={null}
        modal={null}
        token={token}
        {...tiposComponenteRUD}
        modoSelector={true}
        onArmar={(tipo) => {
          setTipoElegido(tipo);
          setCantidad("1");
          setPrecio("");
          setAgregado(false);
          setVista("cantidad");
        }}
        onVolver={
          onVerTabla
            ? () => onVerTabla("componentes-tipos")
            : undefined
        }
      />
    );
  }

  // ── CANTIDAD / PRECIO ────────────────────────────────────
  const cantidadNum = parseFloat(cantidad) || 0;
  const precioNum = parseFloat(precio) || 0;
  const subtotal = cantidadNum * precioNum;
  const puedeAgregar = cantidadNum > 0 && precioNum > 0;

  const confirmar = () => {
    if (!puedeAgregar) return;
    agregarAPresupuesto?.({
      id: `componente-${tipoElegido?.id ?? Date.now()}`,
      seccion: "Componentes",
      descripcion:
        tipoElegido?.descripcion && tipoElegido.descripcion !== tipoElegido?.nombre
          ? tipoElegido.descripcion
          : "",
      nombreart: tipoElegido?.nombre ?? "",
      cantidad: cantidadNum,
      precio: precioNum,
      subtotal,
      foto: tipoElegido?.foto ?? null,
      codtipcomp: tipoElegido?.codtipcomp ?? null,
    });
    setAgregado(true);
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
            {tipoElegido?.nombre ?? "Componente"}
          </span>
          <span style={{ fontSize: 11, color: "#6699bb", marginLeft: 4 }}>
            — Cantidad y precio
          </span>
        </div>
        <button
          onClick={volverATipos}
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
            />
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <label style={labelStyle}>Subtotal</label>
            <div
              style={{
                ...inputStyle,
                background: "#eef4fb",
                fontWeight: 700,
              }}
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
        <button
          onClick={volverATipos}
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
