import { useRef } from "react";
import { Link } from "react-router-dom";
import { getImgSrc } from "../utils/img.js";
import { buildWaLink, mensajeMayorista } from "../utils/whatsapp.js";
import { useCart } from "../context/CartContext.jsx";
import { useSiteConfig } from "../context/SiteConfigContext.jsx";
import { useFavorites } from "../context/FavoritesContext.jsx";

const money = (n) => `L ${Number(n || 0).toFixed(2)}`;
const DIAS_PARA_SER_NUEVO = 14;

const esNuevo = (creadoEn) => {
  if (!creadoEn) return false;
  const dias = (Date.now() - new Date(creadoEn).getTime()) / (1000 * 60 * 60 * 24);
  return dias <= DIAS_PARA_SER_NUEVO;
};

const ProductCard = ({ producto }) => {
  const { addItem, flyToCart } = useCart();
  const { telefonoPrincipal } = useSiteConfig();
  const { isFavorite, toggleFavorite } = useFavorites();
  const imgRef = useRef(null);

  const handleAgregar = () => {
    addItem(producto);
    flyToCart(imgRef.current, producto.imagen);
  };

  const precioFinal =
    producto.descuento > 0
      ? producto.precio * (1 - producto.descuento / 100)
      : producto.precio;

  const stockBajo =
    producto.stock > 0 &&
    producto.stock_minimo != null &&
    producto.stock <= producto.stock_minimo;

  const favorito = isFavorite(producto.id);

  return (
    <div className="product-card h-100 d-flex flex-column">
      <div className="product-card-img-wrap">
        <Link to={`/producto/${producto.id}`}>
          <img ref={imgRef} src={getImgSrc(producto.imagen)} alt={producto.nombre} loading="lazy" />
        </Link>

        <div className="product-card-badges">
          {producto.descuento > 0 && (
            <span className="badge bg-danger">-{producto.descuento}%</span>
          )}
          {stockBajo && (
            <span className="badge product-card-badge--stock">¡Últimas unidades!</span>
          )}
          {esNuevo(producto.creado_en) && (
            <span className="badge product-card-badge--nuevo">Nuevo</span>
          )}
        </div>

        <button
          type="button"
          className={`product-card-fav ${favorito ? "product-card-fav--active" : ""}`}
          onClick={() => toggleFavorite(producto)}
          aria-label={favorito ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          <i className={favorito ? "bi bi-heart-fill" : "bi bi-heart"}></i>
        </button>
      </div>

      <div className="p-3 d-flex flex-column flex-grow-1">
        {producto.categoria && (
          <span className="text-uppercase text-secondary small mb-1">{producto.categoria}</span>
        )}
        <Link to={`/producto/${producto.id}`} className="product-card-title">
          {producto.nombre}
        </Link>

        {producto.total_variantes > 1 && (
          <span className="product-card-variantes">
            <i className="bi bi-palette me-1"></i>
            {producto.total_variantes} opciones disponibles
          </span>
        )}

        <div className="mt-2 mb-2">
          {producto.descuento > 0 && (
            <span className="text-decoration-line-through text-secondary small me-2">
              {money(producto.precio)}
            </span>
          )}
          <span className="fw-bold fs-5">{money(precioFinal)}</span>
        </div>

        {producto.stock > 0 && (
          <span className="product-card-stock mb-2">
            <i className="bi bi-box-seam me-1"></i>
            {producto.stock} {producto.unidad_abreviatura || ""} disponibles
          </span>
        )}

        <div className="mt-auto d-flex flex-column gap-2">
          <button
            className="btn btn-warning fw-semibold btn-sm"
            onClick={handleAgregar}
          >
            <i className="bi bi-cart-plus me-1"></i> Agregar al carrito
          </button>
          <a
            className="btn btn-outline-success btn-sm"
            href={buildWaLink(telefonoPrincipal, mensajeMayorista(producto))}
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
