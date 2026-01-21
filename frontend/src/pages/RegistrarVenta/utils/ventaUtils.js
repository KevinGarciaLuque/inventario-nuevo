// frontend/src/pages/RegistrarVenta/utils/ventaUtils.js
// ✅ Base para imágenes (derivado de VITE_API_URL, quitando /api)
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const FILES_BASE_URL = API_BASE_URL.replace(/\/api\/?$/i, "");

export const getImgSrc = (imagen) => {
  if (!imagen) return "/default.jpg";
  if (imagen.startsWith("http")) return imagen;
  if (imagen.startsWith("/uploads")) return FILES_BASE_URL + imagen;
  if (imagen.startsWith("uploads")) return `${FILES_BASE_URL}/${imagen}`;
  return `${FILES_BASE_URL}/uploads/${imagen}`;
};

export const limpiarCodigo = (codigo) => (codigo ?? "").trim().toUpperCase();
