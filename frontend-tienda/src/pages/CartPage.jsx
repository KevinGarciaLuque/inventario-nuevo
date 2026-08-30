import { useState } from "react";
import { Link } from "react-router-dom";
import { Modal, Button, Form, Spinner, Alert, ToggleButton, ButtonGroup } from "react-bootstrap";
import { useCart } from "../context/CartContext.jsx";
import { getImgSrc } from "../utils/img.js";
import { buildWaLink, mensajePedido } from "../utils/whatsapp.js";
import { useSiteConfig } from "../context/SiteConfigContext.jsx";
import api from "../api/axios.js";

const money = (n) => `L ${Number(n || 0).toFixed(2)}`;

const CartPage = () => {
  const { items, removeItem, updateQty, totalPrecio, clear } = useCart();
  const { telefonoPrincipal } = useSiteConfig();

  const [showModal, setShowModal] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [datos, setDatos] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    entrega: "recoge",
  });

  if (items.length === 0) {
    return (
      <div className="container py-5 text-center">
        <h1 className="h3 fw-bold mb-3">Tu carrito está vacío</h1>
        <p className="text-secondary mb-4">Agrega productos desde el catálogo.</p>
        <Link to="/productos" className="btn btn-warning fw-semibold">Ver productos</Link>
      </div>
    );
  }

  const setCampo = (campo, valor) => setDatos((prev) => ({ ...prev, [campo]: valor }));

  const abrirModal = () => {
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!datos.nombre.trim()) {
      setError("Por favor escribe tu nombre.");
      return;
    }
    if (datos.entrega === "envio" && !datos.direccion.trim()) {
      setError("Para envío a domicilio necesitamos la dirección.");
      return;
    }

    setEnviando(true);
    try {
      await api.post("/public/pedidos", {
        cliente_nombre: datos.nombre.trim(),
        cliente_telefono: datos.telefono.trim(),
        cliente_direccion: datos.direccion.trim(),
        entrega: datos.entrega,
        items: items.map((it) => ({ producto_id: it.id, cantidad: it.cantidad })),
      });

      const link = buildWaLink(telefonoPrincipal, mensajePedido(items, datos));
      window.open(link, "_blank", "noopener,noreferrer");

      clear();
      setShowModal(false);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudo enviar el pedido. Intenta de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="container py-5">
      <h1 className="h3 fw-bold mb-4">Tu carrito</h1>

      <div className="row g-5">
        <div className="col-lg-8">
          {items.map((it) => (
            <div className="cart-row d-flex align-items-center gap-3 py-3 border-bottom" key={it.id}>
              <img src={getImgSrc(it.imagen)} alt={it.nombre} className="cart-row-img" />
              <div className="flex-grow-1">
                <p className="fw-semibold mb-1">{it.nombre}</p>
                <p className="text-secondary small mb-0">{money(it.precio)} c/u</p>
              </div>

              <div className="input-group" style={{ maxWidth: 120 }}>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => updateQty(it.id, it.cantidad - 1)}>-</button>
                <input
                  type="number"
                  className="form-control form-control-sm text-center"
                  value={it.cantidad}
                  min={1}
                  onChange={(e) => updateQty(it.id, Math.max(1, Number(e.target.value) || 1))}
                />
                <button className="btn btn-outline-secondary btn-sm" onClick={() => updateQty(it.id, it.cantidad + 1)}>+</button>
              </div>

              <p className="fw-bold mb-0 text-end" style={{ minWidth: 90 }}>
                {money(it.precio * it.cantidad)}
              </p>

              <button className="btn btn-link text-danger" onClick={() => removeItem(it.id)} aria-label="Eliminar">
                <i className="bi bi-trash"></i>
              </button>
            </div>
          ))}

          <button className="btn btn-link text-secondary mt-2 p-0" onClick={clear}>
            Vaciar carrito
          </button>
        </div>

        <div className="col-lg-4">
          <div className="cart-summary p-4 rounded-4">
            <h5 className="fw-bold mb-3">Resumen</h5>
            <div className="d-flex justify-content-between mb-2">
              <span>Total aproximado</span>
              <span className="fw-bold">{money(totalPrecio)}</span>
            </div>
            <p className="text-secondary small">
              El total puede variar según impuestos y descuentos al confirmar tu pedido.
            </p>
            <button className="btn btn-success w-100 fw-semibold" onClick={abrirModal}>
              <i className="bi bi-whatsapp me-2"></i> Enviar pedido por WhatsApp
            </button>
          </div>
        </div>
      </div>

      <Modal show={showModal} onHide={() => !enviando && setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Datos para tu pedido</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <p className="text-secondary small">
              Necesitamos estos datos para preparar tu pedido antes de enviarlo por WhatsApp.
            </p>

            {error && <Alert variant="danger" className="py-2">{error}</Alert>}

            <Form.Group className="mb-3">
              <Form.Label>Nombre completo *</Form.Label>
              <Form.Control
                value={datos.nombre}
                onChange={(e) => setCampo("nombre", e.target.value)}
                autoFocus
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Teléfono</Form.Label>
              <Form.Control
                value={datos.telefono}
                onChange={(e) => setCampo("telefono", e.target.value)}
                placeholder="Ej. 9999-9999"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="d-block">¿Cómo quieres recibir tu pedido?</Form.Label>
              <ButtonGroup className="w-100">
                <ToggleButton
                  id="entrega-recoge"
                  type="radio"
                  variant="outline-warning"
                  name="entrega"
                  value="recoge"
                  checked={datos.entrega === "recoge"}
                  onChange={() => setCampo("entrega", "recoge")}
                >
                  <i className="bi bi-shop me-1"></i> Recoger en el local
                </ToggleButton>
                <ToggleButton
                  id="entrega-envio"
                  type="radio"
                  variant="outline-warning"
                  name="entrega"
                  value="envio"
                  checked={datos.entrega === "envio"}
                  onChange={() => setCampo("entrega", "envio")}
                >
                  <i className="bi bi-truck me-1"></i> Envío a domicilio
                </ToggleButton>
              </ButtonGroup>
            </Form.Group>

            {datos.entrega === "envio" && (
              <Form.Group>
                <Form.Label>Dirección de envío *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={datos.direccion}
                  onChange={(e) => setCampo("direccion", e.target.value)}
                />
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button variant="success" type="submit" disabled={enviando}>
              {enviando ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <>
                  <i className="bi bi-whatsapp me-2"></i> Enviar por WhatsApp
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default CartPage;
