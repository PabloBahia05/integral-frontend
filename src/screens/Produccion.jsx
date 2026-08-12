import { useState, useEffect } from "react";
import DataTable from "../Component/DataTable";
import ActionBar from "../Component/ActionBar";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import ConfirmDelete from "../Component/ConfirmDelete";

const API = "https://integral-backend-production.up.railway.app";

// ── Componente ────────────────────────────────────────────────────────────
//
// Lista los ítems que caen en `produccion` al confirmar un presupuesto
// (ver PUT /tabla-presupuestos/confirmar/:numeropres/:revision en
// tabla-presupuestos_routes.js). El único campo pensado para editarse acá
// es `modulo` — queda vacío al confirmar y se completa a mano, ítem por
// ítem, en esta pantalla.

export default function Produccion({ authFetch }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  // Guardado de `modulo` por fila: id de la fila que se está guardando en
  // este momento (para mostrar feedback) y último error de guardado, si lo
  // hubo (para marcar el input en rojo).
  const [guardandoId, setGuardandoId] = useState(null);
  const [errorGuardadoId, setErrorGuardadoId] = useState(null);

  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchProduccion = () => {
    setLoading(true);
    authFetch(`${API}/produccion`)
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProduccion();
  }, []);

  // ── Edición de `modulo` (inline, se guarda al salir del campo) ─────────

  const handleModuloChange = (id, valor) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, modulo: valor } : r)),
    );
  };

  const handleModuloBlur = async (row) => {
    setGuardandoId(row.id);
    setErrorGuardadoId(null);
    try {
      const res = await authFetch(`${API}/produccion/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modulo: row.modulo || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Error guardando módulo:", e);
      setErrorGuardadoId(row.id);
    } finally {
      setGuardandoId(null);
    }
  };

  // ── Filtro ────────────────────────────────────────────────────────────

  const q = search.toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (r.cliente_nombre ?? "").toLowerCase().includes(q) ||
      String(r.numeropres ?? "").includes(q) ||
      (r.grupo ?? "").toLowerCase().includes(q) ||
      (r.producto ?? "").toLowerCase().includes(q) ||
      (r.modulo ?? "").toLowerCase().includes(q),
  );

  const pendientes = rows.filter((r) => !r.modulo || !r.modulo.trim()).length;

  // ── Selección ─────────────────────────────────────────────────────────

  const handleSelect = (row) => {
    setSelected(row?.id === selected?.id ? null : row);
  };

  // ── DELETE fila puntual ──────────────────────────────────────────────

  const handleDelete = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      const res = await authFetch(`${API}/produccion/${aEliminar.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows((prev) => prev.filter((r) => r.id !== aEliminar.id));
      if (selected?.id === aEliminar.id) setSelected(null);
      setAEliminar(null);
    } catch (e) {
      console.error("Error borrando fila de producción:", e);
      alert("No se pudo borrar la fila. Revisá la consola.");
    } finally {
      setEliminando(false);
    }
  };

  // ── Columnas ──────────────────────────────────────────────────────────

  const columns = [
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
    {
      key: "cliente_nombre",
      label: "Cliente",
      render: (v) => v ?? "(sin cliente)",
    },
    { key: "grupo", label: "Grupo", render: (v) => v ?? "—" },
    { key: "producto", label: "Producto", render: (v) => v ?? "—" },
    {
      key: "modulo",
      label: "Módulo",
      render: (v, row) => (
        <input
          type="text"
          value={row.modulo ?? ""}
          placeholder="Sin cargar"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleModuloChange(row.id, e.target.value)}
          onBlur={() => handleModuloBlur(row)}
          maxLength={50}
          style={{
            width: "100%",
            maxWidth: "180px",
            padding: "4px 8px",
            fontSize: "12px",
            fontFamily: "'Space Mono',monospace",
            border: `1.5px solid ${
              errorGuardadoId === row.id ? "#e57373" : "#b8d6ef"
            }`,
            borderRadius: "4px",
            background: guardandoId === row.id ? "#fffbe6" : "#fff",
            color: "#0a3a5c",
          }}
        />
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      <ScreenHeader
        icon="🏭"
        title="Producción"
        subtitle="Ítems de presupuestos confirmados — completar módulo"
      />

      <StatCards
        stats={[
          { label: "Total ítems", value: rows.length },
          { label: "Sin módulo", value: pendientes },
          { label: "Filtrados", value: filtered.length },
        ]}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ActionBar
          selected={selected}
          onNew={null}
          onEdit={null}
          onDelete={selected ? () => setAEliminar(selected) : null}
          search={search}
          onSearch={setSearch}
        />
      </div>

      {loading ? (
        <p
          style={{
            padding: "24px",
            color: "#4a8ab5",
            fontFamily: "'Space Mono',monospace",
          }}
        >
          ⏳ Cargando producción...
        </p>
      ) : filtered.length === 0 ? (
        <p
          style={{
            padding: "24px",
            color: "#8aabb8",
            fontFamily: "'Space Mono',monospace",
          }}
        >
          No hay ítems en producción todavía. Se cargan solos al confirmar un
          presupuesto.
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          selectedId={selected?.id}
          onSelect={handleSelect}
          storageKey="produccion"
        />
      )}

      {aEliminar && (
        <ConfirmDelete
          item={aEliminar}
          title="¿Eliminar ítem de producción?"
          message={
            <>
              Vas a eliminar de producción el ítem{" "}
              <strong>{aEliminar.producto ?? "sin nombre"}</strong> del
              presupuesto{" "}
              <strong>
                N° {String(aEliminar.numeropres).padStart(4, "0")}
              </strong>
              . Esta acción no se puede deshacer.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => !eliminando && setAEliminar(null)}
        />
      )}
    </>
  );
}
