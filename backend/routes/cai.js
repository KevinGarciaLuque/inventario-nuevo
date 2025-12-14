const express = require("express");
const router = express.Router();
const db = require("../db");

// ✅ Listar todos los CAI (ordenados por fecha)
router.get("/", async (req, res) => {
  try {
    const [cai] = await db.query(
      "SELECT * FROM cai ORDER BY fecha_autorizacion DESC"
    );
    res.json(cai);
  } catch (error) {
    console.error("❌ Error al obtener CAI:", error);
    res.status(500).json({ message: "Error al obtener CAI" });
  }
});

// ✅ Crear un nuevo CAI (y activar solo ese)
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
    // Desactivar los demás
    await db.query("UPDATE cai SET activo = 0");

    // Insertar nuevo activo
    await db.query(
      `INSERT INTO cai (
        cai_codigo, sucursal, punto_emision, tipo_documento,
        rango_inicio, rango_fin, correlativo_actual,
        fecha_autorizacion, fecha_limite_emision, activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
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

    res.json({ message: "✅ Nuevo CAI registrado y activado" });
  } catch (error) {
    console.error("❌ Error al registrar CAI:", error);
    res.status(500).json({ message: "Error al registrar el nuevo CAI" });
  }
});

// ✅ Obtener el CAI activo
router.get("/activo", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM cai WHERE activo = 1 LIMIT 1");
    if (rows.length === 0) {
      return res.status(404).json({ message: "No hay CAI activo" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("❌ Error al consultar CAI activo:", error);
    res.status(500).json({ message: "Error al consultar el CAI activo" });
  }
});

// ✅ Activar o desactivar un CAI por ID
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;

  try {
    if (activo === true || activo === 1 || activo === "1") {
      // Desactivar los demás
      await db.query("UPDATE cai SET activo = 0 WHERE id != ?", [id]);
    }

    await db.query("UPDATE cai SET activo = ? WHERE id = ?", [
      activo ? 1 : 0,
      id,
    ]);
    res.json({ message: "✅ Estado del CAI actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar estado del CAI:", error);
    res.status(500).json({ message: "Error al actualizar estado del CAI" });
  }
});

module.exports = router;
