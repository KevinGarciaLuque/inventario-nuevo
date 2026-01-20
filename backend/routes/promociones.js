// backend/routes/promociones.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/* =====================================================
   TABLAS ESPERADAS
   =====================================================
   promociones:
   - id INT PK AI
   - nombre VARCHAR(120)
   - tipo ENUM('PORCENTAJE','MONTO','COMBO')
   - valor DECIMAL(10,2) NULL / o NOT NULL (este archivo soporta ambos)
   - precio_combo DECIMAL(10,2) NULL   <-- ✅ para COMBO
   - fecha_inicio DATE NULL
   - fecha_fin DATE NULL
   - descripcion VARCHAR(255) NULL
   - activo TINYINT(1) DEFAULT 1
   - created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   - updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

   promocion_productos:
   - id INT PK AI
   - promocion_id INT
   - producto_id INT
   - cantidad INT NOT NULL DEFAULT 1   <-- ✅ para combos
   - es_regalo TINYINT(1) DEFAULT 0    <-- ✅ para combos
   - activo TINYINT(1) DEFAULT 1
   - created_at DATETIME
===================================================== */

const TIPOS_VALIDOS = new Set(["PORCENTAJE", "MONTO", "COMBO"]);

const toNumber = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const toStr = (v) => String(v ?? "").trim();

const isISODate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

const normalizePromo = (r) => ({
  id: Number(r.id),
  nombre: r.nombre,
  tipo: r.tipo,
  valor: r.valor == null ? null : Number(r.valor),
  precio_combo: r.precio_combo == null ? null : Number(r.precio_combo),
  fecha_inicio: r.fecha_inicio ? String(r.fecha_inicio) : "",
  fecha_fin: r.fecha_fin ? String(r.fecha_fin) : "",
  descripcion: r.descripcion ?? "",
  activo: Number(r.activo) === 1 ? 1 : 0,
  created_at: r.created_at ?? null,
  updated_at: r.updated_at ?? null,
});

const normalizeDetalle = (r) => ({
  id: Number(r.id),
  promocion_id: Number(r.promocion_id),
  producto_id: Number(r.producto_id),
  cantidad: Number(r.cantidad ?? 1),
  es_regalo: Number(r.es_regalo) === 1 ? 1 : 0,
  activo: Number(r.activo) === 1 ? 1 : 0,
  producto_nombre: r.producto_nombre,
  producto_stock: Number(r.producto_stock ?? 0),
  producto_precio: Number(r.producto_precio ?? 0),
});

/* =====================================================
   GET /api/promociones?search=&activo=1|0&vigente=1
===================================================== */
router.get("/", async (req, res) => {
  try {
    const { search = "", activo, vigente } = req.query;

    const where = [];
    const params = [];

    if (search.trim()) {
      where.push(
        "(nombre LIKE ? OR descripcion LIKE ? OR tipo LIKE ? OR valor LIKE ? OR precio_combo LIKE ?)"
      );
      params.push(
        `%${search.trim()}%`,
        `%${search.trim()}%`,
        `%${search.trim()}%`,
        `%${search.trim()}%`,
        `%${search.trim()}%`
      );
    }

    if (activo === "1" || activo === "0") {
      where.push("activo = ?");
      params.push(Number(activo));
    }

    if (vigente === "1") {
      where.push(
        "((fecha_inicio IS NULL OR fecha_inicio <= CURDATE()) AND (fecha_fin IS NULL OR fecha_fin >= CURDATE()))"
      );
    }

    const sql = `
      SELECT id, nombre, tipo, valor, precio_combo, fecha_inicio, fecha_fin, descripcion, activo, created_at, updated_at
      FROM promociones
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY activo DESC, fecha_inicio DESC, nombre ASC
    `;

    const [rows] = await db.query(sql, params);
    res.json(rows.map(normalizePromo));
  } catch (err) {
    console.error("GET /promociones:", err);
    res.status(500).json({ message: "Error al obtener promociones." });
  }
});

/* =====================================================
   ✅ GET /api/promociones/combos-vigentes
   - Para listarlos en el buscador (Registrar Venta)
   - Solo combos activos + vigentes HOY
   - Incluye componentes
===================================================== */
router.get("/combos-vigentes", async (req, res) => {
  try {
    const [combos] = await db.query(
      `
      SELECT id, nombre, tipo, valor, precio_combo, fecha_inicio, fecha_fin, descripcion, activo, created_at, updated_at
      FROM promociones
      WHERE tipo = 'COMBO'
        AND activo = 1
        AND (fecha_inicio IS NULL OR fecha_inicio <= CURDATE())
        AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())
      ORDER BY nombre ASC
      `
    );

    if (!combos.length) return res.json([]);

    const ids = combos.map((c) => Number(c.id));
    const placeholders = ids.map(() => "?").join(",");

    const [items] = await db.query(
      `
      SELECT
        pp.id,
        pp.promocion_id,
        pp.producto_id,
        pp.cantidad,
        pp.es_regalo,
        pp.activo,
        p.nombre AS producto_nombre,
        p.stock  AS producto_stock,
        p.precio AS producto_precio
      FROM promocion_productos pp
      JOIN productos p ON p.id = pp.producto_id
      WHERE pp.promocion_id IN (${placeholders})
        AND pp.activo = 1
      ORDER BY pp.promocion_id ASC, pp.es_regalo DESC, p.nombre ASC
      `,
      ids
    );

    const map = new Map();
    for (const c of combos) {
      map.set(Number(c.id), {
        ...normalizePromo(c),
        componentes: [],
      });
    }

    for (const it of items) {
      const combo = map.get(Number(it.promocion_id));
      if (!combo) continue;
      combo.componentes.push(normalizeDetalle(it));
    }

    res.json(Array.from(map.values()));
  } catch (err) {
    console.error("GET /promociones/combos-vigentes:", err);
    res.status(500).json({ message: "Error al obtener combos vigentes." });
  }
});

/* =====================================================
   ✅ GET /api/promociones/:id/detalle
   - Para ver qué trae un combo al editarlo
   - Devuelve: promoción + productos asignados (cantidad, es_regalo)
===================================================== */
router.get("/:id/detalle", async (req, res) => {
  try {
    const id = toNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const [promoRows] = await db.query(
      `
      SELECT id, nombre, tipo, valor, precio_combo, fecha_inicio, fecha_fin, descripcion, activo, created_at, updated_at
      FROM promociones
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!promoRows.length) {
      return res.status(404).json({ message: "Promoción no encontrada." });
    }

    const promo = normalizePromo(promoRows[0]);

    const [items] = await db.query(
      `
      SELECT
        pp.id,
        pp.promocion_id,
        pp.producto_id,
        pp.cantidad,
        pp.es_regalo,
        pp.activo,
        p.nombre AS producto_nombre,
        p.stock  AS producto_stock,
        p.precio AS producto_precio
      FROM promocion_productos pp
      JOIN productos p ON p.id = pp.producto_id
      WHERE pp.promocion_id = ?
      ORDER BY pp.es_regalo DESC, p.nombre ASC
      `,
      [id]
    );

    res.json({
      promocion: promo,
      productos: items.map(normalizeDetalle),
    });
  } catch (err) {
    console.error("GET /promociones/:id/detalle:", err);
    res.status(500).json({ message: "Error al obtener detalle de promoción." });
  }
});

/* =====================================================
   GET /api/promociones/:id
===================================================== */
router.get("/:id", async (req, res) => {
  try {
    const id = toNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const [rows] = await db.query(
      `SELECT id, nombre, tipo, valor, precio_combo, fecha_inicio, fecha_fin, descripcion, activo, created_at, updated_at
       FROM promociones WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Promoción no encontrada." });
    res.json(normalizePromo(rows[0]));
  } catch (err) {
    console.error("GET /promociones/:id:", err);
    res.status(500).json({ message: "Error al obtener promoción." });
  }
});

/* =====================================================
   POST /api/promociones
   ✅ FIX: para COMBO guardamos valor = 0 (evita "valor cannot be null" aunque tu DB lo tenga NOT NULL)
===================================================== */
router.post("/", async (req, res) => {
  try {
    const nombre = toStr(req.body?.nombre);
    const tipo = toStr(req.body?.tipo).toUpperCase();

    const valorRaw = req.body?.valor;
    const precioComboRaw = req.body?.precio_combo;

    const valor = valorRaw == null ? null : toNumber(valorRaw, NaN);
    const precio_combo =
      precioComboRaw == null ? null : toNumber(precioComboRaw, NaN);

    const fecha_inicio = req.body?.fecha_inicio ?? null;
    const fecha_fin = req.body?.fecha_fin ?? null;

    const descripcion = toStr(req.body?.descripcion);
    const activo = Number(req.body?.activo) === 0 ? 0 : 1;

    if (!nombre)
      return res.status(400).json({ message: "El nombre es obligatorio." });

    if (!TIPOS_VALIDOS.has(tipo)) {
      return res.status(400).json({
        message: "Tipo inválido (PORCENTAJE, MONTO, COMBO).",
      });
    }

    // ✅ Validaciones por tipo
    if (tipo === "PORCENTAJE") {
      if (!Number.isFinite(valor))
        return res.status(400).json({ message: "El valor debe ser numérico." });
      if (valor <= 0 || valor > 100) {
        return res.status(400).json({
          message: "En PORCENTAJE el valor debe ser > 0 y <= 100.",
        });
      }
    }

    if (tipo === "MONTO") {
      if (!Number.isFinite(valor))
        return res.status(400).json({ message: "El valor debe ser numérico." });
      if (valor < 0) {
        return res.status(400).json({
          message: "En MONTO el valor no puede ser negativo.",
        });
      }
    }

    if (tipo === "COMBO") {
      if (!Number.isFinite(precio_combo) || precio_combo <= 0) {
        return res.status(400).json({
          message: "En COMBO precio_combo debe ser numérico y mayor que 0.",
        });
      }
    }

    // ✅ Fechas
    if (fecha_inicio && !isISODate(fecha_inicio)) {
      return res
        .status(400)
        .json({ message: "fecha_inicio debe ser YYYY-MM-DD o null." });
    }
    if (fecha_fin && !isISODate(fecha_fin)) {
      return res
        .status(400)
        .json({ message: "fecha_fin debe ser YYYY-MM-DD o null." });
    }
    if (
      fecha_inicio &&
      fecha_fin &&
      new Date(fecha_fin) < new Date(fecha_inicio)
    ) {
      return res.status(400).json({
        message: "La fecha fin no puede ser menor a la fecha inicio.",
      });
    }

    // ✅ FIX importante:
    // - COMBO: valor = 0 (para evitar NOT NULL), precio_combo = requerido
    // - Descuentos: valor = requerido, precio_combo = null
    const valorDB = tipo === "COMBO" ? 0 : valor;
    const precioComboDB = tipo === "COMBO" ? precio_combo : null;

    if (tipo !== "COMBO" && !Number.isFinite(valorDB)) {
      return res.status(400).json({ message: "El valor debe ser numérico." });
    }

    const [result] = await db.query(
      `INSERT INTO promociones (nombre, tipo, valor, precio_combo, fecha_inicio, fecha_fin, descripcion, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        tipo,
        valorDB,
        precioComboDB,
        fecha_inicio || null,
        fecha_fin || null,
        descripcion || null,
        activo,
      ]
    );

    const [rows] = await db.query(
      `SELECT id, nombre, tipo, valor, precio_combo, fecha_inicio, fecha_fin, descripcion, activo, created_at, updated_at
       FROM promociones WHERE id = ? LIMIT 1`,
      [result.insertId]
    );

    res.status(201).json(normalizePromo(rows[0]));
  } catch (err) {
    console.error("POST /promociones:", err);
    res.status(500).json({ message: "Error al crear promoción." });
  }
});

/* =====================================================
   PUT /api/promociones/:id
   ✅ FIX: para COMBO guardamos valor = 0 (evita "valor cannot be null")
===================================================== */
router.put("/:id", async (req, res) => {
  try {
    const id = toNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const nombre = toStr(req.body?.nombre);
    const tipo = toStr(req.body?.tipo).toUpperCase();

    const valorRaw = req.body?.valor;
    const precioComboRaw = req.body?.precio_combo;

    const valor = valorRaw == null ? null : toNumber(valorRaw, NaN);
    const precio_combo =
      precioComboRaw == null ? null : toNumber(precioComboRaw, NaN);

    const fecha_inicio = req.body?.fecha_inicio ?? null;
    const fecha_fin = req.body?.fecha_fin ?? null;

    const descripcion = toStr(req.body?.descripcion);
    const activo = Number(req.body?.activo) === 0 ? 0 : 1;

    if (!nombre)
      return res.status(400).json({ message: "El nombre es obligatorio." });

    if (!TIPOS_VALIDOS.has(tipo)) {
      return res.status(400).json({
        message: "Tipo inválido (PORCENTAJE, MONTO, COMBO).",
      });
    }

    // ✅ Validaciones por tipo
    if (tipo === "PORCENTAJE") {
      if (!Number.isFinite(valor))
        return res.status(400).json({ message: "El valor debe ser numérico." });
      if (valor <= 0 || valor > 100) {
        return res.status(400).json({
          message: "En PORCENTAJE el valor debe ser > 0 y <= 100.",
        });
      }
    }

    if (tipo === "MONTO") {
      if (!Number.isFinite(valor))
        return res.status(400).json({ message: "El valor debe ser numérico." });
      if (valor < 0) {
        return res.status(400).json({
          message: "En MONTO el valor no puede ser negativo.",
        });
      }
    }

    if (tipo === "COMBO") {
      if (!Number.isFinite(precio_combo) || precio_combo <= 0) {
        return res.status(400).json({
          message: "En COMBO precio_combo debe ser numérico y mayor que 0.",
        });
      }
    }

    // ✅ Fechas
    if (fecha_inicio && !isISODate(fecha_inicio)) {
      return res
        .status(400)
        .json({ message: "fecha_inicio debe ser YYYY-MM-DD o null." });
    }
    if (fecha_fin && !isISODate(fecha_fin)) {
      return res
        .status(400)
        .json({ message: "fecha_fin debe ser YYYY-MM-DD o null." });
    }
    if (
      fecha_inicio &&
      fecha_fin &&
      new Date(fecha_fin) < new Date(fecha_inicio)
    ) {
      return res.status(400).json({
        message: "La fecha fin no puede ser menor a la fecha inicio.",
      });
    }

    const [existe] = await db.query(
      "SELECT id FROM promociones WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existe.length)
      return res.status(404).json({ message: "Promoción no encontrada." });

    const valorDB = tipo === "COMBO" ? 0 : valor;
    const precioComboDB = tipo === "COMBO" ? precio_combo : null;

    if (tipo !== "COMBO" && !Number.isFinite(valorDB)) {
      return res.status(400).json({ message: "El valor debe ser numérico." });
    }

    await db.query(
      `UPDATE promociones
       SET nombre = ?, tipo = ?, valor = ?, precio_combo = ?, fecha_inicio = ?, fecha_fin = ?, descripcion = ?, activo = ?
       WHERE id = ?`,
      [
        nombre,
        tipo,
        valorDB,
        precioComboDB,
        fecha_inicio || null,
        fecha_fin || null,
        descripcion || null,
        activo,
        id,
      ]
    );

    const [rows] = await db.query(
      `SELECT id, nombre, tipo, valor, precio_combo, fecha_inicio, fecha_fin, descripcion, activo, created_at, updated_at
       FROM promociones WHERE id = ? LIMIT 1`,
      [id]
    );

    res.json(normalizePromo(rows[0]));
  } catch (err) {
    console.error("PUT /promociones/:id:", err);
    res.status(500).json({ message: "Error al actualizar promoción." });
  }
});

/* =====================================================
   PATCH /api/promociones/:id/estado
===================================================== */
router.patch("/:id/estado", async (req, res) => {
  try {
    const id = toNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const activo = Number(req.body?.activo);
    if (!(activo === 0 || activo === 1)) {
      return res.status(400).json({ message: "activo debe ser 0 o 1." });
    }

    const [existe] = await db.query(
      "SELECT id FROM promociones WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existe.length)
      return res.status(404).json({ message: "Promoción no encontrada." });

    await db.query("UPDATE promociones SET activo = ? WHERE id = ?", [
      activo,
      id,
    ]);

    const [rows] = await db.query(
      `SELECT id, nombre, tipo, valor, precio_combo, fecha_inicio, fecha_fin, descripcion, activo, created_at, updated_at
       FROM promociones WHERE id = ? LIMIT 1`,
      [id]
    );

    res.json(normalizePromo(rows[0]));
  } catch (err) {
    console.error("PATCH /promociones/:id/estado:", err);
    res
      .status(500)
      .json({ message: "Error al cambiar estado de la promoción." });
  }
});

/* =====================================================
   DELETE /api/promociones/:id
===================================================== */
router.delete("/:id", async (req, res) => {
  try {
    const id = toNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const [existe] = await db.query(
      "SELECT id FROM promociones WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existe.length)
      return res.status(404).json({ message: "Promoción no encontrada." });

    await db.query("DELETE FROM promociones WHERE id = ?", [id]);
    res.json({ message: "Promoción eliminada." });
  } catch (err) {
    console.error("DELETE /promociones/:id:", err);

    if (err?.code === "ER_ROW_IS_REFERENCED_2" || err?.errno === 1451) {
      return res.status(409).json({
        message:
          "No se puede eliminar: esta promoción está asignada a productos.",
      });
    }

    res.status(500).json({ message: "Error al eliminar promoción." });
  }
});

module.exports = router;
