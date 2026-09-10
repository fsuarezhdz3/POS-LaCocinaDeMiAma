const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'optirest',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función auxiliar para probar conexión al iniciar
async function checkConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión exitosa a la base de datos MySQL/MariaDB (', process.env.DB_NAME, ')');
    connection.release();
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error.message);
  }
}

checkConnection();

module.exports = pool;
