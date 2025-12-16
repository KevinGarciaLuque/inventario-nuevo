// backend/routes/usuarios.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const auth = require("../middlewares/auth"); // 👈 middleware JWT

/* =====================================================
   OBTENER USUARIO LOGUEADO (/me)
   👉 Usado por UserContext para validar sesión
===================================================== */
router.get("/me", auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nombre, email, rol, creado_en FROM usuarios WHERE id = ?",
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener usuario", error });
  }
});

/* =====================================================
   OBTENER TODOS LOS USUARIOS
   👉 SOLO ADMIN
===================================================== */
router.get("/", auth, async (req, res) => {
  try {
    if (req.user.rol !== "admin") {
      return res.status(403).json({ message: "Acceso no autorizado" });
    }

    const [rows] = await db.query(
      "SELECT id, nombre, email, rol, creado_en FROM usuarios ORDER BY creado_en DESC"
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener usuarios", error });
  }
});

/* =====================================================
   CREAR USUARIO
   👉 SOLO ADMIN
===================================================== */
router.post("/", auth, async (req, res) => {
  try {
    if (req.user.rol !== "admin") {
      return res.status(403).json({ message: "Acceso no autorizado" });
    }

    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res
        .status(400)
        .json({ message: "Todos los campos son requeridos" });
    }

    // Validar roles permitidos
    const rolesPermitidos = ["admin", "usuario", "almacen"];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(400).json({ message: "Rol inválido" });
    }

    // Verificar email duplicado
    const [exist] = await db.query("SELECT id FROM usuarios WHERE email = ?", [
      email,
    ]);

    if (exist.length > 0) {
      return res.status(409).json({ message: "El correo ya existe" });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)",
      [nombre, email, hashedPassword, rol]
    );

    res.json({ message: "Usuario creado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al crear usuario", error });
  }
});

/* =====================================================
   EDITAR USUARIO (SIN PASSWORD)
   👉 SOLO ADMIN
===================================================== */
router.put("/:id", auth, async (req, res) => {
  try {
    if (req.user.rol !== "admin") {
      return res.status(403).json({ message: "Acceso no autorizado" });
    }

    const { id } = req.params;
    const { nombre, email, rol } = req.body;

    if (!nombre || !email || !rol) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    const rolesPermitidos = ["admin", "usuario", "almacen"];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(400).json({ message: "Rol inválido" });
    }

    await db.query("UPDATE usuarios SET nombre=?, email=?, rol=? WHERE id=?", [
      nombre,
      email,
      rol,
      id,
    ]);

    res.json({ message: "Usuario actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar usuario", error });
  }
});

/* =====================================================
   CAMBIAR CONTRASEÑA
   👉 SOLO ADMIN
===================================================== */
router.put("/:id/password", auth, async (req, res) => {
  try {
    if (req.user.rol !== "admin") {
      return res.status(403).json({ message: "Acceso no autorizado" });
    }

    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json({ message: "La nueva contraseña es requerida" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await db.query("UPDATE usuarios SET password=? WHERE id=?", [hashed, id]);

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar contraseña", error });
  }
});

/* =====================================================
   ELIMINAR USUARIO
   👉 SOLO ADMIN
===================================================== */
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.rol !== "admin") {
      return res.status(403).json({ message: "Acceso no autorizado" });
    }

    const { id } = req.params;

    // Evitar que un admin se elimine a sí mismo
    if (Number(id) === req.user.id) {
      return res
        .status(400)
        .json({ message: "No puedes eliminar tu propio usuario" });
    }

    await db.query("DELETE FROM usuarios WHERE id=?", [id]);

    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar usuario", error });
  }
});

module.exports = router;
