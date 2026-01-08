import { Button, Form, Modal } from "react-bootstrap";

export default function ModalUnidadForm({
  modalForm,
  cerrarModalForm,
  onChangeForm,
  guardarUnidad,
  guardando,
  TIPOS,
}) {
  return (
    <Modal show={modalForm.show} onHide={cerrarModalForm} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {modalForm.mode === "create" ? "Nueva unidad" : "Editar unidad"}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Nombre</Form.Label>
          <Form.Control
            name="nombre"
            value={modalForm.data.nombre}
            onChange={onChangeForm}
            placeholder="Ej: Kilogramo, Libra, Metro…"
            autoFocus
            disabled={guardando}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Abreviatura</Form.Label>
          <Form.Control
            name="abreviatura"
            value={modalForm.data.abreviatura}
            onChange={onChangeForm}
            placeholder="Ej: kg, lb, m…"
            disabled={guardando}
          />
          <small className="text-muted">Recomendado: 2–5 caracteres.</small>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Tipo</Form.Label>
          <Form.Select
            name="tipo"
            value={modalForm.data.tipo}
            onChange={onChangeForm}
            disabled={guardando}
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Check
          type="switch"
          id="activo"
          name="activo"
          label="Activo"
          checked={!!modalForm.data.activo}
          onChange={onChangeForm}
          disabled={guardando}
        />
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={cerrarModalForm}
          disabled={guardando}
        >
          Cancelar
        </Button>
        <Button variant="warning" onClick={guardarUnidad} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
