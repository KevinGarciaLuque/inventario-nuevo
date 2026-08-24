-- Migración: variantes de producto (ej. mismo modelo, distinto color).
-- Cada variante sigue siendo un producto normal y vendible, con su propio
-- código de barras, stock y precio — solo se le agrega un enlace opcional
-- a su "producto principal" para agruparlos en Inventario y en la tienda.
-- Mismo patrón que categoria_padre_id en `categorias`.

ALTER TABLE productos
  ADD COLUMN producto_padre_id INT NULL AFTER id,
  ADD COLUMN variante_nombre VARCHAR(100) NULL AFTER producto_padre_id,
  ADD CONSTRAINT fk_productos_padre
    FOREIGN KEY (producto_padre_id) REFERENCES productos(id)
    ON DELETE SET NULL;
