import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";
import { SOCIAL_LINKS, CONTACT_INFO } from "../config/site.js";
import { WHATSAPP_NUMBER } from "../utils/whatsapp.js";

const SiteConfigContext = createContext(null);

const DEFAULT_CONFIG = {
  redes: { ...SOCIAL_LINKS },
  contacto: {
    correo: CONTACT_INFO.correo,
    direccion: CONTACT_INFO.direccion,
    horario: CONTACT_INFO.horario,
    mapsEmbedUrl: CONTACT_INFO.mapsEmbedUrl,
  },
  telefonoPrincipal: WHATSAPP_NUMBER,
};

export const SiteConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    let activo = true;
    api
      .get("/public/config")
      .then((res) => {
        if (!activo || !res.data) return;
        const d = res.data;
        setConfig({
          redes: {
            facebook: d.redes?.facebook || DEFAULT_CONFIG.redes.facebook,
            instagram: d.redes?.instagram || DEFAULT_CONFIG.redes.instagram,
            tiktok: d.redes?.tiktok || DEFAULT_CONFIG.redes.tiktok,
          },
          contacto: {
            correo: d.contacto?.correo || DEFAULT_CONFIG.contacto.correo,
            direccion: d.contacto?.direccion || DEFAULT_CONFIG.contacto.direccion,
            horario: d.contacto?.horario || DEFAULT_CONFIG.contacto.horario,
            mapsEmbedUrl: d.contacto?.mapsEmbedUrl || DEFAULT_CONFIG.contacto.mapsEmbedUrl,
          },
          telefonoPrincipal: d.telefonoPrincipal || DEFAULT_CONFIG.telefonoPrincipal,
        });
      })
      .catch(() => {
        // se queda con los valores por defecto (config/site.js)
      });

    return () => {
      activo = false;
    };
  }, []);

  return (
    <SiteConfigContext.Provider value={config}>
      {children}
    </SiteConfigContext.Provider>
  );
};

export const useSiteConfig = () => {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error("useSiteConfig debe usarse dentro de SiteConfigProvider");
  return ctx;
};
