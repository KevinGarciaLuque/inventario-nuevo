const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener todas las categorías (planas; el árbol se arma en el frontend)
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM categorias ORDER BY categoria_padre_id IS NULL DESC, nombre ASC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener categorías", error });
  }
});

// Agregar una categoría (o subcategoría si viene categoria_padre_id)
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion, categoria_padre_id, imagen } = req.body;
    const padreId = categoria_padre_id ? Number(categoria_padre_id) : null;

    if (padreId) {
      const [padre] = await db.query("SELECT id FROM categorias WHERE id = ?", [
        padreId,
      ]);
      if (padre.length === 0) {
        return res.status(400).json({ message: "La categoría padre no existe" });
      }
    }

    await db.query(
      "INSERT INTO categorias (nombre, descripcion, categoria_padre_id, imagen) VALUES (?, ?, ?, ?)",
      [nombre, descripcion, padreId, imagen || null]
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
    const { nombre, descripcion, categoria_padre_id, imagen } = req.body;
    const padreId = categoria_padre_id ? Number(categoria_padre_id) : null;

    if (padreId && padreId === Number(id)) {
      return res
        .status(400)
        .json({ message: "Una categoría no puede ser su propia categoría padre" });
    }

    await db.query(
      "UPDATE categorias SET nombre=?, descripcion=?, categoria_padre_id=?, imagen=? WHERE id=?",
      [nombre, descripcion, padreId, imagen || null, id]
    );
    res.json({ message: "Categoría actualizada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar categoría", error });
  }
});

// Eliminar una categoría
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [hijos] = await db.query(
      "SELECT COUNT(*) AS total FROM categorias WHERE categoria_padre_id = ?",
      [id]
    );
    if (hijos[0].total > 0) {
      return res.status(400).json({
        message:
          "No se puede eliminar: esta categoría tiene subcategorías. Elimínalas o reasígnalas primero.",
      });
    }

    await db.query("DELETE FROM categorias WHERE id=?", [id]);
    res.json({ message: "Categoría eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar categoría", error });
  }
});

module.exports = router;
