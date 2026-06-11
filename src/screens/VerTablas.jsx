import { useState } from "react";
import ScreenHeader from "../Component/ScreenHeader";
import Clientes from "./Clientes";
import Productos from "./Productos";
import MamparasTipos from "./MamparasTipos";
import TiposVanitory from "./TiposVanitory";
import TiposEscritorio from "./TiposEscritorio";
import TiposDespensero from "./TiposDespensero";
import Formulas from "./Formulas";
import Margen from "./Margen";
import PresupuestosMamparasTabla from "./PresupuestosMamparasTabla";
import Colocacion from "./Colocacion";
import Asociaciones from "./Asociaciones";
import AsociacionesForm from "./AsociacionesForm";
import Lista from "./Lista";
import Proveedores from "./Proveedores";
import UsuariosApp from "./UsuariosApp";
import Anviz from "./Anviz";
import Usuarios from "./Usuarios";

const API = "https://integral-backend-production.up.railway.app";

const ROLES = ["admin", "supervisor", "operario"];

const MODULOS = [
  { id: "clientes",                  label: "Clientes",               acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "productos",                 label: "Productos",              acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "presupuesto-mamparas",      label: "Presup. Mamparas",       acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "presupuesto-nuevo",         label: "Presup. Nuevo",          acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "presupuesto-vanitory",      label: "Presup. Vanitory",       acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "presupuesto-amoblamiento",  label: "Presup. Amoblamiento",   acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "mueble-especial",           label: "Mueble Especial",        acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "facturas",                  label: "Facturas",               acciones: ["ver", "subir", "eliminar"] },
  { id: "historial-facturas",        label: "Historial Facturas",     acciones: ["ver"] },
  { id: "ver-tablas",                label: "Ver Tablas",             acciones: ["ver", "editar"] },
  { id: "lista-margenes",            label: "Lista Márgenes",         acciones: ["ver", "editar"] },
  { id: "anviz",                     label: "Asistencia",             acciones: ["ver", "crear", "eliminar"] },
  { id: "usuarios",                  label: "Usuarios",               acciones: ["ver", "crear", "editar", "eliminar"] },
];

// ── Componente Permisos ──────────────────────────────────────────────────────
function GestorPermisos({ onBack }) {
  const [permisos, setPermisos] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useState(() => {
    fetch(`${API}/permisos`)
      .then((r) => r.json())
      .then((rows) => {
        // rows: [{ rol, modulo, accion, permitido }, ...]
        const map = {};
        rows.forEach(({ rol, modulo, accion, permitido }) => {
          if (!map[rol]) map[rol] = {};
          if (!map[rol][modulo]) map[rol][modulo] = {};
          map[rol][modulo][accion] = !!permitido;
        });
        // defaults: todo permitido para admin si no hay registros
        ROLES.forEach((rol) => {
          MODULOS.forEach(({ id, acciones }) => {
            acciones.forEach((ac) => {
              if (!map[rol]?.[id]?.[ac] === undefined) return;
              map[rol] = map[rol] ?? {};
              map[rol][id] = map[rol][id] ?? {};
              if (map[rol][id][ac] === undefined)
                map[rol][id][ac] = rol === "admin";
            });
          });
        });
        setPermisos(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const get = (rol, modulo, accion) => permisos?.[rol]?.[modulo]?.[accion] ?? (rol === "admin");

  const toggle = (rol, modulo, accion) => {
    if (rol === "admin") return; // admin siempre tiene todo
    setPermisos((prev) => {
      const next = structuredClone(prev);
      next[rol] = next[rol] ?? {};
      next[rol][modulo] = next[rol][modulo] ?? {};
      next[rol][modulo][accion] = !get(rol, modulo, accion);
      return next;
    });
  };

  const guardar = async () => {
    setSaving(true);
    setMsg("");
    const rows = [];
    ROLES.forEach((rol) => {
      MODULOS.forEach(({ id, acciones }) => {
        acciones.forEach((ac) => {
          rows.push({ rol, modulo: id, accion: ac, permitido: get(rol, id, ac) ? 1 : 0 });
        });
      });
    });
    try {
      const res = await fetch(`${API}/permisos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permisos: rows }),
      });
      if (!res.ok) throw new Error();
      setMsg("✅ Permisos guardados correctamente");
    } catch {
      setMsg("❌ Error al guardar");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  const PS = `
    .perm-wrap { padding: 24px; font-family: 'Space Mono', monospace; }
    .perm-header { display:flex; align-items:center; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
    .perm-title { font-size:20px; font-weight:800; color:#0a3a5c; }
    .perm-btn { padding:7px 16px; border:1px solid #4361ee; border-radius:4px; background:#4361ee;
      color:#fff; font-family:inherit; font-size:12px; cursor:pointer; }
    .perm-btn.sec { background:#fff; color:#4361ee; }
    .perm-table-wrap { overflow-x:auto; }
    table.perm { border-collapse:collapse; font-size:12px; min-width:700px; width:100%; }
    table.perm th { background:#0a3a5c; color:#fff; padding:8px 12px; text-align:center;
      font-size:10px; letter-spacing:1px; text-transform:uppercase; white-space:nowrap; }
    table.perm th.mod-col { text-align:left; min-width:160px; }
    table.perm td { padding:7px 12px; border-bottom:1px solid #e0eef8; text-align:center; vertical-align:middle; }
    table.perm td.mod-name { text-align:left; color:#0a3a5c; font-weight:700; font-size:11px; background:#f8fbff; }
    table.perm td.accion-name { text-align:left; color:#6699bb; font-size:11px; padding-left:24px; }
    table.perm tr:hover td { background:#f0f8ff; }
    table.perm td.mod-name:hover, table.perm tr:hover td.mod-name { background:#e8f4ff; }
    .chk { width:18px; height:18px; cursor:pointer; accent-color:#4361ee; }
    .chk:disabled { opacity:0.35; cursor:default; }
    .rol-head { display:flex; flex-direction:column; align-items:center; gap:2px; }
    .rol-badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:700; }
    .rol-badge.admin { background:#fde8e8; color:#c0392b; }
    .rol-badge.supervisor { background:#fff3cd; color:#856404; }
    .rol-badge.operario { background:#e0eef8; color:#0a3a5c; }
    .perm-msg { font-size:12px; margin-left:auto; }
    .mod-separator td { background:#e8f4ff !important; font-weight:700; color:#0a3a5c; font-size:11px; letter-spacing:1px; padding:6px 12px; }
  `;

  if (loading) return <div className="perm-wrap"><style>{PS}</style><p style={{color:"#99bbcc"}}>Cargando permisos...</p></div>;

  return (
    <div className="perm-wrap">
      <style>{PS}</style>
      <div className="perm-header">
        <button className="perm-btn sec" onClick={onBack}>← Volver</button>
        <span className="perm-title">🔐 Permisos por Rol</span>
        {msg && <span className="perm-msg">{msg}</span>}
        <button className="perm-btn" style={{marginLeft:"auto"}} onClick={guardar} disabled={saving}>
          {saving ? "Guardando..." : "💾 Guardar cambios"}
        </button>
      </div>
      <div className="perm-table-wrap">
        <table className="perm">
          <thead>
            <tr>
              <th className="mod-col">Módulo / Acción</th>
              {ROLES.map((rol) => (
                <th key={rol} colSpan={
                  MODULOS.reduce((max, m) => Math.max(max, m.acciones.length), 0)
                }>
                  <div className="rol-head">
                    <span className={`rol-badge ${rol}`}>{rol.toUpperCase()}</span>
                  </div>
                </th>
              ))}
            </tr>
            <tr>
              <th className="mod-col"></th>
              {ROLES.map((rol) =>
                Array.from({ length: MODULOS.reduce((max, m) => Math.max(max, m.acciones.length), 0) }).map((_, i) => (
                  <th key={`${rol}-${i}`} style={{fontSize:9, opacity:0.7}}></th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {MODULOS.map(({ id, label, acciones }) => (
              <>
                <tr key={`sep-${id}`} className="">
                  <td colSpan={1 + ROLES.length * MODULOS.reduce((max, m) => Math.max(max, m.acciones.length), 0)}
                      style={{background:"#e8f4ff", fontWeight:700, color:"#0a3a5c", fontSize:11, letterSpacing:1, padding:"6px 12px"}}>
                    {label}
                  </td>
                </tr>
                {acciones.map((ac) => (
                  <tr key={`${id}-${ac}`}>
                    <td className="accion-name">→ {ac}</td>
                    {ROLES.map((rol) => (
                      <td key={rol} colSpan={MODULOS.reduce((max, m) => Math.max(max, m.acciones.length), 0)}>
                        <input
                          type="checkbox"
                          className="chk"
                          checked={get(rol, id, ac)}
                          disabled={rol === "admin"}
                          onChange={() => toggle(rol, id, ac)}
                          title={rol === "admin" ? "Admin siempre tiene acceso completo" : `${rol} — ${label} — ${ac}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TABLAS = [
  { id: "clientes", label: "Clientes", icon: "👥", color: "#eb56d7" },
  { id: "productos", label: "Productos", icon: "🛒", color: "#ff6b6b" },
  {
    id: "mamparas-tipos",
    label: "Tipos de Mampara",
    icon: "🪟",
    color: "#c77dff",
  },
  {
    id: "vanitory-tipos",
    label: "Tipos de Vanitory",
    icon: "🛁",
    color: "#00b4d8",
  },
  {
    id: "escritorio-tipos",
    label: "Tipos de Escritorio",
    icon: "🖥️",
    color: "#f4a261",
  },
  {
    id: "despensero-tipos",
    label: "Tipos de Despensero",
    icon: "🗄️",
    color: "#2ec4b6",
  },
  { id: "formulas", label: "Fórmulas", icon: "🧮", color: "#e63946" },
  { id: "margen", label: "Márgenes", icon: "📊", color: "#2a9d8f" },
  {
    id: "presupuestos-mamparas-tabla",
    label: "Presupuestos Mamparas",
    icon: "📋",
    color: "#4361ee",
  },
  { id: "colocacion", label: "Colocación", icon: "📐", color: "#f77f00" },
  { id: "asociaciones", label: "Asociaciones", icon: "🔗", color: "#6a994e" },
  {
    id: "asociaciones-form",
    label: "Asoc. Fórmulas",
    icon: "🧮",
    color: "#e63946",
  },
  { id: "lista", label: "Lista Margen", icon: "📊", color: "#20b2aa" },
  { id: "usuarios-app", label: "Usuarios App",    icon: "🔐", color: "#e63946" },
  { id: "anviz",        label: "Accesos Anviz",   icon: "🕐", color: "#0a7a3c" },
  { id: "permisos",     label: "Permisos por Rol", icon: "🛡️", color: "#6366f1" },
];

export default function VerTablas({
  clientes,
  clientesCRUD,
  selectedCliente,
  productos,
  productosCRUD,
  selectedProducto,
  mamparasTipos,
  mamparasTiposCRUD,
  selectedMamparaTipo,
  tiposVanitory,
  tiposVanitoryRUD,
  selectedTipoVanitory,
  tiposEscritorio,
  tiposEscritorioRUD,
  selectedTipoEscritorio,
  tiposDespensero,
  tiposDespenseroRUD,
  selectedTipoDespensero,
  formulas,
  formulasCRUD,
  selectedFormula,
  margen,
  margenCRUD,
  selectedMargen,
  presupuestosMamparas,
  presupuestosMamparasCRUD,
  selectedPresupuestoMampara,
  colocaciones,
  colocacionesCRUD,
  selectedColocacion,
  asociaciones,
  asociacionesCRUD,
  selectedAsociacion,
  asociacionesForm,
  asociacionesFormCRUD,
  selectedAsociacionForm,
  listas,
  onSaveLista,
  onDeleteLista,
  // ── proveedores ──
  proveedores,
  proveedoresCRUD,
  selectedProveedor,
  tablaInicial,
  token,
}) {
  const [tablaActiva, setTablaActiva] = useState(tablaInicial ?? null);
  const [modal, setModal] = useState(null);
  const [selectedLista, setSelectedLista] = useState(null);

  const volver = () => {
    setTablaActiva(null);
    setModal(null);
  };

  const back = (
    <button className="ver-tablas-back" onClick={volver}>
      ← Volver a tablas
    </button>
  );

  const localCRUD = (crud) => ({
    ...crud,
    onOpenModal: (m) => setModal(m),
    onCloseModal: () => setModal(null),
  });

  if (tablaActiva === "clientes")
    return (
      <div>
        {back}
        <Clientes
          clientes={clientes}
          selected={selectedCliente}
          modal={modal}
          {...localCRUD(clientesCRUD)}
        />
      </div>
    );
  if (tablaActiva === "productos")
    return (
      <div>
        {back}
        <Productos
          productos={productos}
          selected={selectedProducto}
          modal={modal}
          {...localCRUD(productosCRUD)}
        />
      </div>
    );
  if (tablaActiva === "mamparas-tipos")
    return (
      <div>
        {back}
        <MamparasTipos
          mamparasTipos={mamparasTipos}
          selected={selectedMamparaTipo}
          modal={modal}
          {...localCRUD(mamparasTiposCRUD)}
        />
      </div>
    );
  if (tablaActiva === "vanitory-tipos")
    return (
      <div>
        {back}
        <TiposVanitory
          tiposVanitory={tiposVanitory ?? []}
          selected={selectedTipoVanitory}
          modal={modal}
          {...localCRUD(tiposVanitoryRUD ?? {})}
        />
      </div>
    );
  if (tablaActiva === "escritorio-tipos")
    return (
      <div>
        {back}
        <TiposEscritorio
          tiposEscritorio={tiposEscritorio ?? []}
          selected={selectedTipoEscritorio}
          modal={modal}
          {...localCRUD(tiposEscritorioRUD ?? {})}
        />
      </div>
    );
  if (tablaActiva === "despensero-tipos")
    return (
      <div>
        {back}
        <TiposDespensero
          tiposDespensero={tiposDespensero ?? []}
          selected={selectedTipoDespensero}
          modal={modal}
          {...localCRUD(tiposDespenseroRUD ?? {})}
          onSelect={(row) => tiposDespenseroRUD?.onSelect?.(row)}
        />
      </div>
    );
  if (tablaActiva === "formulas")
    return (
      <div>
        {back}
        <Formulas
          formulas={formulas ?? []}
          selected={selectedFormula}
          modal={modal}
          {...localCRUD(formulasCRUD ?? {})}
        />
      </div>
    );
  if (tablaActiva === "margen")
    return (
      <div>
        {back}
        <Margen
          margen={margen ?? []}
          selected={selectedMargen}
          modal={modal}
          {...localCRUD(margenCRUD ?? {})}
        />
      </div>
    );
  if (tablaActiva === "presupuestos-mamparas-tabla")
    return (
      <div>
        {back}
        <PresupuestosMamparasTabla
          presupuestos={presupuestosMamparas ?? []}
          selected={selectedPresupuestoMampara}
          modal={modal}
          {...localCRUD(presupuestosMamparasCRUD ?? {})}
          onSelect={(row) => presupuestosMamparasCRUD?.onSelect?.(row)}
        />
      </div>
    );
  if (tablaActiva === "colocacion")
    return (
      <div>
        {back}
        <Colocacion
          colocaciones={colocaciones ?? []}
          productos={productos ?? []}
          selected={selectedColocacion}
          modal={modal}
          {...localCRUD(colocacionesCRUD ?? {})}
          onSelect={(row) => colocacionesCRUD?.onSelect?.(row)}
        />
      </div>
    );

  if (tablaActiva === "asociaciones")
    return (
      <div>
        {back}
        <Asociaciones
          asociaciones={asociaciones ?? []}
          productos={productos ?? []}
          selected={selectedAsociacion}
          modal={modal}
          {...localCRUD(asociacionesCRUD ?? {})}
          onSelect={(row) => asociacionesCRUD?.onSelect?.(row)}
        />
      </div>
    );

  if (tablaActiva === "asociaciones-form")
    return (
      <div>
        {back}
        <AsociacionesForm
          asociacionesForm={asociacionesForm ?? []}
          productos={productos ?? []}
          selected={selectedAsociacionForm}
          modal={modal}
          {...localCRUD(asociacionesFormCRUD ?? {})}
          onSelect={(row) => asociacionesFormCRUD?.onSelect?.(row)}
        />
      </div>
    );

  if (tablaActiva === "lista")
    return (
      <div>
        {back}
        <Lista
          listas={listas ?? []}
          selected={selectedLista}
          modal={modal}
          onSave={onSaveLista}
          onDelete={onDeleteLista}
          onOpenModal={(m) => setModal(m)}
          onCloseModal={() => setModal(null)}
          onSelect={(row) =>
            setSelectedLista(row?.id === selectedLista?.id ? null : row)
          }
        />
      </div>
    );

  // ── proveedores ──
  if (tablaActiva === "proveedores")
    return (
      <div>
        {back}
        <Proveedores
          proveedores={proveedores ?? []}
          selected={selectedProveedor}
          modal={modal}
          {...localCRUD(proveedoresCRUD ?? {})}
          onSelect={(row) => proveedoresCRUD?.onSelect?.(row)}
        />
      </div>
    );

  // ── usuarios app ──
  if (tablaActiva === "usuarios-app")
    return (
      <div>
        {back}
        <UsuariosApp token={token} />
      </div>
    );

  // ── anviz ──
  if (tablaActiva === "anviz")
    return (
      <div>
        <Anviz onBack={volver} />
      </div>
    );

  // ── permisos ──
  if (tablaActiva === "permisos")
    return <GestorPermisos onBack={volver} />;

  return (
    <>
      <ScreenHeader
        icon="🗃️"
        title="Ver Tablas"
        subtitle="Seleccioná una tabla para gestionar"
      />
      <div className="presup-grid">
        {TABLAS.map((tabla) => (
          <button
            key={tabla.id}
            className="presup-card ver-tablas-card"
            style={{ "--card-accent": tabla.color }}
            onClick={() => setTablaActiva(tabla.id)}
          >
            <span className="presup-icon">{tabla.icon}</span>
            <span className="presup-label">{tabla.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
