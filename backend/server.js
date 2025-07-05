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
  "https://inventario-nuevo-production.up.railway.app",
  "https://feisty-charisma-production.up.railway.app",
  // Agrega más dominios aquí si usas dominio personalizado
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
app.use("/api/facturas", require("./routes/facturas"));
app.use("/api/clientes", require("./routes/clientes"));

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
});

