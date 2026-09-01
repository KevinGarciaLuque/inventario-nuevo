import { useEffect, useState } from "react";
import { Badge, Button, Form, Modal, Table } from "react-bootstrap";
import { BsCheckCircleFill, BsExclamationTriangleFill, BsTrash } from "react-icons/bs";
import api from "../api/axios";
import { useUser } from "../context/UserContext";

export default function CaiPage() {
  const { user } = useUser();
  const esSuperadmin = user?.rol === "superadmin";
  const [caiList, setCaiList] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [modal, setModal] = useState({ show: false, type: "", message: "" });
  const [caiAEliminar, setCaiAEliminar] = useState(null);
  const [caiAForzar, setCaiAForzar] = useState(null);
  const [nuevoCai, setNuevoCai] = useState({
    cai_codigo: "",
    sucursal: "",
    punto_emision: "",
    tipo_documento: "",
    rango_inicio: 1,
    rango_fin: 100,
    correlativo_actual: 0,
    fecha_autorizacion: "",
    fecha_limite_emision: "",
    tienda_id: "",
    activo: true,
  });

  const [emitirConCai, setEmitirConCai] = useState(true);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  useEffect(() => {
    cargarCai();
    cargarConfig();
    api
      .get("/tiendas")
      .then((res) => setTiendas(Array.isArray(res.data) ? res.data : []))
      .catch(() => setTiendas([]));
  }, []);

  const cargarCai = async () => {
    try {
      const res = await api.get("/cai");
      setCaiList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarConfig = async () => {
    try {
      const res = await api.get("/cai/config");
      setEmitirConCai(res.data?.emitir_con_cai !== false);
    } catch (err) {
      console.error(err);
    }
  };

  const cambiarModoFacturacion = async (valor) => {
    setGuardandoConfig(true);
    setEmitirConCai(valor);
    try {
      const res = await api.put("/cai/config", { emitir_con_cai: valor });
      setModal({
        show: true,
        type: "success",
        message: res.data?.message || "Configuración actualizada",
      });
    } catch (err) {
      console.error(err);
      setEmitirConCai(!valor);
      setModal({
        show: true,
        type: "error",
        message: "No se pudo actualizar la configuración",
      });
    } finally {
      setGuardandoConfig(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNuevoCai((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const crearCai = async (e) => {
    e.preventDefault();
    try {
      await api.post("/cai", nuevoCai);
      setModal({
        show: true,
        type: "success",
        message: "CAI registrado correctamente",
      });
      setNuevoCai({
        cai_codigo: "",
        sucursal: "",
        punto_emision: "",
        tipo_documento: "",
        rango_inicio: 1,
        rango_fin: 100,
        correlativo_actual: 0,
        fecha_autorizacion: "",
        fecha_limite_emision: "",
        tienda_id: "",
        activo: true,
      });
      cargarCai();
    } catch (err) {
      console.error(err);
      setModal({
        show: true,
        type: "error",
        message: "Error al registrar el CAI",
      });
    }
  };

  const caiEstaPorAgotarse = (cai) => {
    if (!cai) return false;
    const disponibles = cai.rango_fin - cai.correlativo_actual;
    return disponibles <= 50; // puedes ajustar el umbral
  };

  const eliminarCai = async () => {
    const item = caiAEliminar;
    setCaiAEliminar(null);
    if (!item?.id) return;
    try {
      await api.delete(`/cai/${item.id}`);
      setModal({
        show: true,
        type: "success",
        message: "CAI eliminado correctamente",
      });
      cargarCai();
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.requiereFuerza) {
        setCaiAForzar(item);
        return;
      }
      setModal({
        show: true,
        type: "error",
        message: err?.response?.data?.message || "No se pudo eliminar el CAI",
      });
    }
  };

  const forzarEliminarCai = async () => {
    const id = caiAForzar?.id;
    setCaiAForzar(null);
    if (!id) return;
    try {
      await api.delete(`/cai/${id}?force=1`);
      setModal({
        show: true,
        type: "success",
        message: "CAI eliminado. Las facturas se conservaron sin CAI asignado.",
      });
      cargarCai();
    } catch (err) {
      setModal({
        show: true,
        type: "error",
        message: err?.response?.data?.message || "No se pudo eliminar el CAI",
      });
    }
  };

  const cambiarEstado = async (id, activo) => {
    try {
      await api.patch(`/cai/${id}`, { activo });
      cargarCai();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">Control de CAI</h2>

      <div
        className={`border rounded p-3 shadow-sm mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2 ${
          emitirConCai ? "bg-light" : "bg-info-subtle"
        }`}
      >
        <div>
          <h5 className="mb-1">Modo de facturación</h5>
          <div className="text-muted">
            {emitirConCai ? (
              <>
                Actualmente se emiten <strong>Facturas</strong> con CAI (fiscal).
              </>
            ) : (
              <>
                Actualmente se emiten <strong>Recibos</strong> sin CAI (no
                fiscal). El CAI no se consume.
              </>
            )}
          </div>
        </div>
        <Form.Check
          type="switch"
          id="switch-modo-cai"
          disabled={guardandoConfig}
          checked={emitirConCai}
          onChange={(e) => cambiarModoFacturacion(e.target.checked)}
          label={
            <span className="fw-semibold">
              {emitirConCai ? "Facturar con CAI" : "Emitir Recibos"}
            </span>
          }
        />
      </div>

      <Form
        onSubmit={crearCai}
        className="border rounded p-3 shadow mb-4 bg-light"
      >
        <h5>Nuevo CAI</h5>
        <div className="row g-2">
          <div className="col-md-4">
            <Form.Label>Código CAI</Form.Label>
            <Form.Control
              name="cai_codigo"
              value={nuevoCai.cai_codigo}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-2">
            <Form.Label>Sucursal</Form.Label>
            <Form.Control
              name="sucursal"
              value={nuevoCai.sucursal}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-2">
            <Form.Label>Punto Emisión</Form.Label>
            <Form.Control
              name="punto_emision"
              value={nuevoCai.punto_emision}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-2">
            <Form.Label>Tipo Documento</Form.Label>
            <Form.Control
              name="tipo_documento"
              value={nuevoCai.tipo_documento}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-2">
            <Form.Label>Inicio Rango</Form.Label>
            <Form.Control
              type="number"
              name="rango_inicio"
              value={nuevoCai.rango_inicio}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-2">
            <Form.Label>Fin Rango</Form.Label>
            <Form.Control
              type="number"
              name="rango_fin"
              value={nuevoCai.rango_fin}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-2">
            <Form.Label>Correlativo</Form.Label>
            <Form.Control
              type="number"
              name="correlativo_actual"
              value={nuevoCai.correlativo_actual}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-3">
            <Form.Label>Fecha Autorización</Form.Label>
            <Form.Control
              type="date"
              name="fecha_autorizacion"
              value={nuevoCai.fecha_autorizacion}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-3">
            <Form.Label>Fecha Límite</Form.Label>
            <Form.Control
              type="date"
              name="fecha_limite_emision"
              value={nuevoCai.fecha_limite_emision}
              onChange={handleChange}
            />
          </div>
          {tiendas.length > 0 && (
            <div className="col-md-3">
              <Form.Label>Tienda</Form.Label>
              <Form.Select
                name="tienda_id"
                value={nuevoCai.tienda_id}
                onChange={handleChange}
              >
                <option value="">Global (todas)</option>
                {tiendas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </Form.Select>
            </div>
          )}
          <div className="col-md-2 align-self-end">
            <Button type="submit" variant="success" className="w-100">
              Registrar CAI
            </Button>
          </div>
        </div>
      </Form>

      <div
        className="bg-white shadow-sm rounded mb-4"
        style={{
          maxHeight: "calc(100vh - 420px)",
          minHeight: "180px",
          overflowY: "auto",
          overflowX: "auto", // 🔁 Scroll horizontal para celulares
          border: "1px solid #dee2e6", // opcional para visualización clara
        }}
      >
        <Table
          bordered
          hover
          className="mb-0 sticky-header"
          style={{ minWidth: "700px" }} // ⬅️ Ajusta según tus columnas visibles
        >
          <thead className="table-light sticky-top">
            <tr>
              <th>ID</th>
              <th>CAI</th>
              <th>Tienda</th>
              <th>Rango</th>
              <th>Correlativo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {caiList.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.cai_codigo}</td>
                <td>
                  {item.tienda_nombre || (
                    <span className="text-muted">Global</span>
                  )}
                </td>
                <td>
                  {item.rango_inicio} - {item.rango_fin}
                </td>
                <td>{item.correlativo_actual}</td>
                <td>
                  {item.activo ? (
                    <Badge bg="success">Activo</Badge>
                  ) : (
                    <Badge bg="secondary">Inactivo</Badge>
                  )}
                </td>
                <td>
                  <div className="d-flex gap-2 align-items-center">
                    {item.activo ? (
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={() => cambiarEstado(item.id, false)}
                      >
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => cambiarEstado(item.id, true)}
                      >
                        Activar
                      </Button>
                    )}
                    {esSuperadmin && (
                      <Button
                        size="sm"
                        variant="outline-danger"
                        title="Eliminar CAI"
                        onClick={() => setCaiAEliminar(item)}
                      >
                        <BsTrash />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <Modal
        show={Boolean(caiAEliminar)}
        onHide={() => setCaiAEliminar(null)}
        centered
      >
        <Modal.Body className="text-center py-4">
          <BsExclamationTriangleFill size={56} color="#dc3545" className="mb-3" />
          <h5 className="fw-bold mb-2">¿Eliminar este CAI?</h5>
          <p className="text-muted mb-1">{caiAEliminar?.cai_codigo}</p>
          <p className="text-muted small mb-3">
            No se podrá eliminar si ya tiene facturas emitidas asociadas.
          </p>
          <div className="d-flex gap-2 justify-content-center">
            <Button variant="secondary" onClick={() => setCaiAEliminar(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={eliminarCai}>
              Eliminar
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      <Modal
        show={Boolean(caiAForzar)}
        onHide={() => setCaiAForzar(null)}
        centered
      >
        <Modal.Body className="text-center py-4">
          <BsExclamationTriangleFill size={56} color="#dc3545" className="mb-3" />
          <h5 className="fw-bold mb-2">Este CAI tiene facturas emitidas</h5>
          <p className="text-muted mb-3">
            Si lo eliminas de todas formas, las facturas se conservarán pero
            quedarán <strong>sin CAI asignado</strong>. Esta acción no se puede
            deshacer.
          </p>
          <div className="d-flex gap-2 justify-content-center">
            <Button variant="secondary" onClick={() => setCaiAForzar(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={forzarEliminarCai}>
              Eliminar de todas formas
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      <Modal
        show={modal.show}
        onHide={() => setModal({ show: false })}
        centered
      >
        <Modal.Body className="text-center py-4">
          {modal.type === "success" ? (
            <BsCheckCircleFill size={64} color="#198754" className="mb-3" />
          ) : (
            <BsExclamationTriangleFill
              size={64}
              color="#dc3545"
              className="mb-3"
            />
          )}
          <h5 className="mb-2 fw-bold">{modal.message}</h5>
        </Modal.Body>
      </Modal>
    </div>
  );
}
