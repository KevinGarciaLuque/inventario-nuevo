-- Configuración editable de la tienda web pública (redes sociales, contacto)
CREATE TABLE IF NOT EXISTS tienda_config (
  id INT PRIMARY KEY DEFAULT 1,
  facebook_url VARCHAR(255) NULL,
  instagram_url VARCHAR(255) NULL,
  tiktok_url VARCHAR(255) NULL,
  correo VARCHAR(150) NULL,
  direccion VARCHAR(200) NULL,
  horario VARCHAR(150) NULL,
  maps_embed_url VARCHAR(500) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO tienda_config (id) VALUES (1);

-- Lista de teléfonos de la empresa; uno de ellos marcado como principal
-- (usado en el botón flotante de WhatsApp y "Enviar pedido por WhatsApp")
CREATE TABLE IF NOT EXISTS tienda_telefonos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(30) NOT NULL,
  etiqueta VARCHAR(80) NULL,
  es_principal TINYINT(1) NOT NULL DEFAULT 0,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
