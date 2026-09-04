import React, { useState, useRef } from "react";
import VisorDWG from "./VisorDWG";

/**
 * Página para subir un .dxf (exportado directo desde el software CAD
 * original) y verlo en 3D interactivo.
 *
 * Agregar como ruta en tu router, ej.:
 *   <Route path="/visor-dwg" element={<VisorDWGPage />} />
 */
export default function VisorDWGPage({ token }) {
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".dxf")) {
      alert("El archivo debe ser .dxf (exportado directo desde el software CAD, no un .dwg convertido con otra herramienta).");
      return;
    }
    setFile(f);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0f1115" }}>
      <div style={{
        padding: "12px 20px", borderBottom: "1px solid #2a2e36",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <h2 style={{ color: "#fff", fontSize: 16, margin: 0, fontFamily: "system-ui, sans-serif" }}>
          Visor 3D de módulos
        </h2>
        <input
          ref={inputRef}
          type="file"
          accept=".dxf"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            background: "#2b6cb0", color: "#fff", border: "none", borderRadius: 6,
            padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "system-ui, sans-serif",
          }}
        >
          {file ? "Cambiar archivo" : "Subir .dxf"}
        </button>
        {file && (
          <span style={{ color: "#8a8f98", fontSize: 12, fontFamily: "system-ui, sans-serif" }}>
            {file.name}
          </span>
        )}
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        {file ? (
          <VisorDWG file={file} token={token} apiUrl={`${import.meta.env.VITE_API_URL}/api/dwg`} />
        ) : (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "100%", color: "#8a8f98", fontFamily: "system-ui, sans-serif", fontSize: 14,
          }}>
            Subí un archivo .dxf para ver el módulo en 3D
          </div>
        )}
      </div>
    </div>
  );
}
