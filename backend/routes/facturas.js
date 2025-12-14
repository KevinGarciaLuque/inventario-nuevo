const express = require("express");
const router = express.Router();
const db = require("../db");

// ✅ Listado general de facturas
router.get("/", async (req, res) => {
  try {
    const [facturas] = await db.query(
      `SELECT 
          f.id, 
          f.numero_factura, 
          f.fecha_emision, 
          f.total_factura, 
          v.usuario_id, 
          c.cai_codigo
        FROM facturas f
        INNER JOIN ventas v ON v.id = f.venta_id
        INNER JOIN cai c ON c.id = f.cai_id
        ORDER BY f.fecha_emision DESC`
    );
    res.json(facturas);
  } catch (error) {
    console.error("Error al obtener facturas:", error);
    res.status(500).json({ message: "Error al obtener facturas" });
  }
});

// ✅ Detalle completo de una factura (para imprimir PDF)
router.get("/:id", async (req, res) => {
  const facturaId = req.params.id;

  try {
    // 1. Obtener datos de la factura
    const [facturaRows] = await db.query(
      `SELECT 
        f.numero_factura, f.fecha_emision,
        f.cliente_nombre, f.cliente_rtn, f.cliente_direccion,
        v.id AS venta_id, v.metodo_pago, v.efectivo, v.cambio,
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

    if (facturaRows.length === 0) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    const factura = {
      ...facturaRows[0],
      cliente_nombre: facturaRows[0].cliente_nombre ?? "",
      cliente_rtn: facturaRows[0].cliente_rtn ?? "",
      cliente_direccion: facturaRows[0].cliente_direccion ?? "",
      metodo_pago: facturaRows[0].metodo_pago ?? "Efectivo",
      efectivo: parseFloat(facturaRows[0].efectivo ?? 0),
      cambio: parseFloat(facturaRows[0].cambio ?? 0),
    };

    // 2. Obtener productos de la factura
    const [items] = await db.query(
      `SELECT p.codigo, p.nombre, dv.cantidad, dv.precio_unitario AS precio
       FROM detalle_ventas dv
       JOIN productos p ON dv.producto_id = p.id
       WHERE dv.venta_id = ?`,
      [factura.venta_id]
    );

    // 3. Calcular totales (con impuesto incluido en el precio)
    const total = items.reduce(
      (acc, item) => acc + item.cantidad * item.precio,
      0
    );
    const impuesto = +((total / 1.15) * 0.15).toFixed(2);
    const subtotal = +(total - impuesto).toFixed(2);

    // 4. Respuesta completa para generar PDF
    res.json({
      numero_factura: factura.numero_factura,
      fecha_emision: factura.fecha_emision,
      cliente_nombre: factura.cliente_nombre,
      cliente_rtn: factura.cliente_rtn,
      cliente_direccion: factura.cliente_direccion,
      carrito: items,
      subtotal,
      impuesto,
      total,
      metodo_pago: factura.metodo_pago,
      efectivo: factura.efectivo,
      cambio: factura.cambio,
      user: { nombre: factura.cajero },
      cai: {
        cai_codigo: factura.cai_codigo,
        rango_inicio: factura.rango_inicio.toString(),
        rango_fin: factura.rango_fin.toString(),
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
