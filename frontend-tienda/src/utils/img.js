// src/utils/img.js
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// La API vive en <backend>/api, los archivos subidos en <backend>/uploads
const UPLOADS_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="#f1f3f5"/>
      <text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="#adb5bd" text-anchor="middle" dy=".3em">Sin imagen</text>
    </svg>`,
  );

export const getImgSrc = (imagen) => {
  if (!imagen) return PLACEHOLDER;

  // Si la URL apunta a /uploads/... (aunque sea con un dominio viejo guardado
  // en la BD), la reconstruimos contra el backend actual.
  const idx = String(imagen).indexOf("/uploads/");
  if (idx !== -1) return UPLOADS_BASE_URL + imagen.slice(idx);

  if (imagen.startsWith("http")) return imagen;
  if (imagen.startsWith("uploads")) return `${UPLOADS_BASE_URL}/${imagen}`;
  return `${UPLOADS_BASE_URL}/uploads/${imagen}`;
};

export default getImgSrc;
