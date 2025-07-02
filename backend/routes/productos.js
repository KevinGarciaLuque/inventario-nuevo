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
        imagen,
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
  try {
    const { id } = req.params;
    const { usuario_id } = req.query;

    let producto = null;
    try {
      const [prods] = await db.query(
        "SELECT nombre, codigo FROM productos WHERE id=?",
        [id]
      );
      producto = prods[0];
    } catch {}

    await db.query("DELETE FROM productos WHERE id=?", [id]);

    if (usuario_id) {
      await db.query(
        "INSERT INTO bitácora (usuario_id, accion, descripcion) VALUES (?, ?, ?)",
        [
          usuario_id,
          "Eliminar producto",
          `Producto "${producto?.nombre || ""}" (ID: ${id}) eliminado.`,
        ]
      );
    }

    res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar producto", error });
  }
});

module.exports = router;
