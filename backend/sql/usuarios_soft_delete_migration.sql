-- =====================================================
-- Migración: Soft-delete de usuarios (activo/inactivo)
-- + permitir borrado forzado por superadmin
-- =====================================================

-- 1) Columna "activo" (1 = activo, 0 = desactivado)
ALTER TABLE usuarios
  ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1;

-- 2) Permitir usuario_id NULL en cierres_caja para poder eliminar
--    un usuario conservando el historial de cierres.
ALTER TABLE cierres_caja
  MODIFY usuario_id INT NULL;
