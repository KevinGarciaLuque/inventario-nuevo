import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "../context/CartContext.jsx";
import { useFavorites } from "../context/FavoritesContext.jsx";
import { SITE_INFO } from "../config/site.js";
import logo from "../assets/LaurenLogo.png";

const NAV_ITEMS = [
  { to: "/", label: "Inicio", end: true },
  { to: "/productos", label: "Productos" },
  { to: "/sobre-nosotros", label: "Sobre Nosotros" },
  { to: "/contacto", label: "Contacto" },
];

const drawerVariants = {
  hidden: { x: "-100%" },
  visible: {
    x: 0,
    transition: { type: "spring", stiffness: 320, damping: 34 },
  },
  exit: { x: "-100%", transition: { duration: 0.25, ease: "easeIn" } },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const navListVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

const Navbar = ({ onQuieroSerCliente }) => {
  const { totalItems, cartIconRef, bump } = useCart();
  const { items: favoritos } = useFavorites();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const linkClass = ({ isActive }) =>
    "nav-link px-2" + (isActive ? " active-link" : "");

  const drawerLinkClass = ({ isActive }) =>
    "tienda-drawer__link" + (isActive ? " active-link" : "");

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="tienda-navbar sticky-top">
      <nav className="navbar navbar-expand-lg">
        <div className="container d-flex align-items-center justify-content-between flex-nowrap">
          <div className="d-flex align-items-center gap-2">
            <button
              className="tienda-toggler d-lg-none"
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={open}
            >
              <i className="bi bi-list"></i>
            </button>

            <Link to="/" className="navbar-brand d-flex align-items-center gap-2 mb-0" onClick={close}>
              <img src={logo} alt={SITE_INFO.nombre} className="brand-logo" />
              <span className="brand-name">{SITE_INFO.nombre}</span>
            </Link>
          </div>

          <ul className="navbar-nav d-none d-lg-flex flex-row align-items-center gap-1 mb-0">
            {NAV_ITEMS.map((item) => (
              <li className="nav-item" key={item.to}>
                <NavLink to={item.to} end={item.end} className={linkClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-warning btn-sm fw-semibold d-none d-lg-inline-block"
              onClick={onQuieroSerCliente}
            >
              Quiero ser cliente
            </button>

            <Link to="/favoritos" className="btn btn-outline-danger position-relative" onClick={close}>
              <i className="bi bi-heart"></i>
              {favoritos.length > 0 && <span className="cart-badge">{favoritos.length}</span>}
            </Link>

            <motion.div
              key={bump}
              initial={bump ? { scale: 0.8, rotate: -14 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 12 }}
              style={{ display: "inline-block" }}
            >
              <Link
                ref={cartIconRef}
                to="/carrito"
                className="btn btn-warning position-relative"
                onClick={close}
              >
                <i className="bi bi-cart3"></i>
                {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="tienda-drawer-backdrop"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={close}
            />

            <motion.aside
              className="tienda-drawer"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-label="Menú de navegación"
            >
              <div className="tienda-drawer__header">
                <Link to="/" className="navbar-brand d-flex align-items-center gap-2 mb-0" onClick={close}>
                  <img src={logo} alt={SITE_INFO.nombre} className="brand-logo" />
                  <span className="brand-name">{SITE_INFO.nombre}</span>
                </Link>
                <button className="tienda-drawer__close" onClick={close} aria-label="Cerrar menú">
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <motion.ul
                className="tienda-drawer__nav"
                variants={navListVariants}
                initial="hidden"
                animate="visible"
              >
                {NAV_ITEMS.map((item) => (
                  <motion.li key={item.to} variants={navItemVariants}>
                    <NavLink to={item.to} end={item.end} className={drawerLinkClass} onClick={close}>
                      {item.label}
                    </NavLink>
                  </motion.li>
                ))}
              </motion.ul>

              <div className="tienda-drawer__actions">
                <button
                  className="btn btn-outline-warning fw-semibold w-100"
                  onClick={() => {
                    close();
                    onQuieroSerCliente();
                  }}
                >
                  Quiero ser cliente
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
