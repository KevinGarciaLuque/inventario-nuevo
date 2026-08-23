// backend/routes/clientes_web.js
// Rutas protegidas (auth) para que el panel admin gestione las solicitudes
// de registro de clientes enviadas desde la tienda web pública.
const express = require("express");
const router = express.Router();
const db = require("../db");

const ESTADOS_VALIDOS = ["nuevo", "contactado", "descartado"];

// GET /api/clientes-web
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM clientes_web ORDER BY creado_en DESC",
    );
    return res.json(rows);
  } catch (error) {
    console.error("❌ Error GET /clientes-web:", error);
    return res.status(500).json({ message: "Error al obtener las solicitudes" });
  }
});

// PATCH /api/clientes-web/:id/estado
router.patch("/:id/estado", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const estado = String(req.body.estado ?? "").trim();

    if (!id) return res.status(400).json({ message: "ID inválido" });
    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    const [result] = await db.query(
      "UPDATE clientes_web SET estado = ? WHERE id = ?",
      [estado, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    return res.json({ message: "Estado actualizado", estado });
  } catch (error) {
    console.error("❌ Error PATCH /clientes-web/:id/estado:", error);
    return res.status(500).json({ message: "Error al actualizar el estado" });
  }
});

module.exports = router;
