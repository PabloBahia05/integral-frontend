import { useState, useEffect } from "react";

const API = "https://integral-backend-production.up.railway.app";

const fmt = (n) =>
  n != null
    ? Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

const S = {
  wrap: { fontFamily: "'Space Mono', monospace", color: "#0a3a5c", minHeight: "100vh" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title: { fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: "#0a3a5c" },
  subtitle: { fontSize: 11, color: "#6699bb", letterSpacing: 3, textTransform: "uppercase", marginTop: 4 },
  filtros: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20, background: "#f0f8ff", border: "1px solid #a0cce8", borderRadius: 6, padding: "16px" },
  label: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#6699bb", marginBottom: 4, display: "block" },
  input: { width: "100%", padding: "7px 10px", border: "1px solid #a0cce8", borderRadius: 3, fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#0a3a5c", background: "#fff", boxSizing: "border-box" },
  select: { width: "100%", padding: "7px 10px", border: "1px solid #a0cce8", borderRadius: 3, fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#0a3a5c", background: "#fff" },
  btnSecondary: { background: "#fff", color: "#0a3a5c", border: "1px solid #a0cce8", borderRadius: 3, padding: "7px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12, cursor: "pointer" },
  btnSmall: { background: "#e8f5fd", color: "#0a3a5c", border: "1px solid #a0cce8", borderRadius: 3, padding: "5px 11px", fontFamily: "'Space Mono', monospace", fontSize: 11, cursor: "pointer" },
  btnDanger: { background: "#fff", color: "#cc3333", border: "1px solid #ffaaaa", borderRadius: 3, padding: "5px 10px", fontFamily: "'Space Mono', monospace", fontSize: 11, cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { background: "#e8f5fd", padding: "8px 12px", textAlign: "left", borderBottom: "2px solid #a0cce8", whiteSpace: "nowrap" },
  td: { padding: "8px 12px", borderBottom: "1px solid #e0eef7", verticalAlign: "middle" },
  badge: (color) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: color + "22", color: color, letterSpacing: 1 }),
  overlay: { position: "fixed", inset: 0, background: "#00000066", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#fff", border: "1px solid #a0cce8", borderRadius: 6, width: "min(860px, 95vw)", maxHeight: "90vh", overflowY: "auto", padding: "32px 36px", position: "relative" },
  modalTitle: { fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 24, color: "#0a3a5c" },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 },
  sectionTitle: { fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#6699bb", borderBottom: "1px solid #e0eef7", paddingBottom: 6, marginBottom: 14 },
};

export default function HistorialFacturas({ proveedores = [] }) {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detalle, setDetalle] = useState(null);

  // Filtros
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [filtroArticulo, setFiltroArticulo] = useState("");
  const [filtroCodProv, setFiltroCodProv] = useState("");
  const [filtroCodInt, setFiltroCodInt] = useState("");
  const [filtroNumero, setFiltroNumero] = useState("");

  useEffect(() => {
    fetchFacturas();
  }, []);

  const fetchFacturas = () => {
    setLoading(true);
    fetch(`${API}/facturas`)
      .then((r) => r.json())
      .then((data) => { setFacturas(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchDetalle = (id) => {
    fetch(`${API}/facturas/${id}`)
      .then((r) => r.json())
      .then((d) => setDetalle(d))
      .catch(console.error);
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar esta factura y sus ítems?")) return;
    await fetch(`${API}/facturas/${id}`, { method: "DELETE" });
    fetchFacturas();
  };

  const limpiarFiltros = () => {
    setFiltroProveedor("");
    setFiltroDesde("");
    setFiltroHasta("");
    setFiltroArticulo("");
    setFiltroCodProv("");
    setFiltroCodInt("");
    setFiltroNumero("");
  };

  // Filtrado
  const facturasFiltradas = facturas.filter((f) => {
    if (filtroProveedor && String(f.proveedor_id) !== String(filtroProveedor)) return false;
    if (filtroNumero && !(f.numero ?? "").toLowerCase().includes(filtroNumero.toLowerCase())) return false;
    if (filtroDesde && f.fecha && f.fecha.slice(0, 10) < filtroDesde) return false;
    if (filtroHasta && f.fecha && f.fecha.slice(0, 10) > filtroHasta) return false;
    return true;
  });

  // Filtros por artículo/código requieren buscar en items — filtramos contra detalle cargado
  // Se aplican solo si están completados (búsqueda en backend)
  const hayFiltroItems = filtroArticulo || filtroCodProv || filtroCodInt;

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Historial de Facturas</h1>
          <p style={S.subtitle}>Comprobantes anteriores</p>
        </div>
        <button style={S.btnSecondary} onClick={fetchFacturas}>↺ Actualizar</button>
      </div>

      {/* Filtros */}
      <div style={S.filtros}>
        <div>
          <label style={S.label}>Proveedor</label>
          <select style={S.select} value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)}>
            <option value="">Todos</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.provnombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={S.label}>Número</label>
          <input style={S.input} placeholder="0001-00001234" value={filtroNumero} onChange={(e) => setFiltroNumero(e.target.value)} />
        </div>
        <div>
          <label style={S.label}>Desde</label>
          <input type="date" style={S.input} value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} />
        </div>
        <div>
          <label style={S.label}>Hasta</label>
          <input type="date" style={S.input} value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} />
        </div>
        <div>
          <label style={S.label}>Descripción artículo</label>
          <input style={S.input} placeholder="Bisagra, rueda..." value={filtroArticulo} onChange={(e) => setFiltroArticulo(e.target.value)} />
        </div>
        <div>
          <label style={S.label}>Cód. artículo proveedor</label>
          <input style={S.input} placeholder="EX HBMAN03A" value={filtroCodProv} onChange={(e) => setFiltroCodProv(e.target.value)} />
        </div>
        <div>
          <label style={S.label}>Cód. artículo interno</label>
          <input style={S.input} placeholder="SA78018" value={filtroCodInt} onChange={(e) => setFiltroCodInt(e.target.value)} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button style={{ ...S.btnSecondary, width: "100%" }} onClick={limpiarFiltros}>✕ Limpiar</button>
        </div>
      </div>

      {hayFiltroItems && (
        <div style={{ background: "#fffbea", border: "1px solid #f0c040", borderRadius: 4, padding: "8px 14px", marginBottom: 16, fontSize: 11, color: "#7a5c00" }}>
          ⚠ Los filtros por artículo/código buscan dentro de los ítems de cada factura. Puede tardar unos segundos.
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <p style={{ color: "#6699bb", fontSize: 13 }}>Cargando…</p>
      ) : facturasFiltradas.length === 0 ? (
        <p style={{ color: "#6699bb", fontSize: 13 }}>No hay facturas con esos filtros.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <p style={{ fontSize: 11, color: "#6699bb", marginBottom: 8 }}>{facturasFiltradas.length} comprobante{facturasFiltradas.length !== 1 ? "s" : ""}</p>
          <table style={S.table}>
            <thead>
              <tr>
                {["#", "Proveedor", "Tipo", "Número", "Fecha", "Subtotal", "IVA $", "Total", "Moneda", ""].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas.map((f) => (
                <FacturaRow
                  key={f.id}
                  f={f}
                  filtroArticulo={filtroArticulo}
                  filtroCodProv={filtroCodProv}
                  filtroCodInt={filtroCodInt}
                  onVer={() => fetchDetalle(f.id)}
                  onEliminar={() => eliminar(f.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <ModalDetalle detalle={detalle} onClose={() => setDetalle(null)} />
      )}
    </div>
  );
}

// Fila con filtro por ítems lazy (carga ítems solo si hay filtro de artículo)
function FacturaRow({ f, filtroArticulo, filtroCodProv, filtroCodInt, onVer, onEliminar }) {
  const [items, setItems] = useState(null);
  const hayFiltroItems = filtroArticulo || filtroCodProv || filtroCodInt;

  useEffect(() => {
    if (!hayFiltroItems) { setItems(null); return; }
    fetch(`https://integral-backend-production.up.railway.app/facturas-items/${f.id}`)
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, [filtroArticulo, filtroCodProv, filtroCodInt, f.id]);

  // Si hay filtro de items y ya cargaron, verificar si algún ítem matchea
  if (hayFiltroItems) {
    if (items === null) return null; // cargando
    const match = items.some((it) => {
      const desc = (it.descripcion ?? "").toLowerCase();
      const codp = (it.codigo ?? "").toLowerCase();
      if (filtroArticulo && !desc.includes(filtroArticulo.toLowerCase())) return false;
      if (filtroCodProv && !codp.includes(filtroCodProv.toLowerCase())) return false;
      if (filtroCodInt && !codp.includes(filtroCodInt.toLowerCase())) return false;
      return true;
    });
    if (!match) return null;
  }

  const S2 = {
    td: { padding: "8px 12px", borderBottom: "1px solid #e0eef7", verticalAlign: "middle" },
    badge: (color) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: color + "22", color: color, letterSpacing: 1 }),
  };

  return (
    <tr style={{ cursor: "pointer" }} onDoubleClick={onVer}>
      <td style={S2.td}>{f.id}</td>
      <td style={S2.td}>{f.proveedor_nombre ?? <span style={{ color: "#aaa" }}>—</span>}</td>
      <td style={S2.td}>
        {f.tipo_factura
          ? <span style={S2.badge("#0a3a5c")}>F.{f.tipo_factura}</span>
          : <span style={{ color: "#aaa" }}>—</span>}
      </td>
      <td style={S2.td}><strong>{f.numero ?? "—"}</strong></td>
      <td style={S2.td}>{f.fecha?.slice(0, 10) ?? "—"}</td>
      <td style={{ ...S2.td, textAlign: "right" }}>{fmt(f.subtotal)}</td>
      <td style={{ ...S2.td, textAlign: "right" }}>{fmt(f.iva)}</td>
      <td style={{ ...S2.td, textAlign: "right", fontWeight: 700 }}>{fmt(f.total)}</td>
      <td style={S2.td}>
        <span style={S2.badge(f.moneda === "USD" ? "#2255aa" : "#00885a")}>{f.moneda ?? "ARS"}</span>
      </td>
      <td style={S2.td}>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ background: "#e8f5fd", color: "#0a3a5c", border: "1px solid #a0cce8", borderRadius: 3, padding: "5px 11px", fontFamily: "'Space Mono', monospace", fontSize: 11, cursor: "pointer" }} onClick={onVer}>Ver</button>
          <button style={{ background: "#fff", color: "#cc3333", border: "1px solid #ffaaaa", borderRadius: 3, padding: "5px 10px", fontFamily: "'Space Mono', monospace", fontSize: 11, cursor: "pointer" }} onClick={onEliminar}>🗑</button>
        </div>
      </td>
    </tr>
  );
}

function ModalDetalle({ detalle, onClose }) {
  const f = detalle;
  const S2 = {
    overlay: { position: "fixed", inset: 0, background: "#00000066", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" },
    modal: { background: "#fff", border: "1px solid #a0cce8", borderRadius: 6, width: "min(860px, 95vw)", maxHeight: "90vh", overflowY: "auto", padding: "32px 36px" },
    label: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#6699bb", marginBottom: 4, display: "block" },
    th: { background: "#e8f5fd", padding: "8px 12px", textAlign: "left", borderBottom: "2px solid #a0cce8" },
    td: { padding: "8px 12px", borderBottom: "1px solid #e0eef7" },
    row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 },
    btn: { background: "#fff", color: "#0a3a5c", border: "1px solid #a0cce8", borderRadius: 3, padding: "7px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12, cursor: "pointer" },
  };
  return (
    <div style={S2.overlay} onClick={onClose}>
      <div style={S2.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 24, color: "#0a3a5c" }}>
          {f.tipo_factura ? `Factura ${f.tipo_factura} ` : "Factura "}#{f.numero ?? f.id}
        </h2>
        <div style={S2.row3}>
          <div><label style={S2.label}>Proveedor</label><p style={{ fontSize: 13 }}>{f.proveedor_nombre ?? "—"}</p></div>
          <div><label style={S2.label}>Fecha</label><p style={{ fontSize: 13 }}>{f.fecha?.slice(0, 10) ?? "—"}</p></div>
          <div><label style={S2.label}>Moneda</label><p style={{ fontSize: 13 }}>{f.moneda ?? "ARS"}</p></div>
        </div>
        <div style={{ ...S2.row3, marginTop: 12 }}>
          <div><label style={S2.label}>Tipo</label><p style={{ fontSize: 13 }}>{f.tipo_factura ? `Factura ${f.tipo_factura}` : "—"}</p></div>
          <div><label style={S2.label}>Cond. de pago</label><p style={{ fontSize: 13 }}>{f.condicion_pago ?? "—"}</p></div>
          <div><label style={S2.label}>Totales</label><p style={{ fontSize: 13 }}>Sub: <strong>{fmt(f.subtotal)}</strong> · IVA: <strong>{fmt(f.iva)}</strong> · Total: <strong>{fmt(f.total)}</strong></p></div>
        </div>
        {f.imagen_path && (
          <div style={{ margin: "16px 0" }}>
            <label style={S2.label}>Imagen original</label>
            <a href={f.imagen_path} target="_blank" rel="noreferrer">
              <img src={f.imagen_path} alt="factura" style={{ maxHeight: 200, border: "1px solid #a0cce8", borderRadius: 4 }} />
            </a>
          </div>
        )}
        <label style={{ ...S2.label, marginTop: 16 }}>Ítems ({(f.items ?? []).length})</label>
        {(f.items ?? []).length === 0 ? (
          <p style={{ color: "#aaa", fontSize: 12 }}>Sin ítems.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 8 }}>
            <thead>
              <tr>{["Código", "Descripción", "Cantidad", "Precio unit.", "Subtotal"].map((h) => <th key={h} style={S2.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {f.items.map((it) => (
                <tr key={it.id}>
                  <td style={S2.td}>{it.codigo ?? "—"}</td>
                  <td style={S2.td}>{it.descripcion ?? "—"}</td>
                  <td style={{ ...S2.td, textAlign: "right" }}>{it.cantidad ?? "—"}</td>
                  <td style={{ ...S2.td, textAlign: "right" }}>{fmt(it.precio_unit)}</td>
                  <td style={{ ...S2.td, textAlign: "right", fontWeight: 700 }}>{fmt(it.subtotalprod)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
          <button style={S2.btn} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
