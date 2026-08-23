import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { getImgSrc } from "../utils/img.js";
import { buildWaLink, mensajePedido } from "../utils/whatsapp.js";
import { useSiteConfig } from "../context/SiteConfigContext.jsx";

const money = (n) => `L ${Number(n || 0).toFixed(2)}`;

const CartPage = () => {
  const { items, removeItem, updateQty, totalPrecio, clear } = useCart();
  const { telefonoPrincipal } = useSiteConfig();

  if (items.length === 0) {
    return (
      <div className="container py-5 text-center">
        <h1 className="h3 fw-bold mb-3">Tu carrito está vacío</h1>
        <p className="text-secondary mb-4">Agrega productos desde el catálogo.</p>
        <Link to="/productos" className="btn btn-warning fw-semibold">Ver productos</Link>
      </div>
    );
  }

  const handleEnviarPedido = () => {
    const link = buildWaLink(telefonoPrincipal, mensajePedido(items));
    window.open(link, "_blank", "noopener,noreferrer");
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
            <button className="btn btn-success w-100 fw-semibold" onClick={handleEnviarPedido}>
              <i className="bi bi-whatsapp me-2"></i> Enviar pedido por WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
