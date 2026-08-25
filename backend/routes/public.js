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

// Columnas seguras: nunca precio_costo, lote, etc.
// stock_minimo y creado_en sí se exponen (umbral de "últimas unidades" y badge "Nuevo").
const SELECT_PRODUCTO_PUBLICO = `
  SELECT
    p.id,
    p.codigo,
    p.nombre,
    p.marca,
    p.descripcion,
    p.precio,
    p.descuento,
    p.imagen,
    p.stock,
    p.stock_minimo,
    p.creado_en,
    p.categoria_id,
    c.nombre AS categoria,
    um.nombre AS unidad_nombre,
    um.abreviatura AS unidad_abreviatura,
    p.contenido_medida,
    p.dimensiones,
    p.producto_padre_id,
    p.variante_nombre
  FROM productos p
  LEFT JOIN categorias c ON p.categoria_id = c.id
  LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
`;

// GET /api/public/productos?categoria_id=&q=
router.get("/productos", async (req, res) => {
  try {
    const categoriaId = toNumberOrNull(req.query.categoria_id);
    const q = s(req.query.q);

    let query = `${SELECT_PRODUCTO_PUBLICO} WHERE p.stock > 0 AND p.activo = 1`;
    const params = [];

    if (categoriaId) {
      // Incluye la categoría elegida y TODOS sus descendientes (subcategorías
      // y sub-subcategorías, sin importar cuántos niveles tenga el árbol).
      query += ` AND p.categoria_id IN (
        WITH RECURSIVE arbol AS (
          SELECT id FROM categorias WHERE id = ?
          UNION ALL
          SELECT c.id FROM categorias c
          INNER JOIN arbol a ON c.categoria_padre_id = a.id
        )
        SELECT id FROM arbol
      )`;
      params.push(categoriaId);
    }

    if (q) {
      query += " AND (p.nombre LIKE ? OR p.descripcion LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }

    query += " ORDER BY p.nombre ASC";

    const [rows] = await db.query(query, params);

    // Agrupa variantes (mismo producto, distinto color/opción) en una sola
    // "tarjeta" por familia, para no repetir el mismo modelo varias veces
    // en el catálogo. El detalle (/productos/:id) trae todas las variantes.
    const porFamilia = new Map();
    for (const p of rows) {
      const familiaId = p.producto_padre_id || p.id;
      if (!porFamilia.has(familiaId)) porFamilia.set(familiaId, []);
      porFamilia.get(familiaId).push(p);
    }

    const resultado = [...porFamilia.values()].map((miembros) => {
      // Preferir el producto principal (sin padre) como representante;
      // si no está en stock, usar el primer miembro disponible.
      const representante =
        miembros.find((m) => !m.producto_padre_id) || miembros[0];
      return {
        ...representante,
        total_variantes: miembros.length,
      };
    });

    resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));

    return res.json(resultado);
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
      `${SELECT_PRODUCTO_PUBLICO} WHERE p.id = ? AND p.stock > 0 AND p.activo = 1 LIMIT 1`,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const producto = rows[0];

    // Si es (o tiene) variantes, trae a toda la familia para el selector de
    // color/opción — incluye variantes agotadas (para mostrarlas
    // deshabilitadas) pero no las desactivadas.
    const familiaId = producto.producto_padre_id || producto.id;
    const [variantesRows] = await db.query(
      `SELECT id, variante_nombre, precio, stock, imagen, producto_padre_id
       FROM productos
       WHERE activo = 1 AND (id = ? OR producto_padre_id = ?)
       ORDER BY variante_nombre ASC`,
      [familiaId, familiaId],
    );

    if (variantesRows.length > 1) {
      producto.variantes = variantesRows;
    }

    return res.json(producto);
  } catch (error) {
    console.error("❌ Error GET /public/productos/:id:", error);
    return res.status(500).json({ message: "Error al obtener el producto" });
  }
});

// GET /api/public/categorias
router.get("/categorias", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nombre, descripcion, categoria_padre_id FROM categorias ORDER BY categoria_padre_id IS NULL DESC, nombre ASC",
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

// GET /api/public/carrusel -> slides activos del carrusel de inicio, ordenados
router.get("/carrusel", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, imagen_url, titulo, texto, boton_texto, boton_link
       FROM tienda_carrusel
       WHERE activo = 1
       ORDER BY orden ASC, id ASC`,
    );
    return res.json(rows);
  } catch (error) {
    console.error("❌ Error GET /public/carrusel:", error);
    return res.status(500).json({ message: "Error al obtener el carrusel" });
  }
});

module.exports = router;
