

-- 1. Actualizar ENUM de roles en usuarios (agregar 'encargado' y 'operador')
ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('admin', 'encargado', 'operador') NOT NULL DEFAULT 'operador';

-- 2. Crear tabla de proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(50)  NOT NULL UNIQUE,
  nombre        VARCHAR(150) NOT NULL,
  contacto      VARCHAR(100) DEFAULT NULL,
  telefono      VARCHAR(30)  DEFAULT NULL,
  email         VARCHAR(100) DEFAULT NULL,
  direccion     TEXT         DEFAULT NULL,
  ciudad        VARCHAR(100) DEFAULT NULL,
  pais          VARCHAR(80)  DEFAULT 'Dominican Republic',
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  notas         TEXT         DEFAULT NULL,
  fecha_creacion     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nombre (nombre),
  INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Agregar proveedor_id a artículos (nullable — no todo artículo tiene proveedor)
ALTER TABLE articulos
  ADD COLUMN proveedor_id INT DEFAULT NULL AFTER categoria,
  ADD CONSTRAINT fk_articulo_proveedor
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
    ON DELETE SET NULL;

-- 4. Crear tabla historial de compras (órdenes de compra a proveedor)
CREATE TABLE IF NOT EXISTS compras (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id    INT NOT NULL,
  usuario_id      INT NOT NULL,
  numero_orden    VARCHAR(50) UNIQUE NOT NULL,
  estado          ENUM('pendiente','recibida','cancelada') NOT NULL DEFAULT 'pendiente',
  observaciones   TEXT DEFAULT NULL,
  fecha_orden     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_recepcion TIMESTAMP DEFAULT NULL,
  CONSTRAINT fk_compra_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
  CONSTRAINT fk_compra_usuario   FOREIGN KEY (usuario_id)   REFERENCES usuarios(id),
  INDEX idx_proveedor (proveedor_id),
  INDEX idx_estado (estado),
  INDEX idx_fecha (fecha_orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Detalle de cada compra (qué artículos y en qué cantidad)
CREATE TABLE IF NOT EXISTS compras_detalle (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  compra_id   INT NOT NULL,
  articulo_id INT NOT NULL,
  cantidad    INT NOT NULL,
  CONSTRAINT fk_det_compra   FOREIGN KEY (compra_id)   REFERENCES compras(id)   ON DELETE CASCADE,
  CONSTRAINT fk_det_articulo FOREIGN KEY (articulo_id) REFERENCES articulos(id),
  INDEX idx_compra   (compra_id),
  INDEX idx_articulo (articulo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

