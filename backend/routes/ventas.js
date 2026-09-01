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
    if (!rol || (!roles.includes(rol) && rol !== "superadmin")) {
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
    [usuario_id],
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
    [promocion_id],
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
    [promocion_id],
  );

  if (!compRows.length) {
    throw new Error(`El combo "${promo.nombre}" no tiene productos asignados.`);
  }

  return { promo, precioCombo: round2(precioCombo), componentes: compRows };
};

/* =====================================================
   Helpers: Descuentos (nuevo)
===================================================== */
const normalizeEnum = (v) =>
  String(v ?? "")
    .trim()
    .toUpperCase();
const money = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

const calcMontoDescuento = ({ tipo, valor, base }) => {
  const t = normalizeEnum(tipo);
  const v = money(valor);
  const b = money(base);

  if (b <= 0) return 0;

  if (t === "PORCENTAJE") {
    const pct = clampPct(v);
    return round2(b * (pct / 100));
  }

  // MONTO_FIJO
  return round2(Math.min(v, b));
};

const cargarDescuentosAplicables = async (
  connection,
  { edad, productoIds, categoriaIds },
) => {
  const edadNum = Number.isFinite(Number(edad)) ? Number(edad) : null;
  const prod = Array.isArray(productoIds)
    ? productoIds.map(Number).filter((x) => Number.isFinite(x) && x > 0)
    : [];
  const cat = Array.isArray(categoriaIds)
    ? categoriaIds.map(Number).filter((x) => Number.isFinite(x) && x > 0)
    : [];

  let sql = `
    SELECT d.*
    FROM descuentos d
    WHERE d.activo = 1
      AND (d.fecha_inicio IS NULL OR d.fecha_inicio <= CURDATE())
      AND (d.fecha_fin IS NULL OR d.fecha_fin >= CURDATE())
  `;
  const params = [];

  if (edadNum !== null) {
    sql += `
      AND (
        (d.edad_min IS NULL AND d.edad_max IS NULL)
        OR ((d.edad_min IS NULL OR d.edad_min <= ?) AND (d.edad_max IS NULL OR d.edad_max >= ?))
      )
    `;
    params.push(edadNum, edadNum);
  }

  sql += ` ORDER BY d.prioridad ASC, d.id ASC`;

  const [rows] = await connection.query(sql, params);
  if (!rows.length) return [];

  const aplicables = [];

  for (const d of rows) {
    const alcance = normalizeEnum(d.alcance);

    if (alcance === "VENTA") {
      aplicables.push(d);
      continue;
    }

    if (alcance === "PRODUCTO") {
      if (!prod.length) continue;
      const [rel] = await connection.query(
        `SELECT 1
         FROM descuento_productos
         WHERE id_descuento = ?
           AND id_producto IN (${prod.map(() => "?").join(",")})
         LIMIT 1`,
        [d.id, ...prod],
      );
      if (rel.length) aplicables.push(d);
      continue;
    }

    if (alcance === "CATEGORIA") {
      if (!cat.length) continue;
      const [rel] = await connection.query(
        `SELECT 1
         FROM descuento_categorias
         WHERE id_descuento = ?
           AND id_categoria IN (${cat.map(() => "?").join(",")})
         LIMIT 1`,
        [d.id, ...cat],
      );
      if (rel.length) aplicables.push(d);
      continue;
    }
  }

  return aplicables;
};

const aplicarDescuentos = ({ totalConImpuestoBruto, descuentos }) => {
  let totalCI = round2(totalConImpuestoBruto); // total con impuesto (bruto)
  const applied = [];

  for (const d of descuentos) {
    const aplicaSobre = normalizeEnum(d.aplica_sobre || "SUBTOTAL");
    const tipo = normalizeEnum(d.tipo || "PORCENTAJE");
    const valor = money(d.valor);
    const acumulable = Number(d.acumulable) === 1;

    const base =
      aplicaSobre === "TOTAL" ? totalCI : round2(totalCI / IVA_FACTOR);

    const monto = calcMontoDescuento({ tipo, valor, base });
    if (monto <= 0) continue;

    if (aplicaSobre === "TOTAL") {
      totalCI = round2(Math.max(0, totalCI - monto));
    } else {
      const sub = round2(totalCI / IVA_FACTOR);
      const sub2 = round2(Math.max(0, sub - monto));
      totalCI = round2(sub2 * IVA_FACTOR);
    }

    applied.push({
      id_descuento: d.id,
      nombre_descuento: d.nombre,
      tipo,
      valor,
      aplica_sobre: aplicaSobre,
      monto_descontado: round2(monto),
      acumulable,
      prioridad: Number(d.prioridad) || 100,
    });

    if (!acumulable) break;
  }

  const subtotal = round2(totalCI / IVA_FACTOR);
  const impuesto = round2(totalCI - subtotal);

  return {
    subtotal,
    impuesto,
    total_con_impuesto: totalCI,
    descuentos_aplicados: applied,
    total_descuento: round2(
      applied.reduce((a, x) => a + x.monto_descontado, 0),
    ),
  };
};

/* =====================================================
   Registrar venta + factura
   - Solo admin o cajero
   - usuario_id se toma del token (req.user.id)
   - ✅ Bloquea si no hay caja abierta
   - ✅ Recalcula precios de productos desde BD
   - ✅ SOPORTA COMBOS (promocion_id) que rebajan inventario por componentes
   - ✅ DESCUENTOS (módulo nuevo) por prioridad / acumulable
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
    monto_tarjeta = 0,
    edad_cliente = null, // ✅ NUEVO (opcional)
    descuento_id = null, // ✅ Descuento elegido por el cajero (alcance VENTA)
    pedido_id = null, // ✅ NUEVO: si la venta nace de un pedido web
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

    // ✅ Si la venta viene de un pedido web, validar que exista y esté "listo"
    const pedidoWebId = pedido_id != null ? Number(pedido_id) : null;

    // =========================
    // Multi-tienda: a qué tienda pertenece esta venta
    //  - venta normal  -> tienda del usuario
    //  - pedido web     -> tienda marcada como "atiende_web" (fallback: la del usuario)
    //  Degrada a null si la migración multi-tienda aún no se aplicó.
    // =========================
    let tiendaId = null;
    try {
      const [uRows] = await connection.query(
        "SELECT tienda_id FROM usuarios WHERE id = ?",
        [usuario_id],
      );
      tiendaId = uRows[0]?.tienda_id ?? null;

      if (pedidoWebId) {
        const [wRows] = await connection.query(
          "SELECT id FROM tiendas WHERE atiende_web = 1 AND activo = 1 LIMIT 1",
        );
        if (wRows.length) tiendaId = wRows[0].id;
      }
    } catch (e) {
      if (e.code !== "ER_BAD_FIELD_ERROR" && e.code !== "ER_NO_SUCH_TABLE") throw e;
      tiendaId = null;
    }
    if (pedidoWebId) {
      const [pedRows] = await connection.query(
        "SELECT id, estado FROM pedidos_web WHERE id = ? LIMIT 1",
        [pedidoWebId],
      );
      if (!pedRows.length) {
        throw new Error(`Pedido web no encontrado (ID ${pedidoWebId}).`);
      }
      if (pedRows[0].estado !== "listo") {
        throw new Error(
          `El pedido #${pedidoWebId} no está "listo para cobrar" (estado actual: ${pedRows[0].estado}).`,
        );
      }
    }

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
          "Item inválido: no puede traer producto_id y promocion_id a la vez.",
        );
      }
      if (!esProducto && !esCombo) {
        throw new Error(
          "Item inválido: debe traer producto_id (producto) o promocion_id (combo).",
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
          [producto_id],
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
            `Stock insuficiente para "${producto.nombre}". Stock: ${stockActual}`,
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
          promocion_id,
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
              `Combo "${promo.nombre}": cantidad inválida en componente.`,
            );
          }
          if (!Number.isFinite(stockActual)) {
            throw new Error(
              `Combo "${promo.nombre}": stock inválido en "${c.nombre}".`,
            );
          }

          const requerido = cantPorCombo * cantidad;

          if (stockActual < requerido) {
            throw new Error(
              `Stock insuficiente para combo "${promo.nombre}". Falta stock de "${c.nombre}". Stock: ${stockActual}`,
            );
          }
        }

        // 2) Acumular descuento de stock por componentes
        for (const c of componentes) {
          const pid = Number(c.producto_id);
          const cantPorCombo = Number(c.cantidad) || 0;
          const requerido = cantPorCombo * cantidad;
          stockOps.set(pid, (stockOps.get(pid) || 0) + requerido);
        }

        // 3) Registrar línea del combo
        const subtotalLinea = round2(precioCombo * cantidad);
        total = round2(total + subtotalLinea);

        detalleVenta.push({
          tipo: "combo",
          producto_id: null,
          promocion_id,
          cantidad,
          precio_unitario: precioCombo,
          descuento_pct: 0,
          precio_final: precioCombo,
          subtotal: subtotalLinea,
          label: promo.nombre,
        });

        continue;
      }
    }

    // ✅ Validación final de stock cruzada
    if (stockOps.size > 0) {
      const ids = Array.from(stockOps.keys());
      const placeholders = ids.map(() => "?").join(",");

      // FOR UPDATE: bloquea estas filas hasta el commit para que dos ventas
      // simultáneas (p. ej. dos tiendas / dos pestañas) no puedan pasar ambas
      // la validación y dejar el stock en negativo.
      const [stocksRows] = await connection.query(
        `SELECT id, nombre, stock FROM productos WHERE id IN (${placeholders}) FOR UPDATE`,
        ids,
      );

      const stockMap = new Map(
        stocksRows.map((r) => [
          Number(r.id),
          { nombre: r.nombre, stock: Number(r.stock) },
        ]),
      );

      for (const [pid, requeridoTotal] of stockOps.entries()) {
        const info = stockMap.get(pid);
        if (!info)
          throw new Error(
            `Producto no encontrado (ID ${pid}) al validar stock.`,
          );
        if (!Number.isFinite(info.stock))
          throw new Error(`Stock inválido para "${info.nombre}".`);
        if (info.stock < requeridoTotal) {
          throw new Error(
            `Stock insuficiente para "${info.nombre}". Requerido: ${requeridoTotal}, Stock: ${info.stock}`,
          );
        }
      }
    }

    // =========================
    // 2) DESCUENTOS (nuevo)
    // =========================
    const productoIdsCarrito = Array.from(stockOps.keys());

    // categorias de los productos del carrito
    let categoriaIdsCarrito = [];
    if (productoIdsCarrito.length) {
      const placeholders = productoIdsCarrito.map(() => "?").join(",");
      const [catRows] = await connection.query(
        `SELECT DISTINCT categoria_id
         FROM productos
         WHERE id IN (${placeholders}) AND categoria_id IS NOT NULL`,
        productoIdsCarrito,
      );
      categoriaIdsCarrito = catRows
        .map((r) => Number(r.categoria_id))
        .filter(Boolean);
    }

    const autoAplicables = await cargarDescuentosAplicables(connection, {
      edad: edad_cliente,
      productoIds: productoIdsCarrito,
      categoriaIds: categoriaIdsCarrito,
    });

    // ✅ Descuento elegido manualmente por el cajero (debe estar activo y vigente)
    let manualAplicable = [];
    if (descuento_id != null && String(descuento_id).trim() !== "") {
      const [dRows] = await connection.query(
        `SELECT * FROM descuentos
         WHERE id = ?
           AND activo = 1
           AND (fecha_inicio IS NULL OR fecha_inicio <= CURDATE())
           AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())
         LIMIT 1`,
        [Number(descuento_id)],
      );
      if (!dRows.length) {
        throw new Error(
          "El descuento seleccionado no está disponible o ya no está vigente.",
        );
      }
      manualAplicable = dRows;
    }

    // El manual va primero (mayor prioridad); evitamos duplicarlo si también
    // apareció en los automáticos.
    const idsManual = new Set(manualAplicable.map((d) => d.id));
    const descuentosAplicables = [
      ...manualAplicable,
      ...autoAplicables.filter((d) => !idsManual.has(d.id)),
    ];

    const totalesConDescuento = aplicarDescuentos({
      totalConImpuestoBruto: total, // total con ISV incluido
      descuentos: descuentosAplicables,
    });

    const subtotal = totalesConDescuento.subtotal;
    const impuesto = totalesConDescuento.impuesto;
    const total_con_impuesto = totalesConDescuento.total_con_impuesto;

    const descuentos_aplicados = totalesConDescuento.descuentos_aplicados || [];
    const total_descuento = totalesConDescuento.total_descuento || 0;

    // =========================
    // 3) Insertar venta
    // =========================
    const mp = toStr(metodo_pago).toLowerCase();
    const efectivoNum = round2(efectivo);
    const cambioNum = round2(cambio);
    const montoTarjetaNum = round2(monto_tarjeta);

    if (mp === "mixto" && round2(efectivoNum + montoTarjetaNum) < total_con_impuesto) {
      throw new Error(
        "El total pagado (efectivo + tarjeta) no puede ser menor al total de la venta.",
      );
    }

    const ventaEfectivo = mp === "efectivo" ? efectivoNum : mp === "mixto" ? efectivoNum : 0;
    const ventaCambio = mp === "efectivo" || mp === "mixto" ? cambioNum : 0;
    const ventaMontoTarjeta =
      mp === "tarjeta" ? total_con_impuesto : mp === "mixto" ? montoTarjetaNum : 0;

    const [ventaResult] = await connection.query(
      `INSERT INTO ventas (
        total, impuesto, total_con_impuesto,
        usuario_id, caja_id, tienda_id, metodo_pago, efectivo, cambio, monto_tarjeta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subtotal, // "total" = subtotal sin impuesto (según tu diseño actual)
        impuesto,
        total_con_impuesto,
        usuario_id,
        caja_id,
        tiendaId,
        mp,
        ventaEfectivo,
        ventaCambio,
        ventaMontoTarjeta,
      ],
    );

    const venta_id = ventaResult.insertId;

    // =========================
    // 3.1) Guardar auditoría de descuentos aplicados (nuevo)
    // =========================
    if (descuentos_aplicados.length) {
      for (const d of descuentos_aplicados) {
        await connection.query(
          `INSERT INTO venta_descuentos
            (id_venta, id_descuento, nombre_descuento, tipo, valor, monto_descontado, creado_por)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            venta_id,
            d.id_descuento,
            d.nombre_descuento,
            d.tipo,
            d.valor,
            d.monto_descontado,
            usuario_id,
          ],
        );
      }
    }

    // =========================
    // 4) Insertar detalle
    // =========================
    for (const d of detalleVenta) {
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
        ],
      );
    }

    // =========================
    // 5) Actualizar stock
    // =========================
    for (const [pid, qty] of stockOps.entries()) {
      const [upd] = await connection.query(
        "UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?",
        [qty, pid, qty],
      );
      // Si no actualizó ninguna fila, el stock cambió entre la validación y
      // ahora (otra venta en paralelo). Se aborta toda la venta.
      if (!upd || upd.affectedRows === 0) {
        throw new Error(
          "Stock insuficiente: otro usuario acaba de vender este producto. Vuelve a intentar la venta.",
        );
      }
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
        [rtn],
      );

      if (!clienteExistente.length) {
        await connection.query(
          "INSERT INTO clientes (nombre, rtn, direccion) VALUES (?, ?, ?)",
          [nombreCliente, rtn, dirCliente],
        );
      } else {
        await connection.query(
          "UPDATE clientes SET nombre = ?, direccion = ? WHERE rtn = ?",
          [nombreCliente, dirCliente, rtn],
        );
      }
    }

    // =========================
    // 7) Determinar tipo de documento: Factura (con CAI) o Recibo (sin CAI)
    // =========================
    let emitirConCai = true;
    try {
      const [cfgRows] = await connection.query(
        "SELECT valor FROM configuracion WHERE clave = 'emitir_con_cai' LIMIT 1",
      );
      emitirConCai = !cfgRows.length || cfgRows[0].valor === "1";
    } catch (e) {
      // Si la tabla configuracion aún no existe, se mantiene el modo factura
      console.warn("configuracion no disponible, se asume modo Factura:", e.code);
      emitirConCai = true;
    }

    let numeroFactura;
    let tipoDocumento = "factura";
    let caiIdFk = null;
    let cai = null; // solo se llena en modo factura
    let siguienteCai = null;

    if (emitirConCai) {
      // Prefiere el CAI de la tienda; si no tiene, cae al CAI sin tienda asignada.
      const [caiRows] = await connection.query(
        `SELECT * FROM cai
          WHERE activo = 1 AND (tienda_id <=> ? OR tienda_id IS NULL)
          ORDER BY (tienda_id IS NULL) ASC
          LIMIT 1 FOR UPDATE`,
        [tiendaId],
      );
      if (!caiRows.length) throw new Error("No hay CAI activo configurado");

      cai = caiRows[0];

      if (Number(cai.correlativo_actual) >= Number(cai.rango_fin)) {
        throw new Error("CAI agotado: el correlativo llegó al máximo permitido");
      }

      siguienteCai = Number(cai.correlativo_actual) + 1;
      const correlativo = String(siguienteCai).padStart(8, "0");
      numeroFactura = `${cai.sucursal}-${cai.punto_emision}-${cai.tipo_documento}-${correlativo}`;
      caiIdFk = cai.id;
    } else {
      tipoDocumento = "recibo";

      if (tiendaId) {
        // Correlativo propio de la tienda (una serie por local)
        let [tcRows] = await connection.query(
          "SELECT prefijo, actual FROM tienda_correlativo WHERE tienda_id = ? FOR UPDATE",
          [tiendaId],
        );
        if (!tcRows.length) {
          const [[base]] = await connection.query(
            "SELECT prefijo FROM recibo_correlativo WHERE id = 1 LIMIT 1",
          );
          const prefijo = base?.prefijo || "REC";
          await connection.query(
            "INSERT INTO tienda_correlativo (tienda_id, prefijo, actual) VALUES (?, ?, 0)",
            [tiendaId, prefijo],
          );
          tcRows = [{ prefijo, actual: 0 }];
        }
        const siguienteRec = Number(tcRows[0].actual) + 1;
        // El nº lleva el id de tienda para ser único entre locales (índice único global)
        numeroFactura = `${tcRows[0].prefijo || "REC"}${tiendaId}-${String(siguienteRec).padStart(8, "0")}`;
        await connection.query(
          "UPDATE tienda_correlativo SET actual = ? WHERE tienda_id = ?",
          [siguienteRec, tiendaId],
        );
      } else {
        // Sin tienda: serie global (comportamiento anterior)
        const [recRows] = await connection.query(
          "SELECT * FROM recibo_correlativo WHERE id = 1 FOR UPDATE",
        );
        const rec = recRows[0] || { prefijo: "REC", actual: 0 };
        const siguienteRec = Number(rec.actual) + 1;
        numeroFactura = `${rec.prefijo || "REC"}-${String(siguienteRec).padStart(8, "0")}`;
        await connection.query(
          "UPDATE recibo_correlativo SET actual = ? WHERE id = 1",
          [siguienteRec],
        );
      }
    }

    // =========================
    // 8) Insertar documento (factura o recibo)
    // =========================
    const [facturaResult] = await connection.query(
      `INSERT INTO facturas (
        numero_factura, venta_id, cai_id, tienda_id, tipo, total_factura,
        cliente_nombre, cliente_rtn, cliente_direccion,
        metodo_pago, efectivo, cambio, monto_tarjeta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        numeroFactura,
        venta_id,
        caiIdFk,
        tiendaId,
        tipoDocumento,
        total_con_impuesto,
        toStr(cliente_nombre),
        toStr(cliente_rtn),
        toStr(cliente_direccion),
        mp,
        ventaEfectivo,
        ventaCambio,
        ventaMontoTarjeta,
      ],
    );

    const factura_id = facturaResult.insertId;

    // =========================
    // 9) Vincular venta con documento + guardar número en ventas (columna "cai")
    // =========================
    await connection.query(
      "UPDATE ventas SET factura_id = ?, cai = ? WHERE id = ?",
      [factura_id, numeroFactura, venta_id],
    );

    // =========================
    // 10) Actualizar correlativo CAI (solo en modo factura)
    // =========================
    if (emitirConCai) {
      await connection.query(
        "UPDATE cai SET correlativo_actual = ? WHERE id = ?",
        [siguienteCai, cai.id],
      );
    }

    // =========================
    // 10.1) Cerrar pedido web (si aplica)
    // =========================
    if (pedidoWebId) {
      await connection.query(
        "UPDATE pedidos_web SET estado = 'cobrado', venta_id = ?, procesado_por = ? WHERE id = ?",
        [venta_id, usuario_id, pedidoWebId],
      );
    }

    await connection.commit();

    // Datos de la tienda para el encabezado del recibo/factura
    let tiendaData = null;
    if (tiendaId) {
      try {
        const [tRows] = await db.query(
          "SELECT nombre, direccion, rtn, telefono FROM tiendas WHERE id = ? LIMIT 1",
          [tiendaId],
        );
        if (tRows.length) tiendaData = tRows[0];
      } catch {
        tiendaData = null;
      }
    }

    let alerta = null;
    if (emitirConCai) {
      const restantes = Number(cai.rango_fin) - siguienteCai;
      if (restantes <= 20) {
        alerta = `Atención: Solo quedan ${restantes} facturas disponibles en el CAI.`;
      }
    }

    return res.json({
      message:
        tipoDocumento === "recibo"
          ? "Venta y recibo registrados correctamente"
          : "Venta y factura registrada correctamente",
      venta_id,
      factura_id,
      numeroFactura,
      tipo: tipoDocumento,
      alerta,
      descuentos_aplicados,
      total_descuento,
      tienda: tiendaData,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}

    console.error("❌ Error en registrar venta:", error.message);

    const msg = toStr(error.message);

    // Colisión de número de documento (índice único). Con el bloqueo del CAI
    // no debería ocurrir; si ocurre, es seguro reintentar la venta.
    if (error.code === "ER_DUP_ENTRY" && msg.includes("numero_factura")) {
      return res.status(409).json({
        message:
          "Otro cobro tomó ese número de documento en el mismo instante. Vuelve a intentar la venta.",
      });
    }

    if (msg.toLowerCase().includes("no hay caja abierta")) {
      return res.status(400).json({ message: msg });
    }
    if (
      msg.toLowerCase().includes("stock insuficiente") ||
      msg.toLowerCase().includes("producto inválido") ||
      msg.toLowerCase().includes("cantidad inválida") ||
      msg.toLowerCase().includes("no hay cai activo") ||
      msg.toLowerCase().includes("cai agotado") ||
      msg.toLowerCase().includes("combo") ||
      msg.toLowerCase().includes("descuento") ||
      msg.toLowerCase().includes("pedido")
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
/* =====================================================
   ✅ Resumen de ventas por tienda (Dashboard) — solo admin
   Filtros: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&tienda_id=xx
===================================================== */
router.get("/resumen", requireRoles("admin"), async (req, res) => {
  try {
    const desde = toStr(req.query.desde);
    const hasta = toStr(req.query.hasta);
    const tid = Number(req.query.tienda_id);

    let where = "WHERE 1=1";
    const params = [];
    if (desde) {
      where += " AND DATE(v.fecha) >= ?";
      params.push(desde);
    }
    if (hasta) {
      where += " AND DATE(v.fecha) <= ?";
      params.push(hasta);
    }
    if (Number.isInteger(tid) && tid > 0) {
      where += " AND v.tienda_id = ?";
      params.push(tid);
    }

    const [porTienda] = await db.query(
      `SELECT
         COALESCE(t.id, 0) AS tienda_id,
         COALESCE(t.nombre, 'Sin tienda') AS tienda_nombre,
         COUNT(*) AS num_ventas,
         COALESCE(SUM(v.total_con_impuesto), 0) AS total
       FROM ventas v
       LEFT JOIN tiendas t ON t.id = v.tienda_id
       ${where}
       GROUP BY COALESCE(t.id, 0), COALESCE(t.nombre, 'Sin tienda')
       ORDER BY total DESC`,
      params,
    );

    const [[tot]] = await db.query(
      `SELECT COUNT(*) AS num_ventas, COALESCE(SUM(v.total_con_impuesto), 0) AS total
       FROM ventas v ${where}`,
      params,
    );

    res.json({
      porTienda: porTienda.map((r) => ({
        ...r,
        num_ventas: Number(r.num_ventas),
        total: Number(r.total),
      })),
      total: { num_ventas: Number(tot.num_ventas), total: Number(tot.total) },
    });
  } catch (error) {
    console.error("❌ Error en /ventas/resumen:", error.message);
    res.status(500).json({ message: "Error al obtener el resumen de ventas" });
  }
});

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
