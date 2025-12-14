const express = require("express");
const router = express.Router();
const db = require("../db");

// ========================
// Obtener productos (filtro por nombre opcional)
// ========================
router.get("/", async (req, res) => {
  try {
    const { nombre } = req.query;

    let query = `
      SELECT p.*, c.nombre AS categoria, u.nombre AS ubicacion
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN ubicaciones u ON p.ubicacion_id = u.id
      WHERE 1
    `;
    const params = [];

    if (nombre) {
      query += " AND p.nombre LIKE ?";
      params.push(`%${nombre}%`);
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los productos", error });
  }
});

// ========================
// Buscar producto por código exacto (para escáner)
// ========================
router.get("/buscar", async (req, res) => {
  try {
    const { codigo } = req.query;
    if (!codigo) {
      return res.status(400).json({ message: "Código es requerido" });
    }

    const [rows] = await db.query(
      `SELECT p.*, c.nombre AS categoria, u.nombre AS ubicacion
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       LEFT JOIN ubicaciones u ON p.ubicacion_id = u.id
       WHERE p.codigo = ?`,
      [codigo]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al buscar producto", error });
  }
});

// ========================
// Agregar producto (con bitácora)
// ========================
router.post("/", async (req, res) => {
  try {
    const {
      codigo,
      nombre,
      descripcion,
      categoria_id,
      ubicacion_id,
      stock,
      stock_minimo,
      precio,
      imagen,
      usuario_id,
    } = req.body;

    await db.query(
      `INSERT INTO productos (codigo, nombre, descripcion, categoria_id, ubicacion_id, stock, stock_minimo, precio, imagen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        nombre,
        descripcion,
        categoria_id,
        ubicacion_id,
        stock,
        stock_minimo,
        precio,
        imagen || null, // ✅ Corrige cadenas vacías o undefined
      ]
    );

    if (usuario_id) {
      await db.query(
        "INSERT INTO bitacora (usuario_id, accion, descripcion) VALUES (?, ?, ?)",
        [
          usuario_id,
          "Agregar producto",
          `Producto "${nombre}" (código: ${codigo}) agregado.`,
        ]
      );
    }

    res.json({ message: "Producto agregado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al agregar producto", error });
  }
});

// ========================
// Editar producto (con bitácora)
// ========================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo,
      nombre,
      descripcion,
      categoria_id,
      ubicacion_id,
      stock,
      stock_minimo,
      precio,
      imagen,
      usuario_id,
    } = req.body;

    await db.query(
      `UPDATE productos SET codigo=?, nombre=?, descripcion=?, categoria_id=?, ubicacion_id=?, stock=?, stock_minimo=?, precio=?, imagen=?
       WHERE id=?`,
      [
        codigo,
        nombre,
        descripcion,
        categoria_id,
        ubicacion_id,
        stock,
        stock_minimo,
        precio,
        imagen,
        id,
      ]
    );

    if (usuario_id) {
      await db.query(
        "INSERT INTO bitacora (usuario_id, accion, descripcion) VALUES (?, ?, ?)",
        [
          usuario_id,
          "Editar producto",
          `Producto "${nombre}" (ID: ${id}) editado.`,
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
  const { id } = req.params;
  const { usuario_id } = req.query;
  console.log(
    "API: Intentando eliminar producto",
    id,
    "por usuario:",
    usuario_id
  );

  try {
    // Busca el producto antes de eliminar
    const [prods] = await db.query(
      "SELECT nombre, codigo FROM productos WHERE id=?",
      [id]
    );
    const producto = prods[0];

    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Intenta eliminar el producto
    const [deleteResult] = await db.query("DELETE FROM productos WHERE id=?", [
      id,
    ]);

    if (deleteResult.affectedRows === 0) {
      // No se eliminó ningún producto (posible relación foránea)
      return res.status(409).json({
        message:
          "No se pudo eliminar el producto. Es posible que esté relacionado con ventas, movimientos u otra tabla.",
      });
    }

    // Registra en la bitácora
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
    console.error("Error al eliminar producto:", error);
    let msg = "Error al eliminar producto";
    if (error && error.code === "ER_ROW_IS_REFERENCED_2") {
      msg =
        "No se pudo eliminar el producto porque tiene registros relacionados (ventas, movimientos, etc.)";
    }
    res.status(500).json({ message: msg, error });
  }
});

module.exports = router;
