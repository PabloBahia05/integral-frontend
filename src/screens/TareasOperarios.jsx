import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const API = "https://integral-backend-production.up.railway.app";

// Cada cuánto se vuelve a pedir al servidor (solo mientras la pestaña está visible)
const POLL_TAREAS_MS = 5_000;
const POLL_PRESENCIA_MS = 20_000;

const pad = (n) => String(n).padStart(2, "0");

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Igual que en Anviz.jsx: la primera fichada de cada usuario en el día es entrada y
// después alterna salida/entrada. Opera sobre las fichadas ordenadas por timestamp.
function asignarDirecciones(fichadas) {
  const estado = {};
  return [...fichadas]
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))
    .map((f) => {
      const fecha = String(f.timestamp).slice(0, 10);
      const key = `${f.user_id}|${fecha}`;
      if (!estado[key]) estado[key] = "entrada";
      const dir = estado[key];
      estado[key] = dir === "entrada" ? "salida" : "entrada";
      return { ...f, direccion: dir };
    });
}

// "desde 08:15" (o con la fecha si no es de hoy). `iso` viene en UTC con "Z".
function fmtDesde(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const hora = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.toDateString() === new Date().toDateString()) return `desde ${hora}`;
  return `desde ${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${hora}`;
}

export default function TareasOperarios({ onBack, puedoEditar = false }) {
  const { authFetch } = useAuth();
  // authFetch puede cambiar de identidad en cada render: se guarda en un ref para que los
  // intervalos de actualización no se reinicien solos.
  const authRef = useRef(authFetch);
  authRef.current = authFetch;

  const [empleados, setEmpleados] = useState([]);
  const [fichadasHoy, setFichadasHoy] = useState([]);
  const [tareas, setTareas] = useState({}); // empleado_id → fila de tareas_operarios
  const [sugerencias, setSugerencias] = useState([]);
  const [soloPresentes, setSoloPresentes] = useState(true);
  const [editando, setEditando] = useState(false);
  const [celda, setCelda] = useState(null); // { id, valor } mientras se edita una tarea
  const [guardando, setGuardando] = useState(null);
  const [error, setError] = useState(null);
  const [ultimaAct, setUltimaAct] = useState(null);
  const [conectado, setConectado] = useState(true);
  const cancelRef = useRef(false);

  const pedir = useCallback(async (path) => {
    const res = await authRef.current(`${API}${path}`, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
    return res.json();
  }, []);

  const cargarTareas = useCallback(async () => {
    try {
      const rows = await pedir("/tareas-operarios");
      const mapa = {};
      (Array.isArray(rows) ? rows : []).forEach((r) => {
        const prev = mapa[r.empleado_id];
        if (!prev || r.id > prev.id) mapa[r.empleado_id] = r;
      });
      setTareas(mapa);
      setUltimaAct(new Date());
      setConectado(true);
    } catch {
      setConectado(false);
    }
  }, [pedir]);

  const cargarPresencia = useCallback(async () => {
    try {
      const params = new URLSearchParams({ fecha_desde: hoy(), fecha_hasta: hoy(), limit: 1000 });
      const data = await pedir(`/fichadas?${params}`);
      setFichadasHoy(asignarDirecciones(Array.isArray(data) ? data : []));
    } catch {}
  }, [pedir]);

  const cargarSugerencias = useCallback(async () => {
    try {
      const data = await pedir("/tareas-operarios/sugerencias");
      setSugerencias(Array.isArray(data) ? data : []);
    } catch {}
  }, [pedir]);

  // Empleados y sugerencias: una vez
  useEffect(() => {
    pedir("/empleados")
      .then((d) => setEmpleados(Array.isArray(d) ? d : []))
      .catch(() => {});
    cargarSugerencias();
  }, [pedir, cargarSugerencias]);

  // Actualización periódica (se pausa si la pestaña está oculta)
  useEffect(() => {
    cargarTareas();
    cargarPresencia();
    const ivT = setInterval(() => { if (!document.hidden) cargarTareas(); }, POLL_TAREAS_MS);
    const ivP = setInterval(() => { if (!document.hidden) cargarPresencia(); }, POLL_PRESENCIA_MS);
    const alVolver = () => {
      if (!document.hidden) { cargarTareas(); cargarPresencia(); }
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(ivT);
      clearInterval(ivP);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargarTareas, cargarPresencia]);

  // Una fichada nueva actualiza la presencia al instante (mismo WebSocket que Anviz.jsx)
  useEffect(() => {
    let ws = null;
    try {
      ws = new WebSocket(API.replace(/^http/, "ws") + "/ws");
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "fichada") cargarPresencia();
        } catch {}
      };
      ws.onerror = () => {};
    } catch {}
    return () => {
      try { ws && ws.close(); } catch {}
    };
  }, [cargarPresencia]);

  // Presentes = su última fichada de hoy es una entrada
  const presentes = useMemo(() => {
    const ultima = {};
    fichadasHoy.forEach((f) => { ultima[String(f.user_id)] = f; });
    const set = new Set();
    Object.keys(ultima).forEach((id) => { if (ultima[id].direccion === "entrada") set.add(id); });
    return set;
  }, [fichadasHoy]);

  const filas = useMemo(() => {
    return empleados
      .map((u) => {
        const t = tareas[u.id] || null;
        return {
          id: u.id,
          nombre: `${u.apellido ?? ""} ${u.nombre ?? ""}`.trim() || `Empleado ${u.id}`,
          dentro: presentes.has(String(u.id)),
          tarea: t?.tarea ?? "",
          desde: t?.desde ?? null,
          asignadaPor: t?.asignada_por ?? null,
        };
      })
      .filter((f) => !soloPresentes || f.dentro)
      .sort((a, b) => {
        if (a.dentro !== b.dentro) return a.dentro ? -1 : 1;
        return a.nombre.localeCompare(b.nombre);
      });
  }, [empleados, tareas, presentes, soloPresentes]);

  const totalPresentes = empleados.filter((u) => presentes.has(String(u.id))).length;
  const conTarea = filas.filter((f) => f.tarea).length;

  async function guardarTarea(id, texto) {
    const tarea = String(texto ?? "").trim();
    const actual = tareas[id]?.tarea ?? "";
    setCelda(null);
    if (tarea === actual) return;
    setGuardando(id);
    setError(null);
    try {
      const res = await authRef.current(`${API}/tareas-operarios/${id}`, {
        method: "PUT",
        body: JSON.stringify({ tarea }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo guardar la tarea");
      await cargarTareas();
      cargarSugerencias();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(null);
    }
  }

  function abrirCelda(f) {
    if (!editando || !puedoEditar) return;
    cancelRef.current = false;
    setCelda({ id: f.id, valor: f.tarea });
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <button style={s.btnVolver} onClick={onBack}>← Volver</button>
          <div>
            <h2 style={s.titulo}>👷 Tareas de operarios</h2>
            <div style={s.subtitulo}>
              <span style={{ color: conectado ? "#4ade80" : "#f87171" }}>●</span>{" "}
              {conectado ? "En vivo" : "Sin conexión con el servidor"}
              {ultimaAct && conectado
                ? ` · actualizado ${pad(ultimaAct.getHours())}:${pad(ultimaAct.getMinutes())}:${pad(ultimaAct.getSeconds())}`
                : ""}
              {" · "}{totalPresentes} presentes · {conTarea} con tarea
            </div>
          </div>
        </div>
        <div style={s.headerRight}>
          <button
            style={soloPresentes ? s.btnOn : s.btnOff}
            onClick={() => setSoloPresentes((v) => !v)}
            title="Alterna entre mostrar solo a quienes están fichados adentro o a todos"
          >
            {soloPresentes ? "Solo presentes" : "Mostrando todos"}
          </button>
          {puedoEditar && (
            <button
              style={editando ? s.btnEditOn : s.btnOff}
              onClick={() => { setEditando((v) => !v); setCelda(null); }}
            >
              {editando ? "✓ Terminar edición" : "✏️ Editar tareas"}
            </button>
          )}
        </div>
      </div>

      {error && <div style={s.error}>⚠️ {error}</div>}

      <datalist id="tareas-sugeridas">
        {sugerencias.map((t) => <option key={t} value={t} />)}
      </datalist>

      <div style={s.tabla}>
        <div style={s.thead}>
          <div>OPERARIO</div>
          <div>TAREA</div>
        </div>

        {filas.length === 0 && (
          <div style={s.vacio}>
            {empleados.length === 0
              ? "Cargando operarios..."
              : soloPresentes
                ? "No hay operarios fichados adentro en este momento. Tocá “Solo presentes” para ver a todos."
                : "No hay operarios para mostrar."}
          </div>
        )}

        {filas.map((f) => {
          const editandoEsta = celda && celda.id === f.id;
          return (
            <div key={f.id} style={{ ...s.fila, opacity: f.dentro ? 1 : 0.55 }}>
              <div style={s.celdaNombre}>
                <span style={{ color: f.dentro ? "#4ade80" : "#64748b", marginRight: 10 }}>●</span>
                {f.nombre}
              </div>
              <div
                style={{ ...s.celdaTarea, cursor: editando && puedoEditar ? "pointer" : "default" }}
                onClick={() => !editandoEsta && abrirCelda(f)}
              >
                {editandoEsta ? (
                  <input
                    autoFocus
                    list="tareas-sugeridas"
                    style={s.input}
                    value={celda.valor}
                    placeholder="Escribí la tarea y Enter"
                    maxLength={255}
                    onChange={(e) => setCelda({ id: f.id, valor: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { cancelRef.current = true; guardarTarea(f.id, celda.valor); }
                      if (e.key === "Escape") { cancelRef.current = true; setCelda(null); }
                    }}
                    onBlur={() => {
                      if (cancelRef.current) { cancelRef.current = false; return; }
                      guardarTarea(f.id, celda.valor);
                    }}
                  />
                ) : (
                  <>
                    <div style={{ minWidth: 0 }}>
                      <div style={f.tarea ? s.tareaTexto : s.sinTarea}>
                        {guardando === f.id ? "Guardando..." : f.tarea || (editando && puedoEditar ? "Tocá para asignar" : "— sin tarea —")}
                      </div>
                      {f.tarea && (
                        <div style={s.tareaMeta}>
                          {fmtDesde(f.desde)}
                          {f.asignadaPor ? ` · asignó ${f.asignadaPor}` : ""}
                        </div>
                      )}
                    </div>
                    {editando && puedoEditar && f.tarea && (
                      <button
                        style={s.btnQuitar}
                        title="Quitar la tarea"
                        onClick={(e) => { e.stopPropagation(); guardarTarea(f.id, ""); }}
                      >
                        ✕
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Estilos (mismo look oscuro que Anviz.jsx) ───────────────────────────────
const s = {
  page: {
    minHeight: "100vh", background: "#0f172a", padding: 16,
    fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: "#f1f5f9",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 20, flexWrap: "wrap", gap: 12,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  titulo: { margin: 0, fontSize: 21, fontWeight: 700, color: "#f1f5f9" },
  subtitulo: { fontSize: 12, color: "#64748b", marginTop: 2 },
  btnVolver: {
    background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
    padding: "8px 14px", cursor: "pointer", color: "#94a3b8", fontSize: 13,
  },
  btnOff: {
    background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
    padding: "8px 14px", cursor: "pointer", color: "#94a3b8", fontSize: 13, fontWeight: 600,
  },
  btnOn: {
    background: "#052e16", border: "1px solid #16a34a66", borderRadius: 8,
    padding: "8px 14px", cursor: "pointer", color: "#4ade80", fontSize: 13, fontWeight: 600,
  },
  btnEditOn: {
    background: "#1e1b4b", border: "1px solid #4361ee", borderRadius: 8,
    padding: "8px 14px", cursor: "pointer", color: "#818cf8", fontSize: 13, fontWeight: 600,
  },
  error: {
    background: "#450a0a80", border: "1px solid #f8717144", borderRadius: 8,
    padding: "10px 14px", fontSize: 13, color: "#fca5a5", marginBottom: 14,
  },
  tabla: {
    background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden",
  },
  thead: {
    display: "grid", gridTemplateColumns: "minmax(220px, 32%) 1fr",
    padding: "12px 20px", background: "#0b1220", color: "#64748b",
    fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
  },
  fila: {
    display: "grid", gridTemplateColumns: "minmax(220px, 32%) 1fr",
    padding: "14px 20px", borderTop: "1px solid #334155", alignItems: "center",
  },
  celdaNombre: { fontSize: 20, fontWeight: 600, color: "#f1f5f9" },
  celdaTarea: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 40,
  },
  tareaTexto: { fontSize: 22, fontWeight: 700, color: "#fbbf24" },
  sinTarea: { fontSize: 16, color: "#475569", fontStyle: "italic" },
  tareaMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  input: {
    width: "100%", background: "#0f172a", border: "1px solid #4361ee", borderRadius: 8,
    padding: "9px 12px", color: "#f1f5f9", fontSize: 18, outline: "none", boxSizing: "border-box",
  },
  btnQuitar: {
    background: "transparent", border: "1px solid #334155", borderRadius: 6,
    color: "#94a3b8", cursor: "pointer", padding: "4px 9px", fontSize: 13, flexShrink: 0,
  },
  vacio: { padding: "28px 20px", color: "#64748b", fontSize: 15, textAlign: "center" },
};
