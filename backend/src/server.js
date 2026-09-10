const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const alimentosRoutes = require('./routes/alimentosRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const cortesRoutes = require('./routes/cortesRoutes');
const superadminRoutes = require('./routes/superadminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/alimentos', alimentosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/cortes', cortesRoutes);
app.use('/api/superadmin', superadminRoutes);

// Ruta base de comprobación de salud
app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor POS La Cocina corriendo exitosamente' });
});

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar Servidor y Probar Conexión a la BD MySQL
app.listen(PORT, async () => {
  console.log(`🚀 Servidor POS escuchando en el puerto ${PORT}`);
  await db.testConnection();
});
