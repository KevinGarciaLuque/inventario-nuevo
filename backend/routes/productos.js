// backend/routes/productos.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// ========================
// Helpers
// ========================
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
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const mustBePositiveInt = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
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

// ========================
// Obtener productos (filtro por nombre opcional) + JOIN unidad
// ========================
router.get("/", async (req, res) => {
  try {
    const { nombre } = req.query;

    let query = `
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
      WHERE 1
    `;
    const params = [];

    if (nombre) {
      query += " AND p.nombre LIKE ?";
      params.push(`%${String(nombre).trim()}%`);
    }

    query += " ORDER BY p.id DESC";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los productos", error });
  }
});

// ========================
// Buscar producto por código exacto (para escáner) + JOIN unidad
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

    res.json(rows); // tu frontend espera array
  } catch (error) {
    res.status(500).json({ message: "Error al buscar producto", error });
  }
});

// ========================
// Agregar producto (con bitácora) + medidas DB
// ========================
router.post("/", async (req, res) => {
  try {
    const {
      codigo,
      nombre,
      lote,
      fecha_vencimiento,
      descripcion,
      categoria_id,
      ubicacion_id,
      stock,
      stock_minimo,
      precio,
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

    // Medidas
    const contenidoFinal = toNumberOrNull(contenido_medida); // DECIMAL
    const unidadIdFinal = mustBePositiveInt(unidad_medida_id); // FK INT

    // ✅ consistencia: si hay una, debe haber la otra
    const tieneUnidad = unidadIdFinal !== null;
    const tieneContenido = contenidoFinal !== null;

    if ((tieneUnidad && !tieneContenido) || (!tieneUnidad && tieneContenido)) {
      return res.status(400).json({
        message:
          "Si usas medidas, debes enviar contenido_medida y unidad_medida_id.",
      });
    }

    // ✅ validar unidad activa
    if (unidadIdFinal) {
      const okUnidad = await validarUnidadActiva(unidadIdFinal);
      if (!okUnidad) {
        return res.status(400).json({
          message:
            "La unidad de medida seleccionada no existe o está desactivada.",
        });
      }
    }

    await db.query(
      `INSERT INTO productos (
        codigo, nombre, lote, fecha_vencimiento,
        descripcion, categoria_id, ubicacion_id,
        stock, stock_minimo, precio, imagen,
        contenido_medida, unidad_medida_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigoFinal,
        nombreFinal,
        loteFinal,
        fechaVencFinal,
        toNullIfEmpty(descripcion),
        toNumberOrNull(categoria_id),
        toNumberOrNull(ubicacion_id),
        toNumberOrNull(stock) ?? 0,
        toNumberOrNull(stock_minimo) ?? 1,
        toNumberOrNull(precio) ?? 0,
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

    res.json({ message: "Producto agregado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al agregar producto", error });
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
      stock,
      stock_minimo,
      precio,
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

    const contenidoFinal = toNumberOrNull(contenido_medida);
    const unidadIdFinal = mustBePositiveInt(unidad_medida_id);

    // ✅ consistencia
    const tieneUnidad = unidadIdFinal !== null;
    const tieneContenido = contenidoFinal !== null;

    if ((tieneUnidad && !tieneContenido) || (!tieneUnidad && tieneContenido)) {
      return res.status(400).json({
        message:
          "Si usas medidas, debes enviar contenido_medida y unidad_medida_id.",
      });
    }

    // ✅ validar unidad activa
    if (unidadIdFinal) {
      const okUnidad = await validarUnidadActiva(unidadIdFinal);
      if (!okUnidad) {
        return res.status(400).json({
          message:
            "La unidad de medida seleccionada no existe o está desactivada.",
        });
      }
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
        stock=?,
        stock_minimo=?,
        precio=?,
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
        toNumberOrNull(stock) ?? 0,
        toNumberOrNull(stock_minimo) ?? 1,
        toNumberOrNull(precio) ?? 0,
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

    res.json({ message: "Producto actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar producto", error });
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

    res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    let msg = "Error al eliminar producto";
    if (error?.code === "ER_ROW_IS_REFERENCED_2") {
      msg =
        "No se pudo eliminar el producto porque tiene registros relacionados (ventas, movimientos, etc.)";
      return res.status(409).json({ message: msg });
    }
    res.status(500).json({ message: msg, error });
  }
});

module.exports = router;
