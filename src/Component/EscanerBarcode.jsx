import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

// ── Escáner de código de barras ─────────────────────────────────────────
//
// Abre la cámara trasera del celular y decodifica en continuo hasta
// encontrar un código. Al primer resultado llama a `onDetected(texto)` y
// se cierra solo (el padre es quien decide qué hacer con el código).
//
// En pantallas angostas (celular) la cámara ocupa toda la pantalla: el
// <video> llena el viewport con object-fit:cover y el título/botón de
// cerrar/texto de ayuda quedan flotando arriba y abajo, superpuestos.
// En desktop se mantiene como cuadro chico centrado.

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
        // Algunos celulares Android abren la cámara trasera con un lente
        // en zoom por defecto (gran angular/teleobjetivo). Si el
        // navegador expone el control de zoom, lo bajamos al mínimo.
        try {
          const stream = videoRef.current?.srcObject;
          const track = stream?.getVideoTracks?.()[0];
          const capacidades = track?.getCapabilities?.();
          if (capacidades && "zoom" in capacidades) {
            track
              .applyConstraints({
                advanced: [{ zoom: capacidades.zoom.min ?? 1 }],
              })
              .catch(() => {});
          }
        } catch {
          // Si el navegador no soporta el control de zoom, seguimos igual.
        }
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
    <>
      {/* Estilos que dependen del ancho de pantalla van acá porque los
          inline styles no soportan media queries. */}
      <style>{`
        .escaner-overlay {
          background: rgba(10,58,92,0.85);
        }
        .escaner-box {
          background: #fff;
          border-radius: 8px;
          padding: 16px;
          width: 92%;
          max-width: 420px;
          box-shadow: 0 8px 30px rgba(10,58,92,0.35);
        }
        .escaner-video {
          width: 100%;
          border-radius: 4px;
          background: #000;
        }
        @media (max-width: 640px) {
          .escaner-overlay {
            background: #000;
          }
          .escaner-box {
            width: 100%;
            max-width: 100%;
            height: 100%;
            border-radius: 0;
            padding: 0;
            box-shadow: none;
            position: relative;
          }
          .escaner-video {
            width: 100%;
            height: 100%;
            border-radius: 0;
            object-fit: cover;
          }
          .escaner-header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            margin: 0 !important;
            padding: 16px;
            background: linear-gradient(rgba(0,0,0,0.55), transparent);
            z-index: 1;
          }
          .escaner-header span {
            color: #fff !important;
          }
          .escaner-header button {
            color: #fff !important;
          }
          .escaner-footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            margin: 0 !important;
            padding: 16px;
            background: linear-gradient(transparent, rgba(0,0,0,0.55));
            z-index: 1;
          }
          .escaner-footer.escaner-footer {
            color: #fff !important;
          }
        }
      `}</style>

      <div
        onClick={onClose}
        className="escaner-overlay"
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
        }}
      >
        <div className="escaner-box" onClick={(e) => e.stopPropagation()}>
          <div
            className="escaner-header"
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
                fontSize: "26px",
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
                padding: "0 16px",
              }}
            >
              {error}
            </p>
          ) : (
            <video ref={videoRef} muted playsInline className="escaner-video" />
          )}

          <p
            className="escaner-footer"
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
    </>
  );
}
