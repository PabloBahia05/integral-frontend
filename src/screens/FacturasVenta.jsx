import { useState, useEffect } from "react";
import DataTable from "../Component/DataTable";
import ActionBar from "../Component/ActionBar";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import {
  MEMBRETE_DANIEL_ROQUE_B64,
  formatPeso,
  styleCSS,
  descargarPDF,
} from "../pdf/pdfMotorComun";

const API = "https://integral-backend-production.up.railway.app";

// FacturasVenta.jsx — "Facturas Emitidas" (screen key: "facturas-venta").
// NO confundir con Facturas.jsx (screen key: "facturas"), que es el
// sistema de compras a proveedores vía OCR — son pantallas y tablas
// completamente distintas, separadas a propósito para no pisar rutas ni
// menús (ver comentario al principio de facturasventa.routers.js).
//
// Esta pantalla solo LISTA y genera el PDF de facturas ya emitidas (con
// CAE real de AFIP). La emisión en sí ocurre desde "Obras Confirmadas"
// con el botón 🧾 Facturar (BotonFacturar.jsx).

const TIPO_CBTE_LABEL = { 1: "A", 6: "B", 11: "C" };

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

const formatearFechaHora = (iso) =>
  iso
    ? new Date(iso).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

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

export default function FacturasVenta({ authFetch }) {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [emisor, setEmisor] = useState(null);
  const [generandoPDFId, setGenerandoPDFId] = useState(null);

  useEffect(() => {
    setLoading(true);
    authFetch(`${API}/facturas-venta`)
      .then((r) => r.json())
      .then((data) =>
        setFacturas(Array.isArray(data) ? data.map((f) => ({ ...f, id: f.id })) : []),
      )
      .catch(console.error)
      .finally(() => setLoading(false));

    authFetch(`${API}/facturas-venta/config-emisor`)
      .then((r) => r.json())
      .then(setEmisor)
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = search.toLowerCase();
  const filtered = facturas.filter(
    (f) =>
      (f.cliente_nombre ?? "").toLowerCase().includes(q) ||
      String(f.cliente_cuit ?? "").includes(q) ||
      String(f.nro_comprobante ?? "").includes(q) ||
      String(f.numeropres ?? "").includes(q),
  );

  const COLUMNS = [
    { key: "nro_comprobante", label: "N° Comprobante", render: (_v, row) => `${String(row.pto_vta).padStart(4, "0")}-${String(row.nro_comprobante).padStart(8, "0")}` },
    { key: "tipo_cbte",       label: "Tipo",           render: (_v, row) => `Factura ${TIPO_CBTE_LABEL[row.tipo_cbte] ?? row.tipo_cbte}` },
    { key: "cliente_nombre",  label: "Cliente" },
    { key: "cliente_cuit",    label: "CUIT/DNI",       render: (_v, row) => row.cliente_cuit ?? row.cliente_dni ?? "—" },
    { key: "numeropres",      label: "N° Presupuesto" },
    { key: "importe_total",   label: "Total",          render: (_v, row) => formatPeso(row.importe_total) },
    { key: "creado_en",       label: "Emitida",        render: (_v, row) => formatearFechaHora(row.creado_en) },
    { key: "ambiente",        label: "Ambiente" },
    {
      key: "pdf",
      label: "",
      render: (_v, row) => (
        <button
          type="button"
          disabled={!emisor || generandoPDFId === row.id}
          onClick={(e) => {
            e.stopPropagation();
            generarPDF(row);
          }}
          style={{
            padding: "4px 10px",
            fontSize: 12,
            background: "#0a3a5c",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: emisor ? "pointer" : "not-allowed",
          }}
        >
          {generandoPDFId === row.id ? "Generando..." : "📄 PDF"}
        </button>
      ),
    },
  ];

  const generarPDF = (f) => {
    if (!emisor) return;
    setGenerandoPDFId(f.id);

    const qrSrc = armarQrUrl(f, emisor);
    const nroCompleto = `${String(f.pto_vta).padStart(4, "0")}-${String(f.nro_comprobante).padStart(8, "0")}`;
    const letra = TIPO_CBTE_LABEL[f.tipo_cbte] ?? "";

    const pageHTML = `
      <style>${styleCSS}</style>
      <div class="page">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
          <img src="${MEMBRETE_DANIEL_ROQUE_B64}" style="height:70px;" />
          <div style="border:2px solid #111; text-align:center; padding:6px 14px;">
            <div style="font-size:22px; font-weight:700;">${letra}</div>
            <div style="font-size:10px;">COD. ${f.tipo_cbte}</div>
          </div>
          <div style="text-align:right; font-size:11px;">
            <div><strong>${emisor.razonSocial}</strong></div>
            <div>CUIT: ${emisor.cuit}</div>
            <div>${emisor.condicionIva}</div>
            <div>${emisor.domicilio}</div>
          </div>
        </div>

        <div class="doc-title">Factura ${letra} — N° ${nroCompleto}</div>

        <div class="info-line"><span>Fecha: ${formatearFechaHora(f.creado_en)}</span><span>Presupuesto N° ${f.numeropres}</span></div>
        <div class="info-line"><span>Cliente: ${f.cliente_nombre}</span><span>CUIT/DNI: ${f.cliente_cuit ?? f.cliente_dni ?? "—"}</span></div>

        <div class="body">
          <table>
            <thead><tr><th>Concepto</th><th class="right">Importe</th></tr></thead>
            <tbody>
              <tr><td>Neto gravado</td><td class="right">${formatPeso(f.importe_neto)}</td></tr>
              <tr><td>IVA 21%</td><td class="right">${formatPeso(f.importe_iva)}</td></tr>
            </tbody>
          </table>
          <div class="totals-final">
            <div class="t-row">TOTAL: ${formatPeso(f.importe_total)}</div>
          </div>
        </div>

        <div class="footer" style="align-items:center;">
          <div>
            <div>CAE: ${f.cae}</div>
            <div>Vto. CAE: ${f.cae_vencimiento}</div>
          </div>
          <img src="${qrSrc}" style="width:110px; height:110px;" />
        </div>
      </div>
    `;

    descargarPDF({
      pageHTML,
      nombreArchivo: `FACTURA_${letra}_${nroCompleto}.pdf`,
      imagenesFinal: [],
      setGenerandoPDF: (v) => setGenerandoPDFId(v ? f.id : null),
    });
  };

  return (
    <>
      <ScreenHeader icon="🧮" title="Facturas Emitidas" subtitle="Facturas de venta con CAE de AFIP" />

      <StatCards
        stats={[
          { label: "Total emitidas", value: facturas.length },
          { label: "Resultados filtro", value: filtered.length },
        ]}
      />

      <ActionBar search={search} onSearch={setSearch} />

      {loading ? (
        <p style={{ padding: "24px", color: "#4a8ab5", fontFamily: "'Space Mono',monospace" }}>
          ⏳ Cargando facturas...
        </p>
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={filtered}
          selectedId={null}
          onSelect={() => {}}
          storageKey="facturas-venta-listado"
        />
      )}

      {!emisor && (
        <p style={{ fontSize: 11, color: "#a72a2a", marginTop: 8 }}>
          ⚠️ No se pudieron cargar los datos del emisor (CUIT/razón social) — revisá las variables
          EMISOR_* en Railway. Sin eso no se puede generar el PDF.
        </p>
      )}
    </>
  );
}
