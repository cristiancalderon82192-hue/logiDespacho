const express = require('express');
const cors = require('cors');

// === IMPORTACIÓN DE TODAS LAS RUTAS ===
// (Asegúrate de que los nombres de los archivos en tu carpeta 'routes' coincidan con estos)
const authRoutes = require('./routes/authRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes'); 
const zonasRoutes = require('./routes/zonasRoutes');
const destinosRoutes = require('./routes/destinosRoutes');
const clientesRoutes = require('./routes/clientesRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const bodegasRoutes = require('./routes/bodegasRoutes');
const vehiculosRoutes = require('./routes/vehiculosRoutes');
const tiposDocumentoRoutes = require('./routes/tiposDocumentoRoutes');
const pedidosLiderRoutes = require('./routes/pedidosLiderRoutes');
const logisticaRoutes = require('./routes/logisticaRoutes');
const conductorRoutes = require('./routes/conductorRoutes');

const app = express();

// 1. CONFIGURACIÓN DE SEGURIDAD (CORS)
app.use(cors()); 

// 2. CONFIGURACIÓN DE DATOS (JSON)
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
app.use('/api/conductor', conductorRoutes);

// 4. INICIO DEL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Servidor corriendo en puerto ${PORT}`); });