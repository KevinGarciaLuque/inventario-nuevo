import { Button, Modal } from "react-bootstrap";
import { CheckCircleFill } from "react-bootstrap-icons";

export default function ModalProductoSuccess({ showSuccess, setShowSuccess }) {
  return (
    <Modal show={showSuccess} onHide={() => setShowSuccess(false)} centered>
      <Modal.Body className="text-center py-4">
        <CheckCircleFill size={64} color="#198754" className="mb-3" />
        <h5 className="mb-2 fw-bold text-success">
          ¡Producto registrado correctamente!
        </h5>
        <Button variant="success" onClick={() => setShowSuccess(false)}>
          Cerrar
        </Button>
      </Modal.Body>
    </Modal>
  );
}
