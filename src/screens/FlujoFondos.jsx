import { useState, useEffect, useMemo } from "react";

const API = "https://integral-backend-production.up.railway.app";

const hoy = () => new Date().toISOString().slice(0, 10);
const haceUnMes = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
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
  forma_pago: "",
  proveedor: "",
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
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_GASTO());
  const [error, setError] = useState("");

  const cargarTodo = () => {
    setLoading(true);
    const qs = `?desde=${desde}&hasta=${hasta}`;
    Promise.all([
      authFetch(`${API}/flujo-fondos${qs}`).then((r) => r.json()),
      authFetch(`${API}/flujo-fondos/resumen-periodo${qs}&agrupar=${agrupar}`).then((r) =>
        r.json(),
      ),
      authFetch(`${API}/gastos${qs}`).then((r) => r.json()),
    ])
      .then(([mov, res, gas]) => {
        setMovimientos(Array.isArray(mov) ? mov : []);
        setResumen(Array.isArray(res) ? res : []);
        setGastos(Array.isArray(gas) ? gas : []);
      })
      .catch(() => {
        setMovimientos([]);
        setResumen([]);
        setGastos([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, agrupar]);

  const saldoActual = movimientos.length
    ? movimientos[movimientos.length - 1].saldo_acumulado
    : 0;

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
            <div className="ff-saldo-lbl">Saldo acumulado</div>
            <div className={`ff-saldo-val ${saldoActual >= 0 ? "pos" : "neg"}`}>
              {fmtMoneda(saldoActual)}
            </div>
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
          <span className="ff-count">
            {loading
              ? "Cargando…"
              : `${movimientos.length} movimientos · ${fmtMoneda(totales.ingresos)} ingresos · ${fmtMoneda(totales.egresos)} egresos`}
          </span>
        </div>

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
                width={Math.max(560, resumen.length * 64)}
                height="220"
                style={{ display: "block" }}
              >
                {resumen.map((p, i) => {
                  const cx = i * 64 + 40;
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
                        x1={cx - 30}
                        y1={baseY}
                        x2={cx + 30}
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
          </div>
          <div className="ff-wrap">
            <table className="ff-tbl">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Concepto</th>
                  <th>Origen</th>
                  <th>Monto</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="ff-empty">
                        <div style={{ fontSize: 28 }}>💤</div>
                        Sin movimientos en el período elegido
                      </div>
                    </td>
                  </tr>
                ) : (
                  movimientos.map((m, i) => (
                    <tr key={`${m.origen}-${m.refId}-${i}`}>
                      <td>{fmtFecha(m.fecha)}</td>
                      <td>
                        <span className={`ff-badge ${m.tipo}`}>
                          {m.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                        </span>
                      </td>
                      <td>{m.concepto}</td>
                      <td>
                        <span className="ff-origen">
                          {m.origen === "cobro"
                            ? "Cuenta corriente"
                            : m.origen === "factura"
                              ? "Factura proveedor"
                              : "Gasto manual"}
                        </span>
                      </td>
                      <td>
                        <span className={`ff-monto ${m.tipo}`}>
                          {m.tipo === "ingreso" ? "+" : "-"}
                          {fmtMoneda(m.monto)}
                        </span>
                      </td>
                      <td>
                        <span className="ff-saldo-cell">
                          {fmtMoneda(m.saldo_acumulado)}
                        </span>
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
                  <input
                    className="ff-inp"
                    value={form.forma_pago}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, forma_pago: e.target.value }))
                    }
                    placeholder="Ej: Efectivo, Transferencia…"
                  />
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
      </div>
    </>
  );
}
