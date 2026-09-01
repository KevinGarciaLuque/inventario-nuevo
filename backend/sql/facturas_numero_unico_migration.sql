-- =====================================================
-- Migración: número de documento único + concurrencia multi-tienda
-- Evita que dos cobros simultáneos (varias tiendas / varias pestañas)
-- generen el mismo número de factura/recibo sin que el sistema lo note.
-- =====================================================

-- 1) Verificar que no existan duplicados actuales (debe devolver 0 filas)
--    SELECT numero_factura, COUNT(*) c FROM facturas
--    GROUP BY numero_factura HAVING c > 1;

-- 2) Índice único sobre el número de documento
ALTER TABLE facturas
  ADD CONSTRAINT uq_facturas_numero UNIQUE (numero_factura);

-- Nota: el backend ya usa SELECT ... FOR UPDATE sobre `cai` y
-- `recibo_correlativo` al asignar el correlativo, y descuenta stock con
-- `WHERE stock >= ?`, de modo que la numeración y el inventario quedan
-- serializados entre ventas concurrentes.
