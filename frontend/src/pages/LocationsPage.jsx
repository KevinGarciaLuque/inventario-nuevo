import React, { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import {
  BsPencilSquare,
  BsTrash,
  BsCheckCircleFill,
  BsExclamationTriangleFill,
} from "react-icons/bs";
import api from "../../api/axios";
import { useUser } from "../context/UserContext"; // Ajusta si tu contexto es otro nombre

export default function LocationsPage() {
  const { user } = useUser(); // Asegúrate de tener el usuario y su rol disponible aquí
  const [ubicaciones, setUbicaciones] = useState([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);

  // Para edición
  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [showEdit, setShowEdit] = useState(false);

  // Modal de confirmación de eliminación
  const [showConfirm, setShowConfirm] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);

  // Modal feedback
  const [modal, setModal] = useState({
    show: false,
    type: "success", // "success" | "error"
    title: "",
    message: "",
  });

  // Mostrar modal elegante
  const showModal = ({ type, title, message }) => {
    setModal({
      show: true,
      type,
      title,
      message,
    });
  };

  const closeModal = () => setModal((prev) => ({ ...prev, show: false }));

  // Cargar ubicaciones
  const cargarUbicaciones = async () => {
    try {
      setLoading(true);
      const res = await api.get("/ubicaciones");
      setUbicaciones(res.data);
    } catch {
      showModal({
        type: "error",
        title: "Error al cargar",
        message: "No se pudieron cargar las ubicaciones.",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarUbicaciones();
  }, []);

  // Agregar ubicación
  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post("/ubicaciones", { nombre, descripcion });
      setNombre("");
      setDescripcion("");
      await cargarUbicaciones();
      showModal({
        type: "success",
        title: "¡Ubicación agregada!",
        message: "La ubicación se registró correctamente.",
      });
    } catch {
      showModal({
        type: "error",
        title: "Error",
        message: "No se pudo agregar la ubicación.",
      });
    }
  };

  // Mostrar modal de confirmación
  const handleDeleteClick = (id) => {
    setIdToDelete(id);
    setShowConfirm(true);
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/ubicaciones/${idToDelete}`);
      await cargarUbicaciones();
      showModal({
        type: "success",
        title: "¡Ubicación eliminada!",
        message: "La ubicación fue eliminada correctamente.",
      });
    } catch {
      showModal({
        type: "error",
        title: "No se pudo eliminar",
        message: "La ubicación está en uso o ha ocurrido un error.",
      });
    }
    setShowConfirm(false);
    setIdToDelete(null);
  };

  // Abrir modal de edición
  const openEdit = (ub) => {
    setEditId(ub.id);
    setEditNombre(ub.nombre);
    setEditDescripcion(ub.descripcion);
    setShowEdit(true);
  };

  // Guardar edición
  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/ubicaciones/${editId}`, {
        nombre: editNombre,
        descripcion: editDescripcion,
      });
      setShowEdit(false);
      setEditId(null);
      await cargarUbicaciones();
      showModal({
        type: "success",
        title: "¡Ubicación editada!",
        message: "La ubicación fue actualizada correctamente.",
      });
    } catch {
      showModal({
        type: "error",
        title: "Error al editar",
        message: "No se pudo editar la ubicación.",
      });
    }
  };

  return (
    <div className="container py-4">
      <h3 className="mb-3 text-center">Ubicaciones</h3>
      {/* FORMULARIO RESPONSIVO */}
      {user?.rol === "admin" && (
        <form onSubmit={handleAdd} className="mb-3 row g-2 locations-form">
          <div className="col-md-4 col-12">
            <input
              className="form-control"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="col-md-5 col-12">
            <input
              className="form-control"
              placeholder="Descripción"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
          <div className="col-md-3 col-12 d-grid">
            <button
              className="btn btn-success w-150"
              type="submit"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Agregar"}
            </button>
          </div>
        </form>
      )}
      {/* TABLA RESPONSIVA */}
      <div
        className="bg-white shadow-sm rounded mb-4"
        style={{
          maxHeight: "400px",
          height: "300px", // 🔥 Fijamos altura para scroll vertical
          overflowY: "auto",
          overflowX: "auto", // 🔁 Scroll horizontal en pantallas pequeñas
          border: "1px solid #dee2e6", // 🧱 Borde visual opcional
        }}
      >
        <table
          className="table table-bordered align-middle locations-table sticky-header"
          style={{ minWidth: "600px" }} // ⬅️ Ancho mínimo para evitar compresión
        >
          <thead className="table-light sticky-top">
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th style={{ width: 150 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ubicaciones.map((ub) => (
              <tr key={ub.id}>
                <td>{ub.nombre}</td>
                <td style={{ wordBreak: "break-word" }}>{ub.descripcion}</td>
                <td>
                  {user?.rol === "admin" && (
                    <>
                      <button
                        className="btn btn-warning btn-sm me-1"
                        style={{ borderRadius: 8 }}
                        onClick={() => openEdit(ub)}
                        title="Editar"
                      >
                        <BsPencilSquare />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ borderRadius: 8 }}
                        onClick={() => handleDeleteClick(ub.id)}
                        title="Eliminar"
                      >
                        <BsTrash />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {ubicaciones.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-muted">
                  {loading ? "Cargando..." : "No hay ubicaciones"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
  .sticky-top { position: sticky; top: 0; z-index: 2; background: #f8f9fa; }
`}</style>

      {/* MODAL EDICIÓN RESPONSIVO */}
      {showEdit && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <div className="modal-dialog modal-dialog-centered locations-modal">
            <div className="modal-content">
              <form onSubmit={handleEdit}>
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    <BsPencilSquare className="me-2" />
                    Editar Ubicación
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowEdit(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input
                      className="form-control"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Descripción</label>
                    <input
                      className="form-control"
                      value={editDescripcion}
                      onChange={(e) => setEditDescripcion(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light flex-column flex-sm-row gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100 w-sm-auto"
                    onClick={() => setShowEdit(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary w-100 w-sm-auto"
                    type="submit"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Body className="text-center py-4">
          <BsExclamationTriangleFill
            size={54}
            color="#dc3545"
            className="mb-3"
          />
          <h5 className="mb-2 mt-2 fw-bold text-danger">
            ¿Seguro que deseas eliminar esta ubicación?
          </h5>
          <div className="mb-3 text-muted">
            Esta acción no se puede deshacer.
          </div>
          <div className="d-flex gap-2 justify-content-center">
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Eliminar
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* MODAL DE FEEDBACK */}
      <Modal show={modal.show} onHide={closeModal} centered>
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
          <Button
            variant={modal.type === "success" ? "success" : "danger"}
            onClick={closeModal}
          >
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>
      {/* ESTILOS RESPONSIVOS */}
      <style>{`
        /* Formulario responsivo */
        @media (max-width: 991.98px) {
          .locations-form > div {
            margin-bottom: 0.5rem !important;
          }
        }
        @media (max-width: 767.98px) {
          .locations-form > div {
            width: 100% !important;
            max-width: 100% !important;
            flex: 0 0 100% !important;
          }
        }
        /* Tabla responsiva */
        @media (max-width: 575.98px) {
          .locations-table th,
          .locations-table td {
            font-size: 0.99rem !important;
            padding: 0.34rem 0.45rem !important;
            vertical-align: middle;
          }
          .locations-table th {
            min-width: 75px;
          }
        }
        /* Modal edición responsivo */
        @media (max-width: 575.98px) {
          .locations-modal {
            max-width: 98vw !important;
            margin: 0.6rem !important;
          }
          .modal-content {
            border-radius: 13px !important;
          }
          .modal-title {
            font-size: 1.07rem !important;
          }
          .modal-footer {
            flex-direction: column !important;
            gap: 0.7rem !important;
          }
        }
      `}</style>
    </div>
  );
}
