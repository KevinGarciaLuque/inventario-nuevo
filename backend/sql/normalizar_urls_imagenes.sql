-- Normaliza las URLs de imágenes guardadas en la BD.
-- Históricamente se guardaba la URL absoluta con el dominio del backend
-- (ej. https://feisty-charisma-production.up.railway.app/uploads/xxx.jpg).
-- Al cambiar el dominio del backend a api.tiendaslauren.com esas URLs quedaron
-- rotas. A partir de ahora se guarda solo la ruta relativa (/uploads/xxx) y el
-- frontend antepone el dominio actual.
--
-- Este script recorta cualquier URL de imagen a su parte relativa /uploads/...

UPDATE productos
SET imagen = SUBSTRING(imagen, LOCATE('/uploads/', imagen))
WHERE imagen LIKE '%/uploads/%'
  AND imagen NOT LIKE '/uploads/%';

UPDATE categorias
SET imagen = SUBSTRING(imagen, LOCATE('/uploads/', imagen))
WHERE imagen LIKE '%/uploads/%'
  AND imagen NOT LIKE '/uploads/%';

UPDATE tienda_carrusel
SET imagen_url = SUBSTRING(imagen_url, LOCATE('/uploads/', imagen_url))
WHERE imagen_url LIKE '%/uploads/%'
  AND imagen_url NOT LIKE '/uploads/%';
