// Helpers, columnas y subcomponentes de presentación compartidos entre
// ListaPresupuestos.jsx y ObrasConfirmadas.jsx (antes un solo componente,
// ListaPresupuestos2.jsx, con un prop soloConfirmadas). Se separaron en dos
// pantallas independientes porque manejaban listas y flujos claramente
// distintos; lo que quedó acá es lo que sí era 100% idéntico entre ambas.

import { useState } from "react";
import DataTable from "../Component/DataTable";
import Modal from "../Component/Modal";

export const API = "https://integral-backend-production.up.railway.app";

// ── Formato ─────────────────────────────────────────────────────────────

export const formatPeso = (n) =>
  n != null && Number(n) !== 0
    ? "$" + Number(n).toLocaleString("es-AR").replace(/,/g, ".")
    : "—";

export const formatFecha = (f) => {
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

export const formatLineas = (row) =>
  [row.linea1, row.linea2, row.linea3].filter((v) => v != null && v !== "").join(", ") || "—";

export const formatLista = (row) => {
  const v = row.lista ?? row.idlista ?? row.numlista;
  return v != null && v !== "" ? String(v) : "—";
};

// ── Columnas encabezados (SIN montos — esta lista se arma desde
// presupuesto_info, liviana, no agrega tabla_presupuestos) ─────────────────

export const COLS_ENCABEZADO = [
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
    key: "referencia",
    label: "Referencia",
    render: (v) => v || "—",
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
  {
    key: "confirmado",
    label: "Estado",
    render: (v) => (
      <span
        style={{
          display: "inline-block",
          background: v ? "#e8f5e9" : "#f5f5f5",
          color: v ? "#1b5e20" : "#888",
          border: `1px solid ${v ? "#a5d6a7" : "#ddd"}`,
          borderRadius: "4px",
          padding: "1px 8px",
          fontSize: "11px",
          fontWeight: 700,
          fontFamily: "'Space Mono', monospace",
        }}
      >
        {v ? "✅ Confirmada" : "— Pendiente"}
      </span>
    ),
  },
  { key: "actualizado_en", label: "Última modificación", render: (v) => formatFecha(v) },
  { key: "actualizado_por", label: "Por", render: (v) => v ?? "—" },
];

// En "Obras Confirmadas" cada fila es una revisión puntual (viene de
// /tabla-presupuestos/revisiones-confirmadas, que sí trae total1 calculado
// en SQL) — agregamos la columna Total al set de columnas normal.
export const COLS_ENCABEZADO_CONFIRMADAS = [
  ...COLS_ENCABEZADO.slice(0, -2),
  { key: "total1", label: "Total", render: (v) => formatPeso(v) },
  ...COLS_ENCABEZADO.slice(-2),
];

// ── Columnas ítems (panel de detalle al seleccionar una fila — acá sí se
// consulta tabla_presupuestos, pero puntual, para un solo presupuesto) ─────

export const COLS_ITEMS = [
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

// Columna "Color" para el panel de ítems — se agrega dinámicamente (no va
// en el array COLS_ITEMS de arriba) porque necesita closures sobre
// melaminas/handleColorChange/estado de guardado, que viven en cada pantalla.
export const construirColColor = ({
  melaminas,
  guardandoColorId,
  errorColorId,
  onChangeColor,
}) => ({
  key: "_color",
  label: "Color",
  render: (_, row) => {
    // Ítems sin fila de producción vinculada (ej. presupuesto todavía no
    // confirmado, o no se encontró el match por grupo+producto) no
    // muestran el desplegable.
    if (row._produccionId == null) return "—";
    return (
      <select
        value={row._produccionColor ?? ""}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChangeColor(row._produccionId, e.target.value)}
        style={{
          width: "100%",
          maxWidth: "200px",
          padding: "4px 8px",
          fontSize: "12px",
          fontFamily: "'Space Mono',monospace",
          border: `1.5px solid ${
            errorColorId === row._produccionId ? "#e57373" : "#b8d6ef"
          }`,
          borderRadius: "4px",
          background:
            guardandoColorId === row._produccionId ? "#fffbe6" : "#fff",
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
    );
  },
});

// Cruza los ítems de tabla_presupuestos (itemsDetalle) con las filas de
// `produccion` de ese mismo numeropres+revision, para poder editar
// `color` acá. No hay id compartido entre ambas tablas — se matchea por
// grupo+producto, en el mismo orden en que aparecen (produccion se puebla
// en el mismo orden que tabla_presupuestos al confirmar), consumiendo cada
// fila de producción una sola vez para no repetirla si hay ítems iguales.
export const cruzarConProduccion = (items, produccionRows) => {
  const colas = new Map();
  produccionRows.forEach((p) => {
    const key = `${p.grupo ?? ""}|${p.producto ?? ""}`;
    if (!colas.has(key)) colas.set(key, []);
    colas.get(key).push(p);
  });
  return items.map((it) => {
    const key = `${it.grupo ?? ""}|${it.nombreart ?? ""}`;
    const cola = colas.get(key);
    const prod = cola && cola.length ? cola.shift() : null;
    return {
      ...it,
      _produccionId: prod?.id ?? null,
      _produccionColor: prod?.color ?? null,
    };
  });
};

// ── Columnas historial (modal "Revisiones") ────────────────────────────────

export const COLS_HISTORIAL = [
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

// ── CSS compartido (idéntico en ambas pantallas) ──────────────────────────

export const PRESUPUESTOS_CSS = `
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
`;

// Grupo efectivo de un ítem del panel de detalle: el `grupo` guardado en
// tabla_presupuestos si existe, si no la sección (`tipo`) — mismo criterio
// de fallback que `grupoDe()` en TablaArticulos.jsx.
const grupoEfectivo = (it) =>
  it.grupo && String(it.grupo).trim() ? it.grupo : (it.tipo ?? "");

// ── Panel de ítems (detalle al seleccionar una fila, con la columna Color) ─

export function ItemsPanel({
  selected,
  loadingItems,
  itemsConColor,
  totalSeleccionado,
  melaminas,
  guardandoColorId,
  errorColorId,
  onChangeColor,
}) {
  // Color por grupo: selección local (grupo + melamina) + función que
  // aplica ese color a todos los ítems del grupo que tengan fila de
  // `produccion` vinculada (mismo mecanismo que el color por ítem — un PUT
  // por cada uno, vía onChangeColor).
  const [grupoColorSel, setGrupoColorSel] = useState("");
  const [colorGrupoValor, setColorGrupoValor] = useState("");

  if (!selected) return null;

  const gruposDisponibles = [
    ...new Set(itemsConColor.map((it) => grupoEfectivo(it)).filter(Boolean)),
  ];

  const aplicarColorAGrupo = () => {
    if (!grupoColorSel || !colorGrupoValor) return;
    itemsConColor
      .filter((it) => grupoEfectivo(it) === grupoColorSel && it._produccionId != null)
      .forEach((it) => onChangeColor(it._produccionId, colorGrupoValor));
  };

  return (
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
      {!loadingItems && itemsConColor.length > 0 && (
        <div
          style={{
            background: "#f5f8fb",
            borderBottom: "1px solid #d0e4f0",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            fontFamily: "'Space Mono',monospace",
            fontSize: 12,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "#0a3a5c",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              whiteSpace: "nowrap",
            }}
          >
            🎨 Color por grupo
          </span>
          <select
            value={grupoColorSel}
            onChange={(e) => setGrupoColorSel(e.target.value)}
            style={{
              padding: "5px 8px",
              border: "1px solid #b8cfe0",
              borderRadius: 2,
              fontFamily: "'Space Mono',monospace",
              fontSize: 11,
              color: "#0a3a5c",
              background: "#fff",
              maxWidth: 180,
            }}
          >
            <option value="">Grupo...</option>
            {gruposDisponibles.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={colorGrupoValor}
            onChange={(e) => setColorGrupoValor(e.target.value)}
            style={{
              padding: "5px 8px",
              border: "1px solid #b8cfe0",
              borderRadius: 2,
              fontFamily: "'Space Mono',monospace",
              fontSize: 11,
              color: "#0a3a5c",
              background: "#fff",
              maxWidth: 180,
            }}
          >
            <option value="">Color...</option>
            {melaminas.map((m) => (
              <option key={m.codartint} value={m.codartint}>
                {m.articulo}
              </option>
            ))}
          </select>
          <button
            onClick={aplicarColorAGrupo}
            disabled={!grupoColorSel || !colorGrupoValor}
            title="Aplica este color a todos los ítems del grupo elegido"
            style={{
              padding: "5px 14px",
              background: grupoColorSel && colorGrupoValor ? "#0a3a5c" : "#c8dae8",
              color: grupoColorSel && colorGrupoValor ? "#fff" : "#99aabb",
              border: "none",
              borderRadius: 2,
              fontFamily: "'Space Mono',monospace",
              fontSize: 11,
              cursor: grupoColorSel && colorGrupoValor ? "pointer" : "default",
              fontWeight: 700,
              transition: "all 0.12s",
            }}
          >
            Aplicar
          </button>
        </div>
      )}
      {loadingItems ? (
        <p className="items-empty">⏳ Cargando ítems...</p>
      ) : itemsConColor.length === 0 ? (
        <p className="items-empty">Sin ítems registrados.</p>
      ) : (
        <DataTable
          columns={[
            ...COLS_ITEMS,
            construirColColor({
              melaminas,
              guardandoColorId,
              errorColorId,
              onChangeColor,
            }),
          ]}
          rows={itemsConColor}
          selectedId={null}
          onSelect={null}
          storageKey="lista-presupuestos-items"
        />
      )}
    </div>
  );
}

// ── Modal de historial de revisiones ───────────────────────────────────────

export function HistorialModal({
  selected,
  loadingRev,
  revisiones,
  onClose,
  onAbrirPresupuesto,
  onEliminarRevision,
}) {
  if (!selected) return null;
  return (
    <Modal
      title={`Revisiones — N° ${String(selected.numeropres).padStart(4, "0")} · ${selected.nombre ?? ""}`}
      onClose={onClose}
    >
      {loadingRev ? (
        <p style={{ textAlign: "center", padding: "24px", color: "#4a8ab5" }}>
          ⏳ Cargando...
        </p>
      ) : revisiones.length === 0 ? (
        <p style={{ textAlign: "center", padding: "24px", color: "#8aabb8" }}>
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
                          onClose();
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
                  onClick={() => onEliminarRevision(row)}
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
          storageKey="lista-presupuestos-historial"
        />
      )}
      <div className="form-actions" style={{ marginTop: "16px" }}>
        <button className="btn-cancel" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
