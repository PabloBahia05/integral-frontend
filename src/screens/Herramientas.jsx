import { useState } from "react";
import RotarBPP from "./RotarBPP";
import RotarDXF from "./RotarDXF";

/**
 * Herramientas
 * ------------
 * Pantalla que se abre desde el botón del menú principal. Muestra dos
 * botones, "BPP" y "CAD", que llevan cada uno a su propia pantalla de
 * carga + rotación. Es autocontenida: no depende de react-router ni de
 * ningún otro componente de Integral fuera de RotarBPP.jsx y RotarDXF.jsx
 * (que van junto a este archivo).
 *
 * Props: onBack (opcional) → vuelve al panel principal de Integral.
 */
export default function Herramientas({ onBack }) {
  const [pantalla, setPantalla] = useState("menu"); // "menu" | "bpp" | "cad"

  if (pantalla === "bpp") {
    return <RotarBPP onVolver={() => setPantalla("menu")} />;
  }
  if (pantalla === "cad") {
    return <RotarDXF onVolver={() => setPantalla("menu")} />;
  }

  return (
    <div
      style={{
        minHeight: "100%",
        padding: "40px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "sans-serif",
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          style={{
            alignSelf: "flex-start",
            border: "none",
            background: "none",
            color: "#0a3a5c",
            fontSize: "14px",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          ‹ Volver
        </button>
      )}
      <h2 style={{ color: "#0a3a5c", marginBottom: "30px" }}>Herramientas de archivos</h2>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
        <BotonGrande titulo="BPP" subtitulo="Rotar programas .bpp (Biesse)" onClick={() => setPantalla("bpp")} />
        <BotonGrande titulo="CAD" subtitulo="Rotar planos .dxf" onClick={() => setPantalla("cad")} />
      </div>
    </div>
  );
}

function BotonGrande({ titulo, subtitulo, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "180px",
        padding: "24px 16px",
        borderRadius: "10px",
        border: "1.5px solid #b8d6ef",
        background: "#0a3a5c",
        color: "#fff",
        cursor: "pointer",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "22px", fontWeight: "bold" }}>{titulo}</div>
      <div style={{ fontSize: "12px", marginTop: "6px", opacity: 0.85 }}>{subtitulo}</div>
    </button>
  );
}
