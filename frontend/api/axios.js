import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  // withCredentials: true, // solo si usas cookies/sesiones
});

// Interceptor para manejo de errores globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(
        "API Error:",
        error.response.data?.message || error.message
      );
    } else {
      console.error("Error de conexión con el backend.");
    }
    return Promise.reject(
      new Error(
        error.response?.data?.message || error.message || "Unknown error"
      )
    );
  }
);

export default api;

/*import axios from "axios";

// Utiliza la variable del entorno VITE_API_URL del archivo .env
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Configura la instancia de Axios para que todas las peticiones vayan al backend
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  // withCredentials: true, // Descomenta si tu backend usa sesiones/cookies
});

// Interceptores globales para errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(
        "API Error:",
        error.response.data?.message || error.message
      );
    } else {
      console.error("Error de conexión con el backend.");
    }
    return Promise.reject(
      new Error(
        error.response?.data?.message || error.message || "Unknown error"
      )
    );
  }
);

export default api;*/

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
