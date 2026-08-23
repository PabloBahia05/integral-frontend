import { useState, useEffect, useCallback } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const AFIP_API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n ?? 0);

const periodoLabel = (p) => {
  if (!p || p.length < 6) return p;
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${meses[parseInt(p.slice(4, 6)) - 1]} ${p.slice(0, 4)}`;
};

const periodoActual = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// ── ESTILOS ───────────────────────────────────────────────────────────────────
const S = {
  wrap: {
    minHeight: "100vh",
    background: "#0f1117",
    color: "#e8eaf0",
    fontFamily: "'Inter', sans-serif",
    padding: "0 0 60px",
  },
  header: {
    background: "#161a24",
    borderBottom: "1px solid #1e2535",
    padding: "18px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  logo: {
    background: "linear-gradient(135deg, #3b6fd4, #5b8fff)",
    borderRadius: 10,
    width: 38,
    height: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  title: { fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 },
  subtitle: { fontSize: 12, color: "#6b7a99", margin: 0 },
  badge: {
    background: "#1e2535",
    border: "1px solid #2a3450",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 11,
    color: "#6b7a99",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#f59e0b",
  },
  body: { padding: "28px 32px", maxWidth: 1200, margin: "0 auto" },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
    flexWrap: "wrap",
  },
  select: {
    background: "#161a24",
    border: "1px solid #1e2535",
    borderRadius: 8,
    color: "#e8eaf0",
    padding: "8px 14px",
    fontSize: 13,
    cursor: "pointer",
    outline: "none",
  },
  btn: (active) => ({
    background: active ? "#3b6fd4" : "#161a24",
    border: `1px solid ${active ? "#3b6fd4" : "#1e2535"}`,
    borderRadius: 8,
    color: active ? "#fff" : "#8a95b0",
    padding: "8px 16px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s",
  }),
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 28,
  },
  card: (accent) => ({
    background: "#161a24",
    border: `1px solid #1e2535`,
    borderLeft: `3px solid ${accent}`,
    borderRadius: 10,
    padding: "20px 22px",
  }),
  cardLabel: { fontSize: 11, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 },
  cardValue: (color) => ({ fontSize: 26, fontWeight: 700, color: color ?? "#fff", margin: 0 }),
  cardSub: { fontSize: 12, color: "#6b7a99", marginTop: 4 },
  tabs: { display: "flex", gap: 2, borderBottom: "1px solid #1e2535", marginBottom: 20 },
  tab: (active) => ({
    padding: "10px 20px",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? "#5b8fff" : "#6b7a99",
    cursor: "pointer",
    background: "none",
    border: "none",
    borderBottom: `2px solid ${active ? "#5b8fff" : "transparent"}`,
    marginBottom: -1,
  }),
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "10px 14px",
    fontSize: 11,
    color: "#6b7a99",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "1px solid #1e2535",
    background: "#161a24",
  },
  thR: {
    textAlign: "right",
    padding: "10px 14px",
    fontSize: 11,
    color: "#6b7a99",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "1px solid #1e2535",
    background: "#161a24",
  },
  td: { padding: "11px 14px", borderBottom: "1px solid #111520", color: "#c8d0e0" },
  tdR: { padding: "11px 14px", borderBottom: "1px solid #111520", color: "#c8d0e0", textAlign: "right", fontVariantNumeric: "tabular-nums" },
  pill: (tipo) => {
    const map = {
      "Factura A": { bg: "#1a2a4a", color: "#5b8fff" },
      "Factura B": { bg: "#1a3a2a", color: "#34d399" },
      "Nota de Crédito A": { bg: "#3a1a1a", color: "#f87171" },
      "Nota de Crédito B": { bg: "#3a1a1a", color: "#f87171" },
    };
    const style = map[tipo] ?? { bg: "#1e2535", color: "#8a95b0" };
    return {
      display: "inline-block",
      background: style.bg,
      color: style.color,
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: 11,
      fontWeight: 600,
    };
  },
  saldoBox: (estado) => ({
    background: estado === "a_pagar" ? "#2a1a1a" : "#1a2a1a",
    border: `1px solid ${estado === "a_pagar" ? "#7f1d1d" : "#14532d"}`,
    borderRadius: 10,
    padding: "20px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  }),
  saldoLabel: { fontSize: 13, color: "#9ca3af" },
  saldoValue: (estado) => ({
    fontSize: 32,
    fontWeight: 800,
    color: estado === "a_pagar" ? "#f87171" : "#34d399",
  }),
  saldoTag: (estado) => ({
    background: estado === "a_pagar" ? "#7f1d1d" : "#14532d",
    color: estado === "a_pagar" ? "#fca5a5" : "#86efac",
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
  }),
  empty: { textAlign: "center", padding: "40px 0", color: "#4b5568" },
  error: {
    background: "#2a1a1a",
    border: "1px solid #7f1d1d",
    borderRadius: 8,
    padding: "14px 18px",
    color: "#f87171",
    fontSize: 13,
    marginBottom: 20,
  },
};

// ── PERÍODOS disponibles (últimos 12 meses) ───────────────────────────────────
const periodosDisponibles = () => {
  const lista = [];
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    lista.push(`${y}${m}`);
    d.setMonth(d.getMonth() - 1);
  }
  return lista;
};

// ── COMPONENTE TABLA ──────────────────────────────────────────────────────────
const TablaComprobantes = ({ datos, tipo }) => {
  const esVenta = tipo === "ventas";
  if (!datos?.length) return <div style={S.empty}>Sin comprobantes para este período</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Fecha</th>
            <th style={S.th}>Tipo</th>
            <th style={S.th}>Nro</th>
            <th style={S.th}>{esVenta ? "Cliente" : "Proveedor"}</th>
            <th style={S.thR}>Neto</th>
            <th style={S.thR}>IVA</th>
            <th style={S.thR}>Total</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((row) => (
            <tr key={row.id} style={{ background: "transparent" }}>
              <td style={S.td}>{row.fecha}</td>
              <td style={S.td}><span style={S.pill(row.tipo)}>{row.tipo}</span></td>
              <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{row.nro}</td>
              <td style={S.td}>{esVenta ? row.cliente : row.proveedor}</td>
              <td style={{ ...S.tdR, color: row.neto < 0 ? "#f87171" : "#c8d0e0" }}>{fmt(row.neto)}</td>
              <td style={{ ...S.tdR, color: row.iva < 0 ? "#f87171" : "#c8d0e0" }}>{fmt(row.iva)}</td>
              <td style={{ ...S.tdR, fontWeight: 600, color: row.total < 0 ? "#f87171" : "#fff" }}>{fmt(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function AfipIVA({ token, onBack }) {
  const [periodo, setPeriodo] = useState(periodoActual());
  const [tab, setTab] = useState("resumen");
  const [resumen, setResumen] = useState(null);
  const [ventas, setVentas] = useState(null);
  const [compras, setCompras] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [rRes, vRes, cRes] = await Promise.all([
        fetch(`${AFIP_API}/afip/resumen-iva?periodo=${periodo}`, { headers }),
        fetch(`${AFIP_API}/afip/ventas?periodo=${periodo}`, { headers }),
        fetch(`${AFIP_API}/afip/compras?periodo=${periodo}`, { headers }),
      ]);
      if (!rRes.ok || !vRes.ok || !cRes.ok) throw new Error("Error al conectar con el servicio AFIP");
      const [r, v, c] = await Promise.all([rRes.json(), vRes.json(), cRes.json()]);
      setResumen(r);
      setVentas(v);
      setCompras(c);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const periodos = periodosDisponibles();

  return (
    <div style={S.wrap}>
      {/* HEADER */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "1px solid #1e2535", borderRadius: 8, color: "#6b7a99", padding: "6px 12px", cursor: "pointer", fontSize: 13, marginRight: 4 }}>
              ← Volver
            </button>
          )}
          <div style={S.logo}>A</div>
          <div>
            <p style={S.title}>AFIP · Estado IVA</p>
            <p style={S.subtitle}>Posición fiscal en tiempo real</p>
          </div>
        </div>
        <div style={S.badge}>
          <span style={S.badgeDot} />
          Modo mock — sin certificado real
        </div>
      </div>

      <div style={S.body}>
        {/* TOOLBAR */}
        <div style={S.toolbar}>
          <select style={S.select} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            {periodos.map((p) => (
              <option key={p} value={p}>{periodoLabel(p)}</option>
            ))}
          </select>
          <button style={S.btn(false)} onClick={fetchData} disabled={loading}>
            {loading ? "Actualizando..." : "↻ Actualizar"}
          </button>
        </div>

        {error && <div style={S.error}>⚠ {error}</div>}

        {/* SALDO IVA */}
        {resumen && (
          <div style={S.saldoBox(resumen.estado)}>
            <div>
              <div style={S.saldoLabel}>Saldo IVA · {periodoLabel(periodo)}</div>
              <div style={S.saldoValue(resumen.estado)}>{fmt(resumen.saldo_iva)}</div>
            </div>
            <span style={S.saldoTag(resumen.estado)}>
              {resumen.estado === "a_pagar" ? "A PAGAR" : "A FAVOR"}
            </span>
          </div>
        )}

        {/* CARDS */}
        {resumen && ventas && compras && (
          <div style={S.cards}>
            <div style={S.card("#5b8fff")}>
              <div style={S.cardLabel}>Débito fiscal (ventas)</div>
              <div style={S.cardValue("#5b8fff")}>{fmt(resumen.debito_fiscal)}</div>
              <div style={S.cardSub}>Neto ventas: {fmt(ventas.totales.neto)}</div>
            </div>
            <div style={S.card("#34d399")}>
              <div style={S.cardLabel}>Crédito fiscal (compras)</div>
              <div style={S.cardValue("#34d399")}>{fmt(resumen.credito_fiscal)}</div>
              <div style={S.cardSub}>Neto compras: {fmt(compras.totales.neto)}</div>
            </div>
            <div style={S.card("#f59e0b")}>
              <div style={S.cardLabel}>Total facturado</div>
              <div style={S.cardValue("#f59e0b")}>{fmt(ventas.totales.total)}</div>
              <div style={S.cardSub}>{ventas.comprobantes.length} comprobantes</div>
            </div>
            <div style={S.card("#a78bfa")}>
              <div style={S.cardLabel}>Total comprado</div>
              <div style={S.cardValue("#a78bfa")}>{fmt(compras.totales.total)}</div>
              <div style={S.cardSub}>{compras.comprobantes.length} comprobantes</div>
            </div>
          </div>
        )}

        {/* TABS + TABLAS */}
        <div style={{ background: "#161a24", border: "1px solid #1e2535", borderRadius: 10, padding: "0 0 4px" }}>
          <div style={S.tabs}>
            {[
              { key: "resumen", label: "Resumen" },
              { key: "ventas", label: `Ventas (${ventas?.comprobantes?.length ?? 0})` },
              { key: "compras", label: `Compras (${compras?.comprobantes?.length ?? 0})` },
            ].map((t) => (
              <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "0 16px 16px" }}>
            {tab === "resumen" && resumen && (
              <table style={S.table}>
                <tbody>
                  {[
                    ["Período", periodoLabel(resumen.periodo)],
                    ["Débito fiscal (IVA ventas)", fmt(resumen.debito_fiscal)],
                    ["Crédito fiscal (IVA compras)", fmt(resumen.credito_fiscal)],
                    ["Saldo IVA", fmt(resumen.saldo_iva)],
                    ["Estado", resumen.estado === "a_pagar" ? "A pagar" : "A favor"],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ ...S.td, color: "#6b7a99", width: "40%" }}>{k}</td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "ventas" && <TablaComprobantes datos={ventas?.comprobantes} tipo="ventas" />}
            {tab === "compras" && <TablaComprobantes datos={compras?.comprobantes} tipo="compras" />}
          </div>
        </div>
      </div>
    </div>
  );
}
