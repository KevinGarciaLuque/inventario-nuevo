/*const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// ✅ Ruta segura fuera del snapshot
const uploadDir = path.join(process.cwd(), "uploads");

// ✅ Crea la carpeta si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 Carpeta 'uploads' creada automáticamente.");
}

// Configura Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_.-]/g, "");
    const uniqueName = Date.now() + "_" + safeName;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// POST /api/upload
router.post("/", upload.single("imagen"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se subió ninguna imagen" });
  }

  // Obtén el dominio BASE desde la variable de entorno (usa localhost por defecto)
  const urlBase = process.env.BACKEND_URL || "http://localhost:3000";
  // Crea la URL completa para el archivo subido
  const imageUrl = `${urlBase}/uploads/${req.file.filename}`;

  res.json({
    path: imageUrl, // ✅ URL absoluta para usar en el frontend
    filename: req.file.filename, // solo si lo necesitas para otra cosa
  });
});

module.exports = router;*/



const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Ruta donde se guardarán las imágenes
const uploadDir = path.join(process.cwd(), "uploads");

// Crea la carpeta si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 Carpeta 'uploads' creada automáticamente.");
}

// Configura Multer para guardar las imágenes con nombre seguro y único
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_.-]/g, "");
    const uniqueName = Date.now() + "_" + safeName;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// POST /api/upload
router.post("/", upload.single("imagen"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se subió ninguna imagen" });
  }

  // Usa variable de entorno BACKEND_URL, o localhost por defecto
  const urlBase = process.env.BACKEND_URL || "http://localhost:3000";
  // Construye la URL completa para la imagen
  const imageUrl = `${urlBase}/uploads/${req.file.filename}`;

  res.json({
    path: imageUrl, // ✅ URL absoluta para usar en el frontend
    filename: req.file.filename, // solo si lo necesitas
  });
});

module.exports = router;
