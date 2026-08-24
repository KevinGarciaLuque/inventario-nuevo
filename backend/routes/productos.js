// backend/routes/productos.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// ✅ Middleware de rol (req.user viene del auth global)
const requireRoles =
  (...roles) =>
  (req, res, next) => {
    const rol = req.user?.rol;
    if (!rol || !roles.includes(rol)) {
      return res.status(403).json({ message: "Acceso denegado." });
    }
    next();
  };

// ✅ Valida el "producto padre" de una variante: debe existir, no puede ser
// el propio producto (al editar) y no puede él mismo ser ya una variante
// de otro producto (solo se permiten 2 niveles: principal + variantes).
const validarProductoPadre = async (padreId, idPropio) => {
  if (padreId == null) return { ok: true };
  if (idPropio != null && Number(padreId) === Number(idPropio)) {
    return {
      ok: false,
      message: "Un producto no puede ser variante de sí mismo.",
    };
  }
  const [rows] = await db.query(
    "SELECT id, producto_padre_id FROM productos WHERE id = ? LIMIT 1",
    [padreId],
  );
  if (!rows.length) {
    return { ok: false, message: "El producto principal seleccionado no existe." };
  }
  if (rows[0].producto_padre_id != null) {
    return {
      ok: false,
      message:
        "El producto seleccionado ya es una variante de otro producto; elige el producto principal en su lugar.",
    };
  }
  return { ok: true };
};

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
    [unidadId],
  );
  if (rows.length === 0) return false;
  return !!rows[0].activo;
};

// Valida impuesto: existe y está activo (si viene)
const validarImpuestoActivo = async (impuestoId) => {
  if (impuestoId === null || impuestoId === undefined) return true;
  const n = toNumberOrNull(impuestoId);
  if (n === null) return false;

  const [rows] = await db.query(
    "SELECT id, activo FROM impuestos WHERE id = ? LIMIT 1",
    [n],
  );
  if (!rows.length) return false;
  return Number(rows[0].activo) === 1;
};

// ========================
// ✅ IMPORTANTE: Orden de rutas
// Las rutas específicas deben ir ANTES de "/:id"
// ========================

/**
 * ✅ Autocomplete / búsqueda flexible (nombre o código parcial)
 * GET /api/productos/buscar?q=texto
 * Compatibilidad: también acepta ?codigo= (legacy)
 * Devuelve array (para dropdown)
 */
router.get("/buscar", async (req, res) => {
  try {
    const q = toNullIfEmpty(req.query.q);
    const codigoLegacy = toNullIfEmpty(req.query.codigo);
    const texto = q || codigoLegacy;

    if (!texto) {
      return res
        .status(400)
        .json({ message: "Parámetro q (o codigo) es requerido" });
    }

    const like = `%${texto}%`;

    const [rows] = await db.query(
      `
      SELECT 
        p.*,
        c.nombre AS categoria,
        u.nombre AS ubicacion,
        um.nombre AS unidad_nombre,
        um.abreviatura AS unidad_abreviatura,
        um.tipo AS unidad_tipo,
        i.id AS impuesto_id,
        i.nombre AS impuesto_nombre,
        i.porcentaje AS impuesto_porcentaje
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN ubicaciones u ON p.ubicacion_id = u.id
      LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
      LEFT JOIN impuestos i ON p.impuesto_id = i.id
      WHERE
        p.activo = 1
        AND (p.nombre LIKE ? OR p.codigo LIKE ?)
      ORDER BY
        CASE
          WHEN p.codigo = ? THEN 0
          WHEN p.nombre LIKE ? THEN 1
          ELSE 2
        END,
        p.nombre ASC
      LIMIT 12
      `,
      [like, like, texto, `${texto}%`],
    );

    return res.json(rows); // frontend espera array
  } catch (error) {
    console.error("❌ Error GET /productos/buscar:", error);
    return res.status(500).json({
      message: "Error al buscar productos",
      code: error?.code,
      sqlMessage: error?.sqlMessage,
    });
  }
});

/**
 * ✅ Búsqueda exacta por código (ideal para escáner)
 * GET /api/productos/by-codigo/:codigo
 * Devuelve 1 producto (objeto) o 404
 */
router.get("/by-codigo/:codigo", async (req, res) => {
  try {
    const codigo = toNullIfEmpty(req.params.codigo);

    if (!codigo) {
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
        um.tipo AS unidad_tipo,
        i.id AS impuesto_id,
        i.nombre AS impuesto_nombre,
        i.porcentaje AS impuesto_porcentaje
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN ubicaciones u ON p.ubicacion_id = u.id
      LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
      LEFT JOIN impuestos i ON p.impuesto_id = i.id
      WHERE p.codigo = ? AND p.activo = 1
      LIMIT 1
      `,
      [codigo],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("❌ Error GET /productos/by-codigo/:codigo:", error);
    return res.status(500).json({
      message: "Error al buscar producto por código",
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
        i.porcentaje AS impuesto_porcentaje,

        -- ✅ Producto principal (si este es una variante)
        pp.nombre AS producto_padre_nombre,
        pp.codigo AS producto_padre_codigo

      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN ubicaciones u ON p.ubicacion_id = u.id
      LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
      LEFT JOIN impuestos i ON p.impuesto_id = i.id
      LEFT JOIN productos pp ON p.producto_padre_id = pp.id
      WHERE p.activo = 1
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
// Obtener producto por ID + JOIN unidad
// (debe ir después de /buscar y /by-codigo)
// ========================
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
// Agregar producto (con bitácora) + medidas DB
// ========================
router.post("/", async (req, res) => {
  try {
    console.log("🔥 HIT POST /productos");
    console.log("🔥 BODY COMPLETO:", req.body);

    const {
      codigo,
      nombre,
      marca,
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
      precio_mayorista,
      precio_costo,

      imagen,

      // ✅ medidas
      contenido_medida,
      unidad_medida_id,
      dimensiones,

      // ✅ variantes (ej. mismo producto en otro color)
      producto_padre_id,
      variante_nombre,

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
    const precioMayorista = toNumberOrNull(precio_mayorista); // opcional, solo para el catálogo PDF
    const costo = toNumberOrNull(precio_costo); // puede ser NULL

    if (precioVenta === null || precioVenta < 0) {
      return res.status(400).json({ message: "Precio inválido" });
    }
    if (precioMayorista !== null && precioMayorista < 0) {
      return res.status(400).json({ message: "Precio de mayorista inválido" });
    }
    if (costo !== null && costo < 0) {
      return res.status(400).json({ message: "Precio de costo inválido" });
    }

    // ✅ Impuesto
    const impuestoIdFinal = toNumberOrNull(impuesto_id);
    if (impuestoIdFinal !== null) {
      const okImp = await validarImpuestoActivo(impuestoIdFinal);
      if (!okImp) {
        return res.status(400).json({
          message: "El impuesto seleccionado no existe o está desactivado.",
        });
      }
    }

    // ✅ Descuento
    const desc = leerDescuentoPct(req.body);

    // ✅ Variante (opcional)
    const padreIdFinal = mustBePositiveInt(producto_padre_id);
    const varianteNombreFinal = toNullIfEmpty(variante_nombre);
    if (padreIdFinal !== null) {
      const chequeo = await validarProductoPadre(padreIdFinal, null);
      if (!chequeo.ok) {
        return res.status(400).json({ message: chequeo.message });
      }
    }

    await db.query(
      `INSERT INTO productos (
        codigo, nombre, marca, lote, fecha_vencimiento,
        descripcion, categoria_id, ubicacion_id,
        impuesto_id,
        stock, stock_minimo,
        precio, precio_mayorista, precio_costo, descuento,
        imagen,
        contenido_medida, unidad_medida_id, dimensiones,
        producto_padre_id, variante_nombre
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigoFinal,
        nombreFinal,
        toNullIfEmpty(marca),
        loteFinal,
        fechaVencFinal,
        toNullIfEmpty(descripcion),
        toNumberOrNull(categoria_id),
        toNumberOrNull(ubicacion_id),

        impuestoIdFinal,

        toNumberOrNull(stock) ?? 0,
        toNumberOrNull(stock_minimo) ?? 1,

        precioVenta,
        precioMayorista,
        costo,
        desc,

        imagenFinal,
        contenidoFinal,
        unidadIdFinal,
        toNullIfEmpty(dimensiones),

        padreIdFinal,
        varianteNombreFinal,
      ],
    );

    if (usuario_id) {
      await db.query(
        "INSERT INTO bitacora (usuario_id, accion, descripcion) VALUES (?, ?, ?)",
        [
          usuario_id,
          "Agregar producto",
          `Producto "${nombreFinal}" (código: ${codigoFinal}) agregado.`,
        ],
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
      marca,
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
      precio_mayorista,
      precio_costo,

      imagen,

      // ✅ medidas
      contenido_medida,
      unidad_medida_id,
      dimensiones,

      // ✅ variantes (ej. mismo producto en otro color)
      producto_padre_id,
      variante_nombre,

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
    const precioMayorista = toNumberOrNull(precio_mayorista);
    const costo = toNumberOrNull(precio_costo);

    if (precioVenta === null || precioVenta < 0) {
      return res.status(400).json({ message: "Precio inválido" });
    }
    if (precioMayorista !== null && precioMayorista < 0) {
      return res.status(400).json({ message: "Precio de mayorista inválido" });
    }
    if (costo !== null && costo < 0) {
      return res.status(400).json({ message: "Precio de costo inválido" });
    }

    // ✅ Impuesto
    const impuestoIdFinal = toNumberOrNull(impuesto_id);
    if (impuestoIdFinal !== null) {
      const okImp = await validarImpuestoActivo(impuestoIdFinal);
      if (!okImp) {
        return res.status(400).json({
          message: "El impuesto seleccionado no existe o está desactivado.",
        });
      }
    }

    // ✅ Descuento
    const desc = leerDescuentoPct(req.body);

    // ✅ Verifica existencia
    const [existe] = await db.query(
      "SELECT id FROM productos WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existe.length) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // ✅ Variante (opcional)
    const padreIdFinal = mustBePositiveInt(producto_padre_id);
    const varianteNombreFinal = toNullIfEmpty(variante_nombre);
    if (padreIdFinal !== null) {
      const chequeo = await validarProductoPadre(padreIdFinal, id);
      if (!chequeo.ok) {
        return res.status(400).json({ message: chequeo.message });
      }
    }

    await db.query(
      `UPDATE productos SET
        codigo=?,
        nombre=?,
        marca=?,
        lote=?,
        fecha_vencimiento=?,
        descripcion=?,
        categoria_id=?,
        ubicacion_id=?,
        impuesto_id=?,
        stock=?,
        stock_minimo=?,
        precio=?,
        precio_mayorista=?,
        precio_costo=?,
        descuento=?,
        imagen=?,
        contenido_medida=?,
        unidad_medida_id=?,
        dimensiones=?,
        producto_padre_id=?,
        variante_nombre=?
       WHERE id=?`,
      [
        codigoFinal,
        nombreFinal,
        toNullIfEmpty(marca),
        loteFinal,
        fechaVencFinal,
        toNullIfEmpty(descripcion),
        toNumberOrNull(categoria_id),
        toNumberOrNull(ubicacion_id),

        impuestoIdFinal,

        toNumberOrNull(stock) ?? 0,
        toNumberOrNull(stock_minimo) ?? 1,
        precioVenta,
        precioMayorista,
        costo,
        desc,
        imagenFinal,
        contenidoFinal,
        unidadIdFinal,
        toNullIfEmpty(dimensiones),

        padreIdFinal,
        varianteNombreFinal,

        id,
      ],
    );

    if (usuario_id) {
      await db.query(
        "INSERT INTO bitacora (usuario_id, accion, descripcion) VALUES (?, ?, ?)",
        [
          usuario_id,
          "Editar producto",
          `Producto "${nombreFinal}" (ID: ${id}) editado.`,
        ],
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
// ✅ Solo admin puede eliminar productos.
// Si el producto ya tiene ventas/movimientos registrados, MySQL bloquea el
// DELETE por la relación de llaves foráneas (no se puede borrar sin romper
// el historial de facturas). En ese caso, en vez de fallar, se DESACTIVA
// el producto: deja de aparecer en inventario y en la búsqueda de ventas,
// pero las facturas ya emitidas lo siguen mostrando correctamente.
router.delete("/:id", requireRoles("admin"), async (req, res) => {
  try {
    const id = mustBePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const usuario_id = req.user?.id || req.query.usuario_id || null;

    const [prods] = await db.query(
      "SELECT nombre, codigo FROM productos WHERE id=?",
      [id],
    );
    const producto = prods[0];

    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    let desactivado = false;

    try {
      await db.query("DELETE FROM productos WHERE id=?", [id]);
    } catch (error) {
      if (error?.code === "ER_ROW_IS_REFERENCED_2") {
        await db.query("UPDATE productos SET activo = 0 WHERE id = ?", [id]);
        desactivado = true;
      } else {
        throw error;
      }
    }

    if (usuario_id) {
      await db.query(
        "INSERT INTO bitacora (usuario_id, accion, descripcion) VALUES (?, ?, ?)",
        [
          usuario_id,
          desactivado ? "Desactivar producto" : "Eliminar producto",
          desactivado
            ? `Producto "${producto.nombre}" (ID: ${id}) tiene ventas o movimientos registrados; se desactivó en lugar de eliminarse.`
            : `Producto "${producto.nombre}" (ID: ${id}) eliminado.`,
        ],
      );
    }

    return res.json({
      message: desactivado
        ? "Este producto ya tiene ventas registradas, así que se desactivó en lugar de eliminarse: ya no aparecerá en el inventario ni podrá venderse."
        : "Producto eliminado correctamente",
      desactivado,
    });
  } catch (error) {
    console.error("❌ Error DELETE /productos:", error);
    return res.status(500).json({ message: "Error al eliminar producto" });
  }
});

module.exports = router;
