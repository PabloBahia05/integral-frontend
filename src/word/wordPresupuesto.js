// wordPresupuesto.js
// Lógica de generación del WORD del presupuesto EN ETAPA DE PRESUPUESTO
// (no confirmado) — versión editable de pdfPresupuesto.js, mismos
// principios de presentación (orden de secciones, franjas de color/manija,
// totales por línea, texto de seña, etc.), pero armada con la librería
// `docx` en vez de HTML+html2pdf.
//
// Mismo reparto que en el PDF: lo que es igual entre presupuesto y obra
// confirmada (logo, tipografía, franjas, mecanismo de descarga) vive en
// wordMotorComun.js; acá solo queda lo propio de este caso — columnas de
// línea por grupo y totales (para el caso confirmado, si se agrega más
// adelante, ver wordConfirmado.js con el mismo criterio que pdfConfirmado.js).
//
// Recibe los mismos parámetros que generarPresupuestoPDF (ver
// pdfPresupuesto.js) — así se puede llamar desde el mismo lugar del
// componente, solo cambiando qué función se invoca.

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from "docx";

import {
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
  calcularNombreArchivoWord,
  franjaColorRuns,
  franjaManijaRuns,
  imageRunEscalado,
  construirEncabezadoPie,
  estilosDocumento,
  PAGE_A4,
  descargarWord,
} from "./wordMotorComun.js";

// Ancho útil de la tabla (twips) = ancho de página A4 - márgenes izq/der
// definidos en PAGE_A4 (11906 - 850 - 850 = 10206, redondeado).
const ANCHO_TABLA = 10200;
const ANCHO_CANT = 700;
const ANCHO_PRECIO = 1500;

// Calcula el ancho de cada columna según cuántas columnas de precio/línea
// tenga la tabla de este grupo — mismo criterio que las columnas
// dinámicas del <table> en pdfPresupuesto.js.
const anchosColumnas = ({ mostrarCosto, cantColumnasPrecio }) => {
  const fijos = ANCHO_CANT + (mostrarCosto ? ANCHO_PRECIO : 0) + cantColumnasPrecio * ANCHO_PRECIO;
  return { cant: ANCHO_CANT, costo: ANCHO_PRECIO, precio: ANCHO_PRECIO, detalle: ANCHO_TABLA - fijos };
};

const bordeSuperior = { top: { style: BorderStyle.SINGLE, size: 4, color: "111111" } };

// Sin esto, docx dibuja por defecto una grilla completa (arriba, abajo,
// izquierda, derecha e internas) en cada Table que no declara `borders`
// — es lo que generaba el recuadro cerrando cada celda. Al ponerlo en
// NONE en las cuatro tablas de abajo, el layout por columnas se mantiene
// (sigue siendo un Table, por eso el texto queda alineado), pero ya no
// se ve ninguna línea salvo la que agrega a propósito celdaSimple con
// `borde: true` (el único separador que se conserva: el que marca el
// total de cada grupo, mismo criterio visual que la línea del footer o
// la de "colocación no incluida" más abajo en este archivo).
const SIN_BORDES_TABLA = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

const celdaSimple = (texto, { width, bold = false, align = AlignmentType.LEFT, borde }) =>
  new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: borde ? bordeSuperior : undefined,
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text: String(texto ?? ""), bold, size: 18 })],
      }),
    ],
  });

// generarPresupuestoWord: arma el .docx del presupuesto (etapa de
// presupuesto, TODAS las líneas de precio activas) y dispara la descarga.
// Mismos parámetros que generarPresupuestoPDF, cambiando setGenerandoPDF
// por setGenerandoWord.
export async function generarPresupuestoWord({
  querDescripcion,
  fecha,
  numeroPres,
  numero,
  revision,
  cliente,
  domicilio,
  localidad,
  telefono1,
  telefono2,
  observaciones,
  leyenda,
  lineasActivas,
  presupuestoItems,
  grupoDe,
  ordenGrupos,
  mostrarCosto,
  incluirPrecio,
  incluirTotal,
  agregarIVA,
  incluirTextoColoc,
  incluirTextoSena,
  textoSena,
  melaminas,
  manijas,
  imagenesFinal,
  setGenerandoWord,
  authFetch,
}) {
  const fotosMamparaPorModelo = await obtenerFotosMamparaPorModelo(presupuestoItems, authFetch);
  const mapaMelaminasPorCodigo = mapaMelaminas(melaminas);
  const mapaManijasPorCodigo = mapaManijas(manijas);

  const fechaFmt = formatearFecha(fecha);
  const nro = calcularNro({ numeroPres, numero });
  const nombreArchivo = calcularNombreArchivoWord({ cliente, nro, revision });

  const mostrarLineas = lineasActivas.length > 0;
  const secciones = ordenarSecciones({ presupuestoItems, grupoDe, ordenGrupos });
  const esItemPlacard = (it) => (it.seccion || "").startsWith("Placard / ");

  const cuerpo = [];

  // ── Encabezado del documento ──────────────────────────────────────
  cuerpo.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: `N° ${nro} — Rev. ${revision}`, size: 16, color: "555555" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: "PRESUPUESTO", bold: true, size: 30, allCaps: true }),
      ],
    }),
    new Paragraph({
      tabStops: [{ type: "right", position: 10200 }],
      children: [
        new TextRun({
          text: `Cliente: ${cliente || "Consumidor final"}${domicilio ? ` — ${domicilio}` : ""}`,
        }),
        new TextRun({ text: `\tFecha: ${fechaFmt}` }),
      ],
    }),
    new Paragraph({
      tabStops: [{ type: "right", position: 10200 }],
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `Localidad: ${localidad || "—"}` }),
        new TextRun({ text: `\tTel: ${telefono1 || telefono2 || "—"}` }),
      ],
    }),
  );

  if (leyenda) {
    leyenda.split("\n").forEach((linea) => {
      cuerpo.push(
        new Paragraph({
          children: [new TextRun({ text: linea, italics: true, size: 16 })],
        }),
      );
    });
    cuerpo.push(new Paragraph({ text: "" }));
  }

  // ── Un bloque (título + tabla + fotos) por sección/grupo ──────────
  for (const sec of secciones) {
    const items = presupuestoItems.filter((p) => grupoDe(p) === sec);
    const subtotalSec = items.reduce((s, it) => s + (it.subtotal || 0), 0);
    const infoColorSec = colorGrupo(items, mapaMelaminasPorCodigo);
    const infoManijaSec = manijaGrupo(items, mapaManijasPorCodigo);

    const esPlacardSec = items.length > 0 && items.every(esItemPlacard);
    const mostrarLineasSec = mostrarLineas && !esPlacardSec;
    const usarColumnaUnicaPlacard = mostrarLineas && esPlacardSec;
    const columnasLineaSec = mostrarLineasSec
      ? lineasActivas.map((linea, idx) => ({ idx, linea }))
      : [];

    const subtotalesPorColumnaSec = columnasLineaSec.map((col) => {
      const subtotal = items.reduce((s, it) => {
        const pr = parseFloat(it.precios?.[col.idx]?.precio ?? it.precio ?? 0) || 0;
        return s + pr * (parseFloat(it.cantidad) || 1);
      }, 0);
      return { ...col, subtotal };
    });

    // Título de la sección + franjas de color/manija.
    cuerpo.push(
      new Paragraph({
        spacing: { before: 200, after: 60 },
        children: [
          new TextRun({ text: `${sec}:`, bold: true, italics: true, allCaps: true }),
          ...franjaColorRuns(infoColorSec),
          ...franjaManijaRuns(infoManijaSec),
        ],
      }),
    );

    const cantColumnasPrecio = mostrarLineasSec
      ? columnasLineaSec.length
      : usarColumnaUnicaPlacard || incluirPrecio
        ? 1
        : 0;
    const anchos = anchosColumnas({ mostrarCosto, cantColumnasPrecio });

    // Encabezado de la tabla.
    const headerCells = [
      celdaSimple("Cant", { width: anchos.cant, bold: true }),
      celdaSimple("Detalle", { width: anchos.detalle, bold: true }),
    ];
    if (mostrarCosto) headerCells.push(celdaSimple("Costo", { width: anchos.costo, bold: true, align: AlignmentType.RIGHT }));
    if (mostrarLineasSec) {
      columnasLineaSec.forEach((col) =>
        headerCells.push(celdaSimple(`Línea ${col.linea.linea}`, { width: anchos.precio, bold: true, align: AlignmentType.RIGHT })),
      );
    } else if (usarColumnaUnicaPlacard) {
      headerCells.push(celdaSimple("Precio", { width: anchos.precio, bold: true, align: AlignmentType.RIGHT }));
    } else if (incluirPrecio) {
      headerCells.push(celdaSimple("Precio unit.", { width: anchos.precio, bold: true, align: AlignmentType.RIGHT }));
    }

    // Filas de ítems.
    const filas = [new TableRow({ children: headerCells, tableHeader: true })];
    for (const item of items) {
      const detalleRuns = [
        new TextRun({ text: item.nombreart ?? "" }),
      ];
      if ((item.seccion === "Mampara" || item.seccion === "Puerta") && item.ancho && item.alto) {
        detalleRuns.push(new TextRun({ text: ` (${item.ancho} × ${item.alto} cm)`, size: 16, color: "444444" }));
      }
      const parrafosDetalle = [new Paragraph({ children: detalleRuns })];

      if (querDescripcion && item.descripcion && item.descripcion !== item.nombreart) {
        parrafosDetalle.push(
          new Paragraph({ children: [new TextRun({ text: item.descripcion, italics: true, size: 16, color: "444444" })] }),
        );
      }
      if (Array.isArray(item.accesorios) && item.accesorios.length > 0) {
        parrafosDetalle.push(
          new Paragraph({
            children: [new TextRun({ text: `Accesorios: ${item.accesorios.join(", ")}`, size: 15, color: "555555" })],
          }),
        );
      }
      if (item.seccion === "Mampara" && fotosMamparaPorModelo[item.descripcion]) {
        parrafosDetalle.push(
          new Paragraph({
            children: [await imageRunEscalado(fotosMamparaPorModelo[item.descripcion], 100, 220)],
          }),
        );
      }

      const celdasFila = [
        celdaSimple(item.cantidad ?? 1, { width: anchos.cant, align: AlignmentType.CENTER }),
        new TableCell({ width: { size: anchos.detalle, type: WidthType.DXA }, children: parrafosDetalle }),
      ];
      if (mostrarCosto) {
        celdasFila.push(
          celdaSimple(item.costo != null ? formatPeso(item.costo) : "—", { width: anchos.costo, align: AlignmentType.RIGHT }),
        );
      }
      if (mostrarLineasSec) {
        columnasLineaSec.forEach((col) => {
          const pr = incluirPrecio ? (item.precios?.[col.idx]?.precio ?? item.precio ?? 0) : "";
          celdasFila.push(celdaSimple(incluirPrecio ? formatPeso(pr) : "", { width: anchos.precio, align: AlignmentType.RIGHT }));
        });
      } else if (usarColumnaUnicaPlacard) {
        celdasFila.push(celdaSimple(incluirPrecio ? formatPeso(item.precio) : "", { width: anchos.precio, align: AlignmentType.RIGHT }));
      } else if (incluirPrecio) {
        celdasFila.push(celdaSimple(formatPeso(item.precio), { width: anchos.precio, align: AlignmentType.RIGHT }));
      }
      filas.push(new TableRow({ children: celdasFila }));
    }

    // Fila de total del grupo.
    const labelColspan = 2 + (mostrarCosto ? 1 : 0);
    const totalLabelCell = new TableCell({
      columnSpan: labelColspan,
      width: { size: anchos.cant + anchos.detalle + (mostrarCosto ? anchos.costo : 0), type: WidthType.DXA },
      borders: bordeSuperior,
      children: [new Paragraph({ children: [new TextRun({ text: "Total:", bold: true })] })],
    });
    const celdasMonto = [];
    if (mostrarLineasSec) {
      subtotalesPorColumnaSec.forEach((col) =>
        celdasMonto.push(celdaSimple(formatPeso(col.subtotal), { width: anchos.precio, bold: true, align: AlignmentType.RIGHT, borde: true })),
      );
    } else if (usarColumnaUnicaPlacard || incluirPrecio) {
      celdasMonto.push(celdaSimple(formatPeso(subtotalSec), { width: anchos.precio, bold: true, align: AlignmentType.RIGHT, borde: true }));
    }
    // Si no queda ninguna columna de precio/línea visible, el monto del
    // grupo se agrega igual, dentro de la misma celda del label "Total:"
    // (mismo criterio que sinColumnaMonto en pdfPresupuesto.js).
    if (celdasMonto.length === 0) {
      filas.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: labelColspan,
              width: { size: anchos.cant + anchos.detalle + (mostrarCosto ? anchos.costo : 0), type: WidthType.DXA },
              borders: bordeSuperior,
              children: [new Paragraph({ children: [new TextRun({ text: "Total:", bold: true })] })],
            }),
            celdaSimple(formatPeso(subtotalSec), { width: anchos.precio, bold: true, align: AlignmentType.RIGHT, borde: true }),
          ],
        }),
      );
    } else {
      filas.push(new TableRow({ children: [totalLabelCell, ...celdasMonto] }));
    }

    cuerpo.push(
      new Table({
        width: { size: ANCHO_TABLA, type: WidthType.DXA },
        columnWidths: [anchos.cant, anchos.detalle, ...(mostrarCosto ? [anchos.costo] : []), ...Array(cantColumnasPrecio).fill(anchos.precio)],
        borders: SIN_BORDES_TABLA,
        rows: filas,
      }),
    );

    // Fotos asignadas manualmente a este grupo.
    const fotosSec = imagenesFinal.filter((im) => im.tipo === "imagen" && im.grupo === sec);
    for (const fila of agruparEnFilas(fotosSec)) {
      for (const im of fila) {
        cuerpo.push(new Paragraph({ children: [await imageRunEscalado(im.url, im.anchoPct ?? 100)] }));
      }
    }
    cuerpo.push(new Paragraph({ text: "" }));
  }

  // ── Totales finales ────────────────────────────────────────────────
  if (incluirTotal) {
    const totalGeneral = presupuestoItems.reduce((s, it) => s + (it.subtotal || 0), 0);
    if (mostrarLineas) {
      lineasActivas.forEach((linea, idx) => {
        const total = presupuestoItems.reduce((s, it) => {
          if (esItemPlacard(it)) return s + (parseFloat(it.precio ?? 0) || 0) * (parseFloat(it.cantidad) || 1);
          const pr = parseFloat(it.precios?.[idx]?.precio ?? it.precio ?? 0) || 0;
          return s + pr * (parseFloat(it.cantidad) || 1);
        }, 0);
        cuerpo.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `TOTAL LÍNEA ${linea.linea}: ${formatPeso(total)}`, bold: true, size: 22 })],
          }),
        );
      });
    } else {
      cuerpo.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `TOTAL: ${formatPeso(totalGeneral)}`, bold: true, size: 22 })],
        }),
      );
    }
    if (agregarIVA) {
      cuerpo.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Precios con IVA incluido, sujetos a reajustes", size: 15, color: "555555" })],
        }),
      );
    }
  }

  if (incluirTextoColoc) {
    cuerpo.push(
      new Paragraph({
        spacing: { before: 260, after: 260 },
        border: { top: { style: BorderStyle.DASHED, size: 4, color: "999999" } },
        children: [
          new TextRun({
            text: "La colocación no está incluida en este presupuesto, salvo que se indique lo contrario.",
            italics: true,
            size: 16,
            color: "333333",
          }),
        ],
      }),
    );
  }

  if (observaciones) {
    cuerpo.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [new TextRun({ text: "Observaciones", bold: true, italics: true, allCaps: true })],
      }),
    );
    observaciones.split("\n").forEach((linea) => {
      cuerpo.push(new Paragraph({ children: [new TextRun({ text: linea, size: 16 })] }));
    });
  }

  // Fotos sueltas (sin grupo asignado).
  const fotosSueltas = imagenesFinal.filter((im) => im.tipo === "imagen" && !im.grupo);
  for (const fila of agruparEnFilas(fotosSueltas)) {
    for (const im of fila) {
      cuerpo.push(new Paragraph({ children: [await imageRunEscalado(im.url, im.anchoPct ?? 100)] }));
    }
  }

  // Un .docx no puede "contener" páginas de un PDF ajeno (a diferencia del
  // PDF final, que sí las fusiona con pdf-lib) — se deja constancia en vez
  // de perderlas en silencio.
  const pdfsAdjuntos = imagenesFinal.filter((im) => im.tipo === "pdf");
  if (pdfsAdjuntos.length > 0) {
    cuerpo.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: `Este presupuesto tiene ${pdfsAdjuntos.length} PDF(s) adjunto(s) que no se incluyen en este Word — ver el PDF original para consultarlos.`,
            italics: true,
            size: 16,
            color: "555555",
          }),
        ],
      }),
    );
  }

  if (incluirTextoSena && textoSena) {
    const parrafosSena = textoSena
      .split("\n")
      .map(
        (linea, i) =>
          new Paragraph({
            shading: { type: ShadingType.CLEAR, fill: "FFF59D" },
            border:
              i === 0
                ? { top: { style: BorderStyle.SINGLE, size: 4, color: "D4C400" }, left: { style: BorderStyle.SINGLE, size: 4, color: "D4C400" }, right: { style: BorderStyle.SINGLE, size: 4, color: "D4C400" } }
                : { left: { style: BorderStyle.SINGLE, size: 4, color: "D4C400" }, right: { style: BorderStyle.SINGLE, size: 4, color: "D4C400" } },
            children: [new TextRun({ text: linea, bold: true, size: 16 })],
          }),
      );
    if (parrafosSena.length > 0) {
      const ultimo = parrafosSena.length - 1;
      parrafosSena[ultimo] = new Paragraph({
        shading: { type: ShadingType.CLEAR, fill: "FFF59D" },
        border: {
          left: { style: BorderStyle.SINGLE, size: 4, color: "D4C400" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "D4C400" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "D4C400" },
        },
        children: [new TextRun({ text: textoSena.split("\n")[ultimo], bold: true, size: 16 })],
      });
    }
    cuerpo.push(new Paragraph({ text: "", spacing: { before: 200 } }), ...parrafosSena);
  }

  const { headerFirst, headerDefault, footer } = await construirEncabezadoPie({ nro, revision });

  const doc = new Document({
    styles: estilosDocumento,
    sections: [
      {
        properties: {
          page: PAGE_A4,
          titlePage: true,
        },
        headers: { first: headerFirst, default: headerDefault },
        // Con titlePage:true, si no se pasa footers.first Word deja la
        // primera página sin footer (usa el "default" recién desde la
        // página 2) — se repite el mismo footer para las tres variantes
        // para que el N°/Rev. aparezca en TODAS las hojas, incluida la 1ª.
        footers: { first: footer, default: footer },
        children: cuerpo,
      },
    ],
  });

  await descargarWord({ doc, nombreArchivo, setGenerandoWord });
}
