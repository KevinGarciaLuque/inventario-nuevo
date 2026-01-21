// src/componentes/ConfirmDeleteModal.jsx
import { useState } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { BsExclamationTriangleFill } from "react-icons/bs";
import { FaTrashAlt, FaTimes } from "react-icons/fa";

export default function ConfirmDeleteModal({
  show,
  onHide,
  onConfirm,
  mensaje = "¿Seguro que deseas eliminar este elemento?",
  subtitulo = "Esta acción no se puede deshacer.",
  confirmText = "Eliminar",
  cancelText = "Cancelar",
  backdrop = "static", // evita cierres accidentales
}) {
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (loading) return; // no cerrar mientras está eliminando
    onHide?.();
  };

  const handleConfirm = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await Promise.resolve(onConfirm?.()); // soporta sync/async
      // Si tu handler ya cierra el modal arriba, perfecto.
      // Si no lo cierra, lo cerramos aquí:
      onHide?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      centered
      backdrop={backdrop}
      keyboard={!loading}
    >
      <Modal.Header closeButton={!loading} className="border-0 pb-0">
        <Modal.Title className="w-100 text-center fw-bold text-danger">
          Confirmar eliminación
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="text-center pt-2 pb-4">
        <div className="d-flex justify-content-center mb-3">
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "rgba(220, 53, 69, 0.12)",
            }}
          >
            <BsExclamationTriangleFill size={44} color="#dc3545" />
          </div>
        </div>

        {/* mensaje puede ser string o JSX */}
        <div className="fw-semibold" style={{ fontSize: 16 }}>
          {mensaje}
        </div>

        {subtitulo ? (
          <div className="text-muted mt-2" style={{ fontSize: 13 }}>
            {subtitulo}
          </div>
        ) : null}

        <div className="d-flex gap-2 justify-content-center mt-4">
          <Button
            variant="outline-secondary"
            onClick={handleClose}
            disabled={loading}
            className="px-4"
          >
            <FaTimes className="me-2" />
            {cancelText}
          </Button>

          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={loading}
            className="px-4"
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Eliminando...
              </>
            ) : (
              <>
                <FaTrashAlt className="me-2" />
                {confirmText}
              </>
            )}
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
