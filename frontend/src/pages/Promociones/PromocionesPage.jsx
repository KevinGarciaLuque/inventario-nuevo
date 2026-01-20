// src/pages/Promociones/PromocionesPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Modal,
  Form,
  InputGroup,
  Table,
  Badge,
  Spinner,
} from "react-bootstrap";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaCogs,
  FaEye,
} from "react-icons/fa";

import ComboEditor from "./ComboEditor";
import {
  getPromociones,
  createPromocion,
  updatePromocion,
  setPromocionEstado,
  deletePromocion,
} from "./promocionService";

const TIPOS = [
  { value: "PORCENTAJE", label: "Descuento %" },
  { value: "MONTO", label: "Descuento L" },
  { value: "COMBO", label: "Combo (precio fijo)" },
];

const hoyISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function PromocionesPage() {
  // filtros
  const [search, setSearch] = useState("");
  const [soloActivas, setSoloActivas] = useState(false);
  const [soloVigentes, setSoloVigentes] = useState(false);

  // datos
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  // modal promo
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    id: null,
    nombre: "",
    tipo: "PORCENTAJE",
    valor: "",
    precio_combo: "",
    fecha_inicio: "",
    fecha_fin: "",
    descripcion: "",
    activo: 1,
  });

  // combo editor (modal)
  const [showCombo, setShowCombo] = useState(false);
  const [comboSel, setComboSel] = useState(null);

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await getPromociones({
        search,
        activo: soloActivas ? 1 : undefined,
        vigente: soloVigentes ? 1 : undefined,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicarFiltros = async () => {
    await cargar();
  };

  const limpiarForm = () => {
    setFormError("");
    setForm({
      id: null,
      nombre: "",
      tipo: "PORCENTAJE",
      valor: "",
      precio_combo: "",
      fecha_inicio: "",
      fecha_fin: "",
      descripcion: "",
      activo: 1,
    });
  };

  const abrirNueva = () => {
    limpiarForm();
    // por comodidad: hoy como inicio
    setForm((f) => ({ ...f, fecha_inicio: hoyISO() }));
    setShowForm(true);
  };

  const abrirEditar = (p) => {
    setFormError("");
    setForm({
      id: p.id,
      nombre: p.nombre ?? "",
      tipo: p.tipo ?? "PORCENTAJE",
      valor: p.valor ?? "",
      precio_combo: p.precio_combo ?? "",
      fecha_inicio: p.fecha_inicio ?? "",
      fecha_fin: p.fecha_fin ?? "",
      descripcion: p.descripcion ?? "",
      activo: Number(p.activo) === 1 ? 1 : 0,
    });
    setShowForm(true);
  };

  const abrirCombo = (p) => {
    setComboSel(p);
    setShowCombo(true);
  };

  const validarForm = () => {
    const nombre = String(form.nombre ?? "").trim();
    if (!nombre) return "El nombre es obligatorio.";

    const tipo = String(form.tipo ?? "").toUpperCase();
    if (!["PORCENTAJE", "MONTO", "COMBO"].includes(tipo)) {
      return "Tipo inválido.";
    }

    if (tipo === "COMBO") {
      const pc = Number(form.precio_combo);
      if (!Number.isFinite(pc) || pc <= 0) return "Precio del combo inválido.";
    } else {
      const v = Number(form.valor);
      if (!Number.isFinite(v)) return "Valor inválido.";
      if (tipo === "PORCENTAJE" && (v <= 0 || v > 100))
        return "En porcentaje debe ser > 0 y <= 100.";
      if (tipo === "MONTO" && v < 0) return "El monto no puede ser negativo.";
    }

    if (form.fecha_inicio && !/^\d{4}-\d{2}-\d{2}$/.test(form.fecha_inicio))
      return "fecha_inicio debe ser YYYY-MM-DD.";
    if (form.fecha_fin && !/^\d{4}-\d{2}-\d{2}$/.test(form.fecha_fin))
      return "fecha_fin debe ser YYYY-MM-DD.";

    if (form.fecha_inicio && form.fecha_fin) {
      if (new Date(form.fecha_fin) < new Date(form.fecha_inicio)) {
        return "La fecha fin no puede ser menor a la fecha inicio.";
      }
    }

    return "";
  };

  const guardar = async () => {
    const err = validarForm();
    if (err) return setFormError(err);

    try {
      setSaving(true);
      setFormError("");

      const payload = {
        nombre: String(form.nombre).trim(),
        tipo: String(form.tipo).toUpperCase(),
        descripcion: String(form.descripcion ?? "").trim(),
        activo: Number(form.activo) === 0 ? 0 : 1,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
      };

      if (payload.tipo === "COMBO") {
        payload.precio_combo = Number(form.precio_combo);
        payload.valor = null;
      } else {
        payload.valor = Number(form.valor);
        payload.precio_combo = null;
      }

      if (form.id) {
        await updatePromocion(form.id, payload);
      } else {
        await createPromocion(payload);
      }

      setShowForm(false);
      limpiarForm();
      await cargar();
    } catch (e) {
      console.error(e);
      setFormError(e?.response?.data?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const toggleEstado = async (p) => {
    try {
      const nuevo = Number(p.activo) === 1 ? 0 : 1;
      await setPromocionEstado(p.id, nuevo);
      await cargar();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "No se pudo cambiar el estado.");
    }
  };

  const eliminar = async (p) => {
    const ok = window.confirm(
      `¿Eliminar la promoción "${p.nombre}"?\n\nSi está asignada a productos/combos, puede que no te deje.`
    );
    if (!ok) return;

    try {
      await deletePromocion(p.id);
      await cargar();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "No se pudo eliminar.");
    }
  };

  const resumen = useMemo(() => {
    const total = rows.length;
    const combos = rows.filter((r) => r.tipo === "COMBO").length;
    const desc = total - combos;
    return { total, combos, desc };
  }, [rows]);

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h4 className="mb-0">Mantenimiento de Promociones</h4>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Crea descuentos y combos con control de vigencia.
          </div>
        </div>

        <Button onClick={abrirNueva}>
          <FaPlus className="me-2" /> Nueva
        </Button>
      </div>

      {/* Filtros */}
      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="d-flex flex-column flex-lg-row gap-2 align-items-lg-center justify-content-between">
            <InputGroup style={{ maxWidth: 520 }}>
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, tipo, valor o descripción..."
              />
              <Button variant="outline-primary" onClick={aplicarFiltros}>
                Buscar
              </Button>
            </InputGroup>

            <div className="d-flex gap-4 align-items-center">
              <Form.Check
                type="switch"
                id="soloActivas"
                label="Solo activas"
                checked={soloActivas}
                onChange={(e) => setSoloActivas(e.target.checked)}
              />
              <Form.Check
                type="switch"
                id="soloVigentes"
                label="Solo vigentes"
                checked={soloVigentes}
                onChange={(e) => setSoloVigentes(e.target.checked)}
              />
              <Button variant="outline-secondary" onClick={aplicarFiltros}>
                <FaEye className="me-2" /> Aplicar
              </Button>
            </div>
          </div>

          <div className="mt-3 d-flex gap-3 flex-wrap">
            <Badge bg="dark">Total: {resumen.total}</Badge>
            <Badge bg="primary">Combos: {resumen.combos}</Badge>
            <Badge bg="secondary">Descuentos: {resumen.desc}</Badge>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card shadow-sm">
        <div className="card-body">
          {loading ? (
            <div className="py-5 text-center">
              <Spinner animation="border" />
              <div className="text-muted mt-2">Cargando...</div>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>Nombre</th>
                      <th>Tipo</th>
                      <th>Valor / Precio</th>
                      <th>Vigencia</th>
                      <th className="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => {
                      const activo = Number(p.activo) === 1;
                      const tipo = String(p.tipo || "").toUpperCase();
                      const isCombo = tipo === "COMBO";
                      const vigente =
                        (!p.fecha_inicio ||
                          new Date(p.fecha_inicio) <= new Date()) &&
                        (!p.fecha_fin || new Date(p.fecha_fin) >= new Date());

                      return (
                        <tr key={p.id}>
                          <td>
                            <Badge bg={activo ? "success" : "secondary"}>
                              {activo ? "Activa" : "Inactiva"}
                            </Badge>
                            {soloVigentes || p.fecha_inicio || p.fecha_fin ? (
                              <div className="mt-1">
                                <Badge
                                  bg={vigente ? "info" : "warning"}
                                  text="dark"
                                >
                                  {vigente ? "Vigente" : "No vigente"}
                                </Badge>
                              </div>
                            ) : null}
                          </td>

                          <td className="fw-semibold">{p.nombre}</td>

                          <td>
                            <Badge bg={isCombo ? "primary" : "dark"}>
                              {isCombo ? "COMBO" : tipo}
                            </Badge>
                          </td>

                          <td>
                            {isCombo ? (
                              <span className="fw-semibold">
                                L {Number(p.precio_combo ?? 0).toFixed(2)}
                              </span>
                            ) : tipo === "PORCENTAJE" ? (
                              <span className="fw-semibold">
                                {Number(p.valor ?? 0).toFixed(2)}%
                              </span>
                            ) : (
                              <span className="fw-semibold">
                                L {Number(p.valor ?? 0).toFixed(2)}
                              </span>
                            )}
                          </td>

                          <td style={{ whiteSpace: "nowrap" }}>
                            <span className="text-muted">
                              {p.fecha_inicio || "—"}
                            </span>
                            <span className="mx-2 text-muted">a</span>
                            <span className="text-muted">
                              {p.fecha_fin || "—"}
                            </span>
                          </td>

                          <td
                            className="text-end"
                            style={{ whiteSpace: "nowrap" }}
                          >
                            {isCombo && (
                              <Button
                                size="sm"
                                variant="outline-primary"
                                className="me-2"
                                onClick={() => abrirCombo(p)}
                                title="Configurar combo"
                              >
                                <FaCogs />
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline-secondary"
                              className="me-2"
                              onClick={() => abrirEditar(p)}
                              title="Editar"
                            >
                              <FaEdit />
                            </Button>

                            <Button
                              size="sm"
                              variant={
                                activo ? "outline-warning" : "outline-success"
                              }
                              className="me-2"
                              onClick={() => toggleEstado(p)}
                              title={activo ? "Desactivar" : "Activar"}
                            >
                              {activo ? "Off" : "On"}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => eliminar(p)}
                              title="Eliminar"
                            >
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}

                    {!rows.length && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          No hay promociones para mostrar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                Total: <b>{rows.length}</b>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Crear/Editar */}
      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {form.id ? "Editar promoción" : "Nueva promoción"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {formError ? (
            <div className="alert alert-danger py-2">{formError}</div>
          ) : null}

          <Form>
            <Form.Group className="mb-2">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                value={form.nombre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre: e.target.value }))
                }
                placeholder="Ej: PromoEnero / 2x1 / Combo Coca"
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Tipo</Form.Label>
              <Form.Select
                value={form.tipo}
                onChange={(e) => {
                  const t = e.target.value;
                  setForm((f) => ({
                    ...f,
                    tipo: t,
                    // limpiar campos que no apliquen
                    valor: t === "COMBO" ? "" : f.valor,
                    precio_combo: t === "COMBO" ? f.precio_combo : "",
                  }));
                }}
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {String(form.tipo).toUpperCase() === "COMBO" ? (
              <Form.Group className="mb-2">
                <Form.Label>Precio del combo</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={form.precio_combo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, precio_combo: e.target.value }))
                  }
                  placeholder="Ej: 85.00"
                />
              </Form.Group>
            ) : (
              <Form.Group className="mb-2">
                <Form.Label>
                  {String(form.tipo).toUpperCase() === "PORCENTAJE"
                    ? "Valor (%)"
                    : "Valor (L)"}
                </Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, valor: e.target.value }))
                  }
                  placeholder={form.tipo === "PORCENTAJE" ? "Ej: 10" : "Ej: 50"}
                />
              </Form.Group>
            )}

            <div className="row g-2">
              <div className="col-6">
                <Form.Group className="mb-2">
                  <Form.Label>Fecha inicio</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.fecha_inicio}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fecha_inicio: e.target.value }))
                    }
                  />
                </Form.Group>
              </div>
              <div className="col-6">
                <Form.Group className="mb-2">
                  <Form.Label>Fecha fin</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.fecha_fin}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fecha_fin: e.target.value }))
                    }
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-2">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={form.descripcion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descripcion: e.target.value }))
                }
                placeholder="Opcional"
              />
            </Form.Group>

            <Form.Check
              type="switch"
              id="activoPromo"
              label="Activa"
              checked={Number(form.activo) === 1}
              onChange={(e) =>
                setForm((f) => ({ ...f, activo: e.target.checked ? 1 : 0 }))
              }
            />
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowForm(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Combo Editor */}
      <Modal
        show={showCombo}
        onHide={() => setShowCombo(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Configurar combo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {comboSel ? (
            <ComboEditor
              combo={comboSel}
              onChanged={async () => {
                // refresca listado (por si cambió vigencia/activo desde otro lado)
                await cargar();
              }}
            />
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCombo(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
