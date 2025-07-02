const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. Registrar una acción en la bitácora
router.post("/", async (req, res) => {
  try {
    const { usuario_id, accion, descripcion, ip } = req.body;
    if (!usuario_id || !accion) {
      return res.status(400).json({ message: "usuario_id y accion son requeridos" });
    }
    await db.query(
      "INSERT INTO bitacora (usuario_id, accion, descripcion, ip) VALUES (?, ?, ?, ?)",
      [usuario_id, accion, descripcion || '', ip || null]
    );
    res.json({ message: "Acción registrada en bitácora" });
  } catch (error) {
    res.status(500).json({ message: "Error al registrar en bitácora", error });
  }
});

// 2. Consultar bitácora (últimos registros, por usuario, por acción, etc.)
router.get("/", async (req, res) => {
  try {
    const { usuario_id, accion, limit = 100 } = req.query;
    let sql = `
      SELECT b.id, b.usuario_id, u.nombre as usuario, b.accion, b.descripcion, b.fecha, b.ip
      FROM bitacora b
      LEFT JOIN usuarios u ON b.usuario_id = u.id
      WHERE 1
    `;
    const params = [];
    if (usuario_id) {
      sql += " AND b.usuario_id = ?";
      params.push(usuario_id);
    }
    if (accion) {
      sql += " AND b.accion = ?";
      params.push(accion);
    }
    sql += " ORDER BY b.fecha DESC LIMIT ?";
    params.push(Number(limit));

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al consultar bitácora", error });
  }
});

// (Opcional) Detalle de un registro
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT b.*, u.nombre as usuario 
       FROM bitacora b 
       LEFT JOIN usuarios u ON b.usuario_id = u.id 
       WHERE b.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Registro no encontrado" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error al consultar registro", error });
  }
});

module.exports = router;
