-- Migración: Pedidos Web (carrito de la tienda -> WhatsApp + módulo de pedidos).
-- El cliente arma su carrito en la tienda pública, llena sus datos y envía el
-- pedido por WhatsApp; al mismo tiempo se guarda aquí como "nuevo" y dispara la
-- campanita del panel. El vendedor lo pasa a "en_proceso" (valida transferencia
-- y stock), luego a "listo" y finalmente lo cobra en Registrar Venta (ahí se
-- descuenta el inventario con la lógica de ventas existente).

CREATE TABLE IF NOT EXISTS pedidos_web (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_nombre     VARCHAR(150) NOT NULL,
  cliente_telefono   VARCHAR(40)  NULL,
  cliente_direccion  VARCHAR(255) NULL,
  entrega            ENUM('envio','recoge') NOT NULL DEFAULT 'recoge',
  total_aprox        DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado             ENUM('nuevo','en_proceso','listo','cobrado','cancelado')
                     NOT NULL DEFAULT 'nuevo',
  notas              TEXT NULL,
  venta_id           INT NULL,
  leido              TINYINT(1) NOT NULL DEFAULT 0,
  procesado_por      INT NULL,
  creado_en          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pedidos_web_estado (estado),
  INDEX idx_pedidos_web_creado (creado_en),
  CONSTRAINT fk_pedido_web_venta FOREIGN KEY (venta_id) REFERENCES ventas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedido_web_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id        INT NOT NULL,
  producto_id      INT NULL,
  codigo           VARCHAR(60)  NULL,
  nombre           VARCHAR(200) NOT NULL,
  cantidad         INT NOT NULL,
  precio_unitario  DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal         DECIMAL(10,2) NOT NULL DEFAULT 0,
  INDEX idx_pwi_pedido (pedido_id),
  CONSTRAINT fk_pwi_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos_web(id) ON DELETE CASCADE,
  CONSTRAINT fk_pwi_producto FOREIGN KEY (producto_id)
    REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
