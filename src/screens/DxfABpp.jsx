import { useState, useRef, useEffect } from "react";
import { rotarBPP } from "./RotarBPP";

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
 * Filtro de orientación: si en algún archivo el panel sale con LPX menor
 * que LPY (más alto que ancho), no se guarda nada todavía: se muestra la
 * lista de esas piezas y se pide, pieza por pieza (o para todas), si se
 * avanza así, se rota 90° u 270° (giro horario, con la misma rotación de
 * RotarBPP.jsx, que ahora se exporta) o no se convierte. Al rotar 90°/270°
 * los laterales de las caras 1 y 3 pasan a los lados 2 y 4, cuya
 * numeración no está verificada: se avisa.
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

  // Geometría para la vista previa (coordenadas del panel, origen abajo-izq.).
  // Laterales: rectángulo desde el borde hacia adentro (profundidad) y a lo
  // largo del borde (diámetro), centrado en la posición.
  const geom = {
    W,
    H,
    circulos: verticales.map((v) => ({ x: v.x, y: v.y, r: v.dia / 2, d: v.dia })),
    rects: laterales.map((l) =>
      l.cara === 1
        ? { x0: 0, x1: l.prof, y0: l.x - l.dia / 2, y1: l.x + l.dia / 2, z: l.y }
        : { x0: W - l.prof, x1: W, y0: l.x - l.dia / 2, y1: l.x + l.dia / 2, z: l.y },
    ),
  };

  return {
    contenido: lineas.join(SALTO),
    W,
    H,
    espesor,
    nVerticales: verticales.length,
    nLaterales: laterales.length,
    avisos,
    geom,
  };
}

// Gira la geometría en sentido horario (90° o 270°), igual que la rotación
// del .bpp: el panel nuevo mide H × W.
function rotarGeom(g, grados) {
  const { W, H } = g;
  const mover = grados === 90 ? (x, y) => [y, W - x] : (x, y) => [H - y, x];
  const circulos = g.circulos.map((c) => {
    const [x, y] = mover(c.x, c.y);
    return { ...c, x, y };
  });
  const rects = g.rects.map((r) => {
    const [xa, ya] = mover(r.x0, r.y0);
    const [xb, yb] = mover(r.x1, r.y1);
    return {
      ...r,
      x0: Math.min(xa, xb),
      x1: Math.max(xa, xb),
      y0: Math.min(ya, yb),
      y1: Math.max(ya, yb),
    };
  });
  return { W: H, H: W, circulos, rects };
}

// ---- Vista previa de la pieza (SVG) -----------------------------------------

function VistaPlano({ geom, grande = false }) {
  const { W, H, circulos, rects } = geom;
  const m = Math.max(W, H);
  const pad = grande ? m * 0.09 : m * 0.03;
  const fs = m * 0.026;
  const Y = (y) => H - y; // el SVG tiene el eje Y hacia abajo
  const trazo = { vectorEffect: "non-scaling-stroke" };
  const f = (n) => formatearNumero(n);

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <rect x={0} y={0} width={W} height={H} fill="#fdf6e3" stroke="#0a3a5c" strokeWidth={1.5} {...trazo} />
      {rects.map((r, i) => (
        <rect
          key={`r${i}`}
          x={r.x0}
          y={Y(r.y1)}
          width={r.x1 - r.x0}
          height={r.y1 - r.y0}
          fill="#f0a35a"
          stroke="#b45f06"
          strokeWidth={1}
          {...trazo}
        />
      ))}
      {circulos.map((c, i) => (
        <circle
          key={`c${i}`}
          cx={c.x}
          cy={Y(c.y)}
          r={c.r}
          fill="#7fb6e6"
          stroke="#0a3a5c"
          strokeWidth={1}
          {...trazo}
        />
      ))}
      {grande && (
        <>
          {circulos.map((c, i) => (
            <text
              key={`tc${i}`}
              x={c.x}
              y={Y(c.y) - c.r - fs * 0.35}
              fontSize={fs}
              textAnchor="middle"
              fill="#0a3a5c"
              stroke="#fff"
              strokeWidth={fs * 0.25}
              paintOrder="stroke"
              fontFamily="sans-serif"
            >
              Ø{f(c.d)}
            </text>
          ))}
          <text
            x={W / 2}
            y={H + pad * 0.7}
            fontSize={fs * 1.2}
            textAnchor="middle"
            fill="#333"
            fontFamily="sans-serif"
          >
            {f(W)} mm
          </text>
          <text
            x={-pad * 0.7}
            y={H / 2}
            fontSize={fs * 1.2}
            textAnchor="middle"
            fill="#333"
            fontFamily="sans-serif"
            transform={`rotate(-90 ${-pad * 0.7} ${H / 2})`}
          >
            {f(H)} mm
          </text>
        </>
      )}
    </svg>
  );
}

/* ---- UI ---- */

const COLORES_ESTADO = { ok: "#2e7d32", error: "#c0392b", salteado: "#b8860b" };
const TOL_ORIENTACION = 0.001;

const OPCIONES_DECISION = [
  { valor: "asi", texto: "Avanzar así" },
  { valor: 90, texto: "Rotar 90°" },
  { valor: 270, texto: "Rotar 270°" },
  { valor: "omitir", texto: "No convertir" },
];

async function existeBpp(dir, nombre) {
  try {
    await dir.getFileHandle(nombre);
    return true;
  } catch {
    return false;
  }
}

export default function DxfABpp({ onVolver }) {
  const [carpeta, setCarpeta] = useState("");
  const [espesor, setEspesor] = useState("");
  const [pisar, setPisar] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [log, setLog] = useState([]);
  // { items, invertidas, decisiones, filasBase } mientras se espera la respuesta
  const [revision, setRevision] = useState(null);
  const dirRef = useRef(null);
  // Fila del log cuya vista previa está ampliada (o null)
  const [ampliada, setAmpliada] = useState(null);

  useEffect(() => {
    if (!ampliada) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setAmpliada(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ampliada]);

  const soportado = typeof window !== "undefined" && "showDirectoryPicker" in window;

  const handleElegirCarpeta = async () => {
    setError("");
    try {
      const h = await window.showDirectoryPicker({ mode: "readwrite" });
      dirRef.current = h;
      setCarpeta(h.name);
      setLog([]);
      setRevision(null);
      setAmpliada(null);
    } catch (err) {
      if (err?.name !== "AbortError") setError("No se pudo abrir la carpeta.");
    }
  };

  // Escribe los .bpp ya convertidos en memoria, aplicando lo que se eligió
  // para las piezas con LPX < LPY.
  const guardar = async (dir, items, decisiones, filasBase) => {
    setRevision(null);
    setProcesando(true);
    const filas = [...filasBase];
    setLog([...filas]);
    try {
      for (const it of items) {
        const dec = decisiones[it.nombre] ?? "asi";
        try {
          if (dec === "omitir") {
            filas.push({
              nombre: it.nombre,
              estado: "salteado",
              detalle: `No se convirtió (LPX ${formatearNumero(it.W)} < LPY ${formatearNumero(it.H)})`,
            });
            setLog([...filas]);
            continue;
          }
          if (!pisar && (await existeBpp(dir, it.nombreBpp))) {
            filas.push({ nombre: it.nombre, estado: "salteado", detalle: `${it.nombreBpp} ya existe` });
            setLog([...filas]);
            continue;
          }
          let contenido = it.contenido;
          let W = it.W;
          let H = it.H;
          const avisos = [...it.avisos];
          let nota = "";
          let geom = it.geom;
          if (dec === 90 || dec === 270) {
            const r = rotarBPP(contenido, dec);
            contenido = r.contenido;
            W = r.panelNuevo.LPX;
            H = r.panelNuevo.LPY;
            avisos.push(...r.avisos);
            nota = ` · rotada ${dec}° horario`;
            geom = rotarGeom(it.geom, dec);
          } else if (W < H - TOL_ORIENTACION) {
            avisos.push("Se guardó con LPX menor que LPY (elegiste avanzar así).");
          }
          const fh = await dir.getFileHandle(it.nombreBpp, { create: true });
          const w = await fh.createWritable();
          await w.write(codificarLatin1(contenido));
          await w.close();
          filas.push({
            nombre: it.nombre,
            estado: "ok",
            detalle: `${it.nombreBpp} · panel ${formatearNumero(W)}×${formatearNumero(H)}×${formatearNumero(it.espesor)} mm · ${it.nVerticales} vertical(es) · ${it.nLaterales} lateral(es)${nota}`,
            avisos,
            geom,
          });
        } catch (err) {
          filas.push({ nombre: it.nombre, estado: "error", detalle: err.message || String(err) });
        }
        setLog([...filas]);
      }
    } finally {
      setProcesando(false);
    }
  };

  const handleConvertir = async () => {
    setError("");
    setLog([]);
    setRevision(null);
    const dir = dirRef.current;
    if (!dir) { setError("Elegí primero la carpeta con los .dxf."); return; }

    setProcesando(true);
    const filasError = [];
    const items = [];
    try {
      const dxfs = [];
      for await (const [nombre, h] of dir.entries()) {
        if (h.kind === "file" && /\.dxf$/i.test(nombre)) dxfs.push([nombre, h]);
      }
      dxfs.sort((a, b) => a[0].localeCompare(b[0]));
      if (!dxfs.length) {
        setError("La carpeta no tiene archivos .dxf.");
        setProcesando(false);
        return;
      }

      const esp = parseFloat(String(espesor).replace(",", "."));
      const espesorManual = Number.isFinite(esp) && esp > 0 ? esp : null;

      for (const [nombre, h] of dxfs) {
        try {
          const texto = decodificarLatin1(await (await h.getFile()).arrayBuffer());
          const r = convertirDXF(leerDXF(texto), espesorManual);
          items.push({ nombre, nombreBpp: nombre.replace(/\.dxf$/i, "") + ".bpp", ...r });
        } catch (err) {
          filasError.push({ nombre, estado: "error", detalle: err.message || String(err) });
        }
      }
    } catch (err) {
      setError(err.message || "No se pudo recorrer la carpeta.");
      setProcesando(false);
      return;
    }

    const invertidas = items.filter((it) => it.W < it.H - TOL_ORIENTACION);
    if (invertidas.length) {
      // Todavía no se guarda nada: primero se pregunta qué hacer.
      setLog(filasError);
      setRevision({ items, invertidas, decisiones: {}, filasBase: filasError });
      setProcesando(false);
      return;
    }
    await guardar(dir, items, {}, filasError);
  };

  const elegir = (nombre, valor) =>
    setRevision((r) => ({ ...r, decisiones: { ...r.decisiones, [nombre]: valor } }));

  const elegirTodas = (valor) =>
    setRevision((r) => ({
      ...r,
      decisiones: Object.fromEntries(r.invertidas.map((it) => [it.nombre, valor])),
    }));

  const sinResponder = revision
    ? revision.invertidas.filter((it) => revision.decisiones[it.nombre] === undefined).length
    : 0;

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
  const botonChico = { ...botonSec, padding: "5px 10px", fontSize: "12px" };
  const bloqueado = procesando || !carpeta || !soportado || !!revision;

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

      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{ color: "#0a3a5c", marginBottom: "8px" }}>Convertir DXF a BPP</h2>
        <p style={{ fontSize: "12px", color: "#666", marginTop: 0, marginBottom: "20px", maxWidth: "600px" }}>
          Elegís una carpeta con archivos .dxf y los .bpp se guardan en esa misma carpeta, con el mismo
          nombre. El panel sale del contorno del DXF, los círculos pasan a taladros verticales y los
          rectángulos pegados al borde izquierdo o derecho pasan a taladros laterales. La herramienta
          y la profundidad se toman del nombre de la capa. Si alguna pieza queda con LPX menor que LPY,
          te pregunta antes de guardar.
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

        {revision && (
          <div
            style={{
              marginTop: "20px",
              border: "1.5px solid #e0b64a",
              background: "#fff8e1",
              borderRadius: "8px",
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#7a5a00", marginBottom: "4px" }}>
              {revision.invertidas.length === 1
                ? "1 pieza quedó con LPX menor que LPY (más alta que ancha)"
                : `${revision.invertidas.length} piezas quedaron con LPX menor que LPY (más altas que anchas)`}
            </div>
            <div style={{ fontSize: "12.5px", color: "#555", marginBottom: "12px" }}>
              Todavía no se guardó ningún archivo. Elegí qué hacer con cada una. Al rotar, los laterales
              pasan al borde inferior/superior (lados 2 y 4), cuya numeración no está verificada:
              revisalo en BiesseWorks.
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
              <span style={{ fontSize: "12.5px", color: "#333", alignSelf: "center" }}>Todas:</span>
              {OPCIONES_DECISION.map((o) => (
                <button key={String(o.valor)} onClick={() => elegirTodas(o.valor)} style={botonChico}>
                  {o.texto}
                </button>
              ))}
            </div>

            <div style={{ background: "#fff", border: "1px solid #ecd9a0", borderRadius: "6px" }}>
              {revision.invertidas.map((it, i) => (
                <div
                  key={it.nombre}
                  style={{ padding: "8px 12px", borderTop: i ? "1px solid #f3e6bd" : "none", fontSize: "12.5px" }}
                >
                  <div style={{ marginBottom: "6px" }}>
                    <b style={{ color: "#333" }}>{it.nombre}</b>{" "}
                    <span style={{ color: "#555" }}>
                      · LPX {formatearNumero(it.W)} × LPY {formatearNumero(it.H)} mm · {it.nVerticales} vertical(es) ·{" "}
                      {it.nLaterales} lateral(es)
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                    {OPCIONES_DECISION.map((o) => (
                      <label key={String(o.valor)} style={{ display: "flex", alignItems: "center", gap: "5px", color: "#333" }}>
                        <input
                          type="radio"
                          name={`dec-${it.nombre}`}
                          checked={revision.decisiones[it.nombre] === o.valor}
                          onChange={() => elegir(it.nombre, o.valor)}
                        />
                        {o.texto}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "14px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => guardar(dirRef.current, revision.items, revision.decisiones, revision.filasBase)}
                disabled={sinResponder > 0}
                style={{
                  padding: "9px 16px",
                  borderRadius: "6px",
                  border: "none",
                  background: sinResponder > 0 ? "#9db8c9" : "#0a3a5c",
                  color: "#fff",
                  cursor: sinResponder > 0 ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                Guardar los .bpp
              </button>
              <button onClick={() => setRevision(null)} style={botonSec}>
                Cancelar
              </button>
              {sinResponder > 0 && (
                <span style={{ fontSize: "12px", color: "#7a5a00" }}>
                  Falta elegir en {sinResponder} pieza(s).
                </span>
              )}
            </div>
          </div>
        )}

        {resumen && !procesando && !revision && (
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
                  display: "flex",
                  gap: "14px",
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
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
                {f.geom && (
                  <button
                    onClick={() => setAmpliada(f)}
                    title="Click para ampliar"
                    style={{
                      flex: "0 0 auto",
                      width: "170px",
                      padding: "6px",
                      border: "1.5px solid #b8d6ef",
                      borderRadius: "6px",
                      background: "#fff",
                      cursor: "zoom-in",
                    }}
                  >
                    <VistaPlano geom={f.geom} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {ampliada && (
        <div
          onClick={() => setAmpliada(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,30,50,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
            cursor: "zoom-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "10px",
              padding: "16px 18px",
              width: "min(94vw, 1100px)",
              maxHeight: "92vh",
              overflow: "auto",
              cursor: "default",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ flex: 1, fontSize: "14px", color: "#0a3a5c" }}>
                <b>{ampliada.nombre.replace(/\.dxf$/i, "")}.bpp</b>
                <span style={{ color: "#555", fontSize: "12.5px" }}> · {ampliada.detalle.split(" · ").slice(1).join(" · ")}</span>
              </div>
              <button onClick={() => setAmpliada(null)} style={botonChico}>
                Cerrar
              </button>
            </div>
            <VistaPlano geom={ampliada.geom} grande />
            <div style={{ display: "flex", gap: "18px", marginTop: "10px", fontSize: "12px", color: "#555", flexWrap: "wrap" }}>
              <span>
                <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: "#7fb6e6", border: "1px solid #0a3a5c", verticalAlign: "middle", marginRight: 5 }} />
                Taladro vertical
              </span>
              <span>
                <span style={{ display: "inline-block", width: 12, height: 12, background: "#f0a35a", border: "1px solid #b45f06", verticalAlign: "middle", marginRight: 5 }} />
                Taladro lateral (profundidad × diámetro)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
