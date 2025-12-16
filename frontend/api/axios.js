//////////////////////////////////////
// AXIOS CONFIG (PRODUCCIÓN + LOCAL)
//////////////////////////////////////

import axios from "axios";

// ✅ Normaliza baseURL para evitar /api/api
const rawBase = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const normalizeBaseURL = (url) => {
  const u = String(url || "").trim();
  if (!u) return "http://localhost:3000/api";

  // quita slash final
  const noSlashEnd = u.replace(/\/+$/, "");

  // si ya termina en /api lo dejamos, si no, le agregamos /api
  if (noSlashEnd.endsWith("/api")) return noSlashEnd;

  // si ya incluye /api en otro lado, igual lo dejamos tal cual (por seguridad)
  if (noSlashEnd.includes("/api")) return noSlashEnd;

  return `${noSlashEnd}/api`;
};

const API_BASE_URL = normalizeBaseURL(rawBase);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  // withCredentials: true, // ❌ solo si usas cookies (aquí NO)
});

/* =====================================================
   INTERCEPTOR REQUEST
   - Adjunta el token JWT automáticamente
===================================================== */
api.interceptors.request.use(
  (config) => {
    const tokenRaw = localStorage.getItem("token");

    if (tokenRaw) {
      const token = tokenRaw.replace(/^Bearer\s+/i, "").trim();
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* =====================================================
   INTERCEPTOR RESPONSE
   - Manejo global de errores
   - Fuerza logout si token expira (401)
===================================================== */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response) {
      const status = error.response.status;
      const message =
        error.response.data?.message ||
        error.response.data?.error ||
        error.message ||
        "Error desconocido";

      console.error("❌ API Error:", status, message);

      // 🔐 Token inválido / expirado → logout forzado
      if (status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");

        // ✅ evita loop de reload
        const alreadyReloaded = sessionStorage.getItem("forced_logout") === "1";
        if (!alreadyReloaded) {
          sessionStorage.setItem("forced_logout", "1");
          window.location.reload();
        }
      }

      // 🚫 Sin permiso (ej: no admin)
      if (status === 403) {
        return Promise.reject(
          new Error(message || "No tienes permisos para realizar esta acción.")
        );
      }

      return Promise.reject(new Error(message));
    }

    // Error de red / backend caído
    console.error("❌ Error de conexión con el backend.");
    return Promise.reject(new Error("No se pudo conectar con el servidor"));
  }
);

export default api;

/////////////////////////////Trabajar Localmente/////////////////////////////

/*import axios from "axios";

// Si decides cambiar el puerto, solo ajusta aquí:
const API_BASE_URL = "http://127.0.0.1:3000/api";
 // Usa el mismo puerto que tu backend (main.js y backend/index.js)

// Configura la instancia de Axios para que todas las peticiones vayan al backend local
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  // Si tu backend requiere cookies/sesiones:
  // withCredentials: true,
});

// Puedes agregar interceptores para manejar autenticación o errores globales:
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Elegante: Manejo global de errores (puedes mostrar un toast, etc.)
    if (error.response) {
      console.error(
        "Error de API:",
        error.response.data?.message || error.message
      );
    } else {
      console.error("Error de conexión con el backend.");
    }
    return Promise.reject(new Error(error.response?.data?.message || error.message || "Unknown error"));
  }
);

export default api;*/
