import { useEffect, useRef, useState } from "react";

const API = "http://localhost:3001";
const WS  = "ws://localhost:3001";

const STYLE = `
  .anviz-wrap { padding: 24px; font-family: 'Space Mono', monospace; }
  .anviz-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
  .anviz-title { font-size: 22px; font-weight: 800; color: #0a3a5c; flex: 1; }
  .anviz-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; }
  .anviz-badge.on  { background: #d4f7e7; color: #0a7a3c; border: 1px solid #0a7a3c44; }
  .anviz-badge.off { background: #fde8e8; color: #c0392b; border: 1px solid #c0392b44; }
  .anviz-badge.warn { background: #fff8e1; color: #b7700a; border: 1px solid #b7700a44; }
  .anviz-notice { background: #fff8e1; border: 1px solid #f0c040; border-radius: 6px; padding: 12px 16px;
    font-size: 12px; color: #7a5500; margin-bottom: 20px; }
  .anviz-stats { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
  .anviz-stat { background: #fff; border: 1px solid #a0cce8; border-radius: 6px; padding: 14px 20px; min-width: 110px; }
  .anviz-stat .num { font-size: 28px; font-weight: 800; color: #0a3a5c; }
  .anviz-stat .lbl { font-size: 10px; color: #6699bb; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
  .anviz-filters { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
  .anviz-filters input, .anviz-filters select {
    border: 1px solid #a0cce8; border-radius: 4px; padding: 7px 12px;
    font-family: inherit; font-size: 13px; color: #0a3a5c; background: #fff; outline: none;
  }
  .anviz-filters input:focus { border-color: #4361ee; }
  .anviz-btn { padding: 7px 16px; border: 1px solid #4361ee; border-radius: 4px; background: #4361ee;
    color: #fff; font-family: inherit; font-size: 12px; cursor: pointer; transition: opacity 0.15s; }
  .anviz-btn:hover { opacity: 0.85; }
  .anviz-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .anviz-btn.sec { background: #fff; color: #4361ee; }
  .anviz-btn.grn { background: #0a7a3c; border-color: #0a7a3c; }
  .anviz-table-wrap { overflow-x: auto; }
  table.anviz { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.anviz th { background: #0a3a5c; color: #fff; padding: 10px 14px; text-align: left;
    font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }
  table.anviz td { padding: 10px 14px; border-bottom: 1px solid #e0eef8; color: #2a3a5c; }
  table.anviz tr:hover td { background: #f0f8ff; }
  table.anviz tr.nueva td { animation: flashRow 1.5s ease; }
  .tag { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
  .tag.entrada { background: #d4f7e7; color: #0a7a3c; }
  .tag.salida  { background: #fde8e8; color: #c0392b; }
  .empty { text-align: center; color: #99bbcc; padding: 40px; font-size: 13px; }
  .sync-msg { font-size: 11px; color: #6699bb; margin-left: 8px; }
  @keyframes flashRow { 0%,100% { background: transparent; } 30% { background: #fffbe6; } }
`;

export default function Anviz({ onBack }) {
  const [fichadas, setFichadas]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [status, setStatus]           = useState({ connected: false, lastSync: null, lastError: null, pendingQueue: 0 });
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroUser, setFiltroUser]   = useState("");
  const [nuevasIds, setNuevasIds]     = useState(new Set());
  const [syncing, setSyncing]         = useState(false);
  const [syncMsg, setSyncMsg]         = useState("");
  const wsRef = useRef(null);

  // ── Cargar fichadas ────────────────────────────────────────────────────────
  const fetchFichadas = (fecha, userId) => {
    setLoading(true);
    let url = `${API}/fichadas?limit=200`;
    if (fecha)  url += `&fecha=${fecha}`;
    if (userId) url += `&user_id=${userId}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setFichadas(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  // ── Status del agente ──────────────────────────────────────────────────────
  const fetchStatus = () => {
    fetch(`${API}/anviz/status`)
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => {});
  };

  useEffect(() => {
    fetchStatus();
    setInterval(fetchStatus, 10_000); // actualizar cada 10s
    const hoy = new Date().toISOString().split("T")[0];
    setFiltroFecha(hoy);
    fetchFichadas(hoy, "");
  }, []);

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const ws = new WebSocket(WS);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "anviz_status") setStatus((s) => ({ ...s, ...msg }));
      if (msg.type === "fichada") {
        const f = msg.data;
        setFichadas((prev) => [f, ...prev]);
        setNuevasIds((prev) => new Set([...prev, f.id]));
        setTimeout(() => setNuevasIds((prev) => { const s = new Set(prev); s.delete(f.id); return s; }), 2000);
      }
    };
    ws.onerror = () => {};
    return () => ws.close();
  }, []);

  // ── Sync manual ───────────────────────────────────────────────────────────
  const handleSync = () => {
    setSyncing(true);
    setSyncMsg("");
    fetch(`${API}/anviz/sync`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        setSyncMsg(d.ok ? "✅ Sincronización iniciada" : `⚠️ ${d.error}`);
        if (d.ok) setTimeout(() => fetchFichadas(filtroFecha, filtroUser), 5000);
      })
      .catch(() => setSyncMsg("⚠️ Error de conexión"))
      .finally(() => setSyncing(false));
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const entradas = fichadas.filter((f) => f.direccion === "entrada").length;
  const salidas  = fichadas.filter((f) => f.direccion === "salida").length;
  const usuarios = new Set(fichadas.map((f) => f.user_id)).size;

  const fmtTs = (ts) => {
    if (!ts) return "—";
    const d   = new Date(ts + "Z");
    const pad = (n) => n.toString().padStart(2, "0");
    return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth()+1)}/${d.getUTCFullYear()} ` +
           `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  };

  const badgeClass = status.connected ? "on" : status.lastError?.includes("red local") ? "warn" : "off";
  const badgeText  = status.connected
    ? "● CONECTADO"
    : status.lastError?.includes("red local")
      ? "⚠ FUERA DE RED LOCAL"
      : "○ DESCONECTADO";

  return (
    <div className="anviz-wrap">
      <style>{STYLE}</style>

      {/* Header */}
      <div className="anviz-header">
        <button className="anviz-btn sec" onClick={onBack}>← Volver</button>
        <span className="anviz-title">🕐 Control de Accesos</span>
        <span className={`anviz-badge ${badgeClass}`}>{badgeText}</span>
        <button className="anviz-btn grn" onClick={handleSync} disabled={syncing || !status.connected}>
          {syncing ? "Sincronizando..." : "🔄 Sincronizar"}
        </button>
        {syncMsg && <span className="sync-msg">{syncMsg}</span>}
      </div>

      {/* Aviso si no está en red local */}
      {status.lastError && (
        <div className="anviz-notice">
          ⚠️ {status.lastError}. Los datos mostrados son los últimos sincronizados.
          {status.pendingQueue > 0 && ` Hay ${status.pendingQueue} eventos pendientes de subir.`}
        </div>
      )}

      {/* Stats */}
      <div className="anviz-stats">
        <div className="anviz-stat">
          <div className="num">{fichadas.length}</div>
          <div className="lbl">Total</div>
        </div>
        <div className="anviz-stat">
          <div className="num" style={{ color: "#0a7a3c" }}>{entradas}</div>
          <div className="lbl">Entradas</div>
        </div>
        <div className="anviz-stat">
          <div className="num" style={{ color: "#c0392b" }}>{salidas}</div>
          <div className="lbl">Salidas</div>
        </div>
        <div className="anviz-stat">
          <div className="num" style={{ color: "#4361ee" }}>{usuarios}</div>
          <div className="lbl">Usuarios</div>
        </div>
        {status.lastSync && (
          <div className="anviz-stat">
            <div className="num" style={{ fontSize: 13, paddingTop: 4 }}>
              {new Date(status.lastSync).toLocaleTimeString("es-AR")}
            </div>
            <div className="lbl">Última sync</div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="anviz-filters">
        <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} />
        <input
          type="number" placeholder="User ID" value={filtroUser}
          onChange={(e) => setFiltroUser(e.target.value)} style={{ width: 100 }}
        />
        <button className="anviz-btn" onClick={() => fetchFichadas(filtroFecha, filtroUser)}>Buscar</button>
        <button className="anviz-btn sec" onClick={() => {
          const hoy = new Date().toISOString().split("T")[0];
          setFiltroFecha(hoy); setFiltroUser(""); fetchFichadas(hoy, "");
        }}>Hoy</button>
      </div>

      {/* Tabla */}
      <div className="anviz-table-wrap">
        {loading ? (
          <p className="empty">Cargando...</p>
        ) : fichadas.length === 0 ? (
          <p className="empty">Sin registros para el filtro seleccionado</p>
        ) : (
          <table className="anviz">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Acción</th>
                <th>Fecha / Hora (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {fichadas.map((f) => (
                <tr key={f.id} className={nuevasIds.has(f.id) ? "nueva" : ""}>
                  <td style={{ color: "#99bbcc" }}>{f.user_id}</td>
                  <td><strong>{f.nombre_completo?.trim() || `Usuario ${f.user_id}`}</strong></td>
                  <td>
                    <span className={`tag ${f.direccion}`}>
                      {f.direccion === "entrada" ? "🟢 ENTRADA" : "🔴 SALIDA"}
                    </span>
                  </td>
                  <td>{fmtTs(f.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
