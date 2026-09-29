import { useState, useRef } from "react";

/**
 * RotarBPP
 * --------
 * Pantalla completa (ya no un modal) para cargar un .bpp de Biesse,
 * elegir el ángulo de rotación (90°/180°/270°) y descargar el resultado.
 * Misma lógica de rotación ya probada byte a byte contra archivos reales
 * (FRENTEV.bpp), ahora integrada como pantalla dentro de Herramientas.jsx.
 *
 * Qué rota:
 *   - PAN=LPX / PAN=LPY (ancho/alto del panel).
 *   - Cada línea "@ BG" (taladro): campos X (índice 2) e Y (índice 3).
 *
 * Qué NO rota: cualquier otra operación del programa que no sea "@ BG"
 * (no se identificaron otras en los archivos vistos hasta ahora).
 *
 * Convención de giro: siempre horario.
 *   Con panel de ancho W (LPX) y alto H (LPY):
 *     90°  -> nuevo LPX=H, LPY=W ; (x,y) -> (y, W - x)
 *     180° -> LPX y LPY iguales  ; (x,y) -> (W - x, H - y)
 *     270° -> nuevo LPX=H, LPY=W ; (x,y) -> (H - y, x)
 *
 * Codificación: Latin-1 (ISO-8859-1), decodificada/recodificada byte a
 * byte para no corromper acentos u otros caracteres de comentarios.
 */

const ANGULOS = [90, 180, 270];

function decodificarLatin1(buffer) {
  return new TextDecoder("iso-8859-1").decode(buffer);
}

function codificarLatin1(texto) {
  const bytes = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) {
    bytes[i] = texto.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function formatearNumero(n) {
  let s = n.toFixed(6);
  s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

function formatearPanel(n) {
  return n.toFixed(6);
}

function rotarBPP(contenidoOriginal, angulo) {
  const saltoLinea = contenidoOriginal.includes("\r\n") ? "\r\n" : "\n";
  const lineas = contenidoOriginal.split(saltoLinea);

  const matchX = contenidoOriginal.match(/PAN=LPX\|([\d.]+)/);
  const matchY = contenidoOriginal.match(/PAN=LPY\|([\d.]+)/);
  if (!matchX || !matchY) {
    throw new Error(
      "No se encontraron PAN=LPX / PAN=LPY en el archivo. ¿Es un .bpp de panel válido?",
    );
  }
  const W = parseFloat(matchX[1]);
  const H = parseFloat(matchY[1]);

  const nuevoLPX = angulo === 180 ? W : H;
  const nuevoLPY = angulo === 180 ? H : W;

  const transformarPunto = (x, y) => {
    if (angulo === 90) return [y, W - x];
    if (angulo === 270) return [H - y, x];
    return [W - x, H - y]; // 180
  };

  let taladrosRotados = 0;

  const lineasNuevas = lineas.map((linea) => {
    if (linea.startsWith("PAN=LPX|")) {
      return linea.replace(/PAN=LPX\|[\d.]+/, `PAN=LPX|${formatearPanel(nuevoLPX)}`);
    }
    if (linea.startsWith("PAN=LPY|")) {
      return linea.replace(/PAN=LPY\|[\d.]+/, `PAN=LPY|${formatearPanel(nuevoLPY)}`);
    }
    if (linea.startsWith("@ BG,") && linea.includes(" : ")) {
      const idx = linea.indexOf(" : ");
      const cabecera = linea.slice(0, idx);
      const resto = linea.slice(idx + 3);
      const campos = resto.split(", ");
      const x = parseFloat(campos[2]);
      const y = parseFloat(campos[3]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        const [nx, ny] = transformarPunto(x, y);
        campos[2] = formatearNumero(nx);
        campos[3] = formatearNumero(ny);
        taladrosRotados++;
        return `${cabecera} : ${campos.join(", ")}`;
      }
    }
    return linea;
  });

  return {
    contenido: lineasNuevas.join(saltoLinea),
    taladrosRotados,
    panelOriginal: { W, H },
    panelNuevo: { LPX: nuevoLPX, LPY: nuevoLPY },
  };
}

export default function RotarBPP({ onVolver }) {
  const [archivo, setArchivo] = useState(null);
  const [angulo, setAngulo] = useState(90);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const inputRef = useRef(null);

  const handleArchivo = (e) => {
    const f = e.target.files?.[0];
    setError("");
    setResultado(null);
    if (f && !f.name.toLowerCase().endsWith(".bpp")) {
      setError("El archivo debe tener extensión .bpp");
      setArchivo(null);
      return;
    }
    setArchivo(f || null);
  };

  const handleRotarYDescargar = async () => {
    if (!archivo) {
      setError("Elegí un archivo .bpp primero.");
      return;
    }
    setProcesando(true);
    setError("");
    setResultado(null);
    try {
      const buffer = await archivo.arrayBuffer();
      const contenidoOriginal = decodificarLatin1(buffer);
      const { contenido, taladrosRotados, panelOriginal, panelNuevo } = rotarBPP(
        contenidoOriginal,
        angulo,
      );

      const bytesSalida = codificarLatin1(contenido);
      const blob = new Blob([bytesSalida], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);

      const nombreBase = archivo.name.replace(/\.bpp$/i, "");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nombreBase}_ROT${angulo}.bpp`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setResultado({ taladrosRotados, panelOriginal, panelNuevo });
    } catch (err) {
      setError(err.message || "No se pudo rotar el archivo.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div style={{ minHeight: "100%", padding: "30px 20px", fontFamily: "sans-serif" }}>
      <button
        onClick={onVolver}
        style={{
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

      <div style={{ maxWidth: "420px", margin: "0 auto" }}>
        <h2 style={{ color: "#0a3a5c", marginBottom: "20px" }}>Rotar archivo BPP</h2>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#333" }}>
            Archivo .bpp
          </label>
          <input ref={inputRef} type="file" accept=".bpp" onChange={handleArchivo} style={{ fontSize: "13px" }} />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#333" }}>
            Ángulo de rotación
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            {ANGULOS.map((a) => (
              <button
                key={a}
                onClick={() => setAngulo(a)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "6px",
                  border: `1.5px solid ${angulo === a ? "#0a3a5c" : "#b8d6ef"}`,
                  background: angulo === a ? "#0a3a5c" : "#fff",
                  color: angulo === a ? "#fff" : "#0a3a5c",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {a}°
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ marginBottom: "14px", color: "#c0392b", fontSize: "13px" }}>{error}</div>}

        {resultado && (
          <div style={{ marginBottom: "14px", fontSize: "12.5px", color: "#2e7d32" }}>
            Listo: se rotaron {resultado.taladrosRotados} taladro(s). Panel{" "}
            {resultado.panelOriginal.W}×{resultado.panelOriginal.H} mm → {resultado.panelNuevo.LPX}×
            {resultado.panelNuevo.LPY} mm. Descarga iniciada.
          </div>
        )}

        <button
          onClick={handleRotarYDescargar}
          disabled={!archivo || procesando}
          style={{
            padding: "10px 18px",
            borderRadius: "6px",
            border: "none",
            background: !archivo || procesando ? "#9db8c9" : "#0a3a5c",
            color: "#fff",
            cursor: !archivo || procesando ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: "bold",
          }}
        >
          {procesando ? "Rotando..." : "Rotar y descargar"}
        </button>
      </div>
    </div>
  );
}
