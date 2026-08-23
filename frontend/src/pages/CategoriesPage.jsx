import { useEffect, useMemo, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import {
  BsChevronRight,
  BsCheckCircleFill,
  BsExclamationTriangleFill,
  BsPencilSquare,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import api from "../api/axios";
import { useUser } from "../context/UserContext"; // Ajusta según tu contexto de usuario

const NIVELES_MAX = 3;

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
  const isAdmin = user?.rol === "admin";
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

  // Índice: id de padre -> lista de hijos (ordenados alfabéticamente)
  const childrenMap = useMemo(() => {
    const map = {};
    categorias.forEach((c) => {
      if (c.categoria_padre_id) {
        (map[c.categoria_padre_id] ||= []).push(c);
      }
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.nombre.localeCompare(b.nombre)),
    );
    return map;
  }, [categorias]);

  // Categorías principales (las más nuevas primero)
  const principales = useMemo(
    () =>
      categorias
        .filter((c) => !c.categoria_padre_id)
        .sort((a, b) => b.id - a.id),
    [categorias],
  );

  // Nivel de cada categoría (1 = principal, 2 = subcategoría, 3 = sub-subcategoría)
  const depthMap = useMemo(() => {
    const map = {};
    const getDepth = (id, seen = new Set()) => {
      if (map[id] != null) return map[id];
      if (seen.has(id)) return (map[id] = 1); // corta ciclos accidentales
      const cat = categorias.find((c) => c.id === id);
      if (!cat || !cat.categoria_padre_id) return (map[id] = 1);
      seen.add(id);
      return (map[id] = getDepth(cat.categoria_padre_id, seen) + 1);
    };
    categorias.forEach((c) => getDepth(c.id));
    return map;
  }, [categorias]);

  // Ids de todos los descendientes de una categoría (para no permitir que se
  // reasigne a sí misma como su propio nieto al editar el padre)
  const getDescendantIds = (id) => {
    const result = [];
    const walk = (pid) => {
      (childrenMap[pid] || []).forEach((hijo) => {
        result.push(hijo.id);
        walk(hijo.id);
      });
    };
    walk(id);
    return result;
  };

  // Ruta completa para mostrar en el selector de "categoría padre"
  const breadcrumb = (cat) => {
    const partes = [cat.nombre];
    let actual = cat;
    while (actual?.categoria_padre_id) {
      const padre = categorias.find((c) => c.id === actual.categoria_padre_id);
      if (!padre) break;
      partes.unshift(padre.nombre);
      actual = padre;
    }
    return partes.join(" › ");
  };

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

  // Agregar subcategoría (o sub-subcategoría) dentro de un nodo ya expandido
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

  // Opciones válidas para "categoría padre" al editar: nada por debajo del
  // nivel 2 (para que el resultado no pase de 3 niveles), y ni la categoría
  // misma ni ninguno de sus propios descendientes (evita ciclos).
  const opcionesPadreParaEdicion = useMemo(() => {
    if (!editId) return [];
    const descendientes = getDescendantIds(editId);
    return categorias
      .filter((cat) => cat.id !== editId)
      .filter((cat) => !descendientes.includes(cat.id))
      .filter((cat) => (depthMap[cat.id] || 1) < NIVELES_MAX)
      .sort((a, b) => breadcrumb(a).localeCompare(breadcrumb(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorias, editId, depthMap, childrenMap]);

  // Renderiza una categoría y, recursivamente, sus hijos (hasta 3 niveles).
  // Estilo "árbol de archivos": cada nivel anidado dentro de un contenedor
  // con guía vertical (border-left), en vez de una fila de tabla con "└─".
  const renderNodo = (nodo, nivel) => {
    const hijos = childrenMap[nodo.id] || [];
    const expanded = expandedIds.has(nodo.id);
    const puedeExpandir = hijos.length > 0 || (isAdmin && nivel < NIVELES_MAX);

    return (
      <div key={nodo.id} className={`cat-node cat-node--lvl${nivel}`}>
        <div
          className={`cat-row ${puedeExpandir ? "cat-row--clickable" : ""}`}
          role={puedeExpandir ? "button" : undefined}
          onClick={puedeExpandir ? () => toggleExpand(nodo.id) : undefined}
        >
          <div className="cat-row__main">
            <span className={`cat-chevron ${expanded ? "cat-chevron--open" : ""}`}>
              {puedeExpandir && <BsChevronRight />}
            </span>
            <span className="cat-row__nombre">{nodo.nombre}</span>
            {hijos.length > 0 && (
              <span className="cat-row__count">{hijos.length}</span>
            )}
            {nodo.descripcion && (
              <span className="cat-row__desc">{nodo.descripcion}</span>
            )}
          </div>

          {isAdmin && (
            <div className="cat-row__actions" onClick={(e) => e.stopPropagation()}>
              {nivel < NIVELES_MAX && (
                <button
                  className="btn btn-outline-success btn-sm"
                  onClick={() => expandirParaSubcategoria(nodo.id)}
                  title="Agregar subcategoría"
                >
                  <BsPlusCircle />
                </button>
              )}
              <button
                className="btn btn-warning btn-sm"
                onClick={() => openEdit(nodo)}
                title="Editar"
              >
                <BsPencilSquare />
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDeleteClick(nodo.id)}
                title="Eliminar"
              >
                <BsTrash />
              </button>
            </div>
          )}
        </div>

        {expanded && (
          <div className="cat-children">
            {hijos.map((hijo) => renderNodo(hijo, nivel + 1))}

            {isAdmin && nivel < NIVELES_MAX && (
              <div className="cat-quickadd">
                <SubcategoriaQuickAdd
                  onAdd={(n, d) => handleAddSubcategoriaInline(nodo, n, d)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container-fluid px-2 px-md-4 py-3 py-md-4">
      <h3 className="mb-3">Categorías</h3>

      {/* FORMULARIO: solo agrega categorías principales (las subcategorías
          y sub-subcategorías se agregan expandiendo el nodo en la tabla) */}
      {isAdmin && (
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

      {/* ÁRBOL DE CATEGORÍAS */}
      <div className="cat-tree-card mb-4">
        {principales.length > 0 ? (
          principales.map((p) => renderNodo(p, 1))
        ) : (
          <div className="text-center text-muted py-4">
            {loading ? "Cargando..." : "No hay categorías"}
          </div>
        )}
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
                      {opcionesPadreParaEdicion.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          Subcategoría de: {breadcrumb(cat)}
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

      {/* ESTILOS DEL ÁRBOL Y RESPONSIVOS */}
      <style>{`
        .cat-tree-card {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 14px;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
          padding: 0.4rem 0.6rem;
        }

        .cat-node--lvl1 {
          border-top: 1px solid #f1f3f5;
        }
        .cat-node--lvl1:first-child {
          border-top: none;
        }

        .cat-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.65rem 0.5rem;
          border-radius: 8px;
        }
        .cat-node--lvl1 > .cat-row {
          padding: 0.75rem 0.5rem;
        }
        .cat-row--clickable {
          cursor: pointer;
          user-select: none;
        }
        .cat-row--clickable:hover {
          background: #f8f9fa;
        }

        .cat-row__main {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          min-width: 0;
          flex: 1;
        }

        .cat-chevron {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.1rem;
          flex-shrink: 0;
          color: #868e96;
          transition: transform 0.18s ease;
        }
        .cat-chevron--open {
          transform: rotate(90deg);
        }

        .cat-node--lvl1 .cat-row__nombre {
          font-weight: 700;
          font-size: 0.98rem;
          color: #212529;
        }
        .cat-node--lvl2 .cat-row__nombre {
          font-weight: 600;
          font-size: 0.9rem;
          color: #343a40;
        }
        .cat-node--lvl3 .cat-row__nombre {
          font-weight: 500;
          font-size: 0.87rem;
          color: #495057;
        }

        .cat-row__count {
          font-size: 0.72rem;
          font-weight: 700;
          color: #868e96;
          background: #f1f3f5;
          border-radius: 999px;
          padding: 0.1rem 0.5rem;
          flex-shrink: 0;
        }

        .cat-row__desc {
          font-size: 0.8rem;
          color: #adb5bd;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }

        .cat-row__actions {
          display: flex;
          gap: 0.35rem;
          flex-shrink: 0;
        }
        .cat-row__actions .btn {
          border-radius: 8px;
        }

        /* Guía vertical de anidación, como un árbol de archivos */
        .cat-children {
          margin-left: 1.05rem;
          padding-left: 0.85rem;
          border-left: 2px solid #eef0f2;
        }

        .cat-quickadd {
          padding: 0.5rem 0.5rem 0.65rem;
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
          .cat-row__desc {
            display: none;
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
