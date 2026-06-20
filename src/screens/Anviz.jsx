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

// ─── Asignar entrada/salida alternado por usuario×día ────────────────────────
// La primera fichada de cada usuario en cada día es siempre entrada,
// luego alterna: salida, entrada, salida, ...
// Opera sobre un array ya ordenado por timestamp ASC.
function asignarDirecciones(fichadas) {
  const estado = {};
  return [...fichadas]
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))
    .map((f) => {
      const fecha = String(f.timestamp).slice(0, 10); // "YYYY-MM-DD"
      const key   = `${f.user_id}|${fecha}`;
      if (!estado[key]) estado[key] = "entrada";
      const dir = estado[key];
      estado[key] = dir === "entrada" ? "salida" : "entrada";
      return { ...f, direccion: dir };
    });
}

async function apiFetch(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Anviz({ onBack, usuario, token }) {
  const esOperario = usuario?.rol === "operario";
  const [vista, setVista]               = useState("inicio"); // "inicio" | "fichadas" | "usuarios" | "historial"
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
  const [vacData, setVacData]             = useState([]);
  const [vacCargando, setVacCargando]     = useState(false);
  const [vacEditando, setVacEditando]     = useState(null); // id del empleado editando
  const [vacForm, setVacForm]             = useState({ vacaciones: "", horas_acumuladas: "" });
  // ── Modal de vacaciones tomadas (alta/baja de períodos) ──
  const [vacModalEmpleado, setVacModalEmpleado] = useState(null); // {id, nombre, apellido} o null
  const [vacTomadasList, setVacTomadasList]     = useState([]);
  const [vacTomadasForm, setVacTomadasForm]     = useState({ fecha_desde: "", fecha_hasta: "", dias: "", nota: "" });
  const [vacTomadasCargando, setVacTomadasCargando] = useState(false);
  // ── Modal de justificaciones (ART / Certificado) ──
  const [justifModalEmpleado, setJustifModalEmpleado] = useState(null);
  const [justifList, setJustifList]             = useState([]);
  const [justifForm, setJustifForm]              = useState({ tipo: "ART", fecha_desde: "", fecha_hasta: "", dias: "", nota: "" });
  const [justifCargando, setJustifCargando]      = useState(false);
  const [vacDesde, setVacDesde]           = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  });
  const [vacHasta, setVacHasta]           = useState(hoy);

  // ── GPS Fichar ─────────────────────────────────────────────────────────────
  const [gpsEstado, setGpsEstado]         = useState("idle"); // "idle" | "obteniendo" | "ok" | "error" | "enviando" | "enviado"
  const [gpsCoordenadas, setGpsCoordenadas] = useState(null); // { lat, lng, accuracy }
  const [gpsError, setGpsError]           = useState("");
  const [gpsDireccion, setGpsDireccion]   = useState("entrada");
  const [gpsMsg, setGpsMsg]               = useState("");
  const [gpsUserId, setGpsUserId]         = useState(() => String(usuario?.id || ""));

  const wsRef = useRef(null);

  // ── Cargar empleados (una vez) ─────────────────────────────────────────────
  useEffect(() => {
    apiFetch("/empleados", token)
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
      const data = await apiFetch(`/fichadas?${params}`, token);
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
        const data = await apiFetch("/anviz/status", token);
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
            if (fechaNueva === hoy()) {
              setFichadasHoy((prev) => asignarDirecciones([nueva, ...prev]));
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
  const [histFiltroUser, setHistFiltroUser] = useState("");
  const [histFichadas, setHistFichadas] = useState([]);
  const [histCargando, setHistCargando] = useState(false);
  const [histError, setHistError]       = useState(null);

  // ── Fichadas de hoy (panel de presencia) ──────────────────────────────────
  const [fichadasHoy, setFichadasHoy] = useState([]);

  const cargarPresencia = useCallback(async () => {
    try {
      const params = new URLSearchParams({ fecha_desde: hoy(), fecha_hasta: hoy(), limit: 1000 });
      const data = await apiFetch(`/fichadas?${params}`, token);
      setFichadasHoy(asignarDirecciones(Array.isArray(data) ? data : []));
    } catch {}
  }, []);

  useEffect(() => { cargarPresencia(); }, [cargarPresencia]);

  // ── Presencia actual por empleado ──────────────────────────────────────────
  const presencia = usuarios.map((u) => {
    const fics = fichadasHoy
      .filter((f) => String(f.user_id) === String(u.id))
      .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    const ultima = fics[fics.length - 1];
    return {
      id:     u.id,
      nombre: `${u.apellido} ${u.nombre}`.trim(),
      dentro: ultima ? ultima.direccion === "entrada" : false,
    };
  }).sort((a, b) => {
    if (a.dentro !== b.dentro) return a.dentro ? -1 : 1;
    return a.nombre.localeCompare(b.nombre);
  });

  const cargarHistorial = useCallback(async () => {
    setHistCargando(true);
    setHistError(null);
    try {
      const params = new URLSearchParams({ limit: 2000 });
      if (histDesde)      params.set("fecha_desde", histDesde);
      if (histHasta)      params.set("fecha_hasta", histHasta);
      if (histFiltroUser) params.set("user_id", histFiltroUser);
      const data = await apiFetch(`/fichadas?${params}`, token);
      setHistFichadas(asignarDirecciones(Array.isArray(data) ? data : []));
    } catch (e) {
      setHistError(e.message);
    } finally {
      setHistCargando(false);
    }
  }, [histDesde, histHasta, histFiltroUser]);

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
      const res = await fetch(`${API}/fichadas/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      cargarFichadas();
    } catch (e) {
      alert("Error al eliminar: " + e.message);
    }
  }

  // ── Vacaciones y Horas ────────────────────────────────────────────────────
  async function abrirVacaciones(desde, hasta) {
    setVista("vacaciones");
    setVacCargando(true);
    try {
      const d = desde !== undefined ? desde : vacDesde;
      const h = hasta !== undefined ? hasta  : vacHasta;
      const empParams = new URLSearchParams();
      if (d) empParams.set("fecha_desde", d);
      if (h) empParams.set("fecha_hasta", h);
      const qs = empParams.toString() ? `?${empParams.toString()}` : "";

      const empData = await apiFetch(`/empleados/vacaciones-horas${qs}`, token);
      setVacData(empData);
    } catch (e) {
      console.error(e);
    } finally {
      setVacCargando(false);
    }
  }

  async function filtrarVacaciones() {
    abrirVacaciones(vacDesde, vacHasta);
  }

  async function guardarVac(id) {
    try {
      await fetch(`${API}/empleados/${id}/vacaciones-horas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vacaciones: Number(vacForm.vacaciones), horas_acumuladas: Number(vacForm.horas_acumuladas) }),
      });
      setVacData(d => d.map(e => e.id === id ? { ...e, vacaciones: Number(vacForm.vacaciones), horas_acumuladas: Number(vacForm.horas_acumuladas) } : e));
      setVacEditando(null);
    } catch (e) {
      console.error(e);
    }
  }

  // ── Detalle de vacaciones tomadas (períodos concretos) ──
  async function abrirModalVacaciones(empleado) {
    setVacModalEmpleado(empleado);
    setVacTomadasForm({ fecha_desde: "", fecha_hasta: "", dias: "", nota: "" });
    setVacTomadasCargando(true);
    try {
      const lista = await apiFetch(`/vacaciones-tomadas?empleado_id=${empleado.id}`, token);
      setVacTomadasList(Array.isArray(lista) ? lista : []);
    } catch (e) {
      console.error(e);
      setVacTomadasList([]);
    } finally {
      setVacTomadasCargando(false);
    }
  }

  function cerrarModalVacaciones() {
    setVacModalEmpleado(null);
    setVacTomadasList([]);
  }

  // Calcula días corridos (calendario, incluye fines de semana, como marca la ley) entre dos fechas
  function diasCorridos(desde, hasta) {
    if (!desde || !hasta) return "";
    const d1 = new Date(`${desde}T00:00:00`);
    const d2 = new Date(`${hasta}T00:00:00`);
    const diff = Math.round((d2 - d1) / 86400000) + 1;
    return diff > 0 ? diff : "";
  }

  // Convierte una fecha (string YYYY-MM-DD, datetime, etc.) a DD-MM-AAAA para mostrar
  function fmtFecha(value) {
    if (!value) return "";
    const iso = String(value).slice(0, 10); // yyyy-mm-dd
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return `${d}-${m}-${y}`;
  }

  async function agregarVacacionTomada() {
    if (!vacModalEmpleado || !vacTomadasForm.fecha_desde || !vacTomadasForm.fecha_hasta || !vacTomadasForm.dias) return;
    try {
      const nuevo = await fetch(`${API}/vacaciones-tomadas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          empleado_id: vacModalEmpleado.id,
          fecha_desde: vacTomadasForm.fecha_desde,
          fecha_hasta: vacTomadasForm.fecha_hasta,
          dias: Number(vacTomadasForm.dias),
          nota: vacTomadasForm.nota || null,
        }),
      }).then(r => r.json());
      setVacTomadasList(l => [nuevo, ...l]);
      setVacTomadasForm({ fecha_desde: "", fecha_hasta: "", dias: "", nota: "" });
      // Refrescar la tabla principal para actualizar tomadas/pendientes
      abrirVacaciones();
    } catch (e) {
      console.error(e);
    }
  }

  async function eliminarVacacionTomada(id) {
    if (!confirm("¿Eliminar este período de vacaciones?")) return;
    try {
      await fetch(`${API}/vacaciones-tomadas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setVacTomadasList(l => l.filter(v => v.id !== id));
      abrirVacaciones();
    } catch (e) {
      console.error(e);
    }
  }

  // ── Detalle de justificaciones (ART / Certificado) ──
  async function abrirModalJustificaciones(empleado) {
    setJustifModalEmpleado(empleado);
    setJustifForm({ tipo: "ART", fecha_desde: "", fecha_hasta: "", dias: "", nota: "" });
    setJustifCargando(true);
    try {
      const lista = await apiFetch(`/justificaciones?empleado_id=${empleado.id}`, token);
      setJustifList(Array.isArray(lista) ? lista : []);
    } catch (e) {
      console.error(e);
      setJustifList([]);
    } finally {
      setJustifCargando(false);
    }
  }

  function cerrarModalJustificaciones() {
    setJustifModalEmpleado(null);
    setJustifList([]);
  }

  async function agregarJustificacion() {
    if (!justifModalEmpleado || !justifForm.fecha_desde || !justifForm.fecha_hasta || !justifForm.dias) return;
    try {
      const nuevo = await fetch(`${API}/justificaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          empleado_id: justifModalEmpleado.id,
          tipo: justifForm.tipo,
          fecha_desde: justifForm.fecha_desde,
          fecha_hasta: justifForm.fecha_hasta,
          dias: Number(justifForm.dias),
          nota: justifForm.nota || null,
        }),
      }).then(r => r.json());
      setJustifList(l => [nuevo, ...l]);
      setJustifForm({ tipo: "ART", fecha_desde: "", fecha_hasta: "", dias: "", nota: "" });
      abrirVacaciones();
    } catch (e) {
      console.error(e);
    }
  }

  async function eliminarJustificacion(id) {
    if (!confirm("¿Eliminar esta justificación?")) return;
    try {
      await fetch(`${API}/justificaciones/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setJustifList(l => l.filter(v => v.id !== id));
      abrirVacaciones();
    } catch (e) {
      console.error(e);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {/* Si vista es usuarios, mostrar el componente Usuarios */}
      {vista === "usuarios" && (
        <Usuarios onBack={() => setVista("inicio")} />
      )}

      {/* ── Vista Vacaciones y Horas ─────────────────────────────────────── */}
      {vista === "vacaciones" && (
        <div style={s.page}>
          <div style={s.header}>
            <div style={s.headerLeft}>
              <button style={s.btnVolver} onClick={() => setVista("inicio")}>← Volver</button>
              <div style={s.iconBox}>🏖️</div>
              <div>
                <h1 style={s.titulo}>Vacaciones y Horas</h1>
                <span style={s.subtitulo}>Resumen por empleado</span>
              </div>
            </div>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Desde</label>
                <input type="date" value={vacDesde} onChange={e => setVacDesde(e.target.value)} style={{ ...s.input, width: 140 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Hasta</label>
                <input type="date" value={vacHasta} onChange={e => setVacHasta(e.target.value)} style={{ ...s.input, width: 140 }} />
              </div>
              <button style={s.btnNueva} onClick={filtrarVacaciones}>Filtrar</button>
              <button style={{ ...s.btnVolver, marginLeft: 4 }} onClick={() => {
                const d = new Date(); d.setDate(d.getDate() - 30);
                const desde = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
                const hasta = hoy();
                setVacDesde(desde);
                setVacHasta(hasta);
                abrirVacaciones(desde, hasta);
              }}>Limpiar</button>
            </div>
            {vacCargando ? (
              <p style={{ color: "var(--color-text-secondary)" }}>Cargando...</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "var(--color-bg-secondary)" }}>
                      <th style={s.th}>Empleado</th>
                      <th style={s.th}>Vac. correspondientes</th>
                      <th style={s.th}>Vac. tomadas</th>
                      <th style={s.th}>Vac. pendientes</th>
                      <th style={s.th}>Horas trabajadas</th>
                      <th style={s.th}>ART</th>
                      <th style={s.th}>Certificado</th>
                      <th style={s.th}>Horas esperadas</th>
                      <th style={s.th}>Dif. del período</th>
                      <th style={s.th}>Saldo total de horas</th>
                      {!esOperario && <th style={s.th}>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {vacData.map((e) => (
                      <tr key={e.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td style={s.td}>{e.apellido} {e.nombre}</td>
                        <td style={s.td}>
                          {vacEditando === e.id ? (
                            <input
                              type="number"
                              value={vacForm.vacaciones}
                              onChange={(ev) => setVacForm(f => ({ ...f, vacaciones: ev.target.value }))}
                              style={{ ...s.input, width: 80 }}
                            />
                          ) : (
                            <span>{e.vacaciones_correspondientes ?? e.vacaciones ?? 0} días</span>
                          )}
                        </td>
                        <td style={s.td}>
                          <button
                            style={{ ...s.btnRowEdit, background: "transparent", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                            onClick={() => abrirModalVacaciones(e)}
                            title="Ver / cargar períodos tomados"
                          >
                            {(e.vacaciones_tomadas ?? 0)} días 📋
                          </button>
                        </td>
                        <td style={{ ...s.td, color: (e.vacaciones_pendientes ?? 0) > 0 ? "var(--color-text-success)" : "var(--color-text-secondary)", fontWeight: 500 }}>
                          {e.vacaciones_pendientes ?? 0} días
                        </td>
                        <td style={{ ...s.td, color: "var(--color-text-secondary)" }}>
                          {(e.horas_calculadas ?? 0)}h
                        </td>
                        <td style={s.td}>
                          <button
                            style={{ ...s.btnRowEdit, background: "transparent", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                            onClick={() => abrirModalJustificaciones(e)}
                            title="Ver / cargar días de ART"
                          >
                            {(e.dias_art ?? 0)} días 🩹
                          </button>
                        </td>
                        <td style={s.td}>
                          <button
                            style={{ ...s.btnRowEdit, background: "transparent", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                            onClick={() => abrirModalJustificaciones(e)}
                            title="Ver / cargar días de certificado médico"
                          >
                            {(e.dias_certificado ?? 0)} días 📄
                          </button>
                        </td>
                        <td style={{ ...s.td, color: "var(--color-text-secondary)" }}>
                          {(e.horas_esperadas ?? 0)}h
                        </td>
                        <td style={{ ...s.td, color: e.diferencia_vs_44 >= 0 ? "var(--color-text-success)" : "var(--color-text-danger)", fontWeight: 500 }}>
                          {e.diferencia_vs_44 >= 0 ? "+" : ""}{e.diferencia_vs_44 ?? 0}h
                          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: 4 }}>({e.semanas_con_actividad ?? 0} sem)</span>
                          {(e.horas_justificadas ?? 0) > 0 && (
                            <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: 4 }}>+{e.horas_justificadas}h justif.</span>
                          )}
                        </td>
                        <td style={{ ...s.td, color: e.saldo_horas_total >= 0 ? "var(--color-text-success)" : "var(--color-text-danger)", fontWeight: 600 }}>
                          {vacEditando === e.id ? (
                            <div>
                              <label style={{ fontSize: 10, color: "var(--color-text-secondary)", display: "block" }}>Ajuste manual</label>
                              <input
                                type="number"
                                value={vacForm.horas_acumuladas}
                                onChange={(ev) => setVacForm(f => ({ ...f, horas_acumuladas: ev.target.value }))}
                                style={{ ...s.input, width: 80 }}
                              />
                            </div>
                          ) : (
                            <>
                              {e.saldo_horas_total >= 0 ? "+" : ""}{e.saldo_horas_total ?? 0}h
                              <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: 4, fontWeight: 400 }}>
                                (ajuste {e.horas_acumuladas >= 0 ? "+" : ""}{e.horas_acumuladas}h)
                              </span>
                            </>
                          )}
                        </td>
                        {!esOperario && (
                          <td style={s.td}>
                            {vacEditando === e.id ? (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button style={s.btnRowEdit} onClick={() => guardarVac(e.id)}>💾</button>
                                <button style={s.btnRowDel} onClick={() => setVacEditando(null)}>✕</button>
                              </div>
                            ) : (
                              <button style={s.btnRowEdit} onClick={() => {
                                setVacEditando(e.id);
                                setVacForm({ vacaciones: e.vacaciones_correspondientes ?? e.vacaciones ?? 0, horas_acumuladas: e.horas_acumuladas ?? 0 });
                              }}>✏️</button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Modal: detalle y carga de períodos de vacaciones tomados ── */}
          {vacModalEmpleado && (
            <div
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
              }}
              onClick={cerrarModalVacaciones}
            >
              <div
                style={{
                  background: "var(--color-bg-primary)", borderRadius: 8, padding: 24,
                  width: 480, maxWidth: "92vw", maxHeight: "85vh", overflowY: "auto",
                }}
                onClick={(ev) => ev.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <h3 style={{ margin: 0, color: "var(--color-text-primary)" }}>
                    Vacaciones — {vacModalEmpleado.apellido} {vacModalEmpleado.nombre}
                  </h3>
                  <button style={s.btnRowDel} onClick={cerrarModalVacaciones}>✕</button>
                </div>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 16 }}>
                  Períodos tomados en el año vigente. Los días se cuentan corridos (de calendario), como marca la ley.
                </p>

                {!esOperario && (
                  <div style={{
                    display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end",
                    padding: 12, background: "var(--color-bg-secondary)", borderRadius: 6, marginBottom: 16,
                  }}>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Desde</label>
                      <input
                        type="date"
                        value={vacTomadasForm.fecha_desde}
                        onChange={(ev) => {
                          const fecha_desde = ev.target.value;
                          setVacTomadasForm(f => ({
                            ...f,
                            fecha_desde,
                            dias: diasCorridos(fecha_desde, f.fecha_hasta) || f.dias,
                          }));
                        }}
                        style={{ ...s.input, width: 140 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Hasta</label>
                      <input
                        type="date"
                        value={vacTomadasForm.fecha_hasta}
                        onChange={(ev) => {
                          const fecha_hasta = ev.target.value;
                          setVacTomadasForm(f => ({
                            ...f,
                            fecha_hasta,
                            dias: diasCorridos(f.fecha_desde, fecha_hasta) || f.dias,
                          }));
                        }}
                        style={{ ...s.input, width: 140 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Días</label>
                      <input
                        type="number"
                        value={vacTomadasForm.dias}
                        onChange={(ev) => setVacTomadasForm(f => ({ ...f, dias: ev.target.value }))}
                        style={{ ...s.input, width: 70 }}
                      />
                    </div>
                    <button style={s.btnNueva} onClick={agregarVacacionTomada}>＋ Agregar</button>
                  </div>
                )}

                {vacTomadasCargando ? (
                  <p style={{ color: "var(--color-text-secondary)" }}>Cargando...</p>
                ) : vacTomadasList.length === 0 ? (
                  <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
                    Todavía no hay períodos cargados para este empleado.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {vacTomadasList.map((v) => (
                      <div
                        key={v.id}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "8px 12px", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 13,
                        }}
                      >
                        <span>
                          {fmtFecha(v.fecha_desde)} → {fmtFecha(v.fecha_hasta)}
                          <strong style={{ marginLeft: 8 }}>{v.dias} días</strong>
                          {v.nota && <span style={{ color: "var(--color-text-secondary)", marginLeft: 8 }}>({v.nota})</span>}
                        </span>
                        {!esOperario && (
                          <button style={s.btnRowDel} onClick={() => eliminarVacacionTomada(v.id)}>🗑</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Modal: detalle y carga de justificaciones (ART / Certificado) ── */}
          {justifModalEmpleado && (
            <div
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
              }}
              onClick={cerrarModalJustificaciones}
            >
              <div
                style={{
                  background: "var(--color-bg-primary)", borderRadius: 8, padding: 24,
                  width: 500, maxWidth: "92vw", maxHeight: "85vh", overflowY: "auto",
                }}
                onClick={(ev) => ev.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <h3 style={{ margin: 0, color: "var(--color-text-primary)" }}>
                    ART / Certificado — {justifModalEmpleado.apellido} {justifModalEmpleado.nombre}
                  </h3>
                  <button style={s.btnRowDel} onClick={cerrarModalJustificaciones}>✕</button>
                </div>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 16 }}>
                  Los días hábiles cargados acá se suman como horas trabajadas/justificadas en "Dif. del período" (no penalizan al empleado).
                </p>

                {!esOperario && (
                  <div style={{
                    display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end",
                    padding: 12, background: "var(--color-bg-secondary)", borderRadius: 6, marginBottom: 16,
                  }}>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Tipo</label>
                      <select
                        value={justifForm.tipo}
                        onChange={(ev) => setJustifForm(f => ({ ...f, tipo: ev.target.value }))}
                        style={{ ...s.input, width: 130 }}
                      >
                        <option value="ART">ART</option>
                        <option value="Certificado">Certificado</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Desde</label>
                      <input
                        type="date"
                        value={justifForm.fecha_desde}
                        onChange={(ev) => {
                          const fecha_desde = ev.target.value;
                          setJustifForm(f => ({
                            ...f,
                            fecha_desde,
                            dias: diasCorridos(fecha_desde, f.fecha_hasta) || f.dias,
                          }));
                        }}
                        style={{ ...s.input, width: 140 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Hasta</label>
                      <input
                        type="date"
                        value={justifForm.fecha_hasta}
                        onChange={(ev) => {
                          const fecha_hasta = ev.target.value;
                          setJustifForm(f => ({
                            ...f,
                            fecha_hasta,
                            dias: diasCorridos(f.fecha_desde, fecha_hasta) || f.dias,
                          }));
                        }}
                        style={{ ...s.input, width: 140 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Días</label>
                      <input
                        type="number"
                        value={justifForm.dias}
                        onChange={(ev) => setJustifForm(f => ({ ...f, dias: ev.target.value }))}
                        style={{ ...s.input, width: 70 }}
                      />
                    </div>
                    <button style={s.btnNueva} onClick={agregarJustificacion}>＋ Agregar</button>
                  </div>
                )}

                {justifCargando ? (
                  <p style={{ color: "var(--color-text-secondary)" }}>Cargando...</p>
                ) : justifList.length === 0 ? (
                  <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
                    Todavía no hay justificaciones cargadas para este empleado.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {justifList.map((v) => (
                      <div
                        key={v.id}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "8px 12px", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 13,
                        }}
                      >
                        <span>
                          <strong style={{ marginRight: 8 }}>{v.tipo === "ART" ? "🩹 ART" : "📄 Certificado"}</strong>
                          {fmtFecha(v.fecha_desde)} → {fmtFecha(v.fecha_hasta)}
                          <strong style={{ marginLeft: 8 }}>{v.dias} días</strong>
                          {v.nota && <span style={{ color: "var(--color-text-secondary)", marginLeft: 8 }}>({v.nota})</span>}
                        </span>
                        {!esOperario && (
                          <button style={s.btnRowDel} onClick={() => eliminarJustificacion(v.id)}>🗑</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Pantalla de inicio ──────────────────────────────────────────── */}
      {vista === "inicio" && (
        <div style={s.page}>
          <div style={s.header}>
            <div style={s.headerLeft}>
              <button style={s.btnVolver} onClick={onBack}>← Volver</button>
              <div style={s.iconBox}><IconReloj /></div>
              <div>
                <h1 style={s.titulo}>Asistencia</h1>
                <span style={s.subtitulo}>Control de personal</span>
              </div>
            </div>
            <div style={s.headerRight}>
              <AgenteBadge agente={agente} />
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 16, marginTop: 32,
          }}>
            {/* GPS primero y destacado para operarios */}
            <div
              style={{
                ...s.inicioCard,
                order: esOperario ? -1 : 3,
                borderColor: esOperario ? "#16a34a88" : "#334155",
                background: esOperario ? "#0d2218" : "#1e293b",
              }}
              onClick={() => { setGpsEstado("idle"); setGpsMsg(""); setGpsCoordenadas(null); setGpsError(""); setVista("gps"); }}
            >
              <span style={s.inicioIcon}>📍</span>
              <span style={s.inicioLabel}>Fichar GPS</span>
              <span style={s.inicioDesc}>Registrar entrada o salida con ubicación</span>
            </div>
            <div style={{ ...s.inicioCard, order: 0 }} onClick={() => setVista("fichadas")}>
              <span style={s.inicioIcon}>📋</span>
              <span style={s.inicioLabel}>Movimientos</span>
              <span style={s.inicioDesc}>Entradas y salidas del día</span>
            </div>
            <div style={{ ...s.inicioCard, order: 1 }} onClick={() => setVista("historial")}>
              <span style={s.inicioIcon}>📊</span>
              <span style={s.inicioLabel}>Historial</span>
              <span style={s.inicioDesc}>Horas acumuladas por empleado</span>
            </div>
            <div style={{ ...s.inicioCard, order: 2 }} onClick={abrirVacaciones}>
              <span style={s.inicioIcon}>🏖️</span>
              <span style={s.inicioLabel}>Vacaciones y Horas</span>
              <span style={s.inicioDesc}>Resumen por empleado</span>
            </div>
          </div>
        </div>
      )}


      {vista === "fichadas" && (
        <>
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={s.header}>
            <div style={s.headerLeft}>
              <button style={s.btnVolver} onClick={() => setVista("inicio")}>← Volver</button>
              <div style={s.iconBox}>
                <IconReloj />
              </div>
              <div>
                <h1 style={s.titulo}>Movimientos</h1>
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
              {!esOperario && (
                <button style={s.btnUsuarios} onClick={() => setVista("usuarios")}>
                  👥 Empleados
                </button>
              )}
              {!esOperario && (
                <button style={s.btnNueva} onClick={abrirNueva}>
                  + Nueva fichada
                </button>
              )}
              <button style={s.btnVac} onClick={abrirVacaciones}>
                🏖️ Vacaciones y Horas
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

          {/* ── Panel de presencia ─────────────────────────────────────── */}
          <div style={s.presenciaWrap}>
            {presencia.length === 0
              ? <span style={{ color: "#475569", fontSize: 13 }}>Cargando empleados...</span>
              : presencia.map((emp) => (
                <span key={emp.id} style={{
                  fontSize: 13, fontWeight: 600,
                  color: emp.dentro ? "#4ade80" : "#f87171",
                }}>
                  {emp.nombre}
                </span>
              ))
            }
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

              {/* Empleado (select por nombre) — oculto para operarios */}
              {!esOperario && (
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
              )}

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
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {fmtHora(f.timestamp)}
                            {f.raw_hex && (
                              <span title="Registro del dispositivo Anviz" style={{ fontSize: 13, opacity: 0.6 }}>🕐</span>
                            )}
                          </div>
                        </td>
                        <td style={s.td}>
                          <span style={f.direccion === "entrada" ? s.badgeEntrada : s.badgeSalida}>
                            {f.direccion === "entrada" ? "↓ Entrada" : "↑ Salida"}
                          </span>
                        </td>
                        {!esOperario && (
                          <td style={{ ...s.td, width: 90 }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button style={s.btnRowEdit} onClick={() => abrirEditar(f)} title="Editar">✏️</button>
                              <button style={s.btnRowDel}  onClick={() => eliminarFichada(f.id)} title="Eliminar">🗑️</button>
                            </div>
                          </td>
                        )}
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
              <button style={s.btnVolver} onClick={() => setVista("inicio")}>← Volver</button>
              <div style={s.iconBox}><IconReloj /></div>
              <div>
                <h1 style={s.titulo}>Historial de Horas</h1>
                <span style={s.subtitulo}>Acumulado por empleado</span>
              </div>
            </div>
            <div style={s.headerRight}>
              <AgenteBadge agente={agente} />
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
              <div style={s.filtroGrupo}>
                <label style={s.label}>Empleado</label>
                <select
                  value={histFiltroUser}
                  onChange={e => setHistFiltroUser(e.target.value)}
                  style={s.input}
                >
                  <option value="">Todos</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.apellido} {u.nombre}
                    </option>
                  ))}
                </select>
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

      {/* ── Vista GPS ──────────────────────────────────────────────────────── */}
      {vista === "gps" && (
        <div style={s.page}>
          <div style={s.header}>
            <div style={s.headerLeft}>
              <button style={s.btnVolver} onClick={() => setVista("inicio")}>← Volver</button>
              <div style={s.iconBox}>📍</div>
              <div>
                <h1 style={s.titulo}>Fichar GPS</h1>
                <span style={s.subtitulo}>Registrar asistencia con ubicación</span>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Selector de empleado (solo no-operarios) */}
            {!esOperario && (
              <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "20px 24px" }}>
                <label style={{ ...s.label, display: "block", marginBottom: 8 }}>Empleado</label>
                <select
                  value={gpsUserId}
                  onChange={e => setGpsUserId(e.target.value)}
                  style={{ ...s.input, width: "100%" }}
                >
                  <option value="">— Seleccionar —</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={String(u.id)}>{u.apellido} {u.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Selector entrada / salida */}
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "20px 24px" }}>
              <label style={{ ...s.label, display: "block", marginBottom: 10 }}>Tipo de registro</label>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  style={gpsDireccion === "entrada" ? s.dirBtnActive : s.dirBtn}
                  onClick={() => setGpsDireccion("entrada")}
                >
                  🟢 Entrada
                </button>
                <button
                  style={gpsDireccion === "salida" ? { ...s.dirBtnActive, background: "#451a03", borderColor: "#d97706", color: "#fbbf24" } : s.dirBtn}
                  onClick={() => setGpsDireccion("salida")}
                >
                  🟡 Salida
                </button>
              </div>
            </div>

            {/* Panel de ubicación */}
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "24px" }}>
              <label style={{ ...s.label, display: "block", marginBottom: 16 }}>Ubicación</label>

              {gpsEstado === "idle" && (
                <button
                  style={{ ...s.btnBuscar, width: "100%", padding: "14px", fontSize: 15 }}
                  onClick={() => {
                    setGpsEstado("obteniendo");
                    setGpsError("");
                    setGpsCoordenadas(null);
                    navigator.geolocation.getCurrentPosition(
                      pos => {
                        setGpsCoordenadas({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
                        setGpsEstado("ok");
                      },
                      err => {
                        setGpsError(err.message || "No se pudo obtener la ubicación");
                        setGpsEstado("error");
                      },
                      { enableHighAccuracy: true, timeout: 15000 }
                    );
                  }}
                >
                  📍 Obtener mi ubicación
                </button>
              )}

              {gpsEstado === "obteniendo" && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#94a3b8" }}>
                  <div style={s.spinner} />
                  <span>Obteniendo ubicación GPS...</span>
                </div>
              )}

              {gpsEstado === "error" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={s.modalError}>{gpsError}</div>
                  <button style={s.btnBuscar} onClick={() => setGpsEstado("idle")}>Reintentar</button>
                </div>
              )}

              {(gpsEstado === "ok" || gpsEstado === "enviando" || gpsEstado === "enviado") && gpsCoordenadas && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: "#0f172a", borderRadius: 8, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>
                      <span style={{ color: "#64748b" }}>Latitud: </span>
                      <span style={{ color: "#f1f5f9", fontFamily: "monospace" }}>{gpsCoordenadas.lat.toFixed(6)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>
                      <span style={{ color: "#64748b" }}>Longitud: </span>
                      <span style={{ color: "#f1f5f9", fontFamily: "monospace" }}>{gpsCoordenadas.lng.toFixed(6)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      Precisión: ±{Math.round(gpsCoordenadas.accuracy)} metros
                    </div>
                  </div>
                  <a
                    href={`https://maps.google.com/?q=${gpsCoordenadas.lat},${gpsCoordenadas.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: "#818cf8", textDecoration: "none" }}
                  >
                    Ver en Google Maps ↗
                  </a>
                  <button style={{ ...s.btnBuscar, background: "transparent", border: "1px solid #334155", color: "#64748b" }}
                    onClick={() => setGpsEstado("idle")}>
                    🔄 Actualizar ubicación
                  </button>
                </div>
              )}
            </div>

            {/* Botón fichar */}
            {(gpsEstado === "ok" || gpsEstado === "enviando") && (
              <button
                disabled={gpsEstado === "enviando" || (!esOperario && !gpsUserId)}
                style={{
                  background: gpsDireccion === "entrada" ? "#14532d" : "#451a03",
                  border: `1px solid ${gpsDireccion === "entrada" ? "#16a34a" : "#d97706"}`,
                  borderRadius: 12, padding: "18px",
                  color: gpsDireccion === "entrada" ? "#4ade80" : "#fbbf24",
                  fontSize: 16, fontWeight: 700, cursor: gpsEstado === "enviando" ? "not-allowed" : "pointer",
                  opacity: gpsEstado === "enviando" ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                }}
                onClick={async () => {
                  const uid = esOperario ? usuario.id : Number(gpsUserId);
                  if (!uid) { setGpsMsg("⚠️ Seleccioná un empleado"); return; }

                  // ── Verificar zona permitida (200m de radio) ──────────────
                  const EMPRESA_LAT = -38.746619;
                  const EMPRESA_LNG = -62.284310;
                  const RADIO_M = 200;
                  const toRad = deg => deg * Math.PI / 180;
                  const R = 6371000;
                  const dLat = toRad(gpsCoordenadas.lat - EMPRESA_LAT);
                  const dLng = toRad(gpsCoordenadas.lng - EMPRESA_LNG);
                  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(EMPRESA_LAT)) * Math.cos(toRad(gpsCoordenadas.lat)) * Math.sin(dLng/2)**2;
                  const distancia = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                  if (distancia > RADIO_M) {
                    setGpsMsg(`⛔ Fuera de zona — estás a ${Math.round(distancia)} m del lugar de trabajo (máximo ${RADIO_M} m)`);
                    return;
                  }

                  setGpsEstado("enviando");
                  setGpsMsg("");
                  const now = new Date();
                  const pad2 = n => String(n).padStart(2, "0");
                  const tsMySQL = `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
                  try {
                    const res = await fetch(`${API}/fichadas/gps`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({
                        user_id: uid,
                        direccion: gpsDireccion,
                        timestamp: tsMySQL,
                        gps_lat: gpsCoordenadas.lat,
                        gps_lng: gpsCoordenadas.lng,
                        gps_accuracy: gpsCoordenadas.accuracy,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Error al registrar");
                    setGpsEstado("enviado");
                    setGpsMsg(`✅ ${gpsDireccion === "entrada" ? "Entrada" : "Salida"} registrada a las ${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
                  } catch (e) {
                    setGpsMsg("⚠️ " + e.message);
                    setGpsEstado("ok");
                  }
                }}
              >
                {gpsEstado === "enviando"
                  ? <><div style={{ ...s.spinner, width: 18, height: 18, borderTopColor: "currentColor" }} /> Registrando...</>
                  : <>{gpsDireccion === "entrada" ? "🟢 Registrar Entrada" : "🟡 Registrar Salida"}</>
                }
              </button>
            )}

            {/* Mensaje de resultado */}
            {gpsMsg && (
              <div style={{
                background: gpsMsg.startsWith("✅") ? "#052e16" : "#450a0a",
                border: `1px solid ${gpsMsg.startsWith("✅") ? "#16a34a44" : "#dc262644"}`,
                borderRadius: 10, padding: "14px 18px",
                color: gpsMsg.startsWith("✅") ? "#4ade80" : "#fca5a5",
                fontSize: 14, fontWeight: 500, textAlign: "center",
              }}>
                {gpsMsg}
              </div>
            )}

            {/* Botón nueva fichada */}
            {gpsEstado === "enviado" && (
              <button
                style={{ ...s.btnVolver, padding: "12px", textAlign: "center", borderRadius: 10 }}
                onClick={() => { setGpsEstado("idle"); setGpsMsg(""); setGpsCoordenadas(null); }}
              >
                Registrar otra fichada
              </button>
            )}
          </div>
        </div>
      )}

      {/* CSS keyframes globales */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        tr:hover td { background: rgba(99,102,241,0.04); }
        @media (min-width: 640px) {
          .anviz-page { padding: 28px 32px !important; }
        }
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
    padding: "16px",
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
  presenciaWrap: {
    display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24,
    background: "#1e293b", border: "1px solid #334155",
    borderRadius: 12, padding: "16px 20px",
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
  inicioCard: {
    background: "#1e293b", border: "1px solid #334155", borderRadius: 16,
    padding: "28px 16px", cursor: "pointer", display: "flex",
    flexDirection: "column", alignItems: "center", gap: 10,
    transition: "all 0.15s",
  },
  inicioIcon:  { fontSize: 48 },
  inicioLabel: { fontSize: 20, fontWeight: 700, color: "#f1f5f9" },
  inicioDesc:  { fontSize: 13, color: "#64748b", textAlign: "center" },
  navBar: {
    display: "flex", gap: 8, marginBottom: 24,
    background: "#1e293b", border: "1px solid #334155",
    borderRadius: 12, padding: "8px",
    width: "fit-content",
  },
  navBtn: {
    background: "transparent", border: "none", borderRadius: 8,
    padding: "10px 24px", cursor: "pointer", color: "#64748b",
    fontSize: 14, fontWeight: 500, transition: "all 0.15s",
  },
  navBtnActive: {
    background: "#312e81", border: "none", borderRadius: 8,
    padding: "10px 24px", cursor: "pointer", color: "#a5b4fc",
    fontSize: 14, fontWeight: 700,
  },
  btnNav: {
    background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
    padding: "8px 16px", cursor: "pointer", color: "#94a3b8", fontSize: 13, fontWeight: 500,
  },
  btnNavActive: {
    background: "#312e81", border: "1px solid #6366f1", borderRadius: 8,
    padding: "8px 16px", cursor: "pointer", color: "#a5b4fc", fontSize: 13, fontWeight: 600,
  },
  btnVac: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    background: "var(--color-accent-secondary, #0ea5e9)",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  btnNueva: {
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
