// backend/routes/ventas.js
const express = require("express");
const router = express.Router();
const db = require("../db");

const IVA_FACTOR = 1.15;

/* =====================================================
   Helpers
===================================================== */
const toStr = (v) => String(v ?? "").trim();

/* =====================================================
   Middleware de rol (req.user viene del auth global)
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
   ✅ Validar caja abierta (basado en cierres_caja)
   - Estándar POS: NO vender si no hay caja abierta.
   - Admin: también debe tener caja abierta (recomendado por control/auditoría).
   - Cajero: debe existir caja abierta del mismo usuario.
===================================================== */
const validarCajaAbierta = async (connection, req) => {
  const usuario_id = req.user?.id;

  const [rows] = await connection.query(
    `
    SELECT id, usuario_id, fecha_apertura, estado
    FROM cierres_caja
    WHERE estado = 'abierta'
      AND usuario_id = ?
    ORDER BY fecha_apertura DESC
    LIMIT 1
    `,
    [usuario_id]
  );

  if (!rows.length) return { ok: false, caja: null };
  return { ok: true, caja: rows[0] };
};

/* =====================================================
   Registrar venta + factura
   - Solo admin o cajero
   - usuario_id se toma del token (req.user.id)
   - ✅ Bloquea si no hay caja abierta
===================================================== */
router.post("/", requireRoles("admin", "cajero"), async (req, res) => {
  const {
    productos,
    cliente_nombre = "",
    cliente_rtn = "",
    cliente_direccion = "",
    metodo_pago = "efectivo",
    efectivo = 0,
    cambio = 0,
  } = req.body || {};

  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ message: "No hay productos en la venta." });
  }

  const usuario_id = req.user.id;

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // ✅ VALIDAR CAJA ABIERTA (NO VENDER SIN APERTURA)
    const cajaEstado = await validarCajaAbierta(connection, req);
    if (!cajaEstado.ok) {
      throw new Error(
        "No hay caja abierta. Debes realizar la apertura de caja antes de vender."
      );
    }
    const caja_id = cajaEstado.caja.id;

    let total = 0;
    const detalleVenta = [];

    // 1) Validar stock y calcular totales
    for (const item of productos) {
      const producto_id = Number(item.producto_id);
      const cantidad = Number(item.cantidad);

      if (!Number.isInteger(producto_id) || producto_id <= 0) {
        throw new Error("Producto inválido en el carrito.");
      }
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new Error("Cantidad inválida en el carrito.");
      }

      const [productoResult] = await connection.query(
        "SELECT precio, stock FROM productos WHERE id = ? LIMIT 1",
        [producto_id]
      );

      if (!productoResult.length) {
        throw new Error(`Producto ID ${producto_id} no encontrado.`);
      }

      const producto = productoResult[0];

      const precioUnitario = Number(producto.precio);
      const stockActual = Number(producto.stock);

      if (!Number.isFinite(precioUnitario)) {
        throw new Error(`Precio inválido para el producto ID ${producto_id}`);
      }

      if (stockActual < cantidad) {
        throw new Error(
          `Stock insuficiente para el producto ID ${producto_id}`
        );
      }

      const subtotalLinea = Number((precioUnitario * cantidad).toFixed(2));
      total = Number((total + subtotalLinea).toFixed(2));

      detalleVenta.push({
        producto_id,
        cantidad,
        precio_unitario: precioUnitario,
        subtotal: subtotalLinea,
      });
    }

    // 2) ISV ya incluido en el precio
    const subtotal = Number((total / IVA_FACTOR).toFixed(2));
    const impuesto = Number((total - subtotal).toFixed(2));
    const total_con_impuesto = Number(total.toFixed(2));

    // 3) Insertar venta
    const mp = toStr(metodo_pago).toLowerCase();
    const efectivoNum = Number(efectivo) || 0;
    const cambioNum = Number(cambio) || 0;

    const [ventaResult] = await connection.query(
      `INSERT INTO ventas (
        total, impuesto, total_con_impuesto,
        usuario_id, caja_id, metodo_pago, efectivo, cambio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subtotal,
        impuesto,
        total_con_impuesto,
        usuario_id,
        caja_id,
        mp,
        mp === "efectivo" ? efectivoNum : 0,
        mp === "efectivo" ? cambioNum : 0,
      ]
    );

    const venta_id = ventaResult.insertId;

    // 4) Insertar detalle + actualizar stock
    for (const d of detalleVenta) {
      await connection.query(
        `INSERT INTO detalle_ventas (
          venta_id, producto_id, cantidad, precio_unitario, subtotal
        ) VALUES (?, ?, ?, ?, ?)`,
        [venta_id, d.producto_id, d.cantidad, d.precio_unitario, d.subtotal]
      );

      await connection.query(
        "UPDATE productos SET stock = stock - ? WHERE id = ?",
        [d.cantidad, d.producto_id]
      );
    }

    // 5) Registrar cliente si aplica (por RTN)
    const rtn = toStr(cliente_rtn);
    if (rtn) {
      const nombreCliente = toStr(cliente_nombre);
      const dirCliente = toStr(cliente_direccion);

      const [clienteExistente] = await connection.query(
        "SELECT id FROM clientes WHERE rtn = ? LIMIT 1",
        [rtn]
      );

      if (!clienteExistente.length) {
        await connection.query(
          "INSERT INTO clientes (nombre, rtn, direccion) VALUES (?, ?, ?)",
          [nombreCliente, rtn, dirCliente]
        );
      } else {
        await connection.query(
          "UPDATE clientes SET nombre = ?, direccion = ? WHERE rtn = ?",
          [nombreCliente, dirCliente, rtn]
        );
      }
    }

    // 6) Obtener CAI activo
    const [caiRows] = await connection.query(
      "SELECT * FROM cai WHERE activo = 1 LIMIT 1"
    );
    if (!caiRows.length) throw new Error("No hay CAI activo configurado");

    const cai = caiRows[0];

    if (Number(cai.correlativo_actual) >= Number(cai.rango_fin)) {
      throw new Error("CAI agotado: el correlativo llegó al máximo permitido");
    }

    const siguiente = Number(cai.correlativo_actual) + 1;
    const correlativo = String(siguiente).padStart(8, "0");

    const numeroFactura = `${cai.sucursal}-${cai.punto_emision}-${cai.tipo_documento}-${correlativo}`;

    // 7) Insertar factura
    const [facturaResult] = await connection.query(
      `INSERT INTO facturas (
        numero_factura, venta_id, cai_id, total_factura,
        cliente_nombre, cliente_rtn, cliente_direccion,
        metodo_pago, efectivo, cambio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        numeroFactura,
        venta_id,
        cai.id,
        total_con_impuesto,
        toStr(cliente_nombre),
        toStr(cliente_rtn),
        toStr(cliente_direccion),
        mp,
        mp === "efectivo" ? efectivoNum : 0,
        mp === "efectivo" ? cambioNum : 0,
      ]
    );

    const factura_id = facturaResult.insertId;

    // 8) Vincular venta con factura
    await connection.query("UPDATE ventas SET factura_id = ? WHERE id = ?", [
      factura_id,
      venta_id,
    ]);

    // 9) Actualizar correlativo CAI
    await connection.query(
      "UPDATE cai SET correlativo_actual = ? WHERE id = ?",
      [siguiente, cai.id]
    );

    await connection.commit();

    // restantes calculado con el nuevo correlativo ya guardado
    const restantes = Number(cai.rango_fin) - siguiente;

    let alerta = null;
    if (restantes <= 20) {
      alerta = `Atención: Solo quedan ${restantes} facturas disponibles en el CAI.`;
    }

    return res.json({
      message: "Venta y factura registrada correctamente",
      venta_id,
      factura_id,
      numeroFactura,
      alerta,
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error en registrar venta:", error.message);
    // ✅ si el error es de caja, que sea 400 para UX y control
    if (
      String(error.message || "")
        .toLowerCase()
        .includes("no hay caja abierta")
    ) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
});

/* =====================================================
   Listar ventas
   - admin: todas
   - cajero: solo las suyas
===================================================== */
router.get("/", requireRoles("admin", "cajero"), async (req, res) => {
  try {
    const rol = req.user.rol;
    const userId = req.user.id;

    let sql = `
      SELECT v.*, f.numero_factura
      FROM ventas v
      LEFT JOIN facturas f ON v.factura_id = f.id
    `;
    const params = [];

    if (rol === "cajero") {
      sql += " WHERE v.usuario_id = ? ";
      params.push(userId);
    }

    sql += " ORDER BY v.fecha DESC";

    const [ventas] = await db.query(sql, params);
    return res.json(ventas);
  } catch (error) {
    console.error("❌ Error al obtener ventas:", error.message);
    return res.status(500).json({ message: "Error al obtener las ventas" });
  }
});

module.exports = router;
