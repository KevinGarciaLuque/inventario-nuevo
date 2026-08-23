// backend/routes/public.js
// Rutas públicas (SIN auth) para la tienda web: catálogo de solo lectura
// filtrado por stock disponible + registro de solicitudes de clientes.
const express = require("express");
const router = express.Router();
const db = require("../db");

const s = (v) => String(v ?? "").trim();

const toNumberOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Columnas seguras: nunca precio_costo, stock_minimo, lote, etc.
const SELECT_PRODUCTO_PUBLICO = `
  SELECT
    p.id,
    p.codigo,
    p.nombre,
    p.descripcion,
    p.precio,
    p.descuento,
    p.imagen,
    p.stock,
    p.categoria_id,
    c.nombre AS categoria,
    um.nombre AS unidad_nombre,
    um.abreviatura AS unidad_abreviatura,
    p.contenido_medida
  FROM productos p
  LEFT JOIN categorias c ON p.categoria_id = c.id
  LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
`;

// GET /api/public/productos?categoria_id=&q=
router.get("/productos", async (req, res) => {
  try {
    const categoriaId = toNumberOrNull(req.query.categoria_id);
    const q = s(req.query.q);

    let query = `${SELECT_PRODUCTO_PUBLICO} WHERE p.stock > 0`;
    const params = [];

    if (categoriaId) {
      query += " AND p.categoria_id = ?";
      params.push(categoriaId);
    }

    if (q) {
      query += " AND (p.nombre LIKE ? OR p.descripcion LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }

    query += " ORDER BY p.nombre ASC";

    const [rows] = await db.query(query, params);
    return res.json(rows);
  } catch (error) {
    console.error("❌ Error GET /public/productos:", error);
    return res.status(500).json({ message: "Error al obtener productos" });
  }
});

// GET /api/public/productos/:id
router.get("/productos/:id", async (req, res) => {
  try {
    const id = toNumberOrNull(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const [rows] = await db.query(
      `${SELECT_PRODUCTO_PUBLICO} WHERE p.id = ? AND p.stock > 0 LIMIT 1`,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("❌ Error GET /public/productos/:id:", error);
    return res.status(500).json({ message: "Error al obtener el producto" });
  }
});

// GET /api/public/categorias
router.get("/categorias", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nombre, descripcion FROM categorias ORDER BY nombre ASC",
    );
    return res.json(rows);
  } catch (error) {
    console.error("❌ Error GET /public/categorias:", error);
    return res.status(500).json({ message: "Error al obtener categorías" });
  }
});

// POST /api/public/clientes-web
router.post("/clientes-web", async (req, res) => {
  try {
    const nombre = s(req.body.nombre);
    const empresa = s(req.body.empresa);
    const telefono = s(req.body.telefono);
    const correo = s(req.body.correo);
    const ubicacion = s(req.body.ubicacion);

    if (!nombre || !telefono) {
      return res
        .status(400)
        .json({ message: "Nombre y teléfono son obligatorios" });
    }

    await db.query(
      `INSERT INTO clientes_web (nombre, empresa, telefono, correo, ubicacion)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, empresa || null, telefono, correo || null, ubicacion || null],
    );

    return res.json({ message: "Solicitud registrada correctamente" });
  } catch (error) {
    console.error("❌ Error POST /public/clientes-web:", error);
    return res.status(500).json({ message: "Error al registrar la solicitud" });
  }
});

// GET /api/public/config -> redes sociales, contacto y teléfono principal
router.get("/config", async (req, res) => {
  try {
    const [[config]] = await db.query(
      "SELECT facebook_url, instagram_url, tiktok_url, correo, direccion, horario, maps_embed_url FROM tienda_config WHERE id = 1 LIMIT 1",
    );
    const [telefonos] = await db.query(
      "SELECT numero, etiqueta, es_principal FROM tienda_telefonos ORDER BY es_principal DESC, id ASC",
    );

    const principal = telefonos.find((t) => t.es_principal) || telefonos[0] || null;

    return res.json({
      redes: {
        facebook: config?.facebook_url || "",
        instagram: config?.instagram_url || "",
        tiktok: config?.tiktok_url || "",
      },
      contacto: {
        correo: config?.correo || "",
        direccion: config?.direccion || "",
        horario: config?.horario || "",
        mapsEmbedUrl: config?.maps_embed_url || "",
      },
      telefonoPrincipal: principal?.numero || "",
      telefonos: telefonos.map((t) => ({ numero: t.numero, etiqueta: t.etiqueta })),
    });
  } catch (error) {
    console.error("❌ Error GET /public/config:", error);
    return res.status(500).json({ message: "Error al obtener la configuración" });
  }
});

module.exports = router;
