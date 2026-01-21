// backend/routes/descuentos.js
const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");

const pool = require("../db"); // debe exportar pool con .query y .getConnection()
const auth = require("../middleware/auth");

/* =====================================================
   SOLO ADMIN (mismo criterio rol/role)
===================================================== */
function soloAdmin(req, res, next) {
  const rol = req.user?.rol || req.user?.role;
  if (!rol || String(rol).toLowerCase() !== "admin") {
    return res.status(403).json({ message: "No autorizado" });
  }
  next();
}

/* =====================================================
   Validación (respuestas claras)
===================================================== */
function validar(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const list = errors.array().map((e) => ({
      field: e.path || e.param,
      msg: e.msg,
      value: e.value,
    }));
    return res.status(400).json({
      message: "Validación fallida",
      errors: list,
    });
  }
  next();
}

/* =====================================================
   Helpers
===================================================== */
const TIPOS = ["PORCENTAJE", "MONTO_FIJO"];
const APLICA_SOBRE = ["SUBTOTAL", "TOTAL"];
const ALCANCES = ["VENTA", "PRODUCTO", "CATEGORIA"];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD (ideal para columnas DATE)

function normalizeEnum(v) {
  return v !== undefined && v !== null ? String(v).trim().toUpperCase() : v;
}

function asIntOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asDateOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).trim();
  return DATE_RE.test(s) ? s : null;
}

/* =====================================================
   GET /api/descuentos
   Query: activos=0|1, alcance, q
===================================================== */
router.get(
  "/",
  auth,
  [
    query("activos")
      .optional()
      .isIn(["0", "1"])
      .withMessage("activos debe ser 0 o 1"),
    query("alcance")
      .optional()
      .custom((v) => ALCANCES.includes(normalizeEnum(v)))
      .withMessage("alcance inválido"),
    query("q").optional().isString(),
  ],
  validar,
  async (req, res) => {
    try {
      const { activos, alcance, q } = req.query;

      const where = [];
      const params = [];

      if (activos !== undefined) {
        where.push("activo = ?");
        params.push(Number(activos));
      }
      if (alcance) {
        where.push("alcance = ?");
        params.push(normalizeEnum(alcance));
      }
      if (q) {
        where.push("(nombre LIKE ? OR descripcion LIKE ?)");
        params.push(`%${q}%`, `%${q}%`);
      }

      const sql = `
        SELECT *
        FROM descuentos
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY activo DESC, prioridad ASC, nombre ASC
      `;

      const [rows] = await pool.query(sql, params);
      return res.json(rows);
    } catch (error) {
      console.error("GET /descuentos error:", error);
      return res.status(500).json({ message: "Error del servidor" });
    }
  },
);

/* =====================================================
   GET /api/descuentos/:id
===================================================== */
router.get(
  "/:id",
  auth,
  [param("id").isInt().withMessage("id inválido")],
  validar,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const [rows] = await pool.query(
        "SELECT * FROM descuentos WHERE id = ? LIMIT 1",
        [id],
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Descuento no encontrado" });
      }

      return res.json(rows[0]);
    } catch (error) {
      console.error("GET /descuentos/:id error:", error);
      return res.status(500).json({ message: "Error del servidor" });
    }
  },
);

/* =====================================================
   POST /api/descuentos  (ADMIN)
   ✅ Fechas validadas como YYYY-MM-DD (DATE)
   ✅ optional({ nullable:true }) para soportar null
===================================================== */
router.post(
  "/",
  auth,
  soloAdmin,
  [
    body("nombre")
      .isString()
      .isLength({ min: 2, max: 120 })
      .withMessage("nombre requerido (2-120)"),

    body("descripcion")
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 255 })
      .withMessage("descripcion inválida (máx 255)"),

    body("tipo")
      .optional({ nullable: true })
      .custom((v) => TIPOS.includes(normalizeEnum(v)))
      .withMessage("tipo inválido"),

    body("valor").isFloat({ min: 0 }).withMessage("valor debe ser >= 0"),

    body("aplica_sobre")
      .optional({ nullable: true })
      .custom((v) => APLICA_SOBRE.includes(normalizeEnum(v)))
      .withMessage("aplica_sobre inválido"),

    body("alcance")
      .optional({ nullable: true })
      .custom((v) => ALCANCES.includes(normalizeEnum(v)))
      .withMessage("alcance inválido"),

    body("edad_min")
      .optional({ nullable: true })
      .isInt({ min: 0, max: 150 })
      .withMessage("edad_min inválida"),

    body("edad_max")
      .optional({ nullable: true })
      .isInt({ min: 0, max: 150 })
      .withMessage("edad_max inválida"),

    body("requiere_documento")
      .optional({ nullable: true })
      .isIn([0, 1, true, false, "0", "1"])
      .withMessage("requiere_documento debe ser 0 o 1"),

    body("acumulable")
      .optional({ nullable: true })
      .isIn([0, 1, true, false, "0", "1"])
      .withMessage("acumulable debe ser 0 o 1"),

    body("prioridad")
      .optional({ nullable: true })
      .isInt({ min: 0, max: 9999 })
      .withMessage("prioridad inválida"),

    body("fecha_inicio")
      .optional({ nullable: true })
      .custom((v) => v === null || v === "" || DATE_RE.test(String(v)))
      .withMessage("fecha_inicio debe ser YYYY-MM-DD"),

    body("fecha_fin")
      .optional({ nullable: true })
      .custom((v) => v === null || v === "" || DATE_RE.test(String(v)))
      .withMessage("fecha_fin debe ser YYYY-MM-DD"),

    body("activo")
      .optional({ nullable: true })
      .isIn([0, 1, true, false, "0", "1"])
      .withMessage("activo debe ser 0 o 1"),
  ],
  validar,
  async (req, res) => {
    try {
      const payload = req.body;

      const tipo = normalizeEnum(payload.tipo || "PORCENTAJE");
      const aplica_sobre = normalizeEnum(payload.aplica_sobre || "SUBTOTAL");
      const alcance = normalizeEnum(payload.alcance || "VENTA");

      const edad_min = asIntOrNull(payload.edad_min);
      const edad_max = asIntOrNull(payload.edad_max);

      if (edad_min !== null && edad_max !== null && edad_min > edad_max) {
        return res
          .status(400)
          .json({ message: "edad_min no puede ser mayor que edad_max" });
      }

      const requiere_documento =
        payload.requiere_documento !== undefined
          ? Number(payload.requiere_documento ? 1 : 0)
          : 0;

      const acumulable =
        payload.acumulable !== undefined
          ? Number(payload.acumulable ? 1 : 0)
          : 0;

      const prioridad =
        payload.prioridad !== undefined ? Number(payload.prioridad) : 100;

      const fecha_inicio = asDateOrNull(payload.fecha_inicio);
      const fecha_fin = asDateOrNull(payload.fecha_fin);

      // si mandaron fecha pero no cumple formato, lo rechazamos con mensaje claro
      if (
        payload.fecha_inicio &&
        fecha_inicio === null &&
        String(payload.fecha_inicio).trim() !== ""
      ) {
        return res
          .status(400)
          .json({ message: "fecha_inicio debe ser YYYY-MM-DD" });
      }
      if (
        payload.fecha_fin &&
        fecha_fin === null &&
        String(payload.fecha_fin).trim() !== ""
      ) {
        return res
          .status(400)
          .json({ message: "fecha_fin debe ser YYYY-MM-DD" });
      }
      if (fecha_inicio && fecha_fin && fecha_inicio > fecha_fin) {
        return res
          .status(400)
          .json({ message: "fecha_inicio no puede ser mayor que fecha_fin" });
      }

      const activo =
        payload.activo !== undefined ? Number(payload.activo ? 1 : 0) : 1;

      const sql = `
        INSERT INTO descuentos
          (nombre, descripcion, tipo, valor, aplica_sobre, alcance, edad_min, edad_max, requiere_documento, acumulable, prioridad, fecha_inicio, fecha_fin, activo)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        String(payload.nombre).trim(),
        payload.descripcion !== undefined && payload.descripcion !== null
          ? String(payload.descripcion).trim() || null
          : null,
        tipo,
        Number(payload.valor),
        aplica_sobre,
        alcance,
        edad_min,
        edad_max,
        requiere_documento,
        acumulable,
        prioridad,
        fecha_inicio,
        fecha_fin,
        activo,
      ];

      const [result] = await pool.query(sql, params);

      const [rows] = await pool.query("SELECT * FROM descuentos WHERE id = ?", [
        result.insertId,
      ]);

      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error("POST /descuentos error:", error);

      if (String(error?.code) === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ message: "Ya existe un descuento con ese nombre" });
      }

      return res.status(500).json({ message: "Error del servidor" });
    }
  },
);

/* =====================================================
   PUT /api/descuentos/:id  (ADMIN)
   ✅ Fechas validadas como YYYY-MM-DD (DATE)
   ✅ optional({ nullable:true }) para soportar null
===================================================== */
router.put(
  "/:id",
  auth,
  soloAdmin,
  [
    param("id").isInt().withMessage("id inválido"),

    body("nombre")
      .isString()
      .isLength({ min: 2, max: 120 })
      .withMessage("nombre requerido (2-120)"),

    body("descripcion")
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 255 })
      .withMessage("descripcion inválida (máx 255)"),

    body("tipo")
      .custom((v) => TIPOS.includes(normalizeEnum(v)))
      .withMessage("tipo inválido"),

    body("valor").isFloat({ min: 0 }).withMessage("valor inválido"),

    body("aplica_sobre")
      .custom((v) => APLICA_SOBRE.includes(normalizeEnum(v)))
      .withMessage("aplica_sobre inválido"),

    body("alcance")
      .custom((v) => ALCANCES.includes(normalizeEnum(v)))
      .withMessage("alcance inválido"),

    body("edad_min")
      .optional({ nullable: true })
      .isInt({ min: 0, max: 150 })
      .withMessage("edad_min inválida"),

    body("edad_max")
      .optional({ nullable: true })
      .isInt({ min: 0, max: 150 })
      .withMessage("edad_max inválida"),

    body("requiere_documento")
      .optional({ nullable: true })
      .isIn([0, 1, true, false, "0", "1"])
      .withMessage("requiere_documento debe ser 0 o 1"),

    body("acumulable")
      .optional({ nullable: true })
      .isIn([0, 1, true, false, "0", "1"])
      .withMessage("acumulable debe ser 0 o 1"),

    body("prioridad")
      .optional({ nullable: true })
      .isInt({ min: 0, max: 9999 })
      .withMessage("prioridad inválida"),

    body("fecha_inicio")
      .optional({ nullable: true })
      .custom((v) => v === null || v === "" || DATE_RE.test(String(v)))
      .withMessage("fecha_inicio debe ser YYYY-MM-DD"),

    body("fecha_fin")
      .optional({ nullable: true })
      .custom((v) => v === null || v === "" || DATE_RE.test(String(v)))
      .withMessage("fecha_fin debe ser YYYY-MM-DD"),

    body("activo")
      .optional({ nullable: true })
      .isIn([0, 1, true, false, "0", "1"])
      .withMessage("activo debe ser 0 o 1"),
  ],
  validar,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const payload = req.body;

      // validar existencia
      const [exists] = await pool.query(
        "SELECT id FROM descuentos WHERE id = ? LIMIT 1",
        [id],
      );
      if (!exists.length) {
        return res.status(404).json({ message: "Descuento no encontrado" });
      }

      const tipo = normalizeEnum(payload.tipo);
      const aplica_sobre = normalizeEnum(payload.aplica_sobre);
      const alcance = normalizeEnum(payload.alcance);

      const edad_min = asIntOrNull(payload.edad_min);
      const edad_max = asIntOrNull(payload.edad_max);

      if (edad_min !== null && edad_max !== null && edad_min > edad_max) {
        return res
          .status(400)
          .json({ message: "edad_min no puede ser mayor que edad_max" });
      }

      const requiere_documento =
        payload.requiere_documento !== undefined
          ? Number(payload.requiere_documento ? 1 : 0)
          : 0;

      const acumulable =
        payload.acumulable !== undefined
          ? Number(payload.acumulable ? 1 : 0)
          : 0;

      const prioridad =
        payload.prioridad !== undefined ? Number(payload.prioridad) : 100;

      const fecha_inicio = asDateOrNull(payload.fecha_inicio);
      const fecha_fin = asDateOrNull(payload.fecha_fin);

      if (fecha_inicio && fecha_fin && fecha_inicio > fecha_fin) {
        return res
          .status(400)
          .json({ message: "fecha_inicio no puede ser mayor que fecha_fin" });
      }

      const activo =
        payload.activo !== undefined ? Number(payload.activo ? 1 : 0) : 1;

      const sql = `
        UPDATE descuentos
        SET nombre = ?,
            descripcion = ?,
            tipo = ?,
            valor = ?,
            aplica_sobre = ?,
            alcance = ?,
            edad_min = ?,
            edad_max = ?,
            requiere_documento = ?,
            acumulable = ?,
            prioridad = ?,
            fecha_inicio = ?,
            fecha_fin = ?,
            activo = ?
        WHERE id = ?
      `;

      const params = [
        String(payload.nombre).trim(),
        payload.descripcion !== undefined && payload.descripcion !== null
          ? String(payload.descripcion).trim() || null
          : null,
        tipo,
        Number(payload.valor),
        aplica_sobre,
        alcance,
        edad_min,
        edad_max,
        requiere_documento,
        acumulable,
        prioridad,
        fecha_inicio,
        fecha_fin,
        activo,
        id,
      ];

      await pool.query(sql, params);

      const [rows] = await pool.query("SELECT * FROM descuentos WHERE id = ?", [
        id,
      ]);
      return res.json(rows[0]);
    } catch (error) {
      console.error("PUT /descuentos/:id error:", error);

      if (String(error?.code) === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ message: "Ya existe un descuento con ese nombre" });
      }

      return res.status(500).json({ message: "Error del servidor" });
    }
  },
);

/* =====================================================
   PATCH /api/descuentos/:id/estado  (ADMIN)
===================================================== */
router.patch(
  "/:id/estado",
  auth,
  soloAdmin,
  [
    param("id").isInt().withMessage("id inválido"),
    body("activo")
      .isIn([0, 1, true, false, "0", "1"])
      .withMessage("activo debe ser 0 o 1"),
  ],
  validar,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const activo = Number(req.body.activo ? 1 : 0);

      const [result] = await pool.query(
        "UPDATE descuentos SET activo = ? WHERE id = ?",
        [activo, id],
      );

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Descuento no encontrado" });
      }

      const [rows] = await pool.query("SELECT * FROM descuentos WHERE id = ?", [
        id,
      ]);
      return res.json(rows[0]);
    } catch (error) {
      console.error("PATCH /descuentos/:id/estado error:", error);
      return res.status(500).json({ message: "Error del servidor" });
    }
  },
);

/* =====================================================
   RELACIONES: PRODUCTOS
   GET /api/descuentos/:id/productos
   PUT /api/descuentos/:id/productos  body: { ids: [] }
===================================================== */
router.get(
  "/:id/productos",
  auth,
  [param("id").isInt().withMessage("id inválido")],
  validar,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const [rows] = await pool.query(
        `SELECT dp.id_producto, p.nombre, p.codigo
         FROM descuento_productos dp
         INNER JOIN productos p ON p.id = dp.id_producto
         WHERE dp.id_descuento = ?
         ORDER BY p.nombre ASC`,
        [id],
      );

      return res.json(rows);
    } catch (error) {
      console.error("GET /descuentos/:id/productos error:", error);
      return res.status(500).json({ message: "Error del servidor" });
    }
  },
);

router.put(
  "/:id/productos",
  auth,
  soloAdmin,
  [
    param("id").isInt().withMessage("id inválido"),
    body("ids").isArray().withMessage("ids debe ser un array"),
  ],
  validar,
  async (req, res) => {
    const conn = await pool.getConnection();
    try {
      const id = Number(req.params.id);
      const ids = (req.body.ids || [])
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0);

      await conn.beginTransaction();

      // valida que el descuento existe
      const [d] = await conn.query(
        "SELECT id FROM descuentos WHERE id = ? LIMIT 1",
        [id],
      );
      if (!d.length) {
        await conn.rollback();
        return res.status(404).json({ message: "Descuento no encontrado" });
      }

      await conn.query(
        "DELETE FROM descuento_productos WHERE id_descuento = ?",
        [id],
      );

      if (ids.length) {
        const values = ids.map((pid) => [id, pid]);
        await conn.query(
          "INSERT INTO descuento_productos (id_descuento, id_producto) VALUES ?",
          [values],
        );
      }

      await conn.commit();
      return res.json({
        message: "Productos asignados correctamente",
        total: ids.length,
      });
    } catch (error) {
      try {
        await conn.rollback();
      } catch {}
      console.error("PUT /descuentos/:id/productos error:", error);
      return res.status(500).json({ message: "Error del servidor" });
    } finally {
      conn.release();
    }
  },
);

/* =====================================================
   RELACIONES: CATEGORIAS
   GET /api/descuentos/:id/categorias
   PUT /api/descuentos/:id/categorias  body: { ids: [] }
===================================================== */
router.get(
  "/:id/categorias",
  auth,
  [param("id").isInt().withMessage("id inválido")],
  validar,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const [rows] = await pool.query(
        `SELECT dc.id_categoria, c.nombre
         FROM descuento_categorias dc
         INNER JOIN categorias c ON c.id = dc.id_categoria
         WHERE dc.id_descuento = ?
         ORDER BY c.nombre ASC`,
        [id],
      );

      return res.json(rows);
    } catch (error) {
      console.error("GET /descuentos/:id/categorias error:", error);
      return res.status(500).json({ message: "Error del servidor" });
    }
  },
);

router.put(
  "/:id/categorias",
  auth,
  soloAdmin,
  [
    param("id").isInt().withMessage("id inválido"),
    body("ids").isArray().withMessage("ids debe ser un array"),
  ],
  validar,
  async (req, res) => {
    const conn = await pool.getConnection();
    try {
      const id = Number(req.params.id);
      const ids = (req.body.ids || [])
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0);

      await conn.beginTransaction();

      const [d] = await conn.query(
        "SELECT id FROM descuentos WHERE id = ? LIMIT 1",
        [id],
      );
      if (!d.length) {
        await conn.rollback();
        return res.status(404).json({ message: "Descuento no encontrado" });
      }

      await conn.query(
        "DELETE FROM descuento_categorias WHERE id_descuento = ?",
        [id],
      );

      if (ids.length) {
        const values = ids.map((cid) => [id, cid]);
        await conn.query(
          "INSERT INTO descuento_categorias (id_descuento, id_categoria) VALUES ?",
          [values],
        );
      }

      await conn.commit();
      return res.json({
        message: "Categorías asignadas correctamente",
        total: ids.length,
      });
    } catch (error) {
      try {
        await conn.rollback();
      } catch {}
      console.error("PUT /descuentos/:id/categorias error:", error);
      return res.status(500).json({ message: "Error del servidor" });
    } finally {
      conn.release();
    }
  },
);

/* =====================================================
   POST /api/descuentos/aplicables
   (para pantalla de ventas)
===================================================== */
router.post(
  "/aplicables",
  auth,
  [
    body("edad").optional({ nullable: true }).isInt({ min: 0, max: 150 }),
    body("id_productos").optional({ nullable: true }).isArray(),
    body("id_categorias").optional({ nullable: true }).isArray(),
  ],
  validar,
  async (req, res) => {
    try {
      const edad = req.body.edad !== undefined ? Number(req.body.edad) : null;

      const id_productos = (req.body.id_productos || [])
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0);

      const id_categorias = (req.body.id_categorias || [])
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0);

      // Base: activos y vigentes
      const sqlBase = `
        SELECT *
        FROM descuentos d
        WHERE d.activo = 1
          AND (d.fecha_inicio IS NULL OR d.fecha_inicio <= CURDATE())
          AND (d.fecha_fin IS NULL OR d.fecha_fin >= CURDATE())
          AND (
            (d.edad_min IS NULL AND d.edad_max IS NULL)
            ${
              edad !== null
                ? " OR ( (d.edad_min IS NULL OR d.edad_min <= ?) AND (d.edad_max IS NULL OR d.edad_max >= ?) )"
                : ""
            }
          )
        ORDER BY d.prioridad ASC, d.id ASC
      `;

      const params = [];
      if (edad !== null) params.push(edad, edad);

      const [descuentos] = await pool.query(sqlBase, params);

      const filtrados = [];

      for (const d of descuentos) {
        if (d.alcance === "VENTA") {
          filtrados.push(d);
          continue;
        }

        if (d.alcance === "PRODUCTO") {
          if (!id_productos.length) continue;

          const [rel] = await pool.query(
            `SELECT 1
             FROM descuento_productos
             WHERE id_descuento = ?
               AND id_producto IN (${id_productos.map(() => "?").join(",")})
             LIMIT 1`,
            [d.id, ...id_productos],
          );

          if (rel.length) filtrados.push(d);
          continue;
        }

        if (d.alcance === "CATEGORIA") {
          if (!id_categorias.length) continue;

          const [rel] = await pool.query(
            `SELECT 1
             FROM descuento_categorias
             WHERE id_descuento = ?
               AND id_categoria IN (${id_categorias.map(() => "?").join(",")})
             LIMIT 1`,
            [d.id, ...id_categorias],
          );

          if (rel.length) filtrados.push(d);
          continue;
        }
      }

      return res.json(filtrados);
    } catch (error) {
      console.error("POST /descuentos/aplicables error:", error);
      return res.status(500).json({ message: "Error del servidor" });
    }
  },
);

module.exports = router;
