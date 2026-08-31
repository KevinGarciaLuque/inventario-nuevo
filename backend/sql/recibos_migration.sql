-- =====================================================
-- Migración: Facturación con CAI (Factura) vs sin CAI (Recibo)
-- =====================================================

-- 1) Tabla de configuración clave/valor (uso general)
CREATE TABLE IF NOT EXISTS configuracion (
  clave           VARCHAR(50) PRIMARY KEY,
  valor           VARCHAR(255) NOT NULL,
  actualizado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Switch maestro: '1' = emitir Factura con CAI, '0' = emitir Recibo
INSERT INTO configuracion (clave, valor) VALUES ('emitir_con_cai', '1')
  ON DUPLICATE KEY UPDATE valor = valor;

-- 2) Correlativo propio para los Recibos (no fiscales)
CREATE TABLE IF NOT EXISTS recibo_correlativo (
  id       TINYINT     NOT NULL PRIMARY KEY,
  prefijo  VARCHAR(10) NOT NULL DEFAULT 'REC',
  actual   INT         NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO recibo_correlativo (id, prefijo, actual) VALUES (1, 'REC', 0)
  ON DUPLICATE KEY UPDATE id = id;

-- 3) Tipo de documento en facturas: 'factura' (con CAI) o 'recibo' (sin CAI)
ALTER TABLE facturas
  ADD COLUMN tipo ENUM('factura','recibo') NOT NULL DEFAULT 'factura';

-- (cai_id ya admite NULL en esta BD; si en otra no, ejecutar:
--  ALTER TABLE facturas MODIFY cai_id INT NULL; )
