const express = require("express");
const router = express.Router();
const db = require("../db");

// Listar los registros CAI
router.get("/", async (req, res) => {
  try {
    const [cai] = await db.query(
      "SELECT * FROM cai ORDER BY fecha_autorizacion DESC"
    );
    res.json(cai);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener CAI" });
  }
});

// Crear un nuevo CAI (activando y desactivando los demás)
router.post("/", async (req, res) => {
  const {
    cai_codigo,
    sucursal,
    punto_emision,
    tipo_documento,
    rango_inicio,
    rango_fin,
    correlativo_actual,
    fecha_autorizacion,
    fecha_limite_emision,
  } = req.body;

  try {
    // Desactivar todos los CAI anteriores
    await db.query("UPDATE cai SET activo = 0");

    // Insertar el nuevo CAI
    await db.query(
      `INSERT INTO cai (cai_codigo, sucursal, punto_emision, tipo_documento, rango_inicio, rango_fin, correlativo_actual, fecha_autorizacion, fecha_limite_emision, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        cai_codigo,
        sucursal,
        punto_emision,
        tipo_documento,
        rango_inicio,
        rango_fin,
        correlativo_actual,
        fecha_autorizacion,
        fecha_limite_emision,
      ]
    );

    res.json({ message: "Nuevo CAI registrado y activado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al registrar el nuevo CAI" });
  }
});

// Obtener el CAI activo
router.get("/activo", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM cai WHERE activo = 1 LIMIT 1");
    if (rows.length === 0) {
      return res.status(404).json({ message: "No hay CAI activo" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al consultar el CAI activo" });
  }
});


module.exports = router;
