import { useState, useEffect } from "react";
import ScreenHeader from "../Component/ScreenHeader";
import { verFacturaPDF, imprimirFacturaPDF } from "../pdf/facturaPdf";

const API = "https://integral-backend-production.up.railway.app";

const soloDigitos = (v) => String(v ?? "").replace(/\D/g, "");

// FacturaManual.jsx — "Facturar" dentro de Facturas Emitidas: factura
// libre, sin depender de un presupuesto/obra confirmada (para cargos
// sueltos, adicionales, arreglos, etc.). Elegís un cliente ya cargado,
// completás detalle + importe, y se emite igual que cualquier otra
// factura (mismo resolverTipoFactura del backend, mismo CAE real de AFIP,
// mismo PDF).
//
// Recibe `clientes` como prop (el mismo array que ya carga App.jsx para
// la pantalla Clientes) en vez de pedirlo de nuevo — evita inventar un
// endpoint de búsqueda que quizás no existe tal cual.
export default function FacturaManual({ clientes, authFetch, onVolver, onFaltanDatosCliente }) {
  const [busqueda, setBusqueda] = useState("");
  const [clienteSel, setClienteSel] = useState(null);
  const [detalle, setDetalle] = useState("");
  const [importeTotal, setImporteTotal] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [cargandoPdf, setCargandoPdf] = useState(false);
  // Config fija del emisor (CUIT, razón social, etc.) — la necesita el
  // PDF y NO viene en la respuesta de /facturas/generar-manual, así que se
  // pide una sola vez acá (mismo endpoint que usa FacturasVenta.jsx).
  const [emisor, setEmisor] = useState(null);

  useEffect(() => {
    authFetch(`${API}/facturas-venta/config-emisor`)
      .then((r) => r.json())
      .then(setEmisor)
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = busqueda.trim().toLowerCase();
  const qDigitos = soloDigitos(busqueda);
  const palabras = q.split(/\s+/).filter(Boolean);
  const coincidencias =
    q.length < 2
      ? []
      : (clientes ?? [])
          .filter((c) => {
            const nombreNorm = (c.nombre ?? "").toLowerCase();
            // Cada palabra tipeada tiene que aparecer en algún lado del
            // nombre — así "daniel roque" encuentra a "ROQUE DANIEL" sin
            // importar el orden en que esté guardado.
            const coincideNombre = palabras.every((p) => nombreNorm.includes(p));
            const coincideCuit = String(c.cuit ?? "").includes(q);
            const coincideCodigo = String(c.codcliente ?? "").includes(q);
            // Solo compara por teléfono si lo que se tipeó tiene DÍGITOS —
            // si no, soloDigitos(q) da "" y CUALQUIER string "contiene" un
            // string vacío en JS, lo que hacía matchear cualquier cliente
            // con teléfono cargado sin importar lo que se buscara.
            const coincideTelefono =
              qDigitos.length > 0 &&
              [c.telefono1, c.telefono2, c.wapp]
                .map(soloDigitos)
                .filter(Boolean)
                .some((t) => t.includes(qDigitos));
            return coincideNombre || coincideCuit || coincideCodigo || coincideTelefono;
          })
          .slice(0, 8);

  const elegirCliente = (c) => {
    setClienteSel(c);
    setBusqueda("");
    setResultado(null);
    setError(null);
  };

  const facturar = async () => {
    if (!clienteSel) return;
    const total = Number(importeTotal);
    if (!total || total <= 0) {
      setError("Cargá un importe mayor a cero.");
      return;
    }
    if (
      !window.confirm(
        `¿Emitir factura a ${clienteSel.nombre} por ${importeTotal}? Esto genera un CAE real.`,
      )
    ) {
      return;
    }

    setCargando(true);
    setError(null);
    setResultado(null);

    try {
      const res = await authFetch(`${API}/facturas/generar-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codcliente: clienteSel.codcliente,
          detalle: detalle.trim() || null,
          importe_total: total,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
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
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const nuevaFactura = () => {
    setClienteSel(null);
    setDetalle("");
    setImporteTotal("");
    setResultado(null);
    setError(null);
  };

  return (
    <>
      <ScreenHeader icon="🧾" title="Facturar" subtitle="Factura libre, sin presupuesto asociado" />

      {onVolver && (
        <button
          type="button"
          onClick={onVolver}
          style={{
            marginBottom: 16,
            padding: "6px 12px",
            fontSize: 12,
            background: "transparent",
            color: "#0a3a5c",
            border: "1px solid #0a3a5c",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          ← Volver a Facturas Emitidas
        </button>
      )}

      {resultado ? (
        <div
          style={{
            maxWidth: 480,
            background: "#fff",
            border: "1px solid #c8dae8",
            borderRadius: 6,
            padding: 20,
          }}
        >
          <div style={{ fontSize: 13, color: "#1a5c1a", marginBottom: 12 }}>
            ✅ Factura emitida — CAE {resultado.cae} — Comprobante N°{" "}
            {String(resultado.pto_vta).padStart(4, "0")}-{String(resultado.nro_comprobante).padStart(8, "0")}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              disabled={cargandoPdf || !emisor}
              onClick={() => verFacturaPDF(resultado, emisor, { setGenerando: setCargandoPdf })}
              style={botonEstilo(!!emisor)}
            >
              👁 Ver PDF
            </button>
            <button
              type="button"
              disabled={cargandoPdf || !emisor}
              onClick={() => imprimirFacturaPDF(resultado, emisor, { setGenerando: setCargandoPdf })}
              style={botonEstilo(!!emisor)}
            >
              🖨️ Imprimir
            </button>
          </div>
          <button type="button" onClick={nuevaFactura} style={botonEstilo(false)}>
            + Facturar otra
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>
          {!clienteSel ? (
            <div>
              <label style={etiquetaEstilo}>Cliente</label>
              <input
                type="text"
                autoFocus
                placeholder="Buscar por nombre, CUIT o teléfono..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={inputEstilo}
              />
              {coincidencias.length > 0 && (
                <div
                  style={{
                    marginTop: 4,
                    border: "1px solid #c8dae8",
                    borderRadius: 4,
                    background: "#fff",
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  {coincidencias.map((c) => (
                    <div
                      key={c.id ?? c.codcliente}
                      onClick={() => elegirCliente(c)}
                      style={{
                        padding: "8px 12px",
                        fontSize: 12,
                        cursor: "pointer",
                        borderBottom: "1px solid #eef4f9",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#eef4f9")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <strong>{c.nombre}</strong>
                      {c.cuit ? ` — CUIT ${c.cuit}` : c.dni ? ` — DNI ${c.dni}` : ""}
                    </div>
                  ))}
                </div>
              )}
              {q.length >= 2 && coincidencias.length === 0 && (
                <p style={{ fontSize: 11, color: "#8aabb8", marginTop: 6 }}>
                  Sin resultados. Si el cliente no existe todavía, cargalo primero en la pantalla
                  Clientes.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label style={etiquetaEstilo}>Cliente</label>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  border: "1px solid #c8dae8",
                  borderRadius: 4,
                  background: "#fff",
                  fontSize: 13,
                }}
              >
                <span>
                  <strong>{clienteSel.nombre}</strong>
                  {clienteSel.cuit ? ` — CUIT ${clienteSel.cuit}` : clienteSel.dni ? ` — DNI ${clienteSel.dni}` : " — sin CUIT/DNI cargado"}
                </span>
                <button
                  type="button"
                  onClick={() => setClienteSel(null)}
                  style={{ background: "none", border: "none", color: "#a72a2a", cursor: "pointer", fontSize: 12 }}
                >
                  Cambiar
                </button>
              </div>
            </div>
          )}

          <div>
            <label style={etiquetaEstilo}>Detalle (opcional)</label>
            <textarea
              rows={3}
              placeholder="Ej: Arreglo de mueble, adicional de obra, etc."
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              style={{ ...inputEstilo, resize: "vertical" }}
            />
          </div>

          <div>
            <label style={etiquetaEstilo}>Importe total (con IVA incluido)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Ej: 50000"
              value={importeTotal}
              onChange={(e) => setImporteTotal(e.target.value)}
              style={inputEstilo}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "#a72a2a" }}>❌ {error}</div>
          )}

          <button
            type="button"
            disabled={!clienteSel || cargando}
            onClick={facturar}
            style={{
              ...botonEstilo(!!clienteSel && !cargando),
              alignSelf: "flex-start",
              padding: "10px 20px",
            }}
          >
            {cargando ? "Facturando..." : "🧾 Facturar"}
          </button>
        </div>
      )}
    </>
  );
}

const etiquetaEstilo = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#0a3a5c",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputEstilo = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #c8dae8",
  borderRadius: 4,
  fontSize: 13,
  fontFamily: "inherit",
};

const botonEstilo = (activo) => ({
  padding: "6px 14px",
  fontSize: 12,
  background: activo ? "#0a3a5c" : "#c8dae8",
  color: activo ? "#fff" : "#99aabb",
  border: "none",
  borderRadius: 4,
  cursor: activo ? "pointer" : "not-allowed",
});
