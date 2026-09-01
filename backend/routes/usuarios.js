// backend/routes/usuarios.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const auth = require("./auth"); // ✅ carpeta "middleware" (singular)

/* =====================================================
   Helpers
===================================================== */
const SOLO_ADMIN = (req, res) => {
  if (!req.user || !["admin", "superadmin"].includes(req.user.rol)) {
    res.status(403).json({ message: "Acceso no autorizado" });
    return false;
  }
  return true;
};

const ROLES_PERMITIDOS = ["superadmin", "admin", "almacen", "cajero"];

// Solo un superadmin puede crear/editar/asignar el rol superadmin
const puedeAsignarRol = (req, rol) =>
  rol !== "superadmin" || req.user?.rol === "superadmin";


/* =====================================================
   OBTENER USUARIO LOGUEADO (/me)
   👉 Usado por UserContext para validar sesión
===================================================== */
router.get("/me", auth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const [rows] = await db.query(
      "SELECT id, nombre, email, rol, activo, creado_en, tienda_id FROM usuarios WHERE id = ?",
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("GET /usuarios/me:", error);
    return res.status(500).json({ message: "Error al obtener usuario" });
  }
});

/* =====================================================
   OBTENER TODOS LOS USUARIOS
   👉 SOLO ADMIN
===================================================== */
router.get("/", auth, async (req, res) => {
  try {
    if (!SOLO_ADMIN(req, res)) return;

    const [rows] = await db.query(
      `SELECT u.id, u.nombre, u.email, u.rol, u.activo, u.creado_en, u.tienda_id,
              t.nombre AS tienda_nombre
         FROM usuarios u
         LEFT JOIN tiendas t ON t.id = u.tienda_id
        ORDER BY u.creado_en DESC`
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /usuarios:", error);
    return res.status(500).json({ message: "Error al obtener usuarios" });
  }
});

/* =====================================================
   CREAR USUARIO
   👉 SOLO ADMIN
===================================================== */
router.post("/", auth, async (req, res) => {
  try {
    if (!SOLO_ADMIN(req, res)) return;

    const { nombre, email, password, rol } = req.body || {};
    const tienda_id = req.body?.tienda_id ? Number(req.body.tienda_id) : null;

    if (!nombre || !email || !password || !rol) {
      return res
        .status(400)
        .json({ message: "Todos los campos son requeridos" });
    }

    if (!ROLES_PERMITIDOS.includes(rol)) {
      return res.status(400).json({ message: "Rol inválido" });
    }

    if (!puedeAsignarRol(req, rol)) {
      return res
        .status(403)
        .json({ message: "Solo el superadministrador puede asignar ese rol" });
    }

    const correo = String(email).trim().toLowerCase();

    // Verificar email duplicado
    const [exist] = await db.query("SELECT id FROM usuarios WHERE email = ?", [
      correo,
    ]);

    if (exist.length > 0) {
      return res.status(409).json({ message: "El correo ya existe" });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(String(password), 10);

    await db.query(
      "INSERT INTO usuarios (nombre, email, password, rol, tienda_id) VALUES (?, ?, ?, ?, ?)",
      [String(nombre).trim(), correo, hashedPassword, rol, tienda_id]
    );

    return res.status(201).json({ message: "Usuario creado correctamente" });
  } catch (error) {
    console.error("POST /usuarios:", error);
    return res.status(500).json({ message: "Error al crear usuario" });
  }
});

/* =====================================================
   EDITAR USUARIO (SIN PASSWORD)
   👉 SOLO ADMIN
===================================================== */
router.put("/:id", auth, async (req, res) => {
  try {
    if (!SOLO_ADMIN(req, res)) return;

    const { id } = req.params;
    const { nombre, email, rol } = req.body || {};
    const tienda_id = req.body?.tienda_id ? Number(req.body.tienda_id) : null;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ message: "ID inválido" });
    }

    if (!nombre || !email || !rol) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    if (!ROLES_PERMITIDOS.includes(rol)) {
      return res.status(400).json({ message: "Rol inválido" });
    }

    if (!puedeAsignarRol(req, rol)) {
      return res
        .status(403)
        .json({ message: "Solo el superadministrador puede asignar ese rol" });
    }

    // Un admin no puede modificar a un superadmin
    const [target] = await db.query("SELECT rol FROM usuarios WHERE id = ?", [
      Number(id),
    ]);
    if (
      target.length &&
      target[0].rol === "superadmin" &&
      req.user?.rol !== "superadmin"
    ) {
      return res
        .status(403)
        .json({ message: "No puedes modificar a un superadministrador" });
    }

    const correo = String(email).trim().toLowerCase();

    // Evitar email duplicado en OTRO usuario
    const [dup] = await db.query(
      "SELECT id FROM usuarios WHERE email = ? AND id <> ?",
      [correo, Number(id)]
    );
    if (dup.length > 0) {
      return res.status(409).json({ message: "El correo ya existe" });
    }

    const [result] = await db.query(
      "UPDATE usuarios SET nombre=?, email=?, rol=?, tienda_id=? WHERE id=?",
      [String(nombre).trim(), correo, rol, tienda_id, Number(id)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.json({ message: "Usuario actualizado correctamente" });
  } catch (error) {
    console.error("PUT /usuarios/:id:", error);
    return res.status(500).json({ message: "Error al actualizar usuario" });
  }
});

/* =====================================================
   CAMBIAR CONTRASEÑA
   👉 SOLO ADMIN
===================================================== */
router.put("/:id/password", auth, async (req, res) => {
  try {
    if (!SOLO_ADMIN(req, res)) return;

    const { id } = req.params;
    const { password } = req.body || {};

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ message: "ID inválido" });
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({
        message: "La nueva contraseña es requerida (mínimo 6 caracteres)",
      });
    }

    const hashed = await bcrypt.hash(String(password), 10);

    const [result] = await db.query(
      "UPDATE usuarios SET password=? WHERE id=?",
      [hashed, Number(id)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("PUT /usuarios/:id/password:", error);
    return res.status(500).json({ message: "Error al actualizar contraseña" });
  }
});

/* =====================================================
   ELIMINAR USUARIO
   👉 SOLO ADMIN
===================================================== */
router.delete("/:id", auth, async (req, res) => {
  try {
    if (!SOLO_ADMIN(req, res)) return;

    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Evitar que un admin se elimine a sí mismo
    if (Number(id) === Number(req.user?.id)) {
      return res
        .status(400)
        .json({ message: "No puedes eliminar tu propio usuario" });
    }

    const [target] = await db.query("SELECT rol FROM usuarios WHERE id = ?", [
      Number(id),
    ]);
    if (
      target.length &&
      target[0].rol === "superadmin" &&
      req.user?.rol !== "superadmin"
    ) {
      return res
        .status(403)
        .json({ message: "No puedes eliminar a un superadministrador" });
    }

    // Borrado forzado: solo superadmin y con ?force=1
    const force =
      req.user?.rol === "superadmin" &&
      ["1", "true"].includes(String(req.query.force).toLowerCase());

    if (force) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        // Conservamos el historial pero desvinculamos al usuario eliminado
        await conn.query(
          "UPDATE bitacora SET usuario_id = NULL WHERE usuario_id = ?",
          [Number(id)]
        );
        await conn.query(
          "UPDATE movimientos SET usuario_id = NULL WHERE usuario_id = ?",
          [Number(id)]
        );
        await conn.query(
          "UPDATE cierres_caja SET usuario_id = NULL WHERE usuario_id = ?",
          [Number(id)]
        );
        await conn.query(
          "UPDATE venta_descuentos SET creado_por = NULL WHERE creado_por = ?",
          [Number(id)]
        );
        const [r] = await conn.query("DELETE FROM usuarios WHERE id = ?", [
          Number(id),
        ]);
        await conn.commit();
        if (r.affectedRows === 0) {
          return res.status(404).json({ message: "Usuario no encontrado" });
        }
        return res.json({
          message: "Usuario eliminado (su historial se conservó sin asignar)",
        });
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    }

    try {
      const [result] = await db.query("DELETE FROM usuarios WHERE id=?", [
        Number(id),
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      return res.json({ message: "Usuario eliminado correctamente" });
    } catch (e) {
      // FK: el usuario tiene registros asociados
      if (e.code === "ER_ROW_IS_REFERENCED_2" || e.errno === 1451) {
        return res.status(409).json({
          message:
            "El usuario tiene registros asociados (movimientos, cierres de caja o bitácora). Desactívalo en su lugar.",
          requiereFuerza: req.user?.rol === "superadmin",
        });
      }
      throw e;
    }
  } catch (error) {
    console.error("DELETE /usuarios/:id:", error);
    return res.status(500).json({ message: "Error al eliminar usuario" });
  }
});

/* =====================================================
   ACTIVAR / DESACTIVAR USUARIO (soft-delete)
   👉 SOLO ADMIN / SUPERADMIN
===================================================== */
router.patch("/:id/estado", auth, async (req, res) => {
  try {
    if (!SOLO_ADMIN(req, res)) return;

    const { id } = req.params;
    const activo = req.body?.activo ? 1 : 0;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ message: "ID inválido" });
    }

    if (Number(id) === Number(req.user?.id)) {
      return res
        .status(400)
        .json({ message: "No puedes cambiar el estado de tu propio usuario" });
    }

    const [target] = await db.query(
      "SELECT rol FROM usuarios WHERE id = ?",
      [Number(id)]
    );
    if (!target.length) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    if (target[0].rol === "superadmin" && req.user?.rol !== "superadmin") {
      return res
        .status(403)
        .json({ message: "No puedes modificar a un superadministrador" });
    }

    await db.query("UPDATE usuarios SET activo = ? WHERE id = ?", [
      activo,
      Number(id),
    ]);

    return res.json({
      message: activo ? "Usuario activado" : "Usuario desactivado",
    });
  } catch (error) {
    console.error("PATCH /usuarios/:id/estado:", error);
    return res.status(500).json({ message: "Error al cambiar el estado" });
  }
});

module.exports = router;
