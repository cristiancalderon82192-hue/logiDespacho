# LogiDespacho

> Sistema web de gestión logística para el control integral de despachos, rutas, conductores y reportes operativos.
> 
## Tabla de Contenidos

- [Descripción](#descripción)
- [Funcionalidades](#funcionalidades)
- [Tecnologías](#tecnologías)
- [Arquitectura del Proyecto](#arquitectura-del-proyecto)
- [Instalación](#instalación)
- [Variables de Entorno](#variables-de-entorno)
- [Documentación API](#documentación-api)
- [Roles del Sistema](#roles-del-sistema)
- [Módulos del Sistema](#módulos-del-sistema)

---

## Descripción

**LogiDespacho** es una plataforma full-stack diseñada para empresas de distribución y logística. Permite gestionar el ciclo completo de un pedido: desde su registro por el líder de zona, pasando por la asignación de rutas por logística, la ejecución del conductor en campo, hasta la generación de reportes gerenciales.

El sistema maneja múltiples roles de usuario con vistas y permisos diferenciados, control de bodegas, seguimiento de flota vehicular y recaudo en tiempo real.

---

## Funcionalidades

### Gestión de Pedidos
- Registro de pedidos con validación de factura duplicada
- Soporte para múltiples bodegas de salida (hasta 8 bodegas por pedido)
- Control de peso por bodega y valor de factura
- Dashboard con KPIs: total pedidos, valor facturado y kilos despachados
- Edición y eliminación de pedidos con trazabilidad

### Módulo de Logística
- Vista diaria de pedidos agendados con filtro por fecha
- Asignación de conductor y vehículo a cada pedido
- Cálculo automático de valor factura pendiente al despachar parcialmente
- Gestión de **pedidos parciales**: creación de un pedido hijo (saldo) cuando hay deuda pendiente
- Liberación de asignaciones con un clic

### Módulo del Conductor
- Vista de rutas asignadas del día
- Actualización de estado en tiempo real: `En Ruta`, `Entregado`, `Entregado Incompleto`, `Devolución`
- Registro de recaudo real al momento de la entrega
- Captura de firma digital del cliente
- Registro de hora con ajuste a zona horaria Colombia (UTC-5)

### Vista del Líder de Zona
- Dashboard personalizado filtrado por `usuario_id`
- Gráfica de comportamiento diario de pedidos
- Consulta de pedidos propios por fecha con estado de entrega y saldos

### Reportes Gerenciales

| Reporte | Descripción |
|---|---|
| **Productividad** | Entregas, devoluciones y kilos por conductor |
| **Flota** | Porcentaje de ocupación por vehículo |
| **Pedidos Perfectos** | Entregas a tiempo en la jornada correcta |
| **Efectividad** | Cumplimiento vs fecha promesa |
| **Financiero** | Valor facturado vs valor recaudado |

### Administración
- CRUD completo de: Usuarios, Bodegas, Clientes, Vehículos, Zonas, Destinos y Tipos de Documento
- Validación de llaves únicas (placa, documento, email, factura)
- Protección de eliminación con detección de referencias activas

---

## Tecnologías

### Backend

| Tecnología | Uso |
|---|---|
| Node.js + Express | Servidor y API REST |
| MySQL | Base de datos relacional |
| JWT (jsonwebtoken) | Autenticación y autorización |
| bcrypt | Encriptación de contraseñas |
| swagger-ui-express + yamljs | Documentación de la API |

### Frontend

| Tecnología | Uso |
|---|---|
| React 18 | Interfaz de usuario |
| React Router | Navegación entre vistas |

---

## Arquitectura del Proyecto

```
LogiDespacho/
│
├── LOGISTICA-DESPACHO/              # Frontend — React + Vite + Tailwind
│   ├── public/
│   ├── src/
│   │   ├── assets/                  # Recursos estáticos
│   │   │   ├── logoitsoluciones.png
│   │   │   ├── rodeo.png
│   │   │   └── rodeo.svg
│   │   ├── components/              # Componentes reutilizables
│   │   │   ├── ProtectedRoute.jsx   # Guard de rutas por rol
│   │   │   └── Sidebar.jsx          # Navegación lateral
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Estado global de autenticación (JWT)
│   │   └── pages/                   # Vistas por módulo
│   │       ├── Login.jsx
│   │       ├── AdminDashboard.jsx
│   │       ├── PedidosAdmin.jsx
│   │       ├── PedidosLider.jsx
│   │       ├── AsignacionLogistica.jsx
│   │       ├── DashboardLogistica.jsx
│   │       ├── DashboardLider.jsx
│   │       ├── DashboardConductor.jsx
│   │       ├── RutaConductor.jsx
│   │       ├── RegisterUser.jsx
│   │       ├── Bodegas.jsx
│   │       ├── Clientes.jsx
│   │       ├── Destinos.jsx
│   │       ├── Zonas.jsx
│   │       ├── TiposDocumentos.jsx
│   │       ├── Flota.jsx
│   │       ├── ReporteProductividad.jsx
│   │       ├── ReporteFlota.jsx
│   │       ├── ReportePerfectos.jsx
│   │       ├── ReporteEfectividad.jsx
│   │       ├── ReporteFinanciero.jsx
│   │       ├── ReporteParciales.jsx
│   │       └── ReporteLeadTime.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── index.html
│   ├── index.css
│   ├── main.jsx
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── vercel.json
│   ├── .env
│   ├── .gitignore
│   └── package.json
│
└── SERVER/                          # Backend — Node.js + Express
    ├── controllers/                 # Lógica de negocio por módulo
    │   ├── authController.js
    │   ├── usuariosController.js
    │   ├── pedidosController.js
    │   ├── pedidosLiderController.js
    │   ├── logisticaController.js
    │   ├── conductorController.js
    │   ├── liderController.js
    │   ├── clientesController.js
    │   ├── vehiculosController.js
    │   ├── bodegasController.js
    │   ├── zonasController.js
    │   ├── destinosController.js
    │   ├── tiposDocumentoController.js
    │   ├── flotaController.js
    │   ├── productividadController.js
    │   ├── perfectosController.js
    │   ├── efectividadController.js
    │   └── financieroController.js
    ├── routes/                      # Definición de rutas Express
    │   ├── authRoutes.js
    │   ├── usuariosRoutes.js
    │   ├── pedidosRoutes.js
    │   ├── pedidosLiderRoutes.js
    │   ├── logisticaRoutes.js
    │   ├── conductorRoutes.js
    │   ├── liderRoutes.js
    │   ├── clientesRoutes.js
    │   ├── vehiculosRoutes.js
    │   ├── bodegasRoutes.js
    │   ├── zonasRoutes.js
    │   ├── destinosRoutes.js
    │   ├── tiposDocumentoRoutes.js
    │   ├── flotaRoutes.js
    │   ├── productividadRoutes.js
    │   ├── perfectosRoutes.js
    │   ├── efectividadRoutes.js
    │   └── financieroRoutes.js
    ├── db.js                        # Conexión al pool de MySQL
    ├── index.js                     # Punto de entrada del servidor
    ├── swagger.js                   # Configuración Swagger UI
    ├── swagger.yaml                 # Especificación OpenAPI 3.0
    ├── .env
    └── package.json
```

---

## Instalación

### Requisitos previos
- Node.js 18 o superior
- MySQL 8.0
- npm o yarn

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/logidespacho.git
cd logidespacho
```

### 2. Configurar el Backend

```bash
cd server
npm install
```

Crea el archivo `.env` en la carpeta `server/` (ver sección [Variables de Entorno](#variables-de-entorno)).

Importa la base de datos:

```bash
mysql -u root -p logidespacho < database/logidespacho.sql
```

Inicia el servidor:

```bash
npm run dev      # Modo desarrollo (nodemon)
npm start        # Modo producción
```

### 3. Configurar el Frontend

```bash
cd ../client
npm install
npm start
```

### 4. Verificar que todo funciona

| Servicio | URL por defecto |
|---|---|
| API Backend | `http://localhost:3000` |
| Frontend React | `http://localhost:5173` |
| Documentación Swagger | `http://localhost:3000/api-docs` |

---

## Variables de Entorno

Crea un archivo `.env` en la carpeta `server/`:

```env
# Servidor
PORT=3000

# Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=logidespacho

# Autenticación
JWT_SECRET=tu_clave_secreta_aqui
```

> **Importante:** nunca subas el archivo `.env` a GitHub. Asegúrate de que esté incluido en tu `.gitignore`.

---

## Documentación API

La API está completamente documentada con **Swagger UI / OpenAPI 3.0**.

Una vez levantado el servidor, accede a:

```
http://localhost:3000/api-docs
```

La documentación incluye todos los endpoints, parámetros, cuerpos de solicitud y respuestas posibles. Para endpoints protegidos, usa el botón **Authorize** e ingresa tu token JWT con el formato:

```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Roles del Sistema

| rol_id | Nombre | Acceso |
|---|---|---|
| 1 | Administrador | Acceso total al sistema |
| 2 | Gerente | Reportes y KPIs |
| 3 | Logística | Asignación de rutas y conductores |
| 4 | Conductor | Vista de rutas y actualización de estado |
| 5 | Líder de Zona | Registro y consulta de sus propios pedidos |

---

## Módulos del Sistema

### Autenticación (`/api/auth`)
- Login con JWT (token válido por 8 horas)
- Verificación de estado de cuenta (activo/inactivo)
- Compatibilidad con contraseñas en texto plano y bcrypt (migración progresiva)

### Pedidos (`/api/pedidos`)
- CRUD completo
- Dashboard con KPIs por rango de fechas
- Desglose de peso por hasta 8 bodegas

### Logística (`/api/logistica`)
- Vista diaria, asignación y remoción de asignación
- Reporte y despacho de saldos parciales

### Conductor (`/api/conductor`)
- Rutas del día
- Actualización de estado con hora Colombia (UTC-5)

### Líder (`/api/lider`)
- Dashboard con gráfica de comportamiento
- Pedidos del día filtrados por usuario

### Reportes (`/api/reportes`)
- `/productividad` · `/flota` · `/perfectos` · `/efectividad` · `/financiero`

### Catálogos
- `/usuarios` · `/bodegas` · `/clientes` · `/vehiculos` · `/zonas` · `/destinos` · `/tipos-documento`

---

## Licencia

Este proyecto fue desarrollado con fines académicos universitarios.

---

<p align="center">LogiDespacho</p>
