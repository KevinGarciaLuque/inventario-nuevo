-- Tabla para solicitudes de registro de clientes desde la tienda web pública
CREATE TABLE IF NOT EXISTS clientes_web (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  empresa VARCHAR(150) NULL,
  telefono VARCHAR(30) NOT NULL,
  correo VARCHAR(150) NULL,
  ubicacion VARCHAR(200) NULL,
  estado ENUM('nuevo','contactado','descartado') NOT NULL DEFAULT 'nuevo',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
