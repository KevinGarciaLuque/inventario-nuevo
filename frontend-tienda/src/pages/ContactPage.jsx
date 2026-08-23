import { SOCIAL_LINKS, CONTACT_INFO } from "../config/site.js";
import { buildWaLink, WHATSAPP_NUMBER } from "../utils/whatsapp.js";

const ContactPage = () => (
  <div className="container py-5">
    <h1 className="h3 fw-bold mb-4">Contacto y ubicación</h1>

    <div className="row g-5">
      <div className="col-md-5">
        <ul className="list-unstyled d-flex flex-column gap-3">
          <li>
            <strong>WhatsApp</strong>
            <br />
            <a href={buildWaLink(WHATSAPP_NUMBER, "Hola, tengo una consulta.")} target="_blank" rel="noopener noreferrer">
              {CONTACT_INFO.telefonoTexto}
            </a>
          </li>
          <li>
            <strong>Correo</strong>
            <br />
            <a href={`mailto:${CONTACT_INFO.correo}`}>{CONTACT_INFO.correo}</a>
          </li>
          <li>
            <strong>Dirección</strong>
            <br />
            {CONTACT_INFO.direccion}
          </li>
          <li>
            <strong>Horario</strong>
            <br />
            {CONTACT_INFO.horario}
          </li>
          <li>
            <strong>Síguenos</strong>
            <br />
            <div className="d-flex gap-3 fs-4 mt-1">
              <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer"><i className="bi bi-facebook"></i></a>
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer"><i className="bi bi-instagram"></i></a>
              <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener noreferrer"><i className="bi bi-tiktok"></i></a>
            </div>
          </li>
        </ul>
      </div>

      <div className="col-md-7">
        <div className="ratio ratio-4x3 rounded-4 overflow-hidden">
          <iframe
            src={CONTACT_INFO.mapsEmbedUrl}
            title="Ubicación"
            loading="lazy"
            style={{ border: 0 }}
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  </div>
);

export default ContactPage;
