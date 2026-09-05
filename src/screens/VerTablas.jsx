import { useState, useEffect } from "react";
import ScreenHeader from "../Component/ScreenHeader";
import Clientes from "./Clientes";
import Productos from "./Productos";
import TiposEscritorio from "./TiposEscritorio";
import TiposDespensero from "./TiposDespensero";
import Formulas from "./Formulas";
import Margen from "./Margen";
import PresupuestosMamparasTabla from "./PresupuestosMamparasTabla";
import PresupuestosPuertasTabla from "./PresupuestosPuertasTabla";
import Colocacion from "./Colocacion";
import Asociaciones from "./Asociaciones";
import AsociacionesForm from "./AsociacionesForm";
import FormStd from "./FormStd";
import AsocFormStd from "./AsocFormStd";
import Lista from "./Lista";
import Proveedores from "./Proveedores";
import Feriados from "./Feriados";
import SemanasAnio from "./SemanasAnio";
import UsuariosApp from "./UsuariosApp";
import Usuarios from "./Usuarios";
import Selector from "./Selector";
import {
  TEXTO_SENA_DEFAULT,
  getTextoSena,
  fetchTextoSena,
  setTextoSenaGlobal,
} from "./textoSenaStore";

const API = "https://integral-backend-production.up.railway.app";

const ROLES = ["admin", "gestor", "produccion", "operario"];

const MODULOS = [
  { id: "clientes",                  label: "Clientes",               acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "productos",                 label: "Productos",              acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "actualizar-precios",        label: "Actualizar Precios",     acciones: ["ver", "subir"] },
  { id: "presupuesto-muebles",       label: "Presup. Muebles",        acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "presupuesto-mamparas",      label: "Presup. Mamparas",       acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "presupuestos-tabla",        label: "Lista Presup. Mamparas", acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "presupuesto-nuevo",         label: "Presup. Nuevo",          acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "presupuesto-vanitory",      label: "Presup. Vanitory",       acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "presupuestos-vanitory-tabla", label: "Lista Presup. Vanitory", acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "presupuesto-amoblamiento",  label: "Presup. Amoblamiento",   acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "mueble-especial",           label: "Mueble Especial",        acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "lista-presupuestos-2",      label: "Lista Presupuestos",     acciones: ["ver"] },
  { id: "obras-confirmadas",         label: "Obras Confirmadas",      acciones: ["ver", "editar"] },
  { id: "produccion",                label: "Producción",             acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "facturas",                  label: "Facturas",               acciones: ["ver", "subir", "eliminar"] },
  { id: "facturas-venta",            label: "Facturas Emitidas",      acciones: ["ver", "eliminar"] },
  { id: "factura-manual",            label: "Facturar (Manual)",      acciones: ["ver", "crear"] },
  { id: "historial-facturas",        label: "Historial Facturas",     acciones: ["ver"] },
  { id: "afip-iva",                  label: "AFIP IVA",               acciones: ["ver", "editar"] },
  { id: "ver-tablas",                label: "Ver Tablas",             acciones: ["ver", "editar"] },
  {
    id: "ver-tablas-botones",
    label: "Ver Tablas · Botones",
    acciones: [
      "clientes", "productos", "escritorio-tipos", "despensero-tipos",
      "formulas", "margen", "presupuestos-mamparas-tabla", "presupuestos-puertas-tabla",
      "colocacion", "asociaciones", "asociaciones-form", "form-std", "asoc-form-std",
      "lista", "feriados", "semanas-anio", "usuarios-app", "permisos",
      "selector", "texto-sena",
    ],
  },
  { id: "lista-margenes",            label: "Lista Márgenes",         acciones: ["ver", "editar"] },
  { id: "vehiculos-mantenimiento",   label: "Vehículos - Mantenim.",  acciones: ["ver", "crear", "editar", "eliminar"] },
  { id: "cuenta-corriente",          label: "Clientes Activos",       acciones: ["ver", "editar"] },
  { id: "visor-dwg",                 label: "Visor 3D Módulos",       acciones: ["ver"] },
  { id: "chat",                      label: "Chat",                   acciones: ["ver"] },
  { id: "usuarios",                  label: "Usuarios",               acciones: ["ver", "crear", "editar", "eliminar"] },
];
// NOTA: los módulos nuevos (actualizar-precios, presupuesto-muebles,
// presupuestos-tabla, obras-confirmadas, produccion, facturas-venta,
// factura-manual, afip-iva, vehiculos-mantenimiento, cuenta-corriente,
// visor-dwg) se agregaron con acciones "razonables" a criterio, no
// confirmadas contra cada pantalla real — ajustar si alguna no coincide
// con los botones que esa pantalla realmente tiene.

// Botones del panel principal (App.jsx) — mantener sincronizado con el
// array `buttons` de App.jsx si se agrega/saca un botón del dashboard.
const PANEL_BOTONES = [
  { id: "clientes", label: "Clientes" },
  { id: "productos", label: "Productos" },
  { id: "presupuesto-nuevo", label: "Presup. Nuevo" },
  { id: "ver-tablas", label: "Ver Tablas" },
  { id: "lista-presupuestos-2", label: "Lista Presupuestos" },
  { id: "cuenta-corriente", label: "Clientes Activos" },
  { id: "obras-confirmadas", label: "Obras Confirmadas" },
  { id: "produccion", label: "Producción" },
  { id: "visor-dwg", label: "Visor 3D Módulos" },
  { id: "chat", label: "Chat" },
];

// ── Componente Permisos ──────────────────────────────────────────────────────
function GestorPermisos({ onBack, token }) {
  const [permisos, setPermisos] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // ── Orden del panel principal por rol ──
  const [ordenPanel, setOrdenPanel] = useState({}); // { rol: [modulo, modulo, ...] }
  const [rolOrden, setRolOrden] = useState(ROLES[0]);
  const [arrastrando, setArrastrando] = useState(null); // índice que se está arrastrando

  useEffect(() => {
    fetch(`${API}/orden-panel`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((rows) => {
        // rows: [{ rol, modulo, orden }, ...]
        const map = {};
        rows.forEach(({ rol, modulo, orden }) => {
          map[rol] = map[rol] ?? [];
          map[rol][orden] = modulo;
        });
        const completo = {};
        ROLES.forEach((rol) => {
          const guardado = (map[rol] ?? []).filter(Boolean);
          // agrega al final cualquier botón nuevo que no esté guardado todavía
          const faltantes = PANEL_BOTONES.map((b) => b.id).filter(
            (id) => !guardado.includes(id),
          );
          completo[rol] = [...guardado, ...faltantes];
        });
        setOrdenPanel(completo);
      })
      .catch(() => {
        const completo = {};
        ROLES.forEach((rol) => {
          completo[rol] = PANEL_BOTONES.map((b) => b.id);
        });
        setOrdenPanel(completo);
      });
  }, []);

  const moverItem = (rol, desde, hasta) => {
    setOrdenPanel((prev) => {
      const todas = prev[rol] ?? [];
      const slots = [];
      todas.forEach((id, idx) => {
        if (rol === "admin" || get(rol, id, "ver")) slots.push(idx);
      });
      if (hasta < 0 || hasta >= slots.length) return prev;
      const visibles = slots.map((idx) => todas[idx]);
      const [item] = visibles.splice(desde, 1);
      visibles.splice(hasta, 0, item);
      const nuevoTodas = [...todas];
      slots.forEach((idx, i) => {
        nuevoTodas[idx] = visibles[i];
      });
      return { ...prev, [rol]: nuevoTodas };
    });
  };

  const guardarOrden = async () => {
    setSaving(true);
    setMsg("");
    const rows = [];
    ROLES.forEach((rol) => {
      (ordenPanel[rol] ?? []).forEach((modulo, i) => {
        rows.push({ rol, modulo, orden: i });
      });
    });
    try {
      const res = await fetch(`${API}/orden-panel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orden: rows }),
      });
      if (!res.ok) throw new Error();
      setMsg("✅ Orden guardado correctamente");
    } catch {
      setMsg("❌ Error al guardar el orden");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  // ── Orden de las pantallas dentro de "Ver Tablas", por rol ──
  const [ordenTablas, setOrdenTablas] = useState({}); // { rol: [tablaId, tablaId, ...] }
  const [arrastrandoTabla, setArrastrandoTabla] = useState(null);

  useEffect(() => {
    fetch(`${API}/orden-tablas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((rows) => {
        // rows: [{ rol, modulo, orden }, ...]  (modulo = id de la tabla)
        const map = {};
        rows.forEach(({ rol, modulo, orden }) => {
          map[rol] = map[rol] ?? [];
          map[rol][orden] = modulo;
        });
        const completo = {};
        ROLES.forEach((rol) => {
          const guardado = (map[rol] ?? []).filter(Boolean);
          // agrega al final cualquier pantalla nueva que no esté guardada todavía
          const faltantes = TABLAS.map((t) => t.id).filter(
            (id) => !guardado.includes(id),
          );
          completo[rol] = [...guardado, ...faltantes];
        });
        setOrdenTablas(completo);
      })
      .catch(() => {
        const completo = {};
        ROLES.forEach((rol) => {
          completo[rol] = TABLAS.map((t) => t.id);
        });
        setOrdenTablas(completo);
      });
  }, []);

  // Subconjunto de ordenTablas[rol] que ese rol tiene permitido ver
  // (según la matriz "ver-tablas-botones"), en el orden guardado.
  const visiblesTablas = (rol) =>
    (ordenTablas[rol] ?? []).filter(
      (tablaId) => rol === "admin" || get(rol, "ver-tablas-botones", tablaId),
    );

  // Subconjunto de ordenPanel[rol] que ese rol tiene permitido ver
  // (permiso "ver" del módulo correspondiente), en el orden guardado.
  const visiblesPanel = (rol) =>
    (ordenPanel[rol] ?? []).filter((id) => rol === "admin" || get(rol, id, "ver"));

  // Mueve una pantalla dentro del subconjunto visible para `rol` (índices
  // relativos a ese subconjunto), preservando la posición de las pantallas
  // que ese rol no tiene permitido ver.
  const moverItemTabla = (rol, desde, hasta) => {
    setOrdenTablas((prev) => {
      const todas = prev[rol] ?? [];
      const slots = [];
      todas.forEach((id, idx) => {
        if (rol === "admin" || get(rol, "ver-tablas-botones", id)) slots.push(idx);
      });
      if (hasta < 0 || hasta >= slots.length) return prev;
      const visibles = slots.map((idx) => todas[idx]);
      const [item] = visibles.splice(desde, 1);
      visibles.splice(hasta, 0, item);
      const nuevoTodas = [...todas];
      slots.forEach((idx, i) => {
        nuevoTodas[idx] = visibles[i];
      });
      return { ...prev, [rol]: nuevoTodas };
    });
  };

  const guardarOrdenTablas = async () => {
    setSaving(true);
    setMsg("");
    const rows = [];
    ROLES.forEach((rol) => {
      (ordenTablas[rol] ?? []).forEach((modulo, i) => {
        rows.push({ rol, modulo, orden: i });
      });
    });
    try {
      const res = await fetch(`${API}/orden-tablas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orden: rows }),
      });
      if (!res.ok) throw new Error();
      setMsg("✅ Orden guardado correctamente");
    } catch {
      setMsg("❌ Error al guardar el orden");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  useEffect(() => {
    fetch(`${API}/permisos`, {
      headers: { Authorization: `Bearer ${token}` },
    })
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    .rol-badge.gestor { background:#fff3cd; color:#856404; }
    .rol-badge.produccion { background:#e2f0d9; color:#2e6b34; }
    .rol-badge.operario { background:#e0eef8; color:#0a3a5c; }
    .perm-msg { font-size:12px; margin-left:auto; }
    .mod-separator td { background:#e8f4ff !important; font-weight:700; color:#0a3a5c; font-size:11px; letter-spacing:1px; padding:6px 12px; }
    .orden-roles { display:flex; gap:8px; margin:14px 0 6px; flex-wrap:wrap; }
    .orden-rol-tab { border:1px solid #cfe3f2; background:#fff; border-radius:6px; padding:4px 10px; cursor:pointer; }
    .orden-rol-tab.active { border-color:#4361ee; background:#eef2ff; }
    .orden-note { font-size:12px; color:#6699bb; margin-bottom:12px; }
    .orden-lista { display:flex; flex-direction:column; gap:6px; max-width:420px; }
    .orden-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border:1px solid #e0eef8;
      border-radius:6px; background:#f8fbff; cursor:grab; user-select:none; }
    .orden-item.dragging { opacity:0.4; border-style:dashed; }
    .orden-handle { color:#99bbcc; font-size:14px; }
    .orden-label { flex:1; font-size:12px; color:#0a3a5c; font-weight:700; }
    .orden-flechas { display:flex; gap:4px; }
    .orden-flecha { width:22px; height:22px; border:1px solid #cfe3f2; background:#fff; border-radius:4px;
      cursor:pointer; font-size:11px; line-height:1; }
    .orden-flecha:disabled { opacity:0.3; cursor:default; }
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

      {/* ── Orden del Panel Principal ── */}
      <div className="perm-header" style={{ marginTop: 36 }}>
        <span className="perm-title">↕️ Orden del Panel Principal</span>
        <button
          className="perm-btn"
          style={{ marginLeft: "auto" }}
          onClick={guardarOrden}
          disabled={saving}
        >
          {saving ? "Guardando..." : "💾 Guardar orden"}
        </button>
      </div>
      <div className="orden-roles">
        {ROLES.map((rol) => (
          <button
            key={rol}
            className={`orden-rol-tab ${rol === rolOrden ? "active" : ""}`}
            onClick={() => setRolOrden(rol)}
          >
            <span className={`rol-badge ${rol}`}>{rol.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <p className="orden-note">
        Arrastrá los botones para cambiar el orden en que aparecen en el panel
        principal para el rol <strong>{rolOrden.toUpperCase()}</strong>. Solo
        se listan los botones que ese rol tiene permitido ver.
      </p>
      <div className="orden-lista">
        {visiblesPanel(rolOrden).map((moduloId, i, arr) => {
          const boton = PANEL_BOTONES.find((b) => b.id === moduloId);
          return (
            <div
              key={moduloId}
              className={`orden-item ${arrastrando === i ? "dragging" : ""}`}
              draggable
              onDragStart={() => setArrastrando(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (arrastrando !== null && arrastrando !== i) {
                  moverItem(rolOrden, arrastrando, i);
                }
                setArrastrando(null);
              }}
              onDragEnd={() => setArrastrando(null)}
            >
              <span className="orden-handle">⠿</span>
              <span className="orden-label">{boton?.label ?? moduloId}</span>
              <div className="orden-flechas">
                <button
                  className="orden-flecha"
                  onClick={() => moverItem(rolOrden, i, i - 1)}
                  disabled={i === 0}
                >
                  ↑
                </button>
                <button
                  className="orden-flecha"
                  onClick={() => moverItem(rolOrden, i, i + 1)}
                  disabled={i === arr.length - 1}
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
        {visiblesPanel(rolOrden).length === 0 && (
          <p className="orden-note">
            El rol {rolOrden.toUpperCase()} no tiene ningún botón permitido en
            el panel principal.
          </p>
        )}
      </div>

      {/* ── Orden de Pantallas dentro de "Ver Tablas" ── */}
      <div className="perm-header" style={{ marginTop: 36 }}>
        <span className="perm-title">↕️ Orden de Pantallas (Ver Tablas)</span>
        <button
          className="perm-btn"
          style={{ marginLeft: "auto" }}
          onClick={guardarOrdenTablas}
          disabled={saving}
        >
          {saving ? "Guardando..." : "💾 Guardar orden"}
        </button>
      </div>
      <div className="orden-roles">
        {ROLES.map((rol) => (
          <button
            key={rol}
            className={`orden-rol-tab ${rol === rolOrden ? "active" : ""}`}
            onClick={() => setRolOrden(rol)}
          >
            <span className={`rol-badge ${rol}`}>{rol.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <p className="orden-note">
        Arrastrá para cambiar el orden en que aparecen las pantallas dentro de
        "Ver Tablas" para el rol <strong>{rolOrden.toUpperCase()}</strong>. Solo
        se listan las pantallas que ese rol tiene permitido ver (definido arriba,
        en "Ver Tablas · Botones").
      </p>
      <div className="orden-lista">
        {visiblesTablas(rolOrden).map((tablaId, i, arr) => {
          const tabla = TABLAS.find((t) => t.id === tablaId);
          return (
            <div
              key={tablaId}
              className={`orden-item ${arrastrandoTabla === i ? "dragging" : ""}`}
              draggable
              onDragStart={() => setArrastrandoTabla(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (arrastrandoTabla !== null && arrastrandoTabla !== i) {
                  moverItemTabla(rolOrden, arrastrandoTabla, i);
                }
                setArrastrandoTabla(null);
              }}
              onDragEnd={() => setArrastrandoTabla(null)}
            >
              <span className="orden-handle">⠿</span>
              <span className="orden-label">
                {tabla?.icon} {tabla?.label ?? tablaId}
              </span>
              <div className="orden-flechas">
                <button
                  className="orden-flecha"
                  onClick={() => moverItemTabla(rolOrden, i, i - 1)}
                  disabled={i === 0}
                >
                  ↑
                </button>
                <button
                  className="orden-flecha"
                  onClick={() => moverItemTabla(rolOrden, i, i + 1)}
                  disabled={i === arr.length - 1}
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
        {visiblesTablas(rolOrden).length === 0 && (
          <p className="orden-note">
            El rol {rolOrden.toUpperCase()} no tiene ninguna pantalla permitida
            en "Ver Tablas".
          </p>
        )}
      </div>
    </div>
  );
}

// ── Componente Texto de Seña ─────────────────────────────────────────────────
function TextoSenaEditor({ onBack, token }) {
  const [texto, setTexto] = useState(getTextoSena());
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let vivo = true;
    fetchTextoSena(token).then((valor) => {
      if (vivo) setTexto(valor);
      setCargando(false);
    });
    return () => {
      vivo = false;
    };
  }, [token]);

  const guardar = async () => {
    setGuardando(true);
    setMsg("");
    try {
      await setTextoSenaGlobal(texto, token);
      setMsg("✅ Guardado — ya está disponible para todos los presupuestos nuevos");
    } catch {
      setMsg("❌ No se pudo guardar, probá de nuevo");
    } finally {
      setGuardando(false);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  const restaurarEstandar = () => {
    setTexto(TEXTO_SENA_DEFAULT);
  };

  const TS = `
    .tsena-wrap { padding: 24px; font-family: 'Space Mono', monospace; max-width: 720px; }
    .tsena-header { display:flex; align-items:center; gap:16px; margin-bottom:16px; flex-wrap:wrap; }
    .tsena-title { font-size:20px; font-weight:800; color:#0a3a5c; }
    .tsena-btn { padding:7px 16px; border:1px solid #4361ee; border-radius:4px; background:#4361ee;
      color:#fff; font-family:inherit; font-size:12px; cursor:pointer; }
    .tsena-btn.sec { background:#fff; color:#4361ee; }
    .tsena-note { font-size:12px; color:#6699bb; margin-bottom:12px; }
    .tsena-textarea { width:100%; font-family:'Space Mono','Courier New',monospace; font-size:12px;
      padding:10px; border-radius:6px; border:1px solid #ccc; resize:vertical; }
    .tsena-msg { font-size:12px; margin-left:auto; }
  `;

  return (
    <div className="tsena-wrap">
      <style>{TS}</style>
      <div className="tsena-header">
        <button className="tsena-btn sec" onClick={onBack}>← Volver</button>
        <span className="tsena-title">✍️ Texto de Seña</span>
        {msg && <span className="tsena-msg">{msg}</span>}
      </div>
      <div className="tsena-note">
        Texto estándar de seña/condiciones que se muestra en el PDF de
        Presupuesto (recuadro amarillo). Se guarda en el backend y es
        compartido por todas las PCs/usuarios. No se edita desde la pantalla
        de Presupuesto.
      </div>
      <textarea
        className="tsena-textarea"
        rows={14}
        value={texto}
        disabled={cargando}
        onChange={(e) => setTexto(e.target.value)}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button className="tsena-btn" onClick={guardar} disabled={cargando || guardando}>
          {guardando ? "Guardando..." : "💾 Guardar"}
        </button>
        <button className="tsena-btn sec" onClick={restaurarEstandar} disabled={cargando}>
          Restaurar estándar
        </button>
      </div>
    </div>
  );
}

const TABLAS = [
  { id: "clientes", label: "Clientes", icon: "👥", color: "#eb56d7" },
  { id: "productos", label: "Productos", icon: "🛒", color: "#ff6b6b" },
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
  {
    id: "presupuestos-puertas-tabla",
    label: "Presupuestos Puertas",
    icon: "🚪",
    color: "#9d4edd",
  },
  { id: "colocacion", label: "Colocación", icon: "📐", color: "#f77f00" },
  { id: "asociaciones", label: "Asociaciones", icon: "🔗", color: "#6a994e" },
  {
    id: "asociaciones-form",
    label: "Asoc. Fórmulas",
    icon: "🧮",
    color: "#e63946",
  },
  { id: "form-std", label: "Fórmulas Estándar", icon: "🧮", color: "#8338ec" },
  {
    id: "asoc-form-std",
    label: "Asoc. Fórmulas Estándar",
    icon: "🧮",
    color: "#8338ec",
  },
  { id: "lista", label: "Lista Margen", icon: "📊", color: "#20b2aa" },
  { id: "feriados", label: "Feriados", icon: "📅", color: "#ffb703" },
  { id: "semanas-anio", label: "Semanas y Horas Esperadas", icon: "🗓️", color: "#3a86ff" },
  { id: "usuarios-app", label: "Usuarios App",    icon: "🔐", color: "#e63946" },
  { id: "permisos",     label: "Permisos por Rol", icon: "🛡️", color: "#6366f1" },
  { id: "selector",     label: "Selector",         icon: "🎛️", color: "#118ab2" },
  { id: "texto-sena",   label: "Texto de Seña",    icon: "✍️", color: "#ff9f1c" },
];

export default function VerTablas({
  clientes,
  clientesCRUD,
  selectedCliente,
  productos,
  productosCRUD,
  selectedProducto,
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
  presupuestosPuertas,
  presupuestosPuertasCRUD,
  selectedPresupuestoPuerta,
  colocaciones,
  colocacionesCRUD,
  selectedColocacion,
  asociaciones,
  asociacionesCRUD,
  selectedAsociacion,
  asociacionesForm,
  asociacionesFormCRUD,
  selectedAsociacionForm,
  formStd,
  formStdCRUD,
  selectedFormStd,
  asocFormStd,
  asocFormStdCRUD,
  selectedAsocFormStd,
  listas,
  onSaveLista,
  onDeleteLista,
  // ── proveedores ──
  proveedores,
  proveedoresCRUD,
  selectedProveedor,
  // ── feriados / semanas del año ──
  feriados,
  feriadosCRUD,
  selectedFeriado,
  semanasAnio,
  tablaInicial,
  token,
  puedo = () => true,
  rol = "operario",
}) {
  const [tablaActiva, setTablaActiva] = useState(tablaInicial ?? null);
  const [modal, setModal] = useState(null);
  const [selectedLista, setSelectedLista] = useState(null);

  // ── Orden de pantallas dentro de "Ver Tablas", ya guardado por el admin ──
  const [ordenTablas, setOrdenTablas] = useState({});

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/orden-tablas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((rows) => {
        const map = {};
        rows.forEach(({ rol: r, modulo, orden }) => {
          map[r] = map[r] ?? [];
          map[r][orden] = modulo;
        });
        const limpio = {};
        Object.keys(map).forEach((r) => {
          limpio[r] = map[r].filter(Boolean);
        });
        setOrdenTablas(limpio);
      })
      .catch(console.error);
  }, [token]);

  // Pantallas que el rol actual tiene permitido ver, en el orden guardado.
  // Las que no tengan orden guardado se agregan al final en el orden original.
  const tablasVisibles = (() => {
    const permitidas = TABLAS.filter((tabla) => puedo("ver-tablas-botones", tabla.id));
    const orden = ordenTablas[rol];
    if (!orden || orden.length === 0) return permitidas;
    const porId = new Map(permitidas.map((t) => [t.id, t]));
    const ordenadas = orden.map((id) => porId.get(id)).filter(Boolean);
    const yaUsadas = new Set(ordenadas.map((t) => t.id));
    const faltantes = permitidas.filter((t) => !yaUsadas.has(t.id));
    return [...ordenadas, ...faltantes];
  })();

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
  if (tablaActiva === "presupuestos-puertas-tabla")
    return (
      <div>
        {back}
        <PresupuestosPuertasTabla
          presupuestos={presupuestosPuertas ?? []}
          selected={selectedPresupuestoPuerta}
          modal={modal}
          {...localCRUD(presupuestosPuertasCRUD ?? {})}
          onSelect={(row) => presupuestosPuertasCRUD?.onSelect?.(row)}
          token={token}
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
          token={token}
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
          formulas={formulas ?? []}
          selected={selectedAsociacion}
          modal={modal}
          {...localCRUD(asociacionesCRUD ?? {})}
          onSelect={(row) => asociacionesCRUD?.onSelect?.(row)}
          token={token}
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
          token={token}
        />
      </div>
    );

  if (tablaActiva === "form-std")
    return (
      <div>
        {back}
        <FormStd
          formulas={formStd ?? []}
          selected={selectedFormStd}
          modal={modal}
          {...localCRUD(formStdCRUD ?? {})}
          token={token}
        />
      </div>
    );

  if (tablaActiva === "asoc-form-std")
    return (
      <div>
        {back}
        <AsocFormStd
          asocFormStd={asocFormStd ?? []}
          productos={productos ?? []}
          selected={selectedAsocFormStd}
          modal={modal}
          {...localCRUD(asocFormStdCRUD ?? {})}
          onSelect={(row) => asocFormStdCRUD?.onSelect?.(row)}
          token={token}
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
          token={token}
          {...localCRUD(proveedoresCRUD ?? {})}
          onSelect={(row) => proveedoresCRUD?.onSelect?.(row)}
        />
      </div>
    );

  // ── feriados ──
  if (tablaActiva === "feriados")
    return (
      <div>
        {back}
        <Feriados
          feriados={feriados ?? []}
          selected={selectedFeriado}
          modal={modal}
          {...localCRUD(feriadosCRUD ?? {})}
          onSelect={(row) => feriadosCRUD?.onSelect?.(row)}
        />
      </div>
    );

  // ── semanas del año (solo lectura) ──
  if (tablaActiva === "semanas-anio")
    return (
      <div>
        {back}
        <SemanasAnio semanasAnio={semanasAnio ?? []} />
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

  // ── permisos ──
  if (tablaActiva === "permisos")
    return <GestorPermisos onBack={volver} token={token} />;

  // ── texto de seña ──
  if (tablaActiva === "texto-sena")
    return <TextoSenaEditor onBack={volver} token={token} />;

  // ── selector ──
  if (tablaActiva === "selector")
    return (
      <div>
        {back}
        <Selector token={token} />
      </div>
    );

  return (
    <>
      <ScreenHeader
        icon="🗃️"
        title="Ver Tablas"
        subtitle="Seleccioná una tabla para gestionar"
      />
      <div className="presup-grid">
        {tablasVisibles.map((tabla) => (
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
