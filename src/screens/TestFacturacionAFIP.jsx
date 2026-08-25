import { useState } from "react";

const API = "https://integral-backend-production.up.railway.app";

// TestFacturacionAFIP.jsx
// Pantalla DESCARTABLE, solo para probar el circuito completo
// React -> Node -> Python -> AFIP (Homologación) antes de integrar la
// facturación en el flujo real de negocio. Reusa el mismo `authFetch`
// que ya usan CuentaCorriente.jsx / PresupuestoNuevo.jsx (se lo pasa el
// componente padre), así que ya viaja autenticado sin configurar nada
// extra acá.
//
// Emite una Factura B, Consumidor Final, monto fijo chico — el mismo
// caso que probamos por Python en test_facturar.py, para comparar
// resultados y confirmar que Node está reenviando bien al servicio
// Python (incluido el CondicionIVAReceptorId que ahora calcula solo).
export default function TestFacturacionAFIP({ authFetch }) {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const probarFacturar = async () => {
    setCargando(true);
    setResultado(null);
    setError(null);

    const NETO = 1000;
    const IVA = Math.round(NETO * 0.21 * 100) / 100;
    const TOTAL = NETO + IVA;

    const payload = {
      pto_vta: 1,
      tipo_cbte: 6, // Factura B
      concepto: 1,
      tipo_doc: 99, // Consumidor Final
      nro_doc: 0,
      // No mandamos condicionIvaReceptorId a propósito: Node lo tiene
      // que inferir solo (tipo_doc 99 -> Consumidor Final, código 5),
      // así probamos también esa lógica nueva de routes/afip.js.
      importe_neto: NETO,
      importe_iva: IVA,
      importe_total: TOTAL,
      iva: [{ Id: 5, BaseImp: NETO, Importe: IVA }],
    };

    try {
      const res = await authFetch(`${API}/afip/facturar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data);
      } else {
        setResultado(data);
      }
    } catch (e) {
      setError({ error: e.message });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ padding: 32, fontFamily: "monospace", maxWidth: 600 }}>
      <h2>🧪 Prueba de Facturación AFIP (Homologación)</h2>
      <p style={{ color: "#666" }}>
        Factura B, Consumidor Final, $1000 + 21% IVA = $1210. Pantalla
        descartable, solo para confirmar React → Node → Python → AFIP.
      </p>

      <button
        onClick={probarFacturar}
        disabled={cargando}
        style={{
          padding: "10px 20px",
          fontSize: 16,
          background: cargando ? "#999" : "#0a3a5c",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: cargando ? "not-allowed" : "pointer",
        }}
      >
        {cargando ? "Facturando..." : "Probar /afip/facturar"}
      </button>

      {resultado && (
        <div style={{ marginTop: 24, padding: 16, background: "#e6f7e6", border: "1px solid #2a7a2a", borderRadius: 6 }}>
          <strong style={{ color: "#1a5c1a" }}>✅ CAE obtenido:</strong>
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{JSON.stringify(resultado, null, 2)}</pre>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 24, padding: 16, background: "#fce6e6", border: "1px solid #a72a2a", borderRadius: 6 }}>
          <strong style={{ color: "#a72a2a" }}>❌ Error:</strong>
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
