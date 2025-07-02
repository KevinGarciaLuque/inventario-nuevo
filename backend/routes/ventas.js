const express = require("express");
const router = express.Router();
const db = require("../db");

// Registrar venta completa
router.post("/", async (req, res) => {
  const {
    productos,
    usuario_id,
    cliente_nombre,
    cliente_rtn,
    cliente_direccion,
  } = req.body;

  if (!productos || productos.length === 0) {
    return res.status(400).json({ message: "No hay productos en la venta." });
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    let total = 0;
    const detalleVenta = [];

    // Validar stock y calcular totales
    for (const item of productos) {
      const [productoResult] = await connection.query(
        "SELECT precio, stock FROM productos WHERE id = ?",
        [item.producto_id]
      );

      if (productoResult.length === 0) {
        throw new Error(`Producto ID ${item.producto_id} no encontrado.`);
      }

      const producto = productoResult[0];
      if (producto.stock < item.cantidad) {
        throw new Error(
          `Stock insuficiente para el producto ID ${item.producto_id}`
        );
      }

      const precioUnitario = parseFloat(producto.precio);
      const subtotal = precioUnitario * item.cantidad;
      total += subtotal;

      detalleVenta.push({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: precioUnitario,
        subtotal,
      });
    }

    const impuesto = parseFloat((total * 0.15).toFixed(2));
    const total_con_impuesto = parseFloat((total + impuesto).toFixed(2));

    // Insertar venta
    const [ventaResult] = await connection.query(
      "INSERT INTO ventas (total, impuesto, total_con_impuesto, usuario_id) VALUES (?, ?, ?, ?)",
      [total, impuesto, total_con_impuesto, usuario_id]
    );

    const venta_id = ventaResult.insertId;

    // Insertar detalle
    for (const detalle of detalleVenta) {
      await connection.query(
        `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [
          venta_id,
          detalle.producto_id,
          detalle.cantidad,
          detalle.precio_unitario,
          detalle.subtotal,
        ]
      );

      // Actualizar stock
      await connection.query(
        "UPDATE productos SET stock = stock - ? WHERE id = ?",
        [detalle.cantidad, detalle.producto_id]
      );
    }

    // ➕ Registrar cliente si no existe
    if (cliente_rtn) {
      const [clienteExistente] = await connection.query(
        "SELECT id FROM clientes WHERE rtn = ?",
        [cliente_rtn]
      );

      if (clienteExistente.length === 0) {
        await connection.query(
          "INSERT INTO clientes (nombre, rtn, direccion) VALUES (?, ?, ?)",
          [cliente_nombre, cliente_rtn, cliente_direccion]
        );
      }
    }

    // Obtener CAI activo
    const [caiRows] = await connection.query(
      "SELECT * FROM cai WHERE activo = 1 LIMIT 1"
    );
    if (caiRows.length === 0) throw new Error("No hay CAI activo configurado");

    const cai = caiRows[0];
    if (cai.correlativo_actual >= cai.rango_fin) {
      throw new Error(
        "CAI agotado: el correlativo ha llegado al máximo permitido"
      );
    }

    const correlativo = (cai.correlativo_actual + 1)
      .toString()
      .padStart(8, "0");
    const numeroFactura = `${cai.sucursal}-${cai.punto_emision}-${cai.tipo_documento}-${correlativo}`;

    // Insertar factura
    const [facturaResult] = await connection.query(
      `INSERT INTO facturas (
        numero_factura, venta_id, cai_id, total_factura,
        cliente_nombre, cliente_rtn, cliente_direccion
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        numeroFactura,
        venta_id,
        cai.id,
        total_con_impuesto,
        cliente_nombre,
        cliente_rtn,
        cliente_direccion,
      ]
    );

    const factura_id = facturaResult.insertId;

    // Vincular venta con factura
    await connection.query("UPDATE ventas SET factura_id = ? WHERE id = ?", [
      factura_id,
      venta_id,
    ]);

    // Actualizar correlativo CAI
    await connection.query(
      "UPDATE cai SET correlativo_actual = correlativo_actual + 1 WHERE id = ?",
      [cai.id]
    );

    await connection.commit();

    const restantes = cai.rango_fin - (cai.correlativo_actual + 1);
    let alerta = null;
    if (restantes <= 20) {
      alerta = `Atención: Solo quedan ${restantes} facturas disponibles en el CAI.`;
    }

    res.json({
      message: "Venta y factura registrada correctamente",
      venta_id,
      numeroFactura,
      alerta,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
});

// Consultar listado de ventas
router.get("/", async (req, res) => {
  try {
    const [ventas] = await db.query(
      `SELECT v.*, f.numero_factura FROM ventas v 
       LEFT JOIN facturas f ON v.factura_id = f.id 
       ORDER BY v.fecha DESC`
    );
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las ventas" });
  }
});

module.exports = router;
