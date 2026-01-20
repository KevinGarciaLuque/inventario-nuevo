// backend/routes/impuestos.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/* =====================================================
   TABLA ESPERADA: impuestos
   - id INT PK AI
   - nombre VARCHAR(100)
   - porcentaje DECIMAL(5,2)
   - descripcion VARCHAR(255) NULL
   - activo TINYINT(1) DEFAULT 1
   - created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   - updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
===================================================== */

const toNumber = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const normalizeRow = (r) => ({
  id: r.id,
  nombre: r.nombre,
  porcentaje: Number(r.porcentaje),
  descripcion: r.descripcion ?? "",
  activo: Number(r.activo) === 1 ? 1 : 0,
  created_at: r.created_at ?? null,
  updated_at: r.updated_at ?? null,
});

// GET /api/impuestos?search=&activo=1|0
router.get("/", async (req, res) => {
  try {
    const { search = "", activo } = req.query;

    const where = [];
    const params = [];

    if (search.trim()) {
      where.push("(nombre LIKE ? OR descripcion LIKE ? OR porcentaje LIKE ?)");
      params.push(
        `%${search.trim()}%`,
        `%${search.trim()}%`,
        `%${search.trim()}%`
      );
    }

    if (activo === "1" || activo === "0") {
      where.push("activo = ?");
      params.push(Number(activo));
    }

    const sql = `
      SELECT id, nombre, porcentaje, descripcion, activo, created_at, updated_at
      FROM impuestos
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY activo DESC, nombre ASC
    `;

    const [rows] = await db.query(sql, params);
    res.json(rows.map(normalizeRow));
  } catch (err) {
    console.error("GET /impuestos:", err);
    res.status(500).json({ message: "Error al obtener impuestos." });
  }
});


// GET /api/impuestos/activos  (para selects)
router.get("/activos", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, nombre, porcentaje, descripcion, activo, created_at, updated_at
       FROM impuestos
       WHERE activo = 1
       ORDER BY nombre ASC`
    );
    return res.json(rows.map(normalizeRow));
  } catch (err) {
    console.error("GET /impuestos/activos:", err);
    return res.status(500).json({ message: "Error al obtener impuestos activos." });
  }
});


// GET /api/impuestos/:id
router.get("/:id", async (req, res) => {
  try {
    const id = toNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const [rows] = await db.query(
      `SELECT id, nombre, porcentaje, descripcion, activo, created_at, updated_at
       FROM impuestos WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Impuesto no encontrado." });
    res.json(normalizeRow(rows[0]));
  } catch (err) {
    console.error("GET /impuestos/:id:", err);
    res.status(500).json({ message: "Error al obtener impuesto." });
  }
});

// POST /api/impuestos
router.post("/", async (req, res) => {
  try {
    const nombre = String(req.body?.nombre ?? "").trim();
    const porcentaje = toNumber(req.body?.porcentaje, NaN);
    const descripcion = String(req.body?.descripcion ?? "").trim();
    const activo = Number(req.body?.activo) === 0 ? 0 : 1;

    if (!nombre)
      return res.status(400).json({ message: "El nombre es obligatorio." });
    if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      return res
        .status(400)
        .json({ message: "Porcentaje inválido (0 a 100)." });
    }

    // Evitar duplicados por nombre
    const [dup] = await db.query(
      "SELECT id FROM impuestos WHERE nombre = ? LIMIT 1",
      [nombre]
    );
    if (dup.length)
      return res
        .status(409)
        .json({ message: "Ya existe un impuesto con ese nombre." });

    const [result] = await db.query(
      `INSERT INTO impuestos (nombre, porcentaje, descripcion, activo)
       VALUES (?, ?, ?, ?)`,
      [nombre, porcentaje, descripcion || null, activo]
    );

    const [rows] = await db.query(
      `SELECT id, nombre, porcentaje, descripcion, activo, created_at, updated_at
       FROM impuestos WHERE id = ? LIMIT 1`,
      [result.insertId]
    );

    res.status(201).json(normalizeRow(rows[0]));
  } catch (err) {
    console.error("POST /impuestos:", err);
    res.status(500).json({ message: "Error al crear impuesto." });
  }
});

// PUT /api/impuestos/:id
router.put("/:id", async (req, res) => {
  try {
    const id = toNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const nombre = String(req.body?.nombre ?? "").trim();
    const porcentaje = toNumber(req.body?.porcentaje, NaN);
    const descripcion = String(req.body?.descripcion ?? "").trim();
    const activo = Number(req.body?.activo) === 0 ? 0 : 1;

    if (!nombre)
      return res.status(400).json({ message: "El nombre es obligatorio." });
    if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      return res
        .status(400)
        .json({ message: "Porcentaje inválido (0 a 100)." });
    }

    const [existe] = await db.query(
      "SELECT id FROM impuestos WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existe.length)
      return res.status(404).json({ message: "Impuesto no encontrado." });

    // Evitar duplicado por nombre en otro id
    const [dup] = await db.query(
      "SELECT id FROM impuestos WHERE nombre = ? AND id <> ? LIMIT 1",
      [nombre, id]
    );
    if (dup.length)
      return res
        .status(409)
        .json({ message: "Ya existe otro impuesto con ese nombre." });

    await db.query(
      `UPDATE impuestos
       SET nombre = ?, porcentaje = ?, descripcion = ?, activo = ?
       WHERE id = ?`,
      [nombre, porcentaje, descripcion || null, activo, id]
    );

    const [rows] = await db.query(
      `SELECT id, nombre, porcentaje, descripcion, activo, created_at, updated_at
       FROM impuestos WHERE id = ? LIMIT 1`,
      [id]
    );

    res.json(normalizeRow(rows[0]));
  } catch (err) {
    console.error("PUT /impuestos/:id:", err);
    res.status(500).json({ message: "Error al actualizar impuesto." });
  }
});

// PATCH /api/impuestos/:id/estado
router.patch("/:id/estado", async (req, res) => {
  try {
    const id = toNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const activo = Number(req.body?.activo);
    if (!(activo === 0 || activo === 1)) {
      return res.status(400).json({ message: "activo debe ser 0 o 1." });
    }

    const [existe] = await db.query(
      "SELECT id FROM impuestos WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existe.length)
      return res.status(404).json({ message: "Impuesto no encontrado." });

    await db.query("UPDATE impuestos SET activo = ? WHERE id = ?", [
      activo,
      id,
    ]);

    const [rows] = await db.query(
      `SELECT id, nombre, porcentaje, descripcion, activo, created_at, updated_at
       FROM impuestos WHERE id = ? LIMIT 1`,
      [id]
    );

    res.json(normalizeRow(rows[0]));
  } catch (err) {
    console.error("PATCH /impuestos/:id/estado:", err);
    res.status(500).json({ message: "Error al cambiar estado del impuesto." });
  }
});

// DELETE /api/impuestos/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = toNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const [existe] = await db.query(
      "SELECT id FROM impuestos WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existe.length)
      return res.status(404).json({ message: "Impuesto no encontrado." });

    await db.query("DELETE FROM impuestos WHERE id = ?", [id]);
    res.json({ message: "Impuesto eliminado." });
  } catch (err) {
    console.error("DELETE /impuestos/:id:", err);

    // FK en uso
    if (err?.code === "ER_ROW_IS_REFERENCED_2" || err?.errno === 1451) {
      return res.status(409).json({
        message:
          "No se puede eliminar: este impuesto está asignado a productos.",
      });
    }

    res.status(500).json({ message: "Error al eliminar impuesto." });
  }
});

module.exports = router;
