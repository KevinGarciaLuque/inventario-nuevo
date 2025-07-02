const express = require("express");
const router = express.Router();
const db = require("../db");

// 🔍 Buscar clientes por nombre o RTN
router.get("/buscar", async (req, res) => {
  const termino = req.query.q || "";
  try {
    const [clientes] = await db.query(
      `SELECT * FROM clientes WHERE nombre LIKE ? OR rtn LIKE ?`,
      [`%${termino}%`, `%${termino}%`]
    );
    res.json(clientes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al buscar clientes" });
  }
});

// 📋 Listar todos los clientes
router.get("/", async (req, res) => {
  try {
    const [clientes] = await db.query("SELECT * FROM clientes ORDER BY nombre");
    res.json(clientes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener los clientes" });
  }
});

// ➕ Crear cliente nuevo
router.post("/", async (req, res) => {
  const { nombre, rtn, direccion } = req.body;
  try {
    const [existe] = await db.query("SELECT id FROM clientes WHERE rtn = ?", [
      rtn,
    ]);
    if (existe.length > 0) {
      return res
        .status(400)
        .json({ message: "Ya existe un cliente con ese RTN" });
    }

    const [resultado] = await db.query(
      "INSERT INTO clientes (nombre, rtn, direccion) VALUES (?, ?, ?)",
      [nombre, rtn, direccion]
    );
    res.json({ id: resultado.insertId, nombre, rtn, direccion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al crear cliente" });
  }
});

// ✏️ Editar cliente
router.put("/:id", async (req, res) => {
  const { nombre, rtn, direccion } = req.body;
  try {
    const [resultado] = await db.query(
      "UPDATE clientes SET nombre = ?, rtn = ?, direccion = ? WHERE id = ?",
      [nombre, rtn, direccion, req.params.id]
    );
    res.json({ message: "Cliente actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al actualizar cliente" });
  }
});

// ❌ Eliminar cliente completamente (solo si deseas eliminación real)
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM clientes WHERE id = ?", [req.params.id]);
    res.json({ message: "Cliente eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ message: "Error al eliminar cliente" });
  }
});

// 🔄 Activar / Desactivar cliente
router.patch("/toggle/:id", async (req, res) => {
  try {
    const [cliente] = await db.query(
      "SELECT activo FROM clientes WHERE id = ?",
      [req.params.id]
    );
    if (cliente.length === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const nuevoEstado = cliente[0].activo ? 0 : 1;

    await db.query("UPDATE clientes SET activo = ? WHERE id = ?", [
      nuevoEstado,
      req.params.id,
    ]);
    res.json({
      message: `Cliente ${nuevoEstado ? "activado" : "desactivado"}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al actualizar estado del cliente" });
  }
});

module.exports = router;
