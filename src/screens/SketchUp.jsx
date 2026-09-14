import { useState, useEffect, useRef } from "react";
import VisorSketchUp from "./VisorSketchUp";

const API = "https://integral-backend-production.up.railway.app";

// Igual que subirArchivoObra en Obras.jsx: NO usa authFetch (fuerza
// Content-Type: application/json y rompe el multipart/form-data) — pega
// directo con fetch + el token crudo.
async function subirModelo3D(numeropres, file, token) {
  const formData = new FormData();
  formData.append("archivo", file);
  const res = await fetch(`${API}/obras/${numeropres}/modelo3d`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Error al subir el modelo 3D");
  }
  return res.json();
}

/**
 * Pantalla "SketchUp": elegís una obra confirmada, subís el modelo
 * exportado a .glb (SketchUp → File → Export → 3D Model → .glb,
 * conservando nombres de componentes) y lo ves con VisorSketchUp.jsx
 * (three.js, 100% en el navegador — sin login ni cuenta de Trimble).
 *
 * Primera etapa: subir/ver + identificar componentes. El selector de obra
 * usa el mismo endpoint y el mismo colapso "1 fila por numeropres, la
 * revisión más nueva" que Obras.jsx — solo obras con al menos una revisión
 * confirmada.
 *
 * Estética a propósito alineada con VisorDWGPage.jsx (tema oscuro,
 * system-ui) porque las dos son pantallas de "visor 3D", en vez de con el
 * tema claro/Space Mono de las pantallas de presupuestos.
 */
export default function SketchUp({ authFetch, token }) {
  const [encabezados, setEncabezados] = useState([]);
  const [loadingEnc, setLoadingEnc] = useState(true);
  const [search, setSearch] = useState("");
  const [obraSeleccionada, setObraSeleccionada] = useState(null);

  const [modelo, setModelo] = useState(null);
  const [loadingModelo, setLoadingModelo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setLoadingEnc(true);
    authFetch(`${API}/tabla-presupuestos/revisiones-confirmadas`)
      .then((r) => r.json())
      .then((data) => setEncabezados(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingEnc(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mismo colapso que Obras.jsx: 1 fila por numeropres (la más nueva), solo
  // presupuestos con al menos una revisión confirmada.
  const q = search.toLowerCase();
  const obras = Array.from(
    encabezados
      .filter((e) => !!e.confirmado)
      .filter(
        (e) =>
          (e.nombre ?? "").toLowerCase().includes(q) ||
          String(e.numeropres ?? "").includes(q),
      )
      .reduce((map, e) => {
        if (!map.has(e.numeropres)) map.set(e.numeropres, e);
        return map;
      }, new Map())
      .values(),
  );

  useEffect(() => {
    if (!obraSeleccionada) {
      setModelo(null);
      return;
    }
    setLoadingModelo(true);
    setError("");
    authFetch(`${API}/obras/${obraSeleccionada.numeropres}/modelo3d`)
      .then((r) => r.json())
      .then((data) => setModelo(data ?? null))
      .catch(console.error)
      .finally(() => setLoadingModelo(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraSeleccionada]);

  const handleFile = async (file) => {
    if (!file || !obraSeleccionada) return;
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setError("El modelo debe exportarse como .glb (glTF binario) desde SketchUp.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const nuevo = await subirModelo3D(
        obraSeleccionada.numeropres,
        file,
        token,
      );
      setModelo(nuevo);
    } catch (e) {
      console.error("Error subiendo modelo 3D:", e);
      setError(e.message || "No se pudo subir el modelo 3D.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#0f1115",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* ── Barra superior ── */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid #2a2e36",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ color: "#fff", fontSize: 16, margin: 0 }}>
          SketchUp — Visor 3D de obras
        </h2>

        <input
          type="text"
          placeholder="Buscar obra por cliente o N°..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: "#1a1d24",
            border: "1px solid #3a3f4a",
            borderRadius: 6,
            color: "#e0e0e0",
            padding: "6px 10px",
            fontSize: 13,
            width: 220,
          }}
        />

        {obraSeleccionada && (
          <>
            <span style={{ color: "#8fb8e0", fontSize: 13 }}>
              {obraSeleccionada.nombre} — N° obra {obraSeleccionada.numeropres}
            </span>

            <input
              ref={inputRef}
              type="file"
              accept=".glb"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />
            <button
              onClick={() => !uploading && inputRef.current?.click()}
              disabled={uploading}
              style={{
                background: "#2b6cb0",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 13,
                cursor: uploading ? "default" : "pointer",
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading
                ? "⏳ Subiendo..."
                : modelo
                  ? "Reemplazar modelo (.glb)"
                  : "Subir modelo (.glb)"}
            </button>

            <button
              onClick={() => setObraSeleccionada(null)}
              style={{
                background: "none",
                border: "1px solid #3a3f4a",
                borderRadius: 6,
                color: "#8a8f98",
                padding: "8px 14px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cambiar obra
            </button>
          </>
        )}
      </div>

      {error && (
        <p style={{ color: "#e57373", fontSize: 13, margin: "8px 20px 0" }}>
          {error}
        </p>
      )}

      {/* ── Cuerpo ── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {!obraSeleccionada ? (
          <div style={{ height: "100%", overflowY: "auto", padding: 20 }}>
            {loadingEnc ? (
              <p style={{ color: "#8a8f98" }}>⏳ Cargando obras...</p>
            ) : obras.length === 0 ? (
              <p style={{ color: "#8a8f98" }}>No se encontraron obras.</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 10,
                }}
              >
                {obras.map((o) => (
                  <button
                    key={o.numeropres}
                    onClick={() => setObraSeleccionada(o)}
                    style={{
                      textAlign: "left",
                      background: "#1a1d24",
                      border: "1px solid #2a2e36",
                      borderRadius: 8,
                      padding: "12px 14px",
                      color: "#e0e0e0",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {o.nombre}
                    </div>
                    <div style={{ color: "#8a8f98", fontSize: 12, marginTop: 4 }}>
                      N° obra {o.numeropres} · Rev. {o.revision}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : loadingModelo ? (
          <div style={overlayStyle}>⏳ Buscando modelo 3D de la obra...</div>
        ) : modelo ? (
          <VisorSketchUp url={modelo.url} />
        ) : (
          <div style={overlayStyle}>
            Esta obra todavía no tiene un modelo 3D. Subí un .glb para verlo acá.
          </div>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#8a8f98",
  fontSize: 14,
  textAlign: "center",
  padding: 20,
};
