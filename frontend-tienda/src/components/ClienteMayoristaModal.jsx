import { useState } from "react";
import { Modal, Button, Form, Spinner, Alert } from "react-bootstrap";
import api from "../api/axios.js";

const initialForm = {
  nombre: "",
  empresa: "",
  telefono: "",
  correo: "",
  ubicacion: "",
};

const ClienteMayoristaModal = ({ show, onClose }) => {
  const [form, setForm] = useState(initialForm);
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState(null); // null | "ok" | "error"

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClose = () => {
    setEstado(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.telefono.trim()) return;

    setEnviando(true);
    setEstado(null);
    try {
      await api.post("/public/clientes-web", form);
      setEstado("ok");
      setForm(initialForm);
    } catch (err) {
      setEstado("error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Quiero ser cliente</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <p className="text-secondary small">
            Déjanos tus datos y te contactaremos con información de precios
            mayoristas y novedades.
          </p>

          {estado === "ok" && (
            <Alert variant="success" className="py-2">
              ¡Listo! Recibimos tu solicitud, pronto te contactaremos.
            </Alert>
          )}
          {estado === "error" && (
            <Alert variant="danger" className="py-2">
              Ocurrió un error al enviar tu solicitud. Intenta de nuevo.
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Nombre completo *</Form.Label>
            <Form.Control
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Nombre de la empresa o negocio</Form.Label>
            <Form.Control
              name="empresa"
              value={form.empresa}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Número de teléfono *</Form.Label>
            <Form.Control
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Correo electrónico</Form.Label>
            <Form.Control
              type="email"
              name="correo"
              value={form.correo}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>Ubicación</Form.Label>
            <Form.Control
              name="ubicacion"
              value={form.ubicacion}
              onChange={handleChange}
              placeholder="Ciudad, sector..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleClose}>
            Cerrar
          </Button>
          <Button variant="warning" type="submit" disabled={enviando}>
            {enviando ? <Spinner animation="border" size="sm" /> : "Enviar solicitud"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ClienteMayoristaModal;
