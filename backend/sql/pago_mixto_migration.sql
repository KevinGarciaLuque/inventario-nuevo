-- Migración: soporte de pago mixto (efectivo + tarjeta) en una misma venta.
-- Agrega monto_tarjeta a ventas y facturas. El monto en efectivo sigue
-- usando la columna "efectivo" ya existente; "cambio" sigue siendo el
-- vuelto entregado sobre la porción en efectivo.

ALTER TABLE ventas
  ADD COLUMN monto_tarjeta DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER cambio;

ALTER TABLE facturas
  ADD COLUMN monto_tarjeta DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER cambio;
