import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

// ── Escáner de código de barras ─────────────────────────────────────────
//
// Abre la cámara trasera del celular y decodifica en continuo hasta
// encontrar un código. Al primer resultado llama a `onDetected(texto)` y
// se cierra solo (el padre es quien decide qué hacer con el código).

export default function EscanerBarcode({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let detectado = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current,
        (result) => {
          if (detectado || !result) return;
          detectado = true;
          controlsRef.current?.stop();
          onDetected(result.getText());
        },
      )
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch((e) => {
        console.error("Error abriendo la cámara:", e);
        setError(
          "No se pudo acceder a la cámara. Revisá los permisos del navegador para este sitio.",
        );
      });

    return () => {
      controlsRef.current?.stop();
    };
  }, [onDetected]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,58,92,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "16px",
          width: "92%",
          maxWidth: "420px",
          boxShadow: "0 8px 30px rgba(10,58,92,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#0a3a5c",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            📷 Escaneá el código
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              lineHeight: 1,
              cursor: "pointer",
              color: "#8aabb8",
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {error ? (
          <p
            style={{
              fontSize: "13px",
              color: "#e57373",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {error}
          </p>
        ) : (
          <video
            ref={videoRef}
            muted
            playsInline
            style={{
              width: "100%",
              borderRadius: "4px",
              background: "#000",
            }}
          />
        )}

        <p
          style={{
            fontSize: "11px",
            color: "#8aabb8",
            fontFamily: "'Space Mono', monospace",
            marginTop: "10px",
            marginBottom: 0,
            textAlign: "center",
          }}
        >
          Apuntá la cámara al código de barras del ítem
        </p>
      </div>
    </div>
  );
}
