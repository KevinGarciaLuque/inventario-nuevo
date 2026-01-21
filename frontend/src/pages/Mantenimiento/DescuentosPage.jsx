import { useEffect, useMemo, useState } from "react";
import { Button, Table, Badge, Form, Modal, Row, Col } from "react-bootstrap";
import {
  FaPlus,
  FaEdit,
  FaToggleOn,
  FaToggleOff,
  FaPercentage,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import ToastAlert from "../../components/ToastAlert";

const API = import.meta.env.VITE_API_URL; // ej: http://localhost:3000/api

const TIPOS = [
  { value: "PORCENTAJE", label: "Porcentaje (%)" },
  { value: "MONTO_FIJO", label: "Monto fijo (L)" },
];

const APLICA_SOBRE = [
  { value: "SUBTOTAL", label: "Subtotal (sin ISV)" },
  { value: "TOTAL", label: "Total (con ISV)" },
];

const ALCANCES = [
  { value: "VENTA", label: "Venta (carrito completo)" },
  { value: "PRODUCTO", label: "Producto (productos asignados)" },
  { value: "CATEGORIA", label: "Categoría (categorías asignadas)" },
];

const DescuentosPage = () => {
  const [descuentos, setDescuentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [toast, setToast] = useState(null);

  const [showNuevo, setShowNuevo] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    tipo: "PORCENTAJE",
    valor: 0,
    aplica_sobre: "SUBTOTAL",
    alcance: "VENTA",
    edad_min: "",
    edad_max: "",
    requiere_documento: 0,
    acumulable: 0,
    prioridad: 100,
    fecha_inicio: "",
    fecha_fin: "",
    activo: 1,
  });

  const token = localStorage.getItem("token");

  const safeJson = async (res) => {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    const txt = await res.text();
    return { message: txt };
  };

  const toISODate = (v) => {
    if (!v) return null;
    const s = String(v).trim();
    if (!s) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;

    return s;
  };

  const parseDate = (iso) => {
    if (!iso) return null;
    const x = new Date(iso);
    return Number.isNaN(x.getTime()) ? null : x;
  };

  const cargarDescuentos = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/descuentos`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await safeJson(res);

      if (!res.ok) {
        console.error("❌ GET /descuentos error:", data);
        setDescuentos([]);
        const detalle =
          Array.isArray(data?.errors) && data.errors.length
            ? `${data.errors[0].path || data.errors[0].param || "campo"}: ${data.errors[0].msg}`
            : null;

        setToast({
          type: "error",
          message:
            detalle || data?.message || "No se pudieron cargar los descuentos",
        });
        return;
      }

      setDescuentos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("❌ GET /descuentos exception:", error);
      setDescuentos([]);
      setToast({ type: "error", message: "Error al cargar descuentos" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDescuentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleEstado = async (id, activo) => {
    try {
      const res = await fetch(`${API}/descuentos/${id}/estado`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ activo: activo ? 0 : 1 }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        console.error("❌ PATCH /descuentos/:id/estado error:", data);
        const detalle =
          Array.isArray(data?.errors) && data.errors.length
            ? `${data.errors[0].path || data.errors[0].param || "campo"}: ${data.errors[0].msg}`
            : null;

        setToast({
          type: "error",
          message: detalle || data?.message || "No se pudo cambiar el estado",
        });
        return;
      }

      setToast({
        type: "success",
        message: activo ? "Descuento desactivado" : "Descuento activado",
      });
      cargarDescuentos();
    } catch (e) {
      console.error("❌ PATCH /descuentos/:id/estado exception:", e);
      setToast({ type: "error", message: "No se pudo cambiar el estado" });
    }
  };

  const descuentosFiltrados = useMemo(() => {
    const arr = Array.isArray(descuentos) ? descuentos : [];
    const f = filtro.trim().toLowerCase();
    if (!f) return arr;
    return arr.filter((d) =>
      String(d?.nombre || "")
        .toLowerCase()
        .includes(f),
    );
  }, [descuentos, filtro]);

  const abrirNuevo = () => {
    setForm({
      nombre: "",
      descripcion: "",
      tipo: "PORCENTAJE",
      valor: 0,
      aplica_sobre: "SUBTOTAL",
      alcance: "VENTA",
      edad_min: "",
      edad_max: "",
      requiere_documento: 0,
      acumulable: 0,
      prioridad: 100,
      fecha_inicio: "",
      fecha_fin: "",
      activo: 1,
    });
    setShowNuevo(true);
  };

  const onChange = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const validarFormulario = () => {
    const nombre = String(form.nombre || "").trim();
    if (nombre.length < 2)
      return "El nombre es obligatorio (mínimo 2 caracteres).";

    const valor = Number(form.valor);
    if (!Number.isFinite(valor) || valor < 0)
      return "El valor del descuento debe ser >= 0.";
    if (form.tipo === "PORCENTAJE" && valor > 100)
      return "Si es porcentaje, el valor no puede ser mayor a 100.";

    const em = form.edad_min === "" ? null : Number(form.edad_min);
    const ex = form.edad_max === "" ? null : Number(form.edad_max);

    if (em !== null && (!Number.isInteger(em) || em < 0 || em > 150))
      return "Edad mínima inválida.";
    if (ex !== null && (!Number.isInteger(ex) || ex < 0 || ex > 150))
      return "Edad máxima inválida.";
    if (em !== null && ex !== null && em > ex)
      return "Edad mínima no puede ser mayor que edad máxima.";

    const fi = parseDate(toISODate(form.fecha_inicio));
    const ff = parseDate(toISODate(form.fecha_fin));
    if (fi && ff && fi.getTime() > ff.getTime())
      return "La fecha inicio no puede ser mayor que la fecha fin.";

    return null;
  };

  const crearDescuento = async () => {
    const err = validarFormulario();
    if (err) {
      setToast({ type: "error", message: err });
      return;
    }

    try {
      setSaving(true);

      const fi = toISODate(form.fecha_inicio);
      const ff = toISODate(form.fecha_fin);

      const payload = {
        nombre: String(form.nombre).trim(),
        descripcion: String(form.descripcion || "").trim(), // NO null
        tipo: form.tipo,
        valor: Number(form.valor),
        aplica_sobre: form.aplica_sobre,
        alcance: form.alcance,
        edad_min: form.edad_min === "" ? null : Number(form.edad_min),
        edad_max: form.edad_max === "" ? null : Number(form.edad_max),
        requiere_documento: Number(form.requiere_documento) ? 1 : 0,
        acumulable: Number(form.acumulable) ? 1 : 0,
        prioridad: Number(form.prioridad) || 100,

        // ✅ AQUÍ LA MAGIA: SIEMPRE ISO
        fecha_inicio: fi || null,
        fecha_fin: ff || null,

        activo: Number(form.activo) ? 1 : 0,
      };

      console.log(
        "➡️ POST /descuentos payload:",
        JSON.stringify(payload, null, 2),
      );


      const res = await fetch(`${API}/descuentos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        console.error("❌ POST /descuentos error:", data);

        const detalle =
          Array.isArray(data?.errors) && data.errors.length
            ? `${data.errors[0].path || data.errors[0].param || "campo"}: ${data.errors[0].msg}`
            : null;

        setToast({
          type: "error",
          message: detalle || data?.message || "No se pudo crear el descuento",
        });
        return;
      }

      setToast({ type: "success", message: "Descuento creado correctamente" });
      setShowNuevo(false);
      cargarDescuentos();
    } catch (e) {
      console.error("❌ POST /descuentos exception:", e);
      setToast({ type: "error", message: "Error al crear descuento" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 d-flex align-items-center gap-2">
          <FaPercentage /> Descuentos
        </h4>

        <Button variant="primary" onClick={abrirNuevo}>
          <FaPlus /> Nuevo descuento
        </Button>
      </div>

      <Form.Control
        placeholder="Buscar descuento..."
        className="mb-3"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />

      <div className="table-responsive" style={{ maxHeight: "65vh" }}>
        <Table bordered hover size="sm" className="align-middle">
          <thead className="table-dark sticky-top">
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Aplica sobre</th>
              <th>Alcance</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="8" className="text-center">
                  Cargando...
                </td>
              </tr>
            )}

            {!loading && descuentosFiltrados.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center text-muted">
                  No hay descuentos registrados
                </td>
              </tr>
            )}

            {!loading &&
              descuentosFiltrados.map((d) => (
                <tr key={d.id}>
                  <td>{d.nombre}</td>
                  <td>
                    <Badge bg={d.tipo === "PORCENTAJE" ? "info" : "secondary"}>
                      {d.tipo}
                    </Badge>
                  </td>
                  <td>
                    {d.tipo === "PORCENTAJE"
                      ? `${Number(d.valor || 0).toFixed(2)}%`
                      : `L ${Number(d.valor || 0).toFixed(2)}`}
                  </td>
                  <td>{d.aplica_sobre}</td>
                  <td>{d.alcance}</td>
                  <td>{d.prioridad}</td>
                  <td>
                    <Badge bg={d.activo ? "success" : "secondary"}>
                      {d.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="text-center">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      className="me-2"
                      title="Editar"
                      disabled
                    >
                      <FaEdit />
                    </Button>

                    <Button
                      size="sm"
                      variant={d.activo ? "outline-danger" : "outline-success"}
                      title={d.activo ? "Desactivar" : "Activar"}
                      onClick={() => toggleEstado(d.id, d.activo)}
                    >
                      {d.activo ? <FaToggleOff /> : <FaToggleOn />}
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </Table>
      </div>

      <Modal
        show={showNuevo}
        onHide={() => !saving && setShowNuevo(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton={!saving}>
          <Modal.Title>Nuevo descuento</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Nombre *</Form.Label>
              <Form.Control
                value={form.nombre}
                onChange={(e) => onChange("nombre", e.target.value)}
                placeholder="Ej: Tercera Edad"
                disabled={saving}
              />
            </Col>

            <Col md={6}>
              <Form.Label>Tipo *</Form.Label>
              <Form.Select
                value={form.tipo}
                onChange={(e) => onChange("tipo", e.target.value)}
                disabled={saving}
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={6}>
              <Form.Label>Valor *</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => onChange("valor", e.target.value)}
                disabled={saving}
              />
              <small className="text-muted">
                {form.tipo === "PORCENTAJE"
                  ? "Ej: 25 para 25%"
                  : "Ej: 50 para L 50.00"}
              </small>
            </Col>

            <Col md={6}>
              <Form.Label>Aplica sobre</Form.Label>
              <Form.Select
                value={form.aplica_sobre}
                onChange={(e) => onChange("aplica_sobre", e.target.value)}
                disabled={saving}
              >
                {APLICA_SOBRE.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={6}>
              <Form.Label>Alcance</Form.Label>
              <Form.Select
                value={form.alcance}
                onChange={(e) => onChange("alcance", e.target.value)}
                disabled={saving}
              >
                {ALCANCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>Edad mínima</Form.Label>
              <Form.Control
                type="number"
                value={form.edad_min}
                onChange={(e) => onChange("edad_min", e.target.value)}
                placeholder="Ej: 60"
                disabled={saving}
              />
            </Col>

            <Col md={3}>
              <Form.Label>Edad máxima</Form.Label>
              <Form.Control
                type="number"
                value={form.edad_max}
                onChange={(e) => onChange("edad_max", e.target.value)}
                placeholder="Ej: 79"
                disabled={saving}
              />
            </Col>

            <Col md={4}>
              <Form.Label>Prioridad</Form.Label>
              <Form.Control
                type="number"
                value={form.prioridad}
                onChange={(e) => onChange("prioridad", e.target.value)}
                disabled={saving}
              />
              <small className="text-muted">
                Menor número = aplica primero.
              </small>
            </Col>

            <Col md={4} className="d-flex align-items-end">
              <Form.Check
                type="switch"
                id="reqdoc"
                label="Requiere documento"
                checked={Number(form.requiere_documento) === 1}
                onChange={(e) =>
                  onChange("requiere_documento", e.target.checked ? 1 : 0)
                }
                disabled={saving}
              />
            </Col>

            <Col md={4} className="d-flex align-items-end">
              <Form.Check
                type="switch"
                id="acum"
                label="Acumulable"
                checked={Number(form.acumulable) === 1}
                onChange={(e) =>
                  onChange("acumulable", e.target.checked ? 1 : 0)
                }
                disabled={saving}
              />
            </Col>

            <Col md={6}>
              <Form.Label>Fecha inicio (opcional)</Form.Label>
              <Form.Control
                type="date"
                value={toISODate(form.fecha_inicio) || ""}
                onChange={(e) => onChange("fecha_inicio", e.target.value)}
                disabled={saving}
              />
            </Col>

            <Col md={6}>
              <Form.Label>Fecha fin (opcional)</Form.Label>
              <Form.Control
                type="date"
                value={toISODate(form.fecha_fin) || ""}
                onChange={(e) => onChange("fecha_fin", e.target.value)}
                disabled={saving}
              />
            </Col>

            <Col md={6}>
              <Form.Label>Estado</Form.Label>
              <Form.Select
                value={form.activo}
                onChange={(e) => onChange("activo", e.target.value)}
                disabled={saving}
              >
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </Form.Select>
            </Col>

            <Col md={6}>
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={form.descripcion}
                onChange={(e) => onChange("descripcion", e.target.value)}
                placeholder="Opcional"
                disabled={saving}
              />
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowNuevo(false)}
            disabled={saving}
          >
            <FaTimes /> Cancelar
          </Button>
          <Button variant="primary" onClick={crearDescuento} disabled={saving}>
            <FaSave /> {saving ? "Guardando..." : "Guardar"}
          </Button>
        </Modal.Footer>
      </Modal>

      {toast && (
        <ToastAlert
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default DescuentosPage;
