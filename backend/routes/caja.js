// backend/routes/caja.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/* =====================================================
   Helpers
===================================================== */
const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toStr = (v) => String(v ?? "").trim();

/* =====================================================
   Middleware rol (req.user viene del auth global)
===================================================== */
const requireRoles =
  (...roles) =>
  (req, res, next) => {
    const rol = req.user?.rol;
    if (!rol || !roles.includes(rol)) {
      return res.status(403).json({ message: "Acceso denegado." });
    }
    next();
  };

/* =====================================================
   GET /api/caja/estado
   - cajero: solo su caja (ignora ?usuario_id)
   - admin: puede consultar otra caja con ?usuario_id=xx
            si no manda, consulta la suya
===================================================== */
router.get("/estado", requireRoles("admin", "cajero"), async (req, res) => {
  try {
    const rol = req.user.rol;
    const userId = req.user.id;

    // ✅ admin puede consultar otro usuario por query param
    let targetUserId = userId;

    if (rol === "admin") {
      const q = Number(req.query.usuario_id);
      if (Number.isInteger(q) && q > 0) targetUserId = q;
    }

    // ✅ cajero NO puede consultar otra caja aunque mande usuario_id
    const [rows] = await db.query(
      `SELECT *
       FROM cierres_caja
       WHERE usuario_id = ? AND estado = 'abierta'
       ORDER BY fecha_apertura DESC
       LIMIT 1`,
      [targetUserId]
    );

    if (!rows.length) {
      return res.json({ abierta: false, usuario_id: targetUserId });
    }

    return res.json({ abierta: true, usuario_id: targetUserId, caja: rows[0] });
  } catch (err) {
    console.error("❌ caja/estado:", err);
    return res
      .status(500)
      .json({ message: "Error al consultar estado de caja" });
  }
});


/* =====================================================
   POST /api/caja/abrir
   Body: { monto_apertura }
   - Solo admin/cajero
   - No permite abrir si ya hay una caja abierta del usuario
===================================================== */
router.post("/abrir", requireRoles("admin", "cajero"), async (req, res) => {
  try {
    const userId = req.user.id;
    const monto_apertura = toNumber(req.body?.monto_apertura);

    if (monto_apertura === null || monto_apertura < 0) {
      return res.status(400).json({ message: "monto_apertura inválido" });
    }

    // Verificar si ya tiene caja abierta
    const [abierta] = await db.query(
      `SELECT id
       FROM cierres_caja
       WHERE usuario_id = ? AND estado = 'abierta'
       LIMIT 1`,
      [userId]
    );

    if (abierta.length > 0) {
      return res.status(409).json({
        message:
          "Ya tienes una caja abierta. Debes cerrarla antes de abrir otra.",
      });
    }

    const [result] = await db.query(
      `INSERT INTO cierres_caja (usuario_id, estado, monto_apertura)
       VALUES (?, 'abierta', ?)`,
      [userId, monto_apertura]
    );

    const cajaId = result.insertId;

    const [cajaRows] = await db.query(
      "SELECT * FROM cierres_caja WHERE id = ? LIMIT 1",
      [cajaId]
    );

    return res.status(201).json({
      message: "Caja abierta correctamente",
      caja: cajaRows[0],
    });
  } catch (err) {
    console.error("❌ caja/abrir:", err);
    return res.status(500).json({ message: "Error al abrir caja" });
  }
});

/* =====================================================
   POST /api/caja/cerrar
   Body: { efectivo_contado, observacion }
   - Solo admin/cajero
   - Cierra la caja abierta del usuario y calcula totales
===================================================== */
router.post("/cerrar", requireRoles("admin", "cajero"), async (req, res) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const userId = req.user.id;
    const efectivo_contado = toNumber(req.body?.efectivo_contado);
    const observacion = toStr(req.body?.observacion);

    if (efectivo_contado === null || efectivo_contado < 0) {
      await connection.rollback();
      return res.status(400).json({ message: "efectivo_contado inválido" });
    }

    // 1) Obtener caja abierta (del usuario)
    const [rows] = await connection.query(
      `SELECT *
       FROM cierres_caja
       WHERE usuario_id = ? AND estado = 'abierta'
       ORDER BY fecha_apertura DESC
       LIMIT 1`,
      [userId]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "No tienes una caja abierta." });
    }

    const caja = rows[0];
    const cajaId = caja.id;
    const fecha_apertura = caja.fecha_apertura;
    const monto_apertura = Number(caja.monto_apertura || 0);

    // ✅ 2) Calcular totales del sistema (POR CAJA_ID = estándar POS)
    //    Esto evita mezclar ventas si el usuario abre/cierra varias cajas en el día.
    const [totalesRows] = await connection.query(
      `SELECT
        IFNULL(SUM(total_con_impuesto), 0) AS total_ventas,
        IFNULL(SUM(CASE WHEN metodo_pago='efectivo' THEN total_con_impuesto ELSE 0 END), 0) AS total_efectivo,
        IFNULL(SUM(CASE WHEN metodo_pago='tarjeta' THEN total_con_impuesto ELSE 0 END), 0) AS total_tarjeta
      FROM ventas
      WHERE caja_id = ?`,
      [cajaId]
    );

    const total_ventas = Number(totalesRows[0]?.total_ventas || 0);
    const total_efectivo = Number(totalesRows[0]?.total_efectivo || 0);
    const total_tarjeta = Number(totalesRows[0]?.total_tarjeta || 0);

    // 3) Diferencia (lo contado vs lo esperado)
    const esperado_efectivo = Number(
      (monto_apertura + total_efectivo).toFixed(2)
    );
    const diferencia = Number(
      (efectivo_contado - esperado_efectivo).toFixed(2)
    );

    // 4) Actualizar cierre
    await connection.query(
      `UPDATE cierres_caja
       SET estado='cerrada',
           fecha_cierre=NOW(),
           efectivo_contado=?,
           total_ventas=?,
           total_efectivo=?,
           total_tarjeta=?,
           diferencia=?,
           observacion=?
       WHERE id=?`,
      [
        efectivo_contado,
        total_ventas,
        total_efectivo,
        total_tarjeta,
        diferencia,
        observacion || null,
        cajaId,
      ]
    );

    await connection.commit();

    // 5) Respuesta
    return res.json({
      message: "Caja cerrada correctamente",
      caja: {
        id: cajaId,
        usuario_id: userId,
        fecha_apertura,
        fecha_cierre: new Date().toISOString(), // referencia; el valor real queda en BD
        monto_apertura,
        total_ventas,
        total_efectivo,
        total_tarjeta,
        efectivo_contado,
        esperado_efectivo,
        diferencia,
        observacion: observacion || "",
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error("❌ caja/cerrar:", err);
    return res.status(500).json({ message: "Error al cerrar caja" });
  } finally {
    connection.release();
  }
});


/* =====================================================
   GET /api/caja/historial?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&usuario_id=xx
   - admin: ve todos + puede filtrar por usuario_id
   - cajero: solo ve los suyos
===================================================== */
router.get("/historial", requireRoles("admin", "cajero"), async (req, res) => {
  try {
    const rol = req.user.rol;
    const userId = req.user.id;

    const desde = toStr(req.query.desde); // YYYY-MM-DD
    const hasta = toStr(req.query.hasta); // YYYY-MM-DD
    const estado = toStr(req.query.estado); // 'abierta' | 'cerrada' (opcional)
    const usuario_id_q = Number(req.query.usuario_id); // admin (opcional)

    let sql = `
      SELECT
        cc.*,
        u.nombre AS cajero,
        -- ✅ total de facturas emitidas en esa caja (si usas caja_id en ventas)
        COUNT(DISTINCT f.id) AS total_facturas,
        -- ✅ totales por método (desde facturas; o puedes usar ventas si prefieres)
        IFNULL(SUM(CASE WHEN f.metodo_pago='efectivo' THEN f.total_factura ELSE 0 END), 0) AS total_facturado_efectivo,
        IFNULL(SUM(CASE WHEN f.metodo_pago='tarjeta' THEN f.total_factura ELSE 0 END), 0) AS total_facturado_tarjeta
      FROM cierres_caja cc
      JOIN usuarios u ON u.id = cc.usuario_id
      LEFT JOIN ventas v ON v.caja_id = cc.id
      LEFT JOIN facturas f ON f.venta_id = v.id
      WHERE 1=1
    `;

    const params = [];

    // ✅ cajero: solo sus cierres
    if (rol === "cajero") {
      sql += " AND cc.usuario_id = ? ";
      params.push(userId);
    } else {
      // ✅ admin: puede filtrar por cajero
      if (Number.isInteger(usuario_id_q) && usuario_id_q > 0) {
        sql += " AND cc.usuario_id = ? ";
        params.push(usuario_id_q);
      }
    }

    // ✅ filtro por estado (opcional)
    if (estado && (estado === "abierta" || estado === "cerrada")) {
      sql += " AND cc.estado = ? ";
      params.push(estado);
    }

    // ✅ filtros por fechas (sobre fecha_apertura)
    if (desde) {
      sql += " AND DATE(cc.fecha_apertura) >= ? ";
      params.push(desde);
    }
    if (hasta) {
      sql += " AND DATE(cc.fecha_apertura) <= ? ";
      params.push(hasta);
    }

    sql += `
      GROUP BY cc.id
      ORDER BY cc.fecha_apertura DESC
    `;

    const [rows] = await db.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error("❌ caja/historial:", err);
    return res
      .status(500)
      .json({ message: "Error al obtener historial de caja" });
  }
});

/* =====================================================
   GET /api/caja/:id/facturas
   - Devuelve facturas asociadas a una caja (cierres_caja.id)
   - admin: ve todas
   - cajero: solo si la caja es suya
===================================================== */
router.get("/:id/facturas", requireRoles("admin", "cajero"), async (req, res) => {
  try {
    const cajaId = Number(req.params.id);
    if (!Number.isInteger(cajaId) || cajaId <= 0) {
      return res.status(400).json({ message: "ID de caja inválido" });
    }

    // 1) Validar que exista la caja
    const [cajaRows] = await db.query(
      `SELECT id, usuario_id, estado
       FROM cierres_caja
       WHERE id = ?
       LIMIT 1`,
      [cajaId]
    );

    if (!cajaRows.length) {
      return res.status(404).json({ message: "Caja no encontrada" });
    }

    const caja = cajaRows[0];

    // 2) Seguridad: si es cajero, solo puede ver su caja
    if (
      req.user.rol === "cajero" &&
      Number(caja.usuario_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ message: "Acceso denegado." });
    }

    // 3) Obtener facturas asociadas a las ventas de esa caja
    //    RELACIÓN REAL:
    //    facturas.venta_id -> ventas.id
    //    ventas.caja_id -> cierres_caja.id
    const [facturas] = await db.query(
      `SELECT
         f.id,
         f.numero_factura,
         f.fecha_emision,
         f.total_factura,
         f.metodo_pago,
         f.efectivo,
         f.cambio,
         f.venta_id
       FROM facturas f
       INNER JOIN ventas v ON v.id = f.venta_id
       WHERE v.caja_id = ?
       ORDER BY f.fecha_emision ASC`,
      [cajaId]
    );

    // 4) Resumen
    const resumen = {
      total_facturas: facturas.length,
      total_monto: 0,
      facturas_efectivo: 0,
      monto_efectivo: 0,
      facturas_tarjeta: 0,
      monto_tarjeta: 0,
      facturas_otro: 0,
      monto_otro: 0,
    };

    for (const f of facturas) {
      const monto = Number(f.total_factura || 0);
      resumen.total_monto += monto;

      const mp = String(f.metodo_pago || "").toLowerCase();
      if (mp === "efectivo") {
        resumen.facturas_efectivo += 1;
        resumen.monto_efectivo += monto;
      } else if (mp === "tarjeta") {
        resumen.facturas_tarjeta += 1;
        resumen.monto_tarjeta += monto;
      } else {
        resumen.facturas_otro += 1;
        resumen.monto_otro += monto;
      }
    }

    // redondeo bonito
    resumen.total_monto = Number(resumen.total_monto.toFixed(2));
    resumen.monto_efectivo = Number(resumen.monto_efectivo.toFixed(2));
    resumen.monto_tarjeta = Number(resumen.monto_tarjeta.toFixed(2));
    resumen.monto_otro = Number(resumen.monto_otro.toFixed(2));

    return res.json({ resumen, facturas });
  } catch (err) {
    console.error("❌ caja/:id/facturas:", err);
    return res
      .status(500)
      .json({ message: "Error al obtener facturas de la caja" });
  }
});







module.exports = router;
