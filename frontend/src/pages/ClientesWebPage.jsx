import { useEffect, useState } from "react";
import { Badge } from "react-bootstrap";
import { BsCheckCircleFill, BsXCircleFill, BsArrowClockwise } from "react-icons/bs";
import api from "../api/axios";

const ESTADO_VARIANT = {
  nuevo: "warning",
  contactado: "success",
  descartado: "secondary",
};

export default function ClientesWebPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await api.get("/clientes-web");
      setSolicitudes(res.data);
    } catch {
      // silencioso; la tabla mostrará "No hay solicitudes"
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const cambiarEstado = async (id, estado) => {
    try {
      await api.patch(`/clientes-web/${id}/estado`, { estado });
      setSolicitudes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, estado } : s)),
      );
    } catch {
      // si falla, recargamos para reflejar el estado real
      cargar();
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Solicitudes de Clientes (Tienda Web)</h3>
        <button className="btn btn-outline-secondary btn-sm" onClick={cargar}>
          <BsArrowClockwise className="me-1" /> Actualizar
        </button>
      </div>

      <div
        className="bg-white shadow-sm rounded"
        style={{ maxHeight: 500, overflowY: "auto", overflowX: "auto" }}
      >
        <table className="table table-bordered align-middle mb-0" style={{ minWidth: 800 }}>
          <thead className="table-light sticky-top">
            <tr>
              <th>Nombre</th>
              <th>Empresa</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Ubicación</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th style={{ width: 200 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.length > 0 ? (
              solicitudes.map((s) => (
                <tr key={s.id}>
                  <td>{s.nombre}</td>
                  <td>{s.empresa || "-"}</td>
                  <td>{s.telefono}</td>
                  <td>{s.correo || "-"}</td>
                  <td>{s.ubicacion || "-"}</td>
                  <td>{new Date(s.creado_en).toLocaleDateString()}</td>
                  <td>
                    <Badge bg={ESTADO_VARIANT[s.estado] || "secondary"}>
                      {s.estado}
                    </Badge>
                  </td>
                  <td>
                    {s.estado !== "contactado" && (
                      <button
                        className="btn btn-success btn-sm me-1"
                        title="Marcar como contactado"
                        onClick={() => cambiarEstado(s.id, "contactado")}
                      >
                        <BsCheckCircleFill />
                      </button>
                    )}
                    {s.estado !== "descartado" && (
                      <button
                        className="btn btn-secondary btn-sm"
                        title="Descartar"
                        onClick={() => cambiarEstado(s.id, "descartado")}
                      >
                        <BsXCircleFill />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center text-muted">
                  {loading ? "Cargando..." : "No hay solicitudes todavía"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`.sticky-top { position: sticky; top: 0; z-index: 2; background: #f8f9fa; }`}</style>
    </div>
  );
}
