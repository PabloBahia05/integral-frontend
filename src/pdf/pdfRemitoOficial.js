import { jsPDF } from "jspdf";

// ──────────────────────────────────────────────────────────────────────
// Remito oficial — SOLO texto para imprimir sobre el talonario
// pre-impreso (sin líneas, bordes ni membrete: eso ya lo trae el papel).
//
// Coordenadas recalibradas (21/09/2026) a partir de la foto de la
// impresión de prueba sobre el talonario. En vez de medir "a ojo" contra
// una grilla, se ajustó una homografía foto → mm con 10 puntos del texto
// impreso (error < 0.4 mm) y con ella se convirtieron a mm las líneas y
// casilleros del talonario (las columnas verticales dieron el mismo valor
// en mm a distintas alturas, o sea que la corrección de perspectiva es
// consistente). Igual conviene una prueba final impresa/trasluz.
//
// Medidas del talonario (mm, origen arriba a la izquierda, hoja A4):
//   Casilleros de fecha: Día 133.0–144.4 | Mes 148.3–159.6 | Año 162.6–173.9
//                        (zona de escritura y 48.3–55.8)
//   Tabla de ítems:      Cantidad 12.8–31.5 | Código 31.5–49.6 |
//                        Detalle 49.6–165 | Precio 165–191
//   Filas:               19 filas, primera línea en y=118.7, paso 6.35 mm
//                        (1/4")
//
// Unidad: milímetros. Origen (0,0) arriba a la izquierda de la hoja.
// ──────────────────────────────────────────────────────────────────────

const CONFIG = {
  pageSize: "a4", // cambiar a "letter" si el talonario es carta/oficio
  fontSize: 10,
  fontSizeItems: 9,

  // OJO: en el talonario en blanco, "N° 0001 — 00011843" ya viene
  // PREIMPRESO de fábrica. No hay espacio en blanco para escribir un
  // número nuestro ahí — por eso este bloque queda comentado más abajo
  // en generarPdfRemitoOficial(). Si en algún momento cambian a un
  // talonario sin numeración preimpresa, reactivarlo y calibrar x/y.
  numero: { x: 126, y: 85 },

  // x = CENTRO de cada casillero (se imprime con align:"center"),
  // y = línea base del texto, apoyado sobre el piso del casillero.
  fecha: {
    dia: { x: 138.7, y: 54.2 },
    mes: { x: 154.0, y: 54.2 },
    anio: { x: 168.3, y: 54.2 },
  },

  // x = donde empieza el renglón punteado (justo después de la etiqueta),
  // y = línea base apenas por encima del punteado.
  cliente: { x: 36, y: 84.8 }, // "Señor (es):"
  domicilio: { x: 27.6, y: 93.2 }, // "Calle:"
  ciudad: { x: 134.1, y: 93.2 }, // "Localidad:"

  // TODO: confirmar en qué casillero va "obra" (este formulario no tiene
  // un campo impreso que diga "Obra"). Candidatos: "N° Orden de Compra N°"
  // (coordenadas de abajo, ya calibradas sobre su renglón punteado) o
  // "Fact. Nro" (aprox. x=144, y=109.6). Sigue desactivado más abajo.
  obra: { x: 150, y: 101.4 },

  items: {
    startY: 123.5, // línea base de la 1ª fila (línea inferior de la fila: 125.1)
    rowHeight: 6.35, // paso real de las filas del talonario (1/4")
    maxFilas: 19, // filas que entran entre el encabezado y el pie
    colCantidad: 22.2, // CENTRO de la columna "Cantidad" (12.8–31.5)
    colCodigo: 33, // columna "Código" (31.5–49.6), alineado a la izquierda
    // "grupo" (BAJOMESADA, ANEXO…) no tiene columna propia en este
    // talonario: va al principio de la columna DETALLE, antes del nombre.
    colGrupo: 51.1,
    colNombre: 75,
    colMedidas: 141, // las medidas van al final de DETALLE (termina en 165)
    finDetalle: 163.5, // borde derecho utilizable de DETALLE
  },
};

// "60 X 60 X 60" para muebles con profundidad (esquineros), "50 X 60"
// para el resto — mismo criterio que se ve en el talonario de ejemplo.
function fmtMedidas(it) {
  const partes = [it.ancho, it.alto, it.profundidad].filter(
    (v) => v !== undefined && v !== null && v !== "",
  );
  return partes.length ? partes.join(" X ") : "";
}

// Los strings "YYYY-MM-DD" (o ISO con hora) se leen por su parte de fecha.
// new Date("2026-09-20") se interpreta en UTC y en Argentina (UTC-3)
// getDate() devolvería 19.
function parseFecha(f) {
  if (!f) return new Date();
  if (f instanceof Date) return f;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(f));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(f);
}

// Imprime el texto achicando la fuente (hasta minSize) si no entra en
// anchoMax; si aun así no entra, lo corta. Restaura el tamaño base.
function textoAjustado(doc, texto, x, y, anchoMax, sizeBase, minSize = 6.5) {
  let size = sizeBase;
  doc.setFontSize(size);
  while (size > minSize && doc.getTextWidth(texto) > anchoMax) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  const linea =
    doc.getTextWidth(texto) > anchoMax
      ? doc.splitTextToSize(texto, anchoMax)[0]
      : texto;
  doc.text(linea, x, y);
  doc.setFontSize(sizeBase);
}

function dibujarEncabezado(doc, datos) {
  doc.setFontSize(CONFIG.fontSize);

  const f = parseFecha(datos.fecha);
  doc.text(String(f.getDate()), CONFIG.fecha.dia.x, CONFIG.fecha.dia.y, {
    align: "center",
  });
  doc.text(String(f.getMonth() + 1), CONFIG.fecha.mes.x, CONFIG.fecha.mes.y, {
    align: "center",
  });
  doc.text(String(f.getFullYear()), CONFIG.fecha.anio.x, CONFIG.fecha.anio.y, {
    align: "center",
  });

  // Desactivado: el número ya viene preimpreso en el talonario (ver nota
  // en CONFIG.numero). Reactivar solo si cambian de talonario.
  // if (datos.numeroRemito != null) {
  //   doc.text(String(datos.numeroRemito), CONFIG.numero.x, CONFIG.numero.y);
  // }

  if (datos.cliente) {
    doc.text(String(datos.cliente), CONFIG.cliente.x, CONFIG.cliente.y);
  }
  if (datos.domicilio) {
    doc.text(String(datos.domicilio), CONFIG.domicilio.x, CONFIG.domicilio.y);
  }
  if (datos.ciudad) {
    doc.text(String(datos.ciudad), CONFIG.ciudad.x, CONFIG.ciudad.y);
  }

  // Desactivado hasta confirmar en qué casillero va "obra" (ver TODO en
  // CONFIG.obra).
  // if (datos.obra != null) {
  //   doc.text(String(datos.obra), CONFIG.obra.x, CONFIG.obra.y);
  // }
}

/**
 * datos = {
 *   fecha: "2026-09-15" | Date,
 *   numeroRemito: 3967 | null,   // ver nota en CONFIG.numero: no se imprime
 *   cliente: "UDUT RUBEN",
 *   domicilio: "WHITCOMB 2337",
 *   ciudad: "BAHIA BLANCA",
 *   obra: 41,                    // ver TODO en CONFIG.obra: no se imprime aún
 *   items: [{ cantidad, grupo, codart, nombreart, ancho, alto, profundidad }],
 * }
 *
 * OJO: "grupo" y "codart" son los nombres de campo que se ven en el
 * ejemplo (ej. "N8" y "10330") — si en pendientesRemito vienen con otro
 * nombre, ajustar acá o al armar el objeto `datos` antes de llamar a
 * esta función.
 *
 * Si hay más ítems que filas en el talonario (CONFIG.items.maxFilas), el
 * PDF sigue en otra página repitiendo el encabezado: cada página va en
 * una hoja distinta del talonario.
 */
export function generarPdfRemitoOficial(datos) {
  const doc = new jsPDF({ unit: "mm", format: CONFIG.pageSize });
  doc.setFont("helvetica", "normal");

  const {
    startY,
    rowHeight,
    maxFilas,
    colCantidad,
    colGrupo,
    colCodigo,
    colNombre,
    colMedidas,
    finDetalle,
  } = CONFIG.items;

  const items = datos.items || [];
  const paginas = Math.max(1, Math.ceil(items.length / maxFilas));

  for (let p = 0; p < paginas; p++) {
    if (p > 0) doc.addPage(CONFIG.pageSize);
    dibujarEncabezado(doc, datos);

    doc.setFontSize(CONFIG.fontSizeItems);
    items.slice(p * maxFilas, (p + 1) * maxFilas).forEach((it, i) => {
      const y = startY + i * rowHeight;
      const medidas = fmtMedidas(it);

      if (it.cantidad != null && it.cantidad !== "") {
        doc.text(String(it.cantidad), colCantidad, y, { align: "center" });
      }
      if (it.codart) {
        textoAjustado(
          doc,
          String(it.codart),
          colCodigo,
          y,
          colGrupo - colCodigo - 1.5,
          CONFIG.fontSizeItems,
        );
      }
      if (it.grupo) {
        textoAjustado(
          doc,
          String(it.grupo),
          colGrupo,
          y,
          colNombre - colGrupo - 1.5,
          CONFIG.fontSizeItems,
        );
      }
      if (it.nombreart) {
        const limite = (medidas ? colMedidas - 2 : finDetalle) - colNombre;
        textoAjustado(
          doc,
          String(it.nombreart),
          colNombre,
          y,
          limite,
          CONFIG.fontSizeItems,
        );
      }
      if (medidas) doc.text(medidas, colMedidas, y);
    });
  }

  doc.save(`remito-oficial-${datos.numeroRemito ?? "borrador"}.pdf`);
}

// Se exporta CONFIG aparte para poder tocar coordenadas puntuales desde
// afuera si hace falta (ej. una pantalla de calibración) sin duplicar
// el archivo entero.
export { CONFIG as CONFIG_REMITO_OFICIAL };
