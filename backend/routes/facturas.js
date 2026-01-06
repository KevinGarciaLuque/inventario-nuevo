const express = require("express");
const router = express.Router();
const db = require("../db");

const IVA_FACTOR = 1.15;

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

const toStr = (v) => String(v ?? "").trim();

/* =====================================================
   ✅ Listado de facturas
   - admin: ve todas
   - cajero: ve solo las suyas
   - filtros opcionales:
      ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
      ?usuario_id=xx  (solo admin)
===================================================== */
router.get("/", requireRoles("admin", "cajero"), async (req, res) => {
  try {
    const rol = req.user.rol;
    const userId = req.user.id;

    const desde = toStr(req.query.desde);
    const hasta = toStr(req.query.hasta);
    const usuario_id_q = Number(req.query.usuario_id);

    let sql = `
      SELECT 
        f.id,
        f.numero_factura,
        f.fecha_emision,
        f.total_factura,
        v.usuario_id,
        u.nombre AS cajero,
        c.cai_codigo
      FROM facturas f
      INNER JOIN ventas v ON v.id = f.venta_id
      INNER JOIN usuarios u ON u.id = v.usuario_id
      INNER JOIN cai c ON c.id = f.cai_id
      WHERE 1=1
    `;
    const params = [];

    // ✅ si es cajero, solo sus facturas
    if (rol === "cajero") {
      sql += " AND v.usuario_id = ? ";
      params.push(userId);
    } else {
      // ✅ admin puede filtrar por usuario_id
      if (Number.isInteger(usuario_id_q) && usuario_id_q > 0) {
        sql += " AND v.usuario_id = ? ";
        params.push(usuario_id_q);
      }
    }

    // ✅ filtros por fecha (opcional)
    // usando DATE(fecha_emision) para trabajar con YYYY-MM-DD
    if (desde) {
      sql += " AND DATE(f.fecha_emision) >= ? ";
      params.push(desde);
    }
    if (hasta) {
      sql += " AND DATE(f.fecha_emision) <= ? ";
      params.push(hasta);
    }

    sql += " ORDER BY f.fecha_emision DESC";

    const [facturas] = await db.query(sql, params);
    res.json(facturas);
  } catch (error) {
    console.error("Error al obtener facturas:", error);
    res.status(500).json({ message: "Error al obtener facturas" });
  }
});

/* =====================================================
   ✅ Detalle completo de una factura (para imprimir PDF)
   - admin: cualquiera
   - cajero: solo si la factura es suya
===================================================== */
router.get("/:id", requireRoles("admin", "cajero"), async (req, res) => {
  const facturaId = Number(req.params.id);
  if (!Number.isInteger(facturaId) || facturaId <= 0) {
    return res.status(400).json({ message: "ID inválido" });
  }

  try {
    // 1) Obtener datos de la factura (incluye usuario_id)
    const [facturaRows] = await db.query(
      `SELECT 
        f.id,
        f.numero_factura, f.fecha_emision,
        f.cliente_nombre, f.cliente_rtn, f.cliente_direccion,
        f.total_factura,
        v.id AS venta_id, v.usuario_id, v.metodo_pago, v.efectivo, v.cambio,
        u.nombre AS cajero,
        c.cai_codigo, c.rango_inicio, c.rango_fin,
        c.fecha_autorizacion, c.fecha_limite_emision
      FROM facturas f
      JOIN ventas v ON f.venta_id = v.id
      JOIN usuarios u ON v.usuario_id = u.id
      JOIN cai c ON f.cai_id = c.id
      WHERE f.id = ?`,
      [facturaId]
    );

    if (!facturaRows.length) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    const row = facturaRows[0];

    // ✅ Seguridad: cajero solo ve sus facturas
    if (
      req.user.rol === "cajero" &&
      Number(row.usuario_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ message: "Acceso denegado." });
    }

    const factura = {
      ...row,
      cliente_nombre: row.cliente_nombre ?? "",
      cliente_rtn: row.cliente_rtn ?? "",
      cliente_direccion: row.cliente_direccion ?? "",
      metodo_pago: row.metodo_pago ?? "efectivo",
      efectivo: Number(row.efectivo ?? 0),
      cambio: Number(row.cambio ?? 0),
      total_factura: Number(row.total_factura ?? 0),
    };

    // 2) Obtener productos de la factura
    const [items] = await db.query(
      `SELECT 
         p.codigo,
         p.nombre,
         dv.cantidad,
         dv.precio_unitario AS precio,
         dv.subtotal
       FROM detalle_ventas dv
       JOIN productos p ON dv.producto_id = p.id
       WHERE dv.venta_id = ?`,
      [factura.venta_id]
    );

    // 3) Totales
    // ✅ Para consistencia: si f.total_factura está guardado, úsalo como "total"
    // y calcula subtotal/impuesto a partir de ese total (impuesto incluido).
    const total = Number(
      (factura.total_factura && factura.total_factura > 0
        ? factura.total_factura
        : items.reduce(
            (acc, it) => acc + Number(it.subtotal ?? it.cantidad * it.precio),
            0
          )
      ).toFixed(2)
    );

    const subtotal = Number((total / IVA_FACTOR).toFixed(2));
    const impuesto = Number((total - subtotal).toFixed(2));

    // 4) Respuesta completa para generar PDF
    res.json({
      numero_factura: factura.numero_factura,
      fecha_emision: factura.fecha_emision,
      cliente_nombre: factura.cliente_nombre,
      cliente_rtn: factura.cliente_rtn,
      cliente_direccion: factura.cliente_direccion,

      carrito: items.map((it) => ({
        codigo: it.codigo,
        nombre: it.nombre,
        cantidad: Number(it.cantidad),
        precio: Number(it.precio),
      })),

      subtotal,
      impuesto,
      total,

      metodo_pago: factura.metodo_pago,
      efectivo: factura.efectivo,
      cambio: factura.cambio,

      user: { nombre: factura.cajero, id: factura.usuario_id },

      cai: {
        cai_codigo: factura.cai_codigo,
        rango_inicio: String(factura.rango_inicio),
        rango_fin: String(factura.rango_fin),
        fecha_autorizacion: factura.fecha_autorizacion,
        fecha_limite_emision: factura.fecha_limite_emision,
      },
    });
  } catch (error) {
    console.error("Error al obtener detalle de factura:", error);
    res.status(500).json({ message: "Error al obtener detalle de factura" });
  }
});

module.exports = router;
