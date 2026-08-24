-- Migración: campos opcionales para la ficha técnica del producto en la
-- tienda web (estilo Amazon). Si quedan vacíos, simplemente no se muestran.
ALTER TABLE productos
  ADD COLUMN marca VARCHAR(100) NULL AFTER nombre,
  ADD COLUMN dimensiones VARCHAR(150) NULL AFTER contenido_medida;
