// backend/routes/tienda_config.js
// Administración (protegida) de la configuración de la tienda web:
// redes sociales, datos de contacto y lista de teléfonos con uno "principal".
const express = require("express");
const router = express.Router();
const db = require("../db");

const s = (v) => String(v ?? "").trim();

const normalizeConfig = (r) => ({
  facebook_url: r?.facebook_url ?? "",
  instagram_url: r?.instagram_url ?? "",
  tiktok_url: r?.tiktok_url ?? "",
  correo: r?.correo ?? "",
  direccion: r?.direccion ?? "",
  horario: r?.horario ?? "",
  maps_embed_url: r?.maps_embed_url ?? "",
});

// GET /api/tienda-config  -> { config, telefonos }
router.get("/", async (req, res) => {
  try {
    const [[config]] = await db.query(
      "SELECT * FROM tienda_config WHERE id = 1 LIMIT 1",
    );
    const [telefonos] = await db.query(
      "SELECT id, numero, etiqueta, es_principal FROM tienda_telefonos ORDER BY es_principal DESC, id ASC",
    );
    return res.json({ config: normalizeConfig(config), telefonos });
  } catch (error) {
    console.error("❌ Error GET /tienda-config:", error);
    return res.status(500).json({ message: "Error al obtener la configuración" });
  }
});

// PUT /api/tienda-config  -> actualiza redes sociales / contacto
router.put("/", async (req, res) => {
  try {
    const facebook_url = s(req.body.facebook_url);
    const instagram_url = s(req.body.instagram_url);
    const tiktok_url = s(req.body.tiktok_url);
    const correo = s(req.body.correo);
    const direccion = s(req.body.direccion);
    const horario = s(req.body.horario);
    const maps_embed_url = s(req.body.maps_embed_url);

    await db.query(
      `INSERT INTO tienda_config (id, facebook_url, instagram_url, tiktok_url, correo, direccion, horario, maps_embed_url)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         facebook_url = VALUES(facebook_url),
         instagram_url = VALUES(instagram_url),
         tiktok_url = VALUES(tiktok_url),
         correo = VALUES(correo),
         direccion = VALUES(direccion),
         horario = VALUES(horario),
         maps_embed_url = VALUES(maps_embed_url)`,
      [
        facebook_url || null,
        instagram_url || null,
        tiktok_url || null,
        correo || null,
        direccion || null,
        horario || null,
        maps_embed_url || null,
      ],
    );

    return res.json({ message: "Configuración actualizada" });
  } catch (error) {
    console.error("❌ Error PUT /tienda-config:", error);
    return res.status(500).json({ message: "Error al actualizar la configuración" });
  }
});

// POST /api/tienda-config/telefonos -> agrega un teléfono
router.post("/telefonos", async (req, res) => {
  try {
    const numero = s(req.body.numero);
    const etiqueta = s(req.body.etiqueta);

    if (!numero) {
      return res.status(400).json({ message: "El número es obligatorio" });
    }

    const [existentes] = await db.query(
      "SELECT COUNT(*) AS total FROM tienda_telefonos",
    );
    const esPrimero = existentes[0].total === 0;

    const [result] = await db.query(
      "INSERT INTO tienda_telefonos (numero, etiqueta, es_principal) VALUES (?, ?, ?)",
      [numero, etiqueta || null, esPrimero ? 1 : 0],
    );

    return res.json({ id: result.insertId, numero, etiqueta, es_principal: esPrimero ? 1 : 0 });
  } catch (error) {
    console.error("❌ Error POST /tienda-config/telefonos:", error);
    return res.status(500).json({ message: "Error al agregar el teléfono" });
  }
});

// PUT /api/tienda-config/telefonos/:id -> edita número/etiqueta
router.put("/telefonos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const numero = s(req.body.numero);
    const etiqueta = s(req.body.etiqueta);

    if (!id) return res.status(400).json({ message: "ID inválido" });
    if (!numero) return res.status(400).json({ message: "El número es obligatorio" });

    const [result] = await db.query(
      "UPDATE tienda_telefonos SET numero = ?, etiqueta = ? WHERE id = ?",
      [numero, etiqueta || null, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Teléfono no encontrado" });
    }

    return res.json({ message: "Teléfono actualizado" });
  } catch (error) {
    console.error("❌ Error PUT /tienda-config/telefonos/:id:", error);
    return res.status(500).json({ message: "Error al actualizar el teléfono" });
  }
});

// PATCH /api/tienda-config/telefonos/:id/principal -> lo marca como principal (único)
router.patch("/telefonos/:id/principal", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "ID inválido" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [existe] = await conn.query(
      "SELECT id FROM tienda_telefonos WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existe.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Teléfono no encontrado" });
    }

    await conn.query("UPDATE tienda_telefonos SET es_principal = 0");
    await conn.query("UPDATE tienda_telefonos SET es_principal = 1 WHERE id = ?", [id]);

    await conn.commit();
    return res.json({ message: "Teléfono principal actualizado" });
  } catch (error) {
    await conn.rollback();
    console.error("❌ Error PATCH /tienda-config/telefonos/:id/principal:", error);
    return res.status(500).json({ message: "Error al marcar el teléfono principal" });
  } finally {
    conn.release();
  }
});

// DELETE /api/tienda-config/telefonos/:id
router.delete("/telefonos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const [[telefono]] = await db.query(
      "SELECT es_principal FROM tienda_telefonos WHERE id = ? LIMIT 1",
      [id],
    );
    if (!telefono) {
      return res.status(404).json({ message: "Teléfono no encontrado" });
    }

    await db.query("DELETE FROM tienda_telefonos WHERE id = ?", [id]);

    // Si se borró el principal, promueve otro automáticamente (si queda alguno)
    if (telefono.es_principal) {
      await db.query(
        "UPDATE tienda_telefonos SET es_principal = 1 WHERE id = (SELECT id FROM (SELECT id FROM tienda_telefonos ORDER BY id ASC LIMIT 1) t)",
      );
    }

    return res.json({ message: "Teléfono eliminado" });
  } catch (error) {
    console.error("❌ Error DELETE /tienda-config/telefonos/:id:", error);
    return res.status(500).json({ message: "Error al eliminar el teléfono" });
  }
});

module.exports = router;
