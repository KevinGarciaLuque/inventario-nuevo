-- =====================================================
-- Multi-tienda (identidad fiscal / numeración por local).
-- El inventario sigue siendo una sola bodega compartida.
-- Idempotente-ish: usa IF NOT EXISTS donde se puede; los ALTER ADD COLUMN
-- fallan si la columna ya existe (ejecutar una sola vez).
-- =====================================================

-- 1) Catálogo de tiendas
CREATE TABLE IF NOT EXISTS tiendas (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(120) NOT NULL,
  direccion    VARCHAR(200) DEFAULT NULL,
  rtn          VARCHAR(40)  DEFAULT NULL,
  telefono     VARCHAR(40)  DEFAULT NULL,
  activo       TINYINT(1)   NOT NULL DEFAULT 1,
  atiende_web  TINYINT(1)   NOT NULL DEFAULT 0,   -- solo una tienda con 1 a la vez
  creado_en    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) A qué tienda pertenece cada usuario / documento
ALTER TABLE usuarios ADD COLUMN tienda_id INT DEFAULT NULL;
ALTER TABLE cai      ADD COLUMN tienda_id INT DEFAULT NULL;
ALTER TABLE ventas   ADD COLUMN tienda_id INT DEFAULT NULL;
ALTER TABLE facturas ADD COLUMN tienda_id INT DEFAULT NULL;

-- 3) Correlativo de recibos por tienda (tabla nueva; recibo_correlativo id=1
--    se conserva como fallback para usuarios sin tienda asignada)
CREATE TABLE IF NOT EXISTS tienda_correlativo (
  tienda_id INT NOT NULL PRIMARY KEY,
  prefijo   VARCHAR(10) NOT NULL DEFAULT 'REC',
  actual    INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_tienda_correlativo_tienda
    FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) FKs
ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_tienda
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE SET NULL;
ALTER TABLE cai ADD CONSTRAINT fk_cai_tienda
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE SET NULL;
ALTER TABLE ventas ADD CONSTRAINT fk_ventas_tienda
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE SET NULL;
ALTER TABLE facturas ADD CONSTRAINT fk_facturas_tienda
  FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE SET NULL;
