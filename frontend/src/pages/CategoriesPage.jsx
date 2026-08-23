import { Fragment, useEffect, useMemo, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import {
  BsChevronDown,
  BsChevronRight,
  BsCheckCircleFill,
  BsExclamationTriangleFill,
  BsPencilSquare,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import api from "../api/axios";
import { useUser } from "../context/UserContext"; // Ajusta según tu contexto de usuario

// Mini formulario, con su propio estado, para agregar una subcategoría
// directamente dentro de la categoría padre ya expandida.
function SubcategoriaQuickAdd({ onAdd }) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    await onAdd(nombre.trim(), descripcion.trim());
    setNombre("");
    setDescripcion("");
    setSaving(false);
  };

  return (
    <form
      onSubmit={submit}
      className="d-flex flex-wrap gap-2 align-items-center subcategoria-quick-add"
    >
      <input
        className="form-control form-control-sm"
        style={{ maxWidth: 220 }}
        placeholder="Nombre de la subcategoría"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
      />
      <input
        className="form-control form-control-sm"
        style={{ maxWidth: 260 }}
        placeholder="Descripción (opcional)"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
      />
      <button
        className="btn btn-success btn-sm"
        type="submit"
        disabled={saving}
      >
        {saving ? "Agregando..." : "Agregar subcategoría"}
      </button>
    </form>
  );
}

export default function CategoriesPage() {
  const { user } = useUser(); // Accede al usuario actual y su rol
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Para edición
  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editPadreId, setEditPadreId] = useState("");
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

  // Cargar categorías
  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const res = await api.get("/categorias");
      setCategorias(res.data);
    } catch {
      showModal({
        type: "error",
        title: "Error al cargar",
        message: "No se pudieron cargar las categorías.",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  // Categorías de nivel superior (las únicas que pueden usarse como "padre")
  const categoriasPadre = useMemo(
    () => categorias.filter((c) => !c.categoria_padre_id),
    [categorias],
  );

  // Árbol: categorías principales (las más nuevas primero) + sus subcategorías
  const arbol = useMemo(() => {
    const porPadre = {};
    categorias.forEach((c) => {
      if (c.categoria_padre_id) {
        (porPadre[c.categoria_padre_id] ||= []).push(c);
      }
    });
    Object.values(porPadre).forEach((arr) =>
      arr.sort((a, b) => a.nombre.localeCompare(b.nombre)),
    );

    const principales = [...categoriasPadre].sort((a, b) => b.id - a.id);

    return principales.map((padre) => ({
      ...padre,
      subcategorias: porPadre[padre.id] || [],
    }));
  }, [categorias, categoriasPadre]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandirParaSubcategoria = (id) => {
    setExpandedIds((prev) => new Set(prev).add(id));
  };

  // Agregar categoría principal
  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post("/categorias", {
        nombre,
        descripcion,
        categoria_padre_id: null,
      });
      setNombre("");
      setDescripcion("");
      await cargarCategorias();
      showModal({
        type: "success",
        title: "¡Categoría agregada!",
        message: "Se registró correctamente y aparece primero en la lista.",
      });
    } catch {
      showModal({
        type: "error",
        title: "Error",
        message: "No se pudo agregar la categoría.",
      });
    }
  };

  // Agregar subcategoría dentro de una categoría padre ya expandida
  const handleAddSubcategoriaInline = async (padre, nombreSub, descripcionSub) => {
    try {
      await api.post("/categorias", {
        nombre: nombreSub,
        descripcion: descripcionSub,
        categoria_padre_id: padre.id,
      });
      await cargarCategorias();
      showModal({
        type: "success",
        title: "¡Subcategoría agregada!",
        message: `Se agregó dentro de "${padre.nombre}".`,
      });
    } catch {
      showModal({
        type: "error",
        title: "Error",
        message: "No se pudo agregar la subcategoría.",
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
      await api.delete(`/categorias/${idToDelete}`);
      await cargarCategorias();
      showModal({
        type: "success",
        title: "¡Categoría eliminada!",
        message: "La categoría fue eliminada correctamente.",
      });
    } catch (e) {
      showModal({
        type: "error",
        title: "No se pudo eliminar",
        message:
          e?.response?.data?.message ||
          "La categoría está en uso o ha ocurrido un error.",
      });
    }
    setShowConfirm(false);
    setIdToDelete(null);
  };

  // Abrir modal de edición
  const openEdit = (cat) => {
    setEditId(cat.id);
    setEditNombre(cat.nombre);
    setEditDescripcion(cat.descripcion || "");
    setEditPadreId(cat.categoria_padre_id ? String(cat.categoria_padre_id) : "");
    setShowEdit(true);
  };

  // Guardar edición
  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/categorias/${editId}`, {
        nombre: editNombre,
        descripcion: editDescripcion,
        categoria_padre_id: editPadreId || null,
      });
      setShowEdit(false);
      setEditId(null);
      await cargarCategorias();
      showModal({
        type: "success",
        title: "¡Categoría editada!",
        message: "La categoría fue actualizada correctamente.",
      });
    } catch {
      showModal({
        type: "error",
        title: "Error al editar",
        message: "No se pudo editar la categoría.",
      });
    }
  };

  return (
    <div className="container-fluid px-2 px-md-4 py-3 py-md-4">
      <h3 className="mb-3">Categorías</h3>

      {/* FORMULARIO: solo agrega categorías principales (las subcategorías
          se agregan expandiendo la categoría padre en la tabla) */}
      {user?.rol === "admin" && (
        <form onSubmit={handleAdd} className="mb-3 row g-2 categories-form">
          <div className="col-md-4 col-12">
            <input
              className="form-control"
              placeholder="Nombre de la categoría principal"
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
              {loading ? "Guardando..." : "Agregar categoría"}
            </button>
          </div>
        </form>
      )}

      {/* TABLA RESPONSIVA */}
      <div className="bg-white shadow-sm rounded mb-4 border">
        <div className="table-responsive">
          <table className="table table-bordered align-middle categories-table sticky-header mb-0">
            <thead className="table-light sticky-top">
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th style={{ width: 170 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {arbol.length > 0 ? (
                arbol.map((padre) => {
                  const expanded = expandedIds.has(padre.id);
                  return (
                    <Fragment key={padre.id}>
                      <tr>
                        <td>
                          <span
                            className="categories-row categories-row--parent"
                            role="button"
                            onClick={() => toggleExpand(padre.id)}
                          >
                            {expanded ? (
                              <BsChevronDown className="categories-chevron" />
                            ) : (
                              <BsChevronRight className="categories-chevron" />
                            )}
                            {padre.nombre}
                            {padre.subcategorias.length > 0 && (
                              <span className="badge rounded-pill bg-light text-secondary border ms-1">
                                {padre.subcategorias.length}
                              </span>
                            )}
                          </span>
                        </td>
                        <td style={{ wordBreak: "break-word" }}>
                          {padre.descripcion}
                        </td>
                        <td>
                          {user?.rol === "admin" && (
                            <>
                              <button
                                className="btn btn-outline-success btn-sm me-1"
                                style={{ borderRadius: 8 }}
                                onClick={() => expandirParaSubcategoria(padre.id)}
                                title="Agregar subcategoría"
                              >
                                <BsPlusCircle />
                              </button>
                              <button
                                className="btn btn-warning btn-sm me-1"
                                style={{ borderRadius: 8 }}
                                onClick={() => openEdit(padre)}
                                title="Editar"
                              >
                                <BsPencilSquare />
                              </button>
                              <button
                                className="btn btn-danger btn-sm me-1"
                                style={{ borderRadius: 8 }}
                                onClick={() => handleDeleteClick(padre.id)}
                                title="Eliminar"
                              >
                                <BsTrash />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>

                      {expanded &&
                        padre.subcategorias.map((hijo) => (
                          <tr key={hijo.id} className="categories-subrow">
                            <td>
                              <span className="categories-row categories-row--child">
                                <span className="categories-tree-branch">
                                  └─
                                </span>
                                {hijo.nombre}
                              </span>
                            </td>
                            <td style={{ wordBreak: "break-word" }}>
                              {hijo.descripcion}
                            </td>
                            <td>
                              {user?.rol === "admin" && (
                                <>
                                  <button
                                    className="btn btn-warning btn-sm me-1"
                                    style={{ borderRadius: 8 }}
                                    onClick={() => openEdit(hijo)}
                                    title="Editar"
                                  >
                                    <BsPencilSquare />
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm me-1"
                                    style={{ borderRadius: 8 }}
                                    onClick={() => handleDeleteClick(hijo.id)}
                                    title="Eliminar"
                                  >
                                    <BsTrash />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}

                      {expanded && user?.rol === "admin" && (
                        <tr className="categories-subrow categories-subrow--form">
                          <td colSpan={3}>
                            <SubcategoriaQuickAdd
                              onAdd={(n, d) =>
                                handleAddSubcategoriaInline(padre, n, d)
                              }
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="text-center text-muted">
                    {loading ? "Cargando..." : "No hay categorías"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDICIÓN RESPONSIVO */}
      {showEdit && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <div className="modal-dialog modal-dialog-centered categories-modal">
            <div className="modal-content">
              <form onSubmit={handleEdit}>
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    <BsPencilSquare className="me-2" />
                    Editar Categoría
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
                  <div className="mb-3">
                    <label className="form-label">Categoría padre</label>
                    <select
                      className="form-select"
                      value={editPadreId}
                      onChange={(e) => setEditPadreId(e.target.value)}
                    >
                      <option value="">Categoría principal (sin padre)</option>
                      {categoriasPadre
                        .filter((cat) => cat.id !== editId)
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            Subcategoría de: {cat.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer bg-light flex-column flex-sm-row gap-2">
                  <button
                    type="button"
                    className="btn btn-danger w-100 w-sm-auto"
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
            ¿Seguro que deseas eliminar esta categoría?
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
        .categories-row--parent {
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          cursor: pointer;
          user-select: none;
        }
        .categories-row--parent:hover {
          color: #0d6efd;
        }
        .categories-chevron {
          color: #6c757d;
          flex-shrink: 0;
        }
        .categories-row--child {
          padding-left: 1.5rem;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: #495057;
        }
        .categories-tree-branch {
          color: #adb5bd;
          font-weight: 400;
        }
        .categories-subrow {
          background: #fbfbfd;
        }
        .categories-subrow--form td {
          padding-left: 1.5rem;
        }

        /* Formulario responsivo */
        @media (max-width: 991.98px) {
          .categories-form > div {
            margin-bottom: 0.5rem !important;
          }
        }
        @media (max-width: 767.98px) {
          .categories-form > div {
            width: 100% !important;
            max-width: 100% !important;
            flex: 0 0 100% !important;
          }
        }
        /* Tabla responsiva */
        @media (max-width: 575.98px) {
          .categories-table th,
          .categories-table td {
            font-size: 0.99rem !important;
            padding: 0.34rem 0.45rem !important;
            vertical-align: middle;
          }
          .categories-table th {
            min-width: 75px;
          }
        }
        /* Modal edición responsivo */
        @media (max-width: 575.98px) {
          .categories-modal {
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
