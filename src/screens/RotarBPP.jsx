import { useState, useRef, useMemo } from "react";
import VistaPrevia from "./VistaPrevia";

/**
 * RotarBPP
 * --------
 * Pantalla completa para cargar un .bpp de Biesse, elegir el ángulo de
 * rotación (90°/180°/270°) y descargar el resultado.
 *
 * Qué rota:
 *   - PAN=LPX / PAN=LPY (ancho/alto del panel).
 *   - Taladros verticales (cara superior): @ BV y @ BG -> campos X (2) e Y (3).
 *       En @ BV con repetición tipo 1 también rota el vector (campos 9 y 10).
 *   - Taladros laterales (canto): @ BH -> cambia el LADO (campo 0) y la
 *       coordenada a lo largo del canto (campo 2). El campo 3 (altura dentro
 *       del espesor) no cambia.
 *   - Las mismas operaciones comentadas (líneas que empiezan con "' ") se
 *       rotan igual, para que sigan siendo válidas si se descomentan.
 *
 * Expresiones: los campos pueden venir como fórmulas (LPX/2+9, LPY-40...).
 * Se evalúan con las dimensiones ORIGINALES del panel y se escriben como
 * número ya rotado.
 *
 * Numeración de lados de @ BH (vista desde arriba, origen abajo-izquierda):
 *   1 = izquierda (X=0)   <- deducido de un archivo real
 *   2 = inferior  (Y=0)   <- supuesto (antihorario)
 *   3 = derecha   (X=LPX)
 *   4 = superior  (Y=LPY)
 *   Coordenada a lo largo del canto = eje del panel (Y en 1/3, X en 2/4).
 *
 * Qué NO rota (se avisa en pantalla): cualquier otra operación "@ ..." y
 * repeticiones no contempladas.
 *
 * Convención de giro: siempre horario.
 *   Con panel de ancho W (LPX) y alto H (LPY):
 *     90°  -> nuevo LPX=H, LPY=W ; (x,y) -> (y, W - x)
 *     180° -> LPX y LPY iguales  ; (x,y) -> (W - x, H - y)
 *     270° -> nuevo LPX=H, LPY=W ; (x,y) -> (H - y, x)
 *
 * Codificación: Latin-1 (ISO-8859-1), byte a byte.
 */

const ANGULOS = [90, 180, 270];

// Lados de BH: número -> canto (L izq, B inferior, R der, T superior).
const LADOS = { 1: "L", 2: "B", 3: "R", 4: "T" };
const NUM_LADO = { L: 1, B: 2, R: 3, T: 4 };
// A qué canto pasa cada canto al girar en sentido horario.
const MAPA_LADO = {
  90: { L: "T", T: "R", R: "B", B: "L" },
  180: { L: "R", R: "L", B: "T", T: "B" },
  270: { L: "B", B: "R", R: "T", T: "L" },
};

const RE_OP = /^(@ |' )(BV|BH|BG),(.*?) : (.*)$/;

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
  if (s === "-0") s = "0";
  return s;
}

function formatearPanel(n) {
  return n.toFixed(6);
}

function leerPanel(contenido) {
  const mx = contenido.match(/PAN=LPX\|([\d.]+)/);
  const my = contenido.match(/PAN=LPY\|([\d.]+)/);
  if (!mx || !my) return null;
  const mz = contenido.match(/PAN=LPZ\|([\d.]+)/);
  return {
    W: parseFloat(mx[1]),
    H: parseFloat(my[1]),
    Z: mz ? parseFloat(mz[1]) : 0,
  };
}

// Evalúa un campo que puede ser número o fórmula (LPX/2+9, LPY-40...).
// Solo admite números, + - * / ( ) y las variables LPX, LPY, LPZ.
function evaluar(texto, panel) {
  if (texto === undefined || texto === null) return NaN;
  const s = String(texto).trim();
  if (!s) return NaN;
  if (!/^[-+*/().\dLPXYZ\s]+$/.test(s)) return NaN;
  const reemplazado = s
    .replace(/LPX/g, `(${panel.W})`)
    .replace(/LPY/g, `(${panel.H})`)
    .replace(/LPZ/g, `(${panel.Z})`);
  if (/[A-Za-z]/.test(reemplazado)) return NaN;
  try {
    const v = Function(`"use strict"; return (${reemplazado});`)();
    return Number.isFinite(v) ? v : NaN;
  } catch {
    return NaN;
  }
}

// Separa los campos por coma respetando las comillas.
function dividirCampos(resto) {
  const out = [];
  let cur = "";
  let enComillas = false;
  for (const ch of resto) {
    if (ch === '"') enComillas = !enComillas;
    if (ch === "," && !enComillas) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parsearOperacion(linea) {
  const m = linea.match(RE_OP);
  if (!m) return null;
  const [, prefijo, tipo, medio, resto] = m;
  return {
    original: linea,
    activa: prefijo === "@ ",
    tipo,
    cabecera: `${prefijo}${tipo},${medio}`,
    campos: dividirCampos(resto),
  };
}

// Punto (x,y) del panel donde el taladro lateral toca el canto.
function puntoEnBorde(lado, s, W, H) {
  if (lado === "L") return [0, s];
  if (lado === "R") return [W, s];
  if (lado === "B") return [s, 0];
  return [s, H]; // T
}

function rotarOperacion(op, ctx) {
  const { angulo, panel, transformarPunto, rotarVector } = ctx;
  const { campos } = op;
  const nuevos = [...campos];
  const avisos = [];
  const sinCambios = () => ({ linea: op.original, tipo: null, avisos });
  const final = (tipo) => ({
    linea: `${op.cabecera} : ${nuevos.join(", ")}`,
    tipo,
    avisos,
  });

  if (op.tipo === "BH") {
    const ladoNum = evaluar(campos[0], panel);
    const lado = LADOS[ladoNum];
    const s = evaluar(campos[2], panel);
    if (!lado || !Number.isFinite(s)) {
      avisos.push(
        `@ BH con lado o posición no interpretables (lado ${campos[0]}): no se rotó.`,
      );
      return sinCambios();
    }
    const rty = evaluar(campos[8], panel);
    if (rty !== -1 && rty !== 0) {
      avisos.push(
        "@ BH con repetición: se rotó el primer taladro pero no la repetición.",
      );
    }
    const [ex, ey] = puntoEnBorde(lado, s, panel.W, panel.H);
    const [nx, ny] = transformarPunto(ex, ey);
    const nuevoLado = MAPA_LADO[angulo][lado];
    const ns = nuevoLado === "L" || nuevoLado === "R" ? ny : nx;
    nuevos[0] = String(NUM_LADO[nuevoLado]);
    nuevos[2] = formatearNumero(ns);
    return final("lateral");
  }

  // BV / BG: cara superior
  const x = evaluar(campos[2], panel);
  const y = evaluar(campos[3], panel);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    avisos.push(
      `@ ${op.tipo} con X/Y no interpretables (${campos[2]}, ${campos[3]}): no se rotó.`,
    );
    return sinCambios();
  }
  const [nx, ny] = transformarPunto(x, y);
  nuevos[2] = formatearNumero(nx);
  nuevos[3] = formatearNumero(ny);

  if (op.tipo === "BV") {
    const rty = evaluar(campos[8], panel);
    if (rty === 1) {
      const dx = evaluar(campos[9], panel);
      const dy = evaluar(campos[10], panel);
      if (Number.isFinite(dx) && Number.isFinite(dy)) {
        const [ndx, ndy] = rotarVector(dx, dy);
        nuevos[9] = formatearNumero(ndx);
        nuevos[10] = formatearNumero(ndy);
      } else {
        avisos.push(
          "@ BV con repetición no interpretable: se rotó el primer taladro solamente.",
        );
      }
    } else if (rty !== -1 && rty !== 0) {
      avisos.push(
        `@ BV con repetición tipo ${campos[8]} no contemplada: se rotó el primer taladro solamente.`,
      );
    }
  }
  return final("vertical");
}

function rotarBPP(contenidoOriginal, angulo) {
  const saltoLinea = contenidoOriginal.includes("\r\n") ? "\r\n" : "\n";
  const lineas = contenidoOriginal.split(saltoLinea);

  const panel = leerPanel(contenidoOriginal);
  if (!panel) {
    throw new Error(
      "No se encontraron PAN=LPX / PAN=LPY en el archivo. ¿Es un .bpp de panel válido?",
    );
  }
  const { W, H } = panel;

  const nuevoLPX = angulo === 180 ? W : H;
  const nuevoLPY = angulo === 180 ? H : W;

  const transformarPunto = (x, y) => {
    if (angulo === 90) return [y, W - x];
    if (angulo === 270) return [H - y, x];
    return [W - x, H - y]; // 180
  };
  const rotarVector = (dx, dy) => {
    if (angulo === 90) return [dy, -dx];
    if (angulo === 270) return [-dy, dx];
    return [-dx, -dy]; // 180
  };
  const ctx = { angulo, panel, transformarPunto, rotarVector };

  let verticales = 0;
  let laterales = 0;
  const avisos = new Set();
  const desconocidas = {};

  const lineasNuevas = lineas.map((linea) => {
    if (linea.startsWith("PAN=LPX|")) {
      return linea.replace(
        /PAN=LPX\|[\d.]+/,
        `PAN=LPX|${formatearPanel(nuevoLPX)}`,
      );
    }
    if (linea.startsWith("PAN=LPY|")) {
      return linea.replace(
        /PAN=LPY\|[\d.]+/,
        `PAN=LPY|${formatearPanel(nuevoLPY)}`,
      );
    }
    const op = parsearOperacion(linea);
    if (op) {
      const r = rotarOperacion(op, ctx);
      if (op.activa) {
        r.avisos.forEach((a) => avisos.add(a));
        if (r.tipo === "vertical") verticales++;
        if (r.tipo === "lateral") laterales++;
      }
      return r.linea;
    }
    if (linea.startsWith("@ ")) {
      const tipo = linea.slice(2).split(",")[0].trim() || "?";
      desconocidas[tipo] = (desconocidas[tipo] || 0) + 1;
    }
    return linea;
  });

  for (const [tipo, n] of Object.entries(desconocidas)) {
    avisos.add(
      `Operación @ ${tipo} (${n}) no se rota: revisá el resultado en Biesse.`,
    );
  }

  return {
    contenido: lineasNuevas.join(saltoLinea),
    verticales,
    laterales,
    avisos: [...avisos],
    panelOriginal: { W, H },
    panelNuevo: { LPX: nuevoLPX, LPY: nuevoLPY },
  };
}

// Extrae del texto de un .bpp el panel y los taladros (verticales y
// laterales) para dibujarlos. Se usa con el original y con el rotado.
function extraerFormasBPP(contenido) {
  const panel = leerPanel(contenido);
  if (!panel) return { formas: [], detalle: "" };
  const { W, H } = panel;
  const radioMin = Math.max(3, Math.max(W, H) * 0.004);
  const formas = [{ t: "rect", x: 0, y: 0, w: W, h: H }];
  let nV = 0;
  let nL = 0;

  for (const linea of contenido.split(/\r?\n/)) {
    const op = parsearOperacion(linea);
    if (!op || !op.activa) continue;
    const { campos } = op;
    const dia = evaluar(campos[6], panel);
    const r = Number.isFinite(dia) ? Math.max(dia / 2, radioMin) : radioMin;

    if (op.tipo === "BH") {
      const lado = LADOS[evaluar(campos[0], panel)];
      const s = evaluar(campos[2], panel);
      if (!lado || !Number.isFinite(s)) continue;
      const prof = evaluar(campos[5], panel);
      const largo = Number.isFinite(prof) ? prof : radioMin * 4;
      const rr = Number.isFinite(dia) ? dia / 2 : radioMin;
      const [ex, ey] = puntoEnBorde(lado, s, W, H);
      const dir = { L: [1, 0], R: [-1, 0], B: [0, 1], T: [0, -1] }[lado];
      const perp = [Math.abs(dir[1]), Math.abs(dir[0])];
      const p1 = [ex + perp[0] * rr, ey + perp[1] * rr];
      const p2 = [ex - perp[0] * rr, ey - perp[1] * rr];
      const p3 = [p2[0] + dir[0] * largo, p2[1] + dir[1] * largo];
      const p4 = [p1[0] + dir[0] * largo, p1[1] + dir[1] * largo];
      formas.push({ t: "poly", pts: [p1, p2, p3, p4], cerrada: true });
      formas.push({
        t: "circle",
        cx: ex,
        cy: ey,
        r: Math.max(rr * 0.6, radioMin * 0.6),
        relleno: true,
      });
      nL++;
      continue;
    }

    const x = evaluar(campos[2], panel);
    const y = evaluar(campos[3], panel);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    formas.push({ t: "circle", cx: x, cy: y, r, relleno: true });
    nV++;
    if (op.tipo === "BV" && evaluar(campos[8], panel) === 1) {
      const dx = evaluar(campos[9], panel);
      const dy = evaluar(campos[10], panel);
      if (Number.isFinite(dx) && Number.isFinite(dy)) {
        formas.push({ t: "line", x1: x, y1: y, x2: x + dx, y2: y + dy });
        formas.push({ t: "circle", cx: x + dx, cy: y + dy, r, relleno: true });
      }
    }
  }
  return {
    formas,
    detalle: `Panel ${W}×${H} mm · ${nV} vertical(es) · ${nL} lateral(es)`,
  };
}

export default function RotarBPP({ onVolver }) {
  const [archivo, setArchivo] = useState(null);
  const [angulo, setAngulo] = useState(90);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [contenidoOriginal, setContenidoOriginal] = useState("");
  const inputRef = useRef(null);

  // Rotación en vivo (para la vista previa y para la descarga).
  const rotado = useMemo(() => {
    if (!contenidoOriginal) return null;
    try {
      return { ...rotarBPP(contenidoOriginal, angulo), error: null };
    } catch (err) {
      return { error: err.message || "No se pudo rotar el archivo." };
    }
  }, [contenidoOriginal, angulo]);

  const prevOriginal = useMemo(
    () => (contenidoOriginal ? extraerFormasBPP(contenidoOriginal) : null),
    [contenidoOriginal],
  );
  const prevRotado = useMemo(
    () => (rotado && !rotado.error ? extraerFormasBPP(rotado.contenido) : null),
    [rotado],
  );

  const handleArchivo = async (e) => {
    const f = e.target.files?.[0];
    setError("");
    setResultado(null);
    setContenidoOriginal("");
    if (f && !f.name.toLowerCase().endsWith(".bpp")) {
      setError("El archivo debe tener extensión .bpp");
      setArchivo(null);
      return;
    }
    setArchivo(f || null);
    if (f) {
      try {
        setContenidoOriginal(decodificarLatin1(await f.arrayBuffer()));
      } catch (err) {
        setError("No se pudo leer el archivo.");
      }
    }
  };

  const handleRotarYDescargar = () => {
    if (!archivo || !rotado) {
      setError("Elegí un archivo .bpp primero.");
      return;
    }
    if (rotado.error) {
      setError(rotado.error);
      return;
    }
    setProcesando(true);
    setError("");
    try {
      const { contenido, verticales, laterales, panelOriginal, panelNuevo } =
        rotado;
      const blob = new Blob([codificarLatin1(contenido)], {
        type: "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const nombreBase = archivo.name.replace(/\.bpp$/i, "");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nombreBase}_ROT${angulo}.bpp`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setResultado({ verticales, laterales, panelOriginal, panelNuevo });
    } catch (err) {
      setError(err.message || "No se pudo generar el archivo.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100%",
        padding: "30px 20px",
        fontFamily: "sans-serif",
      }}
    >
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

      <div style={{ maxWidth: "980px", margin: "0 auto" }}>
        <h2 style={{ color: "#0a3a5c", marginBottom: "20px" }}>
          Rotar archivo BPP
        </h2>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              marginBottom: "6px",
              color: "#333",
            }}
          >
            Archivo .bpp
          </label>
          <input
            ref={inputRef}
            type="file"
            accept=".bpp"
            onChange={handleArchivo}
            style={{ fontSize: "13px" }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              marginBottom: "6px",
              color: "#333",
            }}
          >
            Ángulo de rotación
          </label>
          <div style={{ display: "flex", gap: "8px", maxWidth: "420px" }}>
            {ANGULOS.map((a) => (
              <button
                key={a}
                onClick={() => {
                  setAngulo(a);
                  setResultado(null);
                }}
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

        {(error || rotado?.error) && (
          <div
            style={{ marginBottom: "14px", color: "#c0392b", fontSize: "13px" }}
          >
            {error || rotado.error}
          </div>
        )}

        {rotado?.avisos?.length > 0 && (
          <div
            style={{
              marginBottom: "14px",
              padding: "8px 12px",
              borderRadius: "6px",
              background: "#fff6e0",
              border: "1px solid #e6c56a",
              color: "#7a5a00",
              fontSize: "12.5px",
            }}
          >
            {rotado.avisos.map((a, i) => (
              <div key={i}>⚠ {a}</div>
            ))}
          </div>
        )}

        {resultado && (
          <div
            style={{
              marginBottom: "14px",
              fontSize: "12.5px",
              color: "#2e7d32",
            }}
          >
            Listo: se rotaron {resultado.verticales} taladro(s) vertical(es) y{" "}
            {resultado.laterales} lateral(es). Panel {resultado.panelOriginal.W}
            ×{resultado.panelOriginal.H} mm → {resultado.panelNuevo.LPX}×
            {resultado.panelNuevo.LPY} mm. Descarga iniciada.
          </div>
        )}

        {prevOriginal && (
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <VistaPrevia
              titulo="Original"
              detalle={prevOriginal.detalle}
              formas={prevOriginal.formas}
              origen={{ x: 0, y: 0 }}
              colorTitulo="#5f7f96"
            />
            <VistaPrevia
              titulo={`Generado (${angulo}° horario)`}
              detalle={prevRotado?.detalle}
              formas={prevRotado?.formas}
              origen={{ x: 0, y: 0 }}
              colorTitulo="#0a3a5c"
            />
          </div>
        )}

        <button
          onClick={handleRotarYDescargar}
          disabled={!archivo || procesando || !rotado || !!rotado.error}
          style={{
            padding: "10px 18px",
            borderRadius: "6px",
            border: "none",
            background:
              !archivo || procesando || !rotado || rotado.error
                ? "#9db8c9"
                : "#0a3a5c",
            color: "#fff",
            cursor:
              !archivo || procesando || !rotado || rotado.error
                ? "not-allowed"
                : "pointer",
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
