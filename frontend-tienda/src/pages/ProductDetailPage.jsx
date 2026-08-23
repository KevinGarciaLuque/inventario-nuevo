import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios.js";
import { getImgSrc } from "../utils/img.js";
import { buildWaLink, mensajeMayorista, WHATSAPP_NUMBER } from "../utils/whatsapp.js";
import { useCart } from "../context/CartContext.jsx";

const money = (n) => `L ${Number(n || 0).toFixed(2)}`;

const ProductDetailPage = () => {
  const { id } = useParams();
  const { addItem } = useCart();

  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    setAgregado(false);

    api
      .get(`/public/productos/${id}`)
      .then((res) => activo && setProducto(res.data))
      .catch(() => activo && setError("Producto no encontrado."))
      .finally(() => activo && setCargando(false));

    return () => {
      activo = false;
    };
  }, [id]);

  if (cargando) return <div className="container py-5">Cargando...</div>;

  if (error || !producto) {
    return (
      <div className="container py-5 text-center">
        <p className="text-danger">{error || "Producto no encontrado."}</p>
        <Link to="/productos" className="btn btn-warning">Volver al catálogo</Link>
      </div>
    );
  }

  const precioFinal =
    producto.descuento > 0
      ? producto.precio * (1 - producto.descuento / 100)
      : producto.precio;

  const handleAgregar = () => {
    addItem(producto, cantidad);
    setAgregado(true);
  };

  return (
    <div className="container py-5">
      <nav className="mb-4 small">
        <Link to="/productos" className="text-decoration-none">Productos</Link>
        {producto.categoria && (
          <>
            {" / "}
            <Link to={`/categoria/${producto.categoria_id}`} className="text-decoration-none">
              {producto.categoria}
            </Link>
          </>
        )}
        {" / "}
        <span className="text-secondary">{producto.nombre}</span>
      </nav>

      <div className="row g-5">
        <div className="col-md-6">
          <img
            src={getImgSrc(producto.imagen)}
            alt={producto.nombre}
            className="img-fluid rounded-4 w-100 product-detail-img"
          />
        </div>

        <div className="col-md-6">
          {producto.categoria && (
            <span className="text-uppercase text-secondary small">{producto.categoria}</span>
          )}
          <h1 className="h3 fw-bold mt-1">{producto.nombre}</h1>

          <div className="my-3">
            {producto.descuento > 0 && (
              <span className="text-decoration-line-through text-secondary me-2">
                {money(producto.precio)}
              </span>
            )}
            <span className="fs-3 fw-bold">{money(precioFinal)}</span>
          </div>

          {producto.descripcion && (
            <p className="text-secondary">{producto.descripcion}</p>
          )}

          <ul className="list-unstyled small text-secondary">
            <li><strong>Código:</strong> {producto.codigo}</li>
            {producto.contenido_medida && producto.unidad_nombre && (
              <li>
                <strong>Contenido:</strong> {producto.contenido_medida} {producto.unidad_abreviatura || producto.unidad_nombre}
              </li>
            )}
            <li><strong>Disponibilidad:</strong> {producto.stock > 0 ? "En stock" : "Agotado"}</li>
          </ul>

          <div className="d-flex align-items-center gap-2 my-4">
            <label className="me-2 fw-semibold">Cantidad:</label>
            <div className="input-group" style={{ maxWidth: 140 }}>
              <button className="btn btn-outline-secondary" onClick={() => setCantidad((c) => Math.max(1, c - 1))}>-</button>
              <input
                type="number"
                className="form-control text-center"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
              />
              <button className="btn btn-outline-secondary" onClick={() => setCantidad((c) => c + 1)}>+</button>
            </div>
          </div>

          <div className="d-flex flex-column flex-sm-row gap-2">
            <button className="btn btn-warning btn-lg fw-semibold" onClick={handleAgregar}>
              <i className="bi bi-cart-plus me-2"></i>
              {agregado ? "¡Agregado!" : "Agregar al carrito"}
            </button>
            <a
              className="btn btn-outline-success btn-lg"
              href={buildWaLink(WHATSAPP_NUMBER, mensajeMayorista(producto))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="bi bi-whatsapp me-2"></i> Solicitar precio mayorista
            </a>
          </div>

          {agregado && (
            <p className="text-success small mt-3">
              Producto agregado al carrito. <Link to="/carrito">Ver carrito →</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
