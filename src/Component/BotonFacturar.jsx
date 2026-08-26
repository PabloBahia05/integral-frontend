import { useState } from "react";

const API = "https://integral-backend-production.up.railway.app";

// BotonFacturar.jsx
// Botón reusable para emitir la factura real (CAE de AFIP) de un
// presupuesto confirmado. Se cuelga de cualquier pantalla que ya tenga
// disponible `authFetch` (mismo patrón que CuentaCorriente.jsx,
// PresupuestoNuevo.jsx, etc.) y el `numeropres` del presupuesto.
//
// Uso:
//   <BotonFacturar numeropres={row.numeropres} authFetch={authFetch} />
//
// No pide revisión ni tipo de comprobante — el backend
// (facturas.routes.js) los resuelve solo a partir de presupuesto_info
// (última revisión) y clientes.tipofact (Factura A/B/C).
export default function BotonFacturar({ numeropres, authFetch, onFacturaGenerada }) {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const facturar = async () => {
    if (cargando) return;
    if (!window.confirm(`¿Emitir factura para el presupuesto N° ${numeropres}? Esto genera un CAE real.`)) {
      return;
    }

    setCargando(true);
    setResultado(null);
    setError(null);

    try {
      const res = await authFetch(`${API}/facturas/generar/${numeropres}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || JSON.stringify(data));
      } else {
        setResultado(data);
        onFacturaGenerada?.(data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ display: "inline-block" }}>
      <button
        onClick={facturar}
        disabled={cargando}
        style={{
          padding: "6px 14px",
          fontSize: 13,
          background: cargando ? "#999" : "#0a3a5c",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: cargando ? "not-allowed" : "pointer",
        }}
      >
        {cargando ? "Facturando..." : "🧾 Facturar"}
      </button>

      {resultado && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#1a5c1a" }}>
          ✅ CAE {resultado.cae} — Comprobante N° {resultado.nro_comprobante}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#a72a2a", maxWidth: 320 }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
}
