import { useEffect, useState } from "react";

const API = "http://https://integral-backend-production.up.railway.app";

const STYLE = `
  .usr-wrap { padding: 24px; font-family: 'Space Mono', monospace; }
  .usr-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
  .usr-title { font-size: 22px; font-weight: 800; color: #0a3a5c; }
  .usr-btn { padding: 7px 16px; border: 1px solid #4361ee; border-radius: 4px; background: #4361ee;
    color: #fff; font-family: inherit; font-size: 12px; cursor: pointer; transition: opacity 0.15s; }
  .usr-btn:hover { opacity: 0.85; }
  .usr-btn.sec { background: #fff; color: #4361ee; }
  .usr-btn.red { background: #fff; color: #c0392b; border-color: #c0392b; }
  .usr-btn.grn { background: #fff; color: #0a7a3c; border-color: #0a7a3c; }
  .usr-table-wrap { overflow-x: auto; margin-bottom: 24px; }
  table.usr { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.usr th { background: #0a3a5c; color: #fff; padding: 10px 14px; text-align: left;
    font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }
  table.usr td { padding: 10px 14px; border-bottom: 1px solid #e0eef8; color: #2a3a5c; }
  table.usr tr:hover td { background: #f0f8ff; }
  .badge { display:inline-block; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700; }
  .badge.on  { background:#d4f7e7; color:#0a7a3c; }
  .badge.off { background:#fde8e8; color:#c0392b; }
  .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:100; }
  .modal { background:#fff; border-radius:8px; padding:28px; min-width:340px; max-width:420px; width:100%; }
  .modal h3 { margin:0 0 20px; font-size:16px; color:#0a3a5c; }
  .field { margin-bottom:14px; }
  .field label { display:block; font-size:11px; color:#6699bb; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px; }
  .field input, .field select { width:100%; padding:8px 10px; border:1px solid #a0cce8; border-radius:4px;
    font-family:inherit; font-size:13px; color:#0a3a5c; box-sizing:border-box; }
  .field input:focus { outline:none; border-color:#4361ee; }
  .modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:20px; }
  .empty { text-align:center; color:#99bbcc; padding:40px; font-size:13px; }
`;

const emptyForm = { id: "", nombre: "", apellido: "", activo: 1 };

export default function Usuarios({ onBack }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");

  const fetchUsuarios = () => {
    setLoading(true);
    fetch(`${API}/usuarios`)
      .then((r) => r.json())
      .then((d) => {
        setUsuarios(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setEditId(null);
    setError("");
    setModal(true);
  };

  const openEdit = (u) => {
    setForm({
      id: u.id,
      nombre: u.nombre,
      apellido: u.apellido,
      activo: u.activo,
    });
    setEditId(u.id);
    setError("");
    setModal(true);
  };

  const handleSave = () => {
    setError("");
    if (!form.id || !form.nombre || !form.apellido) {
      setError("Todos los campos son obligatorios");
      return;
    }

    const url = editId ? `${API}/usuarios/${editId}` : `${API}/usuarios`;
    const method = editId ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        id: Number(form.id),
        activo: Number(form.activo),
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setModal(false);
        fetchUsuarios();
      })
      .catch(() => setError("Error de conexión"));
  };

  const handleDelete = (u) => {
    if (!confirm(`¿Eliminar a ${u.apellido} ${u.nombre}?`)) return;
    fetch(`${API}/usuarios/${u.id}`, { method: "DELETE" }).then(() =>
      fetchUsuarios(),
    );
  };

  return (
    <div className="usr-wrap">
      <style>{STYLE}</style>

      <div className="usr-header">
        <button className="usr-btn sec" onClick={onBack}>
          ← Volver
        </button>
        <span className="usr-title">👥 Usuarios</span>
        <button className="usr-btn" onClick={openNew}>
          + Nuevo usuario
        </button>
      </div>

      <div className="usr-table-wrap">
        {loading ? (
          <p className="empty">Cargando...</p>
        ) : usuarios.length === 0 ? (
          <p className="empty">No hay usuarios cargados</p>
        ) : (
          <table className="usr">
            <thead>
              <tr>
                <th>ID Lector</th>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.id}</strong>
                  </td>
                  <td>{u.apellido}</td>
                  <td>{u.nombre}</td>
                  <td>
                    <span className={`badge ${u.activo ? "on" : "off"}`}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button className="usr-btn sec" onClick={() => openEdit(u)}>
                      Editar
                    </button>
                    <button
                      className="usr-btn red"
                      onClick={() => handleDelete(u)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-bg" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editId ? "Editar usuario" : "Nuevo usuario"}</h3>

            <div className="field">
              <label>ID del lector (número Anviz)</label>
              <input
                type="number"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                disabled={!!editId}
                placeholder="ej: 7"
              />
            </div>
            <div className="field">
              <label>Apellido</label>
              <input
                type="text"
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                placeholder="ej: Vasquez"
              />
            </div>
            <div className="field">
              <label>Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="ej: Emanuel Eduardo"
              />
            </div>
            <div className="field">
              <label>Estado</label>
              <select
                value={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.value })}
              >
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </select>
            </div>

            {error && (
              <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 12px" }}>
                {error}
              </p>
            )}

            <div className="modal-actions">
              <button className="usr-btn sec" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button className="usr-btn" onClick={handleSave}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
