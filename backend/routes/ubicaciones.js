const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener todas las ubicaciones
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM ubicaciones");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener ubicaciones", error });
  }
});

// Agregar una ubicación
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    await db.query(
      "INSERT INTO ubicaciones (nombre, descripcion) VALUES (?, ?)",
      [nombre, descripcion]
    );
    res.json({ message: "Ubicación agregada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al agregar ubicación", error });
  }
});

// Editar una ubicación
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    await db.query(
      "UPDATE ubicaciones SET nombre=?, descripcion=? WHERE id=?",
      [nombre, descripcion, id]
    );
    res.json({ message: "Ubicación actualizada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar ubicación", error });
  }
});

// Eliminar una ubicación
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM ubicaciones WHERE id=?", [id]);
    res.json({ message: "Ubicación eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar ubicación", error });
  }
});

module.exports = router;
