import { useEffect, useState } from "react";
import ScreenHeader from "../Component/ScreenHeader";
import { useAuth } from "../context/AuthContext";

const API = "https://integral-backend-production.up.railway.app";

const EMPTY = {
  leyenda: "",
  observaciones: "",
  texto_sena: "",
  incluir_texto_sena: true,
  direccion: "",
  ubicacion: "",
};

const inputStyle = {
  padding: "0.5rem 0.75rem",
  borderRadius: 8,
  border: "1px solid #1e3a5f",
  background: "#070f1a",
  color: "#e2e8f0",
  fontSize: "0.875rem",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 70,
  resize: "vertical",
  fontFamily: "inherit",
};

function fmtFecha(ts) {
  if (!ts) return "—";
  const d = new Date(String(ts).replace(" ", "T"));
  if (isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PresupuestoInfo() {
  const { usuario, authFetch } = useAuth();

  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const [seleccionado, setSeleccionado] = useState(null); // fila elegida
  const [modal, setModal] = useState(null); // null | "editar" | "eliminar"
  const [form, setForm] = useState(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [modalError, setModalError] = useState("");

  const cargar = () => {
    setCargando(true);
    setError(null);
    authFetch(`${API}/presupuesto-info`)
      .then((r) => r.json())
      .then((data) => setRegistros(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudo cargar presupuesto_info"))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirEditar = (reg) => {
    setSeleccionado(reg);
    setForm({
      leyenda: reg.leyenda ?? "",
      observaciones: reg.observaciones ?? "",
      texto_sena: reg.texto_sena ?? "",
      incluir_texto_sena: !!reg.incluir_texto_sena,
      direccion: reg.direccion ?? "",
      ubicacion: reg.ubicacion ?? "",
    });
    setModalError("");
    setModal("editar");
  };

  const abrirEliminar = (reg) => {
    setSeleccionado(reg);
    setModal("eliminar");
  };

  const cerrarModal = () => {
    setModal(null);
    setSeleccionado(null);
    setModalError("");
  };

  const handleGuardar = async () => {
    if (!seleccionado) return;
    setGuardando(true);
    setModalError("");
    try {
      const payload = {
        ...form,
        actualizado_por:
          usuario?.nombre || usuario?.usuario || usuario?.email || null,
      };
      const res = await authFetch(
        `${API}/presupuesto-info/${seleccionado.numeropres}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error("No se pudo guardar");
      cerrarModal();
      cargar();
    } catch (err) {
      setModalError(err.message || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async () => {
    if (!seleccionado) return;
    setGuardando(true);
    setModalError("");
    try {
      const res = await authFetch(
        `${API}/presupuesto-info/${seleccionado.numeropres}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("No se pudo eliminar");
      cerrarModal();
      cargar();
    } catch (err) {
      setModalError(err.message || "Error al eliminar");
    } finally {
      setGuardando(false);
    }
  };

  const filtrados = registros.filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      String(r.numeropres).includes(q) ||
      r.leyenda?.toLowerCase().includes(q) ||
      r.observaciones?.toLowerCase().includes(q) ||
      r.direccion?.toLowerCase().includes(q) ||
      r.ubicacion?.toLowerCase().includes(q) ||
      r.actualizado_por?.toLowerCase().includes(q)
    );
  });

  const thStyle = {
    padding: "0.6rem 0.75rem",
    textAlign: "left",
    fontSize: "0.72rem",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#64748b",
    fontWeight: 700,
  };
  const tdStyle = {
    padding: "0.6rem 0.75rem",
    borderTop: "1px solid #16263f",
    fontSize: "0.85rem",
    color: "#e2e8f0",
    verticalAlign: "top",
  };

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <ScreenHeader
        icon="🧾"
        title="Presupuesto Info"
        subtitle="Leyenda, seña y datos por presupuesto (tabla presupuesto_info)"
      />

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          margin: "1.5rem 0 1rem",
        }}
      >
        <input
          style={{ ...inputStyle, maxWidth: 420 }}
          placeholder="Buscar por número, leyenda, dirección, ubicación..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ color: "#475569", fontSize: "0.8rem" }}>
          {filtrados.length} registro{filtrados.length !== 1 ? "s" : ""}
        </div>
        <button
          onClick={cargar}
          style={{
            marginLeft: "auto",
            background: "#0d1f3c",
            color: "#93c5fd",
            border: "1px solid #1e3a5f",
            borderRadius: 8,
            padding: "0.5rem 1rem",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          ↻ Actualizar
        </button>
      </div>

      {error && (
        <div style={{ color: "#f87171", marginBottom: "1rem" }}>{error}</div>
      )}

      <div
        style={{
          background: "#0a1628",
          border: "1px solid #1e3a5f",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0d1f3c" }}>
              <th style={thStyle}>N° Presupuesto</th>
              <th style={thStyle}>Leyenda</th>
              <th style={thStyle}>Observaciones</th>
              <th style={thStyle}>Seña</th>
              <th style={thStyle}>Dirección</th>
              <th style={thStyle}>Ubicación</th>
              <th style={thStyle}>Actualizado</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td style={tdStyle} colSpan={8}>
                  Cargando...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td style={tdStyle} colSpan={8}>
                  Sin registros
                </td>
              </tr>
            ) : (
              filtrados.map((r) => (
                <tr key={r.numeropres}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>
                    {r.numeropres}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 220 }}>
                    {r.leyenda || "—"}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 220 }}>
                    {r.observaciones || "—"}
                  </td>
                  <td style={tdStyle}>
                    {r.incluir_texto_sena ? (
                      <span title={r.texto_sena || ""} style={{ color: "#4ade80" }}>
                        Sí
                      </span>
                    ) : (
                      <span style={{ color: "#64748b" }}>No</span>
                    )}
                  </td>
                  <td style={tdStyle}>{r.direccion || "—"}</td>
                  <td style={{ ...tdStyle, maxWidth: 200 }}>
                    {r.ubicacion || "—"}
                  </td>
                  <td style={{ ...tdStyle, fontSize: "0.75rem", color: "#94a3b8" }}>
                    {fmtFecha(r.actualizado_en)}
                    {r.actualizado_por ? ` · ${r.actualizado_por}` : ""}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => abrirEditar(r)}
                      title="Editar"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                        marginRight: 8,
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => abrirEliminar(r)}
                      title="Eliminar"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal editar */}
      {modal === "editar" && seleccionado && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#0a1628",
              border: "1px solid #1e3a5f",
              borderRadius: 14,
              padding: "1.5rem",
              width: 480,
              maxWidth: "90vw",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ color: "#e2e8f0", marginTop: 0 }}>
              Editar presupuesto N° {seleccionado.numeropres}
            </h3>

            <label style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
              Leyenda
            </label>
            <textarea
              style={textareaStyle}
              value={form.leyenda}
              onChange={(e) => setForm({ ...form, leyenda: e.target.value })}
            />

            <label
              style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: 10, display: "block" }}
            >
              Observaciones
            </label>
            <textarea
              style={textareaStyle}
              value={form.observaciones}
              onChange={(e) =>
                setForm({ ...form, observaciones: e.target.value })
              }
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#94a3b8",
                fontSize: "0.85rem",
                marginTop: 10,
              }}
            >
              <input
                type="checkbox"
                checked={form.incluir_texto_sena}
                onChange={(e) =>
                  setForm({ ...form, incluir_texto_sena: e.target.checked })
                }
              />
              Incluir texto de seña
            </label>
            <textarea
              style={{ ...textareaStyle, marginTop: 6 }}
              placeholder="Texto de seña"
              value={form.texto_sena}
              onChange={(e) =>
                setForm({ ...form, texto_sena: e.target.value })
              }
              disabled={!form.incluir_texto_sena}
            />

            <label
              style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: 10, display: "block" }}
            >
              Dirección
            </label>
            <input
              style={inputStyle}
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />

            <label
              style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: 10, display: "block" }}
            >
              Ubicación
            </label>
            <input
              style={inputStyle}
              value={form.ubicacion}
              onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
            />

            {modalError && (
              <div style={{ color: "#f87171", marginTop: 10, fontSize: "0.8rem" }}>
                {modalError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
              <button
                onClick={cerrarModal}
                disabled={guardando}
                style={{
                  background: "#0d1f3c",
                  color: "#94a3b8",
                  border: "1px solid #1e3a5f",
                  borderRadius: 8,
                  padding: "0.55rem 1.1rem",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "0.55rem 1.1rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {modal === "eliminar" && seleccionado && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#0a1628",
              border: "1px solid #1e3a5f",
              borderRadius: 14,
              padding: "1.5rem",
              width: 380,
              maxWidth: "90vw",
            }}
          >
            <h3 style={{ color: "#e2e8f0", marginTop: 0 }}>
              ¿Eliminar registro N° {seleccionado.numeropres}?
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              Esto borra la fila de presupuesto_info (leyenda, observaciones,
              seña, dirección y ubicación). No borra el presupuesto en sí.
            </p>
            {modalError && (
              <div style={{ color: "#f87171", marginTop: 10, fontSize: "0.8rem" }}>
                {modalError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
              <button
                onClick={cerrarModal}
                disabled={guardando}
                style={{
                  background: "#0d1f3c",
                  color: "#94a3b8",
                  border: "1px solid #1e3a5f",
                  borderRadius: 8,
                  padding: "0.55rem 1.1rem",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={guardando}
                style={{
                  background: "#7f1d1d",
                  color: "#fecaca",
                  border: "1px solid #991b1b",
                  borderRadius: 8,
                  padding: "0.55rem 1.1rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {guardando ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
