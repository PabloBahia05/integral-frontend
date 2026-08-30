import { useState, useEffect } from "react";
import ScreenHeader from "../Component/ScreenHeader";
import { verFacturaPDF, imprimirFacturaPDF } from "../pdf/facturaPdf";

const API = "https://integral-backend-production.up.railway.app";

const soloDigitos = (v) => String(v ?? "").replace(/\D/g, "");
const fmt = (v) =>
  Number(v || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let nextItemId = 1;

// FacturaManual.jsx — "Facturar" dentro de Facturas Emitidas: factura
// libre, sin depender de un presupuesto/obra confirmada. Layout inspirado
// en la pantalla de comprobante de venta de referencia (grilla de ítems +
// panel lateral de cliente/artículo), pero recortado a lo que este
// sistema realmente tiene:
//   - Tipo de comprobante y CAE siguen siendo 100% automáticos
//     (resolverTipoFactura en el backend), no se eligen a mano.
//   - El precio unitario es CON IVA incluido (igual criterio que ya
//     tenía el campo "Importe total" antes de esta pantalla); el
//     desglose neto/IVA del pie es solo informativo.
//   - Los artículos salen de la misma tabla que usa Productos.jsx
//     (prop `productos`, mismo criterio que `clientes`: no se vuelve a
//     pedir algo que App.jsx ya carga).
export default function FacturaManual({ clientes, productos, authFetch, onVolver, onFaltanDatosCliente }) {
  const [busqueda, setBusqueda] = useState("");
  const [clienteSel, setClienteSel] = useState(null);
  const [detalle, setDetalle] = useState("");
  const [items, setItems] = useState([]);
  const [itemFocoId, setItemFocoId] = useState(null); // último renglón tocado, para la foto del panel lateral
  const [busquedaArt, setBusquedaArt] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [cargandoPdf, setCargandoPdf] = useState(false);
  const [emisor, setEmisor] = useState(null);
  const [saldoCliente, setSaldoCliente] = useState(null);
  const [saldoError, setSaldoError] = useState(false);

  useEffect(() => {
    authFetch(`${API}/facturas-venta/config-emisor`)
      .then((r) => r.json())
      .then(setEmisor)
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saldo de cuenta corriente del cliente elegido, para el panel lateral.
  // TODO: confirmar la ruta real del módulo CuentaCorriente — esta es un
  // supuesto razonable (GET /cuenta-corriente/saldo/:codcliente) a partir
  // del resto de las rutas de Integral, pero hay que corregirla si no
  // coincide con tu backend.
  useEffect(() => {
    if (!clienteSel) {
      setSaldoCliente(null);
      setSaldoError(false);
      return;
    }
    setSaldoError(false);
    authFetch(`${API}/cuenta-corriente/saldo/${clienteSel.codcliente}`)
      .then((r) => {
        if (!r.ok) throw new Error("saldo no disponible");
        return r.json();
      })
      .then((d) => setSaldoCliente(d))
      .catch(() => {
        setSaldoCliente(null);
        setSaldoError(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteSel]);

  const q = busqueda.trim().toLowerCase();
  const qDigitos = soloDigitos(busqueda);
  const palabras = q.split(/\s+/).filter(Boolean);
  const coincidencias =
    q.length < 2
      ? []
      : (clientes ?? [])
          .filter((c) => {
            const nombreNorm = (c.nombre ?? "").toLowerCase();
            const coincideNombre = palabras.every((p) => nombreNorm.includes(p));
            const coincideCuit = String(c.cuit ?? "").includes(q);
            const coincideCodigo = String(c.codcliente ?? "").includes(q);
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
    const id = nextItemId++;
    setItems((prev) => [
      ...prev,
      {
        id,
        codartint: p.codartint,
        articulo: p.articulo,
        unidad: p.unidad || "",
        artfoto: p.artfoto || null,
        cantidad: 1,
        precioUnit: Number(p.precio_un) || 0, // con IVA incluido
        dtoPct: 0,
        ivaPct: 21,
      },
    ]);
    setItemFocoId(id);
    setBusquedaArt("");
  };

  const actualizarItem = (id, campo, valor) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)),
    );
    setItemFocoId(id);
  };

  const quitarItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (itemFocoId === id) setItemFocoId(null);
  };

  // Cálculos por renglón — precio con IVA incluido, %Dto sobre ese precio.
  const filasCalculadas = items.map((it) => {
    const cant = Number(it.cantidad) || 0;
    const precio = Number(it.precioUnit) || 0;
    const dto = Number(it.dtoPct) || 0;
    const ivaPct = Number(it.ivaPct) || 0;
    const bruto = cant * precio;
    const subtotalConIva = bruto * (1 - dto / 100);
    const subtotalNeto = subtotalConIva / (1 + ivaPct / 100);
    const ivaMonto = subtotalConIva - subtotalNeto;
    return { ...it, bruto, subtotalConIva, subtotalNeto, ivaMonto };
  });

  const suma = filasCalculadas.reduce((a, f) => a + f.bruto, 0);
  const totalDescuento = filasCalculadas.reduce((a, f) => a + (f.bruto - f.subtotalConIva), 0);
  const totalNeto = filasCalculadas.reduce((a, f) => a + f.subtotalNeto, 0);
  const totalIva = filasCalculadas.reduce((a, f) => a + f.ivaMonto, 0);
  const totalFactura = totalNeto + totalIva;

  const itemEnFoco = items.find((it) => it.id === itemFocoId) || items[items.length - 1];

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
          items: filasCalculadas.map((it) => ({
            codartint: it.codartint,
            articulo: it.articulo,
            unidad: it.unidad,
            cantidad: Number(it.cantidad) || 0,
            precio_unitario: Number(it.precioUnit) || 0,
            dto_pct: Number(it.dtoPct) || 0,
            iva_pct: Number(it.ivaPct) || 0,
            subtotal: it.subtotalConIva,
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
    setItemFocoId(null);
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
          {resultado.advertencia && (
            <div
              style={{
                fontSize: 12,
                color: "#7a4a00",
                background: "#fff3d6",
                border: "1px solid #e0b84a",
                borderRadius: 4,
                padding: "10px 12px",
                marginBottom: 12,
              }}
            >
              ⚠️ {resultado.advertencia}
              {resultado.errorGuardado && (
                <div style={{ marginTop: 4, fontFamily: "monospace", fontSize: 11 }}>
                  {resultado.errorGuardado}
                </div>
              )}
              <div style={{ marginTop: 6 }}>
                Anotá el CAE de arriba a mano — la factura ya existe en AFIP aunque no quedó en la base.
              </div>
            </div>
          )}
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
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* ── Columna principal: comprobante ── */}
          <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
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
                  <div style={dropdownEstilo}>
                    {coincidencias.map((c) => (
                      <div
                        key={c.id ?? c.codcliente}
                        onClick={() => elegirCliente(c)}
                        style={opcionEstilo}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#eef4f9")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <strong>{c.nombre}</strong>
                        {c.cuit ? ` — CUIT ${c.cuit}` : c.dni ? ` — DNI ${c.dni}` : ""}
                        {(c.telefono1 || c.telefono2 || c.wapp) && (
                          <span style={{ color: "#5580a0" }}>
                            {" "}— Tel. {c.telefono1 || c.telefono2 || c.wapp}
                          </span>
                        )}
                        {(c.direccion || c.domicilio) && (
                          <div style={{ fontSize: 11, color: "#8aabb8" }}>
                            {c.direccion || c.domicilio}
                            {c.localidad ? `, ${c.localidad}` : ""}
                          </div>
                        )}
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
                    padding: "10px 12px",
                    border: "1px solid #c8dae8",
                    borderRadius: 4,
                    background: "#fff",
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <strong>{clienteSel.nombre}</strong>
                    <button
                      type="button"
                      onClick={() => setClienteSel(null)}
                      style={{ background: "none", border: "none", color: "#a72a2a", cursor: "pointer", fontSize: 12 }}
                    >
                      Cambiar
                    </button>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#5580a0", display: "flex", flexDirection: "column", gap: 2 }}>
                    <span>Código: {clienteSel.codcliente ?? "—"}</span>
                    <span>
                      {clienteSel.cuit ? `CUIT ${clienteSel.cuit}` : clienteSel.dni ? `DNI ${clienteSel.dni}` : "Sin CUIT/DNI cargado"}
                    </span>
                    {(clienteSel.telefono1 || clienteSel.telefono2 || clienteSel.wapp) && (
                      <span>
                        Tel.{" "}
                        {[clienteSel.telefono1, clienteSel.telefono2, clienteSel.wapp]
                          .filter(Boolean)
                          .join(" / ")}
                      </span>
                    )}
                    {(clienteSel.direccion || clienteSel.domicilio) && (
                      <span>
                        {clienteSel.direccion || clienteSel.domicilio}
                        {clienteSel.localidad ? `, ${clienteSel.localidad}` : ""}
                      </span>
                    )}
                    {clienteSel.email && <span>{clienteSel.email}</span>}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label style={etiquetaEstilo}>Artículos</label>
              <input
                type="text"
                placeholder="Buscar por código o nombre... (F4)"
                value={busquedaArt}
                onChange={(e) => setBusquedaArt(e.target.value)}
                style={inputEstilo}
              />
              {coincidenciasArt.length > 0 && (
                <div style={dropdownEstilo}>
                  {coincidenciasArt.map((p) => (
                    <div
                      key={p.codartint}
                      onClick={() => agregarItem(p)}
                      style={opcionEstilo}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#eef4f9")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ fontFamily: "monospace", color: "#5580a0", marginRight: 8 }}>
                        {p.codartint}
                      </span>
                      <strong>{p.articulo}</strong>
                      {p.precio_un != null && (
                        <span style={{ color: "#5580a0", marginLeft: 8 }}>${fmt(p.precio_un)}</span>
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
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#0a3a5c", borderBottom: "1px solid #c8dae8" }}>
                        <th style={{ padding: "6px 4px" }}>Código</th>
                        <th style={{ padding: "6px 4px" }}>Descripción</th>
                        <th style={{ padding: "6px 4px", width: 70 }}>Cant.</th>
                        <th style={{ padding: "6px 4px", width: 100 }}>Precio</th>
                        <th style={{ padding: "6px 4px", width: 65 }}>%Dto</th>
                        <th style={{ padding: "6px 4px", width: 65 }}>%IVA</th>
                        <th style={{ padding: "6px 4px", width: 100, textAlign: "right" }}>Subtotal</th>
                        <th style={{ width: 26 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {filasCalculadas.map((it) => (
                        <tr
                          key={it.id}
                          onClick={() => setItemFocoId(it.id)}
                          style={{
                            borderBottom: "1px solid #eef4f9",
                            background: itemFocoId === it.id ? "#f3f8fc" : "transparent",
                            cursor: "default",
                          }}
                        >
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
                          <td style={{ padding: "6px 4px" }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={it.dtoPct}
                              onChange={(e) => actualizarItem(it.id, "dtoPct", e.target.value)}
                              style={inputCeldaEstilo}
                            />
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={it.ivaPct}
                              onChange={(e) => actualizarItem(it.id, "ivaPct", e.target.value)}
                              style={inputCeldaEstilo}
                            />
                          </td>
                          <td style={{ padding: "6px 4px", textAlign: "right" }}>
                            ${fmt(it.subtotalConIva)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                quitarItem(it.id);
                              }}
                              title="Quitar renglón"
                              style={{ background: "none", border: "none", color: "#a72a2a", cursor: "pointer" }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 24,
                      marginTop: 10,
                      padding: "10px 12px",
                      background: "#fff",
                      border: "1px solid #c8dae8",
                      borderRadius: 4,
                      fontSize: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <TotalCelda label="Suma" valor={suma} />
                    <TotalCelda label="Descuento" valor={totalDescuento} />
                    <TotalCelda label="Neto" valor={totalNeto} />
                    <TotalCelda label="IVA" valor={totalIva} />
                    <TotalCelda label="Total" valor={totalFactura} destacado />
                  </div>
                </div>
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

            {error && <div style={{ fontSize: 12, color: "#a72a2a" }}>❌ {error}</div>}

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

          {/* ── Panel lateral: cliente + artículo en foco ── */}
          <div style={{ flex: "0 0 260px", display: "flex", flexDirection: "column", gap: 12 }}>
            {clienteSel && (
              <PanelLateral titulo="Cliente">
                <div style={{ fontSize: 12, color: "#0a3a5c", fontWeight: 700, marginBottom: 6 }}>
                  {clienteSel.nombre}
                </div>
                {saldoCliente ? (
                  <>
                    <FilaPanel label="Saldo actual" valor={`$${fmt(saldoCliente.saldo_actual ?? saldoCliente.saldo)}`} />
                    {saldoCliente.saldo_proyectado != null && (
                      <FilaPanel
                        label="Saldo proyectado"
                        valor={`$${fmt(saldoCliente.saldo_proyectado)}`}
                      />
                    )}
                  </>
                ) : saldoError ? (
                  <p style={{ fontSize: 11, color: "#8aabb8" }}>
                    No se pudo obtener el saldo (endpoint a confirmar).
                  </p>
                ) : (
                  <p style={{ fontSize: 11, color: "#8aabb8" }}>Consultando saldo...</p>
                )}
              </PanelLateral>
            )}

            {itemEnFoco && (
              <PanelLateral titulo="Artículo">
                <div style={{ fontSize: 12, color: "#0a3a5c", fontWeight: 700, marginBottom: 6 }}>
                  {itemEnFoco.articulo}
                </div>
                {itemEnFoco.artfoto ? (
                  <img
                    src={itemEnFoco.artfoto}
                    alt={itemEnFoco.articulo}
                    style={{ width: "100%", borderRadius: 4, border: "1px solid #eef4f9" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "4 / 3",
                      background: "#f3f8fc",
                      borderRadius: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#8aabb8",
                      fontSize: 11,
                    }}
                  >
                    🖼️ Sin imagen
                  </div>
                )}
              </PanelLateral>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TotalCelda({ label, valor, destacado }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 10, color: "#5580a0", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontWeight: destacado ? 700 : 500, color: destacado ? "#0a3a5c" : "#333", fontSize: destacado ? 15 : 12 }}>
        ${fmt(valor)}
      </div>
    </div>
  );
}

function PanelLateral({ titulo, children }) {
  return (
    <div style={{ border: "1px solid #c8dae8", borderRadius: 6, background: "#fff", overflow: "hidden" }}>
      <div
        style={{
          background: "#eef4f9",
          color: "#0a3a5c",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          padding: "6px 12px",
        }}
      >
        {titulo}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}

function FilaPanel({ label, valor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
      <span style={{ color: "#5580a0" }}>{label}</span>
      <strong style={{ color: "#0a3a5c" }}>{valor}</strong>
    </div>
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

const dropdownEstilo = {
  marginTop: 4,
  border: "1px solid #c8dae8",
  borderRadius: 4,
  background: "#fff",
  maxHeight: 220,
  overflowY: "auto",
};

const opcionEstilo = {
  padding: "8px 12px",
  fontSize: 12,
  cursor: "pointer",
  borderBottom: "1px solid #eef4f9",
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
