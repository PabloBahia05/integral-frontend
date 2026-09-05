import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Chat directo entre usuarios del sistema.
 *
 * Requiere en el backend:
 *   - chat/chat.routes.js  (GET /chat/usuarios, GET/POST /chat/:otroId,
 *     PUT /chat/:otroId/leido)
 *   - empleados/websocket.js actualizado (enviarAUsuario por token)
 *
 * El WebSocket se conecta mientras esta pantalla está montada — si el
 * usuario navega a otra pantalla, deja de recibir mensajes en vivo hasta
 * que vuelva a abrir el chat (los mensajes igual quedan guardados y
 * aparecen al reabrir). Si más adelante se quiere un badge de "no leídos"
 * visible desde cualquier pantalla, esta conexión conviene subirla a
 * App.jsx / un contexto global en vez de vivir acá.
 */
export default function Chat({ authFetch, token, usuario, API }) {
  const [usuarios, setUsuarios] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [wsEstado, setWsEstado] = useState("conectando"); // conectando | listo | caido

  const seleccionadoRef = useRef(null);
  const mensajesFinRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    seleccionadoRef.current = seleccionado;
  }, [seleccionado]);

  const cargarUsuarios = useCallback(() => {
    authFetch(`${API}/chat/usuarios`)
      .then((r) => r.json())
      .then((data) => setUsuarios(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error cargando usuarios de chat:", err));
  }, [authFetch, API]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // Conexión WebSocket — token por query string porque el WebSocket nativo
  // no permite mandar headers custom (Authorization).
  useEffect(() => {
    if (!token) return;
    const wsUrl = `${API.replace(/^http/, "ws")}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsEstado("listo");
    ws.onclose = () => setWsEstado("caido");
    ws.onerror = () => setWsEstado("caido");

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data?.tipo !== "chat:nuevo_mensaje" || !data.mensaje) return;
      const m = data.mensaje;

      const otroAbierto = seleccionadoRef.current?.id;
      const esDeConversacionAbierta =
        otroAbierto != null &&
        (m.remitente_id === otroAbierto || m.destinatario_id === otroAbierto);

      if (esDeConversacionAbierta) {
        setMensajes((prev) => [...prev, m]);
        if (m.destinatario_id === usuario.id) {
          authFetch(`${API}/chat/${m.remitente_id}/leido`, { method: "PUT" }).catch(() => {});
        }
      }

      // Refresca la lista igual (para el badge de no-leídos de cualquier
      // conversación que no sea la que está abierta ahora).
      cargarUsuarios();
    };

    return () => ws.close();
  }, [token, API, authFetch, usuario.id, cargarUsuarios]);

  useEffect(() => {
    mensajesFinRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  async function seleccionarUsuario(u) {
    setSeleccionado(u);
    setMensajes([]);
    setCargandoHistorial(true);
    try {
      const res = await authFetch(`${API}/chat/${u.id}`);
      const historial = await res.json();
      setMensajes(Array.isArray(historial) ? historial : []);
      await authFetch(`${API}/chat/${u.id}/leido`, { method: "PUT" });
      cargarUsuarios();
    } catch (err) {
      console.error("Error cargando conversación:", err);
    } finally {
      setCargandoHistorial(false);
    }
  }

  async function enviarMensaje() {
    const contenido = texto.trim();
    if (!contenido || !seleccionado || enviando) return;
    setEnviando(true);
    setTexto("");
    try {
      const res = await authFetch(`${API}/chat/${seleccionado.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const mensaje = await res.json();
      setMensajes((prev) => [...prev, mensaje]);
    } catch (err) {
      console.error("Error enviando mensaje:", err);
      setTexto(contenido); // devuelvo el texto al input si falló, para no perderlo
    } finally {
      setEnviando(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  }

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.sidebar}>
        <div style={estilos.sidebarHeader}>
          <span>Compañeros</span>
          <span
            title={wsEstado === "listo" ? "Conectado en tiempo real" : "Sin conexión en vivo"}
            style={{
              ...estilos.puntoEstado,
              background: wsEstado === "listo" ? "#2ecc71" : "#c0392b",
            }}
          />
        </div>
        <div style={estilos.listaUsuarios}>
          {usuarios.map((u) => (
            <button
              key={u.id}
              onClick={() => seleccionarUsuario(u)}
              style={{
                ...estilos.itemUsuario,
                ...(seleccionado?.id === u.id ? estilos.itemUsuarioActivo : {}),
              }}
            >
              <div style={estilos.avatar}>
                {(u.nombre?.[0] ?? "?").toUpperCase()}
              </div>
              <div style={{ flex: 1, textAlign: "left", overflow: "hidden" }}>
                <div style={estilos.nombreUsuario}>
                  {u.nombre} {u.apellido}
                </div>
                <div style={estilos.rolUsuario}>{u.rol}</div>
              </div>
              {u.no_leidos > 0 && (
                <span style={estilos.badge}>{u.no_leidos}</span>
              )}
            </button>
          ))}
          {usuarios.length === 0 && (
            <div style={estilos.vacioLista}>No hay otros usuarios activos.</div>
          )}
        </div>
      </div>

      <div style={estilos.panelChat}>
        {!seleccionado ? (
          <div style={estilos.estadoVacio}>Elegí a alguien para empezar a chatear.</div>
        ) : (
          <>
            <div style={estilos.headerChat}>
              {seleccionado.nombre} {seleccionado.apellido}
            </div>
            <div style={estilos.listaMensajes}>
              {cargandoHistorial && (
                <div style={estilos.estadoVacio}>Cargando conversación...</div>
              )}
              {!cargandoHistorial && mensajes.length === 0 && (
                <div style={estilos.estadoVacio}>Todavía no hay mensajes. Escribí el primero.</div>
              )}
              {mensajes.map((m) => {
                const esMio = m.remitente_id === usuario.id;
                return (
                  <div
                    key={m.id}
                    style={{
                      ...estilos.burbujaWrap,
                      justifyContent: esMio ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        ...estilos.burbuja,
                        ...(esMio ? estilos.burbujaMia : estilos.burbujaOtro),
                      }}
                    >
                      {m.contenido}
                      <div style={estilos.horaMensaje}>
                        {new Date(m.creado_en).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={mensajesFinRef} />
            </div>
            <div style={estilos.inputBar}>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribí un mensaje..."
                rows={1}
                style={estilos.textarea}
              />
              <button
                onClick={enviarMensaje}
                disabled={!texto.trim() || enviando}
                style={{
                  ...estilos.botonEnviar,
                  opacity: !texto.trim() || enviando ? 0.5 : 1,
                }}
              >
                Enviar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const estilos = {
  contenedor: {
    display: "flex",
    height: "calc(100vh - 100px)",
    minHeight: 500,
    background: "#0f1115",
    borderRadius: 10,
    overflow: "hidden",
    fontFamily: "system-ui, sans-serif",
  },
  sidebar: {
    width: 260,
    borderRight: "1px solid #2a2e36",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  sidebarHeader: {
    padding: "14px 16px",
    color: "#cfd3da",
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottom: "1px solid #2a2e36",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  puntoEstado: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
  },
  listaUsuarios: {
    flex: 1,
    overflowY: "auto",
  },
  itemUsuario: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid #1c1f26",
    cursor: "pointer",
    textAlign: "left",
  },
  itemUsuarioActivo: {
    background: "#1c2530",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#2b6cb0",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  nombreUsuario: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rolUsuario: {
    color: "#8a8f98",
    fontSize: 11,
    textTransform: "capitalize",
  },
  badge: {
    background: "#e63946",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 10,
    padding: "2px 7px",
    flexShrink: 0,
  },
  vacioLista: {
    padding: 16,
    color: "#8a8f98",
    fontSize: 13,
  },
  panelChat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  headerChat: {
    padding: "14px 18px",
    borderBottom: "1px solid #2a2e36",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
  },
  listaMensajes: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  burbujaWrap: {
    display: "flex",
  },
  burbuja: {
    maxWidth: "65%",
    padding: "8px 12px",
    borderRadius: 12,
    fontSize: 13,
    color: "#fff",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  burbujaMia: {
    background: "#2b6cb0",
    borderBottomRightRadius: 2,
  },
  burbujaOtro: {
    background: "#262b33",
    borderBottomLeftRadius: 2,
  },
  horaMensaje: {
    fontSize: 10,
    opacity: 0.6,
    marginTop: 4,
    textAlign: "right",
  },
  estadoVacio: {
    margin: "auto",
    color: "#8a8f98",
    fontSize: 14,
  },
  inputBar: {
    display: "flex",
    gap: 8,
    padding: 14,
    borderTop: "1px solid #2a2e36",
  },
  textarea: {
    flex: 1,
    resize: "none",
    background: "#1c1f26",
    border: "1px solid #2a2e36",
    borderRadius: 8,
    color: "#fff",
    padding: "10px 12px",
    fontSize: 13,
    fontFamily: "system-ui, sans-serif",
    maxHeight: 100,
  },
  botonEnviar: {
    background: "#2b6cb0",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0 18px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
};
