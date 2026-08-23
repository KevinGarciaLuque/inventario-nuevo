import { Link } from "react-router-dom";
import { SITE_INFO } from "../config/site.js";
import { useSiteConfig } from "../context/SiteConfigContext.jsx";
import logo from "../assets/LaurenLogo.png";

const Footer = ({ onQuieroSerCliente }) => {
  const year = new Date().getFullYear();
  const { redes, contacto, telefonoPrincipal } = useSiteConfig();

  return (
    <footer className="tienda-footer">
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-md-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <img src={logo} alt={SITE_INFO.nombre} className="footer-brand-logo" />
              <h5 className="fw-bold mb-0 brand-name">{SITE_INFO.nombre}</h5>
            </div>
            <p className="text-secondary mb-3">{SITE_INFO.descripcion}</p>
            <div className="d-flex gap-3 fs-4">
              {redes.facebook && (
                <a href={redes.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <i className="bi bi-facebook"></i>
                </a>
              )}
              {redes.instagram && (
                <a href={redes.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <i className="bi bi-instagram"></i>
                </a>
              )}
              {redes.tiktok && (
                <a href={redes.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                  <i className="bi bi-tiktok"></i>
                </a>
              )}
            </div>
          </div>

          <div className="col-md-4">
            <h6 className="fw-bold mb-3">Enlaces</h6>
            <ul className="list-unstyled d-flex flex-column gap-2">
              <li><Link to="/productos" className="footer-link">Productos</Link></li>
              <li><Link to="/sobre-nosotros" className="footer-link">Sobre Nosotros</Link></li>
              <li><Link to="/contacto" className="footer-link">Contacto</Link></li>
              <li>
                <button className="footer-link btn btn-link p-0" onClick={onQuieroSerCliente}>
                  Quiero ser cliente
                </button>
              </li>
            </ul>
          </div>

          <div className="col-md-4">
            <h6 className="fw-bold mb-3">Contacto</h6>
            <ul className="list-unstyled d-flex flex-column gap-2 text-secondary">
              <li><i className="bi bi-whatsapp me-2"></i>{telefonoPrincipal}</li>
              <li><i className="bi bi-envelope me-2"></i>{contacto.correo}</li>
              <li><i className="bi bi-geo-alt me-2"></i>{contacto.direccion}</li>
            </ul>
          </div>
        </div>

        <hr className="border-secondary-subtle my-4" />
        <p className="text-secondary text-center mb-0 small">
          © {year} {SITE_INFO.nombre}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
