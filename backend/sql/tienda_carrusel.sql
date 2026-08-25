-- Slides del carrusel de inicio de la tienda web pública, administrables
-- desde el panel (imagen de fondo, título, texto y botón de cada slide).
CREATE TABLE IF NOT EXISTS tienda_carrusel (
  id INT AUTO_INCREMENT PRIMARY KEY,
  imagen_url VARCHAR(500) NOT NULL,
  titulo VARCHAR(150) NULL,
  texto VARCHAR(300) NULL,
  boton_texto VARCHAR(60) NULL,
  boton_link VARCHAR(255) NULL,
  orden INT NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
