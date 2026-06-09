"use client";

// ─────────────────────────────────────────────────────────────────────────────
// FichadasAnviz.jsx
// Componente React para Next.js / Vercel
// Consume el backend Express en Railway
//
// Endpoints que usa:
//   GET  /fichadas?fecha=YYYY-MM-DD&user_id=N&limit=500
//   GET  /fichadas/hoy
//   GET  /usuarios
//   GET  /anviz/status
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";

const API = "https://integral-backend-production.up.railway.app";

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Asignar entrada/salida alternado por usuario×día ────────────────────────
function asignarDirecciones(fichadas) {
  const estado = {};
  return [...fichadas]
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))
    .map((f) => {
      const fecha = String(f.timestamp).slice(0, 10);
      const key   = `${f.user_id}|${fecha}`;
      if (!estado[key]) estado[key] = "entrada";
      const dir = estado[key];
      estado[key] = dir === "entrada" ? "salida" : "entrada";
      return { ...f, direccion: dir };
    });
}

// ─── Fetcher genérico ────────────────────────────────────────────────────────
async function apiFetch(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
export default function FichadasAnviz() {
  // ── Estado principal ───────────────────────────────────────────────────────
  const [fichadas, setFichadas] = useState([]);
  const [usuarios, setUsuarios] = useState([]); // para el <select>
  const [agente, setAgente] = useState({ connected: false, lastSync: null });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [ultimoSync, setUltimoSync] = useState(null);

  // ── Filtros ────────────────────────────────────────────────────────────────
  const [filtroDesde, setFiltroDesde] = useState(hoy());
  const [filtroHasta, setFiltroHasta] = useState(hoy());
  const [filtroUser, setFiltroUser] = useState("");
  const [filtroDireccion, setFiltroDireccion] = useState("todas");

  // ── Paginación ─────────────────────────────────────────────────────────────
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 25;

  // ── Vista ──────────────────────────────────────────────────────────────────
  const [vista, setVista] = useState("tabla"); // "tabla" | "resumen"

  // ── Fichadas de hoy (para el panel de presencia) ──────────────────────────
  const [fichadasHoy, setFichadasHoy] = useState([]);

  const cargarPresencia = useCallback(async () => {
    try {
      const params = new URLSearchParams({ fecha_desde: hoy(), fecha_hasta: hoy(), limit: 1000 });
      const data = await apiFetch(`/fichadas?${params}`);
      setFichadasHoy(asignarDirecciones(Array.isArray(data) ? data : []));
    } catch {}
  }, []);

  useEffect(() => {
    cargarPresencia();
  }, [cargarPresencia]);

  // ── WebSocket ref ─────────────────────────────────────────────────────────
  const wsRef = useRef(null);

  // ── Cargar usuarios (una vez) ──────────────────────────────────────────────
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
      if (filtroUser) params.set("user_id", filtroUser);

      const data = await apiFetch(`/fichadas?${params}`);
      setFichadas(asignarDirecciones(Array.isArray(data) ? data : []));
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

  // ── WebSocket: recibir fichadas en tiempo real ─────────────────────────────
  useEffect(() => {
    if (!API) return;
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
            // Actualizar panel de presencia si es de hoy
            if (fechaNueva === hoy()) {
              setFichadasHoy((prev) => {
                const mismosDia = prev.filter(
                  (f) => f.user_id === nueva.user_id
                );
                const dir = mismosDia.length % 2 === 0 ? "entrada" : "salida";
                return asignarDirecciones([{ ...nueva, direccion: dir }, ...prev]);
              });
            }
            if (!filtroDesde || (fechaNueva >= filtroDesde && fechaNueva <= filtroHasta)) {
              setFichadas((prev) => {
                const mismosDia = prev.filter(
                  (f) => f.user_id === nueva.user_id && String(f.timestamp).slice(0, 10) === fechaNueva
                );
                const dir = mismosDia.length % 2 === 0 ? "entrada" : "salida";
                return [{ ...nueva, direccion: dir }, ...prev];
              });
            }
          }
          if (msg.type === "anviz_status") {
            setAgente({ connected: msg.connected, lastSync: msg.lastSync });
          }
        } catch {}
      };
      return () => ws.close();
    } catch {}
  }, [filtroDesde, filtroHasta]);

  // ── Derivados ──────────────────────────────────────────────────────────────
  const fichadasFiltradas = fichadas.filter((f) => {
    if (filtroUser && String(f.user_id) !== String(filtroUser)) return false;
    if (filtroDireccion !== "todas" && f.direccion !== filtroDireccion) return false;
    return true;
  });

  const total = fichadasFiltradas.length;
  const entradas = fichadasFiltradas.filter(
    (f) => f.direccion === "entrada",
  ).length;
  const salidas = fichadasFiltradas.filter(
    (f) => f.direccion === "salida",
  ).length;
  const empUnicos = [...new Set(fichadasFiltradas.map((f) => f.user_id))]
    .length;

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const inicio = (pagina - 1) * POR_PAGINA;
  const visibles = fichadasFiltradas.slice(inicio, inicio + POR_PAGINA);

  // ── Presencia actual (última dirección de cada empleado hoy) ───────────────
  const presencia = usuarios.map((u) => {
    const fics = fichadasHoy
      .filter((f) => String(f.user_id) === String(u.id))
      .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    const ultima = fics[fics.length - 1];
    return {
      id: u.id,
      nombre: `${u.apellido} ${u.nombre}`.trim(),
      dentro: ultima ? ultima.direccion === "entrada" : false,
      hora: ultima ? ultima.timestamp : null,
      fico: fics.length,
    };
  }).sort((a, b) => {
    if (a.dentro !== b.dentro) return a.dentro ? -1 : 1;
    return a.nombre.localeCompare(b.nombre);
  });

  // Resumen agrupado por empleado (para vista "resumen")
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
      if (f.timestamp > acc[key].ultima) acc[key].ultima = f.timestamp;
      return acc;
    }, {}),
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
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
        </div>
      </div>

      {/* ── Panel de presencia ──────────────────────────────────────────── */}
      <div style={s.presenciaWrap}>
        {presencia.length === 0 ? (
          <span style={{ color: "#475569", fontSize: 13 }}>Cargando empleados...</span>
        ) : (
          presencia.map((emp) => (
            <span key={emp.id} style={{
              fontSize: 13, fontWeight: 600,
              color: emp.dentro ? "#4ade80" : "#f87171",
            }}>
              {emp.nombre}
            </span>
          ))
        )}
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
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
            style={vista === "tabla" ? s.tabActive : s.tab}
            onClick={() => setVista("tabla")}
          >
            Detalle
          </button>
          <button
            style={vista === "resumen" ? s.tabActive : s.tab}
            onClick={() => setVista("resumen")}
          >
            Por empleado
          </button>
        </div>
      </div>

      {/* ── Contenido ───────────────────────────────────────────────────── */}
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
        ) : vista === "tabla" ? (
          <>
            <table style={s.tabla}>
              <thead>
                <tr>
                  {["#", "Empleado", "Fecha", "Hora", "Dirección"].map((c) => (
                    <th key={c} style={s.th}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((f, i) => (
                  <tr key={f.id ?? i} style={s.trHover}>
                    <td
                      style={{
                        ...s.td,
                        color: "#475569",
                        fontSize: 12,
                        width: 40,
                      }}
                    >
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
                            {f.nombre_completo?.trim() ||
                              `Usuario ${f.user_id}`}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            ID {f.user_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>{fmtFecha(f.timestamp)}</td>
                    <td
                      style={{
                        ...s.td,
                        fontFamily: "monospace",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtHora(f.timestamp)}
                    </td>
                    <td style={s.td}>
                      <span
                        style={
                          f.direccion === "entrada"
                            ? s.badgeEntrada
                            : s.badgeSalida
                        }
                      >
                        {f.direccion === "entrada" ? "↓ Entrada" : "↑ Salida"}
                      </span>
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
                {[
                  "Empleado",
                  "Entradas",
                  "Salidas",
                  "Primera fichada",
                  "Última fichada",
                ].map((c) => (
                  <th key={c} style={s.th}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resumenEmpleados.map((emp) => (
                <tr key={emp.user_id} style={s.trHover}>
                  <td style={s.td}>
                    <div style={s.empNombre}>
                      <span style={s.empAvatar}>
                        {emp.nombre.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>
                          {emp.nombre}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          ID {emp.user_id}
                        </div>
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
                  <td
                    style={{ ...s.td, fontFamily: "monospace", fontSize: 13 }}
                  >
                    {fmtHora(emp.primera)}
                  </td>
                  <td
                    style={{ ...s.td, fontFamily: "monospace", fontSize: 13 }}
                  >
                    {fmtHora(emp.ultima)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
      <div
        style={{
          fontSize: 11,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: "#f1f5f9",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {valor}
      </div>
    </div>
  );
}

function AgenteBadge({ agente }) {
  const online = agente?.connected;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        background: online ? "#052e16" : "#1c0a09",
        border: `1px solid ${online ? "#16a34a44" : "#dc262644"}`,
        borderRadius: 99,
        padding: "5px 12px",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: online ? "#4ade80" : "#f87171",
          display: "inline-block",
          boxShadow: online ? "0 0 6px #4ade80" : "none",
        }}
      />
      <span
        style={{
          fontSize: 12,
          color: online ? "#4ade80" : "#f87171",
          fontWeight: 500,
        }}
      >
        {online ? "Agente online" : "Agente offline"}
      </span>
    </div>
  );
}

function IconReloj() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#818cf8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconRefresh({ spin }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={spin ? { animation: "spin 0.8s linear infinite" } : {}}
    >
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  iconBox: {
    width: 44,
    height: 44,
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { margin: 0, fontSize: 21, fontWeight: 700, color: "#f1f5f9" },
  subtitulo: { fontSize: 12, color: "#475569" },
  btnIcon: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
  },

  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 12,
    marginBottom: 24,
  },
  card: {
    background: "#1e293b",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: "16px 20px",
  },

  filtrosWrap: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 20,
  },
  filtroFila: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "flex-end",
    marginBottom: 14,
  },
  filtroGrupo: { display: "flex", flexDirection: "column", gap: 4 },
  label: {
    fontSize: 11,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  input: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 7,
    padding: "7px 11px",
    color: "#f1f5f9",
    fontSize: 13,
    outline: "none",
    minWidth: 150,
  },
  btnBuscar: {
    background: "#6366f1",
    border: "none",
    borderRadius: 7,
    padding: "8px 22px",
    color: "#fff",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    alignSelf: "flex-end",
  },

  tabs: { display: "flex", gap: 4 },
  tab: {
    background: "transparent",
    border: "1px solid #334155",
    borderRadius: 7,
    padding: "5px 16px",
    color: "#64748b",
    fontSize: 13,
    cursor: "pointer",
  },
  tabActive: {
    background: "#312e81",
    border: "1px solid #6366f1",
    borderRadius: 7,
    padding: "5px 16px",
    color: "#a5b4fc",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 600,
  },

  tableWrap: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 12,
    overflow: "hidden",
  },
  errorBanner: {
    background: "#450a0a",
    color: "#fca5a5",
    padding: "12px 20px",
    fontSize: 13,
  },
  estado: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "60px 0",
  },
  spinner: {
    width: 30,
    height: 30,
    border: "3px solid #334155",
    borderTop: "3px solid #6366f1",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },

  tabla: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "11px 18px",
    textAlign: "left",
    fontSize: 11,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    borderBottom: "1px solid #334155",
    background: "#0f172a50",
  },
  td: {
    padding: "12px 18px",
    fontSize: 13,
    color: "#cbd5e1",
    borderBottom: "1px solid #1e293b",
  },
  trHover: {},

  empNombre: { display: "flex", alignItems: "center", gap: 10 },
  empAvatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#312e81",
    color: "#a5b4fc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },

  badgeEntrada: {
    background: "#052e16",
    color: "#4ade80",
    border: "1px solid #16a34a44",
    borderRadius: 99,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  badgeSalida: {
    background: "#2d1b00",
    color: "#fbbf24",
    border: "1px solid #d9770644",
    borderRadius: 99,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  badgeGray: {
    background: "#1e293b",
    color: "#64748b",
    border: "1px solid #33415544",
    borderRadius: 99,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },

  paginacion: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 18px",
    borderTop: "1px solid #334155",
  },
  btnPag: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 7,
    padding: "6px 14px",
    color: "#94a3b8",
    fontSize: 13,
    cursor: "pointer",
  },

  presenciaWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  presenciaChip: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    borderRadius: 99,
    padding: "6px 14px",
  },
};
