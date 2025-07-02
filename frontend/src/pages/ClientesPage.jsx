import React, { useEffect, useState } from "react";
import {
  Table,
  Form,
  Button,
  Modal,
  Spinner,
  InputGroup,
} from "react-bootstrap";
import { FaEdit, FaTrash, FaSyncAlt } from "react-icons/fa";
import api from "../../api/axios";

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(false);
  const [formulario, setFormulario] = useState({
    id: null,
    nombre: "",
    rtn: "",
    direccion: "",
  });

  const obtenerClientes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/clientes");
      setClientes(res.data);
    } catch (err) {
      console.error("Error al obtener clientes", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerClientes();
  }, []);

  const handleGuardar = async () => {
    try {
      if (editando) {
        await api.put(`/clientes/${formulario.id}`, formulario);
      } else {
        await api.post("/clientes", formulario);
      }
      setModal(false);
      setFormulario({ id: null, nombre: "", rtn: "", direccion: "" });
      setEditando(false);
      obtenerClientes();
    } catch (err) {
      console.error("Error guardando cliente", err);
    }
  };

  const handleEditar = (cliente) => {
    setFormulario(cliente);
    setEditando(true);
    setModal(true);
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Eliminar este cliente?")) {
      await api.delete(`/clientes/${id}`);
      obtenerClientes();
    }
  };

  const toggleActivo = async (id) => {
    await api.patch(`/clientes/toggle/${id}`);
    obtenerClientes();
  };

  const handleCerrarModal = () => {
    setModal(false);
    setFormulario({ id: null, nombre: "", rtn: "", direccion: "" });
    setEditando(false);
  };

  const clientesFiltrados = clientes.filter((c) =>
    `${c.nombre} ${c.rtn}`.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div>
      <h3>Gestión de Clientes</h3>

      <InputGroup className="mb-3">
        <Form.Control
          placeholder="Buscar por nombre o RTN"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <Button variant="success" onClick={() => setModal(true)}>
          Agregar Cliente
        </Button>
        <Button variant="outline-secondary" onClick={obtenerClientes}>
          <FaSyncAlt />
        </Button>
      </InputGroup>

      {loading ? (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: 150 }}
        >
          <Spinner animation="border" />
        </div>
      ) : (
        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          <Table
            striped
            bordered
            hover
            responsive
            className="mb-0"
            style={{ minWidth: 700 }}
          >
            <thead
              className="bg-light"
              style={{ position: "sticky", top: 0, zIndex: 1 }}
            >
              <tr>
                <th>Nombre</th>
                <th>RTN</th>
                <th>Dirección</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.nombre}</td>
                  <td>{cliente.rtn}</td>
                  <td>{cliente.direccion}</td>
                  <td>
                    <Form.Check
                      type="switch"
                      checked={cliente.activo}
                      onChange={() => toggleActivo(cliente.id)}
                      label={cliente.activo ? "Activo" : "Inactivo"}
                    />
                  </td>
                  <td>
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() => handleEditar(cliente)}
                      className="me-2"
                    >
                      <FaEdit />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleEliminar(cliente.id)}
                    >
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <Modal show={modal} onHide={handleCerrarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editando ? "Editar Cliente" : "Nuevo Cliente"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              value={formulario.nombre}
              onChange={(e) =>
                setFormulario({ ...formulario, nombre: e.target.value })
              }
              placeholder="Nombre del cliente"
              autoFocus
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>RTN</Form.Label>
            <Form.Control
              value={formulario.rtn}
              onChange={(e) =>
                setFormulario({ ...formulario, rtn: e.target.value })
              }
              placeholder="RTN"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Dirección</Form.Label>
            <Form.Control
              value={formulario.direccion}
              onChange={(e) =>
                setFormulario({ ...formulario, direccion: e.target.value })
              }
              placeholder="Dirección"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCerrarModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGuardar}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
