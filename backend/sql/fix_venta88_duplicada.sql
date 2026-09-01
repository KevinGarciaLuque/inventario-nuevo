-- =====================================================
-- Corrección puntual: factura fiscal duplicada 001-002-01-00000021
-- Causa: doble "Cobrar" (venta 85 y 88, mismo carrito, 1 s de diferencia),
--        cuando el SELECT del CAI no tenía bloqueo (ya corregido en ventas.js).
-- venta 88 se confirmó como cobro duplicado por error -> se elimina.
-- Ejecutar una sola vez.
-- =====================================================

START TRANSACTION;

-- 1) Desligar venta 88 de su factura y borrar la factura duplicada
UPDATE ventas SET factura_id = NULL, cai = NULL WHERE id = 88;
DELETE FROM facturas WHERE id = 86;   -- copia de 001-002-01-00000021

-- 2) Borrar el detalle y la venta duplicada
DELETE FROM detalle_ventas WHERE venta_id = 88;
DELETE FROM ventas WHERE id = 88;

-- 3) Reponer el stock que la venta duplicada había descontado (+1 c/u)
UPDATE productos SET stock = stock + 1 WHERE id IN (64,65,66,67,68,69);
INSERT INTO movimientos (producto_id, tipo, cantidad, descripcion, usuario_id) VALUES
 (64,'entrada',1,'Reverso venta duplicada #88 / 001-002-01-00000021 (01/02/2026)',12),
 (65,'entrada',1,'Reverso venta duplicada #88 / 001-002-01-00000021 (01/02/2026)',12),
 (66,'entrada',1,'Reverso venta duplicada #88 / 001-002-01-00000021 (01/02/2026)',12),
 (67,'entrada',1,'Reverso venta duplicada #88 / 001-002-01-00000021 (01/02/2026)',12),
 (68,'entrada',1,'Reverso venta duplicada #88 / 001-002-01-00000021 (01/02/2026)',12),
 (69,'entrada',1,'Reverso venta duplicada #88 / 001-002-01-00000021 (01/02/2026)',12);

-- 4) Ya sin duplicados: índice único definitivo sobre el número de documento
ALTER TABLE facturas ADD CONSTRAINT uq_facturas_numero UNIQUE (numero_factura);

COMMIT;
