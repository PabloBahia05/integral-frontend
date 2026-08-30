import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

// ── Escáner de código de barras ─────────────────────────────────────────
//
// Abre la cámara trasera del celular y decodifica en continuo hasta
// encontrar un código. Al primer resultado llama a `onDetected(texto)` y
// se cierra solo (el padre es quien decide qué hacer con el código).
//
// El layout mobile vs desktop se resuelve por JS (useIsMobile), no con
// @media queries: cada estilo ya es el valor final para el dispositivo
// actual. En celular la cámara ocupa toda la pantalla, con object-fit:
// contain (nunca recorta) y pide un aspect ratio acorde a la pantalla
// real para minimizar el letterbox. Además, en vez de dejar que el
// navegador elija la lente trasera por `facingMode` (que en algunos
// Android termina siendo la teleobjetivo, con zoom óptico de fábrica),
// se enumeran las cámaras y se elige a mano la trasera que no sea
// "tele". En desktop se mantiene como cuadro chico centrado.

// Detecta celular vs escritorio por JavaScript (ancho real de pantalla),
// en vez de depender de @media queries en CSS.
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}

export default function EscanerBarcode({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let detectado = false;
    let cancelado = false;

    // En celulares con varias cámaras traseras (ancha, ultra-wide, tele),
    // pedir solo `facingMode: 'environment'` a veces hace que el
    // navegador elija la lente teleobjetivo (2x) en vez de la principal:
    // el video llega "zoomeado" desde el propio sensor, antes de que
    // cualquier CSS lo toque. Para evitar eso, primero se listan las
    // cámaras disponibles y se elige a mano la trasera que NO tenga
    // "tele"/"zoom" en el nombre (normalmente la principal/ancha).
    const elegirCamaraTrasera = async () => {
      try {
        const dispositivos = await navigator.mediaDevices.enumerateDevices();
        const camaras = dispositivos.filter((d) => d.kind === "videoinput");
        const traseras = camaras.filter(
          (d) => !/front|frontal|user/i.test(d.label),
        );
        const candidatas = traseras.length ? traseras : camaras;
        const principal = candidatas.find(
          (d) => !/tele|zoom/i.test(d.label),
        );
        return (principal || candidatas[0])?.deviceId || null;
      } catch {
        return null;
      }
    };

    const iniciar = async () => {
      // Primero se pide cualquier cámara trasera solo para conseguir
      // permiso: hasta que el usuario acepta, enumerateDevices() no
      // devuelve las etiquetas (label) de cada cámara, y sin etiqueta no
      // se puede saber cuál es la teleobjetivo.
      let deviceId = null;
      try {
        const previo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        previo.getTracks().forEach((t) => t.stop());
        deviceId = await elegirCamaraTrasera();
      } catch {
        // Si esto falla, se sigue igual con facingMode como respaldo.
      }

      if (cancelado) return;

      const aspectRatio =
        typeof window !== "undefined" && window.innerHeight
          ? { ideal: window.innerWidth / window.innerHeight }
          : undefined;

      reader
        .decodeFromConstraints(
          {
            video: deviceId
              ? {
                  deviceId: { exact: deviceId },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  aspectRatio,
                }
              : {
                  facingMode: { ideal: "environment" },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  aspectRatio,
                },
          },
          videoRef.current,
          (result) => {
            if (detectado || !result) return;
            detectado = true;
            controlsRef.current?.stop();
            onDetected(result.getText());
          },
        )
        .then((controls) => {
          if (cancelado) {
            controls.stop();
            return;
          }
          controlsRef.current = controls;
        })
        .catch((e) => {
          console.error("Error abriendo la cámara:", e);
          setError(
            "No se pudo acceder a la cámara. Revisá los permisos del navegador para este sitio.",
          );
        });
    };

    iniciar();

    return () => {
      cancelado = true;
      controlsRef.current?.stop();
    };
  }, [onDetected]);

  const isMobile = useIsMobile();

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        background: isMobile ? "#000" : "rgba(10,58,92,0.85)",
        padding: isMobile ? 0 : undefined,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: isMobile ? "#000" : "#fff",
          borderRadius: isMobile ? 0 : "8px",
          padding: isMobile ? 0 : "16px",
          width: isMobile ? "100vw" : "min(92vw, 520px)",
          height: isMobile ? "100dvh" : undefined,
          maxHeight: isMobile ? "none" : "90vh",
          boxShadow: isMobile ? "none" : "0 8px 30px rgba(10,58,92,0.35)",
          boxSizing: "border-box",
          overflow: "hidden",
          position: isMobile ? "relative" : "static",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: isMobile ? 0 : "12px",
            ...(isMobile
              ? {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  padding: "16px",
                  background:
                    "linear-gradient(rgba(0,0,0,0.55), transparent)",
                  zIndex: 1,
                }
              : {}),
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: isMobile ? "#fff" : "#0a3a5c",
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
              fontSize: isMobile ? "30px" : "26px",
              lineHeight: 1,
              cursor: "pointer",
              color: isMobile ? "#fff" : "#8aabb8",
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
          <video
            ref={videoRef}
            muted
            playsInline
            style={{
              display: "block",
              width: "100%",
              height: isMobile ? "100%" : undefined,
              maxWidth: "100%",
              maxHeight: isMobile ? "none" : "70vh",
              borderRadius: isMobile ? 0 : "4px",
              background: "#000",
              objectFit: "contain",
            }}
          />
        )}

        <p
          style={{
            fontSize: "11px",
            color: isMobile ? "#fff" : "#8aabb8",
            fontFamily: "'Space Mono', monospace",
            marginTop: isMobile ? 0 : "10px",
            marginBottom: 0,
            textAlign: "center",
            ...(isMobile
              ? {
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "16px",
                  background:
                    "linear-gradient(transparent, rgba(0,0,0,0.55))",
                  zIndex: 1,
                }
              : {}),
          }}
        >
          Apuntá la cámara al código de barras del ítem
        </p>
      </div>
    </div>
  );
}
