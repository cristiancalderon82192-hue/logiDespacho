require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http'); // <-- NUEVO: Importación nativa de Node para servidores HTTP
const { Server } = require('socket.io'); // <-- NUEVO: Importación de WebSockets

// 👇 AÑADIDO: Importamos la conexión a tu BD para poder limpiar los tokens 👇
// (Asegúrate de que la ruta sea correcta, usualmente es './db' o './config/db')
const db = require('./db'); 

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

// --- RUTAS DE REPORTES INDIVIDUALES ---
app.use('/api/reportes/financiero', require('./routes/financieroRoutes'));
app.use('/api/reportes/productividad', require('./routes/productividadRoutes'));
app.use('/api/reportes/efectividad', require('./routes/efectividadRoutes'));
app.use('/api/reportes/flota', require('./routes/flotaRoutes'));
app.use('/api/reportes/perfectos', require('./routes/perfectosRoutes'));

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

// Memoria RAM del servidor para guardar el último GPS de cada conductor
const ultimasUbicaciones = {};

io.on('connection', (socket) => {
  console.log('🟢 Nuevo dispositivo conectado al Socket:', socket.id);

  socket.on('registrar_usuario', (datosUsuario) => {
    // 👇 AÑADIDO: Guardamos el ID del usuario en este socket específico para saber quién es cuando se vaya
    socket.userId = datosUsuario.id;

    if (datosUsuario.role === 'admin' || datosUsuario.role === 'logistica') {
      socket.join('sala_monitores');
      console.log(`👁️ Monitoreo Activo: Usuario (${datosUsuario.role}) se unió a sala_monitores`);
      
      // Apenas el monitor entra, le mandamos la "foto actual" de todos los carros en memoria
      socket.emit('ubicaciones_iniciales', Object.values(ultimasUbicaciones));
      
    } else if (datosUsuario.role === 'conductor') {
      console.log(`🚗 Conductor en ruta conectado: ID ${datosUsuario.id} | Socket: ${socket.id}`);
    }
  });

  socket.on('enviar_ubicacion', (datosGPS) => {
    // 1. Actualizamos la posición en la memoria del servidor
    ultimasUbicaciones[datosGPS.id_conductor] = datosGPS;

    // 2. NUEVO: Imprimimos en la terminal del backend cada vez que llega un reporte
    console.log(`⏱️ [${new Date().toLocaleTimeString()}] GPS recibido de ${datosGPS.nombre}: Lat ${datosGPS.lat}, Lng ${datosGPS.lng}`);

    // 3. Rebotamos la info a la sala de monitores
    socket.to('sala_monitores').emit('actualizacion_gps', datosGPS);
  });

  // 👇 MODIFICADO: Evento de desconexión blindado con limpieza de Base de Datos 👇
  socket.on('disconnect', async () => {
    console.log('🔴 Dispositivo desconectado:', socket.id);
    
    // Si este socket tenía un ID de usuario registrado, limpiamos su sesión
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