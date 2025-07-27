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
import { CheckCircleFill, XCircleFill } from "react-bootstrap-icons";
import api from "../../api/axios";
import ConfirmDeleteModal from "..//components/ConfirmDeleteModal"; // <-- Usa tu modal reutilizable

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

  // --- Estado para confirmación de eliminación ---
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    clienteId: null,
    nombre: "",
  });
  // --- Estado para toast de feedback ---
  const [toast, setToast] = useState({
    show: false,
    message: "",
    variant: "success",
  });

  const obtenerClientes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/clientes");
      setClientes(res.data);
    } catch (err) {
      setToast({
        show: true,
        message: "Error al obtener clientes.",
        variant: "danger",
      });
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
      setToast({
        show: true,
        message: "Cliente guardado correctamente.",
        variant: "success",
      });
    } catch (err) {
      setToast({
        show: true,
        message: "Error guardando cliente.",
        variant: "danger",
      });
      console.error("Error guardando cliente", err);
    }
  };

  const handleEditar = (cliente) => {
    setFormulario(cliente);
    setEditando(true);
    setModal(true);
  };

  // --- Confirmación de eliminar ---
  const askDelete = (clienteId, nombre) =>
    setDeleteConfirm({ show: true, clienteId, nombre });

  const handleDelete = async () => {
    const id = deleteConfirm.clienteId;
    setDeleteConfirm({ show: false, clienteId: null, nombre: "" });
    if (!id) return;
    try {
      await api.delete(`/clientes/${id}`);
      setToast({
        show: true,
        message: "Cliente eliminado correctamente.",
        variant: "success",
      });
      obtenerClientes();
    } catch (err) {
      setToast({
        show: true,
        message:
          err?.response?.data?.message ||
          "No se pudo eliminar. Puede tener relaciones activas.",
        variant: "danger",
      });
      console.error("Error al eliminar cliente:", err);
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

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(
        () => setToast((t) => ({ ...t, show: false })),
        3000
      );
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

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

      {/* Toast de feedback */}
      <Modal
        show={toast.show}
        onHide={() => setToast((t) => ({ ...t, show: false }))}
        centered
      >
        <Modal.Body className="text-center py-4">
          {toast.variant === "success" ? (
            <CheckCircleFill size={50} color="#198754" className="mb-3" />
          ) : (
            <XCircleFill size={50} color="#dc3545" className="mb-3" />
          )}
          <h5
            className={`fw-bold ${
              toast.variant === "success" ? "text-success" : "text-danger"
            }`}
          >
            {toast.message}
          </h5>
          <Button
            variant={toast.variant === "success" ? "success" : "danger"}
            className="mt-2 px-4"
            onClick={() => setToast((t) => ({ ...t, show: false }))}
          >
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>

      {/* Modal confirmación eliminar (reutilizable) */}
      <ConfirmDeleteModal
        show={deleteConfirm.show}
        onHide={() =>
          setDeleteConfirm({ show: false, clienteId: null, nombre: "" })
        }
        onConfirm={handleDelete}
        mensaje={
          <>
            ¿Seguro que deseas eliminar al cliente{" "}
            <span className="fw-bold">{deleteConfirm.nombre}</span>?
          </>
        }
        subtitulo="Esta acción no se puede deshacer."
      />

      {loading ? (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: 150 }}
        >
          <Spinner animation="border" />
        </div>
      ) : (
        <div
          className="bg-white shadow-sm rounded mb-4"
          style={{
            maxHeight: "400px",
            height: "400px", // 🔥 Altura para scroll vertical
            overflowY: "auto",
            overflowX: "auto", // 🔁 Scroll horizontal para móviles
            border: "1px solid #dee2e6", // 🧱 Borde visual
          }}
        >
          <Table
            striped
            bordered
            hover
            responsive
            className="sticky-header mb-0"
            style={{ minWidth: 700 }}
          >
            <thead className="table-light sticky-top">
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
                      onClick={() => askDelete(cliente.id, cliente.nombre)}
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

      {/* Modal para crear/editar cliente */}
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
