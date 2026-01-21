// frontend/src/pages/ClientesPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  InputGroup,
  Modal,
  Spinner,
  Table,
} from "react-bootstrap";
import { CheckCircleFill, XCircleFill } from "react-bootstrap-icons";
import { FaEdit, FaSyncAlt, FaTrash } from "react-icons/fa";
import api from "../../api/axios";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";

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
    telefono: "",
    direccion: "",
  });

  // Confirmación eliminar
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    clienteId: null,
    nombre: "",
  });

  // Toast (modal)
  const [toast, setToast] = useState({
    show: false,
    message: "",
    variant: "success",
  });

  const mostrarToast = (message, variant = "success") => {
    setToast({ show: true, message, variant });
  };

  const obtenerClientes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/clientes");
      setClientes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error al obtener clientes", err);
      mostrarToast("Error al obtener clientes.", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerClientes();
  }, []);

  const limpiarFormulario = () => {
    setFormulario({
      id: null,
      nombre: "",
      rtn: "",
      telefono: "",
      direccion: "",
    });
  };

  const handleGuardar = async () => {
    try {
      const payload = {
        nombre: (formulario.nombre || "").trim(),
        rtn: (formulario.rtn || "").trim(),
        telefono: (formulario.telefono || "").trim(),
        direccion: (formulario.direccion || "").trim(),
      };

      if (!payload.nombre) {
        mostrarToast("El nombre es obligatorio.", "danger");
        return;
      }

      if (editando) {
        await api.put(`/clientes/${formulario.id}`, payload);
      } else {
        await api.post("/clientes", payload);
      }

      setModal(false);
      limpiarFormulario();
      setEditando(false);
      obtenerClientes();

      mostrarToast("Cliente guardado correctamente.", "success");
    } catch (err) {
      console.error("Error guardando cliente", err);
      const msg =
        err?.response?.data?.message ||
        "Error guardando cliente. Verifica RTN duplicado o datos inválidos.";
      mostrarToast(msg, "danger");
    }
  };

  const handleEditar = (cliente) => {
    setFormulario({
      id: cliente.id,
      nombre: cliente.nombre || "",
      rtn: cliente.rtn || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
    });
    setEditando(true);
    setModal(true);
  };

  const askDelete = (clienteId, nombre) =>
    setDeleteConfirm({ show: true, clienteId, nombre });

  const handleDelete = async () => {
    const id = deleteConfirm.clienteId;
    setDeleteConfirm({ show: false, clienteId: null, nombre: "" });
    if (!id) return;

    try {
      await api.delete(`/clientes/${id}`);
      mostrarToast("Cliente eliminado correctamente.", "success");
      obtenerClientes();
    } catch (err) {
      console.error("Error al eliminar cliente:", err);
      mostrarToast(
        err?.response?.data?.message ||
          "No se pudo eliminar. Puede tener relaciones activas.",
        "danger",
      );
    }
  };

  const toggleActivo = async (id) => {
    try {
      await api.patch(`/clientes/toggle/${id}`);
      obtenerClientes();
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      mostrarToast("No se pudo cambiar el estado del cliente.", "danger");
    }
  };

  const handleCerrarModal = () => {
    setModal(false);
    limpiarFormulario();
    setEditando(false);
  };

  const clientesFiltrados = useMemo(() => {
    const f = (filtro || "").toLowerCase().trim();
    if (!f) return clientes;

    return clientes.filter((c) =>
      `${c.nombre || ""} ${c.rtn || ""} ${c.telefono || ""}`
        .toLowerCase()
        .includes(f),
    );
  }, [clientes, filtro]);

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(
      () => setToast((t) => ({ ...t, show: false })),
      2500,
    );
    return () => clearTimeout(timer);
  }, [toast.show]);

  return (
    <div>
      <h3>Gestión de Clientes</h3>

      <InputGroup className="mb-3">
        <Form.Control
          placeholder="Buscar por nombre, RTN o teléfono"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <Button
          variant="success"
          onClick={() => {
            setEditando(false);
            limpiarFormulario();
            setModal(true);
          }}
        >
          Agregar Cliente
        </Button>
        <Button
          variant="outline-secondary"
          onClick={obtenerClientes}
          title="Actualizar"
        >
          <FaSyncAlt />
        </Button>
      </InputGroup>

      {/* Toast de feedback (modal) */}
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

      {/* Modal confirmación eliminar */}
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
            height: "400px",
            overflowY: "auto",
            overflowX: "auto",
            border: "1px solid #dee2e6",
          }}
        >
          <Table
            striped
            bordered
            hover
            responsive
            className="sticky-header mb-0"
            style={{ minWidth: 850 }}
          >
            <thead className="table-light sticky-top">
              <tr>
                <th>Nombre</th>
                <th>RTN</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Estado</th>
                <th style={{ width: 130 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.nombre}</td>
                  <td>{cliente.rtn || "-"}</td>
                  <td>{cliente.telefono || "-"}</td>
                  <td>{cliente.direccion || "-"}</td>
                  <td>
                    <Form.Check
                      type="switch"
                      checked={Boolean(cliente.activo)}
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
                      title="Editar"
                    >
                      <FaEdit />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => askDelete(cliente.id, cliente.nombre)}
                      title="Eliminar"
                    >
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}

              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No hay clientes para mostrar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </div>
      )}

      {/* Modal crear/editar */}
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
            <Form.Label>Teléfono</Form.Label>
            <Form.Control
              value={formulario.telefono}
              onChange={(e) =>
                setFormulario({ ...formulario, telefono: e.target.value })
              }
              placeholder="Teléfono"
            />
          </Form.Group>

          <Form.Group className="mb-2">
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
