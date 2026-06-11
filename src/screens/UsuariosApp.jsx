import { useEffect, useState } from "react";
import ScreenHeader from "../Component/ScreenHeader";
import DataTable from "../Component/DataTable";
import ActionBar from "../Component/ActionBar";
import Modal from "../Component/Modal";
import ConfirmDelete from "../Component/ConfirmDelete";
import FormField from "../Component/FormField";
import StatCards from "../Component/StatCards";

const API = "https://integral-backend-production.up.railway.app";

const COLUMNS = [
  { key: "id",       label: "ID" },
  { key: "nombre",   label: "Nombre" },
  { key: "apellido", label: "Apellido" },
  { key: "email",    label: "Email" },
  { key: "activo",   label: "Activo", render: (v) => (v ? "✅" : "❌") },
];

const EMPTY = { nombre: "", apellido: "", email: "", password: "", activo: 1 };

const FIELDS = [
  { field: "nombre",   label: "Nombre *",    placeholder: "Ej: Juan" },
  { field: "apellido", label: "Apellido *",   placeholder: "Ej: Pérez" },
  { field: "email",    label: "Email *",      placeholder: "Ej: juan@empresa.com" },
  { field: "password", label: "Contraseña *", placeholder: "••••••••", type: "password" },
];

export default function UsuariosApp({ token }) {
  const [usuarios, setUsuarios] = useState([]);
  const [selected, setSelected] = useState(null);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");

  const authHeaders = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const fetchUsuarios = () =>
    fetch(`${API}/usuarios-app`, { headers: authHeaders })
      .then((r) => r.json())
      .then((d) => setUsuarios(Array.isArray(d) ? d : []))
      .catch(console.error);

  useEffect(() => { fetchUsuarios(); }, []);

  const filtered = usuarios.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.nombre   ?? "").toLowerCase().includes(q) ||
      (u.apellido ?? "").toLowerCase().includes(q) ||
      (u.email    ?? "").toLowerCase().includes(q)
    );
  });

  const openNew = () => { setForm(EMPTY); setError(""); setModal("nuevo"); };

  const openEdit = () => {
    if (!selected) return;
    setForm({
      nombre:   selected.nombre   ?? "",
      apellido: selected.apellido ?? "",
      email:    selected.email    ?? "",
      password: "",
      activo:   selected.activo   ?? 1,
    });
    setError("");
    setModal("editar");
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim() || !form.apellido.trim() || !form.email.trim()) {
      setError("Nombre, apellido y email son obligatorios.");
      return;
    }
    if (modal === "nuevo" && !form.password.trim()) {
      setError("La contraseña es obligatoria para nuevos usuarios.");
      return;
    }

    const body = { ...form, activo: Number(form.activo) };
    if (modal === "editar" && !body.password) delete body.password;

    const url    = modal === "nuevo" ? `${API}/usuarios-app` : `${API}/usuarios-app/${selected.id}`;
    const method = modal === "nuevo" ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al guardar."); return; }
      await fetchUsuarios();
      setModal(null);
      setSelected(null);
    } catch {
      setError("Error de conexión.");
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await fetch(`${API}/usuarios-app/${selected.id}`, { method: "DELETE", headers: authHeaders });
      await fetchUsuarios();
      setSelected(null);
      setModal(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <ScreenHeader icon="🔐" title="Usuarios App" subtitle="Gestión de accesos al sistema" />

      <StatCards stats={[
        { label: "Total usuarios", value: usuarios.length },
        { label: "Activos",        value: usuarios.filter((u) => u.activo).length },
      ]} />

      <ActionBar
        selected={selected}
        onNew={openNew}
        onEdit={openEdit}
        onDelete={() => selected && setModal("eliminar")}
        search={search}
        onSearch={setSearch}
      />

      <DataTable
        columns={COLUMNS}
        rows={filtered}
        selectedId={selected?.id}
        onSelect={(row) => setSelected(row?.id === selected?.id ? null : row)}
      />

      {(modal === "nuevo" || modal === "editar") && (
        <Modal
          title={modal === "nuevo" ? "Nuevo usuario" : "Editar usuario"}
          onClose={() => setModal(null)}
        >
          {error && <p className="form-error">{error}</p>}
          <div className="form-grid">
            <div>
              {FIELDS.map((f) => (
                <FormField key={f.field} {...f} form={form} setForm={setForm} />
              ))}
              {modal === "editar" && (
                <p style={{ fontSize: 11, color: "#6699bb", marginTop: 4 }}>
                  Dejá la contraseña vacía para no cambiarla.
                </p>
              )}
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, color: "#4a6a8c", textTransform: "uppercase", letterSpacing: 1 }}>
                  Estado
                </label>
                <select
                  value={form.activo}
                  onChange={(e) => setForm({ ...form, activo: Number(e.target.value) })}
                  style={{ display: "block", marginTop: 4, padding: "8px 10px", border: "1px solid #a0cce8", borderRadius: 3, fontFamily: "inherit", fontSize: 13, width: "100%" }}
                >
                  <option value={1}>Activo</option>
                  <option value={0}>Inactivo</option>
                </select>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn-save" onClick={handleSubmit}>
              {modal === "nuevo" ? "Guardar" : "Actualizar"}
            </button>
          </div>
        </Modal>
      )}

      {modal === "eliminar" && (
        <ConfirmDelete item={selected} onConfirm={handleDelete} onClose={() => setModal(null)} />
      )}
    </>
  );
}
