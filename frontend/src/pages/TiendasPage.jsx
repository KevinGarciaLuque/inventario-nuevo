import { useEffect, useState } from "react";
import { Badge, Button, Form, Modal, Table } from "react-bootstrap";
import { BsCheckCircleFill, BsExclamationTriangleFill, BsGlobe2, BsPencilSquare, BsTrash } from "react-icons/bs";
import api from "../api/axios";

const VACIA = { nombre: "", direccion: "", rtn: "", telefono: "", activo: true };

export default function TiendasPage() {
  const [tiendas, setTiendas] = useState([]);
  const [form, setForm] = useState(VACIA);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [modal, setModal] = useState({ show: false, type: "", message: "" });
  const [aEliminar, setAEliminar] = useState(null);

  const cargar = async () => {
    try {
      const res = await api.get("/tiendas");
      setTiendas(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirNueva = () => {
    setForm(VACIA);
    setEditId(null);
    setShowForm(true);
  };

  const abrirEditar = (t) => {
    setForm({
      nombre: t.nombre || "",
      direccion: t.direccion || "",
      rtn: t.rtn || "",
      telefono: t.telefono || "",
      activo: !!t.activo,
    });
    setEditId(t.id);
    setShowForm(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.put(`/tiendas/${editId}`, form);
      else await api.post("/tiendas", form);
      setShowForm(false);
      await cargar();
      setModal({ show: true, type: "success", message: editId ? "Tienda actualizada" : "Tienda creada" });
    } catch (err) {
      setModal({
        show: true,
        type: "error",
        message: err?.response?.data?.message || "No se pudo guardar la tienda",
      });
    }
  };

  const marcarWeb = async (t) => {
    const activar = !t.atiende_web;
    // reflejo optimista (exclusivo)
    setTiendas((prev) =>
      prev.map((x) => ({ ...x, atiende_web: activar && x.id === t.id ? 1 : 0 })),
    );
    try {
      await api.patch(`/tiendas/${t.id}/atiende-web`, { atiende_web: activar });
    } catch (err) {
      await cargar();
      setModal({
        show: true,
        type: "error",
        message: err?.response?.data?.message || "No se pudo cambiar la tienda web",
      });
    }
  };

  const eliminar = async () => {
    const t = aEliminar;
    setAEliminar(null);
    if (!t) return;
    try {
      await api.delete(`/tiendas/${t.id}`);
      await cargar();
      setModal({ show: true, type: "success", message: "Tienda eliminada" });
    } catch (err) {
      setModal({
        show: true,
        type: "error",
        message: err?.response?.data?.message || "No se pudo eliminar la tienda",
      });
    }
  };

  const set = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  return (
    <div className="container py-4">
      <h2 className="mb-1 text-center">Tiendas</h2>
      <p className="text-center text-muted mb-4">
        Locales del negocio. Cada tienda numera sus recibos/facturas por separado.
        El interruptor <BsGlobe2 className="mx-1" /> marca cuál atiende los pedidos de la tienda web.
      </p>

      <div className="d-flex justify-content-end mb-3">
        <Button variant="success" onClick={abrirNueva}>
          + Nueva tienda
        </Button>
      </div>

      <div className="bg-white shadow-sm rounded" style={{ overflowX: "auto" }}>
        <Table bordered hover className="mb-0" style={{ minWidth: 760 }}>
          <thead className="table-light">
            <tr>
              <th>Nombre</th>
              <th>Dirección</th>
              <th>RTN</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th className="text-center">Pedidos web</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tiendas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted py-4">
                  Aún no hay tiendas registradas.
                </td>
              </tr>
            ) : (
              tiendas.map((t) => (
                <tr key={t.id}>
                  <td className="fw-semibold">{t.nombre}</td>
                  <td>{t.direccion || "—"}</td>
                  <td>{t.rtn || "—"}</td>
                  <td>{t.telefono || "—"}</td>
                  <td>
                    {t.activo ? (
                      <Badge bg="success">Activa</Badge>
                    ) : (
                      <Badge bg="secondary">Inactiva</Badge>
                    )}
                  </td>
                  <td className="text-center">
                    <Form.Check
                      type="switch"
                      id={`web-${t.id}`}
                      checked={!!t.atiende_web}
                      disabled={!t.activo}
                      onChange={() => marcarWeb(t)}
                      label={t.atiende_web ? "Sí" : ""}
                    />
                  </td>
                  <td className="text-center">
                    <Button
                      size="sm"
                      variant="warning"
                      className="me-1"
                      onClick={() => abrirEditar(t)}
                    >
                      <BsPencilSquare />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => setAEliminar(t)}
                    >
                      <BsTrash />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Form modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Form onSubmit={guardar}>
          <Modal.Header closeButton>
            <Modal.Title>{editId ? "Editar tienda" : "Nueva tienda"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Nombre *</Form.Label>
              <Form.Control value={form.nombre} onChange={set("nombre")} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Dirección</Form.Label>
              <Form.Control value={form.direccion} onChange={set("direccion")} />
            </Form.Group>
            <div className="row">
              <div className="col-6">
                <Form.Group className="mb-2">
                  <Form.Label>RTN</Form.Label>
                  <Form.Control value={form.rtn} onChange={set("rtn")} />
                </Form.Group>
              </div>
              <div className="col-6">
                <Form.Group className="mb-2">
                  <Form.Label>Teléfono</Form.Label>
                  <Form.Control value={form.telefono} onChange={set("telefono")} />
                </Form.Group>
              </div>
            </div>
            {editId && (
              <Form.Check
                type="switch"
                id="tienda-activa"
                label="Tienda activa"
                checked={form.activo}
                onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
              />
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="success">
              Guardar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Confirm delete */}
      <Modal show={!!aEliminar} onHide={() => setAEliminar(null)} centered>
        <Modal.Body className="text-center py-4">
          <BsExclamationTriangleFill size={54} color="#dc3545" className="mb-3" />
          <h5 className="fw-bold mb-2">¿Eliminar "{aEliminar?.nombre}"?</h5>
          <p className="text-muted small mb-3">
            No se podrá eliminar si ya tiene ventas, usuarios o CAI asociados
            (en ese caso, desactívala).
          </p>
          <div className="d-flex gap-2 justify-content-center">
            <Button variant="secondary" onClick={() => setAEliminar(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={eliminar}>
              Eliminar
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      <Modal show={modal.show} onHide={() => setModal({ show: false })} centered>
        <Modal.Body className="text-center py-4">
          {modal.type === "success" ? (
            <BsCheckCircleFill size={56} color="#198754" className="mb-3" />
          ) : (
            <BsExclamationTriangleFill size={56} color="#dc3545" className="mb-3" />
          )}
          <h6 className="fw-bold mb-0">{modal.message}</h6>
        </Modal.Body>
      </Modal>
    </div>
  );
}
