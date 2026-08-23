-- Migración: soporte de subcategorías en la tabla `categorias`
-- Ejecutar UNA sola vez contra la base de datos de producción (MySQL en Railway).
--
-- Agrega una columna categoria_padre_id que, cuando es NULL, indica que la
-- categoría es de nivel superior (ej. "Bebidas"); cuando apunta al id de otra
-- categoría, indica que es una subcategoría de esa categoría (ej. "Refrescos"
-- con categoria_padre_id = id de "Bebidas").

ALTER TABLE categorias
  ADD COLUMN categoria_padre_id INT NULL AFTER descripcion,
  ADD CONSTRAINT fk_categorias_padre
    FOREIGN KEY (categoria_padre_id) REFERENCES categorias(id)
    ON DELETE SET NULL;
