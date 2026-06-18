import { useState } from "react";

export default function Feriados({
  feriados = [],
  selected,
  modal,
  onSave,
  onDelete,
  onOpenModal,
  onCloseModal,
  onSelect,
}) {
  const [form, setForm] = useState({ fecha: "", nombre: "", obligatorio: true });

  const abrirNuevo = () => {
    setForm({ fecha: "", nombre: "", obligatorio: true });
    onSelect?.(null);
    onOpenModal("nuevo");
  };

  const abrirEditar = (row) => {
    setForm({
      fecha: soloFecha(row.fecha),
      nombre: row.nombre,
      obligatorio: !!row.obligatorio,
    });
    onSelect?.(row);
    onOpenModal("editar");
  };

  const abrirEliminar = (row) => {
    onSelect?.(row);
    onOpenModal("eliminar");
  };

  const cerrar = () => onCloseModal();

  const guardar = () => {
    if (!form.fecha || !form.nombre.trim()) return;
    const item = {
      ...(modal === "editar" && selected ? { id: selected.id } : {}),
      fecha: form.fecha,
      nombre: form.nombre.trim(),
      obligatorio: form.obligatorio ? 1 : 0,
    };
    onSave(item);
  };

  const confirmarEliminar = () => {
    if (selected) onDelete(selected.id);
  };

  return (
    <div className="fer-wrap">
      <style>{FS}</style>
      <div className="fer-header">
        <div>
          <h2 className="fer-title">📅 Feriados</h2>
          <p className="fer-subtitle">
            Días no laborables usados para calcular las horas esperadas por semana
          </p>
        </div>
        <button className="fer-btn" onClick={abrirNuevo}>
          ＋ Nuevo feriado
        </button>
      </div>

      {feriados.length === 0 ? (
        <p className="fer-empty">
          No hay feriados cargados todavía. Agregá el primero con "Nuevo feriado".
        </p>
      ) : (
        <div className="fer-table-wrap">
          <table className="fer-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {feriados.map((f) => (
                <tr key={f.id}>
                  <td>{formatFecha(f.fecha)}</td>
                  <td>{f.nombre}</td>
                  <td>
                    <span className={`fer-badge ${f.obligatorio ? "oblig" : "opc"}`}>
                      {f.obligatorio ? "Obligatorio" : "Puente turístico"}
                    </span>
                  </td>
                  <td className="fer-acciones">
                    <button
                      className="fer-icon-btn"
                      onClick={() => abrirEditar(f)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="fer-icon-btn danger"
                      onClick={() => abrirEliminar(f)}
                      title="Eliminar"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(modal === "nuevo" || modal === "editar") && (
        <div className="fer-overlay" onClick={cerrar}>
          <div className="fer-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modal === "editar" ? "Editar feriado" : "Nuevo feriado"}</h3>

            <label className="fer-label">Fecha</label>
            <input
              type="date"
              className="fer-input"
              value={form.fecha}
              onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            />

            <label className="fer-label">Nombre</label>
            <input
              type="text"
              className="fer-input"
              placeholder="Ej: Día del Trabajador"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            />

            <label className="fer-check">
              <input
                type="checkbox"
                checked={form.obligatorio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, obligatorio: e.target.checked }))
                }
              />
              Feriado obligatorio (desmarcar si es puente turístico opcional)
            </label>

            <div className="fer-modal-actions">
              <button className="fer-btn sec" onClick={cerrar}>
                Cancelar
              </button>
              <button className="fer-btn" onClick={guardar}>
                Guardar feriado
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "eliminar" && selected && (
        <div className="fer-overlay" onClick={cerrar}>
          <div className="fer-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Eliminar feriado</h3>
            <p className="fer-confirm-text">
              ¿Eliminar <strong>{selected.nombre}</strong> del{" "}
              {formatFecha(selected.fecha)}?
            </p>
            <div className="fer-modal-actions">
              <button className="fer-btn sec" onClick={cerrar}>
                Cancelar
              </button>
              <button className="fer-btn danger" onClick={confirmarEliminar}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Evita corrimientos de timezone: lee el string de fecha directamente sin pasar por Date
function formatFecha(value) {
  if (!value) return "—";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function soloFecha(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

const FS = `
  .fer-wrap { padding: 24px; font-family: 'Space Mono', monospace; }
  .fer-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:20px; flex-wrap:wrap; }
  .fer-title { font-size:20px; font-weight:800; color:#0a3a5c; margin:0 0 4px; }
  .fer-subtitle { font-size:12px; color:#6699bb; margin:0; max-width: 480px; }
  .fer-btn { padding:8px 16px; border:1px solid #4361ee; border-radius:4px; background:#4361ee;
    color:#fff; font-family:inherit; font-size:12px; cursor:pointer; white-space:nowrap; }
  .fer-btn.sec { background:#fff; color:#4361ee; }
  .fer-btn.danger { background:#e63946; border-color:#e63946; }
  .fer-btn:focus-visible, .fer-input:focus-visible, .fer-icon-btn:focus-visible { outline:2px solid #4361ee; outline-offset:2px; }
  .fer-empty { color:#99bbcc; font-size:13px; padding:24px 0; }
  .fer-table-wrap { overflow-x:auto; }
  table.fer-table { border-collapse:collapse; font-size:13px; width:100%; min-width:560px; }
  table.fer-table th { background:#0a3a5c; color:#fff; padding:9px 14px; text-align:left;
    font-size:10px; letter-spacing:1px; text-transform:uppercase; white-space:nowrap; }
  table.fer-table td { padding:9px 14px; border-bottom:1px solid #e0eef8; color:#0a3a5c; }
  table.fer-table tr:hover td { background:#f0f8ff; }
  .fer-badge { display:inline-block; padding:3px 10px; border-radius:10px; font-size:11px; font-weight:700; white-space:nowrap; }
  .fer-badge.oblig { background:#fde8e8; color:#c0392b; }
  .fer-badge.opc { background:#fff3cd; color:#856404; }
  .fer-acciones { display:flex; gap:8px; }
  .fer-icon-btn { border:none; background:none; cursor:pointer; font-size:14px; padding:2px 6px; border-radius:4px; }
  .fer-icon-btn:hover { background:#e0eef8; }
  .fer-icon-btn.danger:hover { background:#fde8e8; }
  .fer-overlay { position:fixed; inset:0; background:rgba(10,30,50,0.45); display:flex; align-items:center; justify-content:center; z-index:1000; }
  .fer-modal { background:#fff; border-radius:8px; padding:24px; width:360px; max-width:90vw; font-family:inherit; }
  .fer-modal h3 { margin:0 0 16px; color:#0a3a5c; font-size:16px; }
  .fer-label { display:block; font-size:11px; color:#6699bb; margin:12px 0 4px; text-transform:uppercase; letter-spacing:0.5px; }
  .fer-input { width:100%; padding:8px 10px; border:1px solid #cfe3f2; border-radius:4px; font-family:inherit; font-size:13px; box-sizing:border-box; }
  .fer-check { display:flex; align-items:center; gap:8px; font-size:12px; color:#0a3a5c; margin:16px 0 4px; cursor:pointer; }
  .fer-confirm-text { font-size:13px; color:#0a3a5c; }
  .fer-modal-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:20px; }
`;
