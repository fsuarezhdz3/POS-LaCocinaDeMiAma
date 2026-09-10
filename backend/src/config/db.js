const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pos_lacocina',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función para comprobar y reportar el estado de la conexión MySQL
pool.testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ Conexión exitosa a la base de datos MySQL [${process.env.DB_NAME || 'pos_lacocina'}] en ${process.env.DB_HOST || 'localhost'}`);
    connection.release();
  } catch (error) {
    console.error(`❌ Error al conectar a la base de datos MySQL: ${error.message}`);
    console.error('💡 Asegúrate de que el servicio MySQL esté activo y la BD "pos_lacocina" esté creada con schema.sql.');
  }
};

module.exports = pool;
