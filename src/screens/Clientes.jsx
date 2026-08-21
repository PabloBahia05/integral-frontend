import { useState, useEffect } from "react";
import DataTable from "../Component/DataTable";
import Modal from "../Component/Modal";
import ActionBar from "../Component/ActionBar";
import ScreenHeader from "../Component/ScreenHeader";
import StatCards from "../Component/StatCards";
import ConfirmDelete from "../Component/ConfirmDelete";
import FormField from "../Component/FormField";
import { API, COLS_ENCABEZADO } from "./presupuestosShared";

// Columnas del historial de presupuestos de un cliente puntual (botón
// "📋 Presupuestos" acá abajo): mismo render/estilo que la lista general
// de presupuestos (COLS_ENCABEZADO, de presupuestosShared.jsx), pero
// mostrando solo número/revisión/estado/fecha — sin cliente/teléfono/línea,
// que acá ya sabemos cuáles son.
const COLS_HISTORIAL_CLIENTE = COLS_ENCABEZADO.filter((c) =>
  ["numeropres", "revision", "confirmado", "actualizado_en"].includes(c.key),
);

// Solo dígitos, para comparar teléfonos sin importar guiones/espacios
// (mismo criterio que ClienteSection.jsx).
const soloDigitos = (v) => String(v ?? "").replace(/\D/g, "");

const COLUMNS = [
  { key: "id",               label: "ID" },
  { key: "codcliente",       label: "Cód. Cliente" },
  { key: "nombre",           label: "Nombre" },
  { key: "nombre1",          label: "Nombre Adjunto" },
  { key: "nombre2",          label: "Nombre Ligado" },
  { key: "domicilio fiscal", label: "Domicilio" },
  { key: "localidad",        label: "Localidad" },
  { key: "telefono1",        label: "Teléfono" },
  { key: "cuit",             label: "CUIT" },
  { key: "tipofact",         label: "Tipo Fact." },
];

const EMPTY = {
  codcliente: "", nombre: "", nombre1: "", nombre2: "", "domicilio fiscal": "", codloc: "",
  telefono1: "", telefono2: "", wapp: "", domrem: "",
  ubicacion: "", cuit: "", dni: "", tipofact: "",
  profesional: "", localidad: "", codpostal: "",
};

const FIELDS_LEFT = [
  { field: "codcliente",       label: "Código Cliente",  placeholder: "Ej: 1001" },
  { field: "nombre",           label: "Nombre *",         placeholder: "Ej: Juan Pérez" },
  { field: "nombre1",          label: "Nombre Adjunto",   placeholder: "Ej: esposa, socio, etc." },
  { field: "nombre2",          label: "Nombre Ligado",    placeholder: "Ej: familiar, contacto, etc." },
  { field: "domicilio fiscal", label: "Domicilio Fiscal", placeholder: "Ej: Av. Colón 123" },
  { field: "domrem",           label: "Dom. Remito",      placeholder: "Ej: Av. Alem 456" },
  { field: "localidad",        label: "Localidad",        placeholder: "Ej: Bahía Blanca" },
  { field: "codpostal",        label: "Código Postal",    placeholder: "Ej: 8000" },
  { field: "codloc",           label: "Cód. Localidad",   placeholder: "Ej: 06" },
  { field: "ubicacion",        label: "Ubicación",        placeholder: "Ej: Centro" },
];

const FIELDS_RIGHT = [
  { field: "telefono1",   label: "Teléfono 1",       placeholder: "Ej: 291-4551234" },
  { field: "telefono2",   label: "Teléfono 2",       placeholder: "Ej: 291-4559876" },
  { field: "wapp",        label: "WhatsApp",         placeholder: "Ej: 2914551234" },
  { field: "cuit",        label: "CUIT",             placeholder: "Ej: 20-12345678-9" },
  { field: "dni",         label: "DNI",              placeholder: "Ej: 12345678" },
  { field: "tipofact",    label: "Tipo Facturación", placeholder: "Ej: A / B / C" },
  { field: "profesional", label: "Profesional",      placeholder: "Ej: Comerciante" },
];

export default function Clientes({ clientes, onSave, onDelete, selected, onSelect, modal, onOpenModal, onCloseModal, abrirFicha, onFichaAbierta, busquedaInicial, authFetch, onAbrirPresupuesto }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(busquedaInicial || "");

  // Historial de presupuestos del cliente seleccionado (botón "📋
  // Presupuestos"). Se pide bajo demanda, no en cada selección de fila.
  const [modalPresupuestos, setModalPresupuestos] = useState(false);
  const [presupuestosCliente, setPresupuestosCliente] = useState([]);
  const [loadingPresupuestos, setLoadingPresupuestos] = useState(false);

  // `/presupuesto-info/lista-presupuestos` no tiene filtro por cliente, así
  // que se trae todo y se filtra acá por nombre exacto o por coincidencia
  // de teléfono (mismo criterio tolerante que la carga de cliente en
  // ClienteSection.jsx) — evita depender de que codcliente haya quedado
  // bien vinculado en cada presupuesto viejo.
  const abrirPresupuestosCliente = () => {
    if (!selected) return;
    setModalPresupuestos(true);
    setLoadingPresupuestos(true);
    authFetch(`${API}/presupuesto-info/lista-presupuestos`)
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        const nombreCliente = (selected.nombre ?? "").trim().toLowerCase();
        const telsCliente = [selected.telefono1, selected.telefono2, selected.wapp]
          .map(soloDigitos)
          .filter(Boolean);
        const propios = lista.filter((p) => {
          const nombreP = (p.nombre ?? "").trim().toLowerCase();
          if (nombreCliente && nombreP === nombreCliente) return true;
          const telsP = [p.telefono1, p.telefono2].map(soloDigitos).filter(Boolean);
          return telsP.some((t) => telsCliente.includes(t));
        });
        setPresupuestosCliente(
          propios.map((p) => ({ ...p, id: `${p.numeropres}-${p.revision}` })),
        );
      })
      .catch(console.error)
      .finally(() => setLoadingPresupuestos(false));
  };

  // Mapea una fila de la tabla al shape del form del modal. Se usa tanto
  // desde "Editar" (botón manual) como desde la apertura automática al
  // llegar acá con un cliente puntual ya resuelto (ver botón "👤 Ficha"
  // en ClienteSection.jsx, dentro de un presupuesto).
  const datosParaForm = (row) => ({
    codcliente:         row.codcliente          ?? "",
    nombre:             row.nombre              ?? "",
    nombre1:            row.nombre1             ?? "",
    nombre2:            row.nombre2             ?? "",
    "domicilio fiscal": row["domicilio fiscal"] ?? "",
    codloc:             row.codloc              ?? "",
    telefono1:          row.telefono1           ?? "",
    telefono2:          row.telefono2           ?? "",
    wapp:               row.wapp                ?? "",
    domrem:             row.domrem              ?? "",
    ubicacion:          row.ubicacion           ?? "",
    cuit:               row.cuit                ?? "",
    dni:                row.dni                 ?? "",
    tipofact:           row.tipofact            ?? "",
    profesional:        row.profesional         ?? "",
    localidad:          row.localidad           ?? "",
    codpostal:          row.codpostal           ?? "",
  });

  // Al llegar desde "👤 Ficha" (PresupuestoNuevo → ClienteSection) con un
  // cliente ya seleccionado, abrimos directo el modal de edición en vez de
  // dejar la fila solo resaltada en la tabla.
  useEffect(() => {
    if (abrirFicha && selected) {
      setForm(datosParaForm(selected));
      setError("");
      onOpenModal("editar");
      onFichaAbierta?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = clientes.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.nombre              ?? "").toLowerCase().includes(q) ||
      (c.nombre1             ?? "").toLowerCase().includes(q) ||
      (c.nombre2             ?? "").toLowerCase().includes(q) ||
      (c.localidad           ?? "").toLowerCase().includes(q) ||
      (c["domicilio fiscal"] ?? "").toLowerCase().includes(q) ||
      String(c.cuit       ?? "").includes(q) ||
      String(c.codcliente ?? "").includes(q) ||
      String(c.telefono1  ?? "").includes(q) ||
      String(c.telefono2  ?? "").includes(q) ||
      String(c.wapp       ?? "").includes(q)
    );
  });

  const openNew = () => { setForm(EMPTY); setError(""); onOpenModal("nuevo"); };

  const openEdit = () => {
    if (!selected) return;
    setForm(datosParaForm(selected));
    setError("");
    onOpenModal("editar");
  };

  const handleSubmit = () => {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio."); return; }
    const data = {
      ...form,
      codcliente: form.codcliente ? parseInt(form.codcliente)  : null,
      codloc:     form.codloc     ? parseInt(form.codloc)      : null,
      // Teléfonos y CUIT NO se parsean como número: llevan guiones y ceros
      // a la izquierda (ej: "0291-4551234", "20-12345678-9") que
      // parseFloat cortaba/perdía silenciosamente — se guardaba un valor
      // distinto al tipeado sin ningún error visible.
      telefono1:  form.telefono1  ? form.telefono1.trim()      : null,
      telefono2:  form.telefono2  ? form.telefono2.trim()      : null,
      wapp:       form.wapp       ? form.wapp.trim()           : null,
      cuit:       form.cuit       ? form.cuit.trim()           : null,
      dni:        form.dni        ? parseFloat(form.dni)       : null,
      codpostal:  form.codpostal  ? parseInt(form.codpostal)   : null,
    };
    onSave(modal === "nuevo" ? data : { ...data, id: selected.id });
    onCloseModal();
    setForm(EMPTY);
  };

  return (
    <>
      <ScreenHeader icon="👥" title="Clientes" subtitle="Gestión de clientes" />

      <StatCards stats={[
        { label: "Total clientes",    value: clientes.length },
        { label: "Resultados filtro", value: filtered.length },
      ]} />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ActionBar
          selected={selected}
          onNew={openNew}
          onEdit={openEdit}
          onDelete={() => selected && onOpenModal("eliminar")}
          search={search}
          onSearch={setSearch}
        />
        <button
          type="button"
          disabled={!selected}
          onClick={abrirPresupuestosCliente}
          title={
            selected
              ? "Ver historial de presupuestos de este cliente"
              : "Elegí un cliente primero"
          }
          style={{
            padding: "8px 14px",
            background: selected ? "#0a3a5c" : "#c8dae8",
            color: selected ? "#fff" : "#99aabb",
            border: "none",
            borderRadius: 3,
            fontFamily: "'Space Mono',monospace",
            fontSize: 12,
            fontWeight: 700,
            cursor: selected ? "pointer" : "default",
            whiteSpace: "nowrap",
          }}
        >
          📋 Presupuestos
        </button>
      </div>

      <DataTable columns={COLUMNS} rows={filtered} selectedId={selected?.id} onSelect={onSelect} />

      {(modal === "nuevo" || modal === "editar") && (
        <Modal title={modal === "nuevo" ? "Nuevo cliente" : "Editar cliente"} onClose={onCloseModal}>
          {error && <p className="form-error">{error}</p>}
          <div className="form-grid">
            <div>{FIELDS_LEFT.map(f  => <FormField key={f.field} {...f} form={form} setForm={setForm} />)}</div>
            <div>{FIELDS_RIGHT.map(f => <FormField key={f.field} {...f} form={form} setForm={setForm} />)}</div>
          </div>
          <div className="form-actions">
            <button className="btn-cancel" onClick={onCloseModal}>Cancelar</button>
            <button className="btn-save"   onClick={handleSubmit}>{modal === "nuevo" ? "Guardar" : "Actualizar"}</button>
          </div>
        </Modal>
      )}

      {modal === "eliminar" && (
        <ConfirmDelete item={selected} onConfirm={onDelete} onClose={onCloseModal} />
      )}

      {modalPresupuestos && selected && (
        <Modal
          title={`Presupuestos — ${selected.nombre ?? "sin nombre"}`}
          onClose={() => setModalPresupuestos(false)}
        >
          {loadingPresupuestos ? (
            <p style={{ textAlign: "center", padding: "24px", color: "#4a8ab5" }}>
              ⏳ Cargando...
            </p>
          ) : presupuestosCliente.length === 0 ? (
            <p style={{ textAlign: "center", padding: "24px", color: "#8aabb8" }}>
              Este cliente todavía no tiene presupuestos cargados.
            </p>
          ) : (
            <>
              <DataTable
                columns={COLS_HISTORIAL_CLIENTE}
                rows={presupuestosCliente}
                selectedId={null}
                onSelect={(row) => onAbrirPresupuesto?.(row)}
                storageKey="clientes-historial-presupuestos"
              />
              <p style={{ fontSize: 11, color: "#8aabb8", marginTop: 8 }}>
                Tocá un presupuesto de la lista para abrirlo en el editor.
              </p>
            </>
          )}
          <div className="form-actions" style={{ marginTop: "16px" }}>
            <button className="btn-cancel" onClick={() => setModalPresupuestos(false)}>
              Cerrar
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
