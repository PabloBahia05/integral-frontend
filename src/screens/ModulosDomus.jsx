import { useState, useEffect } from "react";
import DataTable from "../Component/DataTable";
import ActionBar from "../Component/ActionBar";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import ConfirmDelete from "../Component/ConfirmDelete";

const API = "https://integral-backend-production.up.railway.app";

// ── Componente ────────────────────────────────────────────────────────────
//
// CRUD de `modulos-domus`: por artículo (codartint) guarda los datos que
// después completa el CSV de fórmulas de producción (ver
// GET /produccion/:id/formulas-csv en tabla-produccion_routes.js) — bpp,
// cant1..cant4, veta, y las medidas/fórmulas del módulo (ancho, alto,
// formulax, formulay). La pantalla se organiza agrupando por `modulo`
// (los botones de arriba filtran por módulo), como indica el comentario
// original del backend.
//
// Guardado: todos los campos editables se guardan con
// PUT /modulos-domus/:codartint, que hace upsert por `codartint` — no hace
// falta un endpoint separado para alta vs. edición.

const CAMPOS_TEXTO = [
  { campo: "bpp", label: "BPP", maxLength: 30 },
  { campo: "cant1", label: "Cant1", maxLength: 100 },
  { campo: "cant2", label: "Cant2", maxLength: 100 },
  { campo: "cant3", label: "Cant3", maxLength: 100 },
  { campo: "cant4", label: "Cant4", maxLength: 100 },
  { campo: "veta", label: "Veta", maxLength: 100 },
  { campo: "formulax", label: "Fórmula X", maxLength: 255 },
  { campo: "formulay", label: "Fórmula Y", maxLength: 255 },
];

const CAMPOS_NUMERICOS = [
  { campo: "ancho", label: "Ancho" },
  { campo: "alto", label: "Alto" },
  { campo: "cantidad", label: "Cantidad" },
];

export default function ModulosDomus({ authFetch, token }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [filtroModulo, setFiltroModulo] = useState(null);

  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // Guardado inline por campo: key = `${codartint}-${campo}`, mismo patrón
  // que `guardandoCampo`/`errorCampo` de Producción.jsx.
  const [guardandoCampo, setGuardandoCampo] = useState(null);
  const [errorCampo, setErrorCampo] = useState(null);

  // Modal de alta: nueva fila por codartint (el resto de los campos se
  // completa después, inline, en la tabla).
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nuevoCodartint, setNuevoCodartint] = useState("");
  const [nuevoModulo, setNuevoModulo] = useState("");
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState(null);
  // Buscador de artículo del modal de alta: tipea y elige de la lista,
  // igual que el selector de Material Placa/Guías en PresupuestoNuevo.jsx.
  const [nuevoBusqueda, setNuevoBusqueda] = useState("");
  const [nuevoResultados, setNuevoResultados] = useState([]);
  const [nuevoFocus, setNuevoFocus] = useState(false);
  const [buscandoArticulo, setBuscandoArticulo] = useState(false);

  // Búsqueda server-side con debounce contra /articulos/buscar-descripcion
  // (ya existe y busca por código de proveedor exacto o por palabras en la
  // columna `articulo`, hasta 8 resultados).
  useEffect(() => {
    if (!nuevoBusqueda.trim()) {
      setNuevoResultados([]);
      setBuscandoArticulo(false);
      return;
    }
    setBuscandoArticulo(true);
    const timer = setTimeout(() => {
      authFetch(
        `${API}/articulos/buscar-descripcion?q=${encodeURIComponent(nuevoBusqueda.trim())}`,
      )
        .then((r) => r.json())
        .then((data) => setNuevoResultados(Array.isArray(data) ? data : []))
        .catch(() => setNuevoResultados([]))
        .finally(() => setBuscandoArticulo(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [nuevoBusqueda, authFetch]);

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchModulosDomus = () => {
    setLoading(true);
    setErrorCarga(null);
    authFetch(`${API}/modulos-domus`)
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
    fetchModulosDomus();
  }, []);

  // ── Edición inline (guarda al salir del campo, PUT upsert) ──────────────

  const handleCampoChange = (codartint, campo, valor) => {
    setRows((prev) =>
      prev.map((r) => (r.codartint === codartint ? { ...r, [campo]: valor } : r)),
    );
  };

  const handleCampoBlur = async (row, campo) => {
    const key = `${row.codartint}-${campo}`;
    setGuardandoCampo(key);
    setErrorCampo(null);
    try {
      const res = await authFetch(`${API}/modulos-domus/${row.codartint}`, {
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

  // `modulo` cambia el agrupamiento, así que además de guardarlo hay que
  // refrescar la lista de módulos (para los botones de filtro) — mismo
  // guardado, solo que dispara fetchModulosDomus() al final en vez de
  // confiar en el estado local.
  const handleModuloBlur = async (row) => {
    await handleCampoBlur(row, "modulo");
    fetchModulosDomus();
  };

  // ── Alta de fila nueva ───────────────────────────────────────────────

  const handleCrearNuevo = async () => {
    if (!nuevoCodartint.trim()) return;
    setGuardandoNuevo(true);
    setErrorNuevo(null);
    try {
      const res = await authFetch(
        `${API}/modulos-domus/${nuevoCodartint.trim()}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modulo: nuevoModulo.trim() || null }),
        },
      );
      if (!res.ok) {
        let detalle = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) detalle = body.error;
        } catch {
          // el body no era JSON parseable, nos quedamos con el status
        }
        throw new Error(detalle);
      }
      setNuevoAbierto(false);
      setNuevoCodartint("");
      setNuevoModulo("");
      setNuevoBusqueda("");
      setNuevoResultados([]);
      fetchModulosDomus();
    } catch (e) {
      console.error("Error creando fila de modulos-domus:", e);
      setErrorNuevo(e.message || "No se pudo guardar.");
    } finally {
      setGuardandoNuevo(false);
    }
  };

  // ── DELETE ────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      const res = await authFetch(`${API}/modulos-domus/${aEliminar.codartint}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows((prev) => prev.filter((r) => r.codartint !== aEliminar.codartint));
      if (selected?.codartint === aEliminar.codartint) setSelected(null);
      setAEliminar(null);
    } catch (e) {
      console.error("Error borrando fila de modulos-domus:", e);
      alert("No se pudo borrar la fila. Revisá la consola.");
    } finally {
      setEliminando(false);
    }
  };

  // ── Filtro por módulo + búsqueda ─────────────────────────────────────

  const modulos = [...new Set(rows.map((r) => r.modulo).filter(Boolean))].sort();

  const q = search.toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (!filtroModulo || r.modulo === filtroModulo) &&
      ((r.codartint ?? "").toLowerCase().includes(q) ||
        (r.articulo_descripcion ?? "").toLowerCase().includes(q) ||
        (r.modulo ?? "").toLowerCase().includes(q) ||
        (r.bpp ?? "").toLowerCase().includes(q) ||
        (r.veta ?? "").toLowerCase().includes(q)),
  );

  const sinModulo = rows.filter((r) => !r.modulo || !r.modulo.trim()).length;

  // ── Estilos de los inputs editables ─────────────────────────────────

  const estiloInput = (row, campo, ancho = "100px") => ({
    width: "100%",
    maxWidth: ancho,
    padding: "4px 8px",
    fontSize: "12px",
    fontFamily: "'Space Mono',monospace",
    border: `1.5px solid ${
      errorCampo === `${row.codartint}-${campo}` ? "#e57373" : "#b8d6ef"
    }`,
    borderRadius: "4px",
    background:
      guardandoCampo === `${row.codartint}-${campo}` ? "#fffbe6" : "#fff",
    color: "#0a3a5c",
  });

  // ── Columnas ──────────────────────────────────────────────────────────

  const columns = [
    { key: "codartint", label: "Código", render: (v) => v ?? "—" },
    {
      key: "articulo_descripcion",
      label: "Artículo",
      render: (v) => v ?? "—",
    },
    {
      key: "modulo",
      label: "Módulo",
      render: (v, row) => (
        <input
          type="text"
          value={row.modulo ?? ""}
          placeholder="Sin cargar"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleCampoChange(row.codartint, "modulo", e.target.value)}
          onBlur={() => handleModuloBlur(row)}
          maxLength={50}
          style={estiloInput(row, "modulo", "140px")}
        />
      ),
    },
    ...CAMPOS_NUMERICOS.map(({ campo, label }) => ({
      key: campo,
      label,
      render: (v, row) => (
        <input
          type="number"
          step="0.1"
          value={row[campo] ?? ""}
          placeholder="—"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleCampoChange(row.codartint, campo, e.target.value)}
          onBlur={() => handleCampoBlur(row, campo)}
          style={estiloInput(row, campo, "90px")}
        />
      ),
    })),
    ...CAMPOS_TEXTO.map(({ campo, label, maxLength }) => ({
      key: campo,
      label,
      render: (v, row) => (
        <input
          type="text"
          value={row[campo] ?? ""}
          placeholder="—"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleCampoChange(row.codartint, campo, e.target.value)}
          onBlur={() => handleCampoBlur(row, campo)}
          maxLength={maxLength}
          style={estiloInput(row, campo, campo === "bpp" || campo.startsWith("cant") || campo === "veta" ? "100px" : "160px")}
        />
      ),
    })),
  ];

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      <ScreenHeader
        icon="🧩"
        title="Módulos Domus"
        subtitle="Datos por artículo para el CSV de fórmulas de producción"
      />

      <StatCards
        stats={[
          { label: "Total artículos", value: rows.length },
          { label: "Sin módulo", value: sinModulo },
          { label: "Filtrados", value: filtered.length },
        ]}
      />

      {modulos.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            margin: "12px 0",
            flexWrap: "wrap",
          }}
        >
          {modulos.map((m) => {
            const activo = filtroModulo === m;
            return (
              <button
                key={m}
                onClick={() => setFiltroModulo(activo ? null : m)}
                style={{
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: `1.5px solid ${activo ? "#0a3a5c" : "#b8d6ef"}`,
                  background: activo ? "#0a3a5c" : "#fff",
                  color: activo ? "#fff" : "#0a3a5c",
                  cursor: "pointer",
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ActionBar
          selected={selected}
          onNew={() => setNuevoAbierto(true)}
          onEdit={null}
          onDelete={selected ? () => setAEliminar(selected) : null}
          search={search}
          onSearch={setSearch}
        />
      </div>

      {loading ? (
        <p style={{ padding: "24px", color: "#4a8ab5", fontFamily: "'Space Mono',monospace" }}>
          ⏳ Cargando módulos Domus...
        </p>
      ) : errorCarga ? (
        <p style={{ padding: "24px", color: "#c0392b", fontFamily: "'Space Mono',monospace" }}>
          ⚠ No se pudo cargar: {errorCarga}
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ padding: "24px", color: "#8aabb8", fontFamily: "'Space Mono',monospace" }}>
          No hay artículos cargados todavía. Usá "Nuevo" para agregar el primero.
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          selectedId={selected?.id}
          onSelect={(row) => setSelected(row?.id === selected?.id ? null : row)}
          storageKey={`modulos-domus-${filtroModulo ?? "todos"}`}
        />
      )}

      {aEliminar && (
        <ConfirmDelete
          item={aEliminar}
          title="¿Eliminar artículo de Módulos Domus?"
          message={
            <>
              Vas a eliminar los datos de{" "}
              <strong>{aEliminar.articulo_descripcion ?? aEliminar.codartint}</strong>.
              Esto vacía BPP/Cant1-4/Veta para ese artículo en el próximo CSV
              de producción que se genere. Esta acción no se puede deshacer.
            </>
          }
          onConfirm={handleDelete}
          onClose={() => !eliminando && setAEliminar(null)}
        />
      )}

      {nuevoAbierto && (
        <div
          onClick={() => !guardandoNuevo && setNuevoAbierto(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,58,92,0.55)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              maxWidth: 380,
              background: "#fff",
              borderRadius: 10,
              padding: "20px 22px",
              fontFamily: "'Space Mono', monospace",
              color: "#0a3a5c",
            }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>
              Nuevo artículo en Módulos Domus
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#4a8ab5" }}>
              El resto de los campos (BPP, Cant1-4, Veta, medidas) se cargan
              después, editando directo en la tabla.
            </p>

            <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
              Artículo (buscar por código o nombre)
            </label>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                type="text"
                value={nuevoBusqueda}
                onChange={(e) => {
                  setNuevoBusqueda(e.target.value);
                  setNuevoCodartint(e.target.value);
                }}
                onFocus={() => setNuevoFocus(true)}
                onBlur={() => setTimeout(() => setNuevoFocus(false), 160)}
                placeholder="Ej: KITMP000 o Kit Melamina..."
                autoComplete="off"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "6px 8px",
                  fontSize: 13,
                  fontFamily: "'Space Mono',monospace",
                  border: "1.5px solid #b8d6ef",
                  borderRadius: 4,
                }}
              />
              {nuevoFocus && nuevoResultados.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #b8cfe0",
                    borderTop: "none",
                    zIndex: 1200,
                    boxShadow: "0 6px 18px #0002",
                    maxHeight: 220,
                    overflowY: "auto",
                    borderRadius: "0 0 3px 3px",
                  }}
                >
                  {nuevoResultados.map((a) => (
                    <div
                      key={a.codartint}
                      onMouseDown={() => {
                        setNuevoCodartint(a.codartint);
                        setNuevoBusqueda(`${a.articulo} — ${a.codartint}`);
                        setNuevoResultados([]);
                      }}
                      style={{
                        padding: "8px 14px",
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: "'Space Mono',monospace",
                        borderBottom: "1px solid #eef2f6",
                        color: "#0a3a5c",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#ddeefa")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "#fff")
                      }
                    >
                      <span style={{ fontWeight: 700 }}>{a.articulo}</span>
                      <span
                        style={{ color: "#8aabcc", marginLeft: 8, fontSize: 10 }}
                      >
                        {a.codartint}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {nuevoFocus &&
                !buscandoArticulo &&
                nuevoResultados.length === 0 &&
                nuevoBusqueda.trim().length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "1px solid #b8cfe0",
                      borderTop: "none",
                      zIndex: 1200,
                      padding: "10px 14px",
                      color: "#8aabcc",
                      fontSize: 11,
                      borderRadius: "0 0 3px 3px",
                    }}
                  >
                    Sin resultados — se usará el código tipeado tal cual
                  </div>
                )}
            </div>

            <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
              Módulo (opcional)
            </label>
            <input
              type="text"
              value={nuevoModulo}
              onChange={(e) => setNuevoModulo(e.target.value)}
              placeholder="Ej: MP-01"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "6px 8px",
                fontSize: 13,
                fontFamily: "'Space Mono',monospace",
                border: "1.5px solid #b8d6ef",
                borderRadius: 4,
                marginBottom: 12,
              }}
            />

            {errorNuevo && (
              <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 12px" }}>
                {errorNuevo}
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => {
                  setNuevoAbierto(false);
                  setNuevoBusqueda("");
                  setNuevoResultados([]);
                }}
                disabled={guardandoNuevo}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  border: "1.5px solid #b8d6ef",
                  background: "#fff",
                  color: "#4a8ab5",
                  cursor: "pointer",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearNuevo}
                disabled={guardandoNuevo || !nuevoCodartint.trim()}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  border: "none",
                  background: "#1a7a44",
                  color: "#fff",
                  cursor: guardandoNuevo ? "wait" : "pointer",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  opacity: guardandoNuevo ? 0.6 : 1,
                }}
              >
                {guardandoNuevo ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
