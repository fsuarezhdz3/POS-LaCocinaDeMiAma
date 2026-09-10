-- =======================================================
-- SCRIPT DE DATOS DE PRUEBA (INSERTS DE EJEMPLO)
-- Base de datos: optirest
-- =======================================================

USE optirest;

-- Asegurar tipo ENUM superadmin
ALTER TABLE cuentas MODIFY COLUMN tipo ENUM('superadmin', 'admin', 'empleado') NOT NULL;

-- 1. PROVEEDORES DE PRUEBA
INSERT INTO proveedores (id, nombre) VALUES
(1, 'Distribuidora de Carnes El Ganadero'),
(2, 'Frutería y Verdulería Don José'),
(3, 'Lácteos y Quesos San Juan'),
(4, 'Abarrotes y Especias del Centro')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);


-- 2. CUENTAS DE USUARIO DE PRUEBA
-- Superadmin: superadmin / superadmin123
-- Admin: admin / admin123
-- Empleado: empleado1 / empleado123
INSERT INTO cuentas (id, nombre, password, tipo, intentos_fallidos, bloqueado) VALUES
(1, 'superadmin', '$2b$10$wK1cZgqW8Z7R1B.K.dZtEu4JqW0R5J9f9H5v6vJ9YuPBAn1O', 'superadmin', 0, FALSE),
(2, 'admin', '$2b$10$0LZOAxJkwPta8VSzdfvq1uPJaOzdo5BX9KXjKzoN09yw/YuPBAn1O', 'admin', 0, FALSE),
(3, 'empleado1', '$2b$10$5359r5.aBM1V0xy73hBHYer4A13IEQdNfEubkrae338ZtmZuikBje', 'empleado', 0, FALSE)
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);


-- 3. PRODUCTOS DE PRUEBA
INSERT INTO productos (id, nombre, stock, unidad_medida, stock_minimo, proveedor_id) VALUES
(1, 'Carne de Res Molida', 15.50, 'kg', 5.00, 1),
(2, 'Pechuga de Pollo', 22.00, 'kg', 8.00, 1),
(3, 'Jitomate Saladette', 8.00, 'kg', 10.00, 2),
(4, 'Queso Oaxaca', 5.00, 'kg', 3.00, 3),
(5, 'Aceite Vegetal 1L', 12.00, 'pz', 4.00, 4)
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);


-- 4. HISTORIAL DE INVENTARIO DE PRUEBA
INSERT INTO historial_inventario (id, cantidad, tipo_movimiento, descripcion, producto_id, cuenta_id) VALUES
(1, 20.00, 'entrada', 'Compra inicial de lote de carne molida', 1, 1),
(2, 4.50, 'consumo', 'Uso en cocina para platillos del menú del día', 1, 3),
(3, 10.00, 'entrada', 'Recepción de pedido semanal de jitomate', 3, 2),
(4, 2.00, 'merma', 'Merma por producto dañado en recepción', 3, 3);
