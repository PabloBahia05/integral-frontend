import { useState, useEffect } from "react";
import DataTable from "../Component/DataTable";
import ActionBar from "../Component/ActionBar";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import ConfirmDelete from "../Component/ConfirmDelete";
import {
  API,
  COLS_ENCABEZADO_CONFIRMADAS,
  cruzarConProduccion,
  PRESUPUESTOS_CSS,
  ItemsPanel,
  HistorialModal,
} from "./presupuestosShared";

// Presupuestos confirmados. Antes vivía junto con "Lista Presupuestos" en
// ListaPresupuestos2.jsx (con un prop soloConfirmadas); se separaron en dos
// pantallas porque manejan listas y flujos distintos — ver
// ListaPresupuestos.jsx y presupuestosShared.jsx (lo que sí es común a
// ambas).

export default function ObrasConfirmadas({
  onAbrirPresupuesto,
  onNuevoPresupuesto,
  authFetch,
}) {
  // "Obras Confirmadas" necesita 1 fila POR REVISIÓN confirmada (una obra
  // puede tener varias revisiones ya cerradas), así que usa un endpoint
  // distinto al de "Lista Presupuestos" (que trae solo 1 fila por
  // numeropres — la última revisión guardada).
  const [encabezados, setEncabezados] = useState([]);
  const [loadingEnc, setLoadingEnc] = useState(true);

  const [itemsDetalle, setItemsDetalle] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [produccionSeleccionada, setProduccionSeleccionada] = useState([]);
  const [melaminas, setMelaminas] = useState([]);
  const [guardandoColorId, setGuardandoColorId] = useState(null);
  const [errorColorId, setErrorColorId] = useState(null);

  // Línea de precio confirmada por grupo (numeropres/revision seleccionado).
  // Formato { "ALACENAS": 0, "BAJO MESADA": 1 } — 0/1/2 → valor1/valor2/valor3.
  const [lineaPorGrupo, setLineaPorGrupo] = useState({});

  const [revisiones, setRevisiones] = useState([]);
  const [loadingRev, setLoadingRev] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);

  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const [revisionAEliminar, setRevisionAEliminar] = useState(null);
  const [eliminandoRevision, setEliminandoRevision] = useState(false);

  const [presupuestoAEliminar, setPresupuestoAEliminar] = useState(null);
  const [eliminandoPresupuesto, setEliminandoPresupuesto] = useState(false);

  // ── Fetch encabezados ──────────────────────────────────────────────────

  const fetchEncabezados = () => {
    setLoadingEnc(true);
    authFetch(`${API}/tabla-presupuestos/revisiones-confirmadas`)
      .then((r) => r.json())
      .then((data) =>
        setEncabezados(
          Array.isArray(data)
            ? data.map((e) => ({
                ...e,
                id: `${e.numeropres}-${e.revision}`,
              }))
            : [],
        ),
      )
      .catch(console.error)
      .finally(() => setLoadingEnc(false));
  };

  useEffect(() => {
    fetchEncabezados();
    authFetch(`${API}/productos/melaminas`)
      .then((r) => r.json())
      .then((data) => setMelaminas(Array.isArray(data) ? data : []))
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch ítems + producción al seleccionar ───────────────────────────

  useEffect(() => {
    if (!selected) {
      setItemsDetalle([]);
      setProduccionSeleccionada([]);
      setLineaPorGrupo({});
      return;
    }
    setLoadingItems(true);
    Promise.all([
      authFetch(
        `${API}/tabla-presupuestos?numeropres=${selected.numeropres}&revision=${selected.revision}`,
      ).then((r) => r.json()),
      authFetch(
        `${API}/produccion?numeropres=${selected.numeropres}&revision=${selected.revision}`,
      ).then((r) => r.json()),
      authFetch(
        `${API}/tabla-presupuestos/linea-grupo/${selected.numeropres}/${selected.revision}`,
      ).then((r) => r.json()),
    ])
      .then(([items, produccion, lineaGrupo]) => {
        setItemsDetalle(Array.isArray(items) ? items : []);
        setProduccionSeleccionada(Array.isArray(produccion) ? produccion : []);
        setLineaPorGrupo(lineaGrupo?.lineaPorGrupo ?? {});
      })
      .catch(console.error)
      .finally(() => setLoadingItems(false));
  }, [selected]);

  // ── Fetch revisiones al abrir historial ───────────────────────────────

  const abrirHistorial = () => {
    if (!selected) return;
    setLoadingRev(true);
    setModalHistorial(true);
    authFetch(`${API}/tabla-presupuestos/revisiones/${selected.numeropres}`)
      .then((r) => r.json())
      .then((data) =>
        setRevisiones(
          Array.isArray(data)
            ? data.map((r) => ({ ...r, id: `${r.numeropres}-${r.revision}` }))
            : [],
        ),
      )
      .catch(console.error)
      .finally(() => setLoadingRev(false));
  };

  // ── Selección ──────────────────────────────────────────────────────────

  const handleSelect = (row) => {
    setSelected(row?.id === selected?.id ? null : row);
  };

  // ── Filtro ─────────────────────────────────────────────────────────────

  const q = search.toLowerCase();

  // Presupuestos (numeropres) que tienen AL MENOS UNA revisión confirmada.
  // Una vez que un presupuesto quedó confirmado, todas sus revisiones
  // (incluidas las nuevas que se generen después, aunque su propio flag
  // "confirmado" todavía esté en 0) deben verse acá.
  const numeroprosConfirmados = new Set(
    encabezados.filter((e) => !!e.confirmado).map((e) => e.numeropres),
  );

  const filtradosBase = encabezados
    .filter((e) => numeroprosConfirmados.has(e.numeropres))
    .filter(
      (e) =>
        (e.nombre ?? "").toLowerCase().includes(q) ||
        String(e.numeropres ?? "").includes(q) ||
        (e.telefono1 ?? "").toLowerCase().includes(q) ||
        (e.telefono2 ?? "").toLowerCase().includes(q),
    );

  // El endpoint (/revisiones-confirmadas) trae 1 fila por CADA revisión
  // confirmada, no 1 por presupuesto — así, si un presupuesto tiene varias
  // revisiones ya confirmadas, aparecía repetido en la tabla. Acá lo
  // colapsamos a la última revisión de cada numeropres, igual que en "Lista
  // Presupuestos"; el historial completo sigue disponible con el botón
  // "Revisiones". El SELECT del backend ya viene ordenado numeropres DESC,
  // revision DESC, así que la primera ocurrencia de cada numeropres en el
  // array ya es la más nueva.
  const filtered = Array.from(
    filtradosBase
      .reduce((map, e) => {
        if (!map.has(e.numeropres)) map.set(e.numeropres, e);
        return map;
      }, new Map())
      .values(),
  );

  const itemsConColor = cruzarConProduccion(itemsDetalle, produccionSeleccionada);

  const totalSeleccionado = itemsDetalle.reduce(
    (s, it) => s + Number(it.valor1 ?? 0) * (Number(it.cantidad) || 1),
    0,
  );

  const handleColorChange = async (produccionId, valor) => {
    setProduccionSeleccionada((prev) =>
      prev.map((p) => (p.id === produccionId ? { ...p, color: valor } : p)),
    );
    setGuardandoColorId(produccionId);
    setErrorColorId(null);
    try {
      const res = await authFetch(`${API}/produccion/${produccionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: valor || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Error guardando color:", e);
      setErrorColorId(produccionId);
    } finally {
      setGuardandoColorId(null);
    }
  };

  // Confirma qué línea de precio (0/1/2) quedó vendida para un grupo. Envía
  // el objeto lineaPorGrupo COMPLETO (no solo el grupo tocado) — mismo
  // patrón que ya usa el editor con este mismo estado.
  const handleLineaGrupoChange = async (grupo, lineaIdx) => {
    if (!selected) return;
    const next = { ...lineaPorGrupo, [grupo]: lineaIdx };
    setLineaPorGrupo(next);
    try {
      const res = await authFetch(
        `${API}/tabla-presupuestos/linea-grupo/${selected.numeropres}/${selected.revision}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineaPorGrupo: next }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Error guardando línea por grupo:", e);
      // Revertir en caso de error, para no dejar la UI mintiendo sobre lo guardado.
      setLineaPorGrupo(lineaPorGrupo);
      alert("No se pudo guardar la línea confirmada para ese grupo. Probá de nuevo.");
    }
  };

  // ── DELETE revisión individual ────────────────────────────────────────

  const handleDeleteRevision = async () => {
    if (!revisionAEliminar) return;
    setEliminandoRevision(true);
    try {
      const res = await authFetch(
        `${API}/tabla-presupuestos/revision/${revisionAEliminar.numeropres}/${revisionAEliminar.revision}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRevisiones((prev) => prev.filter((r) => r.id !== revisionAEliminar.id));
      fetchEncabezados();
      setRevisionAEliminar(null);
    } catch (e) {
      console.error("Error borrando revisión:", e);
      alert("No se pudo borrar la revisión. Revisá la consola.");
    } finally {
      setEliminandoRevision(false);
    }
  };

  // ── DELETE presupuesto completo ───────────────────────────────────────

  const handleDeletePresupuesto = async () => {
    if (!presupuestoAEliminar) return;
    setEliminandoPresupuesto(true);
    try {
      const res = await authFetch(`${API}/tabla-indice/${presupuestoAEliminar.numeropres}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEncabezados((prev) =>
        prev.filter((e) => e.numeropres !== presupuestoAEliminar.numeropres),
      );
      if (selected?.numeropres === presupuestoAEliminar.numeropres) setSelected(null);
      setPresupuestoAEliminar(null);
    } catch (e) {
      console.error("Error borrando presupuesto:", e);
      alert("No se pudo borrar el presupuesto. Revisá la consola.");
    } finally {
      setEliminandoPresupuesto(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <style>{PRESUPUESTOS_CSS}</style>

      <ScreenHeader
        icon="✅"
        title="Obras Confirmadas"
        subtitle="Presupuestos confirmados"
      />

      <StatCards
        stats={[
          { label: "Total confirmadas", value: numeroprosConfirmados.size },
          { label: "Filtrados", value: filtered.length },
        ]}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ActionBar
          selected={selected}
          onNew={onNuevoPresupuesto ?? null}
          onEdit={null}
          onDelete={selected ? () => setPresupuestoAEliminar(selected) : null}
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

      {loadingEnc ? (
        <p style={{ padding: "24px", color: "#4a8ab5", fontFamily: "'Space Mono',monospace" }}>
          ⏳ Cargando presupuestos...
        </p>
      ) : (
        <DataTable
          columns={COLS_ENCABEZADO_CONFIRMADAS}
          rows={filtered}
          selectedId={selected?.id}
          onSelect={handleSelect}
          storageKey="lista-presupuestos-confirmadas"
        />
      )}

      <ItemsPanel
        selected={selected}
        loadingItems={loadingItems}
        itemsConColor={itemsConColor}
        totalSeleccionado={totalSeleccionado}
        melaminas={melaminas}
        guardandoColorId={guardandoColorId}
        errorColorId={errorColorId}
        onChangeColor={handleColorChange}
        lineaPorGrupo={lineaPorGrupo}
        onChangeLineaGrupo={handleLineaGrupoChange}
      />

      {modalHistorial && selected && (
        <HistorialModal
          selected={selected}
          loadingRev={loadingRev}
          revisiones={revisiones}
          onClose={() => setModalHistorial(false)}
          onAbrirPresupuesto={onAbrirPresupuesto}
          onEliminarRevision={(row) => setRevisionAEliminar(row)}
        />
      )}

      {revisionAEliminar && (
        <ConfirmDelete
          item={revisionAEliminar}
          onConfirm={handleDeleteRevision}
          onClose={() => !eliminandoRevision && setRevisionAEliminar(null)}
        />
      )}

      {presupuestoAEliminar && (
        <ConfirmDelete
          item={presupuestoAEliminar}
          title="¿Eliminar presupuesto completo?"
          message={
            <>
              Vas a eliminar el presupuesto{" "}
              <strong>N° {String(presupuestoAEliminar.numeropres).padStart(4, "0")}</strong>{" "}
              ({presupuestoAEliminar.nombre ?? "sin cliente"}) y{" "}
              <strong>TODAS sus revisiones</strong>. Esta acción no se puede deshacer.
            </>
          }
          onConfirm={handleDeletePresupuesto}
          onClose={() => !eliminandoPresupuesto && setPresupuestoAEliminar(null)}
        />
      )}
    </>
  );
}
