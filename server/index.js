// server/index.js
const express = require('express');
const cors = require('cors');

// Importar archivos de rutas admin
const authRoutes = require('./routes/authRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes'); // <--- Asegúrate de tener esto
const zonasRoutes = require('./routes/zonasRoutes');       // <--- NUEVO
const destinosRoutes = require('./routes/destinosRoutes');
const clientesRoutes = require('./routes/clientesRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const bodegasRoutes = require('./routes/bodegasRoutes');
const vehiculosRoutes = require('./routes/vehiculosRoutes');
//importar archivos de rutas de lider
//const liderRoutes = require('./routes/liderRoutes');
const pedidosLiderRoutes = require('./routes/pedidosLiderRoutes');// <--- NUEVO


const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Usar las rutas
// La ruta base es /api, así que las rutas finales serán:
// /api/auth/login (dependiendo de cómo definiste authRoutes)
// /api/pedidos
// /api/pedidos-rango
// /api/dashboard
app.use('/api', authRoutes); 
app.use('/api', pedidosRoutes);
app.use('/api', zonasRoutes);   
app.use('/api', destinosRoutes); 
app.use('/api', clientesRoutes);
app.use('/api', usuariosRoutes);
app.use('/api', bodegasRoutes);
app.use('/api', vehiculosRoutes);

// rutas lider
//app.use('/api/lider', liderRoutes);
app.use('/api/lider', pedidosLiderRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});