// backend/routes/clientes.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// Helper: normaliza strings
const s = (v) => String(v ?? "").trim();

// 🔍 Buscar clientes por nombre / RTN / teléfono
router.get("/buscar", async (req, res) => {
  const termino = s(req.query.q);
  try {
    const like = `%${termino}%`;

    const [rows] = await db.query(
      `
      SELECT id, nombre, rtn, telefono, direccion, activo
      FROM clientes
      WHERE nombre LIKE ? OR rtn LIKE ? OR telefono LIKE ?
      ORDER BY nombre
      `,
      [like, like, like],
    );

    return res.json(rows);
  } catch (err) {
    console.error("❌ /clientes/buscar:", err);
    return res.status(500).json({ message: "Error al buscar clientes" });
  }
});

// 📋 Listar todos los clientes
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT id, nombre, rtn, telefono, direccion, activo
      FROM clientes
      ORDER BY nombre
      `,
    );
    return res.json(rows);
  } catch (err) {
    console.error("❌ GET /clientes:", err);
    return res.status(500).json({ message: "Error al obtener los clientes" });
  }
});

// ➕ Crear cliente nuevo
router.post("/", async (req, res) => {
  const nombre = s(req.body.nombre);
  const rtn = s(req.body.rtn);
  const telefono = s(req.body.telefono);
  const direccion = s(req.body.direccion);

  if (!nombre) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }

  try {
    // Si el RTN viene vacío, lo guardamos como NULL (más limpio)
    const rtnValue = rtn ? rtn : null;

    // Validar RTN duplicado solo si viene RTN
    if (rtnValue) {
      const [existe] = await db.query(
        "SELECT id FROM clientes WHERE rtn = ? LIMIT 1",
        [rtnValue],
      );
      if (existe.length > 0) {
        return res
          .status(400)
          .json({ message: "Ya existe un cliente con ese RTN" });
      }
    }

    const [result] = await db.query(
      `
      INSERT INTO clientes (nombre, rtn, telefono, direccion, activo)
      VALUES (?, ?, ?, ?, 1)
      `,
      [nombre, rtnValue, telefono || null, direccion || null],
    );

    return res.json({
      id: result.insertId,
      nombre,
      rtn: rtnValue,
      telefono: telefono || "",
      direccion: direccion || "",
      activo: 1,
    });
  } catch (err) {
    console.error("❌ POST /clientes:", err);
    return res.status(500).json({ message: "Error al crear cliente" });
  }
});

// ✏️ Editar cliente
router.put("/:id", async (req, res) => {
  const id = req.params.id;

  const nombre = s(req.body.nombre);
  const rtn = s(req.body.rtn);
  const telefono = s(req.body.telefono);
  const direccion = s(req.body.direccion);

  if (!nombre) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }

  try {
    const rtnValue = rtn ? rtn : null;

    // Validar RTN duplicado (solo si viene RTN)
    if (rtnValue) {
      const [existe] = await db.query(
        "SELECT id FROM clientes WHERE rtn = ? AND id <> ? LIMIT 1",
        [rtnValue, id],
      );
      if (existe.length > 0) {
        return res
          .status(400)
          .json({ message: "Ya existe otro cliente con ese RTN" });
      }
    }

    await db.query(
      `
      UPDATE clientes
      SET nombre = ?, rtn = ?, telefono = ?, direccion = ?
      WHERE id = ?
      `,
      [nombre, rtnValue, telefono || null, direccion || null, id],
    );

    return res.json({ message: "Cliente actualizado correctamente" });
  } catch (err) {
    console.error("❌ PUT /clientes/:id:", err);
    return res.status(500).json({ message: "Error al actualizar cliente" });
  }
});

// 🔄 Activar / Desactivar cliente
router.patch("/toggle/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const [rows] = await db.query(
      "SELECT activo FROM clientes WHERE id = ? LIMIT 1",
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const nuevoEstado = rows[0].activo ? 0 : 1;

    await db.query("UPDATE clientes SET activo = ? WHERE id = ?", [
      nuevoEstado,
      id,
    ]);

    return res.json({
      message: `Cliente ${nuevoEstado ? "activado" : "desactivado"}`,
      activo: nuevoEstado,
    });
  } catch (err) {
    console.error("❌ PATCH /clientes/toggle/:id:", err);
    return res
      .status(500)
      .json({ message: "Error al actualizar estado del cliente" });
  }
});

// ❌ Eliminar cliente (si deseas eliminación real)
router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await db.query("DELETE FROM clientes WHERE id = ?", [id]);
    return res.json({ message: "Cliente eliminado correctamente" });
  } catch (err) {
    console.error("❌ DELETE /clientes/:id:", err);
    return res.status(500).json({ message: "Error al eliminar cliente" });
  }
});

module.exports = router;
