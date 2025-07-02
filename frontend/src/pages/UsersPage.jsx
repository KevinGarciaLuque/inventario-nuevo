import React, { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import api from "../../api/axios";
import { useUser } from "../context/UserContext"; // Ajusta si usas otro contexto

export default function UsersPage() {
  const { user } = useUser(); // Aquí obtienes el usuario logueado y su rol
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "usuario",
  });
  const [editUser, setEditUser] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);

  // Modal feedback
  const [modal, setModal] = useState({
    show: false,
    type: "success", // "success" | "error"
    title: "",
    message: "",
  });

  // Modal cambiar contraseña
  const [showPassModal, setShowPassModal] = useState(false);
  const [passUserId, setPassUserId] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  // Cargar usuarios
  const cargarUsuarios = async () => {
    const res = await api.get("/usuarios");
    setUsuarios(res.data);
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // Manejadores
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Crear o actualizar usuario
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editUser) {
        await api.put(`/usuarios/${editUser.id}`, {
          nombre: form.nombre,
          email: form.email,
          rol: form.rol,
        });
        setEditUser(null);
      } else {
        await api.post("/usuarios", form);
      }
      setForm({ nombre: "", email: "", password: "", rol: "usuario" });
      cargarUsuarios();
      showModal({
        type: "success",
        title: "¡Usuario guardado!",
        message: "El usuario se guardó correctamente.",
      });
    } catch (err) {
      showModal({
        type: "error",
        title: "Error al guardar",
        message:
          err.response?.data?.message || "No se pudo guardar el usuario.",
      });
    }
  };

  // Editar usuario (llena el form)
  const handleEdit = (user) => {
    setEditUser(user);
    setForm({
      nombre: user.nombre,
      email: user.email,
      password: "",
      rol: user.rol,
    });
  };

  // Eliminar usuario (abre confirmación)
  const handleDeleteClick = (id) => {
    setIdToDelete(id);
    setShowConfirm(true);
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/usuarios/${idToDelete}`);
      cargarUsuarios();
      showModal({
        type: "success",
        title: "¡Usuario eliminado!",
        message: "El usuario fue eliminado correctamente.",
      });
    } catch {
      showModal({
        type: "error",
        title: "No se pudo eliminar",
        message: "El usuario no pudo ser eliminado.",
      });
    }
    setShowConfirm(false);
    setIdToDelete(null);
  };

  // Cambiar contraseña
  const handleChangePasswordClick = (id) => {
    setPassUserId(id);
    setNewPassword("");
    setShowPassModal(true);
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/usuarios/${passUserId}/password`, {
        password: newPassword,
      });
      showModal({
        type: "success",
        title: "Contraseña actualizada",
        message: "La contraseña se actualizó correctamente.",
      });
    } catch {
      showModal({
        type: "error",
        title: "Error",
        message: "No se pudo actualizar la contraseña.",
      });
    }
    setShowPassModal(false);
    setPassUserId(null);
    setNewPassword("");
  };

  // Modal feedback helper
  const showModal = ({ type, title, message }) => {
    setModal({ show: true, type, title, message });
  };
  const closeModal = () => setModal((m) => ({ ...m, show: false }));

  return (
    <div className="container py-4 userspage-responsive-root">
      <h3 className="mb-4">Usuarios</h3>
      {/* Solo los admins pueden agregar/editar usuarios */}
      {user?.rol === "admin" && (
        <form
          onSubmit={handleSubmit}
          className="row g-2 align-items-end mb-4 users-form-row"
        >
          <div className="col-md-3 col-12">
            <input
              className="form-control"
              name="nombre"
              placeholder="Nombre"
              value={form.nombre}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-3 col-12">
            <input
              className="form-control"
              name="email"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          {!editUser && (
            <div className="col-md-3 col-12">
              <input
                className="form-control"
                name="password"
                placeholder="Contraseña"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
          )}
          <div className="col-md-2 col-6">
            <select
              className="form-select"
              name="rol"
              value={form.rol}
              onChange={handleChange}
            >
              <option value="admin">Administrador</option>
              <option value="usuario">Usuario</option>
            </select>
          </div>
          <div className="col-md-1 col-6">
            <button type="submit" className="btn btn-success w-150">
              {editUser ? "Actualizar" : "Agregar"}
            </button>
          </div>
          {editUser && (
            <div className="col-md-2 col-6 mx-4">
              <button
                className="btn btn-secondary  w-20"
                type="button"
                onClick={() => {
                  setEditUser(null);
                  setForm({
                    nombre: "",
                    email: "",
                    password: "",
                    rol: "usuario",
                  });
                }}
              >
                Cancelar edición
              </button>
            </div>
          )}
        </form>
      )}
     
      <div
        className="table-responsive"
        style={{ maxHeight: "400px", overflowY: "auto" }}
      >
        <table className="table table-bordered align-middle mb-0 sticky-header">
          <thead className="table-light sticky-top">
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Creado en</th>
              <th style={{ width: 170 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td>
                  <span
                    className={`badge bg-${
                      u.rol === "admin" ? "primary" : "secondary"
                    }`}
                  >
                    {u.rol}
                  </span>
                </td>
                <td>{u.creado_en && u.creado_en.split("T")[0]}</td>
                <td>
                  {user?.rol === "admin" && (
                    <>
                      <button
                        className="btn btn-warning btn-sm me-1"
                        style={{ borderRadius: 8 }}
                        onClick={() => handleEdit(u)}
                      >
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      <button
                        className="btn btn-danger btn-sm me-1"
                        style={{ borderRadius: 8 }}
                        onClick={() => handleDeleteClick(u.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        style={{ borderRadius: 8 }}
                        onClick={() => handleChangePasswordClick(u.id)}
                      >
                        <i className="bi bi-key"></i>
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted">
                  No hay usuarios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <style>{`
  .sticky-top { position: sticky; top: 0; z-index: 2; background: #f8f9fa; }
`}</style>
      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Body className="text-center py-4">
          <i
            className="bi bi-exclamation-triangle-fill text-danger"
            style={{ fontSize: 54 }}
          ></i>
          <h5 className="mb-2 mt-2 fw-bold text-danger">
            ¿Seguro que deseas eliminar este usuario?
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
      {/* MODAL CAMBIAR CONTRASEÑA */}
      <Modal
        show={showPassModal}
        onHide={() => setShowPassModal(false)}
        centered
      >
        <Modal.Body className="py-4">
          <h5 className="mb-3 fw-bold text-primary text-center">
            Cambiar contraseña
          </h5>
          <form onSubmit={handleChangePasswordSubmit}>
            <input
              className="form-control mb-3"
              type="password"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoFocus
            />
            <div className="d-flex gap-2 justify-content-center">
              <Button
                variant="secondary"
                onClick={() => setShowPassModal(false)}
              >
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Guardar
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
      {/* MODAL FEEDBACK (ÉXITO/ERROR) */}
      <Modal show={modal.show} onHide={closeModal} centered>
        <Modal.Body className="text-center py-4">
          {modal.type === "success" ? (
            <i
              className="bi bi-check-circle-fill text-success mb-3"
              style={{ fontSize: 64 }}
            ></i>
          ) : (
            <i
              className="bi bi-exclamation-triangle-fill text-danger mb-3"
              style={{ fontSize: 64 }}
            ></i>
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
      {/* Estilos responsivos en línea */}
      <style>{`
        .userspage-responsive-root .users-form-row > .col-12, 
        .userspage-responsive-root .users-form-row > .col-6 {
          margin-bottom: .75rem;
        }
        @media (max-width: 991.98px) {
          .userspage-responsive-root .users-form-row > [class^="col-"] {
            flex: 0 0 100%;
            max-width: 100%;
          }
          .userspage-responsive-root th,
          .userspage-responsive-root td {
            font-size: 1.03rem;
          }
        }
        @media (max-width: 767.98px) {
          .userspage-responsive-root .users-form-row > [class^="col-"] {
            flex: 0 0 100%;
            max-width: 100%;
          }
          .userspage-responsive-root th,
          .userspage-responsive-root td {
            font-size: .98rem;
            padding: .5rem .45rem;
          }
        }
        @media (max-width: 575.98px) {
          .userspage-responsive-root h3 {
            font-size: 1.1rem !important;
          }
          .userspage-responsive-root .table {
            font-size: .95rem;
          }
          .userspage-responsive-root .users-form-row input,
          .userspage-responsive-root .users-form-row select,
          .userspage-responsive-root .users-form-row button {
            font-size: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
