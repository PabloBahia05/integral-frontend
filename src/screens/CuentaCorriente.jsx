import { useState, useEffect } from "react";
import DataTable from "../Component/DataTable";
import Modal from "../Component/Modal";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import ConfirmDelete from "../Component/ConfirmDelete";

const API = "https://integral-backend-production.up.railway.app";

// Mismo criterio de columnas/estilo que el resto de la app (ver
// Clientes.jsx / presupuestosShared.jsx).
const COLUMNS_CLIENTES = [
  { key: "codcliente", label: "Cód." },
  { key: "nombre", label: "Cliente" },
  { key: "telefono1", label: "Teléfono" },
  {
    key: "saldo",
    label: "Saldo",
    render: (row) => (
      <span
        style={{
          fontWeight: 700,
          color: row.saldo > 0 ? "#c0392b" : row.saldo < 0 ? "#1a7a3a" : "#8aabb8",
        }}
      >
        {fmtMoneda(row.saldo)}
      </span>
    ),
  },
];

const TIPO_LABEL = {
  presupuesto: "📝 Presupuesto",
  pago: "💵 Pago",
  ajuste: "⚖️ Ajuste",
  nota_credito: "🟢 Nota de crédito",
  nota_debito: "🔴 Nota de débito",
};

const TIPOS_MANUALES = [
  { value: "pago", label: "Pago" },
  { value: "ajuste", label: "Ajuste" },
  { value: "nota_credito", label: "Nota de crédito" },
  { value: "nota_debito", label: "Nota de débito" },
];

function fmtMoneda(v) {
  const n = Number(v ?? 0);
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
}

function fmtFecha(v) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CuentaCorriente({ authFetch, onAbrirPresupuesto, onBack }) {
  const [resumen, setResumen] = useState([]);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedCliente, setSelectedCliente] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [selectedMovimiento, setSelectedMovimiento] = useState(null);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [form, setForm] = useState({ tipo: "pago", monto: "", concepto: "", signoAjuste: "-" });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const fetchResumen = () => {
    setLoadingResumen(true);
    authFetch(`${API}/cuenta-corriente/resumen`)
      .then((r) => r.json())
      .then((data) => setResumen(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingResumen(false));
  };

  useEffect(fetchResumen, []);

  // Antes se mergeaba contra TODOS los clientes (mostrando saldo 0 de
  // relleno para los que nunca tuvieron movimiento). Ahora solo se listan
  // los que ya tienen algún movimiento en cuenta corriente (típicamente
  // generado al confirmar una obra) Y cuyo saldo no dio exactamente 0 —
  // un cliente que pagó justo lo que debía no tiene sentido que siga
  // apareciendo en esta pantalla.
  const filas = resumen
    .filter((r) => Number(r.saldo) !== 0)
    .map((r) => ({
      id: r.codcliente,
      codcliente: r.codcliente,
      nombre: r.nombre,
      telefono1: r.telefono1,
      saldo: Number(r.saldo),
    }));

  const filtradas = filas.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.nombre ?? "").toLowerCase().includes(q) ||
      String(c.codcliente ?? "").includes(q) ||
      String(c.telefono1 ?? "").includes(q)
    );
  });

  const deudaTotal = filas.reduce((acc, c) => acc + (c.saldo > 0 ? c.saldo : 0), 0);

  const fetchMovimientos = (codcliente) => {
    setLoadingMovimientos(true);
    setSelectedMovimiento(null);
    authFetch(`${API}/cuenta-corriente/${codcliente}`)
      .then((r) => r.json())
      .then((data) => setMovimientos(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingMovimientos(false));
  };

  const abrirCliente = (row) => {
    if (selectedCliente?.codcliente === row.codcliente) {
      setSelectedCliente(null);
      setMovimientos([]);
      return;
    }
    setSelectedCliente(row);
    fetchMovimientos(row.codcliente);
  };

  const abrirMovimiento = (row) => {
    if (row.tipo === "presupuesto" && row.numeropres != null) {
      onAbrirPresupuesto?.({ numeropres: row.numeropres, revision: row.revision });
      return;
    }
    setSelectedMovimiento(row?.id === selectedMovimiento?.id ? null : row);
  };

  const openNuevo = () => {
    setForm({ tipo: "pago", monto: "", concepto: "", signoAjuste: "-" });
    setError("");
    setModalNuevo(true);
  };

  const handleGuardarMovimiento = async () => {
    const montoNum = parseFloat(String(form.monto).replace(",", "."));
    if (!montoNum || montoNum <= 0) {
      setError("Ingresá un monto mayor a cero.");
      return;
    }
    let montoFinal = montoNum;
    if (form.tipo === "pago" || form.tipo === "nota_credito") montoFinal = -Math.abs(montoNum);
    if (form.tipo === "nota_debito") montoFinal = Math.abs(montoNum);
    if (form.tipo === "ajuste") montoFinal = form.signoAjuste === "-" ? -Math.abs(montoNum) : Math.abs(montoNum);

    setGuardando(true);
    try {
      const res = await authFetch(`${API}/cuenta-corriente`, {
        method: "POST",
        body: JSON.stringify({
          codcliente: selectedCliente.codcliente,
          tipo: form.tipo,
          monto: montoFinal,
          concepto: form.concepto || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setModalNuevo(false);
      fetchResumen();
      fetchMovimientos(selectedCliente.codcliente);
    } catch (err) {
      console.error("Error guardando movimiento:", err);
      setError("No se pudo guardar el movimiento.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarMovimiento = async () => {
    try {
      const res = await authFetch(`${API}/cuenta-corriente/${selectedMovimiento.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setModalEliminar(false);
      setSelectedMovimiento(null);
      fetchResumen();
      fetchMovimientos(selectedCliente.codcliente);
    } catch (err) {
      console.error("Error eliminando movimiento:", err);
      alert("No se pudo eliminar el movimiento.");
    }
  };

  const COLUMNS_MOVIMIENTOS = [
    { key: "creado_en", label: "Fecha", render: (row) => fmtFecha(row.creado_en) },
    { key: "tipo", label: "Tipo", render: (row) => TIPO_LABEL[row.tipo] ?? row.tipo },
    { key: "concepto", label: "Concepto", render: (row) => row.concepto ?? "—" },
    {
      key: "monto",
      label: "Monto",
      render: (row) => (
        <span style={{ fontWeight: 700, color: row.monto >= 0 ? "#c0392b" : "#1a7a3a" }}>
          {row.monto >= 0 ? "+" : ""}
          {fmtMoneda(row.monto)}
        </span>
      ),
    },
    { key: "saldo_acumulado", label: "Saldo", render: (row) => fmtMoneda(row.saldo_acumulado) },
  ];

  return (
    <>
      <ScreenHeader icon="💰" title="Cuenta Corriente" subtitle="Saldo y movimientos por cliente" />

      <StatCards
        stats={[
          { label: "Clientes con saldo", value: filas.length },
          { label: "Deuda total", value: fmtMoneda(deudaTotal) },
        ]}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <input
          className="pn-field-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔎 Buscar cliente..."
          style={{ flex: 1, maxWidth: 320 }}
        />
      </div>

      {loadingResumen ? (
        <p style={{ textAlign: "center", padding: 24, color: "#4a8ab5" }}>⏳ Cargando...</p>
      ) : (
        <DataTable
          columns={COLUMNS_CLIENTES}
          rows={filtradas}
          selectedId={selectedCliente?.id}
          onSelect={abrirCliente}
          storageKey="cuenta-corriente-clientes"
        />
      )}

      {selectedCliente && (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <h3 style={{ margin: 0, color: "#0a3a5c" }}>
              📋 {selectedCliente.nombre} — Saldo:{" "}
              <span style={{ color: selectedCliente.saldo > 0 ? "#c0392b" : "#1a7a3a" }}>
                {fmtMoneda(
                  movimientos.length ? movimientos[movimientos.length - 1].saldo_acumulado : selectedCliente.saldo,
                )}
              </span>
            </h3>
            <div style={{ display: "flex", gap: 8 }}>
              {selectedMovimiento && selectedMovimiento.editable === 1 && (
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalEliminar(true)}
                  style={{ padding: "8px 14px" }}
                >
                  🗑 Eliminar movimiento
                </button>
              )}
              <button
                type="button"
                className="btn-save"
                onClick={openNuevo}
                style={{ padding: "8px 14px" }}
              >
                + Movimiento
              </button>
            </div>
          </div>

          {loadingMovimientos ? (
            <p style={{ textAlign: "center", padding: 24, color: "#4a8ab5" }}>⏳ Cargando...</p>
          ) : movimientos.length === 0 ? (
            <p style={{ textAlign: "center", padding: 24, color: "#8aabb8" }}>
              Este cliente todavía no tiene movimientos.
            </p>
          ) : (
            <>
              <DataTable
                columns={COLUMNS_MOVIMIENTOS}
                rows={movimientos}
                selectedId={selectedMovimiento?.id}
                onSelect={abrirMovimiento}
                storageKey="cuenta-corriente-movimientos"
              />
              <p style={{ fontSize: 11, color: "#8aabb8", marginTop: 8 }}>
                Tocá un movimiento de presupuesto para abrirlo en el editor. Los movimientos manuales se pueden
                seleccionar para eliminarlos.
              </p>
            </>
          )}
        </div>
      )}

      {modalNuevo && selectedCliente && (
        <Modal title={`Nuevo movimiento — ${selectedCliente.nombre}`} onClose={() => setModalNuevo(false)}>
          {error && <p className="form-error">{error}</p>}
          <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <label className="pn-field-label" style={{ display: "block", marginBottom: 4 }}>
                Tipo
              </label>
              <select
                className="pn-field-select"
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                style={{ width: "100%", marginBottom: 12 }}
              >
                {TIPOS_MANUALES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              {form.tipo === "ajuste" && (
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, signoAjuste: "-" }))}
                    className={form.signoAjuste === "-" ? "btn-save" : "btn-cancel"}
                    style={{ flex: 1, padding: "8px 10px" }}
                  >
                    − Resta deuda (a favor del cliente)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, signoAjuste: "+" }))}
                    className={form.signoAjuste === "+" ? "btn-save" : "btn-cancel"}
                    style={{ flex: 1, padding: "8px 10px" }}
                  >
                    + Suma deuda
                  </button>
                </div>
              )}

              <label className="pn-field-label" style={{ display: "block", marginBottom: 4 }}>
                Monto
              </label>
              <input
                className="pn-field-input"
                type="text"
                inputMode="decimal"
                value={form.monto}
                onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                placeholder="Ej: 15000"
                style={{ width: "100%", marginBottom: 12 }}
              />

              <label className="pn-field-label" style={{ display: "block", marginBottom: 4 }}>
                Concepto
              </label>
              <input
                className="pn-field-input"
                value={form.concepto}
                onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
                placeholder="Ej: Seña, transferencia, corrección..."
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setModalNuevo(false)}>
              Cancelar
            </button>
            <button className="btn-save" onClick={handleGuardarMovimiento} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </Modal>
      )}

      {modalEliminar && selectedMovimiento && (
        <ConfirmDelete
          item={{ nombre: `${TIPO_LABEL[selectedMovimiento.tipo] ?? selectedMovimiento.tipo} — ${fmtMoneda(selectedMovimiento.monto)}` }}
          onConfirm={handleEliminarMovimiento}
          onClose={() => setModalEliminar(false)}
        />
      )}
    </>
  );
}
