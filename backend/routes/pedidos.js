// backend/routes/pedidos.js
// Módulo de Pedidos Web (protegido). Los pedidos entran desde la tienda pública
// (routes/public.js -> POST /pedidos). Aquí el vendedor los gestiona:
//   nuevo -> en_proceso -> listo -> (se cobra en Registrar Venta) -> cobrado
// También: cancelado.
const express = require("express");
const router = express.Router();
const db = require("../db");

const requireRoles =
  (...roles) =>
  (req, res, next) => {
    const rol = req.user?.rol;
    if (!rol || (!roles.includes(rol) && rol !== "superadmin")) {
      return res.status(403).json({ message: "Acceso denegado." });
    }
    next();
  };

const GESTOR = requireRoles("admin", "cajero", "usuario");

// Transiciones permitidas de estado
const TRANSICIONES = {
  nuevo: ["en_proceso", "cancelado"],
  en_proceso: ["listo", "cancelado"],
  listo: ["en_proceso", "cancelado"],
  cobrado: [],
  cancelado: [],
};

// GET /api/pedidos/resumen -> { nuevos } para la campanita (polling ligero)
router.get("/resumen", GESTOR, async (req, res) => {
  try {
    const [[row]] = await db.query(
      "SELECT COUNT(*) AS nuevos FROM pedidos_web WHERE estado = 'nuevo'",
    );
    const [recientes] = await db.query(
      `SELECT id, cliente_nombre, total_aprox, entrega, creado_en, leido
       FROM pedidos_web
       WHERE estado = 'nuevo'
       ORDER BY creado_en DESC
       LIMIT 8`,
    );
    return res.json({ nuevos: row.nuevos, recientes });
  } catch (error) {
    console.error("❌ Error GET /pedidos/resumen:", error);
    return res.status(500).json({ message: "Error al obtener el resumen de pedidos" });
  }
});

// GET /api/pedidos?estado=nuevo
router.get("/", GESTOR, async (req, res) => {
  try {
    const estado = String(req.query.estado || "").trim();
    let sql = `
      SELECT p.*, f.numero_factura
      FROM pedidos_web p
      LEFT JOIN ventas v ON v.id = p.venta_id
      LEFT JOIN facturas f ON f.id = v.factura_id
    `;
    const params = [];
    if (estado && estado !== "todos") {
      sql += " WHERE p.estado = ? ";
      params.push(estado);
    }
    sql += " ORDER BY p.creado_en DESC LIMIT 300";

    const [rows] = await db.query(sql, params);
    return res.json(rows);
  } catch (error) {
    console.error("❌ Error GET /pedidos:", error);
    return res.status(500).json({ message: "Error al obtener los pedidos" });
  }
});

// GET /api/pedidos/:id -> pedido + items
router.get("/:id", GESTOR, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const [[pedido]] = await db.query(
      `SELECT p.*, f.numero_factura
       FROM pedidos_web p
       LEFT JOIN ventas v ON v.id = p.venta_id
       LEFT JOIN facturas f ON f.id = v.factura_id
       WHERE p.id = ? LIMIT 1`,
      [id],
    );
    if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });

    const [items] = await db.query(
      `SELECT i.*, pr.stock AS stock_actual
       FROM pedido_web_items i
       LEFT JOIN productos pr ON pr.id = i.producto_id
       WHERE i.pedido_id = ?
       ORDER BY i.id ASC`,
      [id],
    );

    return res.json({ ...pedido, items });
  } catch (error) {
    console.error("❌ Error GET /pedidos/:id:", error);
    return res.status(500).json({ message: "Error al obtener el pedido" });
  }
});

// PATCH /api/pedidos/:id/estado  body: { estado }
router.patch("/:id/estado", GESTOR, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const nuevoEstado = String(req.body.estado || "").trim();
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const [[pedido]] = await db.query(
      "SELECT estado FROM pedidos_web WHERE id = ? LIMIT 1",
      [id],
    );
    if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });

    const permitidas = TRANSICIONES[pedido.estado] || [];
    if (!permitidas.includes(nuevoEstado)) {
      return res.status(400).json({
        message: `No se puede pasar de "${pedido.estado}" a "${nuevoEstado}".`,
      });
    }

    await db.query(
      "UPDATE pedidos_web SET estado = ?, procesado_por = ?, leido = 1 WHERE id = ?",
      [nuevoEstado, req.user?.id || null, id],
    );

    return res.json({ message: "Estado actualizado", estado: nuevoEstado });
  } catch (error) {
    console.error("❌ Error PATCH /pedidos/:id/estado:", error);
    return res.status(500).json({ message: "Error al actualizar el estado" });
  }
});

// PATCH /api/pedidos/:id/leido -> marca la notificación como vista
router.patch("/:id/leido", GESTOR, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });
    await db.query("UPDATE pedidos_web SET leido = 1 WHERE id = ?", [id]);
    return res.json({ message: "Pedido marcado como visto" });
  } catch (error) {
    console.error("❌ Error PATCH /pedidos/:id/leido:", error);
    return res.status(500).json({ message: "Error al marcar el pedido" });
  }
});

// PATCH /api/pedidos/leidos -> marca todos los nuevos como vistos
router.patch("/leidos/todos", GESTOR, async (req, res) => {
  try {
    await db.query("UPDATE pedidos_web SET leido = 1 WHERE estado = 'nuevo'");
    return res.json({ message: "Notificaciones marcadas como vistas" });
  } catch (error) {
    console.error("❌ Error PATCH /pedidos/leidos/todos:", error);
    return res.status(500).json({ message: "Error al marcar las notificaciones" });
  }
});

module.exports = router;
