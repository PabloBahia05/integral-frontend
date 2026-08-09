import { useState, useEffect } from "react";
import DataTable from "../Component/DataTable";
import Modal from "../Component/Modal";
import ActionBar from "../Component/ActionBar";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import ConfirmDelete from "../Component/ConfirmDelete";

const API = "https://integral-backend-production.up.railway.app";

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatPeso = (n) =>
  n != null && Number(n) !== 0
    ? "$" + Number(n).toLocaleString("es-AR").replace(/,/g, ".")
    : "—";

const formatFecha = (f) => {
  if (!f) return "—";
  const d = new Date(f);
  if (isNaN(d)) return f;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

// ── Columnas encabezados (SIN montos — esta lista se arma desde
// presupuesto_info, liviana, no agrega tabla_presupuestos) ─────────────────

const COLS_ENCABEZADO = [
  {
    key: "numeropres",
    label: "N°",
    render: (v) => (v ? String(v).padStart(4, "0") : "—"),
  },
  {
    key: "revision",
    label: "Rev.",
    render: (v) => (
      <span
        style={{
          display: "inline-block",
          background: Number(v) === 0 ? "#eaf3fb" : "#fff3cd",
          color: Number(v) === 0 ? "#2d7fc1" : "#856404",
          border: `1px solid ${Number(v) === 0 ? "#b8d6ef" : "#ffc107"}`,
          borderRadius: "4px",
          padding: "1px 8px",
          fontSize: "11px",
          fontWeight: 700,
          fontFamily: "'Space Mono', monospace",
        }}
      >
        Rev. {v ?? 0}
      </span>
    ),
  },
  { key: "nombre", label: "Cliente", render: (v) => v ?? "(sin cliente)" },
  {
    key: "telefono1",
    label: "Teléfono",
    render: (_, row) => row.telefono1 || row.telefono2 || "—",
  },
  {
    key: "linea1",
    label: "Línea",
    render: (_, row) => formatLineas(row),
  },
  {
    key: "lista",
    label: "Lista",
    render: (v) => (v != null && v !== "" ? String(v) : "—"),
  },
  { key: "actualizado_en", label: "Última modificación", render: (v) => formatFecha(v) },
  { key: "actualizado_por", label: "Por", render: (v) => v ?? "—" },
];

// ── Columnas ítems (panel de detalle al seleccionar una fila — acá sí se
// consulta tabla_presupuestos, pero puntual, para un solo presupuesto) ─────

const COLS_ITEMS = [
  { key: "tipo", label: "Sección" },
  { key: "articulo", label: "Artículo" },
  { key: "nombreart", label: "Descripción" },
  { key: "cantidad", label: "Cant.", render: (v) => v ?? 1 },
  { key: "ancho", label: "Ancho", render: (v) => (v ? `${v} cm` : "—") },
  { key: "alto", label: "Alto", render: (v) => (v ? `${v} cm` : "—") },
  { key: "valor1", label: "Precio u.", render: (v) => formatPeso(v) },
  {
    key: "_subtotal",
    label: "Subtotal",
    render: (_, row) =>
      formatPeso(Number(row.valor1 ?? 0) * (Number(row.cantidad) || 1)),
  },
];

// ── Columnas historial (modal "Revisiones" — igual que en la lista actual,
// trae totales reales porque sí agrega tabla_presupuestos, pero solo para
// ESE numeropres puntual, no para toda la lista) ────────────────────────────

const formatLineas = (row) =>
  [row.linea1, row.linea2, row.linea3].filter((v) => v != null && v !== "").join(", ") || "—";

const formatLista = (row) => {
  const v = row.lista ?? row.idlista ?? row.numlista;
  return v != null && v !== "" ? String(v) : "—";
};

const COLS_HISTORIAL = [
  {
    key: "revision",
    label: "Rev.",
    render: (v) => (
      <span
        className={`rev-badge ${Number(v) === 0 ? "rev-badge-0" : "rev-badge-n"}`}
      >
        Rev. {String(v ?? 0).padStart(2, "0")}
      </span>
    ),
  },
  { key: "fecha", label: "Fecha", render: (v) => formatFecha(v) },
  { key: "nombre", label: "Cliente" },
  { key: "linea1", label: "Línea", render: (_, row) => formatLineas(row) },
  { key: "lista", label: "Lista", render: (_, row) => formatLista(row) },
  { key: "total1", label: "Total", render: (v) => formatPeso(v) },
];

// ── Componente ────────────────────────────────────────────────────────────────

export default function ListaPresupuestos2({ onAbrirPresupuesto, authFetch }) {
  // Encabezados — de presupuesto_info (liviano, 1 fila por presupuesto)
  const [encabezados, setEncabezados] = useState([]);
  const [loadingEnc, setLoadingEnc] = useState(true);

  // Ítems del presupuesto seleccionado (bajo demanda, igual que la lista actual)
  const [itemsDetalle, setItemsDetalle] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Revisiones del numeropres seleccionado (mismo endpoint que la lista actual)
  const [revisiones, setRevisiones] = useState([]);
  const [loadingRev, setLoadingRev] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);

  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  // Revisión individual a borrar (desde el modal de Revisiones — igual que
  // en la lista actual)
  const [revisionAEliminar, setRevisionAEliminar] = useState(null);
  const [eliminandoRevision, setEliminandoRevision] = useState(false);

  // Presupuesto completo a borrar (desde el botón "Eliminar" de la
  // ActionBar — borra TODAS las revisiones + el fantasma en
  // presupuesto_info, vía DELETE /tabla-indice/:numeropres)
  const [presupuestoAEliminar, setPresupuestoAEliminar] = useState(null);
  const [eliminandoPresupuesto, setEliminandoPresupuesto] = useState(false);

  // ── Fetch encabezados (endpoint liviano nuevo) ────────────────────────────

  const fetchEncabezados = () => {
    setLoadingEnc(true);
    authFetch(`${API}/presupuesto-info/lista-presupuestos`)
      .then((r) => r.json())
      .then((data) =>
        setEncabezados(
          Array.isArray(data)
            ? data.map((e) => ({
                ...e,
                id: `${e.numeropres}-${e.revision}`, // id único para DataTable
              }))
            : [],
        ),
      )
      .catch(console.error)
      .finally(() => setLoadingEnc(false));
  };

  useEffect(() => {
    fetchEncabezados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch ítems al seleccionar (idéntico a la lista actual) ──────────────

  useEffect(() => {
    if (!selected) {
      setItemsDetalle([]);
      return;
    }
    setLoadingItems(true);
    authFetch(
      `${API}/tabla-presupuestos?numeropres=${selected.numeropres}&revision=${selected.revision}`,
    )
      .then((r) => r.json())
      .then((data) => setItemsDetalle(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingItems(false));
  }, [selected]);

  // ── Fetch revisiones al abrir historial (mismo endpoint que la lista actual) ──

  const abrirHistorial = () => {
    if (!selected) return;
    setLoadingRev(true);
    setModalHistorial(true);
    authFetch(`${API}/tabla-presupuestos/revisiones/${selected.numeropres}`)
      .then((r) => r.json())
      .then((data) =>
        setRevisiones(
          Array.isArray(data)
            ? data.map((r) => ({
                ...r,
                id: `${r.numeropres}-${r.revision}`,
              }))
            : [],
        ),
      )
      .catch(console.error)
      .finally(() => setLoadingRev(false));
  };

  // ── Selección ─────────────────────────────────────────────────────────────

  const handleSelect = (row) => {
    setSelected(row?.id === selected?.id ? null : row);
  };

  // ── Filtro ────────────────────────────────────────────────────────────────

  const q = search.toLowerCase();
  const filtered = encabezados.filter(
    (e) =>
      (e.nombre ?? "").toLowerCase().includes(q) ||
      String(e.numeropres ?? "").includes(q) ||
      (e.telefono1 ?? "").toLowerCase().includes(q) ||
      (e.telefono2 ?? "").toLowerCase().includes(q),
  );

  // Total del presupuesto seleccionado — se calcula acá, a partir de los
  // ítems recién traídos (consulta puntual de 1 presupuesto), NO se guarda
  // ni se agrega en el listado general.
  const totalSeleccionado = itemsDetalle.reduce(
    (s, it) => s + Number(it.valor1 ?? 0) * (Number(it.cantidad) || 1),
    0,
  );

  // ── DELETE revisión individual (desde el modal "Revisiones" — idéntico a
  // la lista actual) ─────────────────────────────────────────────────────

  const handleDeleteRevision = async () => {
    if (!revisionAEliminar) return;
    setEliminandoRevision(true);
    try {
      const res = await authFetch(
        `${API}/tabla-presupuestos/revision/${revisionAEliminar.numeropres}/${revisionAEliminar.revision}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRevisiones((prev) =>
        prev.filter((r) => r.id !== revisionAEliminar.id),
      );
      fetchEncabezados();
      setRevisionAEliminar(null);
    } catch (e) {
      console.error("Error borrando revisión:", e);
      alert("No se pudo borrar la revisión. Revisá la consola.");
    } finally {
      setEliminandoRevision(false);
    }
  };

  // ── DELETE presupuesto completo (botón "Eliminar" de la ActionBar —
  // borra TODAS las revisiones, vía /tabla-indice/:numeropres, que ya
  // limpia el fantasma de presupuesto_info en el backend) ────────────────

  const handleDeletePresupuesto = async () => {
    if (!presupuestoAEliminar) return;
    setEliminandoPresupuesto(true);
    try {
      const res = await authFetch(
        `${API}/tabla-indice/${presupuestoAEliminar.numeropres}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEncabezados((prev) =>
        prev.filter((e) => e.numeropres !== presupuestoAEliminar.numeropres),
      );
      if (selected?.numeropres === presupuestoAEliminar.numeropres) {
        setSelected(null);
      }
      setPresupuestoAEliminar(null);
    } catch (e) {
      console.error("Error borrando presupuesto:", e);
      alert("No se pudo borrar el presupuesto. Revisá la consola.");
    } finally {
      setEliminandoPresupuesto(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .rev-badge {
          display: inline-block; border-radius: 4px;
          padding: 1px 8px; font-size: 11px; font-weight: 700;
        }
        .rev-badge-0 { background: #eaf3fb; color: #2d7fc1; border: 1px solid #b8d6ef; }
        .rev-badge-n { background: #fff3cd; color: #856404; border: 1px solid #ffc107; }

        .items-panel {
          margin-top: 16px;
          border: 1px solid #d0e4f0;
          border-radius: 6px;
          overflow: hidden;
        }
        .items-panel-header {
          background: #0f2944; color: #fff;
          padding: 10px 16px;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          font-family: 'Space Mono', monospace;
          display: flex; align-items: center; justify-content: space-between;
        }
        .items-panel-total { font-size: 13px; color: #7ecbf7; font-weight: 700; }
        .items-empty {
          padding: 20px; color: #8aabb8;
          font-size: 13px; text-align: center;
          font-family: 'Space Mono', monospace;
        }
        .btn-historial {
          padding: 7px 14px; border-radius: 5px;
          border: 1.5px solid #b8d6ef; background: #eaf3fb; color: #2d7fc1;
          font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; gap: 5px;
        }
        .btn-historial:hover    { background: #d0e8f7; border-color: #2d7fc1; }
        .btn-historial:disabled { opacity: 0.4; cursor: default; }
        .btn-abrir {
          padding: 7px 14px; border-radius: 5px;
          border: 1.5px solid #4caf50; background: #e8f5e9; color: #1b5e20;
          font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; gap: 5px;
        }
        .btn-abrir:hover    { background: #c8e6c9; border-color: #2e7d32; }
        .btn-abrir:disabled { opacity: 0.4; cursor: default; }
        .btn-abrir-sm {
          padding: 3px 10px; font-size: 11px; border-radius: 4px;
          border: 1.5px solid #4caf50; background: #e8f5e9; color: #1b5e20;
          font-weight: 700; cursor: pointer; transition: all 0.15s;
        }
        .btn-abrir-sm:hover { background: #c8e6c9; }
      `}</style>

      <ScreenHeader
        icon="⚡"
        title="Lista Presupuestos"
        subtitle="Registro de presupuestos"
      />

      <StatCards
        stats={[
          { label: "Total presupuestos", value: encabezados.length },
          { label: "Filtrados", value: filtered.length },
        ]}
      />

      {/* ── Barra de acciones ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ActionBar
          selected={selected}
          onNew={null}
          onEdit={null}
          onDelete={
            selected ? () => setPresupuestoAEliminar(selected) : null
          }
          search={search}
          onSearch={setSearch}
        />
        <button
          className="btn-historial"
          disabled={!selected}
          onClick={abrirHistorial}
          title="Ver historial de revisiones"
        >
          🕓 Revisiones
        </button>
        {onAbrirPresupuesto && (
          <button
            className="btn-abrir"
            disabled={!selected}
            onClick={() => selected && onAbrirPresupuesto(selected)}
            title="Abrir este presupuesto en el editor"
          >
            📝 Abrir
          </button>
        )}
      </div>

      {/* ── Tabla encabezados ─────────────────────────────────────────── */}
      {loadingEnc ? (
        <p
          style={{
            padding: "24px",
            color: "#4a8ab5",
            fontFamily: "'Space Mono',monospace",
          }}
        >
          ⏳ Cargando presupuestos...
        </p>
      ) : (
        <DataTable
          columns={COLS_ENCABEZADO}
          rows={filtered}
          selectedId={selected?.id}
          onSelect={handleSelect}
        />
      )}

      {/* ── Panel de ítems ────────────────────────────────────────────── */}
      {selected && (
        <div className="items-panel">
          <div className="items-panel-header">
            <span>
              📄 Ítems — N° {String(selected.numeropres).padStart(4, "0")} ·{" "}
              {selected.nombre} · Rev. {selected.revision}
            </span>
            <span className="items-panel-total">
              Total: {formatPeso(totalSeleccionado)}
            </span>
          </div>
          {loadingItems ? (
            <p className="items-empty">⏳ Cargando ítems...</p>
          ) : itemsDetalle.length === 0 ? (
            <p className="items-empty">Sin ítems registrados.</p>
          ) : (
            <DataTable
              columns={COLS_ITEMS}
              rows={itemsDetalle}
              selectedId={null}
              onSelect={null}
            />
          )}
        </div>
      )}

      {/* ── Modal historial (idéntico al de la lista actual) ───────────── */}
      {modalHistorial && selected && (
        <Modal
          title={`Revisiones — N° ${String(selected.numeropres).padStart(4, "0")} · ${selected.nombre ?? ""}`}
          onClose={() => setModalHistorial(false)}
        >
          {loadingRev ? (
            <p
              style={{ textAlign: "center", padding: "24px", color: "#4a8ab5" }}
            >
              ⏳ Cargando...
            </p>
          ) : revisiones.length === 0 ? (
            <p
              style={{ textAlign: "center", padding: "24px", color: "#8aabb8" }}
            >
              No hay revisiones registradas.
            </p>
          ) : (
            <DataTable
              columns={[
                ...COLS_HISTORIAL,
                ...(onAbrirPresupuesto
                  ? [
                      {
                        key: "_abrir",
                        label: "",
                        render: (_, row) => (
                          <button
                            className="btn-abrir-sm"
                            onClick={() => {
                              setModalHistorial(false);
                              onAbrirPresupuesto(row);
                            }}
                          >
                            📝 Abrir
                          </button>
                        ),
                      },
                    ]
                  : []),
                {
                  key: "_eliminar",
                  label: "",
                  render: (_, row) => (
                    <button
                      className="btn-abrir-sm"
                      title="Eliminar esta revisión"
                      onClick={() => setRevisionAEliminar(row)}
                      style={{
                        background: "#fdecea",
                        color: "#c0392b",
                        borderColor: "#f3b8b0",
                      }}
                    >
                      🗑️ Eliminar
                    </button>
                  ),
                },
              ]}
              rows={revisiones}
              selectedId={null}
              onSelect={null}
            />
          )}
          <div className="form-actions" style={{ marginTop: "16px" }}>
            <button
              className="btn-cancel"
              onClick={() => setModalHistorial(false)}
            >
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {/* ── Confirmación: borrar una revisión individual ──────────────── */}
      {revisionAEliminar && (
        <ConfirmDelete
          item={revisionAEliminar}
          onConfirm={handleDeleteRevision}
          onClose={() => !eliminandoRevision && setRevisionAEliminar(null)}
        />
      )}

      {/* ── Confirmación: borrar el presupuesto completo (todas las
          revisiones + fantasma en presupuesto_info) ────────────────── */}
      {presupuestoAEliminar && (
        <ConfirmDelete
          item={presupuestoAEliminar}
          title="¿Eliminar presupuesto completo?"
          message={
            <>
              Vas a eliminar el presupuesto{" "}
              <strong>
                N° {String(presupuestoAEliminar.numeropres).padStart(4, "0")}
              </strong>{" "}
              ({presupuestoAEliminar.nombre ?? "sin cliente"}) y{" "}
              <strong>TODAS sus revisiones</strong>. Esta acción no se puede
              deshacer.
            </>
          }
          onConfirm={handleDeletePresupuesto}
          onClose={() =>
            !eliminandoPresupuesto && setPresupuestoAEliminar(null)
          }
        />
      )}
    </>
  );
}
