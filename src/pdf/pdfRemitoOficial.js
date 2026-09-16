import { jsPDF } from "jspdf";

// ──────────────────────────────────────────────────────────────────────
// Remito oficial — SOLO texto para imprimir sobre el talonario
// pre-impreso (sin líneas, bordes ni membrete: eso ya lo trae el papel).
//
// Las coordenadas de CONFIG son una PRIMERA APROXIMACIÓN sacada a ojo
// de una captura de pantalla, no de una medición real del papel. Hay
// que imprimir una hoja de prueba (sobre el talonario real, o mejor
// primero sobre una hoja blanca superpuesta a trasluz) y corregir los
// valores de CONFIG en mm hasta que el texto caiga en cada casillero.
//
// Unidad: milímetros. Origen (0,0) arriba a la izquierda de la hoja.
// ──────────────────────────────────────────────────────────────────────

const CONFIG = {
  pageSize: "a4", // cambiar a "letter" si el talonario es carta/oficio
  fontSize: 10,
  fontSizeItems: 9,

  fecha: {
    dia: { x: 126, y: 59 },
    mes: { x: 148, y: 59 },
    anio: { x: 156, y: 59 },
  },
  numero: { x: 126, y: 85 },

  cliente: { x: 32, y: 111 },
  domicilio: { x: 32, y: 129 },
  ciudad: { x: 124, y: 129 },
  obra: { x: 130, y: 148 },

  items: {
    startY: 197, // Y de la primera línea de ítems
    rowHeight: 8, // separación vertical entre líneas
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
 *   numeroRemito: 3967 | null,
 *   cliente: "UDUT RUBEN",
 *   domicilio: "WHITCOMB 2337",
 *   ciudad: "BAHIA BLANCA",
 *   obra: 41,
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

  if (datos.numeroRemito != null) {
    doc.text(String(datos.numeroRemito), CONFIG.numero.x, CONFIG.numero.y);
  }
  if (datos.cliente) {
    doc.text(String(datos.cliente), CONFIG.cliente.x, CONFIG.cliente.y);
  }
  if (datos.domicilio) {
    doc.text(String(datos.domicilio), CONFIG.domicilio.x, CONFIG.domicilio.y);
  }
  if (datos.ciudad) {
    doc.text(String(datos.ciudad), CONFIG.ciudad.x, CONFIG.ciudad.y);
  }
  if (datos.obra != null) {
    doc.text(String(datos.obra), CONFIG.obra.x, CONFIG.obra.y);
  }

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
