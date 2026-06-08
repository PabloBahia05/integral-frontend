import { useEffect, useRef, useState, useCallback } from "react";
import Usuarios from "./Usuarios";

const API = "https://integral-backend-production.up.railway.app";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");

function parseMysqlTs(ts) {
  if (!ts) return null;
  if (typeof ts === "number") return new Date(ts);
  const str = String(ts).trim();
  if (str.includes("T") && str.endsWith("Z")) return new Date(str);
  const clean = str.replace(" ", "T");
  const d = new Date(clean.includes("Z") ? clean : clean + "Z");
  return isNaN(d.getTime()) ? null : d;
}

function fmtFecha(ts) {
  const d = parseMysqlTs(ts);
  if (!d) return "—";
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

function fmtHora(ts) {
  const d = parseMysqlTs(ts);
  if (!d) return "—";
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Anviz({ onBack }) {
  const [vista, setVista]               = useState("fichadas"); // "fichadas" | "usuarios" | "historial"
  const [fichadas, setFichadas]         = useState([]);
  const [usuarios, setUsuarios]         = useState([]);
  const [agente, setAgente]             = useState({ connected: false, lastSync: null, lastError: null, pendingQueue: 0 });
  const [cargando, setCargando]         = useState(true);
  const [error, setError]               = useState(null);
  const [ultimoSync, setUltimoSync]     = useState(null);
  const [syncing, setSyncing]           = useState(false);
  const [syncMsg, setSyncMsg]           = useState("");

  // ── Filtros ────────────────────────────────────────────────────────────────
  const [filtroDesde, setFiltroDesde]         = useState(hoy());
  const [filtroHasta, setFiltroHasta]         = useState(hoy());
  const [filtroUser, setFiltroUser]           = useState("");
  const [filtroDireccion, setFiltroDireccion] = useState("todas");

  const [modal, setModal] = useState(null); // null | "nueva" | "editar"
  const [modalData, setModalData] = useState({ user_id: "", direccion: "entrada", timestamp: "" });
  const [modalFichadaId, setModalFichadaId] = useState(null);
  const [modalGuardando, setModalGuardando] = useState(false);
  const [modalError, setModalError] = useState("");
  const POR_PAGINA = 25;

  // ── Paginación ─────────────────────────────────────────────────────────────
  const [pagina, setPagina] = useState(1);
  const [vistaTabla, setVistaTabla] = useState("tabla"); // "tabla" | "resumen"

  const wsRef = useRef(null);

  // ── Cargar empleados (una vez) ─────────────────────────────────────────────
  useEffect(() => {
    apiFetch("/empleados")
      .then(setUsuarios)
      .catch(() => {});
  }, []);

  // ── Cargar fichadas ────────────────────────────────────────────────────────
  const cargarFichadas = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: 500 });
      if (filtroDesde) params.set("fecha_desde", filtroDesde);
      if (filtroHasta) params.set("fecha_hasta", filtroHasta);
      if (filtroUser)  params.set("user_id", filtroUser);
      const data = await apiFetch(`/fichadas?${params}`);
      setFichadas(Array.isArray(data) ? data : []);
      setUltimoSync(new Date());
      setPagina(1);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [filtroDesde, filtroHasta, filtroUser]);

  useEffect(() => {
    cargarFichadas();
  }, [cargarFichadas]);

  // ── Polling estado agente cada 30s ─────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const data = await apiFetch("/anviz/status");
        setAgente(data);
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 30_000);
    return () => clearInterval(iv);
  }, []);

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const wsUrl = API.replace(/^http/, "ws") + "/ws";
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "fichada") {
            const nueva = msg.data;
            const fechaNueva = nueva.timestamp?.slice(0, 10);
            if (!filtroDesde || (fechaNueva >= filtroDesde && fechaNueva <= filtroHasta)) {
              setFichadas((prev) => [nueva, ...prev]);
            }
          }
          if (msg.type === "anviz_status") {
            setAgente((s) => ({ ...s, connected: msg.connected, lastSync: msg.lastSync }));
          }
        } catch {}
      };
      ws.onerror = () => {};
      return () => ws.close();
    } catch {}
  }, [filtroDesde, filtroHasta]);

  // ── Sync manual ────────────────────────────────────────────────────────────
  const handleSync = () => {
    setSyncing(true);
    setSyncMsg("");
    fetch(`${API}/anviz/sync`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        setSyncMsg(d.ok ? "✅ Sincronización iniciada" : `⚠️ ${d.error}`);
        if (d.ok) setTimeout(cargarFichadas, 5000);
      })
      .catch(() => setSyncMsg("⚠️ Error de conexión"))
      .finally(() => setSyncing(false));
  };

  // ── Derivados ──────────────────────────────────────────────────────────────
  const fichadasFiltradas = fichadas.filter((f) => {
    if (filtroDireccion !== "todas" && f.direccion !== filtroDireccion) return false;
    return true;
  });

  const total     = fichadasFiltradas.length;
  const entradas  = fichadasFiltradas.filter((f) => f.direccion === "entrada").length;
  const salidas   = fichadasFiltradas.filter((f) => f.direccion === "salida").length;
  const empUnicos = [...new Set(fichadasFiltradas.map((f) => f.user_id))].length;

  const paginas  = Math.max(1, Math.ceil(total / POR_PAGINA));
  const inicio   = (pagina - 1) * POR_PAGINA;
  const visibles = fichadasFiltradas.slice(inicio, inicio + POR_PAGINA);

  // Resumen agrupado por empleado
  const resumenEmpleados = Object.values(
    fichadasFiltradas.reduce((acc, f) => {
      const key = f.user_id;
      if (!acc[key])
        acc[key] = {
          user_id: f.user_id,
          nombre: f.nombre_completo?.trim() || `Usuario ${f.user_id}`,
          entradas: 0,
          salidas: 0,
          primera: f.timestamp,
          ultima: f.timestamp,
        };
      if (f.direccion === "entrada") acc[key].entradas++;
      else acc[key].salidas++;
      if (f.timestamp < acc[key].primera) acc[key].primera = f.timestamp;
      if (f.timestamp > acc[key].ultima)  acc[key].ultima  = f.timestamp;
      return acc;
    }, {}),
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  // ── Historial: rango de fechas ─────────────────────────────────────────────
  const [histDesde, setHistDesde] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  });
  const [histHasta, setHistHasta]       = useState(hoy());
  const [histFichadas, setHistFichadas] = useState([]);
  const [histCargando, setHistCargando] = useState(false);
  const [histError, setHistError]       = useState(null);

  const cargarHistorial = useCallback(async () => {
    setHistCargando(true);
    setHistError(null);
    try {
      const params = new URLSearchParams({ limit: 2000 });
      if (histDesde) params.set("fecha_desde", histDesde);
      if (histHasta) params.set("fecha_hasta", histHasta);
      const data = await apiFetch(`/fichadas?${params}`);
      setHistFichadas(Array.isArray(data) ? data : []);
    } catch (e) {
      setHistError(e.message);
    } finally {
      setHistCargando(false);
    }
  }, [histDesde, histHasta]);

  useEffect(() => {
    if (vista === "historial") cargarHistorial();
  }, [vista, cargarHistorial]);

  // ── Calcular horas acumuladas por empleado ─────────────────────────────────
  const historialEmpleados = (() => {
    // Agrupar por empleado → por día → pares entrada/salida
    const porEmp = {};
    histFichadas
      .slice()
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .forEach(f => {
        const uid = f.user_id;
        if (!porEmp[uid]) porEmp[uid] = {
          user_id: uid,
          nombre: f.nombre_completo?.trim() || `Usuario ${uid}`,
          fichadas: [],
        };
        porEmp[uid].fichadas.push(f);
      });

    return Object.values(porEmp).map(emp => {
      let totalMs = 0;
      const fichs = emp.fichadas;
      // Recorrer de a pares: entrada → salida
      for (let i = 0; i < fichs.length - 1; i++) {
        if (fichs[i].direccion === "entrada" && fichs[i+1].direccion === "salida") {
          const tin  = parseMysqlTs(fichs[i].timestamp);
          const tout = parseMysqlTs(fichs[i+1].timestamp);
          if (tin && tout) totalMs += tout - tin;
          i++; // saltar la salida ya consumida
        }
      }
      const totalMin = Math.floor(totalMs / 60000);
      const horas    = Math.floor(totalMin / 60);
      const minutos  = totalMin % 60;
      return { ...emp, totalMs, horas, minutos, fichadas: fichs.length };
    }).sort((a, b) => b.totalMs - a.totalMs);
  })();


  function abrirNueva() {
    const ahora = new Date();
    const local = `${ahora.getFullYear()}-${pad(ahora.getMonth()+1)}-${pad(ahora.getDate())}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
    setModalData({ user_id: "", direccion: "entrada", timestamp: local });
    setModalFichadaId(null);
    setModalError("");
    setModal("nueva");
  }

  function abrirEditar(f) {
    // Convertir timestamp a formato datetime-local
    const d = parseMysqlTs(f.timestamp);
    const local = d
      ? `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
      : "";
    setModalData({ user_id: f.user_id, direccion: f.direccion, timestamp: local });
    setModalFichadaId(f.id);
    setModalError("");
    setModal("editar");
  }

  async function guardarFichada() {
    setModalGuardando(true);
    setModalError("");
    // Convertir datetime-local a formato MySQL (UTC)
    const tsMySQL = modalData.timestamp.replace("T", " ") + ":00";
    try {
      const url = modal === "nueva" ? `${API}/fichadas` : `${API}/fichadas/${modalFichadaId}`;
      const method = modal === "nueva" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(modalData.user_id), direccion: modalData.direccion, timestamp: tsMySQL }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setModal(null);
      cargarFichadas();
    } catch (e) {
      setModalError(e.message);
    } finally {
      setModalGuardando(false);
    }
  }

  async function eliminarFichada(id) {
    if (!window.confirm("¿Eliminar esta fichada?")) return;
    try {
      const res = await fetch(`${API}/fichadas/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      cargarFichadas();
    } catch (e) {
      alert("Error al eliminar: " + e.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {/* Si vista es usuarios, mostrar el componente Usuarios */}
      {vista === "usuarios" && (
        <Usuarios onBack={() => setVista("fichadas")} />
      )}

      {vista === "fichadas" && (
        <>
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={s.header}>
            <div style={s.headerLeft}>
              <button style={s.btnVolver} onClick={onBack}>← Volver</button>
              <div style={s.iconBox}>
                <IconReloj />
              </div>
              <div>
                <h1 style={s.titulo}>Control de Asistencia</h1>
                <span style={s.subtitulo}>
                  {ultimoSync
                    ? `Actualizado a las ${fmtHora(ultimoSync.toISOString().replace("T", " "))}`
                    : "Cargando..."}
                </span>
              </div>
            </div>
            <div style={s.headerRight}>
              <AgenteBadge agente={agente} />
              <button
                style={s.btnIcon}
                onClick={cargarFichadas}
                title="Actualizar"
                disabled={cargando}
              >
                <IconRefresh spin={cargando} />
              </button>
              <button style={s.btnUsuarios} onClick={() => setVista("usuarios")}>
                👥 Empleados
              </button>
              <button
                style={vista === "fichadas" ? s.btnNavActive : s.btnNav}
                onClick={() => setVista("fichadas")}
              >
                📋 Movimientos
              </button>
              <button
                style={vista === "historial" ? s.btnNavActive : s.btnNav}
                onClick={() => setVista("historial")}
              >
                📊 Historial
              </button>
              <button style={s.btnNueva} onClick={abrirNueva}>
                + Nueva fichada
              </button>
              <button
                style={{ ...s.btnSync, opacity: (syncing || !agente.connected) ? 0.5 : 1 }}
                onClick={handleSync}
                disabled={syncing || !agente.connected}
              >
                {syncing ? "Sincronizando..." : "🔄 Sincronizar"}
              </button>
              {syncMsg && <span style={s.syncMsg}>{syncMsg}</span>}
            </div>
          </div>

          {/* Aviso si no está en red local */}
          {agente.lastError && (
            <div style={s.notice}>
              ⚠️ {agente.lastError}. Los datos mostrados son los últimos sincronizados.
              {agente.pendingQueue > 0 && ` Hay ${agente.pendingQueue} eventos pendientes de subir.`}
            </div>
          )}

          {/* ── Cards resumen ──────────────────────────────────────────── */}
          <div style={s.cards}>
            <StatCard label="Total"      valor={total}     color="#818cf8" />
            <StatCard label="Entradas"   valor={entradas}  color="#34d399" />
            <StatCard label="Salidas"    valor={salidas}   color="#fbbf24" />
            <StatCard label="Empleados"  valor={empUnicos} color="#60a5fa" />
          </div>

          {/* ── Filtros ────────────────────────────────────────────────── */}
          <div style={s.filtrosWrap}>
            <div style={s.filtroFila}>
              {/* Desde */}
              <div style={s.filtroGrupo}>
                <label style={s.label}>Desde</label>
                <input
                  type="date"
                  value={filtroDesde}
                  onChange={(e) => setFiltroDesde(e.target.value)}
                  style={s.input}
                />
              </div>

              {/* Hasta */}
              <div style={s.filtroGrupo}>
                <label style={s.label}>Hasta</label>
                <input
                  type="date"
                  value={filtroHasta}
                  onChange={(e) => setFiltroHasta(e.target.value)}
                  style={s.input}
                />
              </div>

              {/* Empleado (select por nombre) */}
              <div style={s.filtroGrupo}>
                <label style={s.label}>Empleado</label>
                <select
                  value={filtroUser}
                  onChange={(e) => setFiltroUser(e.target.value)}
                  style={s.input}
                >
                  <option value="">Todos</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.apellido} {u.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dirección */}
              <div style={s.filtroGrupo}>
                <label style={s.label}>Dirección</label>
                <select
                  value={filtroDireccion}
                  onChange={(e) => setFiltroDireccion(e.target.value)}
                  style={s.input}
                >
                  <option value="todas">Todas</option>
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                </select>
              </div>

              <button style={s.btnBuscar} onClick={cargarFichadas}>
                Buscar
              </button>
            </div>

            {/* Tabs vista */}
            <div style={s.tabs}>
              <button
                style={vistaTabla === "tabla" ? s.tabActive : s.tab}
                onClick={() => setVistaTabla("tabla")}
              >
                Detalle
              </button>
              <button
                style={vistaTabla === "resumen" ? s.tabActive : s.tab}
                onClick={() => setVistaTabla("resumen")}
              >
                Por empleado
              </button>
            </div>
          </div>

          {/* ── Contenido ──────────────────────────────────────────────── */}
          <div style={s.tableWrap}>
            {error && <div style={s.errorBanner}>⚠️ {error}</div>}

            {cargando ? (
              <div style={s.estado}>
                <div style={s.spinner} />
                <span style={{ color: "#64748b", fontSize: 14 }}>
                  Cargando registros...
                </span>
              </div>
            ) : fichadasFiltradas.length === 0 ? (
              <div style={s.estado}>
                <span style={{ fontSize: 36 }}>📭</span>
                <span style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>
                  Sin registros para los filtros seleccionados
                </span>
              </div>
            ) : vistaTabla === "tabla" ? (
              <>
                <table style={s.tabla}>
                  <thead>
                    <tr>
                      {["#", "Empleado", "Fecha", "Hora", "Dirección", ""].map((c) => (
                        <th key={c} style={s.th}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((f, i) => (
                      <tr key={f.id ?? i}>
                        <td style={{ ...s.td, color: "#475569", fontSize: 12, width: 40 }}>
                          {inicio + i + 1}
                        </td>
                        <td style={s.td}>
                          <div style={s.empNombre}>
                            <span style={s.empAvatar}>
                              {(f.nombre_completo?.trim() || `U${f.user_id}`)
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 13 }}>
                                {f.nombre_completo?.trim() || `Usuario ${f.user_id}`}
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>
                                ID {f.user_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={s.td}>{fmtFecha(f.timestamp)}</td>
                        <td style={{ ...s.td, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                          {fmtHora(f.timestamp)}
                        </td>
                        <td style={s.td}>
                          <span style={f.direccion === "entrada" ? s.badgeEntrada : s.badgeSalida}>
                            {f.direccion === "entrada" ? "↓ Entrada" : "↑ Salida"}
                          </span>
                        </td>
                        <td style={{ ...s.td, width: 90 }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button style={s.btnRowEdit} onClick={() => abrirEditar(f)} title="Editar">✏️</button>
                            <button style={s.btnRowDel}  onClick={() => eliminarFichada(f.id)} title="Eliminar">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Paginación */}
                {total > POR_PAGINA && (
                  <div style={s.paginacion}>
                    <button
                      style={s.btnPag}
                      disabled={pagina === 1}
                      onClick={() => setPagina((p) => p - 1)}
                    >
                      ← Anterior
                    </button>
                    <span style={{ color: "#64748b", fontSize: 13 }}>
                      Página {pagina} de {paginas} · {total} registros
                    </span>
                    <button
                      style={s.btnPag}
                      disabled={pagina === paginas}
                      onClick={() => setPagina((p) => p + 1)}
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* ── Vista resumen por empleado ── */
              <table style={s.tabla}>
                <thead>
                  <tr>
                    {["Empleado", "Entradas", "Salidas", "Primera fichada", "Última fichada"].map((c) => (
                      <th key={c} style={s.th}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resumenEmpleados.map((emp) => (
                    <tr key={emp.user_id}>
                      <td style={s.td}>
                        <div style={s.empNombre}>
                          <span style={s.empAvatar}>
                            {emp.nombre.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{emp.nombre}</div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>ID {emp.user_id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>
                        <span style={s.badgeEntrada}>↓ {emp.entradas}</span>
                      </td>
                      <td style={s.td}>
                        <span style={emp.salidas > 0 ? s.badgeSalida : s.badgeGray}>
                          ↑ {emp.salidas}
                        </span>
                      </td>
                      <td style={{ ...s.td, fontFamily: "monospace", fontSize: 13 }}>
                        {fmtHora(emp.primera)}
                      </td>
                      <td style={{ ...s.td, fontFamily: "monospace", fontSize: 13 }}>
                        {fmtHora(emp.ultima)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── Vista Historial ─────────────────────────────────────────── */}
      {vista === "historial" && (
        <>
          <div style={s.header}>
            <div style={s.headerLeft}>
              <button style={s.btnVolver} onClick={onBack}>← Volver</button>
              <div style={s.iconBox}><IconReloj /></div>
              <div>
                <h1 style={s.titulo}>Historial de Horas</h1>
                <span style={s.subtitulo}>Acumulado por empleado</span>
              </div>
            </div>
            <div style={s.headerRight}>
              <AgenteBadge agente={agente} />
              <button
                style={vista === "fichadas" ? s.btnNavActive : s.btnNav}
                onClick={() => setVista("fichadas")}
              >
                📋 Movimientos
              </button>
              <button
                style={vista === "historial" ? s.btnNavActive : s.btnNav}
                onClick={() => setVista("historial")}
              >
                📊 Historial
              </button>
            </div>
          </div>

          {/* Filtro de rango */}
          <div style={s.filtrosWrap}>
            <div style={s.filtroFila}>
              <div style={s.filtroGrupo}>
                <label style={s.label}>Desde</label>
                <input type="date" value={histDesde}
                  onChange={e => setHistDesde(e.target.value)} style={s.input} />
              </div>
              <div style={s.filtroGrupo}>
                <label style={s.label}>Hasta</label>
                <input type="date" value={histHasta}
                  onChange={e => setHistHasta(e.target.value)} style={s.input} />
              </div>
              <button style={s.btnBuscar} onClick={cargarHistorial}>
                Buscar
              </button>
            </div>
          </div>

          {/* Tabla historial */}
          <div style={s.tableWrap}>
            {histError && <div style={s.errorBanner}>⚠️ {histError}</div>}
            {histCargando ? (
              <div style={s.estado}>
                <div style={s.spinner} />
                <span style={{ color: "#64748b", fontSize: 14 }}>Calculando horas...</span>
              </div>
            ) : historialEmpleados.length === 0 ? (
              <div style={s.estado}>
                <span style={{ fontSize: 36 }}>📭</span>
                <span style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>
                  Sin registros para el período seleccionado
                </span>
              </div>
            ) : (
              <table style={s.tabla}>
                <thead>
                  <tr>
                    {["Empleado", "Fichadas", "Horas trabajadas", "Detalle"].map(c => (
                      <th key={c} style={s.th}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historialEmpleados.map(emp => (
                    <tr key={emp.user_id}>
                      <td style={s.td}>
                        <div style={s.empNombre}>
                          <span style={s.empAvatar}>
                            {emp.nombre.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{emp.nombre}</div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>ID {emp.user_id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>
                        <span style={s.badgeGray}>{emp.fichadas} registros</span>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {/* Barra de progreso relativa al máximo */}
                          <div style={{
                            flex: 1, height: 6, background: "#0f172a",
                            borderRadius: 99, overflow: "hidden", maxWidth: 120,
                          }}>
                            <div style={{
                              height: "100%", borderRadius: 99,
                              background: "#6366f1",
                              width: `${Math.min(100, (emp.totalMs / Math.max(...historialEmpleados.map(e => e.totalMs))) * 100)}%`,
                            }} />
                          </div>
                          <span style={{
                            fontFamily: "monospace", fontSize: 15, fontWeight: 700,
                            color: emp.totalMs > 0 ? "#a5b4fc" : "#475569",
                          }}>
                            {emp.totalMs > 0
                              ? `${emp.horas}h ${pad(emp.minutos)}m`
                              : "—"}
                          </span>
                        </div>
                      </td>
                      <td style={s.td}>
                        {emp.totalMs === 0
                          ? <span style={{ color: "#475569", fontSize: 12 }}>Sin pares completos</span>
                          : <span style={{ color: "#64748b", fontSize: 12 }}>
                              {Math.floor(emp.fichadas / 2)} jornada{Math.floor(emp.fichadas / 2) !== 1 ? "s" : ""}
                            </span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}


      {modal && (
        <div style={s.modalOverlay} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={s.modalTitulo}>
              {modal === "nueva" ? "➕ Nueva fichada" : "✏️ Editar fichada"}
            </h3>

            {/* Empleado */}
            <div style={s.modalGrupo}>
              <label style={s.label}>Empleado</label>
              <select
                value={modalData.user_id}
                onChange={(e) => setModalData((d) => ({ ...d, user_id: e.target.value }))}
                style={s.input}
              >
                <option value="">— Seleccioná —</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.apellido} {u.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha y hora */}
            <div style={s.modalGrupo}>
              <label style={s.label}>Fecha y hora</label>
              <input
                type="datetime-local"
                value={modalData.timestamp}
                onChange={(e) => setModalData((d) => ({ ...d, timestamp: e.target.value }))}
                style={s.input}
              />
            </div>

            {/* Dirección */}
            <div style={s.modalGrupo}>
              <label style={s.label}>Dirección</label>
              <div style={{ display: "flex", gap: 10 }}>
                {["entrada", "salida"].map((dir) => (
                  <button
                    key={dir}
                    style={modalData.direccion === dir ? s.dirBtnActive : s.dirBtn}
                    onClick={() => setModalData((d) => ({ ...d, direccion: dir }))}
                  >
                    {dir === "entrada" ? "↓ Entrada" : "↑ Salida"}
                  </button>
                ))}
              </div>
            </div>

            {modalError && <div style={s.modalError}>{modalError}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                style={{ ...s.btnBuscar, flex: 1, opacity: modalGuardando ? 0.6 : 1 }}
                onClick={guardarFichada}
                disabled={modalGuardando || !modalData.user_id || !modalData.timestamp}
              >
                {modalGuardando ? "Guardando..." : "Guardar"}
              </button>
              <button style={s.btnPag} onClick={() => setModal(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS keyframes globales */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        tr:hover td { background: rgba(99,102,241,0.04); }
      `}</style>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function StatCard({ label, valor, color }) {
  return (
    <div style={{ ...s.card, borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#f1f5f9", fontVariantNumeric: "tabular-nums" }}>
        {valor}
      </div>
    </div>
  );
}

function AgenteBadge({ agente }) {
  const online = agente?.connected;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      background: online ? "#052e16" : "#1c0a09",
      border: `1px solid ${online ? "#16a34a44" : "#dc262644"}`,
      borderRadius: 99, padding: "5px 12px",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: online ? "#4ade80" : "#f87171",
        display: "inline-block",
        boxShadow: online ? "0 0 6px #4ade80" : "none",
      }} />
      <span style={{ fontSize: 12, color: online ? "#4ade80" : "#f87171", fontWeight: 500 }}>
        {online ? "Agente online" : "Agente offline"}
      </span>
    </div>
  );
}

function IconReloj() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconRefresh({ spin }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={spin ? { animation: "spin 0.8s linear infinite" } : {}}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    padding: "28px 32px",
    fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
    color: "#f1f5f9",
  },
  header: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12,
  },
  headerLeft:  { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  iconBox: {
    width: 44, height: 44, background: "#1e293b",
    border: "1px solid #334155", borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  titulo:    { margin: 0, fontSize: 21, fontWeight: 700, color: "#f1f5f9" },
  subtitulo: { fontSize: 12, color: "#475569" },
  btnVolver: {
    background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
    padding: "8px 14px", cursor: "pointer", color: "#94a3b8", fontSize: 13,
  },
  btnIcon: {
    background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
    padding: "8px 10px", cursor: "pointer", color: "#94a3b8",
    display: "flex", alignItems: "center",
  },
  btnUsuarios: {
    background: "#1e293b", border: "1px solid #4361ee", borderRadius: 8,
    padding: "8px 14px", cursor: "pointer", color: "#818cf8", fontSize: 13, fontWeight: 600,
  },
  btnSync: {
    background: "#052e16", border: "1px solid #16a34a44", borderRadius: 8,
    padding: "8px 14px", cursor: "pointer", color: "#4ade80", fontSize: 13, fontWeight: 600,
  },
  syncMsg: { fontSize: 12, color: "#94a3b8" },
  notice: {
    background: "#2d1b0060", border: "1px solid #d9770644",
    borderRadius: 8, padding: "12px 16px",
    fontSize: 13, color: "#fbbf24", marginBottom: 20,
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 12, marginBottom: 24,
  },
  card: {
    background: "#1e293b", border: "1px solid #1e293b",
    borderRadius: 12, padding: "16px 20px",
  },
  filtrosWrap: {
    background: "#1e293b", border: "1px solid #334155",
    borderRadius: 12, padding: "16px 20px", marginBottom: 20,
  },
  filtroFila: {
    display: "flex", flexWrap: "wrap", gap: 12,
    alignItems: "flex-end", marginBottom: 14,
  },
  filtroGrupo: { display: "flex", flexDirection: "column", gap: 4 },
  label: {
    fontSize: 11, color: "#475569",
    textTransform: "uppercase", letterSpacing: "0.06em",
  },
  input: {
    background: "#0f172a", border: "1px solid #334155",
    borderRadius: 7, padding: "7px 11px",
    color: "#f1f5f9", fontSize: 13, outline: "none", minWidth: 150,
  },
  btnBuscar: {
    background: "#6366f1", border: "none", borderRadius: 7,
    padding: "8px 22px", color: "#fff",
    fontWeight: 600, fontSize: 13, cursor: "pointer", alignSelf: "flex-end",
  },
  tabs:      { display: "flex", gap: 4 },
  tab: {
    background: "transparent", border: "1px solid #334155",
    borderRadius: 7, padding: "5px 16px",
    color: "#64748b", fontSize: 13, cursor: "pointer",
  },
  tabActive: {
    background: "#312e81", border: "1px solid #6366f1",
    borderRadius: 7, padding: "5px 16px",
    color: "#a5b4fc", fontSize: 13, cursor: "pointer", fontWeight: 600,
  },
  tableWrap: {
    background: "#1e293b", border: "1px solid #334155",
    borderRadius: 12, overflow: "hidden",
  },
  errorBanner: { background: "#450a0a", color: "#fca5a5", padding: "12px 20px", fontSize: 13 },
  estado: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 10, padding: "60px 0",
  },
  spinner: {
    width: 30, height: 30,
    border: "3px solid #334155", borderTop: "3px solid #6366f1",
    borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },
  tabla: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "11px 18px", textAlign: "left",
    fontSize: 11, color: "#475569",
    textTransform: "uppercase", letterSpacing: "0.07em",
    borderBottom: "1px solid #334155", background: "#0f172a50",
  },
  td: {
    padding: "12px 18px", fontSize: 13,
    color: "#cbd5e1", borderBottom: "1px solid #1e293b",
  },
  empNombre: { display: "flex", alignItems: "center", gap: 10 },
  empAvatar: {
    width: 30, height: 30, borderRadius: "50%",
    background: "#312e81", color: "#a5b4fc",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  badgeEntrada: {
    background: "#052e16", color: "#4ade80",
    border: "1px solid #16a34a44", borderRadius: 99,
    padding: "3px 10px", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
  },
  badgeSalida: {
    background: "#2d1b00", color: "#fbbf24",
    border: "1px solid #d9770644", borderRadius: 99,
    padding: "3px 10px", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
  },
  badgeGray: {
    background: "#1e293b", color: "#64748b",
    border: "1px solid #33415544", borderRadius: 99,
    padding: "3px 10px", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
  },
  btnNav: {
    background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
    padding: "8px 16px", cursor: "pointer", color: "#94a3b8", fontSize: 13, fontWeight: 500,
  },
  btnNavActive: {
    background: "#312e81", border: "1px solid #6366f1", borderRadius: 8,
    padding: "8px 16px", cursor: "pointer", color: "#a5b4fc", fontSize: 13, fontWeight: 600,
  },
    background: "#4f46e5", border: "1px solid #6366f1", borderRadius: 8,
    padding: "8px 14px", cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 600,
  },
  btnRowEdit: {
    background: "#1e3a5f", border: "1px solid #2563eb44", borderRadius: 6,
    padding: "4px 8px", cursor: "pointer", fontSize: 13, lineHeight: 1,
  },
  btnRowDel: {
    background: "#3b0f0f", border: "1px solid #dc262644", borderRadius: 6,
    padding: "4px 8px", cursor: "pointer", fontSize: 13, lineHeight: 1,
  },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  modalBox: {
    background: "#1e293b", border: "1px solid #334155", borderRadius: 14,
    padding: "28px 32px", width: "100%", maxWidth: 420,
  },
  modalTitulo: {
    margin: "0 0 20px", fontSize: 17, fontWeight: 700, color: "#f1f5f9",
  },
  modalGrupo: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 },
  modalError: {
    background: "#450a0a", color: "#fca5a5", borderRadius: 7,
    padding: "8px 12px", fontSize: 13, marginTop: 4,
  },
  dirBtn: {
    flex: 1, background: "#0f172a", border: "1px solid #334155",
    borderRadius: 8, padding: "8px", cursor: "pointer", color: "#64748b", fontSize: 13,
  },
  dirBtnActive: {
    flex: 1, background: "#312e81", border: "1px solid #6366f1",
    borderRadius: 8, padding: "8px", cursor: "pointer", color: "#a5b4fc", fontSize: 13, fontWeight: 600,
  },
  paginacion: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", padding: "14px 18px",
    borderTop: "1px solid #334155",
  },
  btnPag: {
    background: "#0f172a", border: "1px solid #334155",
    borderRadius: 7, padding: "6px 14px",
    color: "#94a3b8", fontSize: 13, cursor: "pointer",
  },
};
