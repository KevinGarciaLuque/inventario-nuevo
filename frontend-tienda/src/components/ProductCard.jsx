import { Link } from "react-router-dom";
import { getImgSrc } from "../utils/img.js";
import { buildWaLink, mensajeMayorista, WHATSAPP_NUMBER } from "../utils/whatsapp.js";
import { useCart } from "../context/CartContext.jsx";

const money = (n) => `L ${Number(n || 0).toFixed(2)}`;

const ProductCard = ({ producto }) => {
  const { addItem } = useCart();

  const precioFinal =
    producto.descuento > 0
      ? producto.precio * (1 - producto.descuento / 100)
      : producto.precio;

  return (
    <div className="product-card h-100 d-flex flex-column">
      <Link to={`/producto/${producto.id}`} className="product-card-img-wrap">
        <img src={getImgSrc(producto.imagen)} alt={producto.nombre} loading="lazy" />
        {producto.descuento > 0 && (
          <span className="badge bg-danger product-card-badge">-{producto.descuento}%</span>
        )}
      </Link>

      <div className="p-3 d-flex flex-column flex-grow-1">
        {producto.categoria && (
          <span className="text-uppercase text-secondary small mb-1">{producto.categoria}</span>
        )}
        <Link to={`/producto/${producto.id}`} className="product-card-title">
          {producto.nombre}
        </Link>

        <div className="mt-2 mb-3">
          {producto.descuento > 0 && (
            <span className="text-decoration-line-through text-secondary small me-2">
              {money(producto.precio)}
            </span>
          )}
          <span className="fw-bold fs-5">{money(precioFinal)}</span>
        </div>

        <div className="mt-auto d-flex flex-column gap-2">
          <button
            className="btn btn-warning fw-semibold btn-sm"
            onClick={() => addItem(producto)}
          >
            <i className="bi bi-cart-plus me-1"></i> Agregar al carrito
          </button>
          <a
            className="btn btn-outline-success btn-sm"
            href={buildWaLink(WHATSAPP_NUMBER, mensajeMayorista(producto))}
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="bi bi-whatsapp me-1"></i> Precio mayorista
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
