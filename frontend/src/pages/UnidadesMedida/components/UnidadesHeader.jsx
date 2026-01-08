import { Button } from "react-bootstrap";

export default function UnidadesHeader({ abrirCrear, guardando }) {
  return (
    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
      <div>
        <h3 className="mb-0">Unidades de Medida</h3>
        <small className="text-muted">
          Administra unidades para distintos rubros (ferretería, abarrotes,
          etc.)
        </small>
      </div>

      <Button variant="warning" onClick={abrirCrear} disabled={guardando}>
        + Nueva unidad
      </Button>
    </div>
  );
}
