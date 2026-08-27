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
// tabla-presupuestos_routes.js). Los campos pensados para editarse acá son
// `modulo` y las columnas de seguimiento de proceso (DOMUS/OP/PERFORADO/
// USPER/ARMADO/USARM/DESPACHO/USDES) — quedan vacíos al confirmar y se
// completan a mano, ítem por ítem, en esta pantalla.

// Campos SI-NO de seguimiento de proceso y el campo de usuario asociado a
// cada uno (queda vacío si el proceso todavía no se marcó). Se define acá
// para no repetir la lista en columnas + handlers.
const ETAPAS = [
  { campo: "DOMUS", label: "Domus", usuario: null },
  { campo: "PERFORADO", label: "Perforado", usuario: "USPER" },
  { campo: "ARMADO", label: "Armado", usuario: "USARM" },
  { campo: "DESPACHO", label: "Despacho", usuario: "USDES" },
];

// ── Modal de detalle (se abre al clickear el código) ───────────────────────
//
// Solo muestra datos que ya vienen en la fila de `produccion` (no pega a
// ningún endpoint nuevo): cliente, grupo, producto, módulo, color resuelto,
// y el estado de las 4 etapas con su usuario y OP.
function DetalleProduccion({ row, nombreMelamina, onClose }) {
  if (!row) return null;

  const badgeEtapa = (valor) => (
    <span
      style={{
        display: "inline-block",
        background: valor === "SI" ? "#eaf7ea" : "#f3f3f3",
        color: valor === "SI" ? "#2e7d32" : "#888",
        border: `1px solid ${valor === "SI" ? "#a5d6a7" : "#ddd"}`,
        borderRadius: "4px",
        padding: "2px 10px",
        fontSize: "12px",
        fontWeight: 700,
        fontFamily: "'Space Mono', monospace",
      }}
    >
      {valor === "SI" ? "✓ SI" : "NO"}
    </span>
  );

  const fila = (label, valor) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "16px",
        padding: "8px 0",
        borderBottom: "1px solid #eaf3fb",
        fontSize: "13px",
      }}
    >
      <span style={{ color: "#4a8ab5", fontFamily: "'Space Mono', monospace" }}>
        {label}
      </span>
      <span style={{ color: "#0a3a5c", fontWeight: 600, textAlign: "right" }}>
        {valor}
      </span>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,58,92,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "24px",
          width: "90%",
          maxWidth: "420px",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 8px 30px rgba(10,58,92,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              background: "#0a3a5c",
              color: "#fff",
              borderRadius: "4px",
              padding: "2px 10px",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {row.codpro ?? "—"}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              lineHeight: 1,
              cursor: "pointer",
              color: "#8aabb8",
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <p
          style={{
            fontSize: "11px",
            color: "#8aabb8",
            fontFamily: "'Space Mono', monospace",
            marginTop: 0,
            marginBottom: "16px",
          }}
        >
          Presupuesto N° {row.numeropres ? String(row.numeropres).padStart(4, "0") : "—"}
          {" · "}Rev. {row.revision ?? 0}
        </p>

        {fila("Cliente", row.cliente_nombre ?? "(sin cliente)")}
        {fila("Grupo", row.grupo ?? "—")}
        {fila("Producto", row.producto ?? "—")}
        {fila("Módulo", row.modulo ?? "Sin cargar")}
        {fila("Color", row.color ? nombreMelamina(row.color) : "Sin color")}
        {fila("OP", row.OP ?? "—")}

        <p
          style={{
            fontSize: "11px",
            color: "#8aabb8",
            fontFamily: "'Space Mono', monospace",
            marginTop: "16px",
            marginBottom: "8px",
          }}
        >
          ETAPAS DE PROCESO
        </p>

        {(() => {
          // Solo se listan las etapas que ya tienen algún dato cargado (SI
          // marcado, o un usuario asociado) — si una etapa sigue en NO y sin
          // usuario, no se muestra fila para no ensuciar el detalle con
          // "NO" en todo lo que todavía no se hizo.
          const completadas = ETAPAS.filter(
            ({ campo, usuario }) =>
              row[campo] === "SI" || (usuario && row[usuario]),
          );

          if (completadas.length === 0) {
            return (
              <p
                style={{
                  fontSize: "13px",
                  color: "#8aabb8",
                  fontFamily: "'Space Mono', monospace",
                  padding: "8px 0",
                }}
              >
                Sin etapas completadas todavía.
              </p>
            );
          }

          return completadas.map(({ campo, label, usuario }) => (
            <div
              key={campo}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                padding: "8px 0",
                borderBottom: "1px solid #eaf3fb",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "#4a8ab5", fontFamily: "'Space Mono', monospace" }}>
                {label}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {usuario && row[usuario] ? (
                  <span style={{ color: "#0a3a5c", fontSize: "12px" }}>
                    {row[usuario]}
                  </span>
                ) : null}
                {badgeEtapa(row[campo] ?? "NO")}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}

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

  // Fila que se está mostrando en el modal de detalle (se abre al
  // clickear el código de producción, ver columna `codpro` más abajo).
  const [detalle, setDetalle] = useState(null);

  // Melaminas disponibles para el desplegable de `color` (ver
  // GET /productos/melaminas en articulos_controller.js — filtra
  // articulos por rubro "melamina"/"MELAMINA"). Se guarda el `codartint`
  // en produccion.color, pero en pantalla siempre se muestra `articulo`
  // (el nombre), vía este mapa.
  const [melaminas, setMelaminas] = useState([]);
  const nombreMelamina = (codartint) =>
    melaminas.find((m) => m.codartint === codartint)?.articulo ?? codartint;

  // Guardado de `color` por fila: mismo patrón de feedback que `modulo`.
  const [guardandoColorId, setGuardandoColorId] = useState(null);
  const [errorColorId, setErrorColorId] = useState(null);

  // Guardado de las columnas de seguimiento de proceso (DOMUS/OP/PERFORADO/
  // USPER/ARMADO/USARM/DESPACHO/USDES). Mismo patrón de feedback que
  // `modulo`/`color`, pero indexado por "id-campo" porque hay varias
  // columnas editables de este tipo en la misma fila.
  const [guardandoCampo, setGuardandoCampo] = useState(null); // `${id}-${campo}`
  const [errorCampo, setErrorCampo] = useState(null);

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
    authFetch(`${API}/productos/melaminas`)
      .then((r) => r.json())
      .then((data) => setMelaminas(Array.isArray(data) ? data : []))
      .catch(console.error);
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

  const handleColorChange = async (row, valor) => {
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, color: valor } : r)),
    );
    setGuardandoColorId(row.id);
    setErrorColorId(null);
    try {
      const res = await authFetch(`${API}/produccion/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: valor || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Error guardando color:", e);
      setErrorColorId(row.id);
    } finally {
      setGuardandoColorId(null);
    }
  };

  // ── Edición de las columnas de seguimiento de proceso ───────────────────

  // Select SI/NO (DOMUS, PERFORADO, ARMADO, DESPACHO): se guarda al cambiar,
  // igual que `color`.
  const handleEtapaChange = async (row, campo, valor) => {
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, [campo]: valor } : r)),
    );
    const key = `${row.id}-${campo}`;
    setGuardandoCampo(key);
    setErrorCampo(null);
    try {
      const res = await authFetch(`${API}/produccion/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error(`Error guardando ${campo}:`, e);
      setErrorCampo(key);
    } finally {
      setGuardandoCampo(null);
    }
  };

  // Input de texto (OP, USPER, USARM, USDES): se guarda al salir del campo,
  // igual que `modulo`.
  const handleTextoCampoChange = (id, campo, valor) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)),
    );
  };

  const handleTextoCampoBlur = async (row, campo) => {
    const key = `${row.id}-${campo}`;
    setGuardandoCampo(key);
    setErrorCampo(null);
    try {
      const res = await authFetch(`${API}/produccion/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: row[campo] || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error(`Error guardando ${campo}:`, e);
      setErrorCampo(key);
    } finally {
      setGuardandoCampo(null);
    }
  };

  // ── Filtro ────────────────────────────────────────────────────────────

  const q = search.toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (r.codpro ?? "").toLowerCase().includes(q) ||
      (r.cliente_nombre ?? "").toLowerCase().includes(q) ||
      String(r.numeropres ?? "").includes(q) ||
      (r.grupo ?? "").toLowerCase().includes(q) ||
      (r.producto ?? "").toLowerCase().includes(q) ||
      (r.modulo ?? "").toLowerCase().includes(q) ||
      nombreMelamina(r.color).toLowerCase().includes(q) ||
      (r.OP ?? "").toLowerCase().includes(q) ||
      (r.USPER ?? "").toLowerCase().includes(q) ||
      (r.USARM ?? "").toLowerCase().includes(q) ||
      (r.USDES ?? "").toLowerCase().includes(q),
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

  // ── Estilos compartidos por los campos editables de la tabla ───────────

  const estiloInput = (row, campo, guardandoId, errorId) => ({
    width: "100%",
    maxWidth: "140px",
    padding: "4px 8px",
    fontSize: "12px",
    fontFamily: "'Space Mono',monospace",
    border: `1.5px solid ${errorId === (campo ? `${row.id}-${campo}` : row.id) ? "#e57373" : "#b8d6ef"}`,
    borderRadius: "4px",
    background: guardandoId === (campo ? `${row.id}-${campo}` : row.id) ? "#fffbe6" : "#fff",
    color: "#0a3a5c",
  });

  // ── Columnas ──────────────────────────────────────────────────────────

  const columns = [
    {
      key: "codpro",
      label: "Cód.",
      render: (v, row) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setDetalle(row);
          }}
          title="Ver detalle"
          style={{
            display: "inline-block",
            background: "#0a3a5c",
            color: "#fff",
            borderRadius: "4px",
            padding: "1px 8px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.5px",
            fontFamily: "'Space Mono', monospace",
            cursor: "pointer",
          }}
        >
          {v ?? "—"}
        </span>
      ),
    },
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
    {
      key: "color",
      label: "Color",
      render: (v, row) => (
        <select
          value={row.color ?? ""}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleColorChange(row, e.target.value)}
          style={{
            width: "100%",
            maxWidth: "200px",
            padding: "4px 8px",
            fontSize: "12px",
            fontFamily: "'Space Mono',monospace",
            border: `1.5px solid ${
              errorColorId === row.id ? "#e57373" : "#b8d6ef"
            }`,
            borderRadius: "4px",
            background: guardandoColorId === row.id ? "#fffbe6" : "#fff",
            color: "#0a3a5c",
          }}
        >
          <option value="">Sin color</option>
          {melaminas.map((m) => (
            <option key={m.codartint} value={m.codartint}>
              {m.articulo}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "OP",
      label: "OP",
      render: (v, row) => (
        <input
          type="text"
          value={row.OP ?? ""}
          placeholder="—"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleTextoCampoChange(row.id, "OP", e.target.value)}
          onBlur={() => handleTextoCampoBlur(row, "OP")}
          maxLength={10}
          style={estiloInput(row, "OP", guardandoCampo, errorCampo)}
        />
      ),
    },
    // Las 4 etapas (Domus/Perforado/Armado/Despacho) siguen todas el mismo
    // patrón: select SI/NO que guarda al cambiar, y si tienen usuario
    // asociado, un input de texto al lado que guarda al salir del campo.
    ...ETAPAS.flatMap(({ campo, label, usuario }) => {
      const cols = [
        {
          key: campo,
          label,
          render: (v, row) => (
            <select
              value={row[campo] ?? "NO"}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleEtapaChange(row, campo, e.target.value)}
              style={estiloInput(row, campo, guardandoCampo, errorCampo)}
            >
              <option value="NO">NO</option>
              <option value="SI">SI</option>
            </select>
          ),
        },
      ];
      if (usuario) {
        cols.push({
          key: usuario,
          label: `Usuario (${label})`,
          render: (v, row) => (
            <input
              type="text"
              value={row[usuario] ?? ""}
              placeholder="—"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                handleTextoCampoChange(row.id, usuario, e.target.value)
              }
              onBlur={() => handleTextoCampoBlur(row, usuario)}
              maxLength={50}
              style={estiloInput(row, usuario, guardandoCampo, errorCampo)}
            />
          ),
        });
      }
      return cols;
    }),
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

      {detalle && (
        <DetalleProduccion
          row={detalle}
          nombreMelamina={nombreMelamina}
          onClose={() => setDetalle(null)}
        />
      )}
    </>
  );
}
