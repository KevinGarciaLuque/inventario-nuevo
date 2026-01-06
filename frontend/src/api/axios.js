// src/api/axios.js
/*import axios from "axios";

// ✅ Usa .env si existe, si no, cae a local
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ✅ Helper: token limpio (por si se guardó con comillas o con "Bearer ")
const getToken = () => {
  const raw = localStorage.getItem("token");
  if (!raw) return null;

  // Quita comillas si quedó guardado como JSON string
  const cleaned = raw.replace(/^"+|"+$/g, "").trim();

  // Si ya trae Bearer, lo quitamos para evitar "Bearer Bearer"
  if (cleaned.toLowerCase().startsWith("bearer ")) {
    return cleaned.slice(7).trim();
  }

  return cleaned;
};

// ✅ REQUEST INTERCEPTOR: Adjunta el token en cada petición
api.interceptors.request.use(
  (config) => {
    const token = getToken();

    // Evita mutar headers si vienen undefined
    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Si no hay token, mejor eliminar Authorization si quedó pegado
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ RESPONSE INTERCEPTOR: Manejo global de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const msg =
      error.response?.data?.message || error.message || "Error desconocido";

    if (status === 401) {
      console.error("❌ 401 No autenticado:", msg);

      // ✅ opcional recomendado: limpiar token si ya no sirve
      // localStorage.removeItem("token");
      // localStorage.removeItem("user");
      // window.location.href = "/";
    } else {
      console.error("❌ Error de API:", msg);
    }

    return Promise.reject(new Error(msg));
  }
);

export default api;*/


import axios from "axios";

/* =====================================================
   BASE URL
   - Producción (Railway): VITE_API_URL
   - Local fallback
===================================================== */
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

/* =====================================================
   Instancia axios
===================================================== */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // ⏱️ evita cuelgues silenciosos
});

/* =====================================================
   Helper: obtener token limpio
===================================================== */
const getToken = () => {
  const raw = localStorage.getItem("token");
  if (!raw) return null;

  // Quita comillas si se guardó como string JSON
  const cleaned = raw.replace(/^"+|"+$/g, "").trim();

  // Evita "Bearer Bearer xxx"
  if (cleaned.toLowerCase().startsWith("bearer ")) {
    return cleaned.slice(7).trim();
  }

  return cleaned;
};

/* =====================================================
   REQUEST INTERCEPTOR
   - Adjunta JWT automáticamente
===================================================== */
api.interceptors.request.use(
  (config) => {
    const token = getToken();

    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* =====================================================
   RESPONSE INTERCEPTOR
   - Manejo global de errores
===================================================== */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const msg =
      error.response?.data?.message || error.message || "Error desconocido";

    if (status === 401) {
      console.error("❌ 401 No autenticado:", msg);

      // 🔐 Opcional PRO (recomendado en apps reales)
      // localStorage.removeItem("token");
      // localStorage.removeItem("user");
      // window.location.href = "/";
    } else if (status === 403) {
      console.error("⛔ 403 Acceso denegado:", msg);
    } else {
      console.error("❌ Error de API:", msg);
    }

    return Promise.reject(new Error(msg));
  }
);

export default api;

