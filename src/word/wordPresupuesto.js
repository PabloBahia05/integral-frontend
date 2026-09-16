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

// Ancho útil de la página (twips) = ancho A4 - márgenes izq/der definidos
// en PAGE_A4 (11906 - 850 - 850 = 10206, redondeado). Ya NO arma un Table
// de docx (eso seguía generando un objeto "tabla" de Word aunque no tuviera
// bordes visibles: se podía seleccionar como bloque, tenía el ícono de
// arrastre, etc.). En su lugar, cada fila es un Paragraph con `tabStops`
// —igual mecanismo que ya se usaba en el encabezado del documento
// (Cliente: ... \tFecha: ...)— así el texto queda alineado en columnas
// pero es texto plano, sin ningún objeto tabla debajo.
const ANCHO_TABLA = 10200;
const ANCHO_CANT = 700;
const ANCHO_PRECIO = 1500;

// Calcula el ancho "virtual" de cada columna según cuántas columnas de
// precio/línea tenga este grupo — mismo criterio que las columnas
// dinámicas del <table> en pdfPresupuesto.js, pero acá los anchos se usan
// para calcular POSICIONES de tabulador, no anchos de celda.
const anchosColumnas = ({ mostrarCosto, cantColumnasPrecio }) => {
  const fijos = ANCHO_CANT + (mostrarCosto ? ANCHO_PRECIO : 0) + cantColumnasPrecio * ANCHO_PRECIO;
  return { cant: ANCHO_CANT, costo: ANCHO_PRECIO, precio: ANCHO_PRECIO, detalle: ANCHO_TABLA - fijos };
};

// Único separador que se conserva a propósito (línea sobre "Total:"),
// mismo criterio visual que la línea del footer o la de "colocación no
// incluida" más abajo en este archivo — es un borde de párrafo, no de
// tabla, así que no reintroduce el problema.
const bordeSuperiorTotal = { top: { style: BorderStyle.SINGLE, size: 4, color: "111111" } };

// A partir de los anchos de columna de un grupo, calcula las posiciones
// (en twips) de los tabuladores de sus filas: dónde empieza "Detalle"
// (tab izquierdo) y dónde termina cada columna de Costo/Precio (tab
// derecho, para que el monto quede alineado a la derecha de esa columna).
const tabsDeFila = ({ anchos, mostrarCosto, cantColumnasPrecio }) => {
  const posDetalle = anchos.cant;
  let acc = posDetalle + anchos.detalle;
  let posCostoFin = null;
  if (mostrarCosto) {
    acc += anchos.costo;
    posCostoFin = acc;
  }
  const preciosRightEdges = [];
  for (let i = 0; i < cantColumnasPrecio; i++) {
    acc += anchos.precio;
    preciosRightEdges.push(acc);
  }
  return {
    posDetalle,
    preciosRightEdges,
    filaTabStops: [
      { type: "left", position: posDetalle },
      ...(posCostoFin != null ? [{ type: "right", position: posCostoFin }] : []),
      ...preciosRightEdges.map((p) => ({ type: "right", position: p })),
    ],
  };
};

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
    const { posDetalle, preciosRightEdges, filaTabStops } = tabsDeFila({
      anchos,
      mostrarCosto,
      cantColumnasPrecio,
    });

    // Encabezado de columnas: una sola línea de texto en negrita con
    // tabuladores, no una fila de tabla.
    let encabezadoTxt = "Cant\tDetalle";
    if (mostrarCosto) encabezadoTxt += "\tCosto";
    if (mostrarLineasSec) {
      columnasLineaSec.forEach((col) => {
        encabezadoTxt += `\tLínea ${col.linea.linea}`;
      });
    } else if (usarColumnaUnicaPlacard) {
      encabezadoTxt += "\tPrecio";
    } else if (incluirPrecio) {
      encabezadoTxt += "\tPrecio unit.";
    }
    cuerpo.push(
      new Paragraph({
        tabStops: filaTabStops,
        spacing: { after: 40 },
        children: [new TextRun({ text: encabezadoTxt, bold: true, size: 18 })],
      }),
    );

    // Filas de ítems: una línea principal (Cant, Detalle, Costo/Precio,
    // alineados con tabulaciones) + líneas adicionales indentadas para
    // descripción, accesorios y foto de mampara.
    for (const item of items) {
      const primeraLinea = [
        new TextRun({ text: `${item.cantidad ?? 1}\t`, size: 18 }),
        new TextRun({ text: item.nombreart ?? "", size: 18 }),
      ];
      if ((item.seccion === "Mampara" || item.seccion === "Puerta") && item.ancho && item.alto) {
        primeraLinea.push(new TextRun({ text: ` (${item.ancho} × ${item.alto} cm)`, size: 16, color: "444444" }));
      }
      if (mostrarCosto) {
        primeraLinea.push(
          new TextRun({ text: `\t${item.costo != null ? formatPeso(item.costo) : "—"}`, size: 18 }),
        );
      }
      if (mostrarLineasSec) {
        columnasLineaSec.forEach((col) => {
          const pr = incluirPrecio ? (item.precios?.[col.idx]?.precio ?? item.precio ?? 0) : "";
          primeraLinea.push(new TextRun({ text: `\t${incluirPrecio ? formatPeso(pr) : ""}`, size: 18 }));
        });
      } else if (usarColumnaUnicaPlacard) {
        primeraLinea.push(new TextRun({ text: `\t${incluirPrecio ? formatPeso(item.precio) : ""}`, size: 18 }));
      } else if (incluirPrecio) {
        primeraLinea.push(new TextRun({ text: `\t${formatPeso(item.precio)}`, size: 18 }));
      }
      cuerpo.push(new Paragraph({ tabStops: filaTabStops, children: primeraLinea }));

      if (querDescripcion && item.descripcion && item.descripcion !== item.nombreart) {
        cuerpo.push(
          new Paragraph({
            indent: { left: posDetalle },
            children: [new TextRun({ text: item.descripcion, italics: true, size: 16, color: "444444" })],
          }),
        );
      }
      if (Array.isArray(item.accesorios) && item.accesorios.length > 0) {
        cuerpo.push(
          new Paragraph({
            indent: { left: posDetalle },
            children: [new TextRun({ text: `Accesorios: ${item.accesorios.join(", ")}`, size: 15, color: "555555" })],
          }),
        );
      }
      if (item.seccion === "Mampara" && fotosMamparaPorModelo[item.descripcion]) {
        cuerpo.push(
          new Paragraph({
            indent: { left: posDetalle },
            children: [await imageRunEscalado(fotosMamparaPorModelo[item.descripcion], 100, 220)],
          }),
        );
      }
    }

    // Línea de total del grupo — único separador real: una línea fina
    // arriba (borde de párrafo, no de tabla).
    const totalTabStops =
      cantColumnasPrecio > 0
        ? preciosRightEdges.map((p) => ({ type: "right", position: p }))
        : [{ type: "right", position: ANCHO_TABLA }];
    const totalChildren = [new TextRun({ text: "Total:", bold: true, size: 18 })];
    if (mostrarLineasSec) {
      subtotalesPorColumnaSec.forEach((col) =>
        totalChildren.push(new TextRun({ text: `\t${formatPeso(col.subtotal)}`, bold: true, size: 18 })),
      );
    } else {
      totalChildren.push(new TextRun({ text: `\t${formatPeso(subtotalSec)}`, bold: true, size: 18 }));
    }
    cuerpo.push(
      new Paragraph({
        tabStops: totalTabStops,
        spacing: { before: 80, after: 80 },
        border: bordeSuperiorTotal,
        children: totalChildren,
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
