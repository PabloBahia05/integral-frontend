import { useState, useRef } from "react";

/**
 * RotarDXF
 * --------
 * Pantalla para cargar un plano .dxf (ASCII), elegir el ángulo de
 * rotación (90°/180°/270°) y descargar el resultado.
 *
 * Entidades que SÍ se rotan (dentro de la sección ENTITIES únicamente,
 * nunca dentro de BLOCKS — la geometría interna de un bloque está en su
 * propio sistema de coordenadas y no debe tocarse):
 *   - LINE, POINT, CIRCLE, ARC, LWPOLYLINE, POLYLINE/VERTEX, TEXT, INSERT
 *   - Puntos: cualquier par de códigos de grupo 10-18 / 20-28 (X/Y) de esas
 *     entidades, siguiendo la convención estándar de DXF.
 *   - Ángulos: código 50 en TEXT/INSERT, y 50+51 en ARC (inicio/fin del
 *     arco), ajustados según el giro.
 *
 * Entidades que NO se rotan (se dejan intactas tal cual estaban, y se
 * avisan al usuario después de procesar el archivo): MTEXT, DIMENSION,
 * HATCH, SPLINE, ELLIPSE, SOLID, 3DFACE, LEADER, y cualquier otra no
 * listada arriba. Si tu DXF tiene geometría importante en alguna de
 * estas, el resultado va a quedar incompleto — avisá para sumar soporte.
 *
 * Se asume un dibujo plano, con extrusión Z = (0,0,1) (el caso normal
 * para planos de corte/perforado 2D). Un DXF con planos inclinados en 3D
 * no se procesa correctamente con esta lógica.
 *
 * Convención de giro: siempre horaria, igual que en RotarBPP. Como un
 * DXF no trae un "ancho/alto de panel" declarado, se usa el rectángulo
 * envolvente (bounding box) de todos los puntos de las entidades
 * soportadas como base para el giro, así el dibujo rotado queda dentro
 * de coordenadas positivas, igual que con el .bpp.
 */

const ANGULOS = [90, 180, 270];

const SOPORTADOS_PUNTO = new Set([
  "LINE", "POINT", "CIRCLE", "ARC", "LWPOLYLINE", "POLYLINE", "VERTEX", "TEXT", "INSERT",
]);
const SOPORTADOS_ANGULO_50 = new Set(["TEXT", "INSERT"]);
const SOPORTADOS_ANGULO_ARC = new Set(["ARC"]);

function formatearNumero(n) {
  let s = n.toFixed(6);
  s = s.replace(/0+$/, "").replace(/\.$/, "");
  if (s === "-0") s = "0";
  return s;
}

function parseDXF(texto) {
  const saltoLinea = texto.includes("\r\n") ? "\r\n" : "\n";
  const lineasCrudas = texto.split(saltoLinea);
  const registros = [];
  for (let i = 0; i + 1 < lineasCrudas.length; i += 2) {
    const code = parseInt(lineasCrudas[i].trim(), 10);
    const value = lineasCrudas[i + 1];
    registros.push({ code, value });
  }
  return { registros, saltoLinea };
}

function serializarDXF(registros, saltoLinea) {
  const partes = [];
  for (const r of registros) {
    partes.push(String(r.code));
    partes.push(r.value);
  }
  return partes.join(saltoLinea);
}

function rotarDXF(texto, angulo) {
  const { registros, saltoLinea } = parseDXF(texto);
  const esPuntoX = (code) => code >= 10 && code <= 18;

  // --- Paso 1: bounding box de los puntos a transformar ---
  let seccionActual = null;
  let entidadActual = null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const tiposNoRotados = new Set();

  for (let i = 0; i < registros.length; i++) {
    const r = registros[i];
    if (r.code === 0) {
      const v = r.value.trim();
      if (v === "SECTION") { seccionActual = "PENDIENTE"; entidadActual = null; continue; }
      if (v === "ENDSEC") { seccionActual = null; entidadActual = null; continue; }
      if (seccionActual === "ENTITIES") entidadActual = v;
      continue;
    }
    if (r.code === 2 && seccionActual === "PENDIENTE") { seccionActual = r.value.trim(); continue; }
    if (seccionActual !== "ENTITIES" || !entidadActual) continue;

    if (!SOPORTADOS_PUNTO.has(entidadActual)) {
      tiposNoRotados.add(entidadActual);
      continue;
    }
    if (esPuntoX(r.code) && registros[i + 1] && registros[i + 1].code === r.code + 10) {
      const x = parseFloat(r.value);
      const y = parseFloat(registros[i + 1].value);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!Number.isFinite(minX)) {
    throw new Error(
      "No se encontró geometría soportada (LINE/CIRCLE/ARC/LWPOLYLINE/TEXT/INSERT) dentro de la sección ENTITIES.",
    );
  }

  const W = maxX - minX;
  const H = maxY - minY;

  const transformarPunto = (x, y) => {
    const lx = x - minX;
    const ly = y - minY;
    if (angulo === 90) return [ly, W - lx];
    if (angulo === 270) return [H - ly, lx];
    return [W - lx, H - ly]; // 180
  };

  // --- Paso 2: transformar ---
  seccionActual = null;
  entidadActual = null;
  let puntosRotados = 0;
  const salida = registros.map((r) => ({ ...r }));

  for (let i = 0; i < salida.length; i++) {
    const r = salida[i];
    if (r.code === 0) {
      const v = r.value.trim();
      if (v === "SECTION") { seccionActual = "PENDIENTE"; entidadActual = null; continue; }
      if (v === "ENDSEC") { seccionActual = null; entidadActual = null; continue; }
      if (seccionActual === "ENTITIES") entidadActual = v;
      continue;
    }
    if (r.code === 2 && seccionActual === "PENDIENTE") { seccionActual = r.value.trim(); continue; }
    if (seccionActual !== "ENTITIES" || !entidadActual) continue;
    if (!SOPORTADOS_PUNTO.has(entidadActual)) continue;

    if (esPuntoX(r.code) && salida[i + 1] && salida[i + 1].code === r.code + 10) {
      const x = parseFloat(r.value);
      const y = parseFloat(salida[i + 1].value);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        const [nx, ny] = transformarPunto(x, y);
        r.value = formatearNumero(nx);
        salida[i + 1].value = formatearNumero(ny);
        puntosRotados++;
      }
      continue;
    }
    if (r.code === 50 && SOPORTADOS_ANGULO_50.has(entidadActual)) {
      const a = parseFloat(r.value);
      if (Number.isFinite(a)) r.value = formatearNumero(((a - angulo) % 360 + 360) % 360);
    }
    if ((r.code === 50 || r.code === 51) && SOPORTADOS_ANGULO_ARC.has(entidadActual)) {
      const a = parseFloat(r.value);
      if (Number.isFinite(a)) r.value = formatearNumero(((a - angulo) % 360 + 360) % 360);
    }
  }

  return {
    contenido: serializarDXF(salida, saltoLinea),
    puntosRotados,
    tiposNoRotados: [...tiposNoRotados],
  };
}

export default function RotarDXF({ onVolver }) {
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
    if (f && !f.name.toLowerCase().endsWith(".dxf")) {
      setError("El archivo debe tener extensión .dxf");
      setArchivo(null);
      return;
    }
    setArchivo(f || null);
  };

  const handleRotarYDescargar = async () => {
    if (!archivo) {
      setError("Elegí un archivo .dxf primero.");
      return;
    }
    setProcesando(true);
    setError("");
    setResultado(null);
    try {
      const texto = await archivo.text();
      const { contenido, puntosRotados, tiposNoRotados } = rotarDXF(texto, angulo);

      const blob = new Blob([contenido], { type: "application/dxf" });
      const url = URL.createObjectURL(blob);
      const nombreBase = archivo.name.replace(/\.dxf$/i, "");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nombreBase}_ROT${angulo}.dxf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setResultado({ puntosRotados, tiposNoRotados });
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
        style={{ border: "none", background: "none", color: "#0a3a5c", fontSize: "14px", cursor: "pointer", marginBottom: "20px" }}
      >
        ‹ Volver
      </button>

      <div style={{ maxWidth: "460px", margin: "0 auto" }}>
        <h2 style={{ color: "#0a3a5c", marginBottom: "8px" }}>Rotar archivo CAD (DXF)</h2>
        <p style={{ fontSize: "12px", color: "#666", marginTop: 0, marginBottom: "20px" }}>
          Rota líneas, círculos, arcos, polilíneas, textos e inserciones de bloque. No rota cotas
          (DIMENSION), MTEXT, hatch ni splines — si el archivo tiene alguna, se avisa después.
        </p>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "13px", marginBottom: "6px", color: "#333" }}>
            Archivo .dxf
          </label>
          <input ref={inputRef} type="file" accept=".dxf" onChange={handleArchivo} style={{ fontSize: "13px" }} />
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
          <div style={{ marginBottom: "14px", fontSize: "12.5px" }}>
            <div style={{ color: "#2e7d32" }}>
              Listo: se rotaron {resultado.puntosRotados} punto(s). Descarga iniciada.
            </div>
            {resultado.tiposNoRotados.length > 0 && (
              <div style={{ color: "#b8860b", marginTop: "6px" }}>
                Atención: el archivo tiene entidades de tipo{" "}
                {resultado.tiposNoRotados.join(", ")} que no se rotaron (no soportadas).
              </div>
            )}
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
