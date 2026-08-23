import { useSiteConfig } from "../context/SiteConfigContext.jsx";
import { buildWaLink } from "../utils/whatsapp.js";

const ContactPage = () => {
  const { redes, contacto, telefonoPrincipal } = useSiteConfig();

  return (
    <div className="container py-5">
      <h1 className="h3 fw-bold mb-4">Contacto y ubicación</h1>

      <div className="row g-5">
        <div className="col-md-5">
          <ul className="list-unstyled d-flex flex-column gap-3">
            <li>
              <strong>WhatsApp</strong>
              <br />
              <a href={buildWaLink(telefonoPrincipal, "Hola, tengo una consulta.")} target="_blank" rel="noopener noreferrer">
                {telefonoPrincipal}
              </a>
            </li>
            <li>
              <strong>Correo</strong>
              <br />
              <a href={`mailto:${contacto.correo}`}>{contacto.correo}</a>
            </li>
            <li>
              <strong>Dirección</strong>
              <br />
              {contacto.direccion}
            </li>
            <li>
              <strong>Horario</strong>
              <br />
              {contacto.horario}
            </li>
            <li>
              <strong>Síguenos</strong>
              <br />
              <div className="d-flex gap-3 fs-4 mt-1">
                <a href={redes.facebook} target="_blank" rel="noopener noreferrer"><i className="bi bi-facebook"></i></a>
                <a href={redes.instagram} target="_blank" rel="noopener noreferrer"><i className="bi bi-instagram"></i></a>
                <a href={redes.tiktok} target="_blank" rel="noopener noreferrer"><i className="bi bi-tiktok"></i></a>
              </div>
            </li>
          </ul>
        </div>

        <div className="col-md-7">
          <div className="ratio ratio-4x3 rounded-4 overflow-hidden">
            <iframe
              src={contacto.mapsEmbedUrl}
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
};

export default ContactPage;
