import { buildWaLink } from "../utils/whatsapp.js";
import { useSiteConfig } from "../context/SiteConfigContext.jsx";

const WhatsAppFloatingButton = () => {
  const { telefonoPrincipal } = useSiteConfig();

  return (
    <a
      href={buildWaLink(telefonoPrincipal, "Hola, tengo una consulta sobre sus productos.")}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-floating-btn"
      aria-label="Escribirnos por WhatsApp"
    >
      <i className="bi bi-whatsapp"></i>
    </a>
  );
};

export default WhatsAppFloatingButton;
