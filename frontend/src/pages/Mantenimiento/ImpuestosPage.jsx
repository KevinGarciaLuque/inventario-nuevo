// frontend/src/pages/Mantenimiento/ImpuestosPage.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaToggleOn,
  FaToggleOff,
  FaSave,
  FaTimes,
  FaPercent,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function ImpuestosPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  // filtros
  const [q, setQ] = useState("");
  const [soloActivos, setSoloActivos] = useState(false);

  // modal form
  const [modalForm, setModalForm] = useState({
    open: false,
    mode: "create", // create | edit
    data: { id: null, nombre: "", porcentaje: 15, descripcion: "", activo: 1 },
  });

  // modal confirm
  const [modalConfirm, setModalConfirm] = useState({
    open: false,
    title: "",
    body: "",
    actionLabel: "Confirmar",
    variant: "danger", // danger | warning | primary
    onConfirm: null,
  });

  // toast/feedback simple
  const [toast, setToast] = useState({ show: false, type: "ok", text: "" });

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => {
      setToast({ show: false, type: "ok", text: "" });
    }, 2500);
  };

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await api.get("/impuestos");
      setRows(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (e) {
      showToast("err", "No se pudieron cargar los impuestos.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const normalizar = (r) => ({
    id: r.id,
    nombre: r.nombre ?? "",
    porcentaje: Number(r.porcentaje ?? r.valor ?? 0),
    descripcion: r.descripcion ?? "",
    activo: Number(r.activo ?? 1),
    creado_en: r.creado_en ?? r.created_at ?? null,
  });

  const data = useMemo(() => rows.map(normalizar), [rows]);

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data
      .filter((r) => (soloActivos ? r.activo === 1 : true))
      .filter((r) => {
        if (!term) return true;
        return (
          r.nombre.toLowerCase().includes(term) ||
          String(r.porcentaje).includes(term) ||
          (r.descripcion || "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        // activos primero, luego por nombre
        if (a.activo !== b.activo) return b.activo - a.activo;
        return a.nombre.localeCompare(b.nombre);
      });
  }, [data, q, soloActivos]);

  const abrirCrear = () => {
    setModalForm({
      open: true,
      mode: "create",
      data: {
        id: null,
        nombre: "",
        porcentaje: 15,
        descripcion: "",
        activo: 1,
      },
    });
  };

  const abrirEditar = (r) => {
    setModalForm({
      open: true,
      mode: "edit",
      data: {
        id: r.id,
        nombre: r.nombre,
        porcentaje: r.porcentaje,
        descripcion: r.descripcion || "",
        activo: r.activo,
      },
    });
  };

  const cerrarForm = () => {
    setModalForm((m) => ({ ...m, open: false }));
  };

  const validar = (d) => {
    if (!d.nombre.trim()) return "El nombre es obligatorio.";
    const p = Number(d.porcentaje);
    if (!Number.isFinite(p) || p < 0 || p > 100)
      return "El porcentaje debe estar entre 0 y 100.";
    return null;
  };

  const guardar = async () => {
    const err = validar(modalForm.data);
    if (err) return showToast("err", err);

    try {
      const payload = {
        nombre: modalForm.data.nombre.trim(),
        porcentaje: Number(modalForm.data.porcentaje),
        descripcion: modalForm.data.descripcion?.trim() || "",
        activo: Number(modalForm.data.activo) ? 1 : 0,
      };

      if (modalForm.mode === "create") {
        await api.post("/impuestos", payload);
        showToast("ok", "Impuesto creado correctamente.");
      } else {
        await api.put(`/impuestos/${modalForm.data.id}`, payload);
        showToast("ok", "Impuesto actualizado correctamente.");
      }

      cerrarForm();
      cargar();
    } catch (e) {
      showToast("err", "No se pudo guardar el impuesto.");
      console.error(e);
    }
  };

  const cambiarEstado = (r) => {
    const nuevo = r.activo ? 0 : 1;

    setModalConfirm({
      open: true,
      title: nuevo ? "Activar impuesto" : "Desactivar impuesto",
      body: `¿Deseas ${nuevo ? "activar" : "desactivar"} "${r.nombre}"?`,
      actionLabel: nuevo ? "Activar" : "Desactivar",
      variant: nuevo ? "primary" : "warning",
      onConfirm: async () => {
        try {
          await api.patch(`/impuestos/${r.id}/estado`, { activo: nuevo });
          showToast("ok", "Estado actualizado.");
          setModalConfirm((m) => ({ ...m, open: false }));
          cargar();
        } catch (e) {
          showToast("err", "No se pudo cambiar el estado.");
          console.error(e);
        }
      },
    });
  };

  const eliminar = (r) => {
    setModalConfirm({
      open: true,
      title: "Eliminar impuesto",
      body: `Esta acción no se puede deshacer. ¿Eliminar "${r.nombre}"?`,
      actionLabel: "Eliminar",
      variant: "danger",
      onConfirm: async () => {
        try {
          await api.delete(`/impuestos/${r.id}`);
          showToast("ok", "Impuesto eliminado.");
          setModalConfirm((m) => ({ ...m, open: false }));
          cargar();
        } catch (e) {
          showToast(
            "err",
            "No se pudo eliminar. Puede estar en uso por productos."
          );
          console.error(e);
        }
      },
    });
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h4 className="mb-0 d-flex align-items-center gap-2">
            <FaPercent /> Mantenimiento de Impuestos
          </h4>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Administra tasas (15%, 18%, exento) y su disponibilidad.
          </div>
        </div>

        <button
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={abrirCrear}
        >
          <FaPlus /> Nuevo
        </button>
      </div>

      {/* Filtros */}
      <div className="card shadow-sm mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <FaSearch />
                </span>
                <input
                  className="form-control"
                  placeholder="Buscar por nombre, porcentaje o descripción..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {q && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setQ("")}
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>

            <div className="col-12 col-md-6 d-flex justify-content-md-end">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={soloActivos}
                  onChange={(e) => setSoloActivos(e.target.checked)}
                  id="soloActivosImp"
                />
                <label className="form-check-label" htmlFor="soloActivosImp">
                  Solo activos
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="table-responsive sticky-wrap">
            <table className="table table-hover align-middle mb-0 sticky-table">
              <thead className="table-blue sticky-thead">
                <tr>
                  <th style={{ width: 70 }}>Estado</th>
                  <th>Nombre</th>
                  <th style={{ width: 130 }}>Porcentaje</th>
                  <th>Descripción</th>
                  <th style={{ width: 170 }} className="text-end">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5">
                      Cargando...
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">
                      No hay registros.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span
                          className={`badge ${
                            r.activo ? "bg-success" : "bg-secondary"
                          }`}
                        >
                          {r.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="fw-semibold">{r.nombre}</td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary">
                          {Number(r.porcentaje).toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-muted">{r.descripcion || "—"}</td>

                      <td className="text-end">
                        <div className="btn-group">
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => abrirEditar(r)}
                            title="Editar"
                          >
                            <FaEdit />
                          </button>

                          <button
                            className={`btn btn-outline-${
                              r.activo ? "warning" : "success"
                            } btn-sm`}
                            onClick={() => cambiarEstado(r)}
                            title={r.activo ? "Desactivar" : "Activar"}
                          >
                            {r.activo ? <FaToggleOff /> : <FaToggleOn />}
                          </button>

                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => eliminar(r)}
                            title="Eliminar"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-muted" style={{ fontSize: 12 }}>
            Total: <b>{filtrados.length}</b>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      {modalForm.open && (
        <Modal
          onClose={cerrarForm}
          title={
            modalForm.mode === "create" ? "Nuevo impuesto" : "Editar impuesto"
          }
        >
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Nombre</label>
              <input
                className="form-control"
                value={modalForm.data.nombre}
                onChange={(e) =>
                  setModalForm((m) => ({
                    ...m,
                    data: { ...m.data, nombre: e.target.value },
                  }))
                }
                placeholder="Ej: ISV 15%"
                autoFocus
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">Porcentaje</label>
              <div className="input-group">
                <input
                  type="number"
                  className="form-control"
                  value={modalForm.data.porcentaje}
                  onChange={(e) =>
                    setModalForm((m) => ({
                      ...m,
                      data: { ...m.data, porcentaje: e.target.value },
                    }))
                  }
                  min="0"
                  max="100"
                  step="0.01"
                />
                <span className="input-group-text">%</span>
              </div>
            </div>

            <div className="col-12">
              <label className="form-label">Descripción</label>
              <textarea
                className="form-control"
                rows={2}
                value={modalForm.data.descripcion}
                onChange={(e) =>
                  setModalForm((m) => ({
                    ...m,
                    data: { ...m.data, descripcion: e.target.value },
                  }))
                }
                placeholder="Opcional..."
              />
            </div>

            <div className="col-12">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={Number(modalForm.data.activo) === 1}
                  onChange={(e) =>
                    setModalForm((m) => ({
                      ...m,
                      data: { ...m.data, activo: e.target.checked ? 1 : 0 },
                    }))
                  }
                  id="impActivo"
                />
                <label className="form-check-label" htmlFor="impActivo">
                  Activo
                </label>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button className="btn btn-outline-secondary" onClick={cerrarForm}>
              <FaTimes className="me-2" /> Cancelar
            </button>
            <button className="btn btn-primary" onClick={guardar}>
              <FaSave className="me-2" /> Guardar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Confirm */}
      {modalConfirm.open && (
        <Modal
          onClose={() => setModalConfirm((m) => ({ ...m, open: false }))}
          title={modalConfirm.title}
        >
          <p className="mb-4">{modalConfirm.body}</p>
          <div className="d-flex justify-content-end gap-2">
            <button
              className="btn btn-outline-secondary"
              onClick={() => setModalConfirm((m) => ({ ...m, open: false }))}
            >
              Cancelar
            </button>
            <button
              className={`btn btn-${modalConfirm.variant}`}
              onClick={() => modalConfirm.onConfirm?.()}
            >
              {modalConfirm.actionLabel}
            </button>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast.show && (
        <div className="toast-float">
          <div
            className={`alert ${
              toast.type === "ok" ? "alert-success" : "alert-danger"
            } d-flex align-items-center gap-2 mb-0 shadow`}
          >
            {toast.type === "ok" ? (
              <FaCheckCircle />
            ) : (
              <FaExclamationTriangle />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* estilos ERP */}
      <style>{`
        .sticky-wrap { max-height: 62vh; overflow: auto; border-radius: 10px; }
        .sticky-thead th { position: sticky; top: 0; z-index: 2; }
        .sticky-table td, .sticky-table th { white-space: nowrap; }
        .sticky-table td:nth-child(4), .sticky-table th:nth-child(4) { white-space: normal; min-width: 260px; }
        .toast-float { position: fixed; right: 18px; bottom: 18px; z-index: 3000; width: min(420px, 92vw); }
      `}</style>
    </div>
  );
}

/* =====================================================
   Modal simple (sin depender de react-bootstrap)
===================================================== */
function Modal({ title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-erp-backdrop" role="dialog" aria-modal="true">
      <div className="modal-erp" onClick={(e) => e.stopPropagation()}>
        <div className="modal-erp-header">
          <h6 className="mb-0 fw-semibold">{title}</h6>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={onClose}
          >
            <FaTimes />
          </button>
        </div>
        <div className="modal-erp-body">{children}</div>
      </div>

      <div className="modal-erp-overlay" onClick={onClose} />

      <style>{`
        .modal-erp-backdrop { position: fixed; inset: 0; z-index: 2500; display: grid; place-items: center; }
        .modal-erp-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); backdrop-filter: blur(2px); }
        .modal-erp { position: relative; z-index: 2501; width: min(760px, 94vw); background: #fff; border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,.25); overflow: hidden; }
        .modal-erp-header { display:flex; align-items:center; justify-content:space-between; padding: 14px 16px; border-bottom: 1px solid rgba(0,0,0,.08); }
        .modal-erp-body { padding: 16px; }
      `}</style>
    </div>
  );
}
