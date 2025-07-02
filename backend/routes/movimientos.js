// routes/movimientos.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// Registrar un movimiento (entrada o salida de stock)
router.post("/", async (req, res) => {
  try {
    const { producto_id, tipo, cantidad, descripcion, usuario_id } = req.body;

    // Validaciones básicas
    if (!producto_id || !tipo || !cantidad || !usuario_id) {
      return res.status(400).json({
        message: "producto_id, tipo, cantidad y usuario_id son requeridos",
      });
    }
    if (!["entrada", "salida"].includes(tipo)) {
      return res.status(400).json({ message: "Tipo debe ser 'entrada' o 'salida'" });
    }
    if (cantidad <= 0) {
      return res.status(400).json({ message: "La cantidad debe ser mayor a 0" });
    }

    // Verifica que el producto exista y obtiene su nombre y stock
    const [productos] = await db.query(
      "SELECT stock, nombre FROM productos WHERE id=?",
      [producto_id]
    );
    if (productos.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const stockActual = productos[0].stock;
    const productoNombre = productos[0].nombre;

    // Si es salida, verifica stock suficiente
    if (tipo === "salida" && cantidad > stockActual) {
      return res.status(400).json({
        message: `Stock insuficiente. Stock actual: ${stockActual}`,
      });
    }

    // 1. Registrar el movimiento
    await db.query(
      `INSERT INTO movimientos (producto_id, tipo, cantidad, descripcion, usuario_id)
       VALUES (?, ?, ?, ?, ?)`,
      [producto_id, tipo, cantidad, descripcion || "", usuario_id]
    );

    // 2. Actualizar el stock del producto
    if (tipo === "entrada") {
      await db.query(
        `UPDATE productos SET stock = stock + ? WHERE id = ?`,
        [cantidad, producto_id]
      );
    } else if (tipo === "salida") {
      await db.query(
        `UPDATE productos SET stock = stock - ? WHERE id = ?`,
        [cantidad, producto_id]
      );
    }

    // 3. Registrar acción en la bitácora
    await db.query(
      `INSERT INTO bitacora (usuario_id, accion, descripcion)
       VALUES (?, ?, ?)`,
      [
        usuario_id,
        tipo === "entrada" ? "Entrada de stock" : "Salida de stock",
        `${tipo === "entrada" ? "Entrada" : "Salida"} de ${cantidad} unidades para producto "${productoNombre}" (ID: ${producto_id}). Detalle: ${descripcion || ""}`
      ]
    );

    res.json({ message: "Movimiento registrado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al registrar movimiento", error });
  }
});


// Obtener el historial de movimientos (con nombres de producto y usuario)
// routes/movimientos.js
router.get("/", async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, usuario_id, tipo, producto_id, limit = 100 } = req.query;
    let sql = `
      SELECT m.*, p.nombre AS producto_nombre, u.nombre AS usuario_nombre
      FROM movimientos m
      LEFT JOIN productos p ON m.producto_id = p.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE 1
    `;
    const params = [];

    if (fecha_inicio) {
      sql += " AND m.fecha >= ?";
      params.push(fecha_inicio + " 00:00:00");
    }
    if (fecha_fin) {
      sql += " AND m.fecha <= ?";
      params.push(fecha_fin + " 23:59:59");
    }
    if (usuario_id) {
      sql += " AND m.usuario_id = ?";
      params.push(usuario_id);
    }
    if (tipo) {
      sql += " AND m.tipo = ?";
      params.push(tipo);
    }
    if (producto_id) {
      sql += " AND m.producto_id = ?";
      params.push(producto_id);
    }

    sql += " ORDER BY m.fecha DESC LIMIT ?";
    params.push(Number(limit));

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener movimientos", error });
  }
});


module.exports = router;
