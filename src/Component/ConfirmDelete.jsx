import Modal from "./Modal";

export default function ConfirmDelete({ item, title, message, onConfirm, onClose }) {
  if (!item) return null;
  return (
    <Modal title={title || "Confirmar eliminación"} onClose={onClose}>
      <p className="confirm-text">
        {message ?? (
          <>
            ¿Eliminar <span className="confirm-name">{item.nombre}</span>? Esta acción no se puede deshacer.
          </>
        )}
      </p>
      <div className="form-actions">
        <button className="btn-cancel" onClick={onClose}>Cancelar</button>
        <button className="btn-danger" onClick={() => { onConfirm(item.id); onClose(); }}>Eliminar</button>
      </div>
    </Modal>
  );
}
