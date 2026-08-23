import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useFavorites } from "../context/FavoritesContext.jsx";
import { SITE_INFO } from "../config/site.js";
import logo from "../assets/LaurenLogo.png";

const Navbar = ({ onQuieroSerCliente }) => {
  const { totalItems } = useCart();
  const { items: favoritos } = useFavorites();
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    "nav-link px-2" + (isActive ? " active-link" : "");

  return (
    <header className="tienda-navbar sticky-top">
      <nav className="navbar navbar-expand-lg">
        <div className="container">
          <Link
            to="/"
            className="navbar-brand d-flex align-items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <img src={logo} alt={SITE_INFO.nombre} className="brand-logo" />
            <span className="brand-name">{SITE_INFO.nombre}</span>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className={`collapse navbar-collapse ${open ? "show" : ""}`}>
            <ul className="navbar-nav me-auto mb-2 mb-lg-0" onClick={() => setOpen(false)}>
              <li className="nav-item"><NavLink to="/" end className={linkClass}>Inicio</NavLink></li>
              <li className="nav-item"><NavLink to="/productos" className={linkClass}>Productos</NavLink></li>
              <li className="nav-item"><NavLink to="/sobre-nosotros" className={linkClass}>Sobre Nosotros</NavLink></li>
              <li className="nav-item"><NavLink to="/contacto" className={linkClass}>Contacto</NavLink></li>
            </ul>

            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-outline-warning btn-sm fw-semibold"
                onClick={() => {
                  setOpen(false);
                  onQuieroSerCliente();
                }}
              >
                Quiero ser cliente
              </button>

              <Link to="/favoritos" className="btn btn-outline-danger position-relative" onClick={() => setOpen(false)}>
                <i className="bi bi-heart"></i>
                {favoritos.length > 0 && (
                  <span className="cart-badge">{favoritos.length}</span>
                )}
              </Link>

              <Link to="/carrito" className="btn btn-warning position-relative" onClick={() => setOpen(false)}>
                <i className="bi bi-cart3"></i>
                {totalItems > 0 && (
                  <span className="cart-badge">{totalItems}</span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
