import { useSiteConfig } from "../context/SiteConfigContext.jsx";
import { buildWaLink } from "../utils/whatsapp.js";

// Solo los links "embed" de Google Maps pueden ir dentro de un iframe;
// los links normales de "Compartir" (maps.app.goo.gl, /maps/place/...)
// los bloquea Google. Si no es un link insertable, mostramos un botón
// en vez de un cuadro roto.
const esUrlInsertable = (url) =>
  !!url && (url.includes("/maps/embed") || url.includes("output=embed"));

const ContactPage = () => {
  const { redes, contacto, telefonoPrincipal } = useSiteConfig();
  const mapaInsertable = esUrlInsertable(contacto.mapsEmbedUrl);

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
          {mapaInsertable ? (
            <div className="ratio ratio-4x3 rounded-4 overflow-hidden">
              <iframe
                src={contacto.mapsEmbedUrl}
                title="Ubicación"
                loading="lazy"
                style={{ border: 0 }}
                allowFullScreen
              ></iframe>
            </div>
          ) : (
            <div className="contact-map-fallback rounded-4 d-flex flex-column align-items-center justify-content-center text-center p-4">
              <i className="bi bi-geo-alt-fill fs-1 mb-3"></i>
              <p className="mb-3 text-secondary">
                {contacto.direccion || "Visítanos en nuestra tienda"}
              </p>
              {contacto.mapsEmbedUrl && (
                <a
                  href={contacto.mapsEmbedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-warning fw-semibold"
                >
                  Abrir en Google Maps
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
