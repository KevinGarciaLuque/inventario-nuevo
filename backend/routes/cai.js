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

// ✅ Configuración de facturación (switch Factura/Recibo)
router.get("/config", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT valor FROM configuracion WHERE clave = 'emitir_con_cai' LIMIT 1"
    );
    const emitir_con_cai = rows.length ? rows[0].valor === "1" : true;
    res.json({ emitir_con_cai });
  } catch (error) {
    console.error("❌ Error al obtener config de facturación:", error);
    res.status(500).json({ message: "Error al obtener la configuración" });
  }
});

router.put("/config", async (req, res) => {
  try {
    const valor = req.body?.emitir_con_cai ? "1" : "0";
    await db.query(
      `INSERT INTO configuracion (clave, valor) VALUES ('emitir_con_cai', ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
      [valor]
    );
    res.json({
      message:
        valor === "1"
          ? "✅ Facturación con CAI activada (se emitirán Facturas)"
          : "✅ Facturación con CAI desactivada (se emitirán Recibos)",
      emitir_con_cai: valor === "1",
    });
  } catch (error) {
    console.error("❌ Error al actualizar config de facturación:", error);
    res.status(500).json({ message: "Error al actualizar la configuración" });
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

// ✅ Eliminar un CAI (SOLO SUPERADMIN)
router.delete("/:id", async (req, res) => {
  if (req.user?.rol !== "superadmin") {
    return res
      .status(403)
      .json({ message: "Solo el superadministrador puede eliminar un CAI" });
  }

  const { id } = req.params;
  const force = ["1", "true"].includes(String(req.query.force).toLowerCase());

  try {
    if (force) {
      // Elimina el CAI conservando las facturas (quedan sin CAI asignado)
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query("UPDATE facturas SET cai_id = NULL WHERE cai_id = ?", [
          id,
        ]);
        const [r] = await conn.query("DELETE FROM cai WHERE id = ?", [id]);
        await conn.commit();
        if (r.affectedRows === 0) {
          return res.status(404).json({ message: "CAI no encontrado" });
        }
        return res.json({
          message:
            "✅ CAI eliminado. Las facturas emitidas se conservaron sin CAI asignado.",
        });
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    }

    const [result] = await db.query("DELETE FROM cai WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "CAI no encontrado" });
    }
    res.json({ message: "✅ CAI eliminado correctamente" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451) {
      return res.status(409).json({
        message:
          "Este CAI tiene facturas emitidas asociadas.",
        requiereFuerza: true,
      });
    }
    console.error("❌ Error al eliminar CAI:", error);
    res.status(500).json({ message: "Error al eliminar el CAI" });
  }
});

module.exports = router;
