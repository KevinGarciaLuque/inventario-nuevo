// backend/routes/promocion_productos.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/* =====================================================
   TABLA: promocion_productos
   - id INT AI PK
   - promocion_id INT NOT NULL
   - producto_id INT NOT NULL
   - cantidad INT NOT NULL DEFAULT 1
   - es_regalo TINYINT(1) NOT NULL DEFAULT 0
   - activo TINYINT(1) NOT NULL DEFAULT 1
   - created_at DATETIME DEFAULT CURRENT_TIMESTAMP
===================================================== */

/* =====================================================
   Helpers
===================================================== */
const toStr = (v) => String(v ?? "").trim();
const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? parseInt(n, 10) : def;
};
const toBool01 = (v, def = 0) => {
  const n = Number(v);
  if (n === 0 || n === 1) return n;
  if (typeof v === "boolean") return v ? 1 : 0;
  const s = toStr(v).toLowerCase();
  if (s === "true" || s === "1" || s === "si" || s === "sí") return 1;
  if (s === "false" || s === "0" || s === "no") return 0;
  return def;
};

/* =====================================================
   Validaciones base
===================================================== */
const validarIds = (promocion_id, producto_id) => {
  if (!Number.isInteger(promocion_id) || promocion_id <= 0) {
    return "promocion_id inválido.";
  }
  if (
    producto_id != null &&
    (!Number.isInteger(producto_id) || producto_id <= 0)
  ) {
    return "producto_id inválido.";
  }
  return null;
};

/* =====================================================
   (Opcional) Verificar que la promo exista (y sea COMBO)
===================================================== */
const asegurarPromoExiste = async (promocion_id) => {
  const [rows] = await db.query(
    "SELECT id, tipo, activo FROM promociones WHERE id = ? LIMIT 1",
    [promocion_id]
  );
  if (!rows.length) return { ok: false, msg: "Promoción no existe." };
  // Si quieres obligar que solo se usen combos:
  if (String(rows[0].tipo).toUpperCase() !== "COMBO") {
    return {
      ok: false,
      msg: "Solo puedes asignar productos a promociones tipo COMBO.",
    };
  }
  return { ok: true, promo: rows[0] };
};

/* =====================================================
   GET /api/promocion_productos?promocion_id=#
   Lista productos asignados a un combo
===================================================== */
router.get("/", async (req, res) => {
  try {
    const promocion_id = toInt(req.query.promocion_id, 0);
    if (!promocion_id) {
      return res.status(400).json({ message: "promocion_id es requerido." });
    }

    const [rows] = await db.query(
      `
      SELECT
        pp.id,
        pp.promocion_id,
        pp.producto_id,
        pp.cantidad,
        pp.es_regalo,
        pp.activo,
        pp.created_at,
        p.nombre AS producto_nombre,
        p.stock AS producto_stock,
        p.precio AS producto_precio
      FROM promocion_productos pp
      JOIN productos p ON p.id = pp.producto_id
      WHERE pp.promocion_id = ?
      ORDER BY pp.es_regalo DESC, p.nombre ASC
      `,
      [promocion_id]
    );

    return res.json(
      rows.map((r) => ({
        id: Number(r.id),
        promocion_id: Number(r.promocion_id),
        producto_id: Number(r.producto_id),
        cantidad: Number(r.cantidad ?? 1),
        es_regalo: Number(r.es_regalo) === 1 ? 1 : 0,
        activo: Number(r.activo) === 1 ? 1 : 0,
        created_at: r.created_at ?? null,
        producto: {
          nombre: r.producto_nombre,
          stock: Number(r.producto_stock ?? 0),
          precio: Number(r.producto_precio ?? 0),
        },
      }))
    );
  } catch (err) {
    console.error("GET /promocion_productos:", err);
    return res
      .status(500)
      .json({ message: "Error al obtener productos del combo." });
  }
});

/* =====================================================
   POST /api/promocion_productos
   Agregar producto a un combo

   Body:
   {
     "promocion_id": 1,
     "producto_id": 20,
     "cantidad": 2,
     "es_regalo": 0,
     "activo": 1
   }

   - Si ya existe (promocion_id + producto_id), actualiza cantidad/es_regalo/activo
===================================================== */
router.post("/", async (req, res) => {
  try {
    const promocion_id = toInt(req.body?.promocion_id, 0);
    const producto_id = toInt(req.body?.producto_id, 0);
    const cantidad = toInt(req.body?.cantidad, 1);
    const es_regalo = toBool01(req.body?.es_regalo, 0);
    const activo = toBool01(req.body?.activo, 1);

    const msgId = validarIds(promocion_id, producto_id);
    if (msgId) return res.status(400).json({ message: msgId });

    if (!cantidad || cantidad <= 0) {
      return res
        .status(400)
        .json({ message: "cantidad debe ser mayor que 0." });
    }

    // ✅ (Opcional) Validar promo exista y sea COMBO
    const promoCheck = await asegurarPromoExiste(promocion_id);
    if (!promoCheck.ok)
      return res.status(400).json({ message: promoCheck.msg });

    // Validar producto exista
    const [prodRows] = await db.query(
      "SELECT id FROM productos WHERE id = ? LIMIT 1",
      [producto_id]
    );
    if (!prodRows.length) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    // ¿Ya existe la relación?
    const [existe] = await db.query(
      `
      SELECT id
      FROM promocion_productos
      WHERE promocion_id = ? AND producto_id = ?
      LIMIT 1
      `,
      [promocion_id, producto_id]
    );

    if (existe.length) {
      // Update
      await db.query(
        `
        UPDATE promocion_productos
        SET cantidad = ?, es_regalo = ?, activo = ?
        WHERE id = ?
        `,
        [cantidad, es_regalo, activo, existe[0].id]
      );

      const [rows] = await db.query(
        `
        SELECT
          pp.id, pp.promocion_id, pp.producto_id, pp.cantidad, pp.es_regalo, pp.activo, pp.created_at,
          p.nombre AS producto_nombre, p.stock AS producto_stock, p.precio AS producto_precio
        FROM promocion_productos pp
        JOIN productos p ON p.id = pp.producto_id
        WHERE pp.id = ?
        LIMIT 1
        `,
        [existe[0].id]
      );

      return res.json({
        message: "Producto del combo actualizado.",
        item: rows[0],
      });
    }

    // Insert
    const [result] = await db.query(
      `
      INSERT INTO promocion_productos (promocion_id, producto_id, cantidad, es_regalo, activo)
      VALUES (?, ?, ?, ?, ?)
      `,
      [promocion_id, producto_id, cantidad, es_regalo, activo]
    );

    const [rows] = await db.query(
      `
      SELECT
        pp.id, pp.promocion_id, pp.producto_id, pp.cantidad, pp.es_regalo, pp.activo, pp.created_at,
        p.nombre AS producto_nombre, p.stock AS producto_stock, p.precio AS producto_precio
      FROM promocion_productos pp
      JOIN productos p ON p.id = pp.producto_id
      WHERE pp.id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return res.status(201).json({
      message: "Producto agregado al combo.",
      item: rows[0],
    });
  } catch (err) {
    console.error("POST /promocion_productos:", err);
    return res
      .status(500)
      .json({ message: "Error al agregar producto al combo." });
  }
});

/* =====================================================
   PUT /api/promocion_productos/:id
   Editar cantidades / marcar regalo / activar
   Body:
   { "cantidad": 2, "es_regalo": 1, "activo": 1 }
===================================================== */
router.put("/:id", async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const cantidad =
      req.body?.cantidad != null ? toInt(req.body.cantidad, NaN) : null;
    const es_regalo =
      req.body?.es_regalo != null ? toBool01(req.body.es_regalo, 0) : null;
    const activo =
      req.body?.activo != null ? toBool01(req.body.activo, 1) : null;

    const [existe] = await db.query(
      "SELECT id, promocion_id FROM promocion_productos WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existe.length) {
      return res.status(404).json({ message: "Registro no encontrado." });
    }

    // Construir update dinámico
    const sets = [];
    const params = [];

    if (cantidad != null) {
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return res
          .status(400)
          .json({ message: "cantidad debe ser mayor que 0." });
      }
      sets.push("cantidad = ?");
      params.push(cantidad);
    }

    if (es_regalo != null) {
      sets.push("es_regalo = ?");
      params.push(es_regalo);
    }

    if (activo != null) {
      sets.push("activo = ?");
      params.push(activo);
    }

    if (!sets.length) {
      return res
        .status(400)
        .json({ message: "No hay campos para actualizar." });
    }

    params.push(id);

    await db.query(
      `UPDATE promocion_productos SET ${sets.join(", ")} WHERE id = ?`,
      params
    );

    const [rows] = await db.query(
      `
      SELECT
        pp.id,
        pp.promocion_id,
        pp.producto_id,
        pp.cantidad,
        pp.es_regalo,
        pp.activo,
        pp.created_at,
        p.nombre AS producto_nombre,
        p.stock AS producto_stock,
        p.precio AS producto_precio
      FROM promocion_productos pp
      JOIN productos p ON p.id = pp.producto_id
      WHERE pp.id = ?
      LIMIT 1
      `,
      [id]
    );

    return res.json({
      message: "Producto del combo actualizado.",
      item: rows[0],
    });
  } catch (err) {
    console.error("PUT /promocion_productos/:id:", err);
    return res
      .status(500)
      .json({ message: "Error al actualizar producto del combo." });
  }
});

/* =====================================================
   PATCH /api/promocion_productos/:id/estado
   Activar/Desactivar item dentro del combo
   Body: { "activo": 0|1 }
===================================================== */
router.patch("/:id/estado", async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const activo = toBool01(req.body?.activo, NaN);
    if (!(activo === 0 || activo === 1)) {
      return res.status(400).json({ message: "activo debe ser 0 o 1." });
    }

    const [existe] = await db.query(
      "SELECT id FROM promocion_productos WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existe.length) {
      return res.status(404).json({ message: "Registro no encontrado." });
    }

    await db.query("UPDATE promocion_productos SET activo = ? WHERE id = ?", [
      activo,
      id,
    ]);

    return res.json({ message: "Estado actualizado.", activo });
  } catch (err) {
    console.error("PATCH /promocion_productos/:id/estado:", err);
    return res
      .status(500)
      .json({ message: "Error al cambiar estado del producto en el combo." });
  }
});

/* =====================================================
   DELETE /api/promocion_productos/:id
   Quitar producto de un combo (elimina la relación)
===================================================== */
router.delete("/:id", async (req, res) => {
  try {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const [existe] = await db.query(
      "SELECT id FROM promocion_productos WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existe.length) {
      return res.status(404).json({ message: "Registro no encontrado." });
    }

    await db.query("DELETE FROM promocion_productos WHERE id = ?", [id]);
    return res.json({ message: "Producto quitado del combo." });
  } catch (err) {
    console.error("DELETE /promocion_productos/:id:", err);
    return res
      .status(500)
      .json({ message: "Error al quitar producto del combo." });
  }
});

module.exports = router;
