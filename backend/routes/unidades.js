// backend/routes/unidades.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");

/* =====================================================
   Helpers
===================================================== */
const toStr = (v) => String(v ?? "").trim();

const mustBePositiveInt = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
};

/* =====================================================
   Middleware: Auth (JWT)
   - Lee token: Authorization: Bearer <token>
   - Llena req.user = { id, email, rol }
===================================================== */
const requireAuth = (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    const [type, token] = auth.split(" ");

    if (type !== "Bearer" || !token) {
      return res
        .status(401)
        .json({ message: "No autenticado (token faltante)." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || "secreto_demo");
    req.user = payload; // { id, email, rol }
    next();
  } catch (e) {
    return res.status(401).json({ message: "Token inválido o expirado." });
  }
};

/* =====================================================
   Middleware: Solo admin
===================================================== */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.rol !== "admin") {
    return res.status(403).json({
      message: "Acceso denegado. Solo administrador.",
    });
  }
  next();
};

/* =====================================================
   Obtener unidades (cualquier rol, pero autenticado)
===================================================== */
router.get("/", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM unidades_medida ORDER BY tipo, nombre"
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error al obtener unidades" });
  }
});

/* =====================================================
   Crear unidad (solo admin)
===================================================== */
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const nombre = toStr(req.body.nombre);
  const abreviatura = toStr(req.body.abreviatura);
  const tipo = toStr(req.body.tipo).toLowerCase(); // peso|longitud|volumen|unidad

  if (!nombre || !abreviatura || !tipo) {
    return res.status(400).json({ message: "Datos incompletos" });
  }

  if (abreviatura.length > 10) {
    return res
      .status(400)
      .json({ message: "La abreviatura no debe pasar de 10 caracteres." });
  }

  try {
    // ✅ Evitar duplicado por tipo+abreviatura (muy útil)
    const [dup] = await db.query(
      "SELECT id FROM unidades_medida WHERE LOWER(tipo)=? AND LOWER(abreviatura)=? LIMIT 1",
      [tipo, abreviatura.toLowerCase()]
    );
    if (dup.length > 0) {
      return res.status(409).json({
        message: "Ya existe una unidad con esa abreviatura en ese tipo.",
      });
    }

    await db.query(
      "INSERT INTO unidades_medida (nombre, abreviatura, tipo, activo) VALUES (?,?,?,1)",
      [nombre, abreviatura, tipo]
    );

    res.json({ message: "Unidad creada correctamente" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error al crear unidad" });
  }
});

/* =====================================================
   Editar unidad (solo admin)
===================================================== */
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = mustBePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ message: "ID inválido" });

  const nombre = toStr(req.body.nombre);
  const abreviatura = toStr(req.body.abreviatura);
  const tipo = toStr(req.body.tipo).toLowerCase();
  const activo = req.body.activo ? 1 : 0;

  if (!nombre || !abreviatura || !tipo) {
    return res.status(400).json({ message: "Datos incompletos" });
  }

  if (abreviatura.length > 10) {
    return res
      .status(400)
      .json({ message: "La abreviatura no debe pasar de 10 caracteres." });
  }

  try {
    // ✅ Evitar duplicados al editar
    const [dup] = await db.query(
      "SELECT id FROM unidades_medida WHERE LOWER(tipo)=? AND LOWER(abreviatura)=? AND id<>? LIMIT 1",
      [tipo, abreviatura.toLowerCase(), id]
    );
    if (dup.length > 0) {
      return res.status(409).json({
        message: "Ya existe otra unidad con esa abreviatura en ese tipo.",
      });
    }

    const [result] = await db.query(
      `UPDATE unidades_medida
       SET nombre=?, abreviatura=?, tipo=?, activo=?
       WHERE id=?`,
      [nombre, abreviatura, tipo, activo, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    res.json({ message: "Unidad actualizada correctamente" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error al actualizar unidad" });
  }
});

/* =====================================================
   Eliminar unidad (solo admin)
   ❗ Bloquea si está en uso por productos
===================================================== */
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = mustBePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ message: "ID inválido" });

  try {
    // 🔎 Verificar si está en uso
    const [uso] = await db.query(
      "SELECT COUNT(*) AS total FROM productos WHERE unidad_medida_id=?",
      [id]
    );

    if ((uso?.[0]?.total || 0) > 0) {
      return res.status(409).json({
        message:
          "No se puede eliminar la unidad porque está asociada a productos. Desactívela.",
      });
    }

    const [result] = await db.query("DELETE FROM unidades_medida WHERE id=?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Unidad no encontrada" });
    }

    res.json({ message: "Unidad eliminada correctamente" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error al eliminar unidad" });
  }
});

module.exports = router;
