// backend/routes/unidades.js
const express = require("express");
const router = express.Router();
const db = require("../db");

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
   Middleware: Solo admin
   (req.user lo pone el middleware global auth.js)
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
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM unidades_medida ORDER BY tipo, nombre"
    );
    res.json(rows);
  } catch (e) {
    console.error("GET /unidades:", e);
    res.status(500).json({ message: "Error al obtener unidades" });
  }
});

/* =====================================================
   Crear unidad (solo admin)
===================================================== */
router.post("/", requireAdmin, async (req, res) => {
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

    res.status(201).json({ message: "Unidad creada correctamente" });
  } catch (e) {
    console.error("POST /unidades:", e);
    res.status(500).json({ message: "Error al crear unidad" });
  }
});

/* =====================================================
   Editar unidad (solo admin)
===================================================== */
router.put("/:id", requireAdmin, async (req, res) => {
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
    console.error("PUT /unidades/:id:", e);
    res.status(500).json({ message: "Error al actualizar unidad" });
  }
});

/* =====================================================
   Eliminar unidad (solo admin)
   ❗ Bloquea si está en uso por productos
===================================================== */
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = mustBePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ message: "ID inválido" });

  try {
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
    console.error("DELETE /unidades/:id:", e);
    res.status(500).json({ message: "Error al eliminar unidad" });
  }
});

module.exports = router;
