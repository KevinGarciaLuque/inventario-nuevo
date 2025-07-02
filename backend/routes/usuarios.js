// backend/routes/usuarios.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");

// Obtener todos los usuarios (sin contraseña)
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nombre, email, rol, creado_en FROM usuarios"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener usuarios", error });
  }
});

// Crear usuario nuevo (con contraseña hasheada y validación de email único)
router.post("/", async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password || !rol) {
      return res
        .status(400)
        .json({ message: "Todos los campos son requeridos" });
    }
    // Verifica email duplicado
    const [exist] = await db.query("SELECT id FROM usuarios WHERE email = ?", [
      email,
    ]);
    if (exist.length > 0) {
      return res.status(409).json({ message: "El correo ya existe" });
    }
    // Hashea la contraseña
    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)",
      [nombre, email, hashed, rol]
    );
    res.json({ message: "Usuario creado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al crear usuario", error });
  }
});

// Editar usuario (sin cambiar contraseña aquí)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol } = req.body;
    await db.query(
      "UPDATE usuarios SET nombre=?, email=?, rol=? WHERE id=?",
      [nombre, email, rol, id]
    );
    res.json({ message: "Usuario actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar usuario", error });
  }
});

// Eliminar usuario
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM usuarios WHERE id=?", [id]);
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar usuario", error });
  }
});

// Cambiar contraseña de usuario
router.put("/:id/password", async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password)
      return res
        .status(400)
        .json({ message: "La nueva contraseña es requerida" });
    const hashed = await bcrypt.hash(password, 10);
    await db.query("UPDATE usuarios SET password=? WHERE id=?", [hashed, id]);
    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar contraseña", error });
  }
});

module.exports = router;

