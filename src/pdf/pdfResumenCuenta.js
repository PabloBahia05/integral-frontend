// pdfResumenCuenta.js
// Genera el PDF de "Resumen de cuenta" de un cliente en Cuenta Corriente.
//
// Usa el mismo motor compartido que pdfPresupuesto.js / pdfConfirmado.js
// (pdfMotorComun.js: descargarPDF + styleCSS), en vez de importar
// html2pdf.js directamente — así no depende de una librería npm aparte y
// queda con el mismo look monospace tipo factura que el resto de los PDF
// de la app.

import { descargarPDF, styleCSS } from "./pdfMotorComun.js";

function fmtMoneda(v) {
  const n = Number(v ?? 0);
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  });
}

function fmtHoy() {
  return new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function calcularNombreArchivo(cliente) {
  const base = (cliente?.nombre || "cliente")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return `resumen-cuenta-${base}.pdf`;
}

/**
 * @param {Object} params
 * @param {Object} params.cliente - { nombre, codcliente, telefono1 }
 * @param {number} params.saldoFinal
 * @param {Array<{fecha:string, tipo:string, concepto:string, monto:number, saldo:number}>} params.movimientos
 * @param {(v: boolean) => void} params.setGenerandoPDF - setter de estado para mostrar loading mientras se genera
 */
export function generarPdfResumenCuenta({
  cliente,
  saldoFinal,
  movimientos,
  setGenerandoPDF,
}) {
  const filas = (movimientos ?? [])
    .map(
      (m) => `
        <tr>
          <td>${m.fecha ?? ""}</td>
          <td>${m.tipo ?? ""}</td>
          <td>${m.concepto ?? "—"}</td>
          <td class="right" style="color:${m.monto >= 0 ? "#c0392b" : "#1a7a3a"}">
            ${m.monto >= 0 ? "+" : ""}${fmtMoneda(m.monto)}
          </td>
          <td class="right">${fmtMoneda(m.saldo)}</td>
        </tr>`,
    )
    .join("");

  const pageHTML = `
    <div class="page">
      <div class="doc-nro-corner">Generado el ${fmtHoy()}</div>
      <div class="doc-title">Resumen de cuenta corriente</div>

      <div class="info-line">
        <span><strong>${cliente?.nombre ?? ""}</strong></span>
        <span>Cód. cliente: ${cliente?.codcliente ?? ""}</span>
      </div>
      ${
        cliente?.telefono1
          ? `<div class="info-line right-only"><span>Tel: ${cliente.telefono1}</span></div>`
          : ""
      }

      <div class="body">
        <div class="tabla-block">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th class="right">Monto</th>
                <th class="right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              ${filas || `<tr><td colspan="5" style="text-align:center;color:#888;">Sin movimientos</td></tr>`}
            </tbody>
          </table>
        </div>

        <div class="totals-final">
          <div class="t-row">
            Saldo final:
            <span style="color:${saldoFinal > 0 ? "#c0392b" : "#1a7a3a"};margin-left:6px;">
              ${fmtMoneda(saldoFinal)}
            </span>
          </div>
        </div>
      </div>

      <div class="footer">
        <span>Daniel Roque S.R.L.</span>
        <span>${fmtHoy()}</span>
      </div>
    </div>
  `;

  descargarPDF({
    pageHTML,
    nombreArchivo: calcularNombreArchivo(cliente),
    imagenesFinal: [],
    setGenerandoPDF: setGenerandoPDF ?? (() => {}),
  });
}

// Exportado por si algún caller quiere reusar el CSS compartido sin pasar
// por descargarPDF (por ejemplo, para previsualizar en pantalla).
export { styleCSS };
