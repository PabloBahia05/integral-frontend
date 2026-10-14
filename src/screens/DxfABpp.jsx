import { useState, useRef } from "react";

/**
 * DxfABpp
 * -------
 * Convierte en lote los .dxf de una carpeta a .bpp (Biesse). Los .bpp quedan
 * en la MISMA carpeta, con el mismo nombre que el .dxf.
 *
 * Reglas (sacadas de los DXF/BPP reales de TV22; la capa del DXF ES el
 * nombre de la herramienta del .bpp):
 *
 *   Capa de herramienta: TCHW<cara>B<n>D<cccc>[TTY0]
 *     - <cccc> / 100 = profundidad (verticales) o altura dentro del espesor
 *       (laterales). Ej.: D1200 -> 12 · D1250 -> 12.5 · D0900 -> 9.
 *     - El nombre completo de la capa se escribe como herramienta del BG.
 *
 *   Panel (LPX/LPY): rectángulo envolvente del contorno, que es la
 *     LWPOLYLINE más grande del DXF (capa TCHW0B8D1800 -> 18 mm, TCHW0B8D2500
 *     -> 25 mm). Su esquina inferior-izquierda pasa a ser (0,0).
 *     Espesor (LPZ): <cccc>/100 de la capa del contorno, o el valor que se
 *     escriba en la pantalla.
 *
 *   Verticales (cara 0): cada CIRCLE -> @ BG cara 0, X/Y desde abajo-izq.,
 *     diámetro = 2 x radio, profundidad = código de su capa (salvo los
 *     diámetros de PROFUNDIDAD_POR_DIAMETRO, que usan su valor fijo).
 *
 *   Laterales (caras 1 y 3): cada rectángulo (LWPOLYLINE de 4 puntos) pegado
 *     al borde izquierdo (cara 1) o derecho (cara 3) -> @ BG con
 *       diámetro = ancho del rectángulo (lado paralelo al borde),
 *       profundidad = largo del rectángulo (hacia adentro del panel),
 *       posición = centro del rectángulo a lo largo del borde (Y),
 *       altura = código de su capa.
 *     Rectángulos pegados al borde inferior/superior (caras 2/4) no se
 *     convierten porque no hay un .bpp real para verificarlos: se avisa.
 *
 *   No se convierte (se avisa por archivo): círculos fuera del contorno,
 *   círculos en capas que no son de herramienta, polilíneas que no son
 *   contorno ni laterales, y cualquier otra entidad (INSERT, ARC, etc.).
 *   Los TEXT se ignoran (son solo el rótulo de la pieza).
 *
 * La cabecera, las variables PAN=... y el pie del .bpp son los mismos de
 * los .bpp reales (idénticos en los 7 archivos de TV22), salvo LPX/LPY/LPZ.
 *
 * Requiere Chrome o Edge (File System Access API) para escribir en la
 * carpeta. Salida en Latin-1 con fin de línea CRLF, igual que Biesse.
 */

// ---- Cabecera / pie del .bpp (idénticos en los .bpp reales) ----------------

const BPP_CABECERA = [
  "[HEADER]", "TYPE=BPP", "VER=150", "", "[DESCRIPTION]", "|", "", "[VARIABLES]",
];

const BPP_VARIABLES_RESTO = [
  'PAN=ORLST|"5"||3|',
  "PAN=SIMMETRY|1||1|",
  "PAN=TLCHK|0||1|",
  'PAN=TOOLING|""||3|',
  'PAN=CUSTSTR|$B$KBsExportToNc.XncExtraPanelData$V""||3|',
  "PAN=FCN|1.000000||2|",
  "PAN=XCUT|0||4|",
  "PAN=YCUT|0||4|",
  "PAN=JIGTH|0||4|",
  "PAN=CKOP|0||1|",
  "PAN=UNIQUE|0||1|",
  'PAN=MATERIAL|"wood"||3|',
  'PAN=PUTLST|""||3|',
  "PAN=OPPWKRS|0||1|",
  "PAN=UNICLAMP|0||1|",
  "PAN=CHKCOLL|0||1|",
  "PAN=WTPIANI|0||1|",
  "PAN=COLLTOOL|0||1|",
  "PAN=CALCEDTH|0||1|",
  "PAN=ENABLELABEL|0||1|",
  "PAN=LOCKWASTE|0||1|",
  "PAN=LOADEDGEOPT|0||1|",
  "PAN=ITLTYPE|0||1|",
  "PAN=RUNPAV|0||1|",
  "PAN=FLIPEND|0||1|",
  "",
  "[PROGRAM]",
  "",
];

const BPP_PIE = [
  "", "[VBSCRIPT]", "", "[MACRODATA]", "", "[TDCODES]", "", "[PCF]", "",
  "[TOOLING]", "", "[SUBPROGS]", "", "",
];

const ESPESOR_POR_DEFECTO = 18;

// Profundidad fija por diámetro de taladro vertical (mm). Si el diámetro está
// acá, se usa este valor en vez del código de la capa. Hoy: los de 15 mm van
// a 14.5 (como en BASEI, LATD y FAJA1), aunque su capa diga D1250 (12.5).
// Para que se guíe solo por la capa, dejá el objeto vacío: {}.
const PROFUNDIDAD_POR_DIAMETRO = { 15: 14.5 };
const SALTO = "\r\n";
const TOL = 0.05; // mm, para decidir si algo está pegado al borde

// Capa de herramienta: TCHW<cara>B<n>D<cccc>...
const RE_CAPA_HERRAMIENTA = /^TCHW(\d)B\d+D(\d{4})/;

function codigoDeCapa(capa) {
  const m = RE_CAPA_HERRAMIENTA.exec(capa || "");
  return m ? parseInt(m[2], 10) / 100 : null;
}

// ---- Utilidades -------------------------------------------------------------

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

// ---- Lectura del DXF --------------------------------------------------------

function leerDXF(texto) {
  const lineas = texto.split(/\r?\n/);
  const registros = [];
  for (let i = 0; i + 1 < lineas.length; i += 2) {
    registros.push({ code: parseInt(lineas[i].trim(), 10), value: lineas[i + 1].trim() });
  }

  const entidades = [];
  let seccion = null;
  let actual = null;
  for (const r of registros) {
    if (r.code === 0) {
      if (r.value === "SECTION") { seccion = "PENDIENTE"; actual = null; continue; }
      if (r.value === "ENDSEC") { seccion = null; actual = null; continue; }
      if (seccion === "ENTITIES") {
        actual = { tipo: r.value, datos: [] };
        entidades.push(actual);
      }
      continue;
    }
    if (r.code === 2 && seccion === "PENDIENTE") { seccion = r.value; continue; }
    if (seccion === "ENTITIES" && actual) actual.datos.push(r);
  }

  const num = (datos, code) => {
    const d = datos.find((x) => x.code === code);
    const n = d ? parseFloat(d.value) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const capaDe = (datos) => {
    const d = datos.find((x) => x.code === 8);
    return d ? d.value : "";
  };

  const polilineas = [];
  const circulos = [];
  const ignorados = {};

  for (const e of entidades) {
    const d = e.datos;
    if (e.tipo === "LWPOLYLINE") {
      const pts = [];
      for (let i = 0; i < d.length; i++) {
        if (d[i].code === 10 && d[i + 1] && d[i + 1].code === 20) {
          const x = parseFloat(d[i].value);
          const y = parseFloat(d[i + 1].value);
          if (Number.isFinite(x) && Number.isFinite(y)) pts.push([x, y]);
        }
      }
      if (pts.length) {
        polilineas.push({ capa: capaDe(d), pts, cerrada: ((num(d, 70) || 0) & 1) === 1 });
      }
    } else if (e.tipo === "CIRCLE") {
      const cx = num(d, 10), cy = num(d, 20), r = num(d, 40);
      if (cx !== null && cy !== null && r !== null && r > 0) {
        circulos.push({ capa: capaDe(d), cx, cy, dia: r * 2 });
      }
    } else if (e.tipo !== "TEXT") {
      ignorados[e.tipo] = (ignorados[e.tipo] || 0) + 1;
    }
  }

  return { polilineas, circulos, ignorados };
}

// ---- Conversión -------------------------------------------------------------

function bboxDe(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function lineaBG({ id, cara, x, y, prof, dia, herramienta, n }) {
  const campos = [
    cara, '"2"', formatearNumero(x), formatearNumero(y), 0,
    formatearNumero(prof), formatearNumero(dia),
    0, -1, 32, 32, 50, 0, 45, 0, '""', 1,
    0, 0, 0, 0, 0, 0, 0, 0, 1,
    0, 0, 0, 0, 0, -1, `"P${1000 + n}"`, 0, '""', '""',
    0, 0, 0, 0, 0, '""', 0, 0, 0, 0, 0, '""', '""', `"${herramienta}"`, 0,
  ];
  return `@ BG, "", "", ${id}, "", 0 : ${campos.join(", ")}`;
}

function convertirDXF(dxf, espesorManual) {
  const { polilineas, circulos, ignorados } = dxf;
  if (!polilineas.length) {
    throw new Error("El DXF no tiene contorno del panel (LWPOLYLINE).");
  }

  // Contorno = la polilínea de mayor área.
  let contorno = null;
  let mejor = -1;
  for (const p of polilineas) {
    const b = bboxDe(p.pts);
    const area = (b.maxX - b.minX) * (b.maxY - b.minY);
    if (area > mejor) { mejor = area; contorno = { ...p, b }; }
  }
  const { minX, minY, maxX, maxY } = contorno.b;
  const W = maxX - minX;
  const H = maxY - minY;
  if (W <= 0 || H <= 0) throw new Error("El contorno del DXF tiene ancho o alto igual a cero.");

  const avisos = [];
  const ops = [];

  let espesor = espesorManual;
  if (!espesor) {
    espesor = codigoDeCapa(contorno.capa) || ESPESOR_POR_DEFECTO;
    if (!codigoDeCapa(contorno.capa)) {
      avisos.push(
        `La capa del contorno (${contorno.capa || "sin capa"}) no indica el espesor: se usó ${ESPESOR_POR_DEFECTO} mm.`,
      );
    }
  }

  // Laterales: rectángulos pegados a los bordes izquierdo / derecho.
  let polisSueltas = 0;
  let ladosNoSoportados = 0;
  const laterales = [];
  for (const p of polilineas) {
    if (p === contorno || p.pts === contorno.pts) continue;
    const b = bboxDe(p.pts);
    const a0 = b.minX - minX, a1 = b.maxX - minX;
    const b0 = b.minY - minY, b1 = b.maxY - minY;
    const esRect = p.cerrada && p.pts.length === 4;
    const pegadoIzq = Math.abs(a0) < TOL;
    const pegadoDer = Math.abs(a1 - W) < TOL;
    const pegadoInf = Math.abs(b0) < TOL;
    const pegadoSup = Math.abs(b1 - H) < TOL;
    if (!esRect || !(pegadoIzq || pegadoDer || pegadoInf || pegadoSup)) {
      polisSueltas++;
      continue;
    }
    if ((pegadoIzq || pegadoDer) && !(pegadoInf || pegadoSup)) {
      const alturaZ = codigoDeCapa(p.capa);
      if (alturaZ === null) {
        avisos.push(`Un lateral está en la capa "${p.capa}", que no es de herramienta: no se convirtió.`);
        continue;
      }
      laterales.push({
        cara: pegadoIzq ? 1 : 3,
        x: (b0 + b1) / 2, // posición a lo largo del borde
        y: alturaZ,
        prof: a1 - a0,
        dia: b1 - b0,
        herramienta: p.capa,
      });
    } else {
      ladosNoSoportados++;
    }
  }
  if (polisSueltas) {
    avisos.push(`${polisSueltas} polilínea(s) que no son contorno ni laterales no se convirtieron.`);
  }
  if (ladosNoSoportados) {
    avisos.push(
      `${ladosNoSoportados} taladro(s) en el borde inferior/superior no se convirtieron (lados 2 y 4 sin verificar).`,
    );
  }

  // Verticales: círculos dentro del contorno.
  const verticales = [];
  let fuera = 0;
  let sinHerramienta = 0;
  for (const c of circulos) {
    const x = c.cx - minX;
    const y = c.cy - minY;
    if (x < -TOL || x > W + TOL || y < -TOL || y > H + TOL) { fuera++; continue; }
    const profCapa = codigoDeCapa(c.capa);
    if (profCapa === null) { sinHerramienta++; continue; }
    const prof = PROFUNDIDAD_POR_DIAMETRO[formatearNumero(c.dia)] ?? profCapa;
    verticales.push({ cara: 0, x, y, prof, dia: c.dia, herramienta: c.capa });
  }
  if (fuera) avisos.push(`${fuera} círculo(s) fuera del contorno no se convirtieron.`);
  if (sinHerramienta) {
    avisos.push(`${sinHerramienta} círculo(s) en capas que no son de herramienta no se convirtieron.`);
  }

  ops.push(...verticales, ...laterales);
  if (!ops.length) {
    throw new Error("No hay taladros para convertir (círculos o rectángulos laterales válidos).");
  }

  const tiposIgn = Object.entries(ignorados);
  if (tiposIgn.length) {
    avisos.push(`Entidades no convertidas: ${tiposIgn.map(([t, n]) => `${t} (${n})`).join(", ")}.`);
  }

  const lineas = [
    ...BPP_CABECERA,
    `PAN=LPX|${formatearPanel(W)}||4|`,
    `PAN=LPY|${formatearPanel(H)}||4|`,
    `PAN=LPZ|${formatearPanel(espesor)}||4|`,
    ...BPP_VARIABLES_RESTO,
    ...ops.map((o, i) => lineaBG({ ...o, id: 270000000 + i * 64, n: i })),
    ...BPP_PIE,
  ];

  return {
    contenido: lineas.join(SALTO),
    W,
    H,
    espesor,
    nVerticales: verticales.length,
    nLaterales: laterales.length,
    avisos,
  };
}

/* ---- UI ---- */

const COLORES_ESTADO = { ok: "#2e7d32", error: "#c0392b", salteado: "#b8860b" };

export default function DxfABpp({ onVolver }) {
  const [carpeta, setCarpeta] = useState("");
  const [espesor, setEspesor] = useState("");
  const [pisar, setPisar] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [log, setLog] = useState([]);
  const dirRef = useRef(null);

  const soportado = typeof window !== "undefined" && "showDirectoryPicker" in window;

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
      const espesorManual = Number.isFinite(esp) && esp > 0 ? esp : null;

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
          const texto = decodificarLatin1(await (await h.getFile()).arrayBuffer());
          const r = convertirDXF(leerDXF(texto), espesorManual);
          const fh = await dir.getFileHandle(nombreBpp, { create: true });
          const w = await fh.createWritable();
          await w.write(codificarLatin1(r.contenido));
          await w.close();
          filas.push({
            nombre,
            estado: "ok",
            detalle: `${nombreBpp} · panel ${formatearNumero(r.W)}×${formatearNumero(r.H)}×${formatearNumero(r.espesor)} mm · ${r.nVerticales} vertical(es) · ${r.nLaterales} lateral(es)`,
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
    maxWidth: "320px",
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
  const bloqueado = procesando || !carpeta || !soportado;

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
        <p style={{ fontSize: "12px", color: "#666", marginTop: 0, marginBottom: "20px", maxWidth: "600px" }}>
          Elegís una carpeta con archivos .dxf y los .bpp se guardan en esa misma carpeta, con el mismo
          nombre. El panel sale del contorno del DXF, los círculos pasan a taladros verticales y los
          rectángulos pegados al borde izquierdo o derecho pasan a taladros laterales. La herramienta
          y la profundidad se toman del nombre de la capa.
        </p>

        {!soportado && (
          <div style={{ marginBottom: "14px", color: "#c0392b", fontSize: "13px" }}>
            Este navegador no permite escribir en carpetas. Abrí Integral en Chrome o Edge.
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <label style={etiqueta}>Carpeta con los .dxf</label>
          <button onClick={handleElegirCarpeta} disabled={!soportado || procesando} style={botonSec}>
            {carpeta ? "Cambiar carpeta" : "Elegir carpeta"}
          </button>
          {carpeta && (
            <span style={{ fontSize: "12.5px", color: "#333", marginLeft: "10px" }}>
              Carpeta: <b>{carpeta}</b>
            </span>
          )}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={etiqueta}>Espesor del panel en mm (opcional)</label>
          <input
            type="text"
            value={espesor}
            onChange={(e) => setEspesor(e.target.value)}
            placeholder="Vacío = el de la capa del contorno"
            style={campo}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#333", marginBottom: "18px" }}>
          <input type="checkbox" checked={pisar} onChange={(e) => setPisar(e.target.checked)} />
          Pisar los .bpp que ya existan en la carpeta
        </label>

        {error && <div style={{ marginBottom: "14px", color: "#c0392b", fontSize: "13px" }}>{error}</div>}

        <button
          onClick={handleConvertir}
          disabled={bloqueado}
          style={{
            padding: "10px 18px",
            borderRadius: "6px",
            border: "none",
            background: bloqueado ? "#9db8c9" : "#0a3a5c",
            color: "#fff",
            cursor: bloqueado ? "not-allowed" : "pointer",
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
                style={{ padding: "8px 12px", borderTop: i ? "1px solid #e3eef8" : "none", fontSize: "12.5px" }}
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
