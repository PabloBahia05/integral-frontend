import { useState, useEffect } from "react";
import ScreenHeader from "../Component/ScreenHeader";
import { verFacturaPDF, imprimirFacturaPDF } from "../pdf/facturaPdf";

const API = "https://integral-backend-production.up.railway.app";

const soloDigitos = (v) => String(v ?? "").replace(/\D/g, "");
const fmt = (v) =>
  Number(v || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let nextItemId = 1;

// FacturaManual.jsx — "Facturar" dentro de Facturas Emitidas: factura
// libre, sin depender de un presupuesto/obra confirmada (para cargos
// sueltos, adicionales, arreglos, etc.). Elegís un cliente ya cargado,
// agregás renglones de artículos (traídos de la misma tabla que usa
// Productos.jsx, vía prop `productos` — mismo criterio que `clientes`:
// evitar pedir de nuevo algo que App.jsx ya carga), y se emite igual que
// cualquier otra factura (mismo resolverTipoFactura del backend, mismo
// CAE real de AFIP, mismo PDF).
//
// El importe total ya NO se tipea a mano: se calcula sumando los
// renglones. El campo "Detalle" queda como texto libre opcional para
// aclaraciones que no correspondan a un artículo puntual.
export default function FacturaManual({ clientes, productos, authFetch, onVolver, onFaltanDatosCliente }) {
  const [busqueda, setBusqueda] = useState("");
  const [clienteSel, setClienteSel] = useState(null);
  const [detalle, setDetalle] = useState("");
  const [items, setItems] = useState([]);
  const [busquedaArt, setBusquedaArt] = useState("");
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

  // Búsqueda de artículos por código interno o nombre, misma tabla que
  // GET /productos (recibida como prop `productos`, sin pedirla de nuevo).
  const qArt = busquedaArt.trim().toLowerCase();
  const coincidenciasArt =
    qArt.length < 2
      ? []
      : (productos ?? [])
          .filter((p) => {
            const nombreNorm = (p.articulo ?? "").toLowerCase();
            const codigoNorm = String(p.codartint ?? "").toLowerCase();
            return nombreNorm.includes(qArt) || codigoNorm.includes(qArt);
          })
          .slice(0, 8);

  const agregarItem = (p) => {
    setItems((prev) => [
      ...prev,
      {
        id: nextItemId++,
        codartint: p.codartint,
        articulo: p.articulo,
        unidad: p.unidad || "",
        cantidad: 1,
        // precio_un = precio de venta ya calculado (costo + margen); es lo
        // que factura la empresa, no el costo interno (`precio`).
        precioUnit: Number(p.precio_un) || 0,
      },
    ]);
    setBusquedaArt("");
  };

  const actualizarItem = (id, campo, valor) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)),
    );
  };

  const quitarItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const totalFactura = items.reduce(
    (acc, it) => acc + Number(it.cantidad || 0) * Number(it.precioUnit || 0),
    0,
  );

  const facturar = async () => {
    if (!clienteSel) return;
    if (items.length === 0 || totalFactura <= 0) {
      setError("Agregá al menos un artículo con cantidad y precio mayor a cero.");
      return;
    }
    if (
      !window.confirm(
        `¿Emitir factura a ${clienteSel.nombre} por $${fmt(totalFactura)}? Esto genera un CAE real.`,
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
          importe_total: totalFactura,
          // NUEVO: detalle de renglones para que el backend lo persista en
          // una tabla de ítems (ej. facturas_venta_items). El backend
          // todavía tiene que actualizarse para aceptar y guardar esto —
          // hoy solo usa importe_total.
          items: items.map((it) => ({
            codartint: it.codartint,
            articulo: it.articulo,
            unidad: it.unidad,
            cantidad: Number(it.cantidad) || 0,
            precio_unitario: Number(it.precioUnit) || 0,
            subtotal: (Number(it.cantidad) || 0) * (Number(it.precioUnit) || 0),
          })),
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
    setItems([]);
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
        <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>
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
            <label style={etiquetaEstilo}>Artículos</label>
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={busquedaArt}
              onChange={(e) => setBusquedaArt(e.target.value)}
              style={inputEstilo}
            />
            {coincidenciasArt.length > 0 && (
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
                {coincidenciasArt.map((p) => (
                  <div
                    key={p.codartint}
                    onClick={() => agregarItem(p)}
                    style={{
                      padding: "8px 12px",
                      fontSize: 12,
                      cursor: "pointer",
                      borderBottom: "1px solid #eef4f9",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#eef4f9")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontFamily: "monospace", color: "#5580a0", marginRight: 8 }}>
                      {p.codartint}
                    </span>
                    <strong>{p.articulo}</strong>
                    {p.precio_un != null && (
                      <span style={{ color: "#5580a0", marginLeft: 8 }}>
                        ${fmt(p.precio_un)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {qArt.length >= 2 && coincidenciasArt.length === 0 && (
              <p style={{ fontSize: 11, color: "#8aabb8", marginTop: 6 }}>
                Sin resultados en la tabla de artículos.
              </p>
            )}

            {items.length > 0 && (
              <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#0a3a5c", borderBottom: "1px solid #c8dae8" }}>
                    <th style={{ padding: "6px 4px" }}>Código</th>
                    <th style={{ padding: "6px 4px" }}>Artículo</th>
                    <th style={{ padding: "6px 4px", width: 80 }}>Cant.</th>
                    <th style={{ padding: "6px 4px", width: 110 }}>P. Unit.</th>
                    <th style={{ padding: "6px 4px", width: 110, textAlign: "right" }}>Subtotal</th>
                    <th style={{ width: 30 }} />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} style={{ borderBottom: "1px solid #eef4f9" }}>
                      <td style={{ padding: "6px 4px", fontFamily: "monospace", color: "#5580a0" }}>
                        {it.codartint}
                      </td>
                      <td style={{ padding: "6px 4px" }}>{it.articulo}</td>
                      <td style={{ padding: "6px 4px" }}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={it.cantidad}
                          onChange={(e) => actualizarItem(it.id, "cantidad", e.target.value)}
                          style={inputCeldaEstilo}
                        />
                      </td>
                      <td style={{ padding: "6px 4px" }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.precioUnit}
                          onChange={(e) => actualizarItem(it.id, "precioUnit", e.target.value)}
                          style={inputCeldaEstilo}
                        />
                      </td>
                      <td style={{ padding: "6px 4px", textAlign: "right" }}>
                        ${fmt(Number(it.cantidad || 0) * Number(it.precioUnit || 0))}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => quitarItem(it.id)}
                          title="Quitar renglón"
                          style={{ background: "none", border: "none", color: "#a72a2a", cursor: "pointer" }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ padding: "8px 4px", textAlign: "right", fontWeight: 700, color: "#0a3a5c" }}>
                      Total (IVA incluido)
                    </td>
                    <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 700, color: "#0a3a5c" }}>
                      ${fmt(totalFactura)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          <div>
            <label style={etiquetaEstilo}>Detalle / aclaraciones (opcional)</label>
            <textarea
              rows={2}
              placeholder="Ej: adicional de obra, arreglo puntual, etc."
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              style={{ ...inputEstilo, resize: "vertical" }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "#a72a2a" }}>❌ {error}</div>
          )}

          <button
            type="button"
            disabled={!clienteSel || items.length === 0 || cargando}
            onClick={facturar}
            style={{
              ...botonEstilo(!!clienteSel && items.length > 0 && !cargando),
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

const inputCeldaEstilo = {
  width: "100%",
  padding: "4px 6px",
  border: "1px solid #c8dae8",
  borderRadius: 4,
  fontSize: 12,
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
