// backend/routes/productos.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// ========================
// Helpers
// ========================
const clampPct = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

const toNullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

const parseDateOrNull = (v) => {
  const s = toNullIfEmpty(v);
  if (!s) return null;

  // Acepta YYYY-MM-DD
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;

  return s; // MySQL DATE
};

const toNumberOrNull = (v) => {
  if (v === undefined || v === null) return null;

  const s = String(v).trim();
  if (s === "") return null;

  // ✅ Soporta coma decimal: "5,5" -> "5.5"
  const normalized = s.replace(",", ".");
  const n = Number(normalized);

  return Number.isFinite(n) ? n : null;
};

const mustBePositiveInt = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
};

// ✅ Lee descuento desde varios nombres
const leerDescuentoPct = (body) => {
  const raw =
    body?.descuento ??
    body?.descuento_pct ??
    body?.descuentoPorcentaje ??
    body?.porcentaje_descuento ??
    0;

  const n = toNumberOrNull(raw);
  return clampPct(n ?? 0);
};

// Valida unidad: existe y está activa (si viene)
const validarUnidadActiva = async (unidadId) => {
  if (!unidadId) return true; // null => permitido
  const [rows] = await db.query(
    "SELECT id, activo FROM unidades_medida WHERE id = ? LIMIT 1",
    [unidadId]
  );
  if (rows.length === 0) return false;
  return !!rows[0].activo;
};


router.get("/:id", async (req, res) => {
  try {
    const id = mustBePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const query = `
      SELECT 
        p.*,

        -- Categoría
        c.nombre AS categoria,

        -- Ubicación
        u.nombre AS ubicacion,

        -- Unidad de medida
        um.nombre AS unidad_nombre,
        um.abreviatura AS unidad_abreviatura,
        um.tipo AS unidad_tipo,

        -- ✅ Impuesto
        i.id AS impuesto_id,
        i.nombre AS impuesto_nombre,
        i.porcentaje AS impuesto_porcentaje

      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN ubicaciones u ON p.ubicacion_id = u.id
      LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
      LEFT JOIN impuestos i ON p.impuesto_id = i.id
      WHERE p.id = ?
      LIMIT 1
    `;

    const [rows] = await db.query(query, [id]);

    if (!rows.length) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("❌ Error GET /productos/:id:", error);
    return res.status(500).json({
      message: "Error al obtener el producto",
      code: error?.code,
      sqlMessage: error?.sqlMessage,
    });
  }
});

// ========================
// Obtener productos + JOIN unidad
// ========================
router.get("/", async (req, res) => {
  try {
    const { nombre } = req.query;

    let query = `
      SELECT 
        p.*,

        -- Categoría
        c.nombre AS categoria,

        -- Ubicación
        u.nombre AS ubicacion,

        -- Unidad de medida
        um.nombre AS unidad_nombre,
        um.abreviatura AS unidad_abreviatura,
        um.tipo AS unidad_tipo,

        -- ✅ Impuesto
        i.id AS impuesto_id,
        i.nombre AS impuesto_nombre,
        i.porcentaje AS impuesto_porcentaje

      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN ubicaciones u ON p.ubicacion_id = u.id
      LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
      LEFT JOIN impuestos i ON p.impuesto_id = i.id
      WHERE 1
    `;

    const params = [];

    if (nombre) {
      query += " AND p.nombre LIKE ?";
      params.push(`%${String(nombre).trim()}%`);
    }

    query += " ORDER BY p.id DESC";

    const [rows] = await db.query(query, params);

    return res.json(rows);
  } catch (error) {
    console.error("❌ Error GET /productos:", error);
    return res.status(500).json({
      message: "Error al obtener los productos",
      code: error?.code,
      sqlMessage: error?.sqlMessage,
    });
  }
});


// ========================
// Buscar producto por código exacto + JOIN unidad
// ========================
router.get("/buscar", async (req, res) => {
  try {
    const { codigo } = req.query;
    const codigoFinal = toNullIfEmpty(codigo);

    if (!codigoFinal) {
      return res.status(400).json({ message: "Código es requerido" });
    }

    const [rows] = await db.query(
      `
      SELECT 
        p.*,
        c.nombre AS categoria,
        u.nombre AS ubicacion,
        um.nombre AS unidad_nombre,
        um.abreviatura AS unidad_abreviatura,
        um.tipo AS unidad_tipo
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN ubicaciones u ON p.ubicacion_id = u.id
      LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
      WHERE p.codigo = ?
      `,
      [codigoFinal]
    );

    return res.json(rows); // frontend espera array
  } catch (error) {
    console.error("❌ Error GET /productos/buscar:", error);
    return res.status(500).json({ message: "Error al buscar producto" });
  }
});

// ========================
// Agregar producto (con bitácora) + medidas DB
// ✅ ultra-blindado para que NO se vaya 0 por payload
// ========================
router.post("/", async (req, res) => {
  try {
    // ✅ DEBUG DEFINITIVO
    console.log("🔥 HIT POST /productos");
    console.log("🔥 BODY COMPLETO:", req.body);

    const {
      codigo,
      nombre,
      lote,
      fecha_vencimiento,
      descripcion,
      categoria_id,
      ubicacion_id,

      // ✅ impuesto
      impuesto_id,

      stock,
      stock_minimo,

      // ✅ precios
      precio,
      precio_costo,

      imagen,

      // ✅ medidas
      contenido_medida,
      unidad_medida_id,

      usuario_id,
    } = req.body;

    const codigoFinal = toNullIfEmpty(codigo);
    const nombreFinal = toNullIfEmpty(nombre);

    if (!codigoFinal || !nombreFinal) {
      return res
        .status(400)
        .json({ message: "Código y nombre son obligatorios" });
    }

    const loteFinal = toNullIfEmpty(lote);
    const fechaVencFinal = parseDateOrNull(fecha_vencimiento);
    const imagenFinal = toNullIfEmpty(imagen);

    // ✅ Medidas
    const contenidoFinal = toNumberOrNull(contenido_medida);
    const unidadIdFinal = mustBePositiveInt(unidad_medida_id);

    const tieneUnidad = unidadIdFinal !== null;
    const tieneContenido = contenidoFinal !== null;

    if ((tieneUnidad && !tieneContenido) || (!tieneUnidad && tieneContenido)) {
      return res.status(400).json({
        message:
          "Si usas medidas, debes enviar contenido_medida y unidad_medida_id.",
      });
    }

    if (unidadIdFinal) {
      const okUnidad = await validarUnidadActiva(unidadIdFinal);
      if (!okUnidad) {
        return res.status(400).json({
          message:
            "La unidad de medida seleccionada no existe o está desactivada.",
        });
      }
    }

    // ✅ Precios
    const precioVenta = toNumberOrNull(precio);
    const costo = toNumberOrNull(precio_costo); // puede ser NULL

    if (precioVenta === null || precioVenta < 0) {
      return res.status(400).json({ message: "Precio inválido" });
    }
    if (costo !== null && costo < 0) {
      return res.status(400).json({ message: "Precio de costo inválido" });
    }

    // ✅ Impuesto (nuevo)
    // - lo dejamos NULL si no viene, pero si lo mandas validamos que exista y esté activo
    const impuestoIdFinal = toNumberOrNull(impuesto_id);

    if (impuestoIdFinal !== null) {
      const [imp] = await db.query(
        "SELECT id, activo FROM impuestos WHERE id = ? LIMIT 1",
        [impuestoIdFinal]
      );
      if (!imp.length) {
        return res
          .status(400)
          .json({ message: "El impuesto seleccionado no existe." });
      }
      if (Number(imp[0].activo) !== 1) {
        return res
          .status(400)
          .json({ message: "El impuesto seleccionado está desactivado." });
      }
    }

    // ✅ Descuento (blindado)
    const rawDesc =
      req.body?.descuento ??
      req.body?.descuento_pct ??
      req.body?.descuentoPorcentaje ??
      req.body?.porcentaje_descuento ??
      0;

    let desc = toNumberOrNull(rawDesc);
    desc = Number.isFinite(desc) ? desc : 0;
    desc = Math.max(0, Math.min(100, desc));

    console.log("🔥 rawDesc recibido:", rawDesc);
    console.log("🔥 desc final a insertar:", desc);
    console.log("🔥 impuestoIdFinal:", impuestoIdFinal);

    await db.query(
      `INSERT INTO productos (
        codigo, nombre, lote, fecha_vencimiento,
        descripcion, categoria_id, ubicacion_id,
        impuesto_id,
        stock, stock_minimo,
        precio, precio_costo, descuento,
        imagen,
        contenido_medida, unidad_medida_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigoFinal,
        nombreFinal,
        loteFinal,
        fechaVencFinal,
        toNullIfEmpty(descripcion),
        toNumberOrNull(categoria_id),
        toNumberOrNull(ubicacion_id),

        impuestoIdFinal, // ✅ NUEVO

        toNumberOrNull(stock) ?? 0,
        toNumberOrNull(stock_minimo) ?? 1,

        precioVenta,
        costo,
        desc,

        imagenFinal,
        contenidoFinal,
        unidadIdFinal,
      ]
    );

    if (usuario_id) {
      await db.query(
        "INSERT INTO bitacora (usuario_id, accion, descripcion) VALUES (?, ?, ?)",
        [
          usuario_id,
          "Agregar producto",
          `Producto "${nombreFinal}" (código: ${codigoFinal}) agregado.`,
        ]
      );
    }

    return res.json({ message: "Producto agregado correctamente" });
  } catch (error) {
    console.error("❌ Error al agregar producto:", error);
    return res.status(500).json({
      message: "Error al agregar producto",
      code: error?.code,
      sqlMessage: error?.sqlMessage,
    });
  }
});


// ========================
// Editar producto (con bitácora) + medidas DB
// ========================
router.put("/:id", async (req, res) => {
  try {
    const id = mustBePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const {
      codigo,
      nombre,
      lote,
      fecha_vencimiento,
      descripcion,
      categoria_id,
      ubicacion_id,

      // ✅ impuesto
      impuesto_id,

      stock,
      stock_minimo,

      // ✅ precios
      precio,
      precio_costo,

      imagen,

      // ✅ medidas
      contenido_medida,
      unidad_medida_id,

      usuario_id,
    } = req.body;

    const codigoFinal = toNullIfEmpty(codigo);
    const nombreFinal = toNullIfEmpty(nombre);

    if (!codigoFinal || !nombreFinal) {
      return res
        .status(400)
        .json({ message: "Código y nombre son obligatorios" });
    }

    const loteFinal = toNullIfEmpty(lote);
    const fechaVencFinal = parseDateOrNull(fecha_vencimiento);
    const imagenFinal = toNullIfEmpty(imagen);

    // ✅ Medidas
    const contenidoFinal = toNumberOrNull(contenido_medida);
    const unidadIdFinal = mustBePositiveInt(unidad_medida_id);

    const tieneUnidad = unidadIdFinal !== null;
    const tieneContenido = contenidoFinal !== null;

    if ((tieneUnidad && !tieneContenido) || (!tieneUnidad && tieneContenido)) {
      return res.status(400).json({
        message:
          "Si usas medidas, debes enviar contenido_medida y unidad_medida_id.",
      });
    }

    if (unidadIdFinal) {
      const okUnidad = await validarUnidadActiva(unidadIdFinal);
      if (!okUnidad) {
        return res.status(400).json({
          message:
            "La unidad de medida seleccionada no existe o está desactivada.",
        });
      }
    }

    // ✅ Precios
    const precioVenta = toNumberOrNull(precio);
    const costo = toNumberOrNull(precio_costo); // puede ser NULL

    if (precioVenta === null || precioVenta < 0) {
      return res.status(400).json({ message: "Precio inválido" });
    }
    if (costo !== null && costo < 0) {
      return res.status(400).json({ message: "Precio de costo inválido" });
    }

    // ✅ Impuesto (nuevo)
    const impuestoIdFinal = toNumberOrNull(impuesto_id);

    // si viene impuesto_id, lo validamos
    if (impuestoIdFinal !== null) {
      const [imp] = await db.query(
        "SELECT id, activo FROM impuestos WHERE id = ? LIMIT 1",
        [impuestoIdFinal]
      );

      if (!imp.length) {
        return res
          .status(400)
          .json({ message: "El impuesto seleccionado no existe." });
      }

      if (Number(imp[0].activo) !== 1) {
        return res
          .status(400)
          .json({ message: "El impuesto seleccionado está desactivado." });
      }
    }

    // ✅ Descuento (blindado)
    const rawDesc =
      req.body?.descuento ??
      req.body?.descuento_pct ??
      req.body?.descuentoPorcentaje ??
      req.body?.porcentaje_descuento ??
      0;

    let desc = toNumberOrNull(rawDesc);
    desc = Number.isFinite(desc) ? desc : 0;
    desc = Math.max(0, Math.min(100, desc));

    // ✅ Verifica existencia (opcional pero pro)
    const [existe] = await db.query(
      "SELECT id FROM productos WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existe.length) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    await db.query(
      `UPDATE productos SET
        codigo=?,
        nombre=?,
        lote=?,
        fecha_vencimiento=?,
        descripcion=?,
        categoria_id=?,
        ubicacion_id=?,
        impuesto_id=?,
        stock=?,
        stock_minimo=?,
        precio=?,
        precio_costo=?,
        descuento=?,
        imagen=?,
        contenido_medida=?,
        unidad_medida_id=?
       WHERE id=?`,
      [
        codigoFinal,
        nombreFinal,
        loteFinal,
        fechaVencFinal,
        toNullIfEmpty(descripcion),
        toNumberOrNull(categoria_id),
        toNumberOrNull(ubicacion_id),

        impuestoIdFinal, // ✅ NUEVO

        toNumberOrNull(stock) ?? 0,
        toNumberOrNull(stock_minimo) ?? 1,
        precioVenta,
        costo,
        desc,
        imagenFinal,
        contenidoFinal,
        unidadIdFinal,
        id,
      ]
    );

    if (usuario_id) {
      await db.query(
        "INSERT INTO bitacora (usuario_id, accion, descripcion) VALUES (?, ?, ?)",
        [
          usuario_id,
          "Editar producto",
          `Producto "${nombreFinal}" (ID: ${id}) editado.`,
        ]
      );
    }

    return res.json({ message: "Producto actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar producto:", error);
    return res.status(500).json({
      message: "Error al actualizar producto",
      code: error?.code,
      sqlMessage: error?.sqlMessage,
    });
  }
});


// ========================
// Eliminar producto (con bitácora)
// ========================
router.delete("/:id", async (req, res) => {
  try {
    const id = mustBePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const { usuario_id } = req.query;

    const [prods] = await db.query(
      "SELECT nombre, codigo FROM productos WHERE id=?",
      [id]
    );
    const producto = prods[0];

    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    await db.query("DELETE FROM productos WHERE id=?", [id]);

    if (usuario_id) {
      await db.query(
        "INSERT INTO bitacora (usuario_id, accion, descripcion) VALUES (?, ?, ?)",
        [
          usuario_id,
          "Eliminar producto",
          `Producto "${producto.nombre}" (ID: ${id}) eliminado.`,
        ]
      );
    }

    return res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    let msg = "Error al eliminar producto";
    if (error?.code === "ER_ROW_IS_REFERENCED_2") {
      msg =
        "No se pudo eliminar el producto porque tiene registros relacionados (ventas, movimientos, etc.)";
      return res.status(409).json({ message: msg });
    }
    console.error("❌ Error DELETE /productos:", error);
    return res.status(500).json({ message: msg });
  }
});

module.exports = router;
