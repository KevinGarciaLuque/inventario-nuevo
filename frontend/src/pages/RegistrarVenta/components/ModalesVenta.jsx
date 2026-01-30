import React, { useMemo, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { BsCheckCircleFill, BsExclamationTriangleFill } from "react-icons/bs";

const ModalIcon = ({ success }) =>
  success ? (
    <BsCheckCircleFill size={64} color="#198754" className="mb-3" />
  ) : (
    <BsExclamationTriangleFill size={64} color="#dc3545" className="mb-3" />
  );

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
  const [imprimiendo, setImprimiendo] = useState(false);

  // ✅ Normaliza estructuras para evitar crasheos
  const modalSafe = useMemo(
    () => ({
      show: Boolean(modal?.show),
      type: modal?.type || "success",
      title: modal?.title || "",
      message: modal?.message || "",
      dataRecibo: modal?.dataRecibo || null,
    }),
    [modal],
  );

  const toastSafe = useMemo(
    () => ({
      show: Boolean(toast?.show),
      message: toast?.message || "",
      variant: toast?.variant || "success",
    }),
    [toast],
  );

  const feedbackSafe = useMemo(
    () => ({
      show: Boolean(feedbackModal?.show),
      success: feedbackModal?.success !== false, // default true
      message: feedbackModal?.message || "",
    }),
    [feedbackModal],
  );

  const cerrarModalFactura = () => {
    setModal({ show: false });
    setImprimiendo(false);
  };

  const handleImprimir = async () => {
    if (imprimiendo) return;

    // ✅ si no hay dataRecibo, no imprimimos
    if (!modalSafe.dataRecibo) {
      setModal({
        show: true,
        type: "danger",
        title: "Error",
        message: "No se encontró la información del recibo para imprimir.",
      });
      return;
    }

    try {
      setImprimiendo(true);
      // imprimirRecibo debe usar modal.dataRecibo en el padre
      await Promise.resolve(imprimirRecibo());
    } finally {
      // 👇 liberamos el botón aunque el navegador bloquee popups o print
      setTimeout(() => setImprimiendo(false), 700);
    }
  };

  return (
    <>
      {/* ===== MODAL FACTURA ===== */}
      <Modal show={modalSafe.show} onHide={cerrarModalFactura} centered>
        <Modal.Body className="text-center py-4">
          <ModalIcon success={modalSafe.type === "success"} />

          <h5
            className={`mb-2 fw-bold ${
              modalSafe.type === "success" ? "text-success" : "text-danger"
            }`}
          >
            {modalSafe.title}
          </h5>

          <div className="mb-3 text-muted">{modalSafe.message}</div>

          <div className="d-flex justify-content-center align-items-center flex-wrap gap-3">
            {modalSafe.type === "success" && (
              <Button
                variant="primary"
                onClick={handleImprimir}
                disabled={imprimiendo || !modalSafe.dataRecibo}
                title={
                  !modalSafe.dataRecibo ? "No hay recibo para imprimir" : ""
                }
              >
                {imprimiendo ? "Imprimiendo..." : "Imprimir Recibo"}
              </Button>
            )}

            <Button variant="secondary" onClick={cerrarModalFactura}>
              Cerrar
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* ===== MODAL AGREGAR CLIENTE ===== */}
      <Modal
        show={Boolean(modalCliente)}
        onHide={handleCerrarModalCliente}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Nuevo Cliente</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              value={formularioCliente?.nombre ?? ""}
              onChange={(e) =>
                setFormularioCliente({
                  ...(formularioCliente || {}),
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
              value={formularioCliente?.rtn ?? ""}
              onChange={(e) =>
                setFormularioCliente({
                  ...(formularioCliente || {}),
                  rtn: e.target.value,
                })
              }
              placeholder="RTN"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Dirección</Form.Label>
            <Form.Control
              value={formularioCliente?.direccion ?? ""}
              onChange={(e) =>
                setFormularioCliente({
                  ...(formularioCliente || {}),
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
      <Modal
        show={Boolean(modalSinCai)}
        onHide={() => setModalSinCai(false)}
        centered
      >
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
      {toastSafe.show && (
        <div
          className="position-fixed bottom-0 end-0 p-3"
          style={{ zIndex: 9999 }}
        >
          <div className={`toast show text-white bg-${toastSafe.variant}`}>
            <div className="toast-body">{toastSafe.message}</div>
          </div>
        </div>
      )}

      {/* ===== FEEDBACK MODAL ===== */}
      <Modal
        show={feedbackSafe.show}
        onHide={() =>
          setFeedbackModal({ show: false, success: true, message: "" })
        }
        centered
      >
        <Modal.Body className="text-center py-4">
          <ModalIcon success={feedbackSafe.success} />

          <h5
            className={`mb-2 fw-bold ${
              feedbackSafe.success ? "text-success" : "text-danger"
            }`}
          >
            {feedbackSafe.success ? "Listo" : "Atención"}
          </h5>

          <div className="mb-3 text-muted">{feedbackSafe.message}</div>

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
