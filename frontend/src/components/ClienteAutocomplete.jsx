import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  FormControl,
  InputGroup,
} from "react-bootstrap";
import api from "../../api/axios";

export default function ClienteManager() {
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [modalShow, setModalShow] = useState(false);
  const [modoEditar, setModoEditar] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [formulario, setFormulario] = useState({
    nombre: "",
    rtn: "",
    direccion: "",
  });

  const obtenerClientes = async () => {
    const res = await api.get("/clientes");
    setClientes(res.data);
  };

  useEffect(() => {
    obtenerClientes();
  }, []);

  const handleGuardar = async () => {
    if (modoEditar) {
      await api.put(`/clientes/${clienteSeleccionado.id}`, formulario);
    } else {
      await api.post("/clientes", formulario);
    }
    setModalShow(false);
    setFormulario({ nombre: "", rtn: "", direccion: "" });
    obtenerClientes();
  };

  const editarCliente = (cliente) => {
    setFormulario(cliente);
    setClienteSeleccionado(cliente);
    setModoEditar(true);
    setModalShow(true);
  };

  const eliminarCliente = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este cliente?")) {
      await api.delete(`/clientes/${id}`);
      obtenerClientes();
    }
  };

  const toggleActivo = async (id) => {
    await api.patch(`/clientes/toggle/${id}`);
    obtenerClientes();
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      c.rtn.includes(filtro)
  );

  return (
    <div>
      <h4>Clientes</h4>
      <InputGroup className="mb-3">
        <FormControl
          placeholder="Buscar por nombre o RTN"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <Button
          onClick={() => {
            setFormulario({ nombre: "", rtn: "", direccion: "" });
            setModoEditar(false);
            setModalShow(true);
          }}
        >
          Nuevo Cliente
        </Button>
      </InputGroup>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>RTN</th>
            <th>Dirección</th>
            <th>Activo</th>
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
                />
              </td>
              <td>
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => editarCliente(cliente)}
                >
                  Editar
                </Button>{" "}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => eliminarCliente(cliente.id)}
                >
                  Eliminar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={modalShow} onHide={() => setModalShow(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {modoEditar ? "Editar Cliente" : "Nuevo Cliente"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nombre</Form.Label>
            <FormControl
              value={formulario.nombre}
              onChange={(e) =>
                setFormulario({ ...formulario, nombre: e.target.value })
              }
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>RTN</Form.Label>
            <FormControl
              value={formulario.rtn}
              onChange={(e) =>
                setFormulario({ ...formulario, rtn: e.target.value })
              }
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Dirección</Form.Label>
            <FormControl
              value={formulario.direccion}
              onChange={(e) =>
                setFormulario({ ...formulario, direccion: e.target.value })
              }
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModalShow(false)}>
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
