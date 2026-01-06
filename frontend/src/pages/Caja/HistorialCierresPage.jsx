// frontend/src/pages/Caja/HistorialCierresPage.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

export default function HistorialCierresPage({ onChangePage = () => {} }) {
  const [loading, setLoading] = useState(true);
  const [cierres, setCierres] = useState([]);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // filtros pro
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [estado, setEstado] = useState(""); // "" | abierta | cerrada
  const [usuarioId, setUsuarioId] = useState(""); // admin: cajero seleccionado

  // dropdown pro de cajeros (solo admin)
  const [cajeros, setCajeros] = useState([]);

  // modal detalle por fila
  const [detalle, setDetalle] = useState({ open: false, cierre: null });

  // ========================= ver facturas asociadas al cierre =========================
  const [facturasData, setFacturasData] = useState({
    loading: false,
    resumen: null,
    facturas: [],
    error: "",
  });

  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Rol desde localStorage
  const rol = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      return u?.rol || "";
    } catch {
      return "";
    }
  }, []);

  const isAdmin = rol === "admin";

  const money = (n) => Number(n || 0).toFixed(2);
  const fmtFecha = (v) => (v ? new Date(v).toLocaleString() : "-");

  // =========================
  // Cargar lista de cajeros (admin)
  // =========================
  const cargarCajeros = async () => {
    if (!isAdmin) return;

    try {
      // Debe existir GET /api/usuarios (admin) que devuelva [{id,nombre,rol,...}]
      const res = await api.get("/usuarios", authHeaders);
      const list = Array.isArray(res.data) ? res.data : [];

      // Puedes incluir admins si facturan también; si NO quieres admins, deja solo "cajero"
      const soloCajeros = list.filter(
        (u) => u.rol === "cajero" || u.rol === "admin"
      );

      setCajeros(soloCajeros);
    } catch {
      setCajeros([]);
    }
  };

  // =========================
  // Cargar historial (con filtros)
  // =========================
  const cargar = async () => {
    try {
      setLoading(true);
      setMsg({ type: "", text: "" });

      const params = new URLSearchParams();
      if (desde) params.append("desde", desde);
      if (hasta) params.append("hasta", hasta);
      if (estado) params.append("estado", estado);
      if (isAdmin && usuarioId) params.append("usuario_id", usuarioId);

      const url = `/caja/historial${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const res = await api.get(url, authHeaders);
      setCierres(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setMsg({
        type: "danger",
        text:
          e?.response?.data?.message ||
          e.message ||
          "Error al obtener historial.",
      });
      setCierres([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    cargarCajeros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const limpiarFiltros = () => {
    setDesde("");
    setHasta("");
    setEstado("");
    setUsuarioId("");
  };

  // =========================
  // Cards resumen (del resultado filtrado)
  // =========================
  const resumen = useMemo(() => {
    const base = {
      cajas: 0,
      totalVentas: 0,
      totalFacturas: 0,
      totalEfectivo: 0,
      totalTarjeta: 0,
      totalDiferencia: 0,
      totalApertura: 0,
      totalContado: 0,
    };

    if (!Array.isArray(cierres) || cierres.length === 0) return base;

    return cierres.reduce((acc, c) => {
      acc.cajas += 1;
      acc.totalVentas += Number(c.total_ventas || 0);
      acc.totalFacturas += Number(c.total_facturas || 0);

      const efectivo = Number(
        c.total_facturado_efectivo ?? c.total_efectivo ?? 0
      );
      const tarjeta = Number(c.total_facturado_tarjeta ?? c.total_tarjeta ?? 0);

      acc.totalEfectivo += efectivo;
      acc.totalTarjeta += tarjeta;
      acc.totalDiferencia += Number(c.diferencia || 0);
      acc.totalApertura += Number(c.monto_apertura || 0);
      acc.totalContado += Number(c.efectivo_contado || 0);

      return acc;
    }, base);
  }, [cierres]);

  // =========================
  // UI Helpers
  // =========================
  const badgeEstado = (estadoValue) => {
    if (estadoValue === "abierta") return "bg-warning text-dark";
    if (estadoValue === "cerrada") return "bg-success";
    return "bg-secondary";
  };

  const abrirDetalle = (c) => setDetalle({ open: true, cierre: c });
  const cerrarDetalle = () => {
    setDetalle({ open: false, cierre: null });
    setFacturasData({
      loading: false,
      resumen: null,
      facturas: [],
      error: "",
    });
  };

  const cSel = detalle.cierre;

  const cargarFacturasDeCaja = async (cierreId) => {
    if (!cierreId) return;

    try {
      setFacturasData({
        loading: true,
        resumen: null,
        facturas: [],
        error: "",
      });

      const res = await api.get(`/caja/${cierreId}/facturas`, authHeaders);

      setFacturasData({
        loading: false,
        resumen: res.data?.resumen || null,
        facturas: Array.isArray(res.data?.facturas) ? res.data.facturas : [],
        error: "",
      });
    } catch (e) {
      setFacturasData({
        loading: false,
        resumen: null,
        facturas: [],
        error:
          e?.response?.data?.message ||
          e.message ||
          "Error al cargar facturas de la caja",
      });
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
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">Historial de Cierres de Caja</h3>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => onChangePage("caja-apertura")}
          >
            Apertura
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => onChangePage("caja-cierre")}
          >
            Cierre
          </button>
        </div>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type}`} role="alert">
          {msg.text}
        </div>
      )}

      {/* ================== FILTROS PRO ================== */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-2">
              <label className="form-label">Desde</label>
              <input
                type="date"
                className="form-control"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Hasta</label>
              <input
                type="date"
                className="form-control"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="abierta">Abierta</option>
                <option value="cerrada">Cerrada</option>
              </select>
            </div>

            {isAdmin ? (
              <div className="col-md-3">
                <label className="form-label">Cajero</label>

                {cajeros.length > 0 ? (
                  <select
                    className="form-select"
                    value={usuarioId}
                    onChange={(e) => setUsuarioId(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {cajeros.map((u) => (
                      <option key={u.id} value={u.id}>
                        #{u.id} - {u.nombre} ({u.rol})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    className="form-control"
                    value={usuarioId}
                    onChange={(e) => setUsuarioId(e.target.value)}
                    placeholder="ID cajero (opcional)"
                  />
                )}
              </div>
            ) : null}

            <div
              className={`${isAdmin ? "col-md-3" : "col-md-6"} d-flex gap-2`}
            >
              <button
                type="button"
                className="btn btn-primary w-100"
                onClick={cargar}
                disabled={loading}
              >
                {loading ? "Buscando..." : "Buscar"}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={limpiarFiltros}
                disabled={loading}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================== CARDS RESUMEN ================== */}
      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small">Cajas (resultado)</div>
              <div className="fs-4 fw-bold">{resumen.cajas}</div>
              <div className="small text-muted">Filtrado actual</div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small">Total Ventas</div>
              <div className="fs-4 fw-bold">L {money(resumen.totalVentas)}</div>
              <div className="small text-muted">Suma del rango</div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small">Total Facturas</div>
              <div className="fs-4 fw-bold">
                {Number(resumen.totalFacturas || 0)}
              </div>
              <div className="small text-muted">Emitidas en el rango</div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small">Diferencia (neta)</div>
              <div
                className={`fs-4 fw-bold ${
                  Number(resumen.totalDiferencia) < 0
                    ? "text-danger"
                    : "text-success"
                }`}
              >
                L {money(resumen.totalDiferencia)}
              </div>
              <div className="small text-muted">Contado - Esperado</div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small">Efectivo / Tarjeta</div>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div>
                  <div className="small text-muted">Efectivo</div>
                  <div className="fs-5 fw-bold">
                    L {money(resumen.totalEfectivo)}
                  </div>
                </div>

                <div>
                  <div className="small text-muted">Tarjeta</div>
                  <div className="fs-5 fw-bold">
                    L {money(resumen.totalTarjeta)}
                  </div>
                </div>

                <div className="ms-auto">
                  <div className="small text-muted">Aperturas</div>
                  <div className="fs-6 fw-semibold">
                    L {money(resumen.totalApertura)}
                  </div>
                </div>

                <div>
                  <div className="small text-muted">Contado</div>
                  <div className="fs-6 fw-semibold">
                    L {money(resumen.totalContado)}
                  </div>
                </div>
              </div>

              <div className="small text-muted mt-2">
                (Estos totales salen del historial filtrado)
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small">Tips de auditoría</div>
              <ul className="mb-0 small text-muted">
                <li>Filtra por cajero para revisar descuadres por turno.</li>
                <li>Revisa “diferencia” para detectar faltantes/sobrantes.</li>
                <li>
                  Usa “observación” para justificar variaciones (retiros,
                  redondeos, etc.).
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ================== TABLA PRO (scroll + sticky header) ================== */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading ? (
            <div className="alert alert-info m-3">Cargando historial...</div>
          ) : cierres.length === 0 ? (
            <div className="alert alert-warning m-3">
              No hay cierres para mostrar.
            </div>
          ) : (
            <div
              style={{
                maxHeight: "460px",
                overflowY: "auto",
                overflowX: "auto",
              }}
            >
              <table
                className="table table-hover align-middle mb-0"
                style={{ minWidth: 1200 }}
              >
                <thead className="table-light sticky-top" style={{ zIndex: 1 }}>
                  <tr>
                    <th>ID</th>
                    <th>Cajero</th>
                    <th>Estado</th>
                    <th>Apertura</th>
                    <th>Cierre</th>
                    <th className="text-end">Apertura (L)</th>
                    <th className="text-end">Ventas (L)</th>
                    <th className="text-end">Facturas</th>
                    <th className="text-end">Efectivo (L)</th>
                    <th className="text-end">Tarjeta (L)</th>
                    <th className="text-end">Contado (L)</th>
                    <th className="text-end">Diferencia (L)</th>
                    <th style={{ minWidth: 220 }}>Observación</th>
                    <th style={{ width: 120 }}></th>
                  </tr>
                </thead>

                <tbody>
                  {cierres.map((c) => {
                    const efectivo = Number(
                      c.total_facturado_efectivo ?? c.total_efectivo ?? 0
                    );
                    const tarjeta = Number(
                      c.total_facturado_tarjeta ?? c.total_tarjeta ?? 0
                    );

                    return (
                      <tr key={c.id}>
                        <td className="fw-semibold">{c.id}</td>
                        <td>{c.cajero || c.usuario_id}</td>
                        <td>
                          <span className={`badge ${badgeEstado(c.estado)}`}>
                            {c.estado}
                          </span>
                        </td>

                        <td>{fmtFecha(c.fecha_apertura)}</td>
                        <td>{fmtFecha(c.fecha_cierre)}</td>

                        <td className="text-end">{money(c.monto_apertura)}</td>
                        <td className="text-end">{money(c.total_ventas)}</td>

                        <td className="text-end fw-semibold">
                          {Number(c.total_facturas || 0)}
                        </td>

                        <td className="text-end">{money(efectivo)}</td>
                        <td className="text-end">{money(tarjeta)}</td>

                        <td className="text-end">
                          {money(c.efectivo_contado)}
                        </td>

                        <td
                          className={`text-end fw-bold ${
                            Number(c.diferencia) < 0
                              ? "text-danger"
                              : "text-success"
                          }`}
                        >
                          {money(c.diferencia)}
                        </td>

                        <td>
                          <small className="text-muted">
                            {c.observacion ? c.observacion : "-"}
                          </small>
                        </td>

                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => {
                              abrirDetalle(c);
                              cargarFacturasDeCaja(c.id);
                            }}
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ================== MODAL DETALLE POR FILA (con facturas dentro) ================== */}
      {detalle.open && (
        <>
          {/* Backdrop */}
          <div
            onClick={cerrarDetalle}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.45)",
              backdropFilter: "blur(2px)",
              zIndex: 2059,
            }}
          />

          {/* Modal */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(980px, 94vw)",
              zIndex: 2060,
              maxHeight: "90vh",
              overflow: "hidden",
            }}
          >
            <div className="card shadow-lg border-0">
              <div className="card-header d-flex align-items-center justify-content-between">
                <div className="fw-bold">Detalle de Cierre #{cSel?.id}</div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={cerrarDetalle}
                >
                  Cerrar
                </button>
              </div>

              <div
                className="card-body"
                style={{ maxHeight: "72vh", overflowY: "auto" }}
              >
                {/* ======= Datos generales ======= */}
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="small text-muted">Cajero</div>
                    <div className="fw-semibold">
                      {cSel?.cajero || cSel?.usuario_id}
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="small text-muted">Estado</div>
                    <span className={`badge ${badgeEstado(cSel?.estado)}`}>
                      {cSel?.estado}
                    </span>
                  </div>

                  <div className="col-md-4">
                    <div className="small text-muted">ID Caja</div>
                    <div className="fw-semibold">{cSel?.id}</div>
                  </div>

                  <div className="col-md-6">
                    <div className="small text-muted">Fecha Apertura</div>
                    <div className="fw-semibold">
                      {fmtFecha(cSel?.fecha_apertura)}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="small text-muted">Fecha Cierre</div>
                    <div className="fw-semibold">
                      {fmtFecha(cSel?.fecha_cierre)}
                    </div>
                  </div>
                </div>

                <hr />

                {/* ======= Totales ======= */}
                {(() => {
                  const efectivo = Number(
                    cSel?.total_facturado_efectivo ?? cSel?.total_efectivo ?? 0
                  );
                  const tarjeta = Number(
                    cSel?.total_facturado_tarjeta ?? cSel?.total_tarjeta ?? 0
                  );

                  // si backend no envía esperado, lo calculamos
                  const esperado = Number(cSel?.monto_apertura || 0) + efectivo;

                  return (
                    <div className="row g-3">
                      <div className="col-md-3">
                        <div className="small text-muted">Monto Apertura</div>
                        <div className="fw-bold">
                          L {money(cSel?.monto_apertura)}
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="small text-muted">Total Ventas</div>
                        <div className="fw-bold">
                          L {money(cSel?.total_ventas)}
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="small text-muted">Total Facturas</div>
                        <div className="fw-bold">
                          {Number(cSel?.total_facturas || 0)}
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="small text-muted">
                          Efectivo / Tarjeta
                        </div>
                        <div className="fw-semibold">
                          L {money(efectivo)} / L {money(tarjeta)}
                        </div>
                      </div>

                      <div className="col-md-4">
                        <div className="small text-muted">Efectivo contado</div>
                        <div className="fw-bold">
                          L {money(cSel?.efectivo_contado)}
                        </div>
                      </div>

                      <div className="col-md-4">
                        <div className="small text-muted">
                          Efectivo esperado
                        </div>
                        <div className="fw-bold">L {money(esperado)}</div>
                      </div>

                      <div className="col-md-4">
                        <div className="small text-muted">Diferencia</div>
                        <div
                          className={`fw-bold ${
                            Number(cSel?.diferencia) < 0
                              ? "text-danger"
                              : "text-success"
                          }`}
                        >
                          L {money(cSel?.diferencia)}
                        </div>
                      </div>

                      <div className="col-12">
                        <div className="small text-muted">Observación</div>
                        <div className="p-2 rounded bg-light">
                          {cSel?.observacion ? cSel.observacion : "—"}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <hr />

                {/* ===================== FACTURAS ASOCIADAS ===================== */}
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <div className="fw-bold">Facturas de esta caja</div>
                    <div className="text-muted small">
                      Total, por método y detalle de cada factura
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => cargarFacturasDeCaja(cSel?.id)}
                    disabled={!cSel?.id || facturasData.loading}
                  >
                    {facturasData.loading
                      ? "Cargando..."
                      : "Actualizar facturas"}
                  </button>
                </div>

                {facturasData.error ? (
                  <div className="alert alert-danger mt-3 mb-0">
                    {facturasData.error}
                  </div>
                ) : facturasData.loading ? (
                  <div className="alert alert-info mt-3 mb-0">
                    Cargando facturas...
                  </div>
                ) : facturasData.resumen ? (
                  <>
                    {/* Cards resumen de facturas */}
                    <div className="row g-3 mt-2">
                      <div className="col-md-3">
                        <div className="card border-0 shadow-sm h-100">
                          <div className="card-body">
                            <div className="text-muted small">
                              Total facturas
                            </div>
                            <div className="fs-4 fw-bold">
                              {facturasData.resumen.total_facturas}
                            </div>
                            <div className="text-muted small">
                              Monto: L{" "}
                              {Number(
                                facturasData.resumen.total_monto || 0
                              ).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="card border-0 shadow-sm h-100">
                          <div className="card-body">
                            <div className="text-muted small">Efectivo</div>
                            <div className="fs-5 fw-bold">
                              {facturasData.resumen.facturas_efectivo}
                            </div>
                            <div className="text-muted small">
                              L{" "}
                              {Number(
                                facturasData.resumen.monto_efectivo || 0
                              ).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="card border-0 shadow-sm h-100">
                          <div className="card-body">
                            <div className="text-muted small">Tarjeta</div>
                            <div className="fs-5 fw-bold">
                              {facturasData.resumen.facturas_tarjeta}
                            </div>
                            <div className="text-muted small">
                              L{" "}
                              {Number(
                                facturasData.resumen.monto_tarjeta || 0
                              ).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="card border-0 shadow-sm h-100">
                          <div className="card-body">
                            <div className="text-muted small">Otros</div>
                            <div className="fs-5 fw-bold">
                              {facturasData.resumen.facturas_otro}
                            </div>
                            <div className="text-muted small">
                              L{" "}
                              {Number(
                                facturasData.resumen.monto_otro || 0
                              ).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tabla facturas */}
                    <div
                      className="mt-3"
                      style={{
                        maxHeight: 260,
                        overflowY: "auto",
                        overflowX: "auto",
                        border: "1px solid #e9ecef",
                        borderRadius: 10,
                      }}
                    >
                      <table
                        className="table table-sm table-hover align-middle mb-0"
                        style={{ minWidth: 900 }}
                      >
                        <thead className="table-light sticky-top">
                          <tr>
                            <th>#</th>
                            <th>Número factura</th>
                            <th>Método</th>
                            <th className="text-end">Monto (L)</th>
                            <th className="text-end">Efectivo</th>
                            <th className="text-end">Cambio</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>

                        <tbody>
                          {facturasData.facturas.length === 0 ? (
                            <tr>
                              <td
                                colSpan="7"
                                className="text-center text-muted py-3"
                              >
                                No hay facturas para esta caja.
                              </td>
                            </tr>
                          ) : (
                            facturasData.facturas.map((f, idx) => {
                              const mp = String(
                                f.metodo_pago || ""
                              ).toLowerCase();
                              const badge =
                                mp === "efectivo"
                                  ? "bg-success"
                                  : mp === "tarjeta"
                                  ? "bg-primary"
                                  : "bg-secondary";

                              const fecha = f.fecha_emision || "";


                              return (
                                <tr key={f.id ?? idx}>
                                  <td className="fw-semibold">{idx + 1}</td>
                                  <td className="fw-semibold">
                                    {f.numero_factura || "-"}
                                  </td>
                                  <td>
                                    <span className={`badge ${badge}`}>
                                      {mp || "otro"}
                                    </span>
                                  </td>
                                  <td className="text-end fw-bold">
                                    {Number(f.total_factura || 0).toFixed(2)}
                                  </td>
                                  <td className="text-end">
                                    {Number(f.efectivo || 0).toFixed(2)}
                                  </td>
                                  <td className="text-end">
                                    {Number(f.cambio || 0).toFixed(2)}
                                  </td>
                                  <td>
                                    {fecha
                                      ? new Date(fecha).toLocaleString()
                                      : "-"}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="alert alert-secondary mt-3 mb-0">
                    No hay detalle de facturas cargado.
                  </div>
                )}
              </div>

              <div className="card-footer d-flex gap-2 justify-content-end">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={cerrarDetalle}
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    cerrarDetalle();
                  }}
                >
                  Ok
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
