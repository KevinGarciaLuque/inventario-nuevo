import { Button, Modal } from "react-bootstrap";

export default function ModalEliminarUnidad({
  modalDelete,
  cancelarEliminar,
  confirmarEliminar,
  guardando,
}) {
  return (
    <Modal show={modalDelete.show} onHide={cancelarEliminar} centered>
      <Modal.Header closeButton>
        <Modal.Title>Confirmar eliminación</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {modalDelete.unidad && (
          <>
            ¿Seguro que deseas eliminar la unidad{" "}
            <strong>{modalDelete.unidad.nombre}</strong> (
            {modalDelete.unidad.abreviatura})?
            <div className="text-muted mt-2" style={{ fontSize: ".95rem" }}>
              Recomendación: si ya se usó en productos, mejor desactívala.
            </div>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={cancelarEliminar}
          disabled={guardando}
        >
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={confirmarEliminar}
          disabled={guardando}
        >
          {guardando ? "Eliminando..." : "Eliminar"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
