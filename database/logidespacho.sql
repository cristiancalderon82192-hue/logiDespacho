CREATE DATABASE IF NOT EXISTS `logidespacho` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `logidespacho`;

CREATE TABLE `bodegas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `clientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `documento` varchar(50) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `direccion_exacta` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `documento` (`documento`)
);

CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
);

CREATE TABLE `tipos_documento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
);

CREATE TABLE `vehiculos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `placa` varchar(20) NOT NULL,
  `modelo` varchar(100) DEFAULT NULL,
  `capacidad_kg` decimal(10,2) DEFAULT '0.00',
  `estado` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `placa` (`placa`)
);

CREATE TABLE `zonas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
); 

CREATE TABLE `destinos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `zona_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `zona_id` (`zona_id`),
  CONSTRAINT `destinos_ibfk_1` FOREIGN KEY (`zona_id`) REFERENCES `zonas` (`id`)
);

CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_completo` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `rol_id` int NOT NULL,
  `estado` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `bodega_id` int DEFAULT NULL,
  `session_token` varchar(512) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `rol_id` (`rol_id`),
  KEY `fk_usuarios_bodegas` (`bodega_id`),
  CONSTRAINT `fk_usuarios_bodegas` FOREIGN KEY (`bodega_id`) REFERENCES `bodegas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`)
);

CREATE TABLE `bodega_pendientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fecha_factura` date NOT NULL,
  `factura_num` varchar(50) NOT NULL,
  `punto_venta_id` int NOT NULL,
  `cliente_id` int NOT NULL,
  `fecha_promesa` date DEFAULT NULL,
  `tipo_entrega` varchar(50) DEFAULT 'Retiro Bodega',
  `estado` enum('Pendiente','Parcial','Entregado') DEFAULT 'Pendiente',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `usuario_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `factura_num` (`factura_num`),
  KEY `cliente_id` (`cliente_id`),
  KEY `punto_venta_id` (`punto_venta_id`),
  CONSTRAINT `bodega_pendientes_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  CONSTRAINT `bodega_pendientes_ibfk_2` FOREIGN KEY (`punto_venta_id`) REFERENCES `bodegas` (`id`)
);

CREATE TABLE `bodega_entregas_historial` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pendiente_id` int NOT NULL,
  `factura_num` varchar(50) NOT NULL,
  `productos_entregados` text NOT NULL,
  `firma_cliente` longtext NOT NULL,
  `firma_bodeguero` longtext NOT NULL,
  `fecha_entrega` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `usuario_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `pendiente_id` (`pendiente_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `bodega_entregas_historial_ibfk_1` FOREIGN KEY (`pendiente_id`) REFERENCES `bodega_pendientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bodega_entregas_historial_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
);

CREATE TABLE `bodega_pendientes_detalle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pendiente_id` int NOT NULL,
  `codigo_producto` varchar(50) NOT NULL,
  `nombre_producto` varchar(150) NOT NULL,
  `cantidad_pendiente` decimal(10,2) NOT NULL,
  `cantidad_entregada` decimal(10,2) DEFAULT '0.00',
  `unidad_medida` varchar(20) NOT NULL,
  `bodega_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `pendiente_id` (`pendiente_id`),
  KEY `bodega_id` (`bodega_id`),
  CONSTRAINT `bodega_pendientes_detalle_ibfk_1` FOREIGN KEY (`pendiente_id`) REFERENCES `bodega_pendientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bodega_pendientes_detalle_ibfk_2` FOREIGN KEY (`bodega_id`) REFERENCES `bodegas` (`id`)
);

CREATE TABLE `pedidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `cliente_id` int NOT NULL,
  `id_factura` varchar(50) NOT NULL,
  `tipo_documento_id` int DEFAULT NULL,
  `prioridad` enum('Alta','Media','Baja') DEFAULT 'Media',
  `valor_factura` decimal(15,2) DEFAULT '0.00',
  `destino_id` int NOT NULL,
  `conductor_id` int DEFAULT NULL,
  `vehiculo_id` int DEFAULT NULL,
  `estado_entrega` enum('Pendiente','Asignado','En Ruta','Entregado','Entregado Incompleto','Devolución') DEFAULT 'Pendiente',
  `fecha_agendada` date DEFAULT NULL,
  `fecha_entrega_conductor` datetime DEFAULT NULL,
  `observaciones_entrega` text,
  `fecha_facturacion` date DEFAULT NULL,
  `fecha_promesa` date DEFAULT NULL,
  `hora_registro` time DEFAULT NULL,
  `nota_manual` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total_despachado` decimal(10,2) DEFAULT '0.00',
  `valor_factura_pendiente` decimal(10,2) DEFAULT '0.00',
  `firma_cliente` longtext,
  `valor_recaudado` decimal(50,2) DEFAULT '0.00',
  `numero_viaje` int DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `cliente_id` (`cliente_id`),
  KEY `destino_id` (`destino_id`),
  KEY `conductor_id` (`conductor_id`),
  KEY `fk_pedidos_vehiculo` (`vehiculo_id`),
  KEY `fk_tipo_documento` (`tipo_documento_id`),
  CONSTRAINT `fk_pedidos_vehiculo` FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos` (`id`),
  CONSTRAINT `fk_tipo_documento` FOREIGN KEY (`tipo_documento_id`) REFERENCES `tipos_documento` (`id`),
  CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `pedidos_ibfk_2` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  CONSTRAINT `pedidos_ibfk_3` FOREIGN KEY (`destino_id`) REFERENCES `destinos` (`id`),
  CONSTRAINT `pedidos_ibfk_4` FOREIGN KEY (`conductor_id`) REFERENCES `usuarios` (`id`)
);

CREATE TABLE `pedidos_detalle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int NOT NULL,
  `bodega_id` int NOT NULL,
  `peso` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `pedidos_detalle_ibfk_1` (`pedido_id`),
  KEY `pedidos_detalle_ibfk_2` (`bodega_id`),
  CONSTRAINT `pedidos_detalle_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pedidos_detalle_ibfk_2` FOREIGN KEY (`bodega_id`) REFERENCES `bodegas` (`id`) ON DELETE RESTRICT
);
