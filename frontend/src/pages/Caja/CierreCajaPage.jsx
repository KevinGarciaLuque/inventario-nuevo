// frontend/src/pages/Caja/CierreCajaPage.jsx
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function CierreCajaPage({ onChangePage = () => {} }) {
  const [loading, setLoading] = useState(true);
  const [abierta, setAbierta] = useState(false);
  const [caja, setCaja] = useState(null);

  const [efectivoContado, setEfectivoContado] = useState("");
  const [observacion, setObservacion] = useState("");
  const [resultado, setResultado] = useState(null);

  const [msg, setMsg] = useState({ type: "", text: "" });

  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const cargarEstado = async () => {
    try {
      setLoading(true);
      setMsg({ type: "", text: "" });

      const res = await api.get("/caja/estado", authHeaders);

      setAbierta(res.data?.abierta === true);
      setCaja(res.data?.caja || null);

      if (res.data?.abierta !== true) {
        setMsg({
          type: "warning",
          text: "No tienes una caja abierta. Primero ábrela.",
        });
      }
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

  const cerrarCaja = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    setResultado(null);

    const efectivo = Number(efectivoContado);
    if (Number.isNaN(efectivo) || efectivo < 0) {
      return setMsg({
        type: "warning",
        text: "Ingresa el efectivo contado correctamente.",
      });
    }

    try {
      setLoading(true);
      const res = await api.post(
        "/caja/cerrar",
        { efectivo_contado: efectivo, observacion },
        authHeaders
      );

      setResultado(res.data?.caja || null);
      setMsg({ type: "success", text: "Caja cerrada correctamente ✅" });

      // refrescar estado visual
      setAbierta(false);
      setCaja(null);
      setEfectivoContado("");
      setObservacion("");
    } catch (e) {
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message || e.message || "Error al cerrar caja.",
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
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">Cierre de Caja</h3>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={cargarEstado}
            disabled={loading}
          >
            {loading ? "Cargando..." : "Actualizar"}
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
        <div className="alert alert-info">Consultando caja...</div>
      ) : !abierta ? (
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <h5 className="mb-2">No hay caja abierta</h5>
            <p className="text-muted mb-3">
              Para cerrar caja, primero debes abrir una caja.
            </p>

            <button
              type="button"
              className="btn btn-success"
              onClick={() => onChangePage("caja-apertura")}
            >
              Ir a Apertura
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card shadow-sm border-0 mb-3">
            <div className="card-body">
              <h5 className="card-title mb-2">Caja abierta ✅</h5>

              <div className="row g-2">
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

                <div className="col-md-4">
                  <div className="small text-muted">ID</div>
                  <div className="fw-semibold">{caja?.id ?? "-"}</div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={cerrarCaja} className="card shadow-sm border-0">
            <div className="card-body">
              <h5 className="card-title mb-3">Registrar cierre</h5>

              <div className="mb-3">
                <label className="form-label">
                  Efectivo contado (al cierre)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={efectivoContado}
                  onChange={(e) => setEfectivoContado(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Observación (opcional)</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Notas del cierre..."
                />
              </div>

              <button
                className="btn btn-danger"
                type="submit"
                disabled={loading}
              >
                {loading ? "Cerrando..." : "Cerrar Caja"}
              </button>
            </div>
          </form>

          {resultado ? (
            <div className="card shadow-sm border-0 mt-3">
              <div className="card-body">
                <h5 className="mb-3">Resumen del cierre</h5>

                <div className="row g-2">
                  <div className="col-md-3">
                    <div className="small text-muted">Total ventas</div>
                    <div className="fw-semibold">
                      {Number(resultado.total_ventas || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="small text-muted">
                      Total efectivo (sistema)
                    </div>
                    <div className="fw-semibold">
                      {Number(resultado.total_efectivo || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="small text-muted">
                      Total tarjeta (sistema)
                    </div>
                    <div className="fw-semibold">
                      {Number(resultado.total_tarjeta || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="small text-muted">Efectivo esperado</div>
                    <div className="fw-semibold">
                      {Number(resultado.esperado_efectivo || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <hr />

                <div className="row g-2">
                  <div className="col-md-4">
                    <div className="small text-muted">Efectivo contado</div>
                    <div className="fw-semibold">
                      {Number(resultado.efectivo_contado || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="small text-muted">Diferencia</div>
                    <div
                      className={`fw-bold ${
                        Number(resultado.diferencia) < 0
                          ? "text-danger"
                          : "text-success"
                      }`}
                    >
                      {Number(resultado.diferencia || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => onChangePage("caja-historial")}
                  >
                    Ver historial
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => onChangePage("ventas")}
                  >
                    Ir a ventas
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
