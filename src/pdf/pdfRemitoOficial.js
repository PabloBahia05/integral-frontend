import { jsPDF } from "jspdf";

// ──────────────────────────────────────────────────────────────────────
// Remito oficial — SOLO texto para imprimir sobre el talonario
// pre-impreso (sin líneas, bordes ni membrete: eso ya lo trae el papel).
//
// Coordenadas recalibradas a partir de prueba_1.jpeg (impresión de
// prueba superpuesta al talonario), midiendo en píxeles contra un
// grid de referencia y convirtiendo a mm asumiendo hoja A4
// (210x297mm). Igual conviene una prueba final impresa/trasluz para
// confirmar el calce milimétrico exacto, porque una foto siempre
// tiene algo de distorsión de perspectiva.
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

  fecha: {
    dia: { x: 143, y: 45 },
    mes: { x: 157, y: 45 },
    anio: { x: 172, y: 45 },
  },

  cliente: { x: 26, y: 79 },
  domicilio: { x: 23, y: 88 }, // "Calle:" — sin confirmar con datos reales todavía
  ciudad: { x: 145, y: 88 }, // "Localidad:" — sin confirmar con datos reales todavía

  // TODO: confirmar en qué casillero del talonario va "obra" (este
  // formulario no tiene un campo impreso que diga "Obra"). Candidatos
  // visibles en el papel: "N° Orden de Compra N°" o "Fact. Nro".
  // Valor actual sin calibrar — hace que el dato caiga dentro de la
  // tabla de ítems, por eso el doc.text de obra queda comentado abajo.
  obra: { x: 130, y: 105 },

  items: {
    startY: 197, // Y de la primera línea de ítems — calzó bien en la prueba
    rowHeight: 8, // separación vertical entre líneas — confirmado, calza justo
    colCantidad: 3.4,
    colGrupo: 11,
    colCodigo: 18,
    colNombre: 35,
    colMedidas: 124,
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
 */
export function generarPdfRemitoOficial(datos) {
  const doc = new jsPDF({ unit: "mm", format: CONFIG.pageSize });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(CONFIG.fontSize);

  const f = datos.fecha ? new Date(datos.fecha) : new Date();
  doc.text(String(f.getDate()), CONFIG.fecha.dia.x, CONFIG.fecha.dia.y);
  doc.text(String(f.getMonth() + 1), CONFIG.fecha.mes.x, CONFIG.fecha.mes.y);
  doc.text(String(f.getFullYear()), CONFIG.fecha.anio.x, CONFIG.fecha.anio.y);

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
  // CONFIG.obra) — con la posición vieja caía dentro de la tabla de ítems.
  // if (datos.obra != null) {
  //   doc.text(String(datos.obra), CONFIG.obra.x, CONFIG.obra.y);
  // }

  doc.setFontSize(CONFIG.fontSizeItems);
  const {
    startY,
    rowHeight,
    colCantidad,
    colGrupo,
    colCodigo,
    colNombre,
    colMedidas,
  } = CONFIG.items;

  (datos.items || []).forEach((it, i) => {
    const y = startY + i * rowHeight;
    doc.text(String(it.cantidad ?? ""), colCantidad, y);
    doc.text(String(it.grupo ?? ""), colGrupo, y);
    doc.text(String(it.codart ?? ""), colCodigo, y);
    doc.text(String(it.nombreart ?? ""), colNombre, y);
    doc.text(fmtMedidas(it), colMedidas, y);
  });

  doc.save(`remito-oficial-${datos.numeroRemito ?? "borrador"}.pdf`);
}

// Se exporta CONFIG aparte para poder tocar coordenadas puntuales desde
// afuera si hace falta (ej. una pantalla de calibración) sin duplicar
// el archivo entero.
export { CONFIG as CONFIG_REMITO_OFICIAL };
