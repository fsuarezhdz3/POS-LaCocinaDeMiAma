-- Script SQL para la base de datos 'optirest'
CREATE DATABASE IF NOT EXISTS optirest;
USE optirest;

-- ==========================
-- TABLA PROVEEDORES
-- ==========================
CREATE TABLE IF NOT EXISTS proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- ==========================
-- TABLA PRODUCTOS
-- ==========================
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    unidad_medida VARCHAR(20) NOT NULL,
    stock_minimo DECIMAL(10,2) NOT NULL DEFAULT 0,
    proveedor_id INT NOT NULL,
    CONSTRAINT fk_producto_proveedor
        FOREIGN KEY (proveedor_id)
        REFERENCES proveedores(id)
);

-- ==========================
-- TABLA CUENTAS (Soporte para superadmin, admin y empleado)
-- ==========================
CREATE TABLE IF NOT EXISTS cuentas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    tipo ENUM('superadmin', 'admin', 'empleado') NOT NULL,
    intentos_fallidos INT NOT NULL DEFAULT 0,
    bloqueado BOOLEAN NOT NULL DEFAULT FALSE
);

-- Sentencia ALTER TABLE por si la tabla ya existía previamente con solo admin y empleado:
ALTER TABLE cuentas MODIFY COLUMN tipo ENUM('superadmin', 'admin', 'empleado') NOT NULL;

-- ==========================
-- TABLA HISTORIAL INVENTARIO
-- ==========================
CREATE TABLE IF NOT EXISTS historial_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cantidad DECIMAL(10,2) NOT NULL,
    tipo_movimiento ENUM(
        'entrada',
        'consumo',
        'merma',
        'ajuste'
    ) NOT NULL,
    descripcion VARCHAR(255),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    producto_id INT NOT NULL,
    cuenta_id INT NOT NULL,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id)
);
