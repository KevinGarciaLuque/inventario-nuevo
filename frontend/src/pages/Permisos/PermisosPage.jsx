import { Fragment, useEffect, useMemo, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import api from "../../api/axios";
import { useUser } from "../../context/UserContext";
import { ROL_LABEL } from "../../config/modulos";

export default function PermisosPage() {
  const { user, refreshPermisos } = useUser();

  const [modulos, setModulos] = useState([]);
  const [roles, setRoles] = useState([]);
  const [matriz, setMatriz] = useState({});
  const [original, setOriginal] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingRol, setSavingRol] = useState(null);
  const [modal, setModal] = useState({ show: false, type: "success", msg: "" });

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await api.get("/permisos");
      setModulos(res.data.modulos || []);
      setRoles(res.data.roles || []);
      setMatriz(res.data.matriz || {});
      setOriginal(JSON.parse(JSON.stringify(res.data.matriz || {})));
    } catch (e) {
      setModal({
        show: true,
        type: "error",
        msg: e.response?.data?.message || "No se pudieron cargar los permisos.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  // Módulos agrupados por su "grupo" del sidebar
  const grupos = useMemo(() => {
    const map = new Map();
    for (const m of modulos) {
      if (!map.has(m.grupo)) map.set(m.grupo, []);
      map.get(m.grupo).push(m);
    }
    return Array.from(map.entries());
  }, [modulos]);

  const toggle = (rol, key) => {
    setMatriz((prev) => ({
      ...prev,
      [rol]: { ...prev[rol], [key]: !prev[rol]?.[key] },
    }));
  };

  const rolDirty = (rol) =>
    JSON.stringify(matriz[rol]) !== JSON.stringify(original[rol]);

  const guardar = async (rol) => {
    setSavingRol(rol);
    try {
      await api.put(`/permisos/${rol}`, { modulos: matriz[rol] });
      setOriginal((prev) => ({
        ...prev,
        [rol]: JSON.parse(JSON.stringify(matriz[rol])),
      }));
      // Si el rol editado es el del usuario actual, refrescar su menú
      if (user?.rol === rol) refreshPermisos();
      setModal({
        show: true,
        type: "success",
        msg: `Permisos de "${ROL_LABEL[rol] || rol}" actualizados.`,
      });
    } catch (e) {
      setModal({
        show: true,
        type: "error",
        msg: e.response?.data?.message || "No se pudieron guardar los permisos.",
      });
    } finally {
      setSavingRol(null);
    }
  };

  if (user?.rol !== "superadmin") {
    return (
      <div className="text-center py-5">
        <i className="bi bi-shield-lock-fill text-warning" style={{ fontSize: 56 }} />
        <h5 className="mt-3">Solo el superadministrador puede gestionar permisos.</h5>
      </div>
    );
  }

  return (
    <div className="container py-3">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="mb-1">Permisos por rol</h3>
          <p className="text-muted mb-0">
            Activa o desactiva el acceso de cada rol a los módulos del sistema. El
            superadministrador siempre tiene acceso total.
          </p>
        </div>
        <button className="btn btn-outline-secondary" onClick={cargar} disabled={loading}>
          <i className="bi bi-arrow-clockwise me-1" /> Recargar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-warning" role="status" />
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ minWidth: 220 }}>Módulo</th>
                {roles.map((r) => (
                  <th key={r} className="text-center">
                    {ROL_LABEL[r] || r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grupos.map(([grupo, items]) => (
                <Fragment key={`g-${grupo}`}>
                  <tr className="table-secondary">
                    <td colSpan={roles.length + 1} className="fw-bold small text-uppercase">
                      {grupo}
                    </td>
                  </tr>
                  {items.map((m) => (
                    <tr key={m.key}>
                      <td>{m.label}</td>
                      {roles.map((r) => (
                        <td key={r} className="text-center">
                          <div className="form-check form-switch d-flex justify-content-center m-0">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              role="switch"
                              style={{ cursor: "pointer" }}
                              checked={!!matriz[r]?.[m.key]}
                              onChange={() => toggle(r, m.key)}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && (
        <div className="d-flex gap-2 flex-wrap mt-3">
          {roles.map((r) => (
            <button
              key={r}
              className="btn btn-success"
              disabled={!rolDirty(r) || savingRol === r}
              onClick={() => guardar(r)}
            >
              {savingRol === r ? (
                <span className="spinner-border spinner-border-sm me-1" />
              ) : (
                <i className="bi bi-save me-1" />
              )}
              Guardar {ROL_LABEL[r] || r}
            </button>
          ))}
        </div>
      )}

      <Modal show={modal.show} onHide={() => setModal((m) => ({ ...m, show: false }))} centered>
        <Modal.Body className="text-center py-4">
          <i
            className={`bi mb-3 ${
              modal.type === "success"
                ? "bi-check-circle-fill text-success"
                : "bi-exclamation-triangle-fill text-danger"
            }`}
            style={{ fontSize: 56 }}
          />
          <div className="mb-3">{modal.msg}</div>
          <Button
            variant={modal.type === "success" ? "success" : "danger"}
            onClick={() => setModal((m) => ({ ...m, show: false }))}
          >
            Cerrar
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  );
}
