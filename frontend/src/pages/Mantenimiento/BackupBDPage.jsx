import React, { useMemo, useState } from "react";
import axios from "axios";

const BackupBDPage = () => {
  const [cargando, setCargando] = useState(false);

  const [modo, setModo] = useState("completo");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [soloEstructura, setSoloEstructura] = useState(false);

  // módulos
  const [maestras, setMaestras] = useState(true);
  const [ventas, setVentas] = useState(true);
  const [facturas, setFacturas] = useState(true);
  const [caja, setCaja] = useState(true);
  const [movimientos, setMovimientos] = useState(true);
  const [bitacora, setBitacora] = useState(false);

  const puedeDescargar = useMemo(() => {
    if (cargando) return false;
    if (modo === "completo") return true;
    return Boolean(desde && hasta && desde <= hasta);
  }, [modo, desde, hasta, cargando]);

  const descargarBackup = async () => {
    try {
      setCargando(true);

      const token = localStorage.getItem("token");

      const params = {
        modo,
        estructura: soloEstructura ? 1 : 0,
        maestras: maestras ? 1 : 0,
        ventas: ventas ? 1 : 0,
        facturas: facturas ? 1 : 0,
        caja: caja ? 1 : 0,
        movimientos: movimientos ? 1 : 0,
        bitacora: bitacora ? 1 : 0,
      };

      if (modo === "filtrado") {
        params.desde = desde;
        params.hasta = hasta;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/backup/db`,
        {
          params,
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const cd = response.headers["content-disposition"];
      let fileName = "backup.zip";
      if (cd && cd.includes("filename=")) {
        fileName = cd.split("filename=")[1].replace(/"/g, "");
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("No se pudo descargar el respaldo. Revisa permisos o servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="container py-3">
      <h4 className="mb-3">Respaldo de Base de Datos</h4>

      <div className="card shadow-sm">
        <div className="card-body">
          <p className="mb-3">
            Descarga un respaldo en <strong>.zip</strong> que contiene el
            archivo <strong>.sql</strong>.
          </p>

          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-4">
              <label className="form-label">Tipo de respaldo</label>
              <select
                className="form-select"
                value={modo}
                onChange={(e) => setModo(e.target.value)}
              >
                <option value="completo">Completo (estructura + datos)</option>
                <option value="filtrado">Filtrado por fechas</option>
              </select>
            </div>

            {modo === "filtrado" && (
              <>
                <div className="col-12 col-md-3">
                  <label className="form-label">Desde</label>
                  <input
                    type="date"
                    className="form-control"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-3">
                  <label className="form-label">Hasta</label>
                  <input
                    type="date"
                    className="form-control"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="col-12 col-md-2 d-grid">
              <button
                className="btn btn-primary"
                onClick={descargarBackup}
                disabled={!puedeDescargar}
              >
                {cargando ? "Generando..." : "Descargar"}
              </button>
            </div>
          </div>

          <hr className="my-4" />

          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="soloEstructura"
                  checked={soloEstructura}
                  onChange={(e) => setSoloEstructura(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="soloEstructura">
                  Solo estructura (sin datos)
                </label>
              </div>
              <div className="text-muted mt-1" style={{ fontSize: 13 }}>
                Útil para recrear tablas sin cargar información.
              </div>
            </div>

            <div className="col-12 col-lg-8">
              <div className="fw-semibold mb-2">Módulos a incluir</div>

              <div className="row g-2">
                <div className="col-12 col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="maestras"
                      checked={maestras}
                      onChange={(e) => setMaestras(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="maestras">
                      Catálogos (productos, clientes, impuestos, etc.)
                    </label>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="ventas"
                      checked={ventas}
                      onChange={(e) => setVentas(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="ventas">
                      Ventas + Detalle de ventas
                    </label>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="facturas"
                      checked={facturas}
                      onChange={(e) => setFacturas(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="facturas">
                      Facturas (fecha_emision)
                    </label>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="caja"
                      checked={caja}
                      onChange={(e) => setCaja(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="caja">
                      Caja (cierres_caja)
                    </label>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="movimientos"
                      checked={movimientos}
                      onChange={(e) => setMovimientos(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="movimientos">
                      Movimientos
                    </label>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="bitacora"
                      checked={bitacora}
                      onChange={(e) => setBitacora(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="bitacora">
                      Bitácora (incluye datos de bitácora)
                    </label>
                  </div>
                </div>
              </div>

              <div className="text-muted mt-2" style={{ fontSize: 13 }}>
                En modo <b>Filtrado</b>, Ventas se filtra por{" "}
                <code>ventas.fecha</code> y Facturas por{" "}
                <code>facturas.fecha_emision</code>. El detalle se incluye por{" "}
                <code>detalle_ventas.venta_id</code>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupBDPage;
