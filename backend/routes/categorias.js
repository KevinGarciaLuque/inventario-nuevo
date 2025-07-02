const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener todas las categorías
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM categorias");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener categorías", error });
  }
});

// Agregar una categoría
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    await db.query(
      "INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)",
      [nombre, descripcion]
    );
    res.json({ message: "Categoría agregada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al agregar categoría", error });
  }
});

// Editar una categoría
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    await db.query("UPDATE categorias SET nombre=?, descripcion=? WHERE id=?", [
      nombre,
      descripcion,
      id,
    ]);
    res.json({ message: "Categoría actualizada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar categoría", error });
  }
});

// Eliminar una categoría
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM categorias WHERE id=?", [id]);
    res.json({ message: "Categoría eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar categoría", error });
  }
});

module.exports = router;
