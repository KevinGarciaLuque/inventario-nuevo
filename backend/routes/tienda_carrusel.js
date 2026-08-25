// backend/routes/tienda_carrusel.js
// Administración (protegida) de los slides del carrusel de inicio de la tienda web.
const express = require("express");
const router = express.Router();
const db = require("../db");

const s = (v) => String(v ?? "").trim();

// GET /api/tienda-carrusel -> lista todos los slides (activos e inactivos), ordenados
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM tienda_carrusel ORDER BY orden ASC, id ASC",
    );
    return res.json(rows);
  } catch (error) {
    console.error("❌ Error GET /tienda-carrusel:", error);
    return res.status(500).json({ message: "Error al obtener el carrusel" });
  }
});

// POST /api/tienda-carrusel -> crea un slide
router.post("/", async (req, res) => {
  try {
    const imagen_url = s(req.body.imagen_url);
    const titulo = s(req.body.titulo);
    const texto = s(req.body.texto);
    const boton_texto = s(req.body.boton_texto);
    const boton_link = s(req.body.boton_link);
    const texto_color = s(req.body.texto_color);
    const activo = req.body.activo === false ? 0 : 1;

    if (!imagen_url) {
      return res.status(400).json({ message: "La imagen es obligatoria" });
    }

    const [[{ maxOrden }]] = await db.query(
      "SELECT COALESCE(MAX(orden), -1) AS maxOrden FROM tienda_carrusel",
    );

    const [result] = await db.query(
      `INSERT INTO tienda_carrusel (imagen_url, titulo, texto, boton_texto, boton_link, texto_color, orden, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        imagen_url,
        titulo || null,
        texto || null,
        boton_texto || null,
        boton_link || null,
        texto_color || "#ffffff",
        maxOrden + 1,
        activo,
      ],
    );

    return res.json({ id: result.insertId, message: "Slide agregado" });
  } catch (error) {
    console.error("❌ Error POST /tienda-carrusel:", error);
    return res.status(500).json({ message: "Error al agregar el slide" });
  }
});

// PUT /api/tienda-carrusel/:id -> edita un slide
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const imagen_url = s(req.body.imagen_url);
    const titulo = s(req.body.titulo);
    const texto = s(req.body.texto);
    const boton_texto = s(req.body.boton_texto);
    const boton_link = s(req.body.boton_link);
    const texto_color = s(req.body.texto_color);
    const activo = req.body.activo === false ? 0 : 1;

    if (!imagen_url) {
      return res.status(400).json({ message: "La imagen es obligatoria" });
    }

    const [result] = await db.query(
      `UPDATE tienda_carrusel
       SET imagen_url = ?, titulo = ?, texto = ?, boton_texto = ?, boton_link = ?, texto_color = ?, activo = ?
       WHERE id = ?`,
      [
        imagen_url,
        titulo || null,
        texto || null,
        boton_texto || null,
        boton_link || null,
        texto_color || "#ffffff",
        activo,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Slide no encontrado" });
    }

    return res.json({ message: "Slide actualizado" });
  } catch (error) {
    console.error("❌ Error PUT /tienda-carrusel/:id:", error);
    return res.status(500).json({ message: "Error al actualizar el slide" });
  }
});

// PATCH /api/tienda-carrusel/:id/orden -> mueve el slide ("arriba" | "abajo")
router.patch("/:id/orden", async (req, res) => {
  const id = Number(req.params.id);
  const direccion = s(req.body.direccion);
  if (!id) return res.status(400).json({ message: "ID inválido" });
  if (!["arriba", "abajo"].includes(direccion)) {
    return res.status(400).json({ message: "Dirección inválida" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[actual]] = await conn.query(
      "SELECT id, orden FROM tienda_carrusel WHERE id = ? LIMIT 1",
      [id],
    );
    if (!actual) {
      await conn.rollback();
      return res.status(404).json({ message: "Slide no encontrado" });
    }

    const [[vecino]] = await conn.query(
      direccion === "arriba"
        ? "SELECT id, orden FROM tienda_carrusel WHERE orden < ? ORDER BY orden DESC LIMIT 1"
        : "SELECT id, orden FROM tienda_carrusel WHERE orden > ? ORDER BY orden ASC LIMIT 1",
      [actual.orden],
    );

    if (!vecino) {
      await conn.rollback();
      return res.json({ message: "Sin cambios" });
    }

    await conn.query("UPDATE tienda_carrusel SET orden = ? WHERE id = ?", [vecino.orden, actual.id]);
    await conn.query("UPDATE tienda_carrusel SET orden = ? WHERE id = ?", [actual.orden, vecino.id]);

    await conn.commit();
    return res.json({ message: "Orden actualizado" });
  } catch (error) {
    await conn.rollback();
    console.error("❌ Error PATCH /tienda-carrusel/:id/orden:", error);
    return res.status(500).json({ message: "Error al reordenar el slide" });
  } finally {
    conn.release();
  }
});

// DELETE /api/tienda-carrusel/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const [result] = await db.query("DELETE FROM tienda_carrusel WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Slide no encontrado" });
    }

    return res.json({ message: "Slide eliminado" });
  } catch (error) {
    console.error("❌ Error DELETE /tienda-carrusel/:id:", error);
    return res.status(500).json({ message: "Error al eliminar el slide" });
  }
});

module.exports = router;
