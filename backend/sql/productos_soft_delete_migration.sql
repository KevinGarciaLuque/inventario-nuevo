-- Migración: soporte de "desactivar" productos en vez de forzar su borrado
-- cuando ya tienen ventas/movimientos registrados (evita romper el
-- historial de facturas, que necesita el registro del producto para
-- mostrarse correctamente).

ALTER TABLE productos
  ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1 AFTER unidad_medida_id;
