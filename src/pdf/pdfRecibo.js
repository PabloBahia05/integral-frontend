// pdfRecibo.js
// Genera el PDF de un recibo reusando el motor compartido de
// pdfMotorComun.js — mismo membrete (se estampa solo, vía descargarPDF),
// mismo CSS "máquina de escribir" (.page/.doc-title/.info-line/.footer,
// etc.) y mismo mecanismo de descarga (html2pdf.js) que pdfPresupuesto.js
// y pdfConfirmado.js. Acá solo se arma el HTML propio del recibo — no hay
// nada de esto duplicado.

import { formatPeso, formatearFecha, descargarPDF } from "./pdfMotorComun.js";

// generarPdfRecibo: arma el HTML del recibo y dispara la descarga.
//  - recibo: lo que devuelve POST /recibos (numero, monto, concepto,
//    creado_en, numeropres, revision)
//  - cliente: { nombre, telefono1 } — ya en memoria en la pantalla, no hace
//    falta volver a pedirlo
//  - obra: { numeropres, revision } si el recibo está vinculado a una obra
//    puntual, o null/undefined si no
//  - setGenerandoPDF: setter de estado para reflejar "Generando..." en el
//    botón (mismo patrón que usan los otros dos PDF)
export function generarPdfRecibo(recibo, cliente, obra, setGenerandoPDF) {
  const nroRecibo = String(recibo.numero).padStart(6, "0");
  const fechaFmt = formatearFecha(
    recibo.creado_en ? recibo.creado_en.slice(0, 10) : null,
  );
  const nombreArchivo = `RECIBO-N${nroRecibo}.pdf`;

  const pageHTML = `
<div class="page">
<div class="doc-nro-corner">Recibo N° ${nroRecibo}</div>
<div class="doc-title">Recibo</div>
<div class="info-line">
  <span>Recibí de: ${cliente?.nombre || "Consumidor final"}</span>
  <span>Fecha: ${fechaFmt}</span>
</div>
<div class="info-line">
  <span>Tel: ${cliente?.telefono1 || "—"}</span>
  <span>${obra ? `Obra: Presupuesto N° ${obra.numeropres} rev.${obra.revision}` : "Sin obra vinculada"}</span>
</div>

<div class="body">
  <div style="text-align:center; margin: 50px 0 60px;">
    <div style="font-size: 12px; color:#555;">La suma de</div>
    <div style="font-size: 30px; font-weight:700; margin-top:10px;">${formatPeso(recibo.monto)}</div>
    <div style="font-size:12px; margin-top: 12px;">En concepto de: ${recibo.concepto || "Anticipo"}</div>
  </div>

  <div style="display:flex; justify-content:space-between; margin-top:100px;">
    <div style="text-align:center; width:45%; border-top:1px solid #111; padding-top:6px; font-size:11px;">Firma</div>
    <div style="text-align:center; width:45%; border-top:1px solid #111; padding-top:6px; font-size:11px;">Aclaración</div>
  </div>
</div>

<div class="footer">
  <div>Daniel Roque S.R.L. — Bahía Blanca</div>
  <div>Recibo N° ${nroRecibo}</div>
</div>
</div>`;

  descargarPDF({
    pageHTML,
    nombreArchivo,
    imagenesFinal: [], // el recibo no lleva adjuntos, así que nunca entra en la rama de fusión con pdf-lib
    setGenerandoPDF: setGenerandoPDF ?? (() => {}),
  });
}
