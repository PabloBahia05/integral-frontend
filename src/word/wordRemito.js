// wordRemito.js
// Generación del REMITO DE SALIDA (.docx) de una obra confirmada — hermano
// de wordPresupuesto.js, mismo motor compartido (wordMotorComun.js: logo,
// tipografía, mecanismo de descarga), pero mucho más simple: acá NO hay
// precios, líneas de precio, ni franjas de color/manija — un remito es un
// comprobante de qué salió de fábrica y cuánto, no un documento comercial.
//
// A diferencia de wordPresupuesto.js, los ítems no vienen agrupados por
// "grupoDe" custom del editor — vienen tal cual los devuelve el backend
// (GET /remitos/pendientes/:numeropres/:revision, ver remitos.routes.js),
// agrupados acá mismo por `tipo` (la sección/rubro real del ítem en
// tabla_presupuestos) para que la lista no salga como un bloque plano de
// 40 renglones sueltos.

import { Document, Paragraph, TextRun, AlignmentType, BorderStyle } from "docx";

import {
  formatearFecha,
  calcularNombreArchivoWord,
  construirEncabezadoPie,
  estilosDocumento,
  PAGE_A4,
  descargarWord,
} from "./wordMotorComun.js";

const ANCHO_TABLA = 10200;
const ANCHO_CANT = 900;

const bordeSuperior = { top: { style: BorderStyle.SINGLE, size: 4, color: "111111" } };

// Nombre de archivo propio (no reusa calcularNombreArchivoWord tal cual
// porque ese arma "...-P{nro}-REV{revision}.docx" pensado para el
// presupuesto; acá el número que identifica al documento es el del
// remito, no el de la revisión de la obra).
const calcularNombreArchivoRemito = ({ cliente, numeroRemito }) => {
  const nombreClienteArchivo = (cliente || "SIN_CLIENTE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  const nroFmt = String(numeroRemito).padStart(5, "0");
  return `REMITO-${nroFmt}-${nombreClienteArchivo}.docx`;
};

// generarRemitoWord: arma el .docx del remito y dispara la descarga.
//
// Parámetros:
//   numeroRemito      — correlativo propio devuelto por POST /remitos
//   numeropres, revision — obra de referencia (para mostrarla, no para numerar)
//   fecha             — fecha del remito (string, se formatea igual que en el presupuesto)
//   cliente, domicilio, telefono1, telefono2 — datos del cliente
//   observaciones     — texto libre opcional
//   items             — [{ nombreart, tipo, color, ancho, alto, profundidad,
//                          cantidad, cantidad_pendiente_restante }]
//                        cantidad = lo que sale EN ESTE remito.
//                        cantidad_pendiente_restante = lo que queda
//                        pendiente después de este remito (puede omitirse).
export async function generarRemitoWord({
  numeroRemito,
  numeropres,
  revision,
  fecha,
  cliente,
  domicilio,
  localidad,
  telefono1,
  telefono2,
  observaciones,
  items,
  setGenerandoWord,
}) {
  const fechaFmt = formatearFecha(fecha);
  const nombreArchivo = calcularNombreArchivoRemito({ cliente, numeroRemito });

  // Agrupa por `tipo` (sección real del ítem), preservando el orden de
  // primera aparición — no hace falta el criterio de orden custom de
  // ordenarSecciones() del presupuesto, porque acá no hay grupos manuales
  // ni línea elegida, es solo para no listar todo plano.
  const secciones = [];
  const porSeccion = new Map();
  for (const it of items) {
    const sec = it.grupo?.trim() || it.tipo || "Otros";
    if (!porSeccion.has(sec)) {
      porSeccion.set(sec, []);
      secciones.push(sec);
    }
    porSeccion.get(sec).push(it);
  }

  const cuerpo = [];

  cuerpo.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: `Obra N° ${numeropres} — Rev. ${revision}`,
          size: 16,
          color: "555555",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: "REMITO DE SALIDA", bold: true, size: 30, allCaps: true }),
      ],
    }),
    new Paragraph({
      tabStops: [{ type: "right", position: ANCHO_TABLA }],
      children: [
        new TextRun({
          text: `Cliente: ${cliente || "Consumidor final"}${domicilio ? ` — ${domicilio}` : ""}`,
        }),
        new TextRun({ text: `\tFecha: ${fechaFmt}` }),
      ],
    }),
    new Paragraph({
      tabStops: [{ type: "right", position: ANCHO_TABLA }],
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `Localidad: ${localidad || "—"}` }),
        new TextRun({ text: `\tTel: ${telefono1 || telefono2 || "—"}` }),
      ],
    }),
  );

  const posDetalle = ANCHO_CANT;
  const filaTabStops = [{ type: "left", position: posDetalle }];

  for (const sec of secciones) {
    const itemsSec = porSeccion.get(sec);

    cuerpo.push(
      new Paragraph({
        spacing: { before: 200, after: 60 },
        children: [new TextRun({ text: `${sec}:`, bold: true, italics: true, allCaps: true })],
      }),
      new Paragraph({
        tabStops: filaTabStops,
        spacing: { after: 40 },
        children: [new TextRun({ text: "Cant\tDetalle", bold: true, size: 18 })],
      }),
    );

    for (const item of itemsSec) {
      const medidas =
        item.ancho && item.alto ? ` (${item.ancho} × ${item.alto} cm)` : "";
      const primeraLinea = [
        new TextRun({ text: `${item.cantidad}\t`, size: 18 }),
        new TextRun({ text: item.nombreart ?? "", size: 18 }),
      ];
      if (medidas) {
        primeraLinea.push(new TextRun({ text: medidas, size: 16, color: "444444" }));
      }
      cuerpo.push(new Paragraph({ tabStops: filaTabStops, children: primeraLinea }));

      if (item.color) {
        cuerpo.push(
          new Paragraph({
            indent: { left: posDetalle },
            children: [
              new TextRun({ text: `Color: ${item.color}`, italics: true, size: 15, color: "555555" }),
            ],
          }),
        );
      }
      if (item.cantidad_pendiente_restante != null) {
        cuerpo.push(
          new Paragraph({
            indent: { left: posDetalle },
            children: [
              new TextRun({
                text:
                  item.cantidad_pendiente_restante > 0
                    ? `Queda pendiente: ${item.cantidad_pendiente_restante}`
                    : "Entrega completa de este ítem",
                italics: true,
                size: 15,
                color: item.cantidad_pendiente_restante > 0 ? "b45309" : "1a7a3a",
              }),
            ],
          }),
        );
      }
    }
  }

  if (observaciones) {
    cuerpo.push(
      new Paragraph({
        spacing: { before: 260, after: 100 },
        border: bordeSuperior,
        children: [new TextRun({ text: "Observaciones", bold: true, italics: true, allCaps: true, size: 18 })],
      }),
    );
    observaciones.split("\n").forEach((linea) => {
      cuerpo.push(new Paragraph({ children: [new TextRun({ text: linea, size: 16 })] }));
    });
  }

  // Espacio de firma de conformidad de entrega — lo esperable en un
  // remito físico, que el presupuesto no necesita.
  cuerpo.push(
    new Paragraph({ text: "", spacing: { before: 600 } }),
    new Paragraph({
      tabStops: [{ type: "right", position: ANCHO_TABLA }],
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "999999" } },
      children: [
        new TextRun({ text: "Recibí conforme", size: 16 }),
        new TextRun({ text: "\tAclaración y DNI", size: 16 }),
      ],
    }),
  );

  const { headerFirst, headerDefault, footer } = await construirEncabezadoPie({
    nro: numeroRemito,
    revision: null,
    etiqueta: "Remito",
  });

  const doc = new Document({
    styles: estilosDocumento,
    sections: [
      {
        properties: { page: PAGE_A4, titlePage: true },
        headers: { first: headerFirst, default: headerDefault },
        footers: { first: footer, default: footer },
        children: cuerpo,
      },
    ],
  });

  await descargarWord({ doc, nombreArchivo, setGenerandoWord });
}
