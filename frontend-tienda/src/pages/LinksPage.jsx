import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { FaInstagram, FaFacebookF, FaTiktok, FaWhatsapp, FaShoppingBag } from "react-icons/fa";
import logo from "../assets/LaurenLogo.png";
import { SITE_INFO } from "../config/site.js";
import { buildWaLink } from "../utils/whatsapp.js";
import { useSiteConfig } from "../context/SiteConfigContext.jsx";

const LinksPage = () => {
  const { redes, telefonoPrincipal } = useSiteConfig();
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    QRCode.toDataURL(window.location.href, {
      width: 220,
      margin: 1,
      color: { dark: "#c4415c", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, []);

  return (
  <div className="links-page">
    <div className="links-card">
      <img src={logo} alt={SITE_INFO.nombre} className="links-logo" />
      <h1 className="brand-name links-title">{SITE_INFO.nombre}</h1>
      <p className="links-subtitle">Encuentra nuestras redes y canales de contacto 👇</p>

      <div className="d-flex flex-column gap-3 mt-4">
        <Link to="/productos" className="links-btn links-btn--brand">
          <FaShoppingBag /> Ver catálogo
        </Link>

        <a
          href={redes.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="links-btn links-btn--instagram"
        >
          <FaInstagram /> Instagram
        </a>

        <a
          href={redes.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="links-btn links-btn--facebook"
        >
          <FaFacebookF /> Facebook
        </a>

        <a
          href={redes.tiktok}
          target="_blank"
          rel="noopener noreferrer"
          className="links-btn links-btn--tiktok"
        >
          <FaTiktok /> TikTok
        </a>

        <a
          href={buildWaLink(telefonoPrincipal, "Hola, quiero más información.")}
          target="_blank"
          rel="noopener noreferrer"
          className="links-btn links-btn--whatsapp"
        >
          <FaWhatsapp /> Escríbenos por WhatsApp
        </a>
      </div>

      {qrDataUrl && (
        <div className="links-qr">
          <img src={qrDataUrl} alt="Código QR de este link" />
          <span>Escanea para abrir en tu celular</span>
        </div>
      )}

      <p className="links-footer">{SITE_INFO.nombre}</p>
    </div>
  </div>
  );
};

export default LinksPage;
