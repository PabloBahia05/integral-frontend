import { useState, useEffect, useMemo } from "react";
import { generarPdfRecibo } from "../pdf/pdfRecibo";

const API = "https://integral-backend-production.up.railway.app";

// Fecha LOCAL como YYYY-MM-DD. No usar toISOString(): devuelve la fecha en
// UTC y, pasadas las 21 hs en Argentina, "hoy" pasaba a ser mañana.
const aISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hoy = () => aISO(new Date());
const haceUnMes = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return aISO(d);
};

const FORMAS_PAGO = ["Efectivo", "Transferencia", "Cheque", "Tarjeta", "Otro"];
// Si un movimiento viejo trae una forma de pago escrita a mano que no está
// en la lista, se conserva como opción para no perderla al editar.
const opcionesForma = (actual) =>
  !actual || FORMAS_PAGO.includes(actual) ? FORMAS_PAGO : [...FORMAS_PAGO, actual];

const ORIGEN_LABEL = {
  cobro: "Cobro",
  ingreso_vario: "Ingreso",
  factura: "Factura",
  gasto: "Gasto",
};

const fmtMoneda = (n) =>
  Number(n ?? 0).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const fmtFecha = (f) => {
  if (!f) return "—";
  const s = typeof f === "string" ? f : new Date(f).toISOString();
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

const EMPTY_GASTO = () => ({
  fecha: hoy(),
  concepto: "",
  categoria: "",
  monto: "",
  forma_pago: "Efectivo",
  proveedor: "",
});

const EMPTY_INGRESO = () => ({
  fecha: hoy(),
  concepto: "",
  categoria: "",
  monto: "",
  forma_pago: "Efectivo",
  cliente: "",
});

const EMPTY_RECIBO = () => ({
  numeropres: "",
  monto: "",
  concepto: "Anticipo",
  detalle: "",
  forma_pago: "Efectivo",
  fecha: hoy(),
});

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  .ff { font-family:'DM Sans',sans-serif; background:#f0f4f8; min-height:100vh; padding:32px 28px; color:#1a2332; }

  .ff-hdr { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:16px; }
  .ff-eyebrow { font-size:11px; font-weight:500; letter-spacing:.14em; text-transform:uppercase; color:#7a92b0; }
  .ff-title { font-family:'Syne',sans-serif; font-size:32px; font-weight:800; color:#0f1f35; line-height:1; display:flex; align-items:center; gap:10px; }
  .ff-icon { width:38px; height:38px; background:linear-gradient(135deg,#059669,#047857); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; }

  .ff-saldo { text-align:right; }
  .ff-saldo-lbl { font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#7a92b0; }
  .ff-saldo-val { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; }
  .ff-saldo-val.pos { color:#059669; }
  .ff-saldo-val.neg { color:#dc2626; }

  .ff-bar { display:flex; gap:12px; margin-bottom:20px; align-items:flex-end; flex-wrap:wrap; }
  .ff-fld { display:flex; flex-direction:column; gap:4px; }
  .ff-fld-lbl { font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.06em; }
  .ff-inp, .ff-sel { padding:9px 12px; border:1.5px solid #dde4ef; border-radius:9px; background:#fff; font-family:'DM Sans',sans-serif; font-size:13px; color:#1a2332; outline:none; box-sizing:border-box; }
  .ff-inp:focus, .ff-sel:focus { border-color:#059669; box-shadow:0 0 0 3px rgba(5,150,105,.1); }
  .ff-count { margin-left:auto; align-self:center; font-size:13px; color:#7a92b0; }

  .btn-add { padding:10px 20px; background:linear-gradient(135deg,#059669,#047857); color:#fff; border:none; border-radius:10px; font-family:'Syne',sans-serif; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(5,150,105,.3); white-space:nowrap; transition:transform .15s; }
  .btn-add:hover { transform:translateY(-1px); }
  .btn-recibo { background:linear-gradient(135deg,#2563eb,#1d4ed8); box-shadow:0 4px 12px rgba(37,99,235,.3); }

  .ff-card { background:#fff; border-radius:16px; box-shadow:0 2px 16px rgba(15,31,53,.07); overflow:hidden; border:1px solid #e8edf5; margin-bottom:24px; }
  .ff-card-hdr { padding:16px 20px; border-bottom:1.5px solid #f0f4f8; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
  .ff-card-title { font-family:'Syne',sans-serif; font-size:15px; font-weight:700; color:#0f1f35; }

  /* ── Gráfico ── */
  .ff-chart-wrap { padding:20px; overflow-x:auto; }
  .ff-chart-empty { padding:40px 20px; text-align:center; color:#94a3b8; font-size:13px; font-style:italic; }
  .ff-legend { display:flex; gap:16px; padding:0 20px 16px; font-size:12px; color:#64748b; }
  .ff-legend span { display:inline-flex; align-items:center; gap:6px; }
  .ff-dot { width:9px; height:9px; border-radius:2px; display:inline-block; }

  /* ── Tablas ── */
  .ff-wrap { overflow-x:auto; }
  .ff-tbl { width:100%; border-collapse:collapse; font-size:13px; }
  .ff-tbl thead tr { background:#f7f9fc; border-bottom:2px solid #e8edf5; }
  .ff-tbl th { padding:11px 14px; text-align:left; font-family:'Syne',sans-serif; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#7a92b0; white-space:nowrap; }
  .ff-tbl th:first-child { padding-left:20px; }
  .ff-tbl th:last-child { padding-right:20px; text-align:right; }
  .ff-tbl td { padding:11px 14px; vertical-align:middle; color:#334155; }
  .ff-tbl td:first-child { padding-left:20px; }
  .ff-tbl td:last-child { padding-right:20px; text-align:right; }
  .ff-tbl tbody tr { border-bottom:1px solid #f0f4f8; }
  .ff-tbl tbody tr:hover { background:#f9fbfd; }

  .ff-badge { display:inline-block; padding:3px 9px; border-radius:6px; font-size:11px; font-weight:700; }
  .ff-badge.ingreso { background:#ecfdf5; color:#059669; }
  .ff-badge.egreso { background:#fef2f2; color:#dc2626; }
  .ff-origen { font-size:11px; color:#94a3b8; }
  .ff-monto { font-family:'Syne',sans-serif; font-weight:700; }
  .ff-monto.ingreso { color:#059669; }
  .ff-monto.egreso { color:#dc2626; }
  .ff-saldo-cell { font-family:'Syne',sans-serif; font-weight:700; color:#334155; }

  .ff-empty { display:flex; flex-direction:column; align-items:center; padding:50px 20px; gap:8px; color:#94a3b8; font-size:13px; font-style:italic; }

  .ff-acts { display:flex; gap:5px; justify-content:flex-end; }
  .bic { width:28px; height:28px; border:none; border-radius:7px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:12px; transition:background .15s,transform .1s; }
  .bic:hover { transform:scale(1.08); }
  .bic-ed { background:#eff4ff; } .bic-ed:hover { background:#dbeafe; }
  .bic-dl { background:#fff1f0; } .bic-dl:hover { background:#fee2e2; }

  /* ── Modal ── */
  .mo { position:fixed; inset:0; background:rgba(15,31,53,.45); z-index:1000; display:flex; align-items:center; justify-content:center; }
  .mo-box { background:#fff; border-radius:16px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 60px rgba(15,31,53,.22); padding:24px 26px 20px; }
  .mo-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; padding-bottom:14px; border-bottom:1.5px solid #f0f4f8; }
  .mo-title { font-family:'Syne',sans-serif; font-size:17px; font-weight:800; color:#0f1f35; }
  .mo-close { width:30px; height:30px; border:none; border-radius:8px; background:#f1f5f9; cursor:pointer; font-size:13px; color:#64748b; }
  .mo-close:hover { background:#e2e8f0; }
  .mo-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .mo-grid .full { grid-column:1 / -1; }
  .mo-acts { display:flex; justify-content:flex-end; gap:10px; margin-top:20px; }
  .mo-cancel { padding:9px 16px; background:#f1f5f9; color:#475569; border:none; border-radius:9px; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600; cursor:pointer; }
  .mo-cancel:hover { background:#e2e8f0; }
  .mo-save { padding:9px 18px; background:linear-gradient(135deg,#059669,#047857); color:#fff; border:none; border-radius:9px; font-family:'Syne',sans-serif; font-size:13px; font-weight:700; cursor:pointer; }
  .mo-err { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-radius:8px; padding:8px 12px; font-size:12px; margin-bottom:12px; }

  .btn-ingreso { background:linear-gradient(135deg,#0d9488,#0f766e); box-shadow:0 4px 12px rgba(13,148,136,.3); }
  .ff-saldo-sub { font-size:11px; color:#94a3b8; margin-top:2px; }
  .ff-alert { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; border-radius:10px; padding:10px 14px; font-size:12px; margin-bottom:16px; }
  .ff-alert b { display:block; margin-bottom:4px; }
  .ff-filtros { display:flex; gap:8px; align-items:center; }
  .ff-filtros .ff-sel { padding:6px 10px; font-size:12px; }
  .ff-chip { display:inline-block; padding:2px 8px; border-radius:6px; font-size:10px; font-weight:700; background:#f1f5f9; color:#64748b; white-space:nowrap; }
`;

export default function FlujoFondos({ token }) {
  const authFetch = (url, options = {}) => {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(url, { ...options, headers });
  };

  const [desde, setDesde] = useState(haceUnMes());
  const [hasta, setHasta] = useState(hoy());
  const [agrupar, setAgrupar] = useState("mes");

  const [movimientos, setMovimientos] = useState([]);
  const [resumen, setResumen] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [saldoCaja, setSaldoCaja] = useState(null);
  const [erroresCarga, setErroresCarga] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros del listado de movimientos (solo afectan lo que se ve en la tabla)
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroForma, setFiltroForma] = useState("");

  // Ingresos varios (cobros cotidianos que no son el pago de una obra)
  const [modalIngreso, setModalIngreso] = useState(false);
  const [editIngresoId, setEditIngresoId] = useState(null);
  const [formIngreso, setFormIngreso] = useState(EMPTY_INGRESO());
  const [errorIngreso, setErrorIngreso] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_GASTO());
  const [error, setError] = useState("");

  // ── Recibo ───────────────────────────────────────────────────────────
  const [modalRecibo, setModalRecibo] = useState(false);
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteResultados, setClienteResultados] = useState([]);
  const [clienteElegido, setClienteElegido] = useState(null);
  const [obrasCliente, setObrasCliente] = useState([]);
  const [loadingObrasCliente, setLoadingObrasCliente] = useState(false);
  const [formRecibo, setFormRecibo] = useState(EMPTY_RECIBO());
  const [errorRecibo, setErrorRecibo] = useState("");
  const [guardandoRecibo, setGuardandoRecibo] = useState(false);

  const openRecibo = () => {
    setClienteQuery("");
    setClienteResultados([]);
    setClienteElegido(null);
    setObrasCliente([]);
    setFormRecibo(EMPTY_RECIBO());
    setErrorRecibo("");
    setModalRecibo(true);
  };

  const closeRecibo = () => setModalRecibo(false);

  const buscarCliente = (texto) => {
    setClienteQuery(texto);
    setClienteElegido(null);
    setObrasCliente([]);
    if (!texto.trim() || texto.trim().length < 2) {
      setClienteResultados([]);
      return;
    }
    authFetch(`${API}/clientes/buscar-nombre?q=${encodeURIComponent(texto.trim())}`)
      .then((r) => r.json())
      .then((data) => setClienteResultados(Array.isArray(data) ? data : []))
      .catch(() => setClienteResultados([]));
  };

  const elegirCliente = (c) => {
    setClienteElegido(c);
    setClienteQuery(c.nombre);
    setClienteResultados([]);
    setLoadingObrasCliente(true);
    authFetch(`${API}/tabla-presupuestos/revisiones-confirmadas`)
      .then((r) => r.json())
      .then((data) => {
        const propias = (Array.isArray(data) ? data : []).filter(
          (o) => o.codcliente === c.codcliente,
        );
        setObrasCliente(propias);
      })
      .catch(() => setObrasCliente([]))
      .finally(() => setLoadingObrasCliente(false));
  };

  const guardarRecibo = async () => {
    if (!clienteElegido) return setErrorRecibo("Elegí un cliente.");
    const montoNum = parseFloat(String(formRecibo.monto).replace(",", "."));
    if (!montoNum || montoNum <= 0)
      return setErrorRecibo("Ingresá un monto mayor a cero.");
    if (!formRecibo.fecha) return setErrorRecibo("Elegí una fecha.");

    const obraElegida = formRecibo.numeropres
      ? obrasCliente.find((o) => String(o.numeropres) === String(formRecibo.numeropres))
      : null;

    setGuardandoRecibo(true);
    setErrorRecibo("");
    try {
      const r = await authFetch(`${API}/recibos`, {
        method: "POST",
        body: JSON.stringify({
          codcliente: clienteElegido.codcliente,
          numeropres: obraElegida?.numeropres ?? null,
          revision: obraElegida?.revision ?? null,
          monto: montoNum,
          concepto: formRecibo.concepto || "Anticipo",
          detalle: formRecibo.detalle,
          forma_pago: formRecibo.forma_pago,
          fecha: formRecibo.fecha,
        }),
      });
      const recibo = await r.json();
      if (!r.ok) throw new Error(recibo?.error || "No se pudo guardar el recibo.");

      setModalRecibo(false);
      cargarTodo();

      generarPdfRecibo({ ...recibo, fecha: formRecibo.fecha }, clienteElegido, obraElegida);
    } catch (err) {
      setErrorRecibo(err.message || "No se pudo guardar el recibo.");
    } finally {
      setGuardandoRecibo(false);
    }
  };
  // ── FIN Recibo ───────────────────────────────────────────────────────

  // Antes cualquier error del backend (HTTP 500 con { error }) se tomaba
  // como "lista vacía" y la pantalla mostraba 0 movimientos sin explicar
  // nada. Ahora cada fuente se pide por separado y, si alguna falla, se
  // muestra cuál y por qué (las demás siguen cargando normal).
  const getJson = async (url) => {
    const r = await authFetch(url);
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
    return data;
  };

  const cargarTodo = () => {
    setLoading(true);
    const qs = `?desde=${desde}&hasta=${hasta}`;
    Promise.allSettled([
      getJson(`${API}/flujo-fondos${qs}`),
      getJson(`${API}/flujo-fondos/resumen-periodo${qs}&agrupar=${agrupar}`),
      getJson(`${API}/gastos${qs}`),
      getJson(`${API}/ingresos-varios${qs}`),
      getJson(`${API}/flujo-fondos/saldo?hasta=${hasta}`),
    ])
      .then((rs) => {
        const lista = (i) =>
          rs[i].status === "fulfilled" && Array.isArray(rs[i].value) ? rs[i].value : [];
        setMovimientos(lista(0));
        setResumen(lista(1));
        setGastos(lista(2));
        setIngresos(lista(3));
        setSaldoCaja(
          rs[4].status === "fulfilled" && rs[4].value?.saldo != null
            ? Number(rs[4].value.saldo)
            : null,
        );
        const nombres = ["Movimientos", "Gráfico", "Gastos", "Ingresos varios", "Saldo de caja"];
        setErroresCarga(
          rs
            .map((r, i) =>
              r.status === "rejected" ? `${nombres[i]}: ${r.reason?.message ?? "error"}` : null,
            )
            .filter(Boolean),
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, agrupar]);

  // Efectivo en caja al día "Hasta": viene del backend acumulado desde el
  // principio (no solo de lo que pasó dentro del rango elegido).
  const saldoActual =
    saldoCaja ??
    (movimientos.length ? movimientos[movimientos.length - 1].saldo_acumulado : 0);

  const formasEnListado = useMemo(
    () => [...new Set(movimientos.map((m) => m.forma_pago).filter(Boolean))].sort(),
    [movimientos],
  );
  const movimientosVisibles = useMemo(
    () =>
      movimientos.filter(
        (m) =>
          (!filtroTipo || m.tipo === filtroTipo) &&
          (!filtroForma || (m.forma_pago || "") === filtroForma),
      ),
    [movimientos, filtroTipo, filtroForma],
  );

  const totales = useMemo(() => {
    const ingresos = movimientos
      .filter((m) => m.tipo === "ingreso")
      .reduce((a, m) => a + m.monto, 0);
    const egresos = movimientos
      .filter((m) => m.tipo === "egreso")
      .reduce((a, m) => a + m.monto, 0);
    return { ingresos, egresos };
  }, [movimientos]);

  const maxAbs = useMemo(
    () =>
      Math.max(1, ...resumen.map((p) => Math.max(p.ingresos, p.egresos))),
    [resumen],
  );

  // ── Gastos: alta / edición / baja ─────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_GASTO());
    setEditId(null);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (g) => {
    setForm({
      fecha: g.fecha?.slice(0, 10) ?? hoy(),
      concepto: g.concepto ?? "",
      categoria: g.categoria ?? "",
      monto: g.monto ?? "",
      forma_pago: g.forma_pago ?? "",
      proveedor: g.proveedor ?? "",
    });
    setEditId(g.id);
    setError("");
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const guardarGasto = async () => {
    if (!form.concepto.trim()) return setError("El concepto es obligatorio");
    if (!form.monto || Number(form.monto) <= 0)
      return setError("El monto tiene que ser mayor a 0");

    const url = editId ? `${API}/gastos/${editId}` : `${API}/gastos`;
    const method = editId ? "PUT" : "POST";
    try {
      const r = await authFetch(url, { method, body: JSON.stringify(form) });
      const data = await r.json();
      if (!r.ok) return setError(data.error || "Error al guardar");
      closeModal();
      cargarTodo();
    } catch {
      setError("Error de conexión al guardar");
    }
  };

  const eliminarGasto = async (g) => {
    if (!window.confirm(`¿Eliminar el gasto "${g.concepto}"?`)) return;
    await authFetch(`${API}/gastos/${g.id}`, { method: "DELETE" });
    cargarTodo();
  };

  // ── Ingresos varios: alta / edición / baja ────────────────────────────
  const openAddIngreso = () => {
    setFormIngreso(EMPTY_INGRESO());
    setEditIngresoId(null);
    setErrorIngreso("");
    setModalIngreso(true);
  };

  const openEditIngreso = (g) => {
    setFormIngreso({
      fecha: g.fecha?.slice(0, 10) ?? hoy(),
      concepto: g.concepto ?? "",
      categoria: g.categoria ?? "",
      monto: g.monto ?? "",
      forma_pago: g.forma_pago ?? "",
      cliente: g.cliente ?? "",
    });
    setEditIngresoId(g.id);
    setErrorIngreso("");
    setModalIngreso(true);
  };

  const closeIngreso = () => setModalIngreso(false);

  const guardarIngreso = async () => {
    if (!formIngreso.concepto.trim()) return setErrorIngreso("El concepto es obligatorio");
    const monto = parseFloat(String(formIngreso.monto).replace(",", "."));
    if (!monto || monto <= 0) return setErrorIngreso("El monto tiene que ser mayor a 0");

    const url = editIngresoId
      ? `${API}/ingresos-varios/${editIngresoId}`
      : `${API}/ingresos-varios`;
    try {
      const r = await authFetch(url, {
        method: editIngresoId ? "PUT" : "POST",
        body: JSON.stringify({ ...formIngreso, monto }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return setErrorIngreso(data.error || "Error al guardar");
      closeIngreso();
      cargarTodo();
    } catch {
      setErrorIngreso("Error de conexión al guardar");
    }
  };

  const eliminarIngreso = async (g) => {
    if (!window.confirm(`¿Eliminar el ingreso "${g.concepto}"?`)) return;
    await authFetch(`${API}/ingresos-varios/${g.id}`, { method: "DELETE" });
    cargarTodo();
  };

  const nombreMes = (clave) => {
    // clave puede ser "2026-09" (mes), "2026-09-07" (día o lunes de semana)
    const partes = clave.split("-");
    if (partes.length === 2) {
      const [y, m] = partes;
      const d = new Date(Number(y), Number(m) - 1, 1);
      return d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
    }
    const [, m, d] = partes;
    return `${d}/${m}`;
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="ff">
        <div className="ff-hdr">
          <div>
            <span className="ff-eyebrow">Caja</span>
            <div className="ff-title">
              <div className="ff-icon">💰</div>
              Flujo de Fondos
            </div>
          </div>
          <div className="ff-saldo">
            <div className="ff-saldo-lbl">Efectivo en caja</div>
            <div className={`ff-saldo-val ${saldoActual >= 0 ? "pos" : "neg"}`}>
              {fmtMoneda(saldoActual)}
            </div>
            <div className="ff-saldo-sub">acumulado al {fmtFecha(hasta)}</div>
          </div>
        </div>

        <div className="ff-bar">
          <div className="ff-fld">
            <span className="ff-fld-lbl">Desde</span>
            <input
              type="date"
              className="ff-inp"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div className="ff-fld">
            <span className="ff-fld-lbl">Hasta</span>
            <input
              type="date"
              className="ff-inp"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <div className="ff-fld">
            <span className="ff-fld-lbl">Agrupar</span>
            <select
              className="ff-sel"
              value={agrupar}
              onChange={(e) => setAgrupar(e.target.value)}
            >
              <option value="dia">Día</option>
              <option value="semana">Semana</option>
              <option value="mes">Mes</option>
            </select>
          </div>
          <button className="btn-add" onClick={openAdd}>
            <span>＋</span> Nuevo gasto
          </button>
          <button className="btn-add btn-ingreso" onClick={openAddIngreso}>
            <span>＋</span> Nuevo ingreso
          </button>
          <button className="btn-add btn-recibo" onClick={openRecibo}>
            <span>🧾</span> Recibo
          </button>
          <span className="ff-count">
            {loading
              ? "Cargando…"
              : `${movimientos.length} movimientos · ${fmtMoneda(totales.ingresos)} ingresos · ${fmtMoneda(totales.egresos)} egresos`}
          </span>
        </div>

        {erroresCarga.length > 0 && (
          <div className="ff-alert">
            <b>No se pudo cargar todo el flujo de fondos:</b>
            {erroresCarga.map((e) => (
              <div key={e}>• {e}</div>
            ))}
          </div>
        )}

        {/* ── Gráfico ── */}
        <div className="ff-card">
          <div className="ff-card-hdr">
            <span className="ff-card-title">Ingresos y egresos por período</span>
          </div>
          <div className="ff-legend">
            <span><i className="ff-dot" style={{ background: "#059669" }} /> Ingresos</span>
            <span><i className="ff-dot" style={{ background: "#dc2626" }} /> Egresos</span>
          </div>
          {resumen.length === 0 ? (
            <div className="ff-chart-empty">Sin datos para el período elegido</div>
          ) : (
            <div className="ff-chart-wrap">
              <svg
                width={Math.max(560, resumen.length * 110)}
                height="220"
                style={{ display: "block" }}
              >
                {resumen.map((p, i) => {
                  const cx = i * 110 + 55;
                  const escala = 80 / maxAbs;
                  const hIng = p.ingresos * escala;
                  const hEgr = p.egresos * escala;
                  const baseY = 110;
                  return (
                    <g key={p.periodo}>
                      <rect
                        x={cx - 18}
                        y={baseY - hIng}
                        width="16"
                        height={Math.max(hIng, 0.5)}
                        fill="#059669"
                        rx="2"
                      />
                      <rect
                        x={cx + 2}
                        y={baseY}
                        width="16"
                        height={Math.max(hEgr, 0.5)}
                        fill="#dc2626"
                        rx="2"
                      />
                      <line
                        x1={cx - 50}
                        y1={baseY}
                        x2={cx + 50}
                        y2={baseY}
                        stroke="#e8edf5"
                      />
                      <text
                        x={cx}
                        y={baseY + 32}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#7a92b0"
                        fontFamily="DM Sans, sans-serif"
                      >
                        {nombreMes(p.periodo)}
                      </text>
                      <text
                        x={cx}
                        y={baseY + 48}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill={p.neto >= 0 ? "#059669" : "#dc2626"}
                        fontFamily="Syne, sans-serif"
                      >
                        {fmtMoneda(p.neto)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* ── Listado unificado ── */}
        <div className="ff-card">
          <div className="ff-card-hdr">
            <span className="ff-card-title">Movimientos</span>
            <div className="ff-filtros">
              <select
                className="ff-sel"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="">Ingresos y egresos</option>
                <option value="ingreso">Solo ingresos</option>
                <option value="egreso">Solo egresos</option>
              </select>
              <select
                className="ff-sel"
                value={filtroForma}
                onChange={(e) => setFiltroForma(e.target.value)}
              >
                <option value="">Todas las formas de pago</option>
                {formasEnListado.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="ff-wrap">
            <table className="ff-tbl">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Cliente</th>
                  <th>Proveedor</th>
                  <th>Rubro</th>
                  <th>Ingreso</th>
                  <th>Egreso</th>
                  <th>Efectivo en caja</th>
                  <th>Forma de pago</th>
                </tr>
              </thead>
              <tbody>
                {movimientosVisibles.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="ff-empty">
                        <div style={{ fontSize: 28 }}>💤</div>
                        {movimientos.length === 0
                          ? "Sin movimientos en el período elegido"
                          : "Ningún movimiento coincide con el filtro"}
                      </div>
                    </td>
                  </tr>
                ) : (
                  movimientosVisibles.map((m, i) => (
                    <tr key={`${m.origen}-${m.refId}-${i}`} title={m.concepto}>
                      <td>{fmtFecha(m.fecha)}</td>
                      <td>
                        <span className="ff-chip">{ORIGEN_LABEL[m.origen] ?? m.origen}</span>{" "}
                        {m.concepto}
                      </td>
                      <td>{m.cliente || "—"}</td>
                      <td>{m.proveedor || "—"}</td>
                      <td>{m.rubro || "—"}</td>
                      <td>
                        {m.tipo === "ingreso" ? (
                          <span className="ff-monto ingreso">{fmtMoneda(m.monto)}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {m.tipo === "egreso" ? (
                          <span className="ff-monto egreso">{fmtMoneda(m.monto)}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span className="ff-saldo-cell">
                          {fmtMoneda(m.saldo_acumulado)}
                        </span>
                      </td>
                      <td>{m.forma_pago || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Ingresos varios (para editar/eliminar) ── */}
        <div className="ff-card">
          <div className="ff-card-hdr">
            <span className="ff-card-title">Ingresos varios</span>
          </div>
          <div className="ff-wrap">
            <table className="ff-tbl">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Cliente</th>
                  <th>Forma de pago</th>
                  <th>Monto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ingresos.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="ff-empty">Sin ingresos varios cargados en el período</div>
                    </td>
                  </tr>
                ) : (
                  ingresos.map((g) => (
                    <tr key={g.id}>
                      <td>{fmtFecha(g.fecha)}</td>
                      <td>{g.concepto}</td>
                      <td>{g.categoria || "—"}</td>
                      <td>{g.cliente || "—"}</td>
                      <td>{g.forma_pago || "—"}</td>
                      <td>
                        <span className="ff-monto ingreso">{fmtMoneda(g.monto)}</span>
                      </td>
                      <td>
                        <div className="ff-acts">
                          <button
                            className="bic bic-ed"
                            title="Editar"
                            onClick={() => openEditIngreso(g)}
                          >
                            ✏️
                          </button>
                          <button
                            className="bic bic-dl"
                            title="Eliminar"
                            onClick={() => eliminarIngreso(g)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Gastos manuales (para editar/eliminar) ── */}
        <div className="ff-card">
          <div className="ff-card-hdr">
            <span className="ff-card-title">Gastos manuales</span>
          </div>
          <div className="ff-wrap">
            <table className="ff-tbl">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Proveedor</th>
                  <th>Forma de pago</th>
                  <th>Monto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gastos.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="ff-empty">Sin gastos cargados en el período</div>
                    </td>
                  </tr>
                ) : (
                  gastos.map((g) => (
                    <tr key={g.id}>
                      <td>{fmtFecha(g.fecha)}</td>
                      <td>{g.concepto}</td>
                      <td>{g.categoria || "—"}</td>
                      <td>{g.proveedor || "—"}</td>
                      <td>{g.forma_pago || "—"}</td>
                      <td>
                        <span className="ff-monto egreso">{fmtMoneda(g.monto)}</span>
                      </td>
                      <td>
                        <div className="ff-acts">
                          <button
                            className="bic bic-ed"
                            title="Editar"
                            onClick={() => openEdit(g)}
                          >
                            ✏️
                          </button>
                          <button
                            className="bic bic-dl"
                            title="Eliminar"
                            onClick={() => eliminarGasto(g)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Modal gasto ── */}
        {modalOpen && (
          <div className="mo" onClick={closeModal}>
            <div className="mo-box" onClick={(e) => e.stopPropagation()}>
              <div className="mo-hdr">
                <span className="mo-title">
                  {editId ? "Editar gasto" : "Nuevo gasto"}
                </span>
                <button className="mo-close" onClick={closeModal}>
                  ✕
                </button>
              </div>

              {error && <div className="mo-err">{error}</div>}

              <div className="mo-grid">
                <div className="ff-fld full">
                  <span className="ff-fld-lbl">Concepto</span>
                  <input
                    className="ff-inp"
                    value={form.concepto}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, concepto: e.target.value }))
                    }
                    placeholder="Ej: Sueldo empleado, Alquiler local…"
                  />
                </div>
                <div className="ff-fld">
                  <span className="ff-fld-lbl">Fecha</span>
                  <input
                    type="date"
                    className="ff-inp"
                    value={form.fecha}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fecha: e.target.value }))
                    }
                  />
                </div>
                <div className="ff-fld">
                  <span className="ff-fld-lbl">Monto</span>
                  <input
                    type="number"
                    className="ff-inp"
                    value={form.monto}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, monto: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="ff-fld">
                  <span className="ff-fld-lbl">Categoría</span>
                  <input
                    className="ff-inp"
                    value={form.categoria}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, categoria: e.target.value }))
                    }
                    placeholder="Ej: Sueldos, Servicios…"
                  />
                </div>
                <div className="ff-fld">
                  <span className="ff-fld-lbl">Forma de pago</span>
                  <select
                    className="ff-sel"
                    value={form.forma_pago}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, forma_pago: e.target.value }))
                    }
                  >
                    {opcionesForma(form.forma_pago).map((fp) => (
                      <option key={fp} value={fp}>
                        {fp}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ff-fld full">
                  <span className="ff-fld-lbl">Proveedor (opcional)</span>
                  <input
                    className="ff-inp"
                    value={form.proveedor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, proveedor: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="mo-acts">
                <button className="mo-cancel" onClick={closeModal}>
                  Cancelar
                </button>
                <button className="mo-save" onClick={guardarGasto}>
                  {editId ? "Guardar cambios" : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal ingreso vario ── */}
        {modalIngreso && (
          <div className="mo" onClick={closeIngreso}>
            <div className="mo-box" onClick={(e) => e.stopPropagation()}>
              <div className="mo-hdr">
                <span className="mo-title">
                  {editIngresoId ? "Editar ingreso" : "Nuevo ingreso"}
                </span>
                <button className="mo-close" onClick={closeIngreso}>
                  ✕
                </button>
              </div>

              {errorIngreso && <div className="mo-err">{errorIngreso}</div>}

              <div className="mo-grid">
                <div className="ff-fld full">
                  <span className="ff-fld-lbl">Concepto</span>
                  <input
                    className="ff-inp"
                    value={formIngreso.concepto}
                    onChange={(e) =>
                      setFormIngreso((f) => ({ ...f, concepto: e.target.value }))
                    }
                    placeholder="Ej: Venta de sobrantes, cobro de contado…"
                  />
                </div>
                <div className="ff-fld">
                  <span className="ff-fld-lbl">Fecha</span>
                  <input
                    type="date"
                    className="ff-inp"
                    value={formIngreso.fecha}
                    onChange={(e) =>
                      setFormIngreso((f) => ({ ...f, fecha: e.target.value }))
                    }
                  />
                </div>
                <div className="ff-fld">
                  <span className="ff-fld-lbl">Monto</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="ff-inp"
                    value={formIngreso.monto}
                    onChange={(e) =>
                      setFormIngreso((f) => ({ ...f, monto: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="ff-fld">
                  <span className="ff-fld-lbl">Categoría</span>
                  <input
                    className="ff-inp"
                    value={formIngreso.categoria}
                    onChange={(e) =>
                      setFormIngreso((f) => ({ ...f, categoria: e.target.value }))
                    }
                    placeholder="Ej: Ventas, Varios…"
                  />
                </div>
                <div className="ff-fld">
                  <span className="ff-fld-lbl">Forma de pago</span>
                  <select
                    className="ff-sel"
                    value={formIngreso.forma_pago}
                    onChange={(e) =>
                      setFormIngreso((f) => ({ ...f, forma_pago: e.target.value }))
                    }
                  >
                    {opcionesForma(formIngreso.forma_pago).map((fp) => (
                      <option key={fp} value={fp}>
                        {fp}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ff-fld full">
                  <span className="ff-fld-lbl">Cliente / quién paga (opcional)</span>
                  <input
                    className="ff-inp"
                    value={formIngreso.cliente}
                    onChange={(e) =>
                      setFormIngreso((f) => ({ ...f, cliente: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="mo-acts">
                <button className="mo-cancel" onClick={closeIngreso}>
                  Cancelar
                </button>
                <button className="mo-save" onClick={guardarIngreso}>
                  {editIngresoId ? "Guardar cambios" : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal recibo ── */}
        {modalRecibo && (
          <div className="mo" onClick={closeRecibo}>
            <div className="mo-box" onClick={(e) => e.stopPropagation()}>
              <div className="mo-hdr">
                <span className="mo-title">Nuevo recibo</span>
                <button className="mo-close" onClick={closeRecibo}>
                  ✕
                </button>
              </div>

              {errorRecibo && <div className="mo-err">{errorRecibo}</div>}

              <div className="mo-grid">
                <div className="ff-fld full" style={{ position: "relative" }}>
                  <span className="ff-fld-lbl">Cliente</span>
                  <input
                    className="ff-inp"
                    value={clienteQuery}
                    onChange={(e) => buscarCliente(e.target.value)}
                    placeholder="Buscar cliente por nombre…"
                  />
                  {clienteResultados.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        border: "1.5px solid #dde4ef",
                        borderRadius: 9,
                        marginTop: 4,
                        maxHeight: 180,
                        overflowY: "auto",
                        zIndex: 10,
                        boxShadow: "0 8px 20px rgba(15,31,53,.12)",
                      }}
                    >
                      {clienteResultados.map((c) => (
                        <div
                          key={c.codcliente}
                          onClick={() => elegirCliente(c)}
                          style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13 }}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {c.nombre}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ff-fld">
                  <span className="ff-fld-lbl">Fecha</span>
                  <input
                    type="date"
                    className="ff-inp"
                    value={formRecibo.fecha}
                    onChange={(e) =>
                      setFormRecibo((f) => ({ ...f, fecha: e.target.value }))
                    }
                  />
                </div>
                <div className="ff-fld">
                  <span className="ff-fld-lbl">Monto</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="ff-inp"
                    value={formRecibo.monto}
                    onChange={(e) =>
                      setFormRecibo((f) => ({ ...f, monto: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="ff-fld full">
                  <span className="ff-fld-lbl">Obra vinculada (opcional)</span>
                  <select
                    className="ff-sel"
                    value={formRecibo.numeropres}
                    onChange={(e) =>
                      setFormRecibo((f) => ({ ...f, numeropres: e.target.value }))
                    }
                    disabled={!clienteElegido || loadingObrasCliente}
                  >
                    <option value="">— Sin vincular a una obra puntual —</option>
                    {obrasCliente.map((o) => (
                      <option key={`${o.numeropres}-${o.revision}`} value={o.numeropres}>
                        Presupuesto Nº{o.numeropres} rev.{o.revision}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ff-fld full">
                  <span className="ff-fld-lbl">Concepto</span>
                  <input
                    className="ff-inp"
                    value={formRecibo.concepto}
                    onChange={(e) =>
                      setFormRecibo((f) => ({ ...f, concepto: e.target.value }))
                    }
                    placeholder="Ej: Anticipo, seña…"
                  />
                </div>

                <div className="ff-fld">
                  <span className="ff-fld-lbl">Forma de pago</span>
                  <select
                    className="ff-sel"
                    value={formRecibo.forma_pago}
                    onChange={(e) =>
                      setFormRecibo((f) => ({ ...f, forma_pago: e.target.value }))
                    }
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>

                <div className="ff-fld full">
                  <span className="ff-fld-lbl">Detalle (opcional)</span>
                  <input
                    className="ff-inp"
                    value={formRecibo.detalle}
                    onChange={(e) =>
                      setFormRecibo((f) => ({ ...f, detalle: e.target.value }))
                    }
                    placeholder="Ej: Nº de cheque, banco, últimos dígitos…"
                  />
                </div>
              </div>

              <div className="mo-acts">
                <button className="mo-cancel" onClick={closeRecibo}>
                  Cancelar
                </button>
                <button className="mo-save" onClick={guardarRecibo} disabled={guardandoRecibo}>
                  {guardandoRecibo ? "Guardando…" : "Guardar y descargar PDF"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
