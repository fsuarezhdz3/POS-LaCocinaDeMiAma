const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const productosRoutes = require('./routes/productosRoutes');
const proveedoresRoutes = require('./routes/proveedoresRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const historialRoutes = require('./routes/historialRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globales
app.use(cors());
app.use(express.json());

// Ruta de estado de la API
app.get('/', (req, res) => {
  res.json({
    mensaje: 'Servidor Backend de LaCocina funcionando correctamente',
    version: '1.0.0'
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/historial', historialRoutes);

// Manejador de rutas no encontradas 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Arrancar el servidor Express escuchando en todas las interfaces de red (0.0.0.0)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT} y accesible desde tu red local en puerto ${PORT}`);
});
