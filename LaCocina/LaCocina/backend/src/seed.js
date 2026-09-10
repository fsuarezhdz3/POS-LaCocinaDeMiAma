const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('🌱 Inicializando datos base...');

    // 1. Modificar columna ENUM para aceptar superadmin
    try {
      await db.query("ALTER TABLE cuentas MODIFY COLUMN tipo ENUM('superadmin', 'admin', 'empleado') NOT NULL;");
      console.log('✅ Estructura de tabla cuentas actualizada a ENUM superadmin/admin/empleado.');
    } catch (e) {
      console.log('ℹ️ La columna tipo en cuentas ya tenía el formato correcto.');
    }

    // 2. Crear cuenta SUPERADMIN si no existe
    const [superAdminExistente] = await db.query('SELECT id FROM cuentas WHERE nombre = ?', ['superadmin']);
    if (superAdminExistente.length === 0) {
      const superPassword = await bcrypt.hash('superadmin123', 10);
      await db.query(
        'INSERT INTO cuentas (nombre, password, tipo) VALUES (?, ?, ?)',
        ['superadmin', superPassword, 'superadmin']
      );
      console.log('👑 Usuario SUPERADMIN creado: (Usuario: superadmin, Contraseña: superadmin123)');
    } else {
      console.log('ℹ️ Usuario superadmin ya existía.');
    }

    // 3. Crear cuenta admin por defecto si no existe
    const [adminExistente] = await db.query('SELECT id FROM cuentas WHERE nombre = ?', ['admin']);
    if (adminExistente.length === 0) {
      const passwordHashed = await bcrypt.hash('admin123', 10);
      await db.query(
        'INSERT INTO cuentas (nombre, password, tipo) VALUES (?, ?, ?)',
        ['admin', passwordHashed, 'admin']
      );
      console.log('✅ Usuario Administrador creado: (Usuario: admin, Contraseña: admin123)');
    }

    // 4. Crear cuenta empleado inicial por defecto
    const [empExistente] = await db.query('SELECT id FROM cuentas WHERE nombre = ?', ['empleado1']);
    if (empExistente.length === 0) {
      const empPassword = await bcrypt.hash('empleado123', 10);
      await db.query(
        'INSERT INTO cuentas (nombre, password, tipo) VALUES (?, ?, ?)',
        ['empleado1', empPassword, 'empleado']
      );
      console.log('✅ Usuario Empleado creado: (Usuario: empleado1, Contraseña: empleado123)');
    }

    console.log('🎉 Inicialización completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  }
}

seedDatabase();
