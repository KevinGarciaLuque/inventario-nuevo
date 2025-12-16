// ===========================
// SERVER / INDEX (PROD + LOCAL)
// ===========================
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

if (process.pkg) {
  const cp = require("child_process");
  cp.spawn = cp.spawn.bind(null, { windowsHide: true });
}

const app = express();

/* =====================================================
   1) LOGS de errores globales (por si algo revienta)
===================================================== */
process.on("uncaughtException", (err) => {
  try {
    const logDir = process.cwd();
    const logFile = path.join(logDir, "backend-error.log");
    const mensaje = `[${new Date().toISOString()}] ❌ ERROR NO CONTROLADO:\n${
      err.stack
    }\n\n`;
    fs.appendFileSync(logFile, mensaje);
  } catch (e) {
    console.error("No se pudo escribir backend-error.log", e);
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ PROMESA NO CONTROLADA:", reason);
});

/* =====================================================
   2) CORS (LOCAL + PRODUCCIÓN)
   - Usa FRONTEND_URL si existe
   - Permite Railway y localhost
===================================================== */
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://inventario-nuevo-production.up.railway.app",
  "https://feisty-charisma-production.up.railway.app",
  process.env.FRONTEND_URL, // ✅ opcional (por si usas dominio propio)
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // origin undefined => Postman / apps móviles / curl
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error("No permitido por CORS: " + origin));
    },
    credentials: true,
  })
);

/* =====================================================
   3) Parsers
===================================================== */
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

/* =====================================================
   4) Carpeta pública para archivos subidos
===================================================== */
const uploadsPath = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log("📁 Carpeta 'uploads' creada automáticamente.");
}
app.use("/uploads", express.static(uploadsPath));

/* =====================================================
   5) Middleware de autenticación JWT
   - Protege todas las rutas excepto /api/auth
===================================================== */
const authMiddleware = require("./middleware/authMiddleware");

/* =====================================================
   6) Rutas públicas
   - SOLO auth (login)
===================================================== */
app.use("/api/auth", require("./routes/auth"));

/* =====================================================
   7) Rutas protegidas (REQUIEREN TOKEN)
   ✅ Esto evita que cualquiera consuma tu API sin login
===================================================== */
app.use("/api/usuarios", authMiddleware, require("./routes/usuarios"));
app.use("/api/productos", authMiddleware, require("./routes/productos"));
app.use("/api/categorias", authMiddleware, require("./routes/categorias"));
app.use("/api/ubicaciones", authMiddleware, require("./routes/ubicaciones"));
app.use("/api/movimientos", authMiddleware, require("./routes/movimientos"));
app.use("/api/bitacora", authMiddleware, require("./routes/bitacora"));
app.use("/api/upload", authMiddleware, require("./routes/upload"));
app.use("/api/cai", authMiddleware, require("./routes/cai"));
app.use("/api/ventas", authMiddleware, require("./routes/ventas"));
app.use("/api/facturas", authMiddleware, require("./routes/facturas"));
app.use("/api/clientes", authMiddleware, require("./routes/clientes"));
app.use("/api/unidades", authMiddleware, require("./routes/unidades"));

/* =====================================================
   8) Health check
===================================================== */
app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

/* =====================================================
   9) Manejo de errores (CORS u otros)
===================================================== */
app.use((err, req, res, next) => {
  console.error("❌ Error middleware:", err.message || err);
  res.status(500).json({ message: err.message || "Error del servidor" });
});

/* =====================================================
   10) Iniciar servidor
===================================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend corriendo en http://127.0.0.1:${PORT}`);
});

//////////////////////////////////////Trabajar Localmente///////////////////////////////////////////
/*const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

if (process.pkg) {
  const cp = require("child_process");
  cp.spawn = cp.spawn.bind(null, { windowsHide: true });
}

const app = express();

// === Captura de errores globales no controlados ===
process.on("uncaughtException", (err) => {
  const logDir = process.cwd();
  const logFile = path.join(logDir, "backend-error.log");
  const mensaje = `[${new Date().toISOString()}] ❌ ERROR NO CONTROLADO:\n${
    err.stack
  }\n\n`;
  fs.appendFileSync(logFile, mensaje);
});

// === Configuración de CORS (permitir localhost y producción) ===
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL, // Para producción, define esta variable en tu .env
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("No permitido por CORS"));
      }
    },
    credentials: true,
  })
);

// === Middleware para parsear JSON ===
app.use(express.json());

// === Rutas API ===
app.use("/api/auth", require("./routes/auth"));
app.use("/api/usuarios", require("./routes/usuarios"));
app.use("/api/productos", require("./routes/productos"));
app.use("/api/categorias", require("./routes/categorias"));
app.use("/api/ubicaciones", require("./routes/ubicaciones"));
app.use("/api/movimientos", require("./routes/movimientos"));
app.use("/api/bitacora", require("./routes/bitacora"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/cai", require("./routes/cai"));
app.use("/api/ventas", require("./routes/ventas"));
app.use("/api/facturas", require("./routes/facturas")); // <--- La nueva ruta con detalle de facturas
app.use("/api/clientes", require("./routes/clientes")); // <--- Nueva ruta para buscar clientes
app.use("/api/unidades", require("./routes/unidades"));


// === Carpeta pública para archivos subidos ===
const uploadsPath = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log("📁 Carpeta 'uploads' creada automáticamente.");
}
app.use("/uploads", express.static(uploadsPath));

// === Iniciar el servidor ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend corriendo en http://127.0.0.1:${PORT}`);
});*/
