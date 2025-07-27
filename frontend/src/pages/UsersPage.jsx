import React, { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import api from "../../api/axios";
import { useUser } from "../context/UserContext";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

export default function UsersPage() {
  const { user } = useUser();
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "usuario",
  });
  const [editUser, setEditUser] = useState(null);

  // Modal de confirmación eliminar
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    userId: null,
    nombre: "",
    email: ""
  });

  // Modal feedback
  const [modal, setModal] = useState({
    show: false,
    type: "success",
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

  // Handlers
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
        message: err.response?.data?.message || "No se pudo guardar el usuario.",
      });
    }
  };

  // Editar usuario
  const handleEdit = (u) => {
    setEditUser(u);
    setForm({
      nombre: u.nombre,
      email: u.email,
      password: "",
      rol: u.rol,
    });
  };

  // Abrir modal confirmación eliminar con nombre/email
  const askDelete = (id, nombre, email) => {
    setDeleteConfirm({ show: true, userId: id, nombre, email });
  };

  // Confirmar eliminación
  const handleDelete = async () => {
    const id = deleteConfirm.userId;
    setDeleteConfirm({ show: false, userId: null, nombre: "", email: "" });
    if (!id) return;
    try {
      await api.delete(`/usuarios/${id}`);
      cargarUsuarios();
      showModal({
        type: "success",
        title: "¡Usuario eliminado!",
        message: "El usuario fue eliminado correctamente.",
      });
    } catch (e) {
      showModal({
        type: "error",
        title: "No se pudo eliminar",
        message: e?.response?.data?.message || "El usuario no pudo ser eliminado.",
      });
    }
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
          <div className="col-md-2 col-6 mx-14">
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
          <div className="col-md-1 col-6 mx-1">
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
                Cancelar
              </button>
            </div>
          )}
        </form>
      )}

      <div
        className="bg-white shadow-sm rounded mb-4"
        style={{
          maxHeight: "400px",
          height: "300px", // 🔽 Altura fija para scroll vertical
          overflowY: "auto",
          overflowX: "auto", // 🔁 Scroll horizontal para móviles
          border: "1px solid #dee2e6", // 🧱 Borde visual
        }}
      >
        <table
          className="table table-bordered align-middle mb-0 sticky-header"
          style={{ minWidth: "700px" }} // Ajusta según columnas
        >
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
            {usuarios.length > 0 ? (
              usuarios.map((u) => (
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
                  <td>{u.creado_en?.split("T")[0]}</td>
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
                          onClick={() => askDelete(u.id, u.nombre, u.email)}
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
              ))
            ) : (
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
      <ConfirmDeleteModal
        show={deleteConfirm.show}
        onHide={() =>
          setDeleteConfirm({ show: false, userId: null, nombre: "", email: "" })
        }
        onConfirm={handleDelete}
        mensaje={
          <>
            ¿Seguro que deseas eliminar el usuario{" "}
            <span className="fw-bold">{deleteConfirm.nombre}</span>
            {deleteConfirm.email && (
              <>
                <br />
                <span className="text-muted">{deleteConfirm.email}</span>
              </>
            )}
            ?
          </>
        }
        subtitulo="Esta acción no se puede deshacer."
      />

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
      {/* Estilos responsivos */}
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
