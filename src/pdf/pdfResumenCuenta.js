// Genera el PDF de "Resumen de cuenta" de un cliente en Cuenta Corriente.
//
// Mismo motor que el resto de los PDF de la app (html2pdf.js: arma un HTML
// off-screen y lo rasteriza). Si en el proyecto el import real de la
// librería es distinto al de abajo (ver pdfPresupuesto.js), ajustar esa
// línea nomás — el resto del archivo no depende de eso.
import html2pdf from "html2pdf.js";

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

/**
 * @param {Object} params
 * @param {Object} params.cliente - { nombre, codcliente, telefono1 }
 * @param {number} params.saldoFinal
 * @param {Array<{fecha:string, tipo:string, concepto:string, monto:number, saldo:number}>} params.movimientos
 */
export function generarPdfResumenCuenta({ cliente, saldoFinal, movimientos }) {
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

  const html = `
    <div id="resumen-cuenta-pdf" style="
      font-family:'Space Mono',monospace;
      color:#0a3a5c;
      width:750px;
      padding:24px;
      box-sizing:border-box;
    ">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0a3a5c;padding-bottom:10px;margin-bottom:16px;">
        <div>
          <h2 style="margin:0;font-size:18px;">Resumen de cuenta corriente</h2>
          <p style="margin:4px 0 0;font-size:12px;color:#4a8ab5;">Generado el ${fmtHoy()}</p>
        </div>
        <div style="text-align:right;font-size:12px;">
          <div><strong>${cliente?.nombre ?? ""}</strong></div>
          <div>Cód. cliente: ${cliente?.codcliente ?? ""}</div>
          ${cliente?.telefono1 ? `<div>Tel: ${cliente.telefono1}</div>` : ""}
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="background:#0a3a5c;color:#fff;">
            <th style="padding:6px 8px;text-align:left;">Fecha</th>
            <th style="padding:6px 8px;text-align:left;">Tipo</th>
            <th style="padding:6px 8px;text-align:left;">Concepto</th>
            <th style="padding:6px 8px;text-align:right;">Monto</th>
            <th style="padding:6px 8px;text-align:right;">Saldo</th>
          </tr>
        </thead>
        <tbody>
          ${filas || `<tr><td colspan="5" style="padding:10px;text-align:center;color:#8aabb8;">Sin movimientos</td></tr>`}
        </tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;margin-top:16px;padding-top:10px;border-top:1px solid #b8cfe0;">
        <div style="font-size:13px;font-weight:700;">
          Saldo final:
          <span style="color:${saldoFinal > 0 ? "#c0392b" : "#1a7a3a"};margin-left:6px;">
            ${fmtMoneda(saldoFinal)}
          </span>
        </div>
      </div>
    </div>

    <style>
      #resumen-cuenta-pdf table td, #resumen-cuenta-pdf table th { border-bottom: 1px solid #e0e8ee; }
      #resumen-cuenta-pdf table td.right, #resumen-cuenta-pdf table th.right { text-align: right; }
    </style>
  `;

  const contenedor = document.createElement("div");
  contenedor.style.position = "fixed";
  contenedor.style.left = "-9999px";
  contenedor.style.top = "0";
  contenedor.innerHTML = html;
  document.body.appendChild(contenedor);

  const nombreArchivo = `resumen-cuenta-${(cliente?.nombre || "cliente")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}.pdf`;

  html2pdf()
    .from(contenedor.querySelector("#resumen-cuenta-pdf"))
    .set({
      margin: 10,
      filename: nombreArchivo,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .save()
    .catch((err) => {
      console.error("Error generando PDF de resumen de cuenta:", err);
      alert("No se pudo generar el PDF del resumen de cuenta.");
    })
    .finally(() => {
      document.body.removeChild(contenedor);
    });
}
