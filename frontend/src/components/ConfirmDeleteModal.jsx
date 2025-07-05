// src/componentes/ConfirmDeleteModal.jsx
import { Modal, Button } from "react-bootstrap";
import { BsExclamationTriangleFill } from "react-icons/bs";

export default function ConfirmDeleteModal({
  show,
  onHide,
  onConfirm,
  mensaje = "¿Seguro que deseas eliminar este elemento?",
  subtitulo = "Esta acción no se puede deshacer.",
}) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Body className="text-center py-4">
        <BsExclamationTriangleFill size={54} color="#dc3545" className="mb-3" />
        <h5 className="mb-2 mt-2 fw-bold text-danger">{mensaje}</h5>
        <div className="mb-3 text-muted">{subtitulo}</div>
        <div className="d-flex gap-2 justify-content-center">
          <Button variant="secondary" onClick={onHide}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Eliminar
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
