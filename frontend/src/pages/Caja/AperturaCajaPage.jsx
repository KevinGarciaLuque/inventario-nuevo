// frontend/src/pages/Caja/AperturaCajaPage.jsx
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AperturaCajaPage({ onChangePage = () => {} }) {
  const [loading, setLoading] = useState(true);
  const [abierta, setAbierta] = useState(false);
  const [caja, setCaja] = useState(null);

  const [montoApertura, setMontoApertura] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  const token = localStorage.getItem("token");

  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const cargarEstado = async () => {
    try {
      setLoading(true);
      setMsg({ type: "", text: "" });

      const res = await api.get("/caja/estado", authHeaders);

      setAbierta(res.data?.abierta === true);
      setCaja(res.data?.caja || null);
    } catch (e) {
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message ||
          e.message ||
          "Error al consultar estado.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEstado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirCaja = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    const monto = Number(montoApertura);
    if (Number.isNaN(monto) || monto < 0) {
      return setMsg({
        type: "warning",
        text: "Ingresa un monto de apertura válido.",
      });
    }

    try {
      setLoading(true);
      const res = await api.post(
        "/caja/abrir",
        { monto_apertura: monto },
        authHeaders
      );

      setMsg({ type: "success", text: "Caja abierta correctamente ✅" });
      setAbierta(true);
      setCaja(res.data?.caja || null);
      setMontoApertura("");
    } catch (e) {
      setMsg({
        type: "danger",
        text: e?.response?.data?.message || e.message || "Error al abrir caja.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning mb-0">
          No hay sesión activa. Inicia sesión nuevamente.
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Apertura de Caja</h3>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={cargarEstado}
            disabled={loading}
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => onChangePage("caja-historial")}
          >
            Historial
          </button>
        </div>
      </div>

      {msg.text ? (
        <div className={`alert alert-${msg.type}`} role="alert">
          {msg.text}
        </div>
      ) : null}

      {loading ? (
        <div className="alert alert-info">Consultando estado de caja...</div>
      ) : abierta ? (
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <h5 className="card-title mb-2">Caja actualmente abierta ✅</h5>

            <div className="row g-2">
              <div className="col-md-4">
                <div className="small text-muted">ID Caja</div>
                <div className="fw-semibold">{caja?.id ?? "-"}</div>
              </div>

              <div className="col-md-4">
                <div className="small text-muted">Fecha apertura</div>
                <div className="fw-semibold">
                  {caja?.fecha_apertura
                    ? new Date(caja.fecha_apertura).toLocaleString()
                    : "-"}
                </div>
              </div>

              <div className="col-md-4">
                <div className="small text-muted">Monto apertura</div>
                <div className="fw-semibold">
                  {Number(caja?.monto_apertura || 0).toFixed(2)}
                </div>
              </div>
            </div>

            <hr />

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onChangePage("caja-cierre")}
              >
                Ir a Cierre de Caja
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => onChangePage("ventas")}
              >
                Ir a Ventas
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={abrirCaja} className="card shadow-sm border-0">
          <div className="card-body">
            <h5 className="card-title mb-3">Abrir una nueva caja</h5>

            <div className="mb-3">
              <label className="form-label">
                Monto de apertura (efectivo inicial)
              </label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={montoApertura}
                onChange={(e) => setMontoApertura(e.target.value)}
                placeholder="0.00"
              />
              <div className="form-text">
                Este monto se sumará al efectivo esperado al cerrar.
              </div>
            </div>

            <button
              className="btn btn-success"
              type="submit"
              disabled={loading}
            >
              {loading ? "Abriendo..." : "Abrir Caja"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
