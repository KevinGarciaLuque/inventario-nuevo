-- =====================================================
-- Migración: Configuración del Recibo / Factura (encabezado, logo y textos)
-- Editable SOLO por superadmin desde el módulo "Configuración de Recibo/Factura".
-- =====================================================

CREATE TABLE IF NOT EXISTS recibo_config (
  id                TINYINT      NOT NULL PRIMARY KEY DEFAULT 1,

  -- Encabezado (compartido entre recibo y factura)
  logo_base64       MEDIUMTEXT   NULL,          -- dataURL: "data:image/png;base64,...."
  negocio_nombre    VARCHAR(120) NOT NULL DEFAULT 'Sistema Inventario',
  sucursal          VARCHAR(120) NOT NULL DEFAULT 'Sucursal Tegucigalpa',
  rtn               VARCHAR(40)  NOT NULL DEFAULT '0801-1900-10000',
  telefono          VARCHAR(40)  NOT NULL DEFAULT '(504) 9800-0000',

  -- Textos del RECIBO (no fiscal)
  recibo_titulo     VARCHAR(80)  NOT NULL DEFAULT 'RECIBO DE VENTA',
  recibo_leyenda    VARCHAR(160) NOT NULL DEFAULT 'Documento no fiscal - no genera crédito fiscal',
  recibo_pie        VARCHAR(120) NOT NULL DEFAULT '*** GRACIAS POR SU COMPRA ***',
  recibo_nota1      VARCHAR(160) NOT NULL DEFAULT 'Este documento NO es una factura.',
  recibo_nota2      VARCHAR(160) NOT NULL DEFAULT 'Si necesita factura, solicítela.',
  recibo_color      CHAR(7)      NOT NULL DEFAULT '#000000',   -- color de TODO el texto del recibo

  -- Textos de la FACTURA (fiscal, con CAI)
  factura_titulo    VARCHAR(80)  NOT NULL DEFAULT 'FACTURA',
  factura_pie       VARCHAR(120) NOT NULL DEFAULT '*** GRACIAS POR SU COMPRA ***',
  factura_nota1     VARCHAR(160) NOT NULL DEFAULT 'La factura es beneficio de todos.',
  factura_nota2     VARCHAR(160) NOT NULL DEFAULT 'EXÍJALA',
  factura_color     CHAR(7)      NOT NULL DEFAULT '#000000',   -- color de TODO el texto de la factura

  actualizado_en    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO recibo_config (id) VALUES (1)
  ON DUPLICATE KEY UPDATE id = id;
