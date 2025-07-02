import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { FaSearch, FaFilter, FaRedo } from "react-icons/fa";

export default function BitacoraPage() {
  const [registros, setRegistros] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [usuarioFiltro, setUsuarioFiltro] = useState("");
  const [accionFiltro, setAccionFiltro] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBitacora = async () => {
      setLoading(true);
      try {
        const [bitacoraRes, usuariosRes] = await Promise.all([
          api.get("/bitacora"),
          api.get("/usuarios"),
        ]);
        setRegistros(bitacoraRes.data);
        setUsuarios(usuariosRes.data);
      } catch {
        alert("No se pudo cargar la bitácora");
      }
      setLoading(false);
    };
    fetchBitacora();
  }, []);

  const filtrados = registros.filter((r) => {
    const cumpleBusqueda =
      busqueda === "" ||
      r.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.accion.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleUsuario =
      usuarioFiltro === "" || String(r.usuario_id) === usuarioFiltro;
    const cumpleAccion = accionFiltro === "" || r.accion === accionFiltro;
    return cumpleBusqueda && cumpleUsuario && cumpleAccion;
  });

  const accionesUnicas = [
    ...new Set(registros.map((r) => r.accion).filter(Boolean)),
  ];

  const nombreUsuario = (id) =>
    usuarios.find((u) => u.id === id)?.nombre || "Desconocido";

  return (
    <div className="container py-4">
      {/* Filtros */}
      <div className="bitacora-filtros d-flex flex-wrap align-items-center mb-4 gap-2">
        <h2 className="mb-0 me-auto bitacora-title">
          <FaFilter className="text-warning me-2" />
          Bitácora del Sistema
        </h2>
        <div className="input-group filtro-input-search mt-2 w-0">
          <span className="input-group-text bg-white border-end-0">
            <FaSearch className="text-muted" />
          </span>
          <input
            className="form-control border-start-0 "
            placeholder="Buscar acción o detalle..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select
          className="form-select filtro-select w-50"
          value={usuarioFiltro}
          onChange={(e) => setUsuarioFiltro(e.target.value)}
        >
          <option value="">Todos los usuarios</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
        <select
          className="form-select filtro-select w-50 "
          value={accionFiltro}
          onChange={(e) => setAccionFiltro(e.target.value)}
        >
          <option value="">Todas las acciones</option>
          {accionesUnicas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button
          className="btn btn-outline-secondary"
          onClick={() => {
            setBusqueda("");
            setUsuarioFiltro("");
            setAccionFiltro("");
          }}
          title="Limpiar filtros"
        >
          <FaRedo />
        </button>
      </div>

      {/* Tabla con scroll y sticky header */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div
            className="table-responsive"
            style={{
              maxHeight: "350px",
              overflowY: "auto",
              overflowX: "auto",
            }}
          >
            <table className="table table-bordered table-hover align-middle mb-0 bitacora-table">
              <thead
                className="table-light"
                style={{ position: "sticky", top: 0, zIndex: 2 }}
              >
                <tr>
                  <th style={{ width: 120, background: "#fff" }}>Fecha</th>
                  <th style={{ width: 140, background: "#fff" }}>Usuario</th>
                  <th style={{ width: 180, background: "#fff" }}>Acción</th>
                  <th style={{ background: "#fff" }}>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-5">
                      <span className="spinner-border text-warning me-2"></span>
                      Cargando...
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">
                      No hay registros para mostrar
                    </td>
                  </tr>
                ) : (
                  filtrados.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {new Date(r.fecha).toLocaleString("es-HN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        <span className="badge bg-primary bg-opacity-25 text-primary px-3 py-2">
                          <i className="bi bi-person-circle me-1"></i>
                          {nombreUsuario(r.usuario_id)}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-warning bg-opacity-25 text-warning px-3 py-2">
                          <i className="bi bi-activity me-1"></i>
                          {r.accion}
                        </span>
                      </td>
                      <td style={{ wordBreak: "break-word" }}>
                        {r.descripcion}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Estilos responsivos y sticky header */}
      <style>{`
        /* Filtros adaptativos */
        @media (max-width: 991.98px) {
          .bitacora-filtros {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.7rem !important;
          }
          .bitacora-title {
            margin-bottom: 0.2rem !important;
            font-size: 1.2rem !important;
          }
        }
        @media (max-width: 575.98px) {
          .filtro-input-search, .filtro-select {
            width: 100% !important;
            max-width: 100% !important;
          }
          .bitacora-title {
            font-size: 1.03rem !important;
          }
        }
        /* Tabla: celdas pequeñas y scroll en móvil */
        @media (max-width: 575.98px) {
          .bitacora-table th, .bitacora-table td {
            font-size: 0.93rem !important;
            padding: 0.38rem 0.5rem !important;
            min-width: 84px;
            vertical-align: middle;
          }
          .bitacora-table td {
            word-break: break-word;
            white-space: pre-line;
          }
        }
        /* Sticky header */
        .bitacora-table thead th {
          position: sticky !important;
          top: 0;
          z-index: 2;
          background: #fff !important;
        }
      `}</style>
    </div>
  );
}
