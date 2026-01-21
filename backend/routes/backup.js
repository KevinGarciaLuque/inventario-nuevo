const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const mysql = require("mysql2/promise");
const archiver = require("archiver");

const auth = require("../middleware/auth");

function soloAdmin(req, res, next) {
  const rol = req.user?.rol || req.user?.role;
  if (rol && String(rol).toLowerCase() !== "admin") {
    return res.status(403).json({ message: "No autorizado" });
  }
  next();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function tableHasColumn(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [table, column],
  );
  return Number(rows?.[0]?.c || 0) > 0;
}

// ✅ Intenta registrar en bitácora sin romper si columnas cambian
async function registrarBitacora(conn, { userId, accion, detalle }) {
  try {
    const table = "bitacora";

    // si no existe tabla, no hacemos nada
    const [t] = await conn.query(
      `SELECT COUNT(*) AS c
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?`,
      [table],
    );
    if (!Number(t?.[0]?.c || 0)) return;

    // Detectar columnas comunes
    const cols = [];
    const vals = [];
    const params = [];

    const hasUsuarioId = await tableHasColumn(conn, table, "usuario_id");
    const hasUserId = await tableHasColumn(conn, table, "user_id");
    const hasAccion = await tableHasColumn(conn, table, "accion");
    const hasActividad = await tableHasColumn(conn, table, "actividad");
    const hasDetalle = await tableHasColumn(conn, table, "detalle");
    const hasDescripcion = await tableHasColumn(conn, table, "descripcion");
    const hasFecha = await tableHasColumn(conn, table, "fecha");
    const hasCreatedAt = await tableHasColumn(conn, table, "created_at");

    if (hasUsuarioId) {
      cols.push("usuario_id");
      vals.push("?");
      params.push(userId || null);
    } else if (hasUserId) {
      cols.push("user_id");
      vals.push("?");
      params.push(userId || null);
    }

    if (hasAccion) {
      cols.push("accion");
      vals.push("?");
      params.push(accion);
    } else if (hasActividad) {
      cols.push("actividad");
      vals.push("?");
      params.push(accion);
    }

    if (hasDetalle) {
      cols.push("detalle");
      vals.push("?");
      params.push(detalle);
    } else if (hasDescripcion) {
      cols.push("descripcion");
      vals.push("?");
      params.push(detalle);
    }

    if (hasFecha) {
      cols.push("fecha");
      vals.push("NOW()");
    } else if (hasCreatedAt) {
      cols.push("created_at");
      vals.push("NOW()");
    }

    // Si no hay columnas suficientes, no insertamos
    if (cols.length < 1) return;

    const sql = `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(",")})
                 VALUES (${vals.join(",")})`;

    await conn.query(sql, params);
  } catch (e) {
    // Silencioso para no romper el backup
    console.warn("⚠️ No se pudo registrar bitácora:", e?.message || e);
  }
}

function parseBool(v, defaultValue = false) {
  if (v === undefined || v === null || v === "") return defaultValue;
  const s = String(v).toLowerCase().trim();
  return s === "1" || s === "true" || s === "si" || s === "yes" || s === "on";
}

async function writeSqlBackup({
  conn,
  DB_NAME,
  filePath,
  modo,
  desde,
  hasta,
  estructuraOnly,
  include, // { maestras, ventas, facturas, movimientos, bitacora, caja }
}) {
  const out = fs.createWriteStream(filePath, { encoding: "utf8" });

  const write = (txt) =>
    new Promise((resolve, reject) => {
      out.write(txt, (err) => (err ? reject(err) : resolve()));
    });

  // ✅ Tablas maestras
  const TABLAS_MAESTRAS = [
    "categorias",
    "ubicaciones",
    "productos",
    "usuarios",
    "clientes",
    "impuestos",
    "unidades",
    "cai",
    "promociones",
    "promocion_productos",
  ];

  // ✅ Filtrables por fecha (ventas confirmado)
  const TABLAS_FILTRABLES = {
    ventas: "fecha",
    movimientos: "fecha",
    bitacora: "fecha",
    cierres_caja: "fecha_apertura",
  };

  try {
    await write(`-- Backup PRO generado por el sistema\n`);
    await write(`-- DB: ${DB_NAME}\n`);
    await write(`-- Fecha: ${new Date().toISOString()}\n`);
    await write(`-- Modo: ${modo}\n`);
    await write(`-- Solo estructura: ${estructuraOnly ? "SI" : "NO"}\n`);
    if (modo === "filtrado") {
      await write(`-- Rango: ${desde} a ${hasta}\n`);
    }
    await write(
      `-- Incluye: maestras=${include.maestras}, ventas=${include.ventas}, facturas=${include.facturas}, movimientos=${include.movimientos}, bitacora=${include.bitacora}, caja=${include.caja}\n\n`,
    );

    await write(`SET FOREIGN_KEY_CHECKS=0;\n`);
    await write(`SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n\n`);

    const [tables] = await conn.query("SHOW TABLES");
    const tableNames = tables.map((r) => Object.values(r)[0]);

    // ids para detalle_ventas
    const ventaIds = [];

    // Ayuda: decide si se incluyen datos de una tabla según checks
    const shouldIncludeDataForTable = (table) => {
      if (estructuraOnly) return false;

      // detalle_ventas se maneja por dependencia si ventas está incluido
      if (table === "detalle_ventas") return false;

      // maestras
      if (TABLAS_MAESTRAS.includes(table)) return include.maestras;

      // ventas/facturación
      if (table === "ventas") return include.ventas;
      if (table === "facturas") return include.facturas || include.ventas; // facturas si marcas facturas o si marcas ventas
      if (table === "detalle_ventas") return include.ventas;

      // movimientos
      if (table === "movimientos") return include.movimientos;

      // bitácora
      if (table === "bitacora") return include.bitacora;

      // caja
      if (table === "cierres_caja") return include.caja;

      // Por defecto: no exportar datos de otras tablas en modo filtrado
      return modo === "completo" && include.maestras; // en completo, si quiere “todo”, usa include.maestras como base (puedes ampliarlo si quieres)
    };

    // 1) Estructura + datos según modo/módulos
    for (const table of tableNames) {
      // ESTRUCTURA SIEMPRE
      const [createRows] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
      const createSql = createRows?.[0]?.["Create Table"];
      if (createSql) {
        await write(`\n-- ----------------------------\n`);
        await write(`-- Table: ${table}\n`);
        await write(`-- ----------------------------\n`);
        await write(`DROP TABLE IF EXISTS \`${table}\`;\n`);
        await write(`${createSql};\n\n`);
      }

      // Si no se incluyen datos de esta tabla, seguimos
      if (!shouldIncludeDataForTable(table)) continue;

      // WHERE / params
      let where = "";
      let params = [];

      if (modo === "filtrado") {
        // ventas/movimientos/bitacora/cierres_caja
        if (TABLAS_FILTRABLES[table]) {
          const campoFecha = TABLAS_FILTRABLES[table];
          where = `WHERE \`${campoFecha}\` BETWEEN ? AND ?`;
          params = [`${desde} 00:00:00`, `${hasta} 23:59:59`];
        }

        // ✅ facturas: confirmado por tu DESCRIBE => fecha_emision
        if (table === "facturas") {
          const hasFechaEmision = await tableHasColumn(
            conn,
            "facturas",
            "fecha_emision",
          );

          if (hasFechaEmision) {
            where = `WHERE \`fecha_emision\` BETWEEN ? AND ?`;
            params = [`${desde} 00:00:00`, `${hasta} 23:59:59`];
          } else {
            // fallback si cambias a futuro
            const hasFecha = await tableHasColumn(conn, "facturas", "fecha");
            if (hasFecha) {
              where = `WHERE \`fecha\` BETWEEN ? AND ?`;
              params = [`${desde} 00:00:00`, `${hasta} 23:59:59`];
            } else {
              where = "WHERE 1=0";
              params = [];
            }
          }
        }
      }

      // Export por batches
      const BATCH = 800;
      let offset = 0;

      while (true) {
        const [rows] = await conn.query(
          `SELECT * FROM \`${table}\` ${where} LIMIT ${BATCH} OFFSET ${offset}`,
          params,
        );

        if (!rows || rows.length === 0) break;

        // Guardar ids de ventas si corresponde
        if (modo === "filtrado" && table === "ventas") {
          for (const r of rows) if (r.id) ventaIds.push(Number(r.id));
        }

        for (const row of rows) {
          const cols = Object.keys(row)
            .map((c) => `\`${c}\``)
            .join(",");

          const vals = Object.values(row)
            .map((v) => {
              if (Buffer.isBuffer(v)) return `0x${v.toString("hex")}`;
              return conn.escape(v);
            })
            .join(",");

          await write(`INSERT INTO \`${table}\` (${cols}) VALUES (${vals});\n`);
        }

        offset += BATCH;
      }

      await write("\n");
    }

    // 2) Dependencia: detalle_ventas por venta_id (solo si incluye ventas y no es solo estructura)
    if (
      !estructuraOnly &&
      include.ventas &&
      modo === "filtrado" &&
      tableNames.includes("detalle_ventas")
    ) {
      const ids = Array.from(new Set(ventaIds)).filter(Boolean);

      if (ids.length) {
        await write(`\n-- ----------------------------\n`);
        await write(`-- Tabla dependiente: detalle_ventas (por venta_id)\n`);
        await write(`-- ----------------------------\n`);

        const chunkSize = 800;
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => "?").join(",");

          const [rows] = await conn.query(
            `SELECT * FROM \`detalle_ventas\` WHERE \`venta_id\` IN (${placeholders})`,
            chunk,
          );

          for (const row of rows) {
            const cols = Object.keys(row)
              .map((c) => `\`${c}\``)
              .join(",");

            const vals = Object.values(row)
              .map((v) => {
                if (Buffer.isBuffer(v)) return `0x${v.toString("hex")}`;
                return conn.escape(v);
              })
              .join(",");

            await write(
              `INSERT INTO \`detalle_ventas\` (${cols}) VALUES (${vals});\n`,
            );
          }
        }

        await write("\n");
      }
    }

    await write(`\nSET FOREIGN_KEY_CHECKS=1;\n`);
  } finally {
    out.end();
  }
}

router.get("/db", auth, soloAdmin, async (req, res) => {
  let conn;
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  const tmpDir = path.join(process.cwd(), "backups_tmp");
  ensureDir(tmpDir);

  const safeUnlink = (p) => {
    try {
      if (p && fs.existsSync(p)) fs.unlinkSync(p);
    } catch {}
  };

  try {
    const modo = String(req.query.modo || "completo").toLowerCase();
    const desde = req.query.desde; // YYYY-MM-DD
    const hasta = req.query.hasta; // YYYY-MM-DD

    const estructuraOnly = parseBool(req.query.estructura, false);

    // ✅ módulos (checkboxes)
    const include = {
      maestras: parseBool(req.query.maestras, true),
      ventas: parseBool(req.query.ventas, true),
      facturas: parseBool(req.query.facturas, true),
      movimientos: parseBool(req.query.movimientos, true),
      bitacora: parseBool(req.query.bitacora, false),
      caja: parseBool(req.query.caja, true),
    };

    if (modo !== "completo" && modo !== "filtrado") {
      return res.status(400).json({
        message: "Modo inválido. Usa modo=completo o modo=filtrado",
      });
    }

    if (modo === "filtrado") {
      if (!desde || !hasta) {
        return res.status(400).json({
          message:
            "Para modo=filtrado debes enviar desde=YYYY-MM-DD y hasta=YYYY-MM-DD",
        });
      }
      if (desde > hasta) {
        return res.status(400).json({
          message: "La fecha 'desde' no puede ser mayor que 'hasta'.",
        });
      }
    }

    conn = await mysql.createConnection({
      host: DB_HOST,
      port: Number(DB_PORT || 3306),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName =
      modo === "filtrado"
        ? `backup_${DB_NAME}_${desde}_a_${hasta}_${stamp}`
        : `backup_${DB_NAME}_completo_${stamp}`;

    const sqlPath = path.join(tmpDir, `${baseName}.sql`);
    const zipPath = path.join(tmpDir, `${baseName}.zip`);

    await writeSqlBackup({
      conn,
      DB_NAME,
      filePath: sqlPath,
      modo,
      desde,
      hasta,
      estructuraOnly,
      include,
    });

    // ✅ Registrar en bitácora (si el módulo bitácora existe)
    const userId = req.user?.id || null;
    const detalle = JSON.stringify(
      {
        modo,
        desde: modo === "filtrado" ? desde : null,
        hasta: modo === "filtrado" ? hasta : null,
        estructuraOnly,
        include,
      },
      null,
      0,
    );

    await registrarBitacora(conn, {
      userId,
      accion: "BACKUP_DB_DESCARGADO",
      detalle,
    });

    // ✅ Crear ZIP
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      throw err;
    });

    output.on("close", () => {
      res.download(zipPath, `${baseName}.zip`, () => {
        safeUnlink(sqlPath);
        safeUnlink(zipPath);
      });
    });

    archive.pipe(output);
    archive.file(sqlPath, { name: `${baseName}.sql` });
    await archive.finalize();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "No se pudo generar el respaldo.",
      detalle: error?.message || String(error),
    });
  } finally {
    if (conn) await conn.end();
  }
});

module.exports = router;
