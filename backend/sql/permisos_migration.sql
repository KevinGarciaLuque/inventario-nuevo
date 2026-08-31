-- =====================================================
-- Migración: Roles (superadmin) + Módulo de Permisos
-- =====================================================

-- 1) Tabla de permisos por rol / módulo
CREATE TABLE IF NOT EXISTS permisos_rol (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  rol        VARCHAR(30)  NOT NULL,
  modulo     VARCHAR(50)  NOT NULL,
  permitido  TINYINT(1)   NOT NULL DEFAULT 0,
  creado_en  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rol_modulo (rol, modulo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) Ampliar el ENUM de rol para incluir 'superadmin' (y conservar 'usuario' temporalmente)
ALTER TABLE usuarios
  MODIFY rol ENUM('superadmin','admin','usuario','almacen','cajero') NOT NULL;

-- 3) Convertir a superadmin al usuario dueño
UPDATE usuarios SET rol = 'superadmin' WHERE email = 'kg@gmail.com';

-- 4) Migrar el rol "usuario" (eliminado) a "almacen"
UPDATE usuarios SET rol = 'almacen' WHERE rol = 'usuario';

-- 5) Quitar 'usuario' del ENUM definitivamente
ALTER TABLE usuarios
  MODIFY rol ENUM('superadmin','admin','almacen','cajero') NOT NULL;

-- 6) Seed de permisos por defecto
--    admin: todo excepto backup
INSERT INTO permisos_rol (rol, modulo, permitido) VALUES
('admin','dashboard',1),('admin','inventory',1),('admin','add-product',1),
('admin','ventas',1),('admin','pedidos',1),('admin','movimientos',1),
('admin','registrar-movimiento',1),('admin','caja-apertura',1),('admin','caja-cierre',1),
('admin','caja-historial',1),('admin','facturas',1),('admin','cai',1),
('admin','users',1),('admin','clientes',1),('admin','bitacora',1),
('admin','tienda-config',1),('admin','clientes-web',1),('admin','categories',1),
('admin','locations',1),('admin','unidades',1),('admin','impuestos',1),
('admin','descuentos',1),('admin','promociones',1),('admin','backup',0),
--    almacen
('almacen','dashboard',0),('almacen','inventory',1),('almacen','add-product',1),
('almacen','ventas',0),('almacen','pedidos',0),('almacen','movimientos',1),
('almacen','registrar-movimiento',1),('almacen','caja-apertura',0),('almacen','caja-cierre',0),
('almacen','caja-historial',0),('almacen','facturas',0),('almacen','cai',0),
('almacen','users',0),('almacen','clientes',0),('almacen','bitacora',0),
('almacen','tienda-config',0),('almacen','clientes-web',0),('almacen','categories',1),
('almacen','locations',1),('almacen','unidades',1),('almacen','impuestos',1),
('almacen','descuentos',0),('almacen','promociones',1),('almacen','backup',0),
--    cajero
('cajero','dashboard',0),('cajero','inventory',0),('cajero','add-product',0),
('cajero','ventas',1),('cajero','pedidos',1),('cajero','movimientos',0),
('cajero','registrar-movimiento',0),('cajero','caja-apertura',1),('cajero','caja-cierre',1),
('cajero','caja-historial',1),('cajero','facturas',1),('cajero','cai',0),
('cajero','users',0),('cajero','clientes',0),('cajero','bitacora',0),
('cajero','tienda-config',0),('cajero','clientes-web',0),('cajero','categories',0),
('cajero','locations',0),('cajero','unidades',0),('cajero','impuestos',0),
('cajero','descuentos',0),('cajero','promociones',0),('cajero','backup',0)
ON DUPLICATE KEY UPDATE permitido = VALUES(permitido);
