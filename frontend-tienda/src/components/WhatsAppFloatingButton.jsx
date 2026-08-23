import { buildWaLink, WHATSAPP_NUMBER } from "../utils/whatsapp.js";

const WhatsAppFloatingButton = () => (
  <a
    href={buildWaLink(WHATSAPP_NUMBER, "Hola, tengo una consulta sobre sus productos.")}
    target="_blank"
    rel="noopener noreferrer"
    className="whatsapp-floating-btn"
    aria-label="Escribirnos por WhatsApp"
  >
    <i className="bi bi-whatsapp"></i>
  </a>
);

export default WhatsAppFloatingButton;
