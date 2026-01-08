import { Button, Form, Modal } from "react-bootstrap";
import { BsCheckCircleFill, BsExclamationTriangleFill } from "react-icons/bs";

export default function ModalesVenta({
  modal,
  setModal,
  imprimirRecibo,

  modalCliente,
  handleCerrarModalCliente,
  formularioCliente,
  setFormularioCliente,
  handleGuardarCliente,

  modalSinCai,
  setModalSinCai,

  toast,

  feedbackModal,
  setFeedbackModal,
}) {
  return (
    <>
      {/* ===== MODAL FACTURA ===== */}
      <Modal
        show={modal.show}
        onHide={() => setModal({ show: false })}
        centered
      >
        <Modal.Body className="text-center py-4">
          {modal.type === "success" ? (
            <BsCheckCircleFill size={64} color="#198754" className="mb-3" />
          ) : (
            <BsExclamationTriangleFill
              size={64}
              color="#dc3545"
              className="mb-3"
            />
          )}

          <h5
            className={`mb-2 fw-bold ${
              modal.type === "success" ? "text-success" : "text-danger"
            }`}
          >
            {modal.title}
          </h5>

          <div className="mb-3 text-muted">{modal.message}</div>

          <div className="d-flex justify-content-center align-items-center flex-wrap gap-3">
            {modal.type === "success" && (
              <Button variant="primary" onClick={imprimirRecibo}>
                Imprimir Recibo
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setModal({ show: false })}
            >
              Cerrar
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* ===== MODAL AGREGAR CLIENTE ===== */}
      <Modal show={modalCliente} onHide={handleCerrarModalCliente} centered>
        <Modal.Header closeButton>
          <Modal.Title>Nuevo Cliente</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              value={formularioCliente.nombre}
              onChange={(e) =>
                setFormularioCliente({
                  ...formularioCliente,
                  nombre: e.target.value,
                })
              }
              placeholder="Nombre del cliente"
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>RTN</Form.Label>
            <Form.Control
              value={formularioCliente.rtn}
              onChange={(e) =>
                setFormularioCliente({
                  ...formularioCliente,
                  rtn: e.target.value,
                })
              }
              placeholder="RTN"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Dirección</Form.Label>
            <Form.Control
              value={formularioCliente.direccion}
              onChange={(e) =>
                setFormularioCliente({
                  ...formularioCliente,
                  direccion: e.target.value,
                })
              }
              placeholder="Dirección"
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleCerrarModalCliente}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGuardarCliente}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===== MODAL SIN CAI ===== */}
      <Modal show={modalSinCai} onHide={() => setModalSinCai(false)} centered>
        <Modal.Body className="text-center py-4">
          <BsExclamationTriangleFill
            size={64}
            color="#dc3545"
            className="mb-3"
          />
          <h5 className="text-danger fw-bold mb-3">No hay CAI activo</h5>
          <p className="text-muted">
            No se puede registrar la venta porque no hay un CAI activo en el
            sistema.
          </p>
          <Button variant="secondary" onClick={() => setModalSinCai(false)}>
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>

      {/* ===== TOAST ===== */}
      {toast.show && (
        <div
          className="position-fixed bottom-0 end-0 p-3"
          style={{ zIndex: 9999 }}
        >
          <div className="toast show text-white bg-success">
            <div className="toast-body">{toast.message}</div>
          </div>
        </div>
      )}

      {/* ===== FEEDBACK MODAL ===== */}
      <Modal
        show={feedbackModal.show}
        onHide={() =>
          setFeedbackModal({ show: false, success: true, message: "" })
        }
        centered
      >
        <Modal.Body className="text-center py-4">
          {feedbackModal.success ? (
            <BsCheckCircleFill size={64} color="#198754" className="mb-3" />
          ) : (
            <BsExclamationTriangleFill
              size={64}
              color="#dc3545"
              className="mb-3"
            />
          )}

          <h5
            className={`mb-2 fw-bold ${
              feedbackModal.success ? "text-success" : "text-danger"
            }`}
          >
            {feedbackModal.success ? "Listo" : "Atención"}
          </h5>

          <div className="mb-3 text-muted">{feedbackModal.message}</div>

          <Button
            variant="secondary"
            onClick={() =>
              setFeedbackModal({ show: false, success: true, message: "" })
            }
          >
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>
    </>
  );
}
