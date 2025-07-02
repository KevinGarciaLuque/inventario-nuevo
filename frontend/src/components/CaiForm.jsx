import React, { useState } from "react";
import api from "../../api/axios";
import { Form, Button, Card } from "react-bootstrap";
import ToastAlert from "./ToastAlert";

export default function CaiForm({ onSuccess }) {
  const [form, setForm] = useState({
    cai_codigo: "",
    sucursal: "000",
    punto_emision: "001",
    tipo_documento: "01",
    rango_inicio: 1,
    rango_fin: 1000,
    correlativo_actual: 0,
    fecha_autorizacion: "",
    fecha_limite_emision: "",
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/cai", form);
      setToast({ show: true, message: "CAI registrado correctamente" });
      if (onSuccess) onSuccess();
      setForm({
        ...form,
        cai_codigo: "",
        rango_inicio: 1,
        rango_fin: 1000,
        correlativo_actual: 0,
      });
    } catch {
      setToast({ show: true, message: "Error al registrar" });
    }
    setLoading(false);
  };

  return (
    <>
      <Card className="mb-4">
        <Card.Header>Registrar Nuevo CAI</Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>CAI Código</Form.Label>
              <Form.Control
                name="cai_codigo"
                value={form.cai_codigo}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Rango Inicio</Form.Label>
              <Form.Control
                name="rango_inicio"
                type="number"
                value={form.rango_inicio}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Rango Fin</Form.Label>
              <Form.Control
                name="rango_fin"
                type="number"
                value={form.rango_fin}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Fecha Autorización</Form.Label>
              <Form.Control
                type="date"
                name="fecha_autorizacion"
                value={form.fecha_autorizacion}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Fecha Límite de Emisión</Form.Label>
              <Form.Control
                type="date"
                name="fecha_limite_emision"
                value={form.fecha_limite_emision}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Button type="submit" variant="primary" disabled={loading}>
              Guardar CAI
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <ToastAlert
        show={toast.show}
        message={toast.message}
        onClose={() => setToast({ show: false, message: "" })}
      />
    </>
  );
}
