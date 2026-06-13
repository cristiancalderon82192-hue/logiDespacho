require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io'); 

const db = require('./db'); 

// === IMPORTACIÓN DE TODAS LAS RUTAS ===
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
const movimientosRoutes = require('./routes/movimientosRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const whatsappService = require('./services/whatsappService');
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

// --- RUTAS DEL MÓDULO BODEGA/MOSTRADOR ---
app.use('/api/bodega/dashboard', require('./routes/bodegaDashboardRoutes'));
app.use('/api/bodega/pendientes', require('./routes/bodegaPendientesRoutes'));
app.use('/api/bodega/entregados', require('./routes/bodegaEntregadosRoutes'));
app.use('/api/bodega/reportes', require('./routes/bodegaReportesRoutes'));

// --- RUTAS DE REPORTES INDIVIDUALES ---
app.use('/api/reportes/financiero', require('./routes/financieroRoutes'));
app.use('/api/reportes/productividad', require('./routes/productividadRoutes'));
app.use('/api/reportes/efectividad', require('./routes/efectividadRoutes'));
app.use('/api/reportes/flota', require('./routes/flotaRoutes'));
app.use('/api/reportes/perfectos', require('./routes/perfectosRoutes'));
app.use('/api/reportes/movimientos', movimientosRoutes);
app.use('/api/assistant', require('./routes/assistantRoutes'));
app.use('/api/test', require('./routes/testRoutes'));
app.use('/api/whatsapp', whatsappRoutes);
// ==============================================================
// 4. CONFIGURACIÓN DE WEBSOCKETS (GPS EN TIEMPO REAL Y SESIONES)
// ==============================================================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Guardar io en la app de Express para usarlo en los controladores
app.set('socketio', io);

// Memoria RAM del servidor para guardar el último GPS de cada conductor
const ultimasUbicaciones = {};

io.on('connection', (socket) => {
  console.log('🟢 Nuevo dispositivo conectado al Socket:', socket.id);

  socket.on('registrar_usuario', (datosUsuario) => {
    socket.userId = datosUsuario.id;

    // 👇 CONVERSIÓN SEGURA DEL ROL A TEXTO 👇
    const rolUsuario = String(datosUsuario.role).toLowerCase();

    if (rolUsuario === 'admin' || rolUsuario === 'logistica' || rolUsuario === '1' || rolUsuario === '2' || rolUsuario === '3') {
      socket.join('sala_monitores');
      console.log(`👁️ Monitoreo Activo: Usuario (${datosUsuario.role}) se unió a sala_monitores`);
      
      socket.emit('ubicaciones_iniciales', Object.values(ultimasUbicaciones));
      
    } else if (rolUsuario === 'conductor' || rolUsuario === '4') {
      console.log(`🚗 Conductor en ruta conectado: ID ${datosUsuario.id} | Socket: ${socket.id}`);
    }
  });

  socket.on('enviar_ubicacion', (datosGPS) => {
    ultimasUbicaciones[datosGPS.id_conductor] = datosGPS;
    console.log(`⏱️ [${new Date().toLocaleTimeString()}] GPS recibido de ${datosGPS.nombre}: Lat ${datosGPS.lat}, Lng ${datosGPS.lng}`);
    socket.to('sala_monitores').emit('actualizacion_gps', datosGPS);
  });

// 👇 AHORA: Modo Megáfono (infalible). Se lo manda a todos.
  socket.on('reportar_novedad', (datosNovedad) => {
    console.log(`⚠️ ALERTA: Novedad de ${datosNovedad.conductor} en factura ${datosNovedad.factura}`);
    io.emit('alerta_novedad', datosNovedad);
  });

  socket.on('disconnect', async () => {
    console.log('🔴 Dispositivo desconectado:', socket.id);
    
    if (socket.userId) {
      console.log(`🧹 Limpiando sesión del usuario ID: ${socket.userId} por cierre de navegador...`);
      try {
        await db.query("UPDATE usuarios SET session_token = NULL WHERE id = ?", [socket.userId]);
        console.log(`✅ Token del usuario ${socket.userId} liberado exitosamente en BD.`);
      } catch (error) {
        console.error(`❌ Error al limpiar token del usuario ${socket.userId}:`, error);
      }
    }
  });
});

// ==============================================================
// 5. INICIO DEL SERVIDOR 
// ==============================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { 
  console.log(`🚀 Servidor API y WebSockets corriendo en puerto ${PORT}`); 
});

// Inicializamos el cliente de WhatsApp
// DESACTIVADO TEMPORALMENTE PARA LA PRESENTACIÓN (Ahorro de memoria en Render)
// whatsappService.initialize();