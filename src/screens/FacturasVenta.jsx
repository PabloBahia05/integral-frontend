import { useState, useEffect } from "react";
import DataTable from "../Component/DataTable";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import { formatPeso } from "../pdf/pdfMotorComun";
import { verFacturaPDF } from "../pdf/facturaPdf";

const API = "https://integral-backend-production.up.railway.app";

// FacturasVenta.jsx — "Facturas Emitidas" (screen key: "facturas-venta").
// NO confundir con Facturas.jsx (screen key: "facturas"), que es el
// sistema de compras a proveedores vía OCR — son pantallas y tablas
// completamente distintas, separadas a propósito para no pisar rutas ni
// menús (ver comentario al principio de facturasventa.routers.js).
//
// Esta pantalla solo LISTA y genera el PDF de facturas ya emitidas (con
// CAE real de AFIP). La emisión en sí ocurre desde "Obras Confirmadas"
// con el botón 🧾 Facturar (BotonFacturar.jsx), que también puede
// mostrar/imprimir el PDF apenas se genera (ver facturaPdf.js — la
// plantilla del comprobante vive ahí, compartida entre las dos pantallas).

const TIPO_CBTE_LABEL = { 1: "A", 6: "B", 11: "C" };

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

export default function FacturasVenta({ authFetch, onFacturar }) {
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

  const generarPDF = (row) => {
    if (!emisor) return;
    verFacturaPDF(row, emisor, {
      setGenerando: (v) => setGenerandoPDFId(v ? row.id : null),
    });
  };

  const COLUMNS = [
    { key: "nro_comprobante", label: "N° Comprobante", render: (_v, row) => `${String(row.pto_vta).padStart(4, "0")}-${String(row.nro_comprobante).padStart(8, "0")}` },
    { key: "tipo_cbte",       label: "Tipo",           render: (_v, row) => `Factura ${TIPO_CBTE_LABEL[row.tipo_cbte] ?? row.tipo_cbte}` },
    { key: "cliente_nombre",  label: "Cliente" },
    { key: "cliente_cuit",    label: "CUIT/DNI",       render: (_v, row) => row.cliente_cuit ?? row.cliente_dni ?? "—" },
    { key: "numeropres",      label: "N° Presupuesto", render: (_v, row) => row.numeropres ?? "— (manual)" },
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
          {generandoPDFId === row.id ? "Generando..." : "👁 Ver PDF"}
        </button>
      ),
    },
  ];

  return (
    <>
      <ScreenHeader icon="🧮" title="Facturas Emitidas" subtitle="Facturas de venta con CAE de AFIP" />

      <StatCards
        stats={[
          { label: "Total emitidas", value: facturas.length },
          { label: "Resultados filtro", value: filtered.length },
        ]}
      />

      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
        {onFacturar && (
          <button
            type="button"
            onClick={onFacturar}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              background: "#0a3a5c",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            🧾 Facturar
          </button>
        )}
        <input
          type="text"
          placeholder="🔍 Buscar por cliente, CUIT, N° comprobante o presupuesto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 420,
            padding: "8px 12px",
            border: "1px solid #c8dae8",
            borderRadius: 4,
            fontFamily: "'Space Mono',monospace",
            fontSize: 12,
          }}
        />
      </div>

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
