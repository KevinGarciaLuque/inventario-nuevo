// server.js (PROD + LOCAL + RAILWAY) - COMPLETO Y CORREGIDO
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// ✅ En local carga backend/.env (en Railway las env vars ya vienen del panel)
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();

/* ===========================
   LOGS de errores globales
=========================== */
process.on("uncaughtException", (err) => {
  try {
    const logFile = path.join(process.cwd(), "backend-error.log"); // ✅ mejor para Railway/local
    fs.appendFileSync(
      logFile,
      `[${new Date().toISOString()}] ❌ uncaughtException:\n${err.stack}\n\n`
    );
  } catch (e) {
    console.error("No se pudo escribir backend-error.log", e);
  }
  console.error("❌ uncaughtException:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ unhandledRejection:", reason);
});

/* ===========================
   CORS (LOCAL + PRODUCCIÓN)
   - Railway puede servir con varios dominios
   - Permite FRONTEND_URL si lo seteas en Railway
=========================== */
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL, // ✅ pon aquí tu dominio frontend en Railway/Hostinger si aplica
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman/curl

      // ✅ permite tus orígenes permitidos
      if (allowedOrigins.includes(origin)) return cb(null, true);

      // ✅ opcional: permitir cualquier subdominio *.up.railway.app (útil si cambia)
      if (origin.endsWith(".up.railway.app")) return cb(null, true);

      return cb(new Error("No permitido por CORS: " + origin));
    },
    credentials: false, // ✅ en tu app usas Bearer token, no cookies
  })
);

/* ===========================
   Parsers
=========================== */
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

/* ===========================
   uploads (Railway + local)
=========================== */
const uploadsPath = path.join(process.cwd(), "uploads"); // ✅ process.cwd() funciona bien en Railway
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log("📁 Carpeta 'uploads' creada automáticamente.");
}
app.use("/uploads", express.static(uploadsPath));

/* ===========================
   Health check
=========================== */
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || "local",
    port: Number(process.env.PORT) || 3000,
    db: process.env.DB_NAME || null,
    timestamp: new Date().toISOString(),
  });
});

/* ===========================
   Middleware JWT (protector)
=========================== */
// ⚠️ Asegúrate que este archivo exista:
// backend/middleware/auth.js  (o cambia el require a tu nombre real)
const auth = require("./middleware/auth");

/* ===========================
   Rutas
=========================== */
// ✅ AUTH (LOGIN) - NO protegido
app.use("/api/auth", require("./routes/auth"));

// ✅ Rutas protegidas
app.use("/api/usuarios", auth, require("./routes/usuarios"));
app.use("/api/productos", auth, require("./routes/productos"));
app.use("/api/categorias", auth, require("./routes/categorias"));
app.use("/api/ubicaciones", auth, require("./routes/ubicaciones"));
app.use("/api/movimientos", auth, require("./routes/movimientos"));
app.use("/api/bitacora", auth, require("./routes/bitacora"));
app.use("/api/upload", auth, require("./routes/upload"));
app.use("/api/cai", auth, require("./routes/cai"));
app.use("/api/ventas", auth, require("./routes/ventas"));
app.use("/api/facturas", auth, require("./routes/facturas"));
app.use("/api/clientes", auth, require("./routes/clientes"));
app.use("/api/unidades", auth, require("./routes/unidades"));
app.use("/api/caja", auth, require("./routes/caja"));

/* ===========================
   404 (al final)
=========================== */
app.use((req, res) => {
  res
    .status(404)
    .json({ message: "Ruta no encontrada", path: req.originalUrl });
});

/* ===========================
   Error handler
=========================== */
app.use((err, req, res, next) => {
  console.error("❌ Error middleware:", err.message || err);
  res.status(500).json({ message: err.message || "Error del servidor" });
});

/* ===========================
   Start
=========================== */
const PORT = Number(process.env.PORT) || 3000;

console.log("✅ Iniciando backend...");
console.log("📌 PORT:", PORT);
console.log(
  "📌 DB:",
  process.env.DB_HOST,
  process.env.DB_PORT,
  process.env.DB_NAME
);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend corriendo en http://127.0.0.1:${PORT}`);
});

server.on("error", (e) => {
  console.error("❌ Error al levantar servidor:", e.message);
});

//////////////////////////////////////Trabajar Localmente///////////////////////////////////////////
/*// server.js (PROD + LOCAL) - COMPLETO Y CORREGIDO
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// ✅ Cargar SIEMPRE backend/.env
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();

 ===========================
 //  LOGS de errores globales

process.on("uncaughtException", (err) => {
  try {
    const logFile = path.join(__dirname, "backend-error.log");
    fs.appendFileSync(
      logFile,
      `[${new Date().toISOString()}] ❌ uncaughtException:\n${err.stack}\n\n`
    );
  } catch (e) {
    console.error("No se pudo escribir backend-error.log", e);
  }
  console.error("❌ uncaughtException:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ unhandledRejection:", reason);
});


   //CORS

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman/curl
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("No permitido por CORS: " + origin));
    },
    credentials: false,
  })
);


  // Parsers

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));


  // uploads

const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log("📁 Carpeta 'uploads' creada automáticamente.");
}
app.use("/uploads", express.static(uploadsPath));


  // Health check

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || "local",
    port: Number(process.env.PORT) || 3000,
    db: process.env.DB_NAME || null,
    timestamp: new Date().toISOString(),
  });
});


   //Middleware JWT (protector)

const auth = require("./middleware/auth"); // ✅ este debe existir


  // Rutas (IMPORTANTE)


// ✅ AUTH (LOGIN) - NO protegido
app.use("/api/auth", require("./routes/auth"));

// ✅ Rutas protegidas
app.use("/api/usuarios", auth, require("./routes/usuarios"));
app.use("/api/productos", auth, require("./routes/productos"));
app.use("/api/categorias", auth, require("./routes/categorias"));
app.use("/api/ubicaciones", auth, require("./routes/ubicaciones"));
app.use("/api/movimientos", auth, require("./routes/movimientos"));
app.use("/api/bitacora", auth, require("./routes/bitacora"));
app.use("/api/upload", auth, require("./routes/upload"));
app.use("/api/cai", auth, require("./routes/cai"));
app.use("/api/ventas", auth, require("./routes/ventas"));
app.use("/api/facturas", auth, require("./routes/facturas"));
app.use("/api/clientes", auth, require("./routes/clientes"));
app.use("/api/unidades", auth, require("./routes/unidades"));
app.use("/api/caja", auth, require("./routes/caja"));


   //404

app.use((req, res) => {
  res
    .status(404)
    .json({ message: "Ruta no encontrada", path: req.originalUrl });
});

   //Error handler

app.use((err, req, res, next) => {
  console.error("❌ Error middleware:", err.message || err);
  res.status(500).json({ message: err.message || "Error del servidor" });
});


  // Start

const PORT = Number(process.env.PORT) || 3000;

console.log("✅ Iniciando backend...");
console.log("📌 ENV cargado desde:", path.join(__dirname, ".env"));
console.log("📌 PORT:", PORT);
console.log(
  "📌 DB:",
  process.env.DB_HOST,
  process.env.DB_PORT,
  process.env.DB_NAME
);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend corriendo en http://127.0.0.1:${PORT}`);
});

server.on("error", (e) => {
  console.error("❌ Error al levantar servidor:", e.message);
});*/
