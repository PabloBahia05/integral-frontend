import { useState, useEffect } from "react";
import DataTable from "../Component/DataTable";
import Modal from "../Component/Modal";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import ConfirmDelete from "../Component/ConfirmDelete";
import { generarPdfRecibo } from "../pdf/pdfRecibo";

const API = "https://integral-backend-production.up.railway.app";

// Mismo criterio de columnas/estilo que el resto de la app (ver
// Clientes.jsx / presupuestosShared.jsx).
//
// OJO con la firma de `render`: DataTable llama `col.render(row[col.key], row)`
// — primer parámetro es el VALOR de la celda, segundo la fila completa.
const COLUMNS_CLIENTES = [
  { key: "codcliente", label: "Cód." },
  { key: "nombre", label: "Cliente" },
  { key: "telefono1", label: "Teléfono" },
  {
    key: "numeropres",
    label: "Presupuesto",
    render: (value, row) =>
      value != null ? `Nº${value} rev.${row.revision}` : "—",
  },
  {
    key: "lineas",
    label: "Líneas elegidas",
    render: (value) => fmtLineasElegidas(value),
  },
  {
    key: "monto_obra",
    label: "Monto total",
    render: (value) => fmtMoneda(value),
  },
  { key: "color", label: "Color", render: (value) => value ?? "—" },
  { key: "anticipo", label: "Anticipo", render: (value) => fmtMoneda(value) },
  {
    key: "saldo",
    label: "Saldo",
    render: (value) => (
      <span
        style={{
          fontWeight: 700,
          color: value > 0 ? "#c0392b" : value < 0 ? "#1a7a3a" : "#8aabb8",
        }}
      >
        {fmtMoneda(value)}
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
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  });
}

function fmtFecha(v) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? String(v)
    : d.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

// linea_por_grupo llega como JSON { grupo: idx } (idx 0=línea1, 1=línea2,
// 2=línea3). Se muestra como lista de números de línea (idx+1) únicos y
// ordenados, ej. "8" o "21, 22". Sin datos (obra que nunca eligió línea por
// grupo, sigue en línea1 por defecto) muestra "—", igual criterio que la
// pantalla "Obras Confirmadas".
function fmtLineasElegidas(raw) {
  if (!raw) return "—";
  let obj;
  try {
    obj = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return "—";
  }
  if (!obj || typeof obj !== "object") return "—";
  const valores = Object.values(obj);
  if (!valores.length) return "—";
  const distintos = [...new Set(valores.map((v) => Number(v) + 1))].sort(
    (a, b) => a - b,
  );
  return distintos.join(", ");
}

export default function CuentaCorriente({
  authFetch,
  onAbrirPresupuesto,
  onBack,
}) {
  const [resumen, setResumen] = useState([]);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedCliente, setSelectedCliente] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [selectedMovimiento, setSelectedMovimiento] = useState(null);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [form, setForm] = useState({
    tipo: "pago",
    monto: "",
    concepto: "",
    signoAjuste: "-",
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // ── Recibos ───────────────────────────────────────────────────────────
  const [modalRecibo, setModalRecibo] = useState(false);
  const [obrasCliente, setObrasCliente] = useState([]);
  const [loadingObrasCliente, setLoadingObrasCliente] = useState(false);
  const [formRecibo, setFormRecibo] = useState({
    numeropres: "",
    monto: "",
    concepto: "Anticipo",
  });
  const [errorRecibo, setErrorRecibo] = useState("");
  const [guardandoRecibo, setGuardandoRecibo] = useState(false);

  const openRecibo = () => {
    setFormRecibo({ numeropres: "", monto: "", concepto: "Anticipo" });
    setErrorRecibo("");
    setModalRecibo(true);
    setLoadingObrasCliente(true);
    authFetch(`${API}/tabla-presupuestos/revisiones-confirmadas`)
      .then((r) => r.json())
      .then((data) => {
        const propias = (Array.isArray(data) ? data : []).filter(
          (o) => o.codcliente === selectedCliente.codcliente,
        );
        setObrasCliente(propias);
      })
      .catch(console.error)
      .finally(() => setLoadingObrasCliente(false));
  };

  const handleGuardarRecibo = async () => {
    const montoNum = parseFloat(String(formRecibo.monto).replace(",", "."));
    if (!montoNum || montoNum <= 0) {
      setErrorRecibo("Ingresá un monto mayor a cero.");
      return;
    }

    const obraElegida = formRecibo.numeropres
      ? obrasCliente.find(
          (o) => String(o.numeropres) === String(formRecibo.numeropres),
        )
      : null;

    setGuardandoRecibo(true);
    try {
      const res = await authFetch(`${API}/recibos`, {
        method: "POST",
        body: JSON.stringify({
          codcliente: selectedCliente.codcliente,
          numeropres: obraElegida?.numeropres ?? null,
          revision: obraElegida?.revision ?? null,
          monto: montoNum,
          concepto: formRecibo.concepto || "Anticipo",
        }),
      });
      const recibo = await res.json();
      if (!res.ok)
        throw new Error(recibo?.error || "No se pudo guardar el recibo.");

      setModalRecibo(false);
      fetchResumen();
      fetchMovimientos(selectedCliente.codcliente);

      // generarPdfRecibo no devuelve promesa (descargarPDF corre su propia
      // cadena async y ya maneja sus errores con alert() adentro) — se
      // dispara y no se espera, el modal ya se cerró arriba.
      generarPdfRecibo(recibo, selectedCliente, obraElegida);
    } catch (err) {
      console.error("Error guardando recibo:", err);
      setErrorRecibo(err.message || "No se pudo guardar el recibo.");
    } finally {
      setGuardandoRecibo(false);
    }
  };
  // ── FIN Recibos ───────────────────────────────────────────────────────

  // ── TEMPORAL: backfill de obras confirmadas antes de que existiera este
  // módulo. Borrar este bloque + el botón + el endpoint /admin/backfill-cuenta-corriente
  // una vez confirmado que las obras viejas ya quedaron cargadas. ──────────
  const [backfillCorriendo, setBackfillCorriendo] = useState(false);
  const [backfillResultado, setBackfillResultado] = useState(null);

  const correrBackfill = async () => {
    if (
      !window.confirm(
        "Esto va a recorrer TODAS las obras confirmadas y generar/actualizar su movimiento en Cuenta Corriente. ¿Continuar?",
      )
    ) {
      return;
    }
    setBackfillCorriendo(true);
    setBackfillResultado(null);
    try {
      const res = await authFetch(`${API}/admin/backfill-cuenta-corriente`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error desconocido");
      setBackfillResultado(data);
      fetchResumen();
    } catch (err) {
      console.error("Error corriendo backfill:", err);
      setBackfillResultado({ error: err.message });
    } finally {
      setBackfillCorriendo(false);
    }
  };
  // ── FIN bloque temporal ──────────────────────────────────────────────────

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
      numeropres: r.numeropres ?? null,
      revision: r.revision ?? null,
      monto_obra: r.monto_obra != null ? Number(r.monto_obra) : null,
      lineas: r.linea_por_grupo ?? null,
      color: r.color ?? null,
      anticipo: r.anticipo != null ? Number(r.anticipo) : 0,
    }));

  const filtradas = filas.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.nombre ?? "").toLowerCase().includes(q) ||
      String(c.codcliente ?? "").includes(q) ||
      String(c.telefono1 ?? "").includes(q)
    );
  });

  const deudaTotal = filas.reduce(
    (acc, c) => acc + (c.saldo > 0 ? c.saldo : 0),
    0,
  );

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
      onAbrirPresupuesto?.({
        numeropres: row.numeropres,
        revision: row.revision,
      });
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
    if (form.tipo === "pago" || form.tipo === "nota_credito")
      montoFinal = -Math.abs(montoNum);
    if (form.tipo === "nota_debito") montoFinal = Math.abs(montoNum);
    if (form.tipo === "ajuste")
      montoFinal =
        form.signoAjuste === "-" ? -Math.abs(montoNum) : Math.abs(montoNum);

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
      const res = await authFetch(
        `${API}/cuenta-corriente/${selectedMovimiento.id}`,
        { method: "DELETE" },
      );
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
    { key: "creado_en", label: "Fecha", render: (value) => fmtFecha(value) },
    {
      key: "tipo",
      label: "Tipo",
      render: (value) => TIPO_LABEL[value] ?? value,
    },
    { key: "concepto", label: "Concepto", render: (value) => value ?? "—" },
    {
      key: "monto",
      label: "Monto",
      render: (value) => (
        <span
          style={{ fontWeight: 700, color: value >= 0 ? "#c0392b" : "#1a7a3a" }}
        >
          {value >= 0 ? "+" : ""}
          {fmtMoneda(value)}
        </span>
      ),
    },
    {
      key: "saldo_acumulado",
      label: "Saldo",
      render: (value) => fmtMoneda(value),
    },
  ];

  return (
    <>
      <ScreenHeader
        icon="💰"
        title="Cuenta Corriente"
        subtitle="Saldo y movimientos por cliente"
      />

      <StatCards
        stats={[
          { label: "Clientes con saldo", value: filas.length },
          { label: "Deuda total", value: fmtMoneda(deudaTotal) },
        ]}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <input
          className="pn-field-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔎 Buscar cliente..."
          style={{ flex: 1, maxWidth: 320 }}
        />
        {/* TEMPORAL — quitar junto con el bloque de estado/función de arriba
            y el endpoint /admin/backfill-cuenta-corriente cuando ya no haga falta. */}
        <button
          type="button"
          className="btn-cancel"
          onClick={correrBackfill}
          disabled={backfillCorriendo}
          style={{ padding: "8px 14px" }}
        >
          {backfillCorriendo
            ? "⏳ Corriendo..."
            : "🔄 Backfill obras confirmadas"}
        </button>
      </div>

      {backfillResultado && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: backfillResultado.error ? "#fdecea" : "#eaf7ee",
            color: backfillResultado.error ? "#c0392b" : "#1a7a3a",
            fontSize: 13,
          }}
        >
          {backfillResultado.error ? (
            <p style={{ margin: 0 }}>❌ Error: {backfillResultado.error}</p>
          ) : (
            <>
              <p style={{ margin: 0, fontWeight: 700 }}>
                ✅ Procesadas: {backfillResultado.totalProcesadas} —
                Insertados/actualizados: {backfillResultado.insertados} —
                Saltados: {backfillResultado.saltados} — Errores:{" "}
                {backfillResultado.errores}
              </p>
              {Array.isArray(backfillResultado.detalle) &&
                backfillResultado.detalle.length > 0 && (
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ cursor: "pointer" }}>Ver detalle</summary>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                      {backfillResultado.detalle.map((d, i) => (
                        <li key={i}>
                          {d.numeropres} rev.{d.revision} — {d.resultado}
                          {d.monto != null ? ` — $${d.monto}` : ""}
                          {d.motivo ? ` (${d.motivo})` : ""}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
            </>
          )}
        </div>
      )}

      {loadingResumen ? (
        <p style={{ textAlign: "center", padding: 24, color: "#4a8ab5" }}>
          ⏳ Cargando...
        </p>
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
              <span
                style={{
                  color: selectedCliente.saldo > 0 ? "#c0392b" : "#1a7a3a",
                }}
              >
                {fmtMoneda(
                  movimientos.length
                    ? movimientos[movimientos.length - 1].saldo_acumulado
                    : selectedCliente.saldo,
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
                onClick={openRecibo}
                style={{ padding: "8px 14px" }}
              >
                🧾 + Recibo
              </button>
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
            <p style={{ textAlign: "center", padding: 24, color: "#4a8ab5" }}>
              ⏳ Cargando...
            </p>
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
                Tocá un movimiento de presupuesto para abrirlo en el editor. Los
                movimientos manuales se pueden seleccionar para eliminarlos.
              </p>
            </>
          )}
        </div>
      )}

      {modalNuevo && selectedCliente && (
        <Modal
          title={`Nuevo movimiento — ${selectedCliente.nombre}`}
          onClose={() => setModalNuevo(false)}
        >
          {error && <p className="form-error">{error}</p>}
          <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <label
                className="pn-field-label"
                style={{ display: "block", marginBottom: 4 }}
              >
                Tipo
              </label>
              <select
                className="pn-field-select"
                value={form.tipo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipo: e.target.value }))
                }
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
                    className={
                      form.signoAjuste === "-" ? "btn-save" : "btn-cancel"
                    }
                    style={{ flex: 1, padding: "8px 10px" }}
                  >
                    − Resta deuda (a favor del cliente)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, signoAjuste: "+" }))}
                    className={
                      form.signoAjuste === "+" ? "btn-save" : "btn-cancel"
                    }
                    style={{ flex: 1, padding: "8px 10px" }}
                  >
                    + Suma deuda
                  </button>
                </div>
              )}

              <label
                className="pn-field-label"
                style={{ display: "block", marginBottom: 4 }}
              >
                Monto
              </label>
              <input
                className="pn-field-input"
                type="text"
                inputMode="decimal"
                value={form.monto}
                onChange={(e) =>
                  setForm((f) => ({ ...f, monto: e.target.value }))
                }
                placeholder="Ej: 15000"
                style={{ width: "100%", marginBottom: 12 }}
              />

              <label
                className="pn-field-label"
                style={{ display: "block", marginBottom: 4 }}
              >
                Concepto
              </label>
              <input
                className="pn-field-input"
                value={form.concepto}
                onChange={(e) =>
                  setForm((f) => ({ ...f, concepto: e.target.value }))
                }
                placeholder="Ej: Seña, transferencia, corrección..."
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setModalNuevo(false)}>
              Cancelar
            </button>
            <button
              className="btn-save"
              onClick={handleGuardarMovimiento}
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </Modal>
      )}

      {modalRecibo && selectedCliente && (
        <Modal
          title={`Nuevo recibo — ${selectedCliente.nombre}`}
          onClose={() => setModalRecibo(false)}
        >
          {errorRecibo && <p className="form-error">{errorRecibo}</p>}
          <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <label
                className="pn-field-label"
                style={{ display: "block", marginBottom: 4 }}
              >
                Obra vinculada (opcional)
              </label>
              <select
                className="pn-field-select"
                value={formRecibo.numeropres}
                onChange={(e) =>
                  setFormRecibo((f) => ({ ...f, numeropres: e.target.value }))
                }
                style={{ width: "100%", marginBottom: 12 }}
                disabled={loadingObrasCliente}
              >
                <option value="">— Sin vincular a una obra puntual —</option>
                {obrasCliente.map((o) => (
                  <option
                    key={`${o.numeropres}-${o.revision}`}
                    value={o.numeropres}
                  >
                    Presupuesto Nº{o.numeropres} rev.{o.revision}
                  </option>
                ))}
              </select>

              <label
                className="pn-field-label"
                style={{ display: "block", marginBottom: 4 }}
              >
                Monto
              </label>
              <input
                className="pn-field-input"
                type="text"
                inputMode="decimal"
                value={formRecibo.monto}
                onChange={(e) =>
                  setFormRecibo((f) => ({ ...f, monto: e.target.value }))
                }
                placeholder="Ej: 50000"
                style={{ width: "100%", marginBottom: 12 }}
              />

              <label
                className="pn-field-label"
                style={{ display: "block", marginBottom: 4 }}
              >
                Concepto
              </label>
              <input
                className="pn-field-input"
                value={formRecibo.concepto}
                onChange={(e) =>
                  setFormRecibo((f) => ({ ...f, concepto: e.target.value }))
                }
                placeholder="Ej: Anticipo, seña..."
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              className="btn-cancel"
              onClick={() => setModalRecibo(false)}
            >
              Cancelar
            </button>
            <button
              className="btn-save"
              onClick={handleGuardarRecibo}
              disabled={guardandoRecibo}
            >
              {guardandoRecibo ? "Guardando..." : "Guardar y descargar PDF"}
            </button>
          </div>
        </Modal>
      )}

      {modalEliminar && selectedMovimiento && (
        <ConfirmDelete
          item={{
            nombre: `${TIPO_LABEL[selectedMovimiento.tipo] ?? selectedMovimiento.tipo} — ${fmtMoneda(selectedMovimiento.monto)}`,
          }}
          onConfirm={handleEliminarMovimiento}
          onClose={() => setModalEliminar(false)}
        />
      )}
    </>
  );
}
