import { useState } from "react";
import { verFacturaPDF, imprimirFacturaPDF, descargarFacturaPDF } from "../pdf/facturaPdf";

const API = "https://integral-backend-production.up.railway.app";

// BotonFacturar.jsx
// Botón reusable para emitir la factura real (CAE de AFIP) de un
// presupuesto confirmado. Se cuelga de cualquier pantalla que ya tenga
// disponible `authFetch` (mismo patrón que CuentaCorriente.jsx,
// PresupuestoNuevo.jsx, etc.) y el `numeropres` del presupuesto.
//
// Uso:
//   <BotonFacturar
//     numeropres={row.numeropres}
//     authFetch={authFetch}
//     onFacturaGenerada={fetchEncabezados}
//     onFaltanDatosCliente={(info) => irACliente(info.codcliente, info.nombreCliente, null, info.faltantes.map(f => f.field))}
//   />
//
// No pide revisión ni tipo de comprobante — el backend
// (facturas.routes.js) los resuelve solo a partir de presupuesto_info
// (última revisión) y clientes.tipofact (Factura A/B/C).
//
// `onFaltanDatosCliente` es opcional: si el backend devuelve 400 con
// `faltantes` (cliente sin CUIT/DNI según su tipofact) y este callback está
// presente, se dispara con { codcliente, nombreCliente, tipofact, faltantes }
// para que el padre navegue a la ficha del cliente y la abra ya. Si no se
// pasa, el 400 se muestra solo como texto (comportamiento anterior).
//
// Apenas se genera la factura con éxito, este componente pide de vuelta la
// fila completa (con los datos del cliente ya unidos) y muestra "👁 Ver
// PDF" / "🖨️ Imprimir" — la plantilla del comprobante vive en
// src/pdf/facturaPdf.js, compartida con FacturasVenta.jsx, así que el PDF
// sale igual se genere desde acá o desde el listado.
export default function BotonFacturar({ numeropres, authFetch, onFacturaGenerada, onFaltanDatosCliente }) {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  // Fila completa (con join a clientes) + config del emisor, para poder
  // armar el PDF apenas se factura. Se piden aparte del resultado del
  // POST porque ese endpoint solo devuelve lo que contesta el servicio de
  // AFIP (cae, nro_comprobante, etc.) — no los datos del cliente.
  const [filaFactura, setFilaFactura] = useState(null);
  const [emisor, setEmisor] = useState(null);
  const [cargandoPdf, setCargandoPdf] = useState(false);

  const facturar = async () => {
    if (cargando) return;
    if (!window.confirm(`¿Emitir factura para el presupuesto N° ${numeropres}? Esto genera un CAE real.`)) {
      return;
    }

    setCargando(true);
    setResultado(null);
    setError(null);
    setFilaFactura(null);
    setEmisor(null);

    try {
      const res = await authFetch(`${API}/facturas/generar/${numeropres}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok) {
        // 400 con `faltantes` = cliente sin CUIT/DNI según su tipofact. Si
        // el padre nos dio el callback, abrimos la ficha del cliente en vez
        // de dejar solo el texto de error.
        if (res.status === 400 && data.faltantes && onFaltanDatosCliente) {
          setError(
            `${data.error} Abriendo la ficha de ${data.nombreCliente ?? "cliente"} para completarlo...`,
          );
          onFaltanDatosCliente(data);
        } else {
          setError(data.error || JSON.stringify(data));
        }
      } else {
        setResultado(data);
        onFacturaGenerada?.(data);

        // Se piden en paralelo la fila recién creada (con datos del
        // cliente) y la config del emisor, para habilitar Ver PDF /
        // Imprimir. Si cualquiera de las dos falla, los botones de PDF
        // simplemente no aparecen — la factura ya se emitió igual, no hay
        // que bloquear ni mostrar error por esto.
        Promise.all([
          authFetch(`${API}/facturas-venta/${numeropres}`).then((r) => r.json()),
          authFetch(`${API}/facturas-venta/config-emisor`).then((r) => r.json()),
        ])
          .then(([filas, config]) => {
            const filas_ordenadas = Array.isArray(filas) ? filas : [];
            // La más reciente es la que se acaba de generar (el endpoint
            // ya ordena por creado_en DESC).
            setFilaFactura(filas_ordenadas[0] ?? null);
            setEmisor(config);
          })
          .catch((e) =>
            console.error("No se pudieron cargar los datos para el PDF:", e),
          );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const puedeVerPdf = filaFactura && emisor;

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

      {resultado && (
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button
            type="button"
            disabled={!puedeVerPdf || cargandoPdf}
            onClick={() =>
              verFacturaPDF(filaFactura, emisor, { setGenerando: setCargandoPdf })
            }
            style={{
              padding: "5px 12px",
              fontSize: 12,
              background: puedeVerPdf ? "#0a3a5c" : "#c8dae8",
              color: puedeVerPdf ? "#fff" : "#99aabb",
              border: "none",
              borderRadius: 4,
              cursor: puedeVerPdf && !cargandoPdf ? "pointer" : "not-allowed",
            }}
          >
            👁 Ver PDF
          </button>
          <button
            type="button"
            disabled={!puedeVerPdf || cargandoPdf}
            onClick={() =>
              imprimirFacturaPDF(filaFactura, emisor, { setGenerando: setCargandoPdf })
            }
            style={{
              padding: "5px 12px",
              fontSize: 12,
              background: puedeVerPdf ? "#0a3a5c" : "#c8dae8",
              color: puedeVerPdf ? "#fff" : "#99aabb",
              border: "none",
              borderRadius: 4,
              cursor: puedeVerPdf && !cargandoPdf ? "pointer" : "not-allowed",
            }}
          >
            🖨️ Imprimir
          </button>
          <button
            type="button"
            disabled={!puedeVerPdf || cargandoPdf}
            onClick={() =>
              descargarFacturaPDF(filaFactura, emisor, { setGenerando: setCargandoPdf })
            }
            style={{
              padding: "5px 12px",
              fontSize: 12,
              background: puedeVerPdf ? "#0a3a5c" : "#c8dae8",
              color: puedeVerPdf ? "#fff" : "#99aabb",
              border: "none",
              borderRadius: 4,
              cursor: puedeVerPdf && !cargandoPdf ? "pointer" : "not-allowed",
            }}
          >
            💾 Guardar PDF
          </button>
          {!puedeVerPdf && (
            <span style={{ fontSize: 11, color: "#8aabb8", alignSelf: "center" }}>
              Cargando datos del PDF...
            </span>
          )}
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
