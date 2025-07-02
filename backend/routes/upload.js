const express = require("express");
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

  res.json({
    path: "/uploads/" + req.file.filename,
    filename: req.file.filename,
  });
});

module.exports = router;
