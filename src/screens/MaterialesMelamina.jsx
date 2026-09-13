import { useState, useEffect } from "react";
import DataTable from "../Component/DataTable";
import ActionBar from "../Component/ActionBar";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import ConfirmDelete from "../Component/ConfirmDelete";

const API = "https://integral-backend-production.up.railway.app";

// ── Componente ────────────────────────────────────────────────────────────
//
// CRUD plano de `materiales-melamina`: catálogo de combinaciones
// material/melamina/cantos, todas las columnas texto libre (VARCHAR(150),
// sin ninguna obligatoria). Edición inline directo sobre la grilla —a
// diferencia de ModulosDomus.jsx, acá no hay jerarquía artículo→piezas, es
// una sola tabla plana, así que no hace falta un panel/modal aparte.
//
// GET/POST/PUT/DELETE /materiales-melamina, ver materiales_routes.js.

const CAMPOS = [
  { campo: "material", label: "Material", maxLength: 150 },
  { campo: "melamina", label: "Melamina", maxLength: 150 },
  { campo: "canto1", label: "Canto1", maxLength: 150 },
  { campo: "canto2", label: "Canto2", maxLength: 150 },
  { campo: "canto3", label: "Canto3", maxLength: 150 },
  { campo: "canto4", label: "Canto4", maxLength: 150 },
];

export default function MaterialesMelamina({ authFetch }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [search, setSearch] = useState("");

  const [guardandoCampo, setGuardandoCampo] = useState(null);
  const [errorCampo, setErrorCampo] = useState(null);

  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState(null);

  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // ── Fetch principal ───────────────────────────────────────────────────

  const fetchMateriales = () => {
    setLoading(true);
    setErrorCarga(null);
    authFetch(`${API}/materiales-melamina`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error(e);
        setErrorCarga(e.message);
        setRows([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMateriales();
  }, []);

  // Colores de melamina: artículos con area=MELAMINA, mismo endpoint que
  // usa ModulosDomus.jsx para su desplegable de Color — acá reemplaza el
  // texto libre de la columna Melamina por un <select> con esas opciones.
  const [coloresMelamina, setColoresMelamina] = useState([]);
  useEffect(() => {
    authFetch(`${API}/articulos/colores-melamina`)
      .then((r) => r.json())
      .then((data) => setColoresMelamina(Array.isArray(data) ? data : []))
      .catch(() => setColoresMelamina([]));
  }, []);

  // ── Edición inline por fila ───────────────────────────────────────────

  const handleCampoChange = (id, campo, valor) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));
  };

  const handleCampoBlur = async (row, campo) => {
    const key = `${row.id}-${campo}`;
    setGuardandoCampo(key);
    setErrorCampo(null);
    try {
      const res = await authFetch(`${API}/materiales-melamina/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: row[campo] === "" ? null : row[campo] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error(`Error guardando ${campo}:`, e);
      setErrorCampo(key);
    } finally {
      setGuardandoCampo(null);
    }
  };

  // ── Alta ──────────────────────────────────────────────────────────────

  const handleNuevo = async () => {
    setCreando(true);
    setErrorCrear(null);
    try {
      const res = await authFetch(`${API}/materiales-melamina`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      fetchMateriales();
    } catch (e) {
      console.error("Error creando fila:", e);
      setErrorCrear(e.message || "No se pudo crear la fila.");
    } finally {
      setCreando(false);
    }
  };

  // ── Borrado ───────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      const res = await authFetch(`${API}/materiales-melamina/${aEliminar.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAEliminar(null);
      fetchMateriales();
    } catch (e) {
      console.error("Error eliminando fila:", e);
    } finally {
      setEliminando(false);
    }
  };

  // ── Filtro por búsqueda ───────────────────────────────────────────────

  const q = search.toLowerCase();
  const filtered = rows.filter((r) =>
    CAMPOS.some(({ campo }) => (r[campo] ?? "").toLowerCase().includes(q)),
  );

  // ── Estilos de los inputs editables ──────────────────────────────────

  const estiloInput = (id, campo) => ({
    width: "100%",
    maxWidth: "160px",
    padding: "4px 8px",
    fontSize: "12px",
    fontFamily: "'Space Mono',monospace",
    border: `1.5px solid ${errorCampo === `${id}-${campo}` ? "#e57373" : "#b8d6ef"}`,
    borderRadius: "4px",
    background: guardandoCampo === `${id}-${campo}` ? "#fffbe6" : "#fff",
    color: "#0a3a5c",
  });

  // ── Columnas de la grilla ─────────────────────────────────────────────

  const columns = [
    ...CAMPOS.map(({ campo, label, maxLength }) => {
      // Melamina: desplegable de artículos con area=MELAMINA en vez de
      // texto libre, para que el valor sea siempre un color existente.
      if (campo === "melamina") {
        return {
          key: campo,
          label,
          render: (v, row) => (
            <select
              value={row.melamina ?? ""}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const valor = e.target.value;
                handleCampoChange(row.id, "melamina", valor);
                handleCampoBlur({ ...row, melamina: valor }, "melamina");
              }}
              style={estiloInput(row.id, campo)}
            >
              <option value="">—</option>
              {coloresMelamina.map((c) => (
                <option key={c.codartint} value={c.articulo}>
                  {c.articulo}
                </option>
              ))}
            </select>
          ),
        };
      }
      return {
        key: campo,
        label,
        render: (v, row) => (
          <input
            type="text"
            value={row[campo] ?? ""}
            placeholder="—"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => handleCampoChange(row.id, campo, e.target.value)}
            onBlur={() => handleCampoBlur(row, campo)}
            maxLength={maxLength}
            style={estiloInput(row.id, campo)}
          />
        ),
      };
    }),
    {
      key: "_borrar",
      label: "",
      render: (v, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setAEliminar(row);
          }}
          title="Eliminar fila"
          style={{
            border: "none",
            background: "none",
            color: "#c0392b",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          🗑
        </button>
      ),
    },
  ];

  return (
    <>
      <ScreenHeader
        icon="🎨"
        title="Materiales Melamina"
        subtitle="Catálogo de combinaciones material / melamina / cantos"
      />

      <StatCards
        stats={[
          { label: "Total filas", value: rows.length },
          { label: "Filtradas", value: filtered.length },
        ]}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ActionBar
          selected={null}
          onNew={handleNuevo}
          onEdit={null}
          onDelete={null}
          search={search}
          onSearch={setSearch}
        />
      </div>

      {errorCrear && (
        <p style={{ color: "#c0392b", fontSize: 12, margin: "4px 0" }}>⚠ {errorCrear}</p>
      )}
      {creando && (
        <p style={{ color: "#4a8ab5", fontSize: 12, margin: "4px 0" }}>⏳ Creando fila...</p>
      )}

      {loading ? (
        <p style={{ padding: "24px", color: "#4a8ab5", fontFamily: "'Space Mono',monospace" }}>
          ⏳ Cargando materiales...
        </p>
      ) : errorCarga ? (
        <p style={{ padding: "24px", color: "#c0392b", fontFamily: "'Space Mono',monospace" }}>
          ⚠ No se pudo cargar: {errorCarga}
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ padding: "24px", color: "#8aabb8", fontFamily: "'Space Mono',monospace" }}>
          No hay materiales cargados todavía. Usá "Nuevo" para agregar el primero.
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          selectedId={null}
          onSelect={null}
          storageKey="materiales-melamina"
        />
      )}

      {aEliminar && (
        <ConfirmDelete
          item={aEliminar}
          title="¿Eliminar esta fila?"
          message={
            <>
              Vas a eliminar el material{" "}
              <strong>{aEliminar.material || `#${aEliminar.id}`}</strong>. Esta acción no se
              puede deshacer.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => !eliminando && setAEliminar(null)}
        />
      )}
    </>
  );
}
