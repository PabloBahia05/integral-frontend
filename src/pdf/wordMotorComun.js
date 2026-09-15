// wordMotorComun.js
// Motor COMPARTIDO para la generación del presupuesto en Word (.docx,
// editable), hermano de pdfMotorComun.js (PDF, no editable). Mismo
// principio que ahí: acá vive todo lo que es igual entre wordPresupuesto.js
// y wordConfirmado.js (si el día de mañana se agrega, mismo patrón que
// pdfConfirmado.js) — logo, helpers de imagen, franjas de color/manija,
// tipografía/tamaño de página, y el mecanismo de descarga (docx →
// Packer.toBlob → <a download>).
//
// Reutiliza de pdfMotorComun.js TODA la lógica que es pura de datos (no
// HTML/CSS): agrupación de fotos, formato de pesos/fecha, cálculo de N°,
// orden de secciones, mapas de melamina/manija, el color generado por hash
// y el logo en base64. Así un cambio en esa lógica (ej. el formato de
// fecha) queda igual en los dos documentos sin tener que tocar dos
// lugares. Lo que SÍ es propio de acá es todo lo que depende del formato
// docx en vez de HTML: shading en vez de background-color, ImageRun en vez
// de <img>, Header/Footer de Word en vez de membrete "estampado" con jsPDF.

import {
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Header,
  Footer,
  ShadingType,
  BorderStyle,
  TabStopType,
  TabStopPosition,
} from "docx";

import {
  MEMBRETE_DANIEL_ROQUE_B64,
  agruparEnFilas,
  formatPeso,
  formatearFecha,
  calcularNro,
  ordenarSecciones,
  mapaMelaminas,
  colorGrupo,
  mapaManijas,
  manijaGrupo,
  colorParaMelamina,
  obtenerFotosMamparaPorModelo,
} from "./pdfMotorComun.js";

// Re-exportadas tal cual para que wordPresupuesto.js no tenga que importar
// de dos archivos distintos la lógica que comparte con el PDF.
export {
  agruparEnFilas,
  formatPeso,
  formatearFecha,
  calcularNro,
  ordenarSecciones,
  mapaMelaminas,
  colorGrupo,
  mapaManijas,
  manijaGrupo,
  obtenerFotosMamparaPorModelo,
};

// Nombre de archivo (.docx) ─────────────────────────────────────────────
// Misma limpieza de nombre que calcularNombreArchivo en pdfMotorComun.js.
// Duplicado a propósito (mismo criterio que el resto del archivo: es UNA
// línea que cambia, la extensión) — si se toca la lógica de limpieza del
// nombre del cliente, hay que tocarla en los dos lugares.
export const calcularNombreArchivoWord = ({ cliente, nro, revision }) => {
  const nombreClienteArchivo = (cliente || "SIN_CLIENTE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // saca acentos
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, "") // saca caracteres inválidos
    .trim()
    .replace(/\s+/g, "_");
  return `${nombreClienteArchivo}-P${nro}-REV${revision ?? 0}.docx`;
};

// Color de franja en hex ──────────────────────────────────────────────
// El shading de un TextRun en Word solo admite hex, no hsl(). Se convierte
// acá el MISMO string que devuelve colorParaMelamina (pdfMotorComun.js),
// para que la franja de color le quede igual en el PDF y en el Word para
// la misma melamina.
const hslAHex = (hsl) => {
  const m = /hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/.exec(hsl);
  if (!m) return "CCCCCC";
  const h = Number(m[1]) / 360;
  const s = Number(m[2]) / 100;
  const l = Number(m[3]) / 100;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (v) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const colorHexParaMelamina = (nombreMelamina) =>
  hslAHex(colorParaMelamina(nombreMelamina));

// Runs de las franjas de color/manija ────────────────────────────────────
// Van pegadas al lado del título de grupo, mismo lugar que .franja-color /
// .franja-manija en el PDF. En Word no existe el "badge" con borde
// redondeado del CSS — se resuelve con un TextRun con shading (fondo de
// color) y texto en negrita, que es el equivalente más parecido.
export const franjaColorRuns = (infoColor) =>
  infoColor
    ? [
        new TextRun({ text: "   " }),
        new TextRun({
          text: ` ${infoColor.nombre} `,
          bold: true,
          size: 16,
          shading: { type: ShadingType.CLEAR, fill: hslAHex(infoColor.css) },
        }),
      ]
    : [];

export const franjaManijaRuns = (infoManija) =>
  infoManija
    ? [
        new TextRun({ text: "   " }),
        new TextRun({
          text: ` Manija: ${infoManija.nombre} `,
          bold: true,
          size: 16,
          shading: { type: ShadingType.CLEAR, fill: "EEEEEE" },
        }),
      ]
    : [];

// Imágenes ──────────────────────────────────────────────────────────────
// A diferencia del <img src> del PDF (que se ajusta solo por CSS), un
// ImageRun de docx necesita ancho/alto fijos en px. medidasImagen lee el
// tamaño real para no deformar la foto; bytesImagen trae los bytes (sirve
// tanto para dataURL como para URL remota, igual que <img src> en el PDF).
const medidasImagen = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        width: img.naturalWidth || 400,
        height: img.naturalHeight || 300,
      });
    img.onerror = () => resolve({ width: 400, height: 300 });
    img.src = url;
  });

const bytesImagen = (url) => fetch(url).then((r) => r.arrayBuffer());

// docx solo acepta "png"/"jpg"/"gif"/"bmp" en ImageRun.type — se detecta
// del propio dataURL o, si es una URL remota, de la extensión.
const tipoImagen = (url) => {
  const m = /^data:image\/(png|jpe?g|gif|bmp)/i.exec(url);
  if (m) return m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase();
  const ext = (url.split("?")[0].split(".").pop() || "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "bmp"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  return "png";
};

// Arma un ImageRun ya escalado (mantiene proporción), a un ancho máximo en
// px multiplicado por el mismo im.anchoPct que usa filaFotosHTML en el PDF.
export const imageRunEscalado = async (url, anchoPct = 100, anchoMaxPx = 520) => {
  const [{ width, height }, data] = await Promise.all([
    medidasImagen(url),
    bytesImagen(url),
  ]);
  const anchoObjetivo = anchoMaxPx * (anchoPct / 100);
  const escala = Math.min(1, anchoObjetivo / width);
  return new ImageRun({
    data,
    type: tipoImagen(url),
    transformation: {
      width: Math.round(width * escala) || 1,
      height: Math.round(height * escala) || 1,
    },
  });
};

// Tamaño de página / tipografía (equivalente al CSS del PDF) ────────────
// A4 en twips (1 mm ≈ 56.6929 twips). "Space Mono" del PDF no es una
// fuente instalada en Word, así que se usa Courier New: la monoespaciada
// más parecida y disponible en cualquier instalación de Word/LibreOffice,
// mismo espíritu "máquina de escribir" que el resto del PDF.
export const PAGE_A4 = {
  size: { width: 11906, height: 16838 }, // 210 x 297 mm
  margin: { top: 2300, right: 850, bottom: 1000, left: 850 },
};

export const FUENTE_DOC = "Courier New";

export const estilosDocumento = {
  default: {
    document: {
      run: { font: FUENTE_DOC, size: 20 },
      paragraph: { spacing: { after: 80 } },
    },
  },
};

// Header/footer compartidos ───────────────────────────────────────────
// Logo más grande solo en la primera hoja (mismo criterio que
// LOGO_ALTO_MM_PRIMERA_HOJA en pdfMotorComun.js). El N°/Rev va en el
// footer de todas las páginas en vez de en una esquina fija del cuerpo,
// porque en Word (a diferencia del PDF paginado a mano con jsPDF) el
// footer se repite solo.
export const construirEncabezadoPie = async ({ nro, revision }) => {
  const logoBytes = Uint8Array.from(
    atob(MEMBRETE_DANIEL_ROQUE_B64.split(",")[1]),
    (c) => c.charCodeAt(0),
  );
  const dimensionesLogo = await medidasImagen(MEMBRETE_DANIEL_ROQUE_B64);
  const escala = (altoPx) => ({
    width: Math.round((dimensionesLogo.width * altoPx) / dimensionesLogo.height) || 1,
    height: altoPx,
  });
  const logoRun = (altoPx) =>
    new ImageRun({ data: logoBytes, type: "png", transformation: escala(altoPx) });

  const headerFirst = new Header({
    children: [new Paragraph({ children: [logoRun(130)] })],
  });
  const headerDefault = new Header({
    children: [new Paragraph({ children: [logoRun(60)] })],
  });
  const footer = new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "111111" } },
        children: [
          new TextRun({ text: "Daniel Roque S.R.L. — Bahía Blanca", size: 16 }),
          new TextRun({ text: `\tPresupuesto N° ${nro} — Rev. ${revision}`, size: 16 }),
        ],
      }),
    ],
  });
  return { headerFirst, headerDefault, footer };
};

// Descarga ────────────────────────────────────────────────────────────
// Genera el .docx real en el cliente y lo descarga. A diferencia de
// descargarPDF, acá NO hay fusión de adjuntos en PDF: un .docx no puede
// "contener" páginas de un PDF ajeno. Si hay PDFs adjuntos al presupuesto,
// wordPresupuesto.js deja una nota en el propio documento en vez de
// perderlos en silencio.
export async function descargarWord({ doc, nombreArchivo, setGenerandoWord }) {
  setGenerandoWord?.(true);
  try {
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Error generando Word:", err);
    alert("Ocurrió un error generando el Word. Probá de nuevo.");
  } finally {
    setGenerandoWord?.(false);
  }
}
