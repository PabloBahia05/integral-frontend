import { useState } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  n != null
    ? Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "-";

const OCR_WORKER_URL = import.meta.env.VITE_OCR_WORKER_URL || "http://localhost:5001";

// ── Detección de proveedor (lado cliente, espeja la lógica Python) ─────────────
function detectarProveedor(factura) {
  if (factura?.proveedor) return factura.proveedor;
  const texto = (factura?.texto_raw || "").toLowerCase();
  if (texto.includes("placasur")) return "placasur";
  if (texto.includes("cantochap")) return "cantochap";
  if (texto.includes("aglolam")) return "aglolam";
  if (texto.includes("bonzini")) return "bonzini";
  return "generico";
}

// ── Subcomponentes de cabecera por proveedor ──────────────────────────────────
function CabeceraPlaсaSur({ factura }) {
  return (
    <div className="factura-header placasur">
      <div className="header-brand">
        <span className="brand-name">PlacaSur</span>
        <span className="badge badge-blue">Factura {factura.tipo_factura || "A"}</span>
      </div>
      <div className="header-meta-grid">
        <MetaItem label="N°" value={factura.numero} mono />
        <MetaItem label="Fecha" value={factura.fecha} />
        <MetaItem label="Vencimiento" value={factura.vencimiento} />
        <MetaItem label="Cond. Venta" value={factura.condicion_pago} />
        <MetaItem label="CAE" value={factura.cae} mono />
        <MetaItem label="Vto. CAE" value={factura.cae_vto} />
        <MetaItem label="Cliente" value={factura.cliente_nombre} />
        <MetaItem label="CUIT Cliente" value={factura.cliente_cuit} mono />
      </div>
    </div>
  );
}

function CabeceraBonzini({ factura }) {
  return (
    <div className="factura-header bonzini">
      <div className="header-brand">
        <span className="brand-name">Herrajes Bonzini</span>
        <span className="badge badge-blue">Factura {factura.tipo_factura || "A"}</span>
      </div>
      <div className="header-meta-grid">
        <MetaItem label="N°" value={factura.numero} mono />
        <MetaItem label="Fecha" value={factura.fecha} />
        <MetaItem label="Cond. Venta" value={factura.condicion_pago} />
        <MetaItem label="CAE" value={factura.cae} mono />
        <MetaItem label="Vto. CAE" value={factura.cae_vto} />
        <MetaItem label="Cliente" value={factura.cliente_nombre} />
        <MetaItem label="CUIT Cliente" value={factura.cliente_cuit} mono />
      </div>
    </div>
  );
}

function TotalesBonzini({ factura }) {
  return (
    <div className="totals-section">
      <div className="totals-grid">
        <TotalRow label="Neto gravado" value={factura.subtotal} />
        <TotalRow label={`IVA ${factura.iva_pct || 21}%`} value={factura.iva} />
        <TotalRow label="Total ARS" value={factura.total} highlight />
      </div>
    </div>
  );
}

function CabeceraGenerica({ factura }) {
  return (
    <div className="factura-header generica">
      <div className="header-brand">
        <span className="badge badge-gray">
          {factura.proveedor ? factura.proveedor.charAt(0).toUpperCase() + factura.proveedor.slice(1) : "Proveedor"}
        </span>
        <span className="badge badge-blue">Factura {factura.tipo_factura || "-"}</span>
      </div>
      <div className="header-meta-grid">
        <MetaItem label="N°" value={factura.numero} mono />
        <MetaItem label="Fecha" value={factura.fecha} />
        <MetaItem label="Cond. Pago" value={factura.condicion_pago} />
        <MetaItem label="Moneda" value={factura.moneda} />
      </div>
    </div>
  );
}

// ── Tabla de ítems por proveedor ──────────────────────────────────────────────
function TablaItemsPlacaSur({ items }) {
  return (
    <table className="items-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Descripción</th>
          <th className="text-right">Cant.</th>
          <th className="text-right">P. c/desc ARS</th>
          <th className="text-right">Total ARS</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr><td colSpan={5} className="empty-row">Sin ítems</td></tr>
        ) : (
          items.map((item, i) => (
            <tr key={i}>
              <td className="mono small">{item.codigo || "-"}</td>
              <td>{item.descripcion || "-"}</td>
              <td className="text-right">{item.cantidad != null ? fmt(item.cantidad) : "-"}</td>
              <td className="text-right">{fmt(item.precio_unit)}</td>
              <td className="text-right bold">{fmt(item.subtotalprod)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function TablaItemsGenerica({ items }) {
  return (
    <table className="items-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Descripción</th>
          <th className="text-right">Cant.</th>
          <th className="text-right">P. unit.</th>
          <th className="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr><td colSpan={5} className="empty-row">Sin ítems</td></tr>
        ) : (
          items.map((item, i) => (
            <tr key={i}>
              <td className="mono small">{item.codigo || "-"}</td>
              <td>{item.descripcion || "-"}</td>
              <td className="text-right">{item.cantidad != null ? item.cantidad : "-"}</td>
              <td className="text-right">{fmt(item.precio_unit)}</td>
              <td className="text-right bold">{fmt(item.subtotalprod)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

// ── Totales por proveedor ─────────────────────────────────────────────────────
function TotalesPlacaSur({ factura }) {
  return (
    <div className="totals-section">
      <div className="totals-grid">
        <TotalRow label="Neto gravado" value={factura.subtotal} />
        <TotalRow label={`IVA ${factura.iva_pct || 21}%`} value={factura.iva} />
        <TotalRow label="Percepciones IIBB" value={factura.pers_IIBB} />
        <TotalRow label="Total ARS" value={factura.total} highlight />
      </div>
    </div>
  );
}

function TotalesGenericos({ factura }) {
  return (
    <div className="totals-section">
      <div className="totals-grid">
        <TotalRow label="Subtotal" value={factura.subtotal} />
        <TotalRow label={`IVA ${factura.iva_pct || ""}%`} value={factura.iva} />
        {factura.pers_IIBB != null && (
          <TotalRow label="Perc. IIBB" value={factura.pers_IIBB} />
        )}
        <TotalRow label={`Total ${factura.moneda || "ARS"}`} value={factura.total} highlight />
      </div>
    </div>
  );
}

// ── Componentes atómicos ──────────────────────────────────────────────────────
function MetaItem({ label, value, mono }) {
  return (
    <div className="meta-item">
      <span className="meta-label">{label}</span>
      <span className={`meta-value${mono ? " mono" : ""}`}>{value || "-"}</span>
    </div>
  );
}

function TotalRow({ label, value, highlight }) {
  return (
    <div className={`total-row${highlight ? " highlight" : ""}`}>
      <span className="total-label">{label}</span>
      <span className="total-value">$ {fmt(value)}</span>
    </div>
  );
}

// ── Vista de factura (despacha por proveedor) ─────────────────────────────────
function FacturaView({ factura, items, onReset }) {
  const proveedor = detectarProveedor(factura);
  const isPlacaSur = proveedor === "placasur";
  const isBonzini  = proveedor === "bonzini";

  return (
    <div className="factura-card">
      {isPlacaSur
        ? <CabeceraPlaсaSur factura={factura} />
        : isBonzini
          ? <CabeceraBonzini factura={factura} />
          : <CabeceraGenerica factura={factura} />}

      <div className="table-wrapper">
        {isPlacaSur
          ? <TablaItemsPlacaSur items={items} />
          : <TablaItemsGenerica items={items} />}
      </div>

      {isPlacaSur
        ? <TotalesPlacaSur factura={factura} />
        : isBonzini
          ? <TotalesBonzini factura={factura} />
          : <TotalesGenericos factura={factura} />}

      <div className="factura-footer">
        <button className="btn-reset" onClick={onReset}>
          ↩ Cargar otra factura
        </button>
      </div>
    </div>
  );
}

// ── Zona de carga ─────────────────────────────────────────────────────────────
function UploadZone({ onFile }) {
  const handleChange = (e) => {
    const f = e.target.files[0];
    if (f) onFile(f);
  };
  return (
    <label className="drop-zone">
      <input type="file" accept=".pdf,image/*" onChange={handleChange} style={{ display: "none" }} />
      <span className="drop-icon">📄</span>
      <p className="drop-title">Seleccioná una factura</p>
      <p className="drop-sub">PDF o imagen — PlacaSur, Aglolam, Cantochap</p>
    </label>
  );
}

// ── App principal ─────────────────────────────────────────────────────────────
export default function Facturas() {
  const [estado, setEstado] = useState("idle"); // idle | cargando | ok | error
  const [factura, setFactura] = useState(null);
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const reset = () => {
    setEstado("idle");
    setFactura(null);
    setItems([]);
    setErrorMsg("");
  };

  const procesarArchivo = async (file) => {
    setEstado("cargando");
    const formData = new FormData();
    const esPDF = file.name.toLowerCase().endsWith(".pdf");

    if (esPDF) {
      formData.append("pdf", file);
    } else {
      formData.append("imagen", file);
    }

    try {
      const endpoint = esPDF ? "/ocr-pdf" : "/ocr";
      const res = await fetch(`${OCR_WORKER_URL}${endpoint}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFactura(data.factura);
      setItems(data.items || []);
      setEstado("ok");
    } catch (err) {
      setErrorMsg(err.message);
      setEstado("error");
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Facturas de proveedores</h1>
        <p>Cargá un PDF o imagen — el sistema detecta el proveedor automáticamente</p>
      </header>

      {estado === "idle" && <UploadZone onFile={procesarArchivo} />}

      {estado === "cargando" && (
        <div className="loading-box">
          <div className="spinner" />
          <span>Procesando factura…</span>
        </div>
      )}

      {estado === "error" && (
        <div className="error-box">
          <p>{errorMsg}</p>
          <button className="btn-reset" onClick={reset}>Intentar de nuevo</button>
        </div>
      )}

      {estado === "ok" && factura && (
        <FacturaView factura={factura} items={items} onReset={reset} />
      )}

      <style>{`
        .app { max-width: 900px; margin: 0 auto; padding: 1.5rem 1rem; font-family: system-ui, sans-serif; color: #1a1a1a; }
        .app-header { margin-bottom: 1.5rem; }
        .app-header h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 4px; }
        .app-header p { font-size: 0.85rem; color: #666; margin: 0; }

        .drop-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border: 1.5px dashed #ccc; border-radius: 12px; padding: 3rem 2rem; cursor: pointer; background: #fafafa; transition: background 0.15s; }
        .drop-zone:hover { background: #f0f0f0; }
        .drop-icon { font-size: 2rem; }
        .drop-title { font-size: 1rem; font-weight: 500; margin: 0; }
        .drop-sub { font-size: 0.8rem; color: #888; margin: 0; }

        .loading-box { display: flex; align-items: center; gap: 12px; padding: 1.25rem; background: #f5f5f5; border-radius: 10px; font-size: 0.9rem; color: #555; }
        .spinner { width: 18px; height: 18px; border: 2px solid #ddd; border-top-color: #555; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .error-box { padding: 1rem 1.25rem; background: #fff0f0; border: 1px solid #fcc; border-radius: 10px; font-size: 0.9rem; color: #c00; }
        .error-box p { margin: 0 0 10px; }

        .factura-card { border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; }

        .factura-header { padding: 1rem 1.25rem; border-bottom: 1px solid #e8e8e8; }
        .factura-header.placasur { background: #f0f5ff; }
        .factura-header.bonzini  { background: #fff7ed; }
        .factura-header.generica { background: #f7f7f7; }
        .header-brand { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .brand-name { font-size: 1rem; font-weight: 600; }

        .badge { font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 6px; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .badge-gray { background: #e5e7eb; color: #374151; }

        .header-meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px 16px; }
        .meta-item { display: flex; flex-direction: column; gap: 1px; }
        .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #888; }
        .meta-value { font-size: 13px; font-weight: 500; color: #1a1a1a; }

        .table-wrapper { overflow-x: auto; }
        .items-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .items-table th { text-align: left; padding: 8px 12px; background: #f9f9f9; color: #777; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #ebebeb; }
        .items-table td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #1a1a1a; }
        .items-table tr:last-child td { border-bottom: none; }
        .items-table tr:hover td { background: #fafafa; }
        .text-right { text-align: right !important; }
        .mono { font-family: monospace; font-size: 11px; color: #666; }
        .small { font-size: 11px; }
        .bold { font-weight: 600; }
        .empty-row { text-align: center; color: #aaa; padding: 2rem !important; }

        .totals-section { display: flex; justify-content: flex-end; padding: 1rem 1.25rem; border-top: 1px solid #ebebeb; }
        .totals-grid { min-width: 260px; display: flex; flex-direction: column; gap: 4px; }
        .total-row { display: flex; justify-content: space-between; gap: 24px; font-size: 13px; padding: 3px 0; }
        .total-row.highlight { border-top: 1px solid #e0e0e0; padding-top: 8px; margin-top: 4px; font-size: 15px; font-weight: 600; }
        .total-label { color: #666; }
        .total-value { color: #1a1a1a; }

        .factura-footer { padding: 0.75rem 1.25rem; border-top: 1px solid #ebebeb; background: #fafafa; }
        .btn-reset { font-size: 13px; color: #555; background: none; border: 1px solid #ccc; border-radius: 6px; padding: 5px 12px; cursor: pointer; }
        .btn-reset:hover { background: #f0f0f0; }
      `}</style>
    </div>
  );
}
