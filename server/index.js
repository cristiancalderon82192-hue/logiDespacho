const express = require('express');
const cors = require('cors');

// Importar rutas... (tus imports están bien)

const app = express();

// 1. CONFIGURACIÓN DE SEGURIDAD (CORS)
// Al dejarlo así, permites que Vercel se conecte sin problemas
app.use(cors()); 

// 2. CONFIGURACIÓN DE DATOS (JSON) - ¡Hazlo una sola vez y arriba de todo!
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. DEFINICIÓN DE RUTAS
app.use('/api', authRoutes); 
app.use('/api', pedidosRoutes);
app.use('/api', zonasRoutes);   
app.use('/api', destinosRoutes); 
app.use('/api', clientesRoutes);
app.use('/api', usuariosRoutes);
app.use('/api', bodegasRoutes);
app.use('/api', vehiculosRoutes);
app.use('/api/tipos-documento', tiposDocumentoRoutes);

app.use('/api/lider', pedidosLiderRoutes);
app.use('/api/logistica', logisticaRoutes);
app.use('/api/conductor', require('./routes/conductorRoutes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Servidor corriendo en puerto ${PORT}`); });