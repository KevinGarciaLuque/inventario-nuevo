-- Migración: precio de mayorista, exclusivo para el catálogo PDF (no se
-- muestra en la tienda ni en las ventas normales).
ALTER TABLE productos
  ADD COLUMN precio_mayorista DECIMAL(10,2) NULL AFTER precio;
