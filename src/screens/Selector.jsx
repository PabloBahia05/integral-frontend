import { useState, useEffect, useCallback } from "react";
import DataTable from "../Component/DataTable";
import Modal from "../Component/Modal";
import ActionBar from "../Component/ActionBar";
import ScreenHeader from "../Component/ScreenHeader";
import ConfirmDelete from "../Component/ConfirmDelete";
import FormField from "../Component/FormField";

const API = "https://integral-backend-production.up.railway.app";

const EMPTY = { nombre: "", aplicacion: "", area: "" };

const FIELDS = [
  { field: "nombre", label: "Nombre *", placeholder: "Ej: Torre 6 estantes" },
  { field: "aplicacion", label: "Aplicación", placeholder: "Ej: Placard" },
  { field: "area", label: "Área", placeholder: "Ej: Muebles" },
];

const columns = [
  { key: "id", label: "ID" },
  { key: "nombre", label: "Nombre" },
  { key: "aplicacion", label: "Aplicación" },
  { key: "area", label: "Área" },
];

export default function Selector({ token }) {
  // ── Helper autenticado ──────────────────────────────────
  const authFetch = useCallback(
    (url, options = {}) =>
      fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
          Authorization: `Bearer ${token}`,
        },
      }),
    [token],
  );

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  const fetchRows = useCallback(() => {
    setLoading(true);
    authFetch(`${API}/selector`)
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [authFetch]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const filtered = rows.filter((r) =>
    !search.trim()
      ? true
      : [r.nombre, r.aplicacion, r.area]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(search.toLowerCase())),
  );

  const openNew = () => {
    setForm(EMPTY);
    setError("");
    setModal("nuevo");
  };

  const openEdit = () => {
    if (!selected) return;
    setForm({
      nombre: selected.nombre ?? "",
      aplicacion: selected.aplicacion ?? "",
      area: selected.area ?? "",
    });
    setError("");
    setModal("editar");
  };

  const closeModal = () => {
    setModal(null);
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    try {
      const isEdit = modal === "editar";
      const url = isEdit ? `${API}/selector/${selected.id}` : `${API}/selector`;
      const res = await authFetch(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al guardar");
      }
      closeModal();
      setSelected(null);
      fetchRows();
    } catch (e) {
      setError(e.message ?? "Error al guardar");
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      const res = await authFetch(`${API}/selector/${selected.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar");
      setSelected(null);
      closeModal();
      fetchRows();
    } catch (e) {
      alert(e.message ?? "Error al eliminar");
    }
  };

  return (
    <>
      <ScreenHeader
        icon="🎛️"
        title="Selector"
        subtitle={loading ? "Cargando..." : `${filtered.length} registros`}
      />

      <ActionBar
        selected={selected}
        onNew={openNew}
        onEdit={openEdit}
        onDelete={() => selected && setModal("eliminar")}
        search={search}
        onSearch={setSearch}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        selectedId={selected?.id}
        onSelect={(row) =>
          setSelected(row?.id === selected?.id ? null : row)
        }
      />

      {(modal === "nuevo" || modal === "editar") && (
        <Modal
          title={modal === "nuevo" ? "Nuevo registro" : "Editar registro"}
          onClose={closeModal}
        >
          {error && <p className="form-error">{error}</p>}
          <div className="form-grid">
            <div>
              {FIELDS.map((f) => (
                <FormField key={f.field} {...f} form={form} setForm={setForm} />
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-cancel" onClick={closeModal}>
              Cancelar
            </button>
            <button className="btn-save" onClick={handleSubmit}>
              {modal === "nuevo" ? "Guardar" : "Actualizar"}
            </button>
          </div>
        </Modal>
      )}

      {modal === "eliminar" && (
        <ConfirmDelete
          item={selected}
          onConfirm={handleDelete}
          onClose={closeModal}
        />
      )}
    </>
  );
}
