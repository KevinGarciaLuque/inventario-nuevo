import React, { useEffect, useState } from "react";
import { Button, Form, Modal, Table, Badge } from "react-bootstrap";
import api from "../../api/axios";
import { BsCheckCircleFill, BsExclamationTriangleFill } from "react-icons/bs";

export default function CaiPage() {
  const [caiList, setCaiList] = useState([]);
  const [modal, setModal] = useState({ show: false, type: "", message: "" });
  const [nuevoCai, setNuevoCai] = useState({
    cai_codigo: "",
    sucursal: "",
    punto_emision: "",
    tipo_documento: "",
    rango_inicio: 1,
    rango_fin: 100,
    correlativo_actual: 0,
    fecha_autorizacion: "",
    fecha_limite_emision: "",
    activo: true,
  });

  useEffect(() => {
    cargarCai();
  }, []);

  const cargarCai = async () => {
    try {
      const res = await api.get("/cai");
      setCaiList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNuevoCai((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const crearCai = async (e) => {
    e.preventDefault();
    try {
      await api.post("/cai", nuevoCai);
      setModal({
        show: true,
        type: "success",
        message: "CAI registrado correctamente",
      });
      setNuevoCai({
        cai_codigo: "",
        sucursal: "",
        punto_emision: "",
        tipo_documento: "",
        rango_inicio: 1,
        rango_fin: 100,
        correlativo_actual: 0,
        fecha_autorizacion: "",
        fecha_limite_emision: "",
        activo: true,
      });
      cargarCai();
    } catch (err) {
      console.error(err);
      setModal({
        show: true,
        type: "error",
        message: "Error al registrar el CAI",
      });
    }
  };

  const cambiarEstado = async (id, activo) => {
    try {
      await api.patch(`/cai/${id}`, { activo });
      cargarCai();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">Control de CAI</h2>

      <Form
        onSubmit={crearCai}
        className="border rounded p-3 shadow mb-4 bg-light"
      >
        <h5>Nuevo CAI</h5>
        <div className="row g-2">
          <div className="col-md-4">
            <Form.Label>Código CAI</Form.Label>
            <Form.Control
              name="cai_codigo"
              value={nuevoCai.cai_codigo}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-2">
            <Form.Label>Sucursal</Form.Label>
            <Form.Control
              name="sucursal"
              value={nuevoCai.sucursal}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-2">
            <Form.Label>Punto Emisión</Form.Label>
            <Form.Control
              name="punto_emision"
              value={nuevoCai.punto_emision}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-2">
            <Form.Label>Tipo Documento</Form.Label>
            <Form.Control
              name="tipo_documento"
              value={nuevoCai.tipo_documento}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-2">
            <Form.Label>Inicio Rango</Form.Label>
            <Form.Control
              type="number"
              name="rango_inicio"
              value={nuevoCai.rango_inicio}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-2">
            <Form.Label>Fin Rango</Form.Label>
            <Form.Control
              type="number"
              name="rango_fin"
              value={nuevoCai.rango_fin}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-2">
            <Form.Label>Correlativo</Form.Label>
            <Form.Control
              type="number"
              name="correlativo_actual"
              value={nuevoCai.correlativo_actual}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-3">
            <Form.Label>Fecha Autorización</Form.Label>
            <Form.Control
              type="date"
              name="fecha_autorizacion"
              value={nuevoCai.fecha_autorizacion}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-3">
            <Form.Label>Fecha Límite</Form.Label>
            <Form.Control
              type="date"
              name="fecha_limite_emision"
              value={nuevoCai.fecha_limite_emision}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-2 align-self-end">
            <Button type="submit" variant="success" className="w-100">
              Registrar CAI
            </Button>
          </div>
        </div>
      </Form>

      <div
        className="bg-white shadow-sm rounded mb-4"
        style={{
          maxHeight: "400px",
          height: "300px", // 🔥 Altura fija para scroll vertical
          overflowY: "auto",
          overflowX: "auto", // 🔁 Scroll horizontal para celulares
          border: "1px solid #dee2e6", // opcional para visualización clara
        }}
      >
        <Table
          bordered
          hover
          className="mb-0 sticky-header"
          style={{ minWidth: "700px" }} // ⬅️ Ajusta según tus columnas visibles
        >
          <thead className="table-light sticky-top">
            <tr>
              <th>ID</th>
              <th>CAI</th>
              <th>Rango</th>
              <th>Correlativo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {caiList.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.cai_codigo}</td>
                <td>
                  {item.rango_inicio} - {item.rango_fin}
                </td>
                <td>{item.correlativo_actual}</td>
                <td>
                  {item.activo ? (
                    <Badge bg="success">Activo</Badge>
                  ) : (
                    <Badge bg="secondary">Inactivo</Badge>
                  )}
                </td>
                <td>
                  {item.activo ? (
                    <Button
                      size="sm"
                      variant="warning"
                      onClick={() => cambiarEstado(item.id, false)}
                    >
                      Desactivar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => cambiarEstado(item.id, true)}
                    >
                      Activar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

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
          <h5 className="mb-2 fw-bold">{modal.message}</h5>
        </Modal.Body>
      </Modal>
    </div>
  );
}
