-- =============================================
-- BASE DE DATOS: pos_lacocina
-- =============================================
CREATE DATABASE IF NOT EXISTS pos_lacocina CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pos_lacocina;

-- =============================================
-- TABLA: cuentas 
-- =============================================
CREATE TABLE IF NOT EXISTS cuentas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL,                  -- superadmin, admin, mesero, barra, cocina, comal
    intentos INT NOT NULL DEFAULT 0,
    bloqueo BOOLEAN NOT NULL DEFAULT FALSE,
    estado BOOLEAN NOT NULL DEFAULT TRUE        -- Si la cuenta esta activa o no 
);

-- =============================================
-- TABLA: alimentos
-- =============================================
CREATE TABLE IF NOT EXISTS alimentos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(200) NOT NULL,
    tipo VARCHAR(15) NOT NULL,                 -- Comida, Desayuno, Antojito, Bebida, Torta, Postre, Entrada, Guarnicion, Extra
    precio INT NOT NULL,
    zona ENUM('barra', 'cocina', 'comal') NOT NULL DEFAULT 'cocina', -- Zonas de preparación
    estado BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================================
-- TABLA: facturas (Definición preliminar para FK en pedidos)
-- =============================================
CREATE TABLE IF NOT EXISTS facturas (
    folio INT PRIMARY KEY AUTO_INCREMENT,
    num_orden INT,
    razon_social VARCHAR(60) NOT NULL,
    rfc VARCHAR(15) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
    uuid VARCHAR(36) NULL,                   -- CFDI UUID
    serie VARCHAR(5) NULL,                   -- Serie del folio fiscal
    metodo_pago VARCHAR(20) NOT NULL,        -- PUE, PPD
    forma_pago VARCHAR(10) NOT NULL,         -- 01=Efectivo, 02=Cheque, 03=Transferencia
    uso_cfdi VARCHAR(5) NOT NULL,            -- G01, G02, G03
    subtotal DECIMAL(10,2) NOT NULL,         -- Snapshot al momento de facturar
    iva DECIMAL(10,2) NOT NULL,              -- Snapshot al momento de facturar
    total DECIMAL(10,2) NOT NULL,            -- Snapshot al momento de facturar
    estado ENUM('pendiente','timbrar','cancelada') DEFAULT 'pendiente',
    fecha_cancelacion DATETIME NULL
);

-- =============================================
-- TABLA: pedidos
-- =============================================
CREATE TABLE IF NOT EXISTS pedidos (
    num_orden INT PRIMARY KEY AUTO_INCREMENT,
    costo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    num_mesa INT NOT NULL,
    estado INT NOT NULL DEFAULT 0,              -- 0: recién creado, 1: servido primer platillo, 2: completado y cobrado
    fecha_pedido DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_completado DATETIME,
    metodo_pago VARCHAR(20),                  -- efectivo, tarjeta, transferencia, mixto
    comentarios VARCHAR(200),                 -- Aclaraciones al cobrar
    cuenta INT,	                              -- Cuenta del mesero que sirvió el primer platillo
    factura INT,
    FOREIGN KEY (cuenta) REFERENCES cuentas(id) ON DELETE SET NULL,
    FOREIGN KEY (factura) REFERENCES facturas(folio) ON DELETE SET NULL
);

-- Agregar FK de num_orden en facturas una vez creada la tabla pedidos
ALTER TABLE facturas ADD CONSTRAINT fk_facturas_pedidos FOREIGN KEY (num_orden) REFERENCES pedidos(num_orden);

-- =============================================
-- TABLA: alimentos_pedidos
-- =============================================
CREATE TABLE IF NOT EXISTS alimentos_pedidos (
    id INT PRIMARY KEY AUTO_INCREMENT, 
    costo DECIMAL(10,2) NOT NULL,
    estado INT NOT NULL DEFAULT 0,              -- 0: enviado a cocina, 1: servido, 2: entregado al cliente
    alimento VARCHAR(100) NOT NULL,
    guarnicion1 VARCHAR(150) DEFAULT NULL,       -- Guarnición 1 para paquetes
    guarnicion2 VARCHAR(150) DEFAULT NULL,       -- Guarnición 2 para paquetes
    entrada VARCHAR(150) DEFAULT NULL,           -- Entrada para paquetes
    bebida VARCHAR(150) DEFAULT NULL,            -- Bebida para paquetes
    guiso VARCHAR(150) DEFAULT NULL,             -- Guiso para antojitos
    extras VARCHAR(500),                        -- Extras o aditivos pagados
    comentarios VARCHAR(300),
    cuenta INT NOT NULL,                        -- cuenta de quien pidió este ítem específico
    num_orden INT NOT NULL,
    FOREIGN KEY (num_orden) REFERENCES pedidos(num_orden) ON DELETE CASCADE,
    FOREIGN KEY (cuenta) REFERENCES cuentas(id)
);

-- =============================================
-- TABLA: cortes 
-- =============================================
CREATE TABLE IF NOT EXISTS cortes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    dinero_inicial DECIMAL(10,2) NOT NULL,
    hora_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hora_fin DATETIME,
    total_corte DECIMAL(10,2) NOT NULL DEFAULT 0,
    cuenta INT NOT NULL,
    FOREIGN KEY (cuenta) REFERENCES cuentas(id)
);

-- =============================================
-- TABLA: ingresos
-- =============================================
CREATE TABLE IF NOT EXISTS ingresos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    total_ingreso INT NOT NULL,
    concepto VARCHAR(100) NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    corte_id INT NOT NULL,
    FOREIGN KEY (corte_id) REFERENCES cortes(id) ON DELETE CASCADE
);

-- =============================================
-- TABLA: egresos
-- =============================================
CREATE TABLE IF NOT EXISTS egresos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    total_ingreso INT NOT NULL,
    concepto VARCHAR(100) NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    corte_id INT NOT NULL,
    FOREIGN KEY (corte_id) REFERENCES cortes(id) ON DELETE CASCADE
);

-- =============================================
-- TABLA: facturas_detalle
-- =============================================
CREATE TABLE IF NOT EXISTS facturas_detalle (
    id INT PRIMARY KEY AUTO_INCREMENT,
    folio_factura INT NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    importe DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (folio_factura) REFERENCES facturas(folio) ON DELETE CASCADE
);

-- =============================================
-- DATOS SEMILLA (Inserts iniciales por tipo de cuenta)
-- Contraseñas cifradas con bcrypt (rounds=10)
-- =============================================
INSERT INTO cuentas (nombre, contrasena, tipo) VALUES 
('superadmin', '$2a$10$O3SCGOyA9jBwTkvajOSkKOZO8FgqrZwIMl5ATOmQOLJh2XpC3Q/p.', 'superadmin'),
('admin',      '$2a$10$4WQIAyffAIC/D2KkcoD00eKRadfgHTzVZhcjD1ytz.DG4Wa5jJ2e.', 'admin'),
('mesero1',    '$2a$10$eKh9KWjvaIiZs/SDIJ7D.OK64R0ra1SOLadflj3m6pxdawJVRvcCC', 'mesero'),
('barra1',     '$2a$10$Ga8/WiujKtA8Pl8oBAJpE.KQ3eHWrtlddXgxhad5DAA.2WzxM7HUe', 'barra'),
('cocina1',    '$2a$10$sbDfs5ORGYguFwzER/XaO.dUQGI5JB.KIh9.ePCH8lyT1mDKIu.yq', 'cocina'),
('comal1',     '$2a$10$1TdO79JwYCXqP2tQvl0g/u.HaHtT8mAzc5DK6Rxq.8RBIdemjki3u', 'comal')
ON DUPLICATE KEY UPDATE contrasena=VALUES(contrasena), tipo=VALUES(tipo);

-- =============================================
-- DATOS SEMILLA: ALIMENTOS (5 ÍTEMS POR CADA CATEGORÍA)
-- =============================================
INSERT INTO alimentos (nombre, tipo, precio, estado) VALUES
-- DESAYUNO (5 pz)
('Chilaquiles Verdes con Huevo', 'Desayuno', 85, TRUE),
('Huevos al Gusto con Jamón o Tocino', 'Desayuno', 75, TRUE),
('Omelette de Queso y Champiñones', 'Desayuno', 90, TRUE),
('Huevos Rancheros sobre Tortilla', 'Desayuno', 80, TRUE),
('Hot Cakes Tradicionales con Mantequilla', 'Desayuno', 70, TRUE),

-- COMIDA (5 pz)
('Milanesa de Res Empanizada', 'Comida', 110, TRUE),
('Pechuga Rellena de Queso y Jamón', 'Comida', 115, TRUE),
('Carne Asada con Ensalada y Frijoles', 'Comida', 120, TRUE),
('Enchiladas Verdes de Pollo', 'Comida', 95, TRUE),
('Flautas Doradas de Pollo (4 pz)', 'Comida', 85, TRUE),

-- BEBIDA (5 pz)
('Jugo de Naranja Natural (500ml)', 'Bebida', 35, TRUE),
('Café Americano de Olla', 'Bebida', 25, TRUE),
('Refresco Embotellado (600ml)', 'Bebida', 28, TRUE),
('Té Helado con Limón', 'Bebida', 30, TRUE),
('Agua Embotellada Ciel (600ml)', 'Bebida', 20, TRUE),

-- ANTOJITO (5 pz)
('Sopes de Chicharrón Prensado (3 pz)', 'Antojito', 65, TRUE),
('Gorditas de Chicharrón o Queso (2 pz)', 'Antojito', 60, TRUE),
('Tlacoyos de Frijol con Nopales', 'Antojito', 55, TRUE),
('Quesadillas Fritas de Queso Oaxaca', 'Antojito', 65, TRUE),
('Pambazo de Papa con Chorizo', 'Antojito', 50, TRUE),

-- TORTA (5 pz)
('Torta de Pierna Adobada', 'Torta', 75, TRUE),
('Torta de Milanesa de Res', 'Torta', 80, TRUE),
('Torta Cubana Especial', 'Torta', 95, TRUE),
('Torta de Jamón y Queso', 'Torta', 60, TRUE),
('Torta de Chorizo con Huevo', 'Torta', 65, TRUE),

-- POSTRE (5 pz)
('Flan Napolitano Casero', 'Postre', 45, TRUE),
('Arroz con Leche y Canela', 'Postre', 35, TRUE),
('Carlota de Limón', 'Postre', 40, TRUE),
('Jericalla Tradicional', 'Postre', 35, TRUE),
('Gelatina Mosaico de Leche', 'Postre', 30, TRUE),

-- EXTRA (5 pz)
('Porción de Aguacate', 'Extra', 20, TRUE),
('Queso Gratinado Extra', 'Extra', 15, TRUE),
('Porción de Tocino (3 tiras)', 'Extra', 25, TRUE),
('Salsa Especial de la Casa', 'Extra', 10, TRUE),
('Crema Fresca', 'Extra', 10, TRUE),

-- LITROS (5 pz)
('Agua Fresca de Horchata (1 Litro)', 'Litros', 50, TRUE),
('Agua Fresca de Jamaica (1 Litro)', 'Litros', 50, TRUE),
('Agua Fresca de Limón con Chía (1 Litro)', 'Litros', 50, TRUE),
('Caldo de Pollo en Litro', 'Litros', 75, TRUE),
('Consomé de Barbacoa (1 Litro)', 'Litros', 90, TRUE),

-- ENTRADA (5 pz)
('Sopa de Fideo Casera', 'Entrada', 35, TRUE),
('Crema de Elote Dulce', 'Entrada', 45, TRUE),
('Consomé de Pollo con Verduras', 'Entrada', 40, TRUE),
('Ensalada Verde de la Casa', 'Entrada', 50, TRUE),
('Guacamole Tradicional con Totopos', 'Entrada', 65, TRUE),

-- COMIDA / PLATOS FUERTES
('Mole Poblano con Pollo y Arroz', 'Comida', 130, TRUE),
('Costillas de Puerco en Salsa Verde', 'Comida', 125, TRUE),
('Birria de Res estilo Jalisco', 'Comida', 135, TRUE),
('Chile Relleno de Queso Capeado', 'Comida', 110, TRUE),
('Pozole Rojo de Maciza', 'Comida', 105, TRUE),

-- GUARNICION (5 pz)
('Frijoles Refritos con Queso', 'Guarnicion', 30, TRUE),
('Arroz Rojo Tradicional', 'Guarnicion', 30, TRUE),
('Papas a la Mexicana', 'Guarnicion', 35, TRUE),
('Champiñones Salteados al Ajillo', 'Guarnicion', 35, TRUE),
('Nopales Asados con Orégano', 'Guarnicion', 30, TRUE)
ON DUPLICATE KEY UPDATE precio=VALUES(precio), estado=VALUES(estado);
