import { useState, useRef } from "react";

/**
 * DxfABpp
 * -------
 * Convierte en lote los .dxf de una carpeta a .bpp (Biesse). Los .bpp quedan
 * en la MISMA carpeta, con el mismo nombre que el .dxf.
 *
 * Cómo arma cada .bpp:
 *   - Panel: el rectángulo envolvente (bounding box) del CONTORNO del DXF
 *     (LINE, LWPOLYLINE, POLYLINE y puntos extremos de ARC). Esa esquina
 *     inferior-izquierda pasa a ser el origen (0,0). LPX = ancho, LPY = alto.
 *   - Taladros: cada CIRCLE del DXF pasa a un @ BV (taladro vertical) con
 *     X/Y absolutos desde abajo-izquierda (CRN = 2) y diámetro = 2 × radio.
 *     Se puede limitar a una capa (layer) concreta.
 *   - Todo lo demás (cabecera, variables PAN=..., herramienta, profundidad,
 *     pie del archivo) sale de un .bpp MODELO que se elige una vez: se
 *     toman sus líneas y se reemplazan solamente LPX / LPY (y LPZ si se
 *     indica espesor) y las operaciones @ BV / @ BH / @ BG. La primera
 *     @ BV activa del modelo se usa como molde de cada taladro.
 *
 * Campos de @ BV que se modifican (mismos índices que usa RotarBPP):
 *   1 = CRN ("2") · 2 = X · 3 = Y · 6 = diámetro · 8 = RTY (-1, sin repetición)
 *   · 14 = NRP (1). El resto (profundidad, herramienta, etc.) queda como en
 *   el modelo. El ID de cada taladro (4º campo de la cabecera) se incrementa.
 *
 * Qué NO se convierte (se avisa por archivo): cualquier entidad del DXF que
 * no sea contorno ni CIRCLE (INSERT, TEXT, MTEXT, DIMENSION, SPLINE, etc.).
 *
 * Requiere Chrome o Edge (File System Access API) para escribir en la carpeta.
 * Codificación de salida: Latin-1, igual que RotarBPP.
 */

const RE_OP = /^(@ |' )(BV|BH|BG),(.*?) : (.*)$/;
const CLAVE_MODELO = "integral_dxf2bpp_modelo";
const TIPOS_CONTORNO_O_AUX = new Set([
  "LINE", "LWPOLYLINE", "POLYLINE", "VERTEX", "SEQEND", "ARC", "CIRCLE",
]);

function decodificarLatin1(buffer) {
  return new TextDecoder("iso-8859-1").decode(buffer);
}

function codificarLatin1(texto) {
  const bytes = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i) & 0xff;
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

// Cambia el ID (4º campo de la cabecera) sumándole `i`.
function cabeceraConId(cabecera, i) {
  if (!i) return cabecera;
  return cabecera.replace(
    /^(.*?,\s*"[^"]*",\s*"[^"]*",\s*)(\d+)(.*)$/,
    (_, a, id, b) => `${a}${Number(id) + i}${b}`,
  );
}

/* ------------------------------ Modelo .bpp ------------------------------ */

// Analiza el .bpp modelo. Devuelve la cabecera/campos de la primera @ BV
// activa, las líneas que no son operaciones y dónde insertar las nuevas.
function analizarModelo(texto) {
  const salto = texto.includes("\r\n") ? "\r\n" : "\n";
  const lineas = texto.split(/\r?\n/);
  if (!/PAN=LPX\|/.test(texto) || !/PAN=LPY\|/.test(texto)) {
    throw new Error("El modelo no tiene PAN=LPX / PAN=LPY. ¿Es un .bpp de panel válido?");
  }

  const resto = [];
  let posInsercion = -1;
  let plantilla = null;
  let opsDescartadas = 0;

  for (const l of lineas) {
    const esOp = l.startsWith("@ ") || /^' (BV|BH|BG),/.test(l);
    if (!esOp) {
      resto.push(l);
      continue;
    }
    if (posInsercion < 0) posInsercion = resto.length;
    const m = l.match(RE_OP);
    if (!plantilla && m && m[1] === "@ " && m[2] === "BV") {
      plantilla = { cabecera: `${m[1]}${m[2]},${m[3]}`, campos: dividirCampos(m[4]) };
    } else {
      opsDescartadas++;
    }
  }

  if (!plantilla) {
    throw new Error(
      "El modelo no tiene ninguna operación @ BV activa (taladro vertical). Elegí un .bpp que tenga al menos un taladro vertical.",
    );
  }
  if (plantilla.campos.length < 7) {
    throw new Error("La @ BV del modelo tiene menos campos de los esperados; no se puede usar como molde.");
  }
  if (posInsercion < 0) posInsercion = resto.length;

  return { salto, resto, posInsercion, plantilla, opsDescartadas };
}

/* --------------------------------- DXF ---------------------------------- */

function leerDXF(texto, capa) {
  const lineas = texto.split(/\r?\n/);
  const registros = [];
  for (let i = 0; i + 1 < lineas.length; i += 2) {
    registros.push({ code: parseInt(lineas[i].trim(), 10), value: lineas[i + 1] });
  }

  const entidades = [];
  let seccion = null;
  let actual = null;
  for (const r of registros) {
    if (r.code === 0) {
      const v = r.value.trim();
      if (v === "SECTION") { seccion = "PENDIENTE"; actual = null; continue; }
      if (v === "ENDSEC") { seccion = null; actual = null; continue; }
      if (seccion === "ENTITIES") {
        actual = { tipo: v, datos: [] };
        entidades.push(actual);
      }
      continue;
    }
    if (r.code === 2 && seccion === "PENDIENTE") { seccion = r.value.trim(); continue; }
    if (seccion === "ENTITIES" && actual) actual.datos.push(r);
  }

  const num = (datos, code) => {
    const d = datos.find((x) => x.code === code);
    const n = d ? parseFloat(d.value) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const capaDe = (datos) => {
    const d = datos.find((x) => x.code === 8);
    return d ? d.value.trim() : "";
  };

  const puntos = []; // puntos del contorno
  const circulos = [];
  const ignorados = {};
  const rad = (g) => (g * Math.PI) / 180;

  for (const e of entidades) {
    const d = e.datos;
    if (e.tipo === "LINE") {
      const x1 = num(d, 10), y1 = num(d, 20), x2 = num(d, 11), y2 = num(d, 21);
      if (x1 !== null && y1 !== null) puntos.push([x1, y1]);
      if (x2 !== null && y2 !== null) puntos.push([x2, y2]);
    } else if (e.tipo === "LWPOLYLINE") {
      for (let i = 0; i < d.length; i++) {
        if (d[i].code === 10 && d[i + 1] && d[i + 1].code === 20) {
          const x = parseFloat(d[i].value);
          const y = parseFloat(d[i + 1].value);
          if (Number.isFinite(x) && Number.isFinite(y)) puntos.push([x, y]);
        }
      }
    } else if (e.tipo === "VERTEX") {
      const x = num(d, 10), y = num(d, 20);
      if (x !== null && y !== null) puntos.push([x, y]);
    } else if (e.tipo === "ARC") {
      const cx = num(d, 10), cy = num(d, 20), r = num(d, 40), a0 = num(d, 50), a1 = num(d, 51);
      if ([cx, cy, r, a0, a1].every((v) => v !== null)) {
        puntos.push([cx + r * Math.cos(rad(a0)), cy + r * Math.sin(rad(a0))]);
        puntos.push([cx + r * Math.cos(rad(a1)), cy + r * Math.sin(rad(a1))]);
      }
    } else if (e.tipo === "CIRCLE") {
      const cx = num(d, 10), cy = num(d, 20), r = num(d, 40);
      if (cx !== null && cy !== null && r !== null && r > 0) {
        if (!capa || capaDe(d) === capa) circulos.push({ cx, cy, d: r * 2 });
      }
    } else if (!TIPOS_CONTORNO_O_AUX.has(e.tipo)) {
      ignorados[e.tipo] = (ignorados[e.tipo] || 0) + 1;
    }
  }

  return { puntos, circulos, ignorados };
}

/* ------------------------------ Conversión ------------------------------ */

function generarBPP(modelo, dxf, espesor, capa) {
  const { puntos, circulos, ignorados } = dxf;
  if (!puntos.length) {
    throw new Error("El DXF no tiene contorno del panel (LINE / LWPOLYLINE / POLYLINE / ARC).");
  }
  if (!circulos.length) {
    throw new Error(
      capa
        ? `El DXF no tiene círculos (CIRCLE) en la capa "${capa}".`
        : "El DXF no tiene círculos (CIRCLE) para convertir en taladros.",
    );
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of puntos) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const W = maxX - minX;
  const H = maxY - minY;
  if (W <= 0 || H <= 0) throw new Error("El contorno del DXF tiene ancho o alto igual a cero.");

  const avisos = [];
  const tol = 0.01;
  const dentro = circulos.filter(
    (c) => c.cx >= minX - tol && c.cx <= maxX + tol && c.cy >= minY - tol && c.cy <= maxY + tol,
  );
  const fuera = circulos.length - dentro.length;
  if (fuera > 0) avisos.push(`${fuera} círculo(s) quedaron fuera del contorno y no se convirtieron.`);
  if (!dentro.length) throw new Error("Ningún círculo cae dentro del contorno del panel.");

  const tiposIgn = Object.entries(ignorados);
  if (tiposIgn.length) {
    avisos.push(
      `Entidades no convertidas: ${tiposIgn.map(([t, n]) => `${t} (${n})`).join(", ")}.`,
    );
  }

  const { salto, resto, posInsercion, plantilla } = modelo;
  const lineas = resto.map((l) => {
    if (l.startsWith("PAN=LPX|")) return l.replace(/PAN=LPX\|[^|]*/, `PAN=LPX|${formatearPanel(W)}`);
    if (l.startsWith("PAN=LPY|")) return l.replace(/PAN=LPY\|[^|]*/, `PAN=LPY|${formatearPanel(H)}`);
    if (espesor && l.startsWith("PAN=LPZ|")) {
      return l.replace(/PAN=LPZ\|[^|]*/, `PAN=LPZ|${formatearPanel(espesor)}`);
    }
    return l;
  });

  const ops = dentro.map((c, i) => {
    const campos = [...plantilla.campos];
    campos[1] = '"2"';
    campos[2] = formatearNumero(c.cx - minX);
    campos[3] = formatearNumero(c.cy - minY);
    campos[6] = formatearNumero(c.d);
    if (campos[8] !== undefined) campos[8] = "-1";
    if (campos[14] !== undefined) campos[14] = "1";
    return `${cabeceraConId(plantilla.cabecera, i)} : ${campos.join(", ")}`;
  });

  lineas.splice(posInsercion, 0, ...ops);

  return {
    contenido: lineas.join(salto),
    W,
    H,
    cantidad: ops.length,
    avisos,
  };
}

/* ---- UI ---- */

function cargarModeloGuardado() {
  try {
    const s = localStorage.getItem(CLAVE_MODELO);
    if (!s) return null;
    const { nombre, texto } = JSON.parse(s);
    return { nombre, texto, analizado: analizarModelo(texto) };
  } catch {
    return null;
  }
}

const COLORES_ESTADO = { ok: "#2e7d32", error: "#c0392b", salteado: "#b8860b" };

export default function DxfABpp({ onVolver }) {
  const [modelo, setModelo] = useState(cargarModeloGuardado);
  const [carpeta, setCarpeta] = useState("");
  const [capa, setCapa] = useState("");
  const [espesor, setEspesor] = useState("");
  const [pisar, setPisar] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [log, setLog] = useState([]);
  const dirRef = useRef(null);

  const soportado = typeof window !== "undefined" && "showDirectoryPicker" in window;

  const handleModelo = async (e) => {
    const f = e.target.files?.[0];
    setError("");
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".bpp")) {
      setError("El modelo debe tener extensión .bpp");
      return;
    }
    try {
      const texto = decodificarLatin1(await f.arrayBuffer());
      const analizado = analizarModelo(texto);
      setModelo({ nombre: f.name, texto, analizado });
      try {
        localStorage.setItem(CLAVE_MODELO, JSON.stringify({ nombre: f.name, texto }));
      } catch {
        /* sin almacenamiento: queda solo para esta sesión */
      }
    } catch (err) {
      setError(err.message || "No se pudo leer el modelo.");
    }
  };

  const handleElegirCarpeta = async () => {
    setError("");
    try {
      const h = await window.showDirectoryPicker({ mode: "readwrite" });
      dirRef.current = h;
      setCarpeta(h.name);
      setLog([]);
    } catch (err) {
      if (err?.name !== "AbortError") setError("No se pudo abrir la carpeta.");
    }
  };

  const handleConvertir = async () => {
    setError("");
    setLog([]);
    const dir = dirRef.current;
    if (!modelo) { setError("Elegí primero el .bpp modelo."); return; }
    if (!dir) { setError("Elegí primero la carpeta con los .dxf."); return; }

    setProcesando(true);
    const filas = [];
    try {
      const dxfs = [];
      for await (const [nombre, h] of dir.entries()) {
        if (h.kind === "file" && /\.dxf$/i.test(nombre)) dxfs.push([nombre, h]);
      }
      dxfs.sort((a, b) => a[0].localeCompare(b[0]));
      if (!dxfs.length) {
        setError("La carpeta no tiene archivos .dxf.");
        return;
      }

      const esp = parseFloat(String(espesor).replace(",", "."));
      const espesorOk = Number.isFinite(esp) && esp > 0 ? esp : null;
      const capaLimpia = capa.trim();

      for (const [nombre, h] of dxfs) {
        const nombreBpp = nombre.replace(/\.dxf$/i, "") + ".bpp";
        try {
          if (!pisar) {
            let existe = false;
            try {
              await dir.getFileHandle(nombreBpp);
              existe = true;
            } catch {
              existe = false;
            }
            if (existe) {
              filas.push({ nombre, estado: "salteado", detalle: `${nombreBpp} ya existe` });
              setLog([...filas]);
              continue;
            }
          }
          const texto = await (await h.getFile()).text();
          const dxf = leerDXF(texto, capaLimpia);
          const r = generarBPP(modelo.analizado, dxf, espesorOk, capaLimpia);
          const fh = await dir.getFileHandle(nombreBpp, { create: true });
          const w = await fh.createWritable();
          await w.write(codificarLatin1(r.contenido));
          await w.close();
          filas.push({
            nombre,
            estado: "ok",
            detalle: `${nombreBpp} · panel ${formatearNumero(r.W)}×${formatearNumero(r.H)} mm · ${r.cantidad} taladro(s)`,
            avisos: r.avisos,
          });
        } catch (err) {
          filas.push({ nombre, estado: "error", detalle: err.message || String(err) });
        }
        setLog([...filas]);
      }
    } catch (err) {
      setError(err.message || "No se pudo recorrer la carpeta.");
    } finally {
      setProcesando(false);
    }
  };

  const etiqueta = { display: "block", fontSize: "13px", marginBottom: "6px", color: "#333" };
  const campo = {
    padding: "7px 10px",
    borderRadius: "6px",
    border: "1.5px solid #b8d6ef",
    fontSize: "13px",
    width: "100%",
    boxSizing: "border-box",
  };
  const botonSec = {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "1.5px solid #0a3a5c",
    background: "#fff",
    color: "#0a3a5c",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
  };
  const bloqueado = procesando || !modelo || !carpeta;

  const resumen = log.length
    ? {
        ok: log.filter((f) => f.estado === "ok").length,
        error: log.filter((f) => f.estado === "error").length,
        salteado: log.filter((f) => f.estado === "salteado").length,
      }
    : null;

  return (
    <div style={{ minHeight: "100%", padding: "30px 20px", fontFamily: "sans-serif" }}>
      <button
        onClick={onVolver}
        style={{ border: "none", background: "none", color: "#0a3a5c", fontSize: "14px", cursor: "pointer", marginBottom: "20px" }}
      >
        ‹ Volver
      </button>

      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <h2 style={{ color: "#0a3a5c", marginBottom: "8px" }}>Convertir DXF a BPP</h2>
        <p style={{ fontSize: "12px", color: "#666", marginTop: 0, marginBottom: "20px", maxWidth: "560px" }}>
          Elegís una carpeta con archivos .dxf y los .bpp se guardan en esa misma carpeta, con el mismo
          nombre. El panel sale del contorno del DXF y cada círculo se convierte en un taladro vertical.
        </p>

        {!soportado && (
          <div style={{ marginBottom: "14px", color: "#c0392b", fontSize: "13px" }}>
            Este navegador no permite escribir en carpetas. Abrí Integral en Chrome o Edge.
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <label style={etiqueta}>1. Archivo .bpp modelo</label>
          <input type="file" accept=".bpp" onChange={handleModelo} style={{ fontSize: "13px" }} />
          <div style={{ fontSize: "12px", color: "#555", marginTop: "6px" }}>
            {modelo ? (
              <>
                Modelo actual: <b>{modelo.nombre}</b>. Se queda guardado en este navegador.
                {modelo.analizado.opsDescartadas > 0 && (
                  <span style={{ color: "#b8860b" }}>
                    {" "}
                    Sus otras {modelo.analizado.opsDescartadas} operación(es) no se copian.
                  </span>
                )}
              </>
            ) : (
              "Elegí un .bpp que tenga al menos un taladro vertical (@ BV): de ahí se toma la cabecera, la herramienta y la profundidad."
            )}
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={etiqueta}>2. Carpeta con los .dxf</label>
          <button onClick={handleElegirCarpeta} disabled={!soportado || procesando} style={botonSec}>
            {carpeta ? "Cambiar carpeta" : "Elegir carpeta"}
          </button>
          {carpeta && (
            <span style={{ fontSize: "12.5px", color: "#333", marginLeft: "10px" }}>
              Carpeta: <b>{carpeta}</b>
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
          <div style={{ flex: "1 1 220px" }}>
            <label style={etiqueta}>Capa de los taladros (opcional)</label>
            <input
              type="text"
              value={capa}
              onChange={(e) => setCapa(e.target.value)}
              placeholder="Vacío = todos los círculos"
              style={campo}
            />
          </div>
          <div style={{ flex: "1 1 220px" }}>
            <label style={etiqueta}>Espesor del panel en mm (opcional)</label>
            <input
              type="text"
              value={espesor}
              onChange={(e) => setEspesor(e.target.value)}
              placeholder="Vacío = el del modelo"
              style={campo}
            />
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#333", marginBottom: "18px" }}>
          <input type="checkbox" checked={pisar} onChange={(e) => setPisar(e.target.checked)} />
          Pisar los .bpp que ya existan en la carpeta
        </label>

        {error && <div style={{ marginBottom: "14px", color: "#c0392b", fontSize: "13px" }}>{error}</div>}

        <button
          onClick={handleConvertir}
          disabled={bloqueado || !soportado}
          style={{
            padding: "10px 18px",
            borderRadius: "6px",
            border: "none",
            background: bloqueado || !soportado ? "#9db8c9" : "#0a3a5c",
            color: "#fff",
            cursor: bloqueado || !soportado ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: "bold",
          }}
        >
          {procesando ? "Convirtiendo..." : "Convertir carpeta"}
        </button>

        {resumen && !procesando && (
          <div style={{ marginTop: "18px", fontSize: "13px", color: "#0a3a5c", fontWeight: "bold" }}>
            Convertidos: {resumen.ok}
            {resumen.error > 0 && ` · Con error: ${resumen.error}`}
            {resumen.salteado > 0 && ` · Salteados: ${resumen.salteado}`}
          </div>
        )}

        {log.length > 0 && (
          <div style={{ marginTop: "10px", border: "1.5px solid #b8d6ef", borderRadius: "8px", background: "#fff" }}>
            {log.map((f, i) => (
              <div
                key={f.nombre}
                style={{
                  padding: "8px 12px",
                  borderTop: i ? "1px solid #e3eef8" : "none",
                  fontSize: "12.5px",
                }}
              >
                <div>
                  <b style={{ color: COLORES_ESTADO[f.estado] }}>
                    {f.estado === "ok" ? "Listo" : f.estado === "error" ? "Error" : "Salteado"}
                  </b>{" "}
                  <span style={{ color: "#333" }}>{f.nombre}</span>
                </div>
                <div style={{ color: "#555", marginTop: "2px" }}>{f.detalle}</div>
                {f.avisos?.map((a, j) => (
                  <div key={j} style={{ color: "#b8860b", marginTop: "2px" }}>
                    ⚠ {a}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
