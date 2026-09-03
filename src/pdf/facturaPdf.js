import { formatPeso } from "./pdfMotorComun";

// facturaPdf.js — arma y exporta (ver / imprimir) el PDF de una factura de
// venta ya emitida (con CAE de AFIP). Extraído de FacturasVenta.jsx para
// que BotonFacturar.jsx pueda ofrecer "Ver PDF"/"Imprimir" apenas se
// genera la factura, sin duplicar 300 líneas de plantilla en los dos
// lugares.
//
// Requiere una fila con la MISMA forma que devuelve GET /facturas-venta
// (con el join a clientes: cliente_nombre, cliente_cuit, cliente_dni,
// cliente_tipofact, cliente_domicilio, cliente_localidad) — no alcanza con
// lo que devuelve POST /facturas/generar/:numeropres solo, por eso
// BotonFacturar pide la fila de vuelta después de facturar (ver
// BotonFacturar.jsx).

const TIPO_CBTE_LABEL = { 1: "A", 6: "B", 11: "C" };
// Código de comprobante AFIP de 2 dígitos que va bajo la letra en el
// recuadro (Cód.01 = Factura A, Cód.06 = Factura B, Cód.11 = Factura C).
const CODIGO_CBTE = { 1: "01", 6: "06", 11: "11" };

// ── Importe en letras ("Pesos Argentinos ... con ... centavos") ──────────
const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const ESPECIALES_10_19 = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
const DECENAS = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

function convertirGrupo(n) {
  // n: 0..999
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  let out = "";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c > 0) out += CENTENAS[c] + " ";
  if (resto >= 10 && resto < 20) {
    out += ESPECIALES_10_19[resto - 10];
  } else if (resto >= 20) {
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    if (resto >= 21 && resto <= 29) {
      out += "VEINTI" + UNIDADES[u].toLowerCase();
      out = out.toUpperCase();
    } else {
      out += DECENAS[d] + (u > 0 ? " Y " + UNIDADES[u] : "");
    }
  } else if (resto > 0) {
    out += UNIDADES[resto];
  }
  return out.trim();
}

// Convierte un número entero (parte entera de los pesos) a letras. Cubre
// hasta 999.999.999 — más que suficiente para una factura de muebles a
// medida. No es exhaustivo en todos los casos límite del idioma (ej. "UN"
// vs "UNO" delante de sustantivo), pero cubre bien los montos típicos de
// esta facturación.
function enteroALetras(n) {
  if (n === 0) return "CERO";
  const millones = Math.floor(n / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;

  let partes = [];
  if (millones > 0) {
    partes.push(
      millones === 1 ? "UN MILLON" : convertirGrupo(millones) + " MILLONES",
    );
  }
  if (miles > 0) {
    partes.push(miles === 1 ? "MIL" : convertirGrupo(miles) + " MIL");
  }
  if (resto > 0) {
    partes.push(convertirGrupo(resto));
  }
  return partes.join(" ").trim();
}

// "Pesos Argentinos <entero en letras> con <centavos> centavos.-" — mismo
// formato que usa el comprobante real de AFIP.
function importeEnLetras(monto) {
  const num = Number(monto) || 0;
  const entero = Math.floor(num);
  const centavos = Math.round((num - entero) * 100);
  return `Pesos Argentinos ${enteroALetras(entero)} con ${centavos} centavos.-`;
}

// CSS específico del layout de factura (recuadro ORIGINAL, grillas con
// bordes, etc.) — separado de styleCSS (que es el de los presupuestos) para
// no pisar sus clases.
const FACTURA_CSS = `
.f-page, .f-page * { box-sizing: border-box; }
.f-page { width: 750px; height: 270mm; display: flex; flex-direction: column; margin: 10px 30px 10px 10px; padding: 16px 20px 30px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; border: 1.5px solid #111; }
.f-original { text-align: center; font-weight: 700; font-size: 13px; letter-spacing: 0.1em; border-bottom: 1.5px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
.f-header { display: flex; border-bottom: 1.5px solid #111; padding-bottom: 8px; margin-bottom: 8px; }
.f-emisor { flex: 1.3; padding-right: 10px; border-right: 1.5px solid #111; }
.f-emisor .f-razon { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.f-emisor .f-linea { font-size: 10px; margin-bottom: 2px; line-height: 1.35; }
.f-tipo-box { width: 64px; flex-shrink: 0; border-right: 1.5px solid #111; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.f-tipo-box .f-letra { font-size: 30px; font-weight: 700; border: 1.5px solid #111; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.f-tipo-box .f-cod { font-size: 9px; margin-top: 2px; }
.f-meta { flex: 1.3; padding-left: 10px; }
.f-meta .f-factura-title { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
.f-meta .f-linea { font-size: 10.5px; margin-bottom: 3px; display: flex; justify-content: space-between; }
.f-vto-pago { text-align: right; font-size: 10.5px; border-bottom: 1.5px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
.f-cliente { border-bottom: 1.5px solid #111; padding-bottom: 8px; margin-bottom: 0; font-size: 10.5px; display: flex; }
.f-cliente .f-cliente-izq { flex: 2; line-height: 1.6; }
.f-cliente .f-cliente-der { flex: 1; line-height: 1.6; text-align: left; }
.f-items { width: 100%; border-collapse: collapse; font-size: 10.5px; }
.f-items thead th { text-align: left; font-weight: 700; border-bottom: 1.5px solid #111; padding: 5px 6px; background: #f2f2f2; }
.f-items thead th.f-right { text-align: right; }
.f-items thead th.f-center { text-align: center; }
.f-items tbody td { padding: 5px 6px; vertical-align: top; }
.f-items tbody td.f-right { text-align: right; }
.f-items tbody td.f-center { text-align: center; }
.f-items-body { flex: 1 1 auto; min-height: 0; border-bottom: 1.5px solid #111; }
.f-footer-row { display: flex; border-bottom: 1.5px solid #111; }
.f-observaciones { flex: 1; padding: 8px; font-size: 10px; border-right: 1.5px solid #111; }
.f-observaciones.f-observaciones-sola { border-right: none; }
.f-totales { width: 210px; flex-shrink: 0; padding: 8px; font-size: 11px; }
.f-totales .f-t-row, .f-observaciones .f-t-row { display: flex; justify-content: space-between; margin-bottom: 4px; gap: 8px; }
.f-totales .f-t-total { border-top: 1.5px solid #111; padding-top: 4px; font-weight: 700; }
.f-regimen-titulo { font-size: 9px; font-weight: 700; line-height: 1.3; border-bottom: 1px solid #111; padding-bottom: 5px; margin-bottom: 6px; margin-top: 6px; }
.f-monto-letras { padding: 6px 8px; font-size: 10px; border-bottom: 1.5px solid #111; display: flex; justify-content: space-between; align-items: center; }
.f-cae-footer { display: flex; align-items: flex-start; padding-top: 8px; justify-content: space-between; }
.f-arca { display: flex; align-items: center; gap: 8px; }
.f-arca .f-arca-nombre { font-weight: 700; font-size: 14px; }
.f-arca .f-arca-desc { font-size: 8px; line-height: 1.3; }
.f-arca .f-arca-autorizado { font-size: 9px; font-weight: 700; margin-top: 2px; }
.f-cae-datos { text-align: right; font-size: 10px; }
.f-pagina { text-align: center; font-size: 9px; color: #555; margin-top: 6px; }
`;

// Mismo criterio que resolverTipoFactura() en facturasventa.routers.js,
// pero reducido a lo que hace falta para el QR (tipo/número de documento
// del receptor). Se duplica a propósito en vez de importar del backend
// (no hay forma de compartir código entre Node y el bundle de React sin
// acoplar los dos proyectos) — si en algún momento cambia la lógica allá,
// hay que replicar el cambio acá.
function tipoYNroDocReceptor(row) {
  const tipofact = (row.cliente_tipofact || "").trim().toUpperCase();
  if (tipofact === "RI" && row.cliente_cuit) {
    return { tipoDoc: 80, nroDoc: soloDigitos(row.cliente_cuit) };
  }
  if (tipofact === "MT" && (row.cliente_cuit || row.cliente_dni)) {
    return row.cliente_cuit
      ? { tipoDoc: 80, nroDoc: soloDigitos(row.cliente_cuit) }
      : { tipoDoc: 96, nroDoc: soloDigitos(row.cliente_dni) };
  }
  if (row.cliente_dni) {
    return { tipoDoc: 96, nroDoc: soloDigitos(row.cliente_dni) };
  }
  return { tipoDoc: 99, nroDoc: 0 };
}

const soloDigitos = (v) => Number(String(v ?? "").replace(/\D/g, "")) || 0;

// Observaciones es texto libre cargado a mano en FacturaManual.jsx y se
// imprime tal cual lo tipeó el usuario — pero "tal cual" en el HTML que
// después convierte html2canvas/html2pdf, no en el DOM real, así que hay
// que escapar manualmente los caracteres que romperían el markup (< > & "
// '), o un simple "<" en las observaciones podría cortar el resto del
// comprobante. Los saltos de línea del textarea se preservan como <br />.
function escaparHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function observacionesHTML(f) {
  const texto = (f.observaciones ?? "").toString();
  if (!texto.trim()) return "";
  return escaparHtml(texto).replace(/\n/g, "<br />");
}

// DD/MM/AAAA — para "Fecha de Emisión" y "Fecha de Vto. para el pago" en
// el comprobante (sin hora, como en el modelo real).
const formatearFechaCorta = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

// cae_vencimiento viene de AFIP como string "YYYYMMDD" (así lo define la
// tabla facturas_venta: VARCHAR(8) — ver CREATE TABLE en
// facturasventa.routers.js). Lo convertimos a DD/MM/AAAA para mostrarlo.
const formatearFechaCae = (yyyymmdd) => {
  const s = String(yyyymmdd ?? "");
  if (s.length !== 8) return s;
  return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
};

// Inserta los guiones del CUIT/CUIL (XX-XXXXXXXX-X) a partir de un valor
// que puede venir con o sin formato. Si no tiene 11 dígitos (dato viejo,
// incompleto, o Ingresos Brutos con otra longitud), lo devuelve tal cual
// vino en vez de forzar un formato que no corresponde.
const formatearCuit = (v) => {
  const digitos = String(v ?? "").replace(/\D/g, "");
  if (digitos.length !== 11) return v ?? "";
  return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
};

// Etiqueta larga de la condición frente al IVA del cliente, para el bloque
// "Condición frente al IVA:" del comprobante (clientes.tipofact es el
// código corto: RI/MT/EX/CF).
const condicionIvaLabel = (tipofact) => {
  const t = (tipofact || "").trim().toUpperCase();
  if (t === "RI") return "IVA Responsable Inscripto";
  if (t === "MT") return "Responsable Monotributo";
  if (t === "EX") return "IVA Sujeto Exento";
  return "Consumidor Final";
};

// AFIP exige la fecha del comprobante en formato YYYYMMDD dentro del QR.
const fechaAfipQR = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Arma la URL del QR según RG 4291 (AFIP). El payload va en base64 dentro
// del query param `p`. Acá se usa un servicio público (api.qrserver.com)
// para renderizar la imagen del QR sin sumar una librería de canvas al
// bundle — si en algún momento se prefiere no depender de un tercero para
// esto, conviene reemplazarlo por una librería JS de QR (ej. qrcode.js)
// que dibuje el código directo en el HTML antes de convertir a PDF.
function armarQrUrl(row, emisor) {
  const { tipoDoc, nroDoc } = tipoYNroDocReceptor(row);
  const payload = {
    ver: 1,
    fecha: fechaAfipQR(row.creado_en),
    cuit: soloDigitos(emisor.cuit),
    ptoVta: Number(row.pto_vta),
    tipoCmp: Number(row.tipo_cbte),
    nroCmp: Number(row.nro_comprobante),
    importe: Number(row.importe_total),
    moneda: "PES",
    ctz: 1,
    tipoDocRec: tipoDoc,
    nroDocRec: nroDoc,
    tipoCodAut: "E",
    codAut: Number(row.cae),
  };
  const afipUrl = `https://www.afip.gob.ar/fe/qr/?p=${btoa(JSON.stringify(payload))}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(afipUrl)}`;
}

// Arma el HTML completo de la factura (con <style> incluido) a partir de
// una fila de facturas_venta (con el join a clientes) y la config del
// emisor. Exportado por si algún día hace falta previsualizar el HTML sin
// pasar por el exportador a PDF.
export function armarFacturaPageHTML(f, emisor) {
  const qrSrc = armarQrUrl(f, emisor);
  const letra = TIPO_CBTE_LABEL[f.tipo_cbte] ?? "";
  const codigoCbte = CODIGO_CBTE[f.tipo_cbte] ?? "";
  const fechaEmision = formatearFechaCorta(f.creado_en);
  const fechaVtoCae = formatearFechaCae(f.cae_vencimiento);
  const documentoCliente = f.cliente_cuit
    ? formatearCuit(f.cliente_cuit)
    : f.cliente_dni ?? "—";

  // La tabla de ítems muestra UNA línea que resume el presupuesto — la
  // factura solo tiene neto/IVA/total agregados (no ítems individuales
  // guardados), así que se factura como concepto único.
  // La tabla de ítems muestra UNA línea que resume la venta — la factura
  // solo tiene neto/IVA/total agregados (no ítems individuales guardados).
  // Si es una factura manual (sin presupuesto), usa el `detalle` cargado a
  // mano; si viene de un presupuesto, arma la descripción con el número.
  const detalleItem = f.numeropres
    ? `Presupuesto N° ${f.numeropres} — Muebles a medida`
    : f.detalle || "Venta de mercadería / servicio";
  const codigoItem = f.numeropres ? String(f.numeropres).padStart(5, "0") : "S/N";

  // Factura B (Cód.06): por Ley 27.743 (Régimen de Transparencia Fiscal al
  // Consumidor) el comprobante NO discrimina Neto/IVA como una Factura A
  // — solo declara el IVA ya contenido en el precio, con esta leyenda
  // fija. Factura A/C siguen mostrando el desglose Neto/IVA/Total normal.
  // En Factura B, este bloque va DENTRO del cuadro de Observaciones (no al
  // lado, en un cuadro de Totales separado) — así lo pidieron.
  const esFacturaB = Number(f.tipo_cbte) === 6;
  const observacionesTexto = observacionesHTML(f);
  const piePagoHTML = esFacturaB
    ? `
      <div class="f-footer-row">
        <div class="f-observaciones">
          <strong>Observaciones:</strong><br />
          ${observacionesTexto}
          <div class="f-regimen-titulo">Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)</div>
          <div class="f-t-row"><span>IVA Contenido:</span><span>${formatPeso(f.importe_iva)}</span></div>
          <div class="f-t-row"><span>Otros Impuestos Nacionales Indirectos:</span><span>${formatPeso(f.otros_impuestos_indirectos ?? 0)}</span></div>
        </div>
        <div class="f-totales"></div>
      </div>
      <div class="f-monto-letras">
        <span>${importeEnLetras(f.importe_total)}</span>
        <span><strong>Total Comprobante</strong>&nbsp;&nbsp;${formatPeso(f.importe_total)}</span>
      </div>
    `
    : `
      <div class="f-footer-row">
        <div class="f-observaciones">
          <strong>Observaciones:</strong><br />
          ${observacionesTexto}
        </div>
        <div class="f-totales">
          <div class="f-t-row"><span>Importe Neto</span><span>${formatPeso(f.importe_neto)}</span></div>
          <div class="f-t-row"><span>IVA 21%</span><span>${formatPeso(f.importe_iva)}</span></div>
          <div class="f-t-row f-t-total"><span>Total Comprobante</span><span>${formatPeso(f.importe_total)}</span></div>
        </div>
      </div>
      <div class="f-monto-letras">
        <span>${importeEnLetras(f.importe_total)}</span>
      </div>
    `;

  return `
    <style>${FACTURA_CSS}</style>
    <div class="f-page">
      <div class="f-original">ORIGINAL</div>

      <div class="f-header">
        <div class="f-emisor">
          <div class="f-razon">${(emisor.nombreFantasia || emisor.razonSocial)?.toUpperCase() ?? ""}</div>
          <div class="f-linea">Razón Social: ${emisor.razonSocial ?? ""}</div>
          <div class="f-linea">Domicilio Comercial: ${emisor.domicilio ?? ""}</div>
          ${emisor.telefono || emisor.web ? `<div class="f-linea">${emisor.web ? `http: ${emisor.web}` : ""}${emisor.web && emisor.telefono ? " - " : ""}${emisor.telefono ? `Tel./Fax ${emisor.telefono}` : ""}</div>` : ""}
          <div class="f-linea">Responsabilidad frente al IVA: ${(emisor.condicionIva ?? "").toUpperCase()}</div>
        </div>
        <div class="f-tipo-box">
          <div class="f-letra">${letra}</div>
          <div class="f-cod">Cód.${codigoCbte}</div>
        </div>
        <div class="f-meta">
          <div class="f-factura-title">FACTURA</div>
          <div class="f-linea"><span>Punto de Venta: ${String(f.pto_vta).padStart(4, "0")}</span><span>Comp. Nro: ${String(f.nro_comprobante).padStart(8, "0")}</span></div>
          <div class="f-linea"><span>Fecha de Emisión: ${fechaEmision}</span><span></span></div>
          <div class="f-linea"><span>CUIT: ${formatearCuit(emisor.cuit)}</span><span></span></div>
          <div class="f-linea"><span>Ingresos Brutos: ${formatearCuit(emisor.ingresosBrutos)}</span><span></span></div>
          ${emisor.inicioActividades ? `<div class="f-linea"><span>Inicio de Actividades: ${emisor.inicioActividades}</span><span></span></div>` : ""}
        </div>
      </div>

      <div class="f-vto-pago">Fecha de Vto.para el pago: ${fechaEmision}</div>

      <div class="f-cliente">
        <div class="f-cliente-izq">
          <div><strong>Sr(es):</strong> ${(f.cliente_nombre ?? "").toUpperCase()}</div>
          <div><strong>Domicilio Comercial:</strong> ${[f.cliente_domicilio, f.cliente_localidad].filter(Boolean).join(", ")}</div>
          <div><strong>CUIT:</strong> ${documentoCliente}</div>
          <div><strong>Condición frente al IVA:</strong> ${condicionIvaLabel(f.cliente_tipofact)}</div>
        </div>
        <div class="f-cliente-der">
          <div><strong>Cliente N°</strong> ${String(f.codcliente).padStart(5, "0")}</div>
          <div><strong>Condición de Venta:</strong> ${f.condicion_venta || "Contado"}</div>
        </div>
      </div>

      <div class="f-items-body">
        <table class="f-items">
          <thead>
            <tr>
              <th>Código</th>
              <th class="f-center">Cantidad</th>
              <th class="f-center">Un.</th>
              <th>D e t a l l e</th>
              <th class="f-right">Ancho</th>
              <th class="f-right">Alto</th>
              <th class="f-right">P.Unit.</th>
              <th class="f-right">% Bon.</th>
              <th class="f-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${codigoItem}</td>
              <td class="f-center">1.00</td>
              <td class="f-center">Un.</td>
              <td>${detalleItem}</td>
              <td class="f-right"></td>
              <td class="f-right"></td>
              <td class="f-right">${formatPeso(f.importe_total)}</td>
              <td class="f-right">0.00</td>
              <td class="f-right">${formatPeso(f.importe_total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      ${piePagoHTML}

      <div class="f-cae-footer">
        <div class="f-arca">
          <img src="${qrSrc}" data-qr="1" style="width:78px; height:78px;" />
          <div>
            <div class="f-arca-nombre">ARCA</div>
            <div class="f-arca-desc">AGENCIA DE RECAUDACION<br />Y CONTROL ADUANERO</div>
            <div class="f-arca-autorizado">Comprobante Autorizado</div>
          </div>
        </div>
        <div class="f-cae-datos">
          <div><strong>CAE N°:</strong> ${f.cae}</div>
          <div><strong>Fecha de Vto. de CAE:</strong> ${fechaVtoCae}</div>
        </div>
      </div>
      <div class="f-pagina">Página 1 de 1</div>
    </div>
  `;
}

// Nombre de archivo sugerido para la factura (usado al descargar desde el
// visor del navegador).
export function nombreArchivoFactura(f) {
  const letra = TIPO_CBTE_LABEL[f.tipo_cbte] ?? "";
  const nroCompleto = `${String(f.pto_vta).padStart(4, "0")}-${String(f.nro_comprobante).padStart(8, "0")}`;
  return `FACTURA_${letra}_${nroCompleto}.pdf`;
}


// Trae la imagen del QR y la convierte a data: URI ANTES de escribir el
// documento imprimible. Por qué: en una prueba real se vio que si el
// navegador todavía está esperando esa imagen externa (api.qrserver.com)
// justo cuando arranca a imprimir/paginar, corta ahí todo el resto del
// comprobante (CAE, ARCA, "Página 1 de 1" desaparecen). Con la imagen ya
// embebida de antemano, no hay ninguna espera de red pendiente en el
// momento de imprimir. Si la descarga falla, se sigue igual sin QR — es
// preferible a arriesgar que se pierda el resto de la hoja.
function precargarQrComoDataURL(url, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal })
    .then((resp) => {
      if (!resp.ok) throw new Error(`QR respondió ${resp.status}`);
      return resp.blob();
    })
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        })
    )
    .catch(() => null)
    .finally(() => clearTimeout(timer));
}

// Arma pageHTML y, si el QR se pudo descargar a tiempo, lo deja embebido
// como data: URI en vez de la URL en vivo (ver precargarQrComoDataURL).
function armarPageHTMLConQrEmbebido(f, emisor) {
  const qrUrlEnVivo = armarQrUrl(f, emisor);
  return precargarQrComoDataURL(qrUrlEnVivo).then((dataUrl) => {
    const pageHTML = armarFacturaPageHTML(f, emisor);
    return dataUrl ? pageHTML.replace(qrUrlEnVivo, dataUrl) : pageHTML;
  });
}

// Arma el documento HTML completo e imprimible (no un fragmento para
// insertar en otra página, como pageHTML) — con su propio @page para que
// el navegador imprima/"guarde como PDF" con el tamaño y márgenes
// correctos, sin depender de html2canvas/html2pdf en absoluto. Esto
// reemplaza al viejo generarBlobUrlFactura() (rasterizaba la hoja con
// html2canvas y la convertía a imagen): esa vía quedó descartada después
// de reproducir, en pruebas controladas, que la conversión a imagen podía
// salir corrupta (el visor del PDF cortaba el comprobante a mitad de
// camino) bajo ciertas condiciones — con impresión nativa no hay imagen
// intermedia que pueda corromperse: es el mismo texto e HTML reales que
// arma armarFacturaPageHTML, y el navegador lo pagina él mismo.
function armarFacturaImprimibleHTML(pageHTML) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Factura</title>
<style>
  /* margin acá reemplaza al viejo margin:[10,0,10,4] de html2pdf (mismos
     valores, mm) — el navegador reserva este espacio en cada hoja impresa
     sin que haga falta envolver nada en un contenedor con margen manual. */
  @page { size: A4; margin: 10mm 4mm 10mm 0mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: Arial, Helvetica, sans-serif; }
  ${FACTURA_CSS}
</style>
</head>
<body>
${pageHTML}
</body>
</html>`;
}

// Genera el HTML de la factura y lo abre en una pestaña nueva — ahí el
// navegador la muestra como una página normal (con el mismo aspecto que
// el comprobante impreso) y el usuario tiene Ctrl+P / el menú de
// impresión del navegador para guardarla como PDF o imprimirla si quiere.
//
// IMPORTANTE: llamar esto de forma SINCRÓNICA desde el onClick del botón
// (sin ningún `await` antes) — la pestaña se abre en blanco ACÁ MISMO,
// antes de cualquier operación async, porque si se abre después la
// mayoría de los navegadores la bloquean como pop-up al perder la
// asociación directa con el click del usuario.
export function verFacturaPDF(f, emisor, { setGenerando } = {}) {
  setGenerando?.(true);

  const ventana = window.open("", "_blank");
  if (!ventana) {
    alert(
      "El navegador bloqueó la ventana de la factura. Habilitá los pop-ups para este sitio e intentá de nuevo."
    );
    setGenerando?.(false);
    return;
  }

  try {
    armarPageHTMLConQrEmbebido(f, emisor)
      .then((pageHTML) => {
        ventana.document.open();
        ventana.document.write(armarFacturaImprimibleHTML(pageHTML));
        ventana.document.close();
      })
      .catch((err) => {
        console.error("Error armando la factura:", err);
        alert("Ocurrió un error generando la factura. Probá de nuevo.");
        ventana.close();
      })
      .finally(() => setGenerando?.(false));
  } catch (err) {
    console.error("Error armando la factura:", err);
    alert("Ocurrió un error generando la factura. Probá de nuevo.");
    ventana.close();
    setGenerando?.(false);
  }
}

// Arma la factura en un iframe oculto y dispara directamente el diálogo
// de impresión nativo del navegador sobre ese HTML — sin pasar por
// html2canvas/html2pdf en ningún momento (ver comentario en
// armarFacturaImprimibleHTML).
//
// Esta misma función de base sirve tanto para "Imprimir" como para
// "Guardar/Descargar PDF": en el diálogo nativo de impresión, tanto en
// PC (Chrome/Edge: impresora "Guardar como PDF") como en celular
// (Chrome Android: destino "Guardar como PDF"; Safari iOS: opción
// "Guardar en Archivos" o "Guardar como PDF" al fondo de la hoja de
// compartir) el usuario puede elegir guardar el archivo en vez de
// imprimirlo en papel. `tituloBoton` solo cambia el texto de los
// mensajes de error para que coincida con el botón que lo disparó.
function dispararDialogoImpresion(f, emisor, { setGenerando, tituloBoton = "la factura" } = {}) {
  setGenerando?.(true);

  return armarPageHTMLConQrEmbebido(f, emisor)
    .then((pageHTML) => {
      const iframe = document.createElement("iframe");
      iframe.style.cssText =
        "position:fixed; right:0; bottom:0; width:0; height:0; border:0;";
      document.body.appendChild(iframe);

      const limpiarIframe = () => {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 60000); // recién se saca bastante después, para no cortar el diálogo de impresión
      };

      iframe.onload = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          console.error(`No se pudo abrir el diálogo para ${tituloBoton}:`, err);
          // Fallback: si por lo que sea no se pudo abrir el diálogo desde el
          // iframe, al menos mostrar la factura en una pestaña para que el
          // usuario la guarde/imprima manualmente con Ctrl+P.
          const ventana = window.open("", "_blank");
          if (ventana) {
            ventana.document.open();
            ventana.document.write(armarFacturaImprimibleHTML(pageHTML));
            ventana.document.close();
          }
        }
        limpiarIframe();
        setGenerando?.(false);
      };

      // srcdoc en vez de un blob URL: el HTML se inyecta directo, sin
      // conversión intermedia de ningún tipo.
      iframe.srcdoc = armarFacturaImprimibleHTML(pageHTML);
    })
    .catch((err) => {
      console.error(`Error armando ${tituloBoton}:`, err);
      alert("Ocurrió un error generando la factura. Probá de nuevo.");
      setGenerando?.(false);
    });
}

export function imprimirFacturaPDF(f, emisor, opts = {}) {
  return dispararDialogoImpresion(f, emisor, { ...opts, tituloBoton: "la impresión" });
}

// Botón "Guardar PDF" / "Descargar PDF": dispara el mismo diálogo nativo
// de impresión, con el foco puesto en que el usuario elija guardar el
// archivo (destino "Guardar como PDF") en vez de mandarlo a una
// impresora física. No hay forma de forzar una descarga silenciosa sin
// el diálogo del navegador (por seguridad, ningún navegador lo permite),
// así que esta es la vía confiable — misma que ya usa "Imprimir", sin el
// riesgo de corrupción de html2canvas.
export function descargarFacturaPDF(f, emisor, opts = {}) {
  return dispararDialogoImpresion(f, emisor, { ...opts, tituloBoton: "la descarga" });
}
