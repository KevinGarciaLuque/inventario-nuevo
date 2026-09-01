import { useState } from "react";
import { Badge, Button, Collapse } from "react-bootstrap";
import { FaPause, FaPlay, FaTrashAlt, FaChevronDown } from "react-icons/fa";

const money = (n) =>
  `L ${Number(n || 0).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const hora = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString("es-HN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export default function VentasEnEspera({
  ventasEnEspera = [],
  hayCarrito = false,
  onGuardar,
  onRecuperar,
  onDescartar,
}) {
  const [abierto, setAbierto] = useState(true);
  const tiene = ventasEnEspera.length > 0;

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body py-2 px-3">
        <div className="d-flex align-items-center flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline-warning"
            onClick={onGuardar}
            disabled={!hayCarrito}
            title="Aparca esta venta y limpia la pantalla para cobrar a otro cliente"
          >
            <FaPause className="me-1" /> Guardar en espera
          </Button>

          {tiene && (
            <button
              type="button"
              className="btn btn-sm btn-link text-decoration-none ms-auto d-flex align-items-center gap-1"
              onClick={() => setAbierto((v) => !v)}
            >
              Ventas en espera
              <Badge bg="warning" text="dark">
                {ventasEnEspera.length}
              </Badge>
              <FaChevronDown
                style={{
                  transition: "transform .2s",
                  transform: abierto ? "rotate(180deg)" : "none",
                }}
              />
            </button>
          )}
        </div>

        <Collapse in={abierto && tiene}>
          <div>
            <div className="list-group list-group-flush mt-2">
              {ventasEnEspera.map((s) => (
                <div
                  key={s.id}
                  className="list-group-item px-0 d-flex align-items-center flex-wrap gap-2"
                >
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-semibold">
                      {money(s.total)}{" "}
                      <span className="text-muted fw-normal small">
                        · {s.lineas} producto{s.lineas === 1 ? "" : "s"}
                        {s.items ? ` (${s.items} und.)` : ""}
                      </span>
                    </div>
                    <div className="text-muted small">
                      {hora(s.ts)}
                      {s.clienteNombre ? ` · ${s.clienteNombre}` : ""}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => onRecuperar(s.id)}
                  >
                    <FaPlay className="me-1" /> Recuperar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => onDescartar(s.id)}
                    title="Descartar esta venta en espera"
                  >
                    <FaTrashAlt />
                  </Button>
                </div>
              ))}
            </div>
            {hayCarrito && (
              <div className="small text-muted mt-1">
                Al recuperar una venta, la venta actual se guarda en espera
                automáticamente.
              </div>
            )}
          </div>
        </Collapse>
      </div>
    </div>
  );
}
