// backend/routes/recibo_config.js
// Configuración del encabezado, logo y textos del Recibo / Factura.
// Lectura: cualquier usuario autenticado (la usa Registrar Venta / Facturas para el PDF).
// Escritura: SOLO superadmin.
const express = require("express");
const router = express.Router();
const db = require("../db");

const CAMPOS = [
  "negocio_nombre",
  "sucursal",
  "rtn",
  "telefono",
  "recibo_titulo",
  "recibo_leyenda",
  "recibo_pie",
  "recibo_nota1",
  "recibo_nota2",
  "recibo_color",
  "factura_titulo",
  "factura_pie",
  "factura_nota1",
  "factura_nota2",
  "factura_color",
];

const CAMPOS_COLOR = ["recibo_color", "factura_color"];
const HEX_RE = /^#([0-9a-fA-F]{6})$/;

const DEFAULTS = {
  logo_base64: "",
  negocio_nombre: "Sistema Inventario",
  sucursal: "Sucursal Tegucigalpa",
  rtn: "0801-1900-10000",
  telefono: "(504) 9800-0000",
  recibo_titulo: "RECIBO DE VENTA",
  recibo_leyenda: "Documento no fiscal - no genera crédito fiscal",
  recibo_pie: "*** GRACIAS POR SU COMPRA ***",
  recibo_nota1: "Este documento NO es una factura.",
  recibo_nota2: "Si necesita factura, solicítela.",
  recibo_color: "#000000",
  factura_titulo: "FACTURA",
  factura_pie: "*** GRACIAS POR SU COMPRA ***",
  factura_nota1: "La factura es beneficio de todos.",
  factura_nota2: "EXÍJALA",
  factura_color: "#000000",
};

const s = (v) => String(v ?? "").trim();

let tablaLista = false;
async function ensureTabla() {
  if (tablaLista) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS recibo_config (
      id             TINYINT      NOT NULL PRIMARY KEY DEFAULT 1,
      logo_base64    MEDIUMTEXT   NULL,
      negocio_nombre VARCHAR(120) NOT NULL DEFAULT 'Sistema Inventario',
      sucursal       VARCHAR(120) NOT NULL DEFAULT 'Sucursal Tegucigalpa',
      rtn            VARCHAR(40)  NOT NULL DEFAULT '0801-1900-10000',
      telefono       VARCHAR(40)  NOT NULL DEFAULT '(504) 9800-0000',
      recibo_titulo  VARCHAR(80)  NOT NULL DEFAULT 'RECIBO DE VENTA',
      recibo_leyenda VARCHAR(160) NOT NULL DEFAULT 'Documento no fiscal - no genera crédito fiscal',
      recibo_pie     VARCHAR(120) NOT NULL DEFAULT '*** GRACIAS POR SU COMPRA ***',
      recibo_nota1   VARCHAR(160) NOT NULL DEFAULT 'Este documento NO es una factura.',
      recibo_nota2   VARCHAR(160) NOT NULL DEFAULT 'Si necesita factura, solicítela.',
      recibo_color   CHAR(7)      NOT NULL DEFAULT '#000000',
      factura_titulo VARCHAR(80)  NOT NULL DEFAULT 'FACTURA',
      factura_pie    VARCHAR(120) NOT NULL DEFAULT '*** GRACIAS POR SU COMPRA ***',
      factura_nota1  VARCHAR(160) NOT NULL DEFAULT 'La factura es beneficio de todos.',
      factura_nota2  VARCHAR(160) NOT NULL DEFAULT 'EXÍJALA',
      factura_color  CHAR(7)      NOT NULL DEFAULT '#000000',
      actualizado_en TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.query("INSERT INTO recibo_config (id) VALUES (1) ON DUPLICATE KEY UPDATE id = id");
  // Columnas agregadas después de la creación inicial (bases ya existentes)
  for (const col of ["recibo_color", "factura_color"]) {
    try {
      await db.query(
        `ALTER TABLE recibo_config ADD COLUMN ${col} CHAR(7) NOT NULL DEFAULT '#000000'`,
      );
    } catch (e) {
      if (e.code !== "ER_DUP_FIELDNAME") throw e;
    }
  }
  tablaLista = true;
}

const soloSuperadmin = (req, res, next) => {
  if (req.user?.rol !== "superadmin") {
    return res
      .status(403)
      .json({ message: "Solo el superadministrador puede modificar esta configuración" });
  }
  next();
};

// GET /api/recibo-config  -> configuración completa (con defaults)
router.get("/", async (req, res) => {
  try {
    await ensureTabla();
    const [[row]] = await db.query("SELECT * FROM recibo_config WHERE id = 1 LIMIT 1");
    res.json({ ...DEFAULTS, ...(row || {}), logo_base64: row?.logo_base64 || "" });
  } catch (error) {
    console.error("❌ Error GET /recibo-config:", error);
    res.status(500).json({ message: "Error al obtener la configuración del recibo" });
  }
});

// PUT /api/recibo-config  -> actualiza textos + encabezado (+ logo si viene)
router.put("/", soloSuperadmin, async (req, res) => {
  try {
    await ensureTabla();

    const valores = CAMPOS.map((c) => {
      const v = s(req.body[c]);
      if (CAMPOS_COLOR.includes(c)) {
        return HEX_RE.test(v) ? v.toLowerCase() : DEFAULTS[c];
      }
      return v || DEFAULTS[c];
    });

    // logo: solo se toca si el campo viene en el body
    const tocaLogo = Object.prototype.hasOwnProperty.call(req.body, "logo_base64");
    let logo = null;
    if (tocaLogo) {
      logo = s(req.body.logo_base64);
      if (logo && !/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(logo)) {
        return res.status(400).json({ message: "El logo debe ser una imagen en base64 (dataURL)" });
      }
      // 7 MB de imagen ≈ ~9.4 MB de texto base64 (+ margen)
      if (logo.length > 10_000_000) {
        return res.status(413).json({ message: "El logo es demasiado grande (máx. 7 MB)" });
      }
    }

    const setCampos = CAMPOS.map((c) => `${c} = ?`).join(", ");
    const params = [...valores];
    let sql = `UPDATE recibo_config SET ${setCampos}`;
    if (tocaLogo) {
      sql += ", logo_base64 = ?";
      params.push(logo || null);
    }
    sql += " WHERE id = 1";

    await db.query(sql, params);
    res.json({ message: "Configuración del recibo actualizada" });
  } catch (error) {
    console.error("❌ Error PUT /recibo-config:", error);
    res.status(500).json({ message: "Error al actualizar la configuración del recibo" });
  }
});

// DELETE /api/recibo-config/logo  -> quita el logo
router.delete("/logo", soloSuperadmin, async (req, res) => {
  try {
    await ensureTabla();
    await db.query("UPDATE recibo_config SET logo_base64 = NULL WHERE id = 1");
    res.json({ message: "Logo eliminado" });
  } catch (error) {
    console.error("❌ Error DELETE /recibo-config/logo:", error);
    res.status(500).json({ message: "Error al eliminar el logo" });
  }
});

module.exports = router;
