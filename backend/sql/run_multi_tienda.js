// Ejecuta la migración multi-tienda contra la BD del .env del backend.
//   cd backend && node sql/run_multi_tienda.js
// Es tolerante a "ya existe" -> se puede correr más de una vez sin romper.
require("dotenv").config();
const db = require("../db");

const stmts = [
  `CREATE TABLE IF NOT EXISTS tiendas (
     id INT AUTO_INCREMENT PRIMARY KEY,
     nombre VARCHAR(120) NOT NULL,
     direccion VARCHAR(200) DEFAULT NULL,
     rtn VARCHAR(40) DEFAULT NULL,
     telefono VARCHAR(40) DEFAULT NULL,
     activo TINYINT(1) NOT NULL DEFAULT 1,
     atiende_web TINYINT(1) NOT NULL DEFAULT 0,
     creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `ALTER TABLE usuarios ADD COLUMN tienda_id INT DEFAULT NULL`,
  `ALTER TABLE cai      ADD COLUMN tienda_id INT DEFAULT NULL`,
  `ALTER TABLE ventas   ADD COLUMN tienda_id INT DEFAULT NULL`,
  `ALTER TABLE facturas ADD COLUMN tienda_id INT DEFAULT NULL`,
  `CREATE TABLE IF NOT EXISTS tienda_correlativo (
     tienda_id INT NOT NULL PRIMARY KEY,
     prefijo VARCHAR(10) NOT NULL DEFAULT 'REC',
     actual INT NOT NULL DEFAULT 0,
     CONSTRAINT fk_tienda_correlativo_tienda FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_tienda FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE SET NULL`,
  `ALTER TABLE cai      ADD CONSTRAINT fk_cai_tienda      FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE SET NULL`,
  `ALTER TABLE ventas   ADD CONSTRAINT fk_ventas_tienda   FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE SET NULL`,
  `ALTER TABLE facturas ADD CONSTRAINT fk_facturas_tienda FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE SET NULL`,
];

const IGNORAR = new Set([
  "ER_DUP_FIELDNAME",
  "ER_DUP_KEYNAME",
  "ER_TABLE_EXISTS_ERROR",
  "ER_FK_DUP_NAME",
]);

(async () => {
  for (const sql of stmts) {
    const label = sql.trim().split("\n")[0].slice(0, 60);
    try {
      await db.query(sql);
      console.log("OK    ", label);
    } catch (e) {
      if (IGNORAR.has(e.code) || e.errno === 1826) {
        console.log("existe", label, `(${e.code})`);
      } else {
        console.error("FALLO ", label, "\n      ", e.code, e.sqlMessage);
        process.exit(1);
      }
    }
  }
  console.log("\n✅ Migración multi-tienda aplicada.");
  process.exit(0);
})();
