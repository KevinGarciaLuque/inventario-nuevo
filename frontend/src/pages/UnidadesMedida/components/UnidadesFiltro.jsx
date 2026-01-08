import { Button, Form, InputGroup } from "react-bootstrap";

export default function UnidadesFiltro({ filtro, setFiltro, guardando }) {
  return (
    <InputGroup className="mb-3">
      <Form.Control
        placeholder="Buscar por nombre, abreviatura o tipo…"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />
      <Button
        variant="outline-secondary"
        onClick={() => setFiltro("")}
        disabled={guardando}
      >
        Limpiar
      </Button>
    </InputGroup>
  );
}
