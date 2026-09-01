// backend/routes/tiendas.js
// Catálogo de tiendas / locales. Lectura: cualquier usuario autenticado
// (se usa para etiquetas y filtros). Escritura: SOLO superadmin.
const express = require("express");
const router = express.Router();
const db = require("../db");

const s = (v) => String(v ?? "").trim();

const soloSuperadmin = (req, res, next) => {
  if (req.user?.rol !== "superadmin") {
    return res
      .status(403)
      .json({ message: "Solo el superadministrador puede gestionar las tiendas" });
  }
  next();
};

// GET /api/tiendas  -> todas
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nombre, direccion, rtn, telefono, activo, atiende_web, creado_en FROM tiendas ORDER BY id ASC",
    );
    res.json(rows);
  } catch (error) {
    console.error("❌ GET /tiendas:", error);
    res.status(500).json({ message: "Error al obtener las tiendas" });
  }
});

// GET /api/tiendas/web  -> tienda que atiende los pedidos web (o null)
router.get("/web", async (req, res) => {
  try {
    const [[row]] = await db.query(
      "SELECT id, nombre FROM tiendas WHERE atiende_web = 1 AND activo = 1 LIMIT 1",
    );
    res.json(row || null);
  } catch (error) {
    console.error("❌ GET /tiendas/web:", error);
    res.status(500).json({ message: "Error al consultar la tienda web" });
  }
});

// POST /api/tiendas
router.post("/", soloSuperadmin, async (req, res) => {
  try {
    const nombre = s(req.body.nombre);
    if (!nombre) return res.status(400).json({ message: "El nombre es obligatorio" });

    const [r] = await db.query(
      "INSERT INTO tiendas (nombre, direccion, rtn, telefono, activo) VALUES (?, ?, ?, ?, 1)",
      [
        nombre,
        s(req.body.direccion) || null,
        s(req.body.rtn) || null,
        s(req.body.telefono) || null,
      ],
    );
    res.status(201).json({ id: r.insertId, message: "Tienda creada" });
  } catch (error) {
    console.error("❌ POST /tiendas:", error);
    res.status(500).json({ message: "Error al crear la tienda" });
  }
});

// PUT /api/tiendas/:id
router.put("/:id", soloSuperadmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const nombre = s(req.body.nombre);
    if (!nombre) return res.status(400).json({ message: "El nombre es obligatorio" });

    const [r] = await db.query(
      "UPDATE tiendas SET nombre = ?, direccion = ?, rtn = ?, telefono = ?, activo = ? WHERE id = ?",
      [
        nombre,
        s(req.body.direccion) || null,
        s(req.body.rtn) || null,
        s(req.body.telefono) || null,
        req.body.activo ? 1 : 0,
        id,
      ],
    );
    if (r.affectedRows === 0)
      return res.status(404).json({ message: "Tienda no encontrada" });
    res.json({ message: "Tienda actualizada" });
  } catch (error) {
    console.error("❌ PUT /tiendas/:id:", error);
    res.status(500).json({ message: "Error al actualizar la tienda" });
  }
});

// PATCH /api/tiendas/:id/atiende-web  -> marca ESTA como la tienda web (exclusivo)
router.patch("/:id/atiende-web", soloSuperadmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "ID inválido" });

  const activar = req.body?.atiende_web !== false; // por defecto true
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE tiendas SET atiende_web = 0");
    if (activar) {
      const [r] = await conn.query(
        "UPDATE tiendas SET atiende_web = 1 WHERE id = ? AND activo = 1",
        [id],
      );
      if (r.affectedRows === 0) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: "La tienda no existe o está inactiva" });
      }
    }
    await conn.commit();
    res.json({
      message: activar
        ? "Esta tienda ahora atiende los pedidos web"
        : "Ninguna tienda atiende los pedidos web",
    });
  } catch (error) {
    await conn.rollback();
    console.error("❌ PATCH /tiendas/:id/atiende-web:", error);
    res.status(500).json({ message: "Error al actualizar la tienda web" });
  } finally {
    conn.release();
  }
});

// DELETE /api/tiendas/:id
router.delete("/:id", soloSuperadmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });
    const [r] = await db.query("DELETE FROM tiendas WHERE id = ?", [id]);
    if (r.affectedRows === 0)
      return res.status(404).json({ message: "Tienda no encontrada" });
    res.json({ message: "Tienda eliminada" });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451) {
      return res.status(409).json({
        message:
          "La tienda tiene ventas, usuarios o CAI asociados. Desactívala en lugar de eliminarla.",
      });
    }
    console.error("❌ DELETE /tiendas/:id:", error);
    res.status(500).json({ message: "Error al eliminar la tienda" });
  }
});

module.exports = router;
