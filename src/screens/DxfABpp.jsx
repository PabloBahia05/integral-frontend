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
 * avanza así, se rota 90°, 180° u 270° (giro horario, con la misma rotación de
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
    circulos: verticales.map((v) => ({ x: v.x, y: v.y, r: v.dia / 2, d: v.dia, p: v.prof })),
    rects: laterales.map((l) =>
      l.cara === 1
        ? { x0: 0, x1: l.prof, y0: l.x - l.dia / 2, y1: l.x + l.dia / 2, z: l.y, prof: l.prof, dia: l.dia }
        : { x0: W - l.prof, x1: W, y0: l.x - l.dia / 2, y1: l.x + l.dia / 2, z: l.y, prof: l.prof, dia: l.dia },
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

// Gira la geometría en sentido horario (90°, 180° o 270°), igual que la
// rotación del .bpp: con 90°/270° el panel nuevo mide H × W; con 180° no cambia.
function rotarGeom(g, grados) {
  const { W, H } = g;
  const mover =
    grados === 90 ? (x, y) => [y, W - x]
    : grados === 180 ? (x, y) => [W - x, H - y]
    : (x, y) => [H - y, x];
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
  return grados === 180 ? { W, H, circulos, rects } : { W: H, H: W, circulos, rects };
}

// ¿Dos geometrías tienen el mismo panel y los mismos taladros (mismo origen)?
function mismaGeom(a, b, tol = 0.05) {
  if (Math.abs(a.W - b.W) > tol || Math.abs(a.H - b.H) > tol) return false;
  if (a.circulos.length !== b.circulos.length || a.rects.length !== b.rects.length) return false;
  const cc = (g) => [...g.circulos].sort((p, q) => p.x - q.x || p.y - q.y);
  const rr = (g) => [...g.rects].sort((p, q) => p.x0 - q.x0 || p.y0 - q.y0 || p.x1 - q.x1 || p.y1 - q.y1);
  const ca = cc(a), cb = cc(b), ra = rr(a), rb = rr(b);
  return (
    ca.every((c, i) => Math.abs(c.x - cb[i].x) <= tol && Math.abs(c.y - cb[i].y) <= tol && Math.abs(c.d - cb[i].d) <= tol) &&
    ra.every((r, i) =>
      ["x0", "x1", "y0", "y1"].every((k) => Math.abs(r[k] - rb[i][k]) <= tol) && Math.abs(r.dia - rb[i].dia) <= tol)
  );
}

// Pares "XXX" / "XXXX": el apoyo es siempre el borde inferior, así que la pieza X y su
// base deben tener el mismo origen. Si la base es la X girada 180°, se sugiere rotar la
// base 180° (la X queda como referencia). Devuelve { "ETF1.dxf": "ETF1X.dxf", ... }.
function detectarEspejos(items) {
  const porBase = new Map(items.map((it) => [it.nombre.replace(/\.dxf$/i, "").toUpperCase(), it]));
  const out = {};
  for (const it of items) {
    const base = it.nombre.replace(/\.dxf$/i, "").toUpperCase();
    const x = porBase.get(base + "X");
    if (!x) continue;
    if (!mismaGeom(it.geom, x.geom) && mismaGeom(rotarGeom(it.geom, 180), x.geom)) out[it.nombre] = x.nombre;
  }
  return out;
}

// ---- Vista previa de la pieza (SVG) -----------------------------------------

function VistaPlano({ geom, grande = false }) {
  const { W, H, circulos, rects } = geom;
  const m = Math.max(W, H);
  const fs = grande ? m * 0.024 : m * 0.075; // tamaño del texto de las cotas
  const t = fs * 0.5; // medio largo de las marcas de las cotas
  const COT = "#a33";
  const TOLB = 0.05;
  const Y = (y) => H - y; // el SVG tiene el eje Y hacia abajo
  const trazo = { vectorEffect: "non-scaling-stroke" };
  const f = (n) => formatearNumero(Math.round(n * 100) / 100);

  // Margen para las líneas de cota (abajo e izquierda). En la miniatura solo va la cota total.
  const padL = grande ? fs * 6.4 : fs * 2.6;
  const padB = grande ? fs * 6.4 : fs * 2.7;
  const padR = grande ? fs * 1.6 : m * 0.02;
  const padT = grande ? fs * 1.4 : m * 0.02;
  const filaChain = fs * 2.4;
  const filaTotal = grande ? fs * 5.4 : fs * 1.9;

  // Lado del panel al que está pegado cada taladro lateral (ya con la rotación aplicada)
  const lado = (r) => {
    const ex = r.x1 - r.x0;
    const ey = r.y1 - r.y0;
    const horiz =
      Math.abs(ex - r.prof) < 0.01 && Math.abs(ey - r.prof) >= 0.01 ? true
      : Math.abs(ey - r.prof) < 0.01 && Math.abs(ex - r.prof) >= 0.01 ? false
      : ex <= ey;
    if (horiz) return r.x0 < TOLB ? "izq" : "der";
    return r.y0 < TOLB ? "inf" : "sup";
  };
  const lados = rects.map(lado);

  // Posiciones a cotar en cadena: de borde a borde pasando por cada taladro
  const unicos = (vals, tope) => {
    const ord = [...vals].sort((a, b) => a - b);
    const res = [];
    for (const v of ord) {
      if (v < 0.01 || v > tope - 0.01) continue;
      if (res.length && v - res[res.length - 1] < 0.01) continue;
      res.push(v);
    }
    return [0, ...res, tope];
  };
  const px = unicos(
    [
      ...circulos.map((c) => c.x),
      ...rects.filter((_, i) => lados[i] === "inf" || lados[i] === "sup").map((r) => (r.x0 + r.x1) / 2),
    ],
    W,
  );
  const py = unicos(
    [
      ...circulos.map((c) => c.y),
      ...rects.filter((_, i) => lados[i] === "izq" || lados[i] === "der").map((r) => (r.y0 + r.y1) / 2),
    ],
    H,
  );

  const estiloTexto = {
    fontSize: fs,
    fill: COT,
    fontFamily: "sans-serif",
    stroke: "#fff",
    strokeWidth: fs * 0.22,
    paintOrder: "stroke",
    textAnchor: "middle",
  };

  // Cota horizontal (abajo del panel). pts = posiciones en X, de menor a mayor.
  const cotaH = (pts, yFila, ext, sufijo) => (
    <g>
      <line x1={pts[0]} x2={pts[pts.length - 1]} y1={yFila} y2={yFila} stroke={COT} strokeWidth={0.8} {...trazo} />
      {pts.map((x, i) => (
        <g key={`h${i}`}>
          {ext && (
            <line x1={x} x2={x} y1={H + fs * 0.3} y2={yFila + t} stroke={COT} strokeWidth={0.5} strokeDasharray="3 3" {...trazo} />
          )}
          <line x1={x} x2={x} y1={yFila - t} y2={yFila + t} stroke={COT} strokeWidth={1.2} {...trazo} />
        </g>
      ))}
      {pts.slice(1).map((x, i) => {
        const a = pts[i];
        const apretado = x - a < fs * 4.2 && i % 2 === 1; // tramos cortos: alternan arriba/abajo
        return (
          <text key={`ht${i}`} x={(a + x) / 2} y={apretado ? yFila + fs * 1.25 : yFila - fs * 0.35} {...estiloTexto}>
            {f(x - a)}
            {sufijo}
          </text>
        );
      })}
    </g>
  );

  // Cota vertical (a la izquierda del panel). pts = posiciones en Y (coordenadas del panel).
  const cotaV = (pts, xFila, ext, sufijo) => (
    <g>
      <line x1={xFila} x2={xFila} y1={Y(pts[0])} y2={Y(pts[pts.length - 1])} stroke={COT} strokeWidth={0.8} {...trazo} />
      {pts.map((v, i) => (
        <g key={`v${i}`}>
          {ext && (
            <line x1={-fs * 0.3} x2={xFila - t} y1={Y(v)} y2={Y(v)} stroke={COT} strokeWidth={0.5} strokeDasharray="3 3" {...trazo} />
          )}
          <line x1={xFila - t} x2={xFila + t} y1={Y(v)} y2={Y(v)} stroke={COT} strokeWidth={1.2} {...trazo} />
        </g>
      ))}
      {pts.slice(1).map((v, i) => {
        const a = pts[i];
        const apretado = v - a < fs * 4.2 && i % 2 === 1;
        const tx = apretado ? xFila - fs * 0.35 : xFila + fs * 0.95;
        const ty = Y((a + v) / 2);
        return (
          <text key={`vt${i}`} x={tx} y={ty} transform={`rotate(-90 ${tx} ${ty})`} {...estiloTexto}>
            {f(v - a)}
            {sufijo}
          </text>
        );
      })}
    </g>
  );

  // Texto de un taladro lateral, pegado al rectángulo y hacia adentro del panel
  const etiquetaLateral = (r, lad, i) => {
    const txt = `Ø${f(r.dia)} P${f(r.prof)} A${f(r.z)}`;
    const cx = (r.x0 + r.x1) / 2;
    const cy = Y((r.y0 + r.y1) / 2);
    const base = { ...estiloTexto };
    if (lad === "izq") return <text key={`tl${i}`} {...base} x={r.x1 + fs * 0.5} y={cy + fs * 0.35} textAnchor="start">{txt}</text>;
    if (lad === "der") return <text key={`tl${i}`} {...base} x={r.x0 - fs * 0.5} y={cy + fs * 0.35} textAnchor="end">{txt}</text>;
    if (lad === "inf") return <text key={`tl${i}`} {...base} x={cx} y={Y(r.y1) - fs * 0.5}>{txt}</text>;
    return <text key={`tl${i}`} {...base} x={cx} y={Y(r.y0) + fs * 1.4}>{txt}</text>;
  };

  return (
    <svg
      viewBox={`${-padL} ${-padT} ${W + padL + padR} ${H + padT + padB}`}
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

      {/* Cota total (en la miniatura es la única) */}
      {cotaH([0, W], H + filaTotal, grande, " mm")}
      {cotaV([0, H], -filaTotal, grande, " mm")}

      {grande && (
        <>
          {/* Cotas en cadena: de borde a borde pasando por cada taladro */}
          {px.length > 2 && cotaH(px, H + filaChain, true, "")}
          {py.length > 2 && cotaV(py, -filaChain, true, "")}
          {circulos.map((c, i) => (
            <text key={`tc${i}`} x={c.x} y={Y(c.y) - c.r - fs * 0.35} {...estiloTexto} fill="#0a3a5c">
              {`Ø${f(c.d)}`}
              {c.p !== undefined ? ` P${f(c.p)}` : ""}
            </text>
          ))}
          {rects.map((r, i) => etiquetaLateral(r, lados[i], i))}
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
  { valor: 180, texto: "Rotar 180°" },
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
              detalle: "No se convirtió (elegido en la vista previa)",
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
          if (dec === 90 || dec === 180 || dec === 270) {
            // 180° = dos giros de 90° con la misma rotación de RotarBPP.
            const giros = dec === 180 ? [90, 90] : [dec];
            for (const giro of giros) {
              const r = rotarBPP(contenido, giro);
              contenido = r.contenido;
              W = r.panelNuevo.LPX;
              H = r.panelNuevo.LPY;
              for (const a of r.avisos) if (!avisos.includes(a)) avisos.push(a);
            }
            nota = ` · rotada ${dec}° horario`;
            geom = rotarGeom(it.geom, dec);
            if (W < H - TOL_ORIENTACION) {
              avisos.push("Se guardó con LPX menor que LPY (la rotación no cambió la orientación del panel).");
            }
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

    // Nada se guarda todavía: se muestra la vista previa de todas las piezas y
    // recién al apretar "Guardar los .bpp" se escriben los archivos.
    setLog(filasError);
    setProcesando(false);
    if (!items.length) return; // solo hubo errores: quedan en el log
    const invertidas = items.filter((it) => it.W < it.H - TOL_ORIENTACION);
    setRevision({ items, invertidas, espejos: detectarEspejos(items), decisiones: {}, filasBase: filasError });
  };

  const elegir = (nombre, valor) =>
    setRevision((r) => ({ ...r, decisiones: { ...r.decisiones, [nombre]: valor } }));

  const elegirTodas = (valor) =>
    setRevision((r) => ({
      ...r,
      decisiones: Object.fromEntries(r.items.map((it) => [it.nombre, valor])),
    }));

  const sinResponder = revision
    ? revision.invertidas.filter((it) => revision.decisiones[it.nombre] === undefined).length +
      Object.keys(revision.espejos || {}).filter(
        (n) => revision.decisiones[n] === undefined && !revision.invertidas.some((it) => it.nombre === n),
      ).length
    : 0;
  const espejosPend = revision ? Object.keys(revision.espejos || {}) : [];
  const elegirEspejos = (valor) =>
    setRevision((r) => ({
      ...r,
      decisiones: { ...r.decisiones, ...Object.fromEntries(Object.keys(r.espejos || {}).map((n) => [n, valor])) },
    }));

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

        {revision && (() => {
          const hayInv = revision.invertidas.length > 0;
          const cNorm = hayInv
            ? { borde: "#e0b64a", fondo: "#fff8e1", titulo: "#7a5a00", sep: "#f3e6bd", lista: "#ecd9a0" }
            : { borde: "#b8d6ef", fondo: "#f4f9fd", titulo: "#0a3a5c", sep: "#e3eef8", lista: "#b8d6ef" };
          return (
          <div
            style={{
              marginTop: "20px",
              border: `1.5px solid ${cNorm.borde}`,
              background: cNorm.fondo,
              borderRadius: "8px",
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "bold", color: cNorm.titulo, marginBottom: "4px" }}>
              Vista previa: {revision.items.length} pieza(s) lista(s) para guardar
            </div>
            <div style={{ fontSize: "12.5px", color: "#555", marginBottom: "12px" }}>
              Todavía no se guardó ningún archivo. Revisá los planos (click para ampliar) y apretá
              "Guardar los .bpp" cuando estén bien.
              {hayInv && (
                <>
                  {" "}
                  {revision.invertidas.length === 1
                    ? "1 pieza quedó con LPX menor que LPY (más alta que ancha): elegí qué hacer con ella."
                    : `${revision.invertidas.length} piezas quedaron con LPX menor que LPY (más altas que anchas): elegí qué hacer con cada una.`}{" "}
                  Al rotar, los laterales pasan al borde inferior/superior (lados 2 y 4), cuya numeración
                  no está verificada: revisalo en BiesseWorks.
                </>
              )}
            </div>

            {espejosPend.length > 0 && (
              <div
                style={{
                  background: "#fff8e1",
                  border: "1.5px solid #e0b84a",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  marginBottom: "12px",
                  fontSize: "12.5px",
                  color: "#333",
                }}
              >
                <b>Mismo origen:</b> {espejosPend.length === 1 ? "1 pieza es" : `${espejosPend.length} piezas son`} su par "X" girado 180° (el apoyo es siempre el
                borde inferior): {espejosPend.map((n) => `${n.replace(/\.dxf$/i, "")} ↔ ${revision.espejos[n].replace(/\.dxf$/i, "")}`).join(", ")}.
                ¿Rotar 180° la pieza base para que coincida con la X?
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button onClick={() => elegirEspejos(180)} style={botonChico}>Sí, rotar todas 180°</button>
                  <button onClick={() => elegirEspejos("asi")} style={botonChico}>No, dejarlas así</button>
                </div>
              </div>
            )}

            {(
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                <span style={{ fontSize: "12.5px", color: "#333", alignSelf: "center" }}>Todas las piezas:</span>
                {OPCIONES_DECISION.map((o) => (
                  <button key={String(o.valor)} onClick={() => elegirTodas(o.valor)} style={botonChico}>
                    {o.texto}
                  </button>
                ))}
              </div>
            )}

            <div style={{ background: "#fff", border: `1px solid ${cNorm.lista}`, borderRadius: "6px" }}>
              {revision.items.map((it, i) => {
                const invertida = it.W < it.H - TOL_ORIENTACION;
                // Las piezas bien orientadas avanzan así por defecto; las invertidas obligan a elegir.
                const dec = revision.decisiones[it.nombre] ?? (invertida ? undefined : "asi");
                const omitida = dec === "omitir";
                const rota = dec === 90 || dec === 180 || dec === 270;
                const g = rota ? rotarGeom(it.geom, dec) : it.geom;
                const detalle = `${it.nombreBpp} · panel ${formatearNumero(g.W)}×${formatearNumero(g.H)}×${formatearNumero(it.espesor)} mm · ${it.nVerticales} vertical(es) · ${it.nLaterales} lateral(es)${rota ? ` · rotada ${dec}° horario` : ""}`;
                return (
                  <div
                    key={it.nombre}
                    style={{
                      padding: "8px 12px",
                      borderTop: i ? `1px solid ${cNorm.sep}` : "none",
                      fontSize: "12.5px",
                      display: "flex",
                      gap: "14px",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div>
                        <b style={{ color: "#333" }}>{it.nombre}</b>
                      </div>
                      <div style={{ color: "#555", marginTop: "2px" }}>{detalle}</div>
                      {it.avisos.map((a, j) => (
                        <div key={j} style={{ color: "#b8860b", marginTop: "2px" }}>
                          ⚠ {a}
                        </div>
                      ))}
                      {(
                        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "8px" }}>
                          {OPCIONES_DECISION.map((o) => (
                            <label key={String(o.valor)} style={{ display: "flex", alignItems: "center", gap: "5px", color: "#333" }}>
                              <input
                                type="radio"
                                name={`dec-${it.nombre}`}
                                checked={dec === o.valor}
                                onChange={() => elegir(it.nombre, o.valor)}
                              />
                              {o.texto}
                            </label>
                          ))}
                        </div>
                      )}
                      {revision.espejos?.[it.nombre] && (
                        <div style={{ color: "#8a6d00", marginTop: "4px" }}>
                          Es {revision.espejos[it.nombre]} girada 180°: rotarla 180° la deja con el mismo origen.
                        </div>
                      )}
                      {omitida && (
                        <div style={{ color: "#b8860b", marginTop: "4px", fontWeight: "bold" }}>No se va a guardar.</div>
                      )}
                    </div>
                    <button
                      onClick={() => setAmpliada({ nombre: it.nombre, detalle, geom: g })}
                      title="Click para ampliar"
                      style={{
                        flex: "0 0 auto",
                        width: "200px",
                        padding: "6px",
                        border: "1.5px solid #b8d6ef",
                        borderRadius: "6px",
                        background: "#fff",
                        cursor: "zoom-in",
                        opacity: omitida ? 0.35 : 1,
                      }}
                    >
                      <VistaPlano geom={g} />
                    </button>
                  </div>
                );
              })}
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
                  Falta elegir en {sinResponder} pieza(s) invertida(s).
                </span>
              )}
            </div>
          </div>
          );
        })()}

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
                      width: "200px",
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
              <span>Cotas en mm · Ø diámetro · P profundidad · A altura dentro del espesor</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
