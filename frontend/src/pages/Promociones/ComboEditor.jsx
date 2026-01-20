// src/pages/Promociones/ComboEditor.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  InputGroup,
  Table,
  Badge,
  Spinner,
} from "react-bootstrap";
import { FaPlus, FaTrash, FaSave, FaSearch } from "react-icons/fa";
import {
  getPromocionDetalle,
  getProductos,
  addProductoCombo,
  updateComboItem,
  setComboItemEstado,
  deleteComboItem,
} from "./promocionService";

const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? parseInt(n, 10) : def;
};

export default function ComboEditor({ combo, onChanged }) {
  const comboId = Number(combo?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [detalle, setDetalle] = useState([]); // items del combo
  const [error, setError] = useState("");

  // buscador de productos
  const [qProd, setQProd] = useState("");
  const [prodLoading, setProdLoading] = useState(false);
  const [productos, setProductos] = useState([]);

  // agregar
  const [nuevo, setNuevo] = useState({
    producto_id: "",
    cantidad: 1,
    es_regalo: 0,
    activo: 1,
  });

  const cargarDetalle = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getPromocionDetalle(comboId);
      const items = data?.productos || [];
      setDetalle(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message || "No se pudo cargar el detalle del combo."
      );
      setDetalle([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!comboId) return;
    cargarDetalle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comboId]);

  const buscarProductos = async () => {
    try {
      setProdLoading(true);
      const data = await getProductos(qProd);
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setProductos([]);
    } finally {
      setProdLoading(false);
    }
  };

  useEffect(() => {
    // carga inicial de productos (rápida)
    buscarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalItems = detalle.length;

  const resumen = useMemo(() => {
    const pagados = detalle.filter((i) => Number(i.es_regalo) !== 1);
    const regalos = detalle.filter((i) => Number(i.es_regalo) === 1);

    const sumaPagados = pagados.reduce(
      (acc, it) => acc + Number(it.cantidad || 0),
      0
    );
    const sumaRegalos = regalos.reduce(
      (acc, it) => acc + Number(it.cantidad || 0),
      0
    );

    return { pagados: sumaPagados, regalos: sumaRegalos };
  }, [detalle]);

  const agregar = async () => {
    const producto_id = toInt(nuevo.producto_id, 0);
    const cantidad = toInt(nuevo.cantidad, 0);
    const es_regalo = Number(nuevo.es_regalo) === 1 ? 1 : 0;
    const activo = Number(nuevo.activo) === 0 ? 0 : 1;

    if (!producto_id) return setError("Selecciona un producto.");
    if (!cantidad || cantidad <= 0)
      return setError("La cantidad debe ser mayor que 0.");

    try {
      setSaving(true);
      setError("");
      await addProductoCombo({
        promocion_id: comboId,
        producto_id,
        cantidad,
        es_regalo,
        activo,
      });
      setNuevo({ producto_id: "", cantidad: 1, es_regalo: 0, activo: 1 });
      await cargarDetalle();
      onChanged?.();
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message || "No se pudo agregar el producto al combo."
      );
    } finally {
      setSaving(false);
    }
  };

  const actualizarItem = async (itemId, patch) => {
    try {
      setSaving(true);
      setError("");
      await updateComboItem(itemId, patch);
      await cargarDetalle();
      onChanged?.();
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message ||
          "No se pudo actualizar el producto del combo."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = async (item) => {
    try {
      setSaving(true);
      setError("");
      const nuevoEstado = Number(item.activo) === 1 ? 0 : 1;
      await setComboItemEstado(item.id, nuevoEstado);
      await cargarDetalle();
      onChanged?.();
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message || "No se pudo cambiar el estado del item."
      );
    } finally {
      setSaving(false);
    }
  };

  const quitar = async (item) => {
    const ok = window.confirm(
      `¿Quitar "${item?.producto_nombre || "producto"}" del combo?`
    );
    if (!ok) return;

    try {
      setSaving(true);
      setError("");
      await deleteComboItem(item.id);
      await cargarDetalle();
      onChanged?.();
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message || "No se pudo quitar el producto del combo."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-2 mb-3">
        <div>
          <div className="fw-bold">{combo?.nombre}</div>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Precio combo: <b>L {Number(combo?.precio_combo ?? 0).toFixed(2)}</b>
          </div>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Badge bg="dark">Items: {totalItems}</Badge>
          <Badge bg="primary">Pagados: {resumen.pagados}</Badge>
          <Badge bg="success">Regalos: {resumen.regalos}</Badge>
        </div>
      </div>

      {error ? <div className="alert alert-danger py-2">{error}</div> : null}

      {/* Buscar productos del inventario */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex flex-column flex-lg-row gap-2 align-items-lg-center justify-content-between">
            <InputGroup style={{ maxWidth: 520 }}>
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                value={qProd}
                onChange={(e) => setQProd(e.target.value)}
                placeholder="Buscar producto..."
              />
              <Button
                variant="outline-primary"
                onClick={buscarProductos}
                disabled={prodLoading}
              >
                {prodLoading ? "..." : "Buscar"}
              </Button>
            </InputGroup>

            <div className="text-muted" style={{ fontSize: 13 }}>
              Tip: agrega productos “pagados” y marca “regalo” para la regalía.
            </div>
          </div>

          {/* Agregar */}
          <div className="row g-2 mt-3">
            <div className="col-12 col-lg-6">
              <Form.Select
                value={nuevo.producto_id}
                onChange={(e) =>
                  setNuevo((n) => ({ ...n, producto_id: e.target.value }))
                }
                disabled={prodLoading}
              >
                <option value="">Seleccionar producto...</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (Stock: {p.stock ?? 0})
                  </option>
                ))}
              </Form.Select>
            </div>

            <div className="col-6 col-lg-2">
              <Form.Control
                type="number"
                min={1}
                value={nuevo.cantidad}
                onChange={(e) =>
                  setNuevo((n) => ({ ...n, cantidad: e.target.value }))
                }
              />
            </div>

            <div className="col-6 col-lg-2 d-flex align-items-center">
              <Form.Check
                type="switch"
                id="esRegalo"
                label="Regalo"
                checked={Number(nuevo.es_regalo) === 1}
                onChange={(e) =>
                  setNuevo((n) => ({
                    ...n,
                    es_regalo: e.target.checked ? 1 : 0,
                  }))
                }
              />
            </div>

            <div className="col-12 col-lg-2">
              <Button className="w-100" onClick={agregar} disabled={saving}>
                <FaPlus className="me-2" />
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de componentes */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="py-4 text-center">
              <Spinner animation="border" />
              <div className="text-muted mt-2">Cargando detalle...</div>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Producto</th>
                    <th>Stock</th>
                    <th style={{ width: 160 }}>Cantidad</th>
                    <th>Regalo</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.map((it) => {
                    const activo = Number(it.activo) === 1;
                    const regalo = Number(it.es_regalo) === 1;

                    return (
                      <tr key={it.id}>
                        <td>
                          <Badge bg={activo ? "success" : "secondary"}>
                            {activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>

                        <td className="fw-semibold">{it.producto_nombre}</td>

                        <td>
                          <Badge
                            bg={
                              Number(it.producto_stock) > 0 ? "dark" : "warning"
                            }
                            text="light"
                          >
                            {Number(it.producto_stock ?? 0)}
                          </Badge>
                        </td>

                        <td>
                          <InputGroup>
                            <Form.Control
                              type="number"
                              min={1}
                              value={it.cantidad}
                              onChange={(e) => {
                                const v = e.target.value;
                                setDetalle((prev) =>
                                  prev.map((x) =>
                                    x.id === it.id ? { ...x, cantidad: v } : x
                                  )
                                );
                              }}
                              disabled={!activo || saving}
                            />
                            <Button
                              variant="outline-success"
                              title="Guardar cantidad"
                              disabled={!activo || saving}
                              onClick={() =>
                                actualizarItem(it.id, {
                                  cantidad: toInt(it.cantidad, 1),
                                })
                              }
                            >
                              <FaSave />
                            </Button>
                          </InputGroup>
                        </td>

                        <td>
                          <Form.Check
                            type="switch"
                            id={`regalo-${it.id}`}
                            checked={regalo}
                            disabled={saving}
                            onChange={(e) =>
                              actualizarItem(it.id, {
                                es_regalo: e.target.checked ? 1 : 0,
                              })
                            }
                            label={regalo ? "Sí" : "No"}
                          />
                        </td>

                        <td
                          className="text-end"
                          style={{ whiteSpace: "nowrap" }}
                        >
                          <Button
                            size="sm"
                            className="me-2"
                            variant={
                              activo ? "outline-warning" : "outline-success"
                            }
                            onClick={() => toggleItem(it)}
                            disabled={saving}
                          >
                            {activo ? "Off" : "On"}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => quitar(it)}
                            disabled={saving}
                            title="Quitar del combo"
                          >
                            <FaTrash />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                  {!detalle.length && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        Este combo aún no tiene productos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
