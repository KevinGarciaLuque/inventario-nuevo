// backend/routes/ventas.js
const express = require("express");
const router = express.Router();
const db = require("../db");

const IVA_FACTOR = 1.15;

/* =====================================================
   Helpers
===================================================== */
const toStr = (v) => String(v ?? "").trim();
const round2 = (n) => Number((Number(n) || 0).toFixed(2));
const clampPct = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

/* =====================================================
   Helpers: Fechas (vigencia promociones)
===================================================== */
const isDateInRange = (hoy, inicio, fin) => {
  // hoy es Date()
  // inicio/fin pueden venir como Date o string 'YYYY-MM-DD'
  const dHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const toDateOnly = (d) => {
    if (!d) return null;
    const x = new Date(d);
    return new Date(x.getFullYear(), x.getMonth(), x.getDate());
  };

  const dIni = toDateOnly(inicio);
  const dFin = toDateOnly(fin);

  if (dIni && dHoy < dIni) return false;
  if (dFin && dHoy > dFin) return false;
  return true;
};

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
   ✅ Cargar promoción combo vigente + activa
===================================================== */
const cargarComboVigente = async (connection, promocion_id) => {
  const [promoRows] = await connection.query(
    `
    SELECT id, nombre, tipo, valor, precio_combo, fecha_inicio, fecha_fin, activo
    FROM promociones
    WHERE id = ?
    LIMIT 1
    `,
    [promocion_id]
  );

  if (!promoRows.length) {
    throw new Error(`Promoción/Combo no encontrada (ID ${promocion_id}).`);
  }

  const promo = promoRows[0];

  if (String(promo.tipo).toUpperCase() !== "COMBO") {
    throw new Error(`La promoción "${promo.nombre}" no es tipo COMBO.`);
  }

  if (Number(promo.activo) !== 1) {
    throw new Error(`El combo "${promo.nombre}" está inactivo.`);
  }

  const hoy = new Date();
  if (!isDateInRange(hoy, promo.fecha_inicio, promo.fecha_fin)) {
    throw new Error(`El combo "${promo.nombre}" no está vigente.`);
  }

  const precioCombo = Number(promo.precio_combo);
  if (!Number.isFinite(precioCombo) || precioCombo <= 0) {
    throw new Error(`Precio inválido en el combo "${promo.nombre}".`);
  }

  // Componentes del combo
  const [compRows] = await connection.query(
    `
    SELECT
      pp.producto_id,
      pp.cantidad,
      pp.es_regalo,
      p.nombre,
      p.stock,
      p.precio
    FROM promocion_productos pp
    JOIN productos p ON p.id = pp.producto_id
    WHERE pp.promocion_id = ?
      AND pp.activo = 1
    `,
    [promocion_id]
  );

  if (!compRows.length) {
    throw new Error(`El combo "${promo.nombre}" no tiene productos asignados.`);
  }

  return { promo, precioCombo: round2(precioCombo), componentes: compRows };
};

/* =====================================================
   Registrar venta + factura
   - Solo admin o cajero
   - usuario_id se toma del token (req.user.id)
   - ✅ Bloquea si no hay caja abierta
   - ✅ Recalcula precios de productos desde BD
   - ✅ SOPORTA COMBOS (promocion_id) que rebajan inventario por componentes
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

  const usuario_id = req.user?.id;
  if (!usuario_id) {
    return res.status(401).json({ message: "No autenticado." });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // ✅ VALIDAR CAJA ABIERTA (NO VENDER SIN APERTURA)
    const cajaEstado = await validarCajaAbierta(connection, req);
    if (!cajaEstado.ok) {
      return res.status(400).json({
        message:
          "No hay caja abierta. Debes realizar la apertura de caja antes de vender.",
      });
    }
    const caja_id = cajaEstado.caja.id;

    // =========================
    // 1) Validar stock y calcular totales
    //    - Productos: precio/descuento desde BD
    //    - Combos: precio_combo desde promociones + stock por componentes
    // =========================
    let total = 0; // total CON impuesto incluido (tu precio ya incluye ISV)
    const detalleVenta = []; // líneas para insertar en detalle_ventas
    const stockOps = new Map(); // producto_id -> cantidadTotalADescontar (incluye combos)

    for (const item of productos) {
      const cantidad = Number(item.cantidad);

      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new Error("Cantidad inválida en el carrito.");
      }

      const producto_id =
        item.producto_id != null ? Number(item.producto_id) : null;
      const promocion_id =
        item.promocion_id != null ? Number(item.promocion_id) : null;

      const esProducto = Number.isInteger(producto_id) && producto_id > 0;
      const esCombo = Number.isInteger(promocion_id) && promocion_id > 0;

      // ✅ Debe venir uno u otro
      if (esProducto && esCombo) {
        throw new Error(
          "Item inválido: no puede traer producto_id y promocion_id a la vez."
        );
      }
      if (!esProducto && !esCombo) {
        throw new Error(
          "Item inválido: debe traer producto_id (producto) o promocion_id (combo)."
        );
      }

      // =========================
      // A) Producto normal
      // =========================
      if (esProducto) {
        const [productoRows] = await connection.query(
          `SELECT id, nombre, precio, descuento, stock
           FROM productos
           WHERE id = ?
           LIMIT 1`,
          [producto_id]
        );

        if (!productoRows.length) {
          throw new Error(`Producto no encontrado (ID ${producto_id}).`);
        }

        const producto = productoRows[0];

        const precioBase = Number(producto.precio);
        const stockActual = Number(producto.stock);
        const descuentoPct = clampPct(producto.descuento);

        if (!Number.isFinite(precioBase)) {
          throw new Error(`Precio inválido para el producto ID ${producto_id}`);
        }
        if (!Number.isFinite(stockActual)) {
          throw new Error(`Stock inválido para el producto ID ${producto_id}`);
        }
        if (stockActual < cantidad) {
          throw new Error(
            `Stock insuficiente para "${producto.nombre}". Stock: ${stockActual}`
          );
        }

        const precioFinal = round2(precioBase * (1 - descuentoPct / 100));
        const subtotalLinea = round2(precioFinal * cantidad);

        total = round2(total + subtotalLinea);

        detalleVenta.push({
          tipo: "producto",
          producto_id,
          promocion_id: null,
          cantidad,
          precio_unitario: round2(precioBase),
          descuento_pct: round2(descuentoPct),
          precio_final: precioFinal,
          subtotal: subtotalLinea,
          label: producto.nombre,
        });

        // acumular stock
        stockOps.set(producto_id, (stockOps.get(producto_id) || 0) + cantidad);
        continue;
      }

      // =========================
      // B) Combo
      // =========================
      if (esCombo) {
        const { promo, precioCombo, componentes } = await cargarComboVigente(
          connection,
          promocion_id
        );

        // 1) Validar stock por componentes (multiplicado por cantidad de combos)
        for (const c of componentes) {
          const pid = Number(c.producto_id);
          const cantPorCombo = Number(c.cantidad) || 0;
          const stockActual = Number(c.stock);

          if (!Number.isInteger(pid) || pid <= 0) {
            throw new Error(`Combo "${promo.nombre}": producto_id inválido.`);
          }
          if (!Number.isFinite(cantPorCombo) || cantPorCombo <= 0) {
            throw new Error(
              `Combo "${promo.nombre}": cantidad inválida en componente.`
            );
          }
          if (!Number.isFinite(stockActual)) {
            throw new Error(
              `Combo "${promo.nombre}": stock inválido en "${c.nombre}".`
            );
          }

          const requerido = cantPorCombo * cantidad;

          // validación usando stock actual (sin considerar otras líneas todavía)
          if (stockActual < requerido) {
            throw new Error(
              `Stock insuficiente para combo "${promo.nombre}". Falta stock de "${c.nombre}". Stock: ${stockActual}`
            );
          }
        }

        // 2) Acumular descuentos de stock por componentes (para validar contra otras líneas y descontar al final)
        for (const c of componentes) {
          const pid = Number(c.producto_id);
          const cantPorCombo = Number(c.cantidad) || 0;
          const requerido = cantPorCombo * cantidad;
          stockOps.set(pid, (stockOps.get(pid) || 0) + requerido);
        }

        // 3) Registrar línea del combo (como un ítem vendido)
        const subtotalLinea = round2(precioCombo * cantidad);
        total = round2(total + subtotalLinea);

        detalleVenta.push({
          tipo: "combo",
          producto_id: null,
          promocion_id,
          cantidad,
          precio_unitario: precioCombo, // precio del combo
          descuento_pct: 0,
          precio_final: precioCombo,
          subtotal: subtotalLinea,
          label: promo.nombre,
        });

        continue;
      }
    }

    // ✅ Validación final de stock cruzada (productos + combos juntos)
    // Esto evita: "producto suelto + combo" que juntos dejan stock negativo.
    if (stockOps.size > 0) {
      const ids = Array.from(stockOps.keys());
      const placeholders = ids.map(() => "?").join(",");

      const [stocksRows] = await connection.query(
        `SELECT id, nombre, stock FROM productos WHERE id IN (${placeholders})`,
        ids
      );

      const stockMap = new Map(
        stocksRows.map((r) => [
          Number(r.id),
          { nombre: r.nombre, stock: Number(r.stock) },
        ])
      );

      for (const [pid, requeridoTotal] of stockOps.entries()) {
        const info = stockMap.get(pid);
        if (!info) {
          throw new Error(
            `Producto no encontrado (ID ${pid}) al validar stock.`
          );
        }
        if (!Number.isFinite(info.stock)) {
          throw new Error(`Stock inválido para "${info.nombre}".`);
        }
        if (info.stock < requeridoTotal) {
          throw new Error(
            `Stock insuficiente para "${info.nombre}". Requerido: ${requeridoTotal}, Stock: ${info.stock}`
          );
        }
      }
    }

    // =========================
    // 2) ISV ya incluido en el precio (desglose)
    // =========================
    const subtotal = round2(total / IVA_FACTOR);
    const impuesto = round2(total - subtotal);
    const total_con_impuesto = round2(total);

    // =========================
    // 3) Insertar venta
    // =========================
    const mp = toStr(metodo_pago).toLowerCase();
    const efectivoNum = round2(efectivo);
    const cambioNum = round2(cambio);

    const [ventaResult] = await connection.query(
      `INSERT INTO ventas (
        total, impuesto, total_con_impuesto,
        usuario_id, caja_id, metodo_pago, efectivo, cambio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subtotal, // "total" = subtotal sin impuesto (según tu diseño actual)
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

    // =========================
    // 4) Insertar detalle
    // =========================
    for (const d of detalleVenta) {
      // Nota: tu tabla ya venía usando estas columnas (precio_unitario, descuento_pct, precio_final, subtotal).
      // Si por alguna razón las ocultas en el DESCRIBE, igual existen; si no existieran, tu sistema anterior ya fallaría.
      await connection.query(
        `INSERT INTO detalle_ventas (
          venta_id, producto_id, promocion_id, cantidad,
          precio_unitario, descuento_pct, precio_final, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          venta_id,
          d.producto_id,
          d.promocion_id,
          d.cantidad,
          d.precio_unitario,
          d.descuento_pct,
          d.precio_final,
          d.subtotal,
        ]
      );
    }

    // =========================
    // 5) Actualizar stock (una sola pasada, con todo acumulado)
    // =========================
    for (const [pid, qty] of stockOps.entries()) {
      await connection.query(
        "UPDATE productos SET stock = stock - ? WHERE id = ?",
        [qty, pid]
      );
    }

    // =========================
    // 6) Registrar/actualizar cliente si aplica (por RTN)
    // =========================
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

    // =========================
    // 7) Obtener CAI activo
    // =========================
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

    // =========================
    // 8) Insertar factura
    // =========================
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

    // =========================
    // 9) Vincular venta con factura + guardar CAI string en ventas (tu columna "cai")
    // =========================
    await connection.query(
      "UPDATE ventas SET factura_id = ?, cai = ? WHERE id = ?",
      [factura_id, numeroFactura, venta_id]
    );

    // =========================
    // 10) Actualizar correlativo CAI
    // =========================
    await connection.query(
      "UPDATE cai SET correlativo_actual = ? WHERE id = ?",
      [siguiente, cai.id]
    );

    await connection.commit();

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
    try {
      await connection.rollback();
    } catch {}

    console.error("❌ Error en registrar venta:", error.message);

    const msg = toStr(error.message);

    if (msg.toLowerCase().includes("no hay caja abierta")) {
      return res.status(400).json({ message: msg });
    }
    if (
      msg.toLowerCase().includes("stock insuficiente") ||
      msg.toLowerCase().includes("producto inválido") ||
      msg.toLowerCase().includes("cantidad inválida") ||
      msg.toLowerCase().includes("no hay cai activo") ||
      msg.toLowerCase().includes("cai agotado") ||
      msg.toLowerCase().includes("combo")
    ) {
      return res.status(400).json({ message: msg });
    }

    return res
      .status(500)
      .json({ message: msg || "Error al registrar venta." });
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
    const rol = req.user?.rol;
    const userId = req.user?.id;

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
