-- ====================================================================
-- MIGRACIÓN INICIAL OFICIAL PARA POSTGRESQL (PRODUCCIÓN RENDER / SUPABASE)
-- Empresa: Industrias CIN
-- ====================================================================

-- 1. Crear extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabla: usuarios
CREATE TABLE IF NOT EXISTS "usuarios" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "nombreCompleto" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "rol" VARCHAR(50) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_email_key" ON "usuarios"("email");

-- 3. Tabla: productos
CREATE TABLE IF NOT EXISTS "productos" (
    "id" TEXT NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "linea" VARCHAR(50) NOT NULL,
    "sabor" VARCHAR(120) NOT NULL,
    "presentacion" VARCHAR(120) NOT NULL,
    "volumenLitros" DOUBLE PRECISION NOT NULL,
    "botellasPorPaquete" INTEGER NOT NULL DEFAULT 6,
    "precioPaquete" DOUBLE PRECISION NOT NULL,
    "costoProduccionPaquete" DOUBLE PRECISION NOT NULL,
    "stockMinimoPaquetes" INTEGER NOT NULL DEFAULT 10,
    "stockMaximoPaquetes" INTEGER NOT NULL DEFAULT 500,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "origenCosto" VARCHAR(30) NOT NULL DEFAULT 'RECOPILADO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "productos_sku_key" ON "productos"("sku");
CREATE INDEX IF NOT EXISTS "productos_linea_activo_idx" ON "productos"("linea", "activo");
CREATE INDEX IF NOT EXISTS "productos_sku_idx" ON "productos"("sku");

-- 4. Tabla: almacenes
CREATE TABLE IF NOT EXISTS "almacenes" (
    "id" TEXT NOT NULL,
    "codigo" VARCHAR(32) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "zonaPlanta" VARCHAR(64) NOT NULL,
    "capacidadMaxPaquetes" INTEGER NOT NULL,
    "capacidadVolumetricaM3" DOUBLE PRECISION NOT NULL,
    "origenCapacidad" VARCHAR(30) NOT NULL DEFAULT 'ESTIMADO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "almacenes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "almacenes_codigo_key" ON "almacenes"("codigo");

-- 5. Tabla: vehiculos
CREATE TABLE IF NOT EXISTS "vehiculos" (
    "id" TEXT NOT NULL,
    "placa" VARCHAR(20) NOT NULL,
    "identificador" VARCHAR(50) NOT NULL,
    "capacidadCargaKg" DOUBLE PRECISION NOT NULL,
    "capacidadVolumetricaM3" DOUBLE PRECISION NOT NULL,
    "capacidadMaxPaquetes" INTEGER NOT NULL,
    "costoOperativoKm" DOUBLE PRECISION NOT NULL,
    "zonaAsignada" VARCHAR(30) NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "estadoMantenimiento" VARCHAR(50) NOT NULL DEFAULT 'OPERATIVO',
    "origenDatos" VARCHAR(30) NOT NULL DEFAULT 'ESTIMADO',
    "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehiculos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vehiculos_placa_key" ON "vehiculos"("placa");

-- 6. Tabla: pedidos
CREATE TABLE IF NOT EXISTS "pedidos" (
    "id" TEXT NOT NULL,
    "codigo" VARCHAR(32) NOT NULL,
    "cliente" VARCHAR(255) NOT NULL,
    "zonaDestino" VARCHAR(30) NOT NULL,
    "direccionEntrega" TEXT NOT NULL,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaPrometidaOriginal" TIMESTAMP(3) NOT NULL,
    "fechaDespachoReal" TIMESTAMP(3),
    "fechaEntregaReal" TIMESTAMP(3),
    "vehiculoId" TEXT,
    "estado" VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "usuarioRegistroId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pedidos_codigo_key" ON "pedidos"("codigo");
CREATE INDEX IF NOT EXISTS "pedidos_estado_zonaDestino_idx" ON "pedidos"("estado", "zonaDestino");
CREATE INDEX IF NOT EXISTS "pedidos_fechaPrometidaOriginal_idx" ON "pedidos"("fechaPrometidaOriginal");

-- 7. Tabla: pedidos_detalle
CREATE TABLE IF NOT EXISTS "pedidos_detalle" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "paquetesSolicitados" INTEGER NOT NULL,
    "paquetesPreparados" INTEGER NOT NULL DEFAULT 0,
    "paquetesEnviados" INTEGER NOT NULL DEFAULT 0,
    "paquetesEntregados" INTEGER NOT NULL DEFAULT 0,
    "precioUnitarioPaquete" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "pedidos_detalle_pkey" PRIMARY KEY ("id")
);

-- 8. Tabla: movimientos_inventario
CREATE TABLE IF NOT EXISTS "movimientos_inventario" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "cantidadPaquetes" INTEGER NOT NULL,
    "volumenTotalLitros" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT NOT NULL,
    "origenDato" VARCHAR(30) NOT NULL DEFAULT 'REAL_FUTURO',
    "usuarioId" TEXT NOT NULL,
    "pedidoId" TEXT,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "movimientos_inventario_productoId_fechaMovimiento_idx" ON "movimientos_inventario"("productoId", "fechaMovimiento");
CREATE INDEX IF NOT EXISTS "movimientos_inventario_tipo_idx" ON "movimientos_inventario"("tipo");

-- 9. Tabla: registro_danos
CREATE TABLE IF NOT EXISTS "registro_danos" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidadPaquetes" INTEGER NOT NULL,
    "tipoDano" VARCHAR(80) NOT NULL,
    "etapaIncidencia" VARCHAR(80) NOT NULL,
    "zonaAfectada" VARCHAR(30),
    "vehiculoId" TEXT,
    "fechaIncidencia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "costoPerdidaEstimado" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT NOT NULL,
    "accionCorrectiva" TEXT,
    "origenCosto" VARCHAR(30) NOT NULL DEFAULT 'ESTIMADO',
    "usuarioResponsableId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_danos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "registro_danos_etapaIncidencia_idx" ON "registro_danos"("etapaIncidencia");
CREATE INDEX IF NOT EXISTS "registro_danos_fechaIncidencia_idx" ON "registro_danos"("fechaIncidencia");

-- 10. Tabla: optimizacion_ejecuciones
CREATE TABLE IF NOT EXISTS "optimizacion_ejecuciones" (
    "id" TEXT NOT NULL,
    "modeloCodigo" VARCHAR(20) NOT NULL,
    "nombreModelo" VARCHAR(150) NOT NULL,
    "nombreEscenario" VARCHAR(150) NOT NULL,
    "esEscenarioBase" BOOLEAN NOT NULL DEFAULT false,
    "parametrosEntrada" TEXT NOT NULL,
    "origenParametros" VARCHAR(30) NOT NULL DEFAULT 'ESTIMADO',
    "resultadoOptimo" TEXT NOT NULL,
    "valorObjetivo" DOUBLE PRECISION,
    "esFactible" BOOLEAN NOT NULL,
    "tiempoResolucionMs" INTEGER NOT NULL,
    "interpretacion" TEXT,
    "usuarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optimizacion_ejecuciones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "optimizacion_ejecuciones_modeloCodigo_creadoEn_idx" ON "optimizacion_ejecuciones"("modeloCodigo", "creadoEn");

-- 11. Tabla: auditoria_acciones
CREATE TABLE IF NOT EXISTS "auditoria_acciones" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" VARCHAR(100) NOT NULL,
    "modulo" VARCHAR(50) NOT NULL,
    "detalles" TEXT NOT NULL,
    "ipOrigen" VARCHAR(45),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_acciones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "auditoria_acciones_modulo_creadoEn_idx" ON "auditoria_acciones"("modulo", "creadoEn");

-- 12. Relaciones y Claves Foráneas (Foreign Keys)
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "vehiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_usuarioRegistroId_fkey" FOREIGN KEY ("usuarioRegistroId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pedidos_detalle" ADD CONSTRAINT "pedidos_detalle_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pedidos_detalle" ADD CONSTRAINT "pedidos_detalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "registro_danos" ADD CONSTRAINT "registro_danos_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registro_danos" ADD CONSTRAINT "registro_danos_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "vehiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "registro_danos" ADD CONSTRAINT "registro_danos_usuarioResponsableId_fkey" FOREIGN KEY ("usuarioResponsableId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "optimizacion_ejecuciones" ADD CONSTRAINT "optimizacion_ejecuciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auditoria_acciones" ADD CONSTRAINT "auditoria_acciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
