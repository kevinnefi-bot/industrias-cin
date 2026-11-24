-- ====================================================================
-- INDUSTRIAS CIN - MIGRACIONES COMPLETAS PARA POSTGRESQL / SUPABASE
-- Plataforma Empresarial: Líneas Hervidos y Jugos (Bebidas No Carbonatadas)
-- Incluye: ENUMs, Tablas, Relaciones (FK), Índices, Checks y RLS
-- ====================================================================

-- 1. TIPOS ENUMERADOS
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('ADMINISTRADOR', 'GERENCIA', 'INVENTARIO', 'PRODUCCION', 'DISTRIBUCION', 'CALIDAD');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE origen_dato AS ENUM ('RECOPILADO', 'ESTIMADO', 'REAL_FUTURO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE linea_producto AS ENUM ('HERVIDOS', 'JUGOS');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE estado_pedido AS ENUM ('PENDIENTE', 'CONFIRMADO', 'EN_PREPARACION', 'LISTO', 'EN_TRANSITO', 'ENTREGADO', 'ENTREGADO_PARCIALMENTE', 'RETRASADO', 'CANCELADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_movimiento AS ENUM ('ENTRADA_PRODUCCION', 'SALIDA_PEDIDO', 'DEVOLUCION', 'DANADO', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'REPOSICION', 'TRANSFERENCIA', 'RESERVA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABLAS MAESTRAS
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol rol_usuario NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(64) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    linea linea_producto NOT NULL,
    sabor VARCHAR(120) NOT NULL,
    presentacion VARCHAR(120) NOT NULL,
    volumen_litros NUMERIC(8, 3) NOT NULL CHECK (volumen_litros > 0),
    botellas_por_paquete INTEGER NOT NULL DEFAULT 6 CHECK (botellas_por_paquete > 0),
    precio_paquete NUMERIC(12, 2) NOT NULL CHECK (precio_paquete >= 0),
    costo_produccion_paquete NUMERIC(12, 2) NOT NULL CHECK (costo_produccion_paquete >= 0),
    stock_minimo_paquetes INTEGER NOT NULL DEFAULT 10 CHECK (stock_minimo_paquetes >= 0),
    stock_maximo_paquetes INTEGER NOT NULL DEFAULT 500 CHECK (stock_maximo_paquetes >= stock_minimo_paquetes),
    activo BOOLEAN DEFAULT TRUE,
    origen_costo origen_dato DEFAULT 'RECOPILADO',
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productos_linea_activo ON productos(linea, activo);
CREATE INDEX IF NOT EXISTS idx_productos_sku ON productos(sku);

CREATE TABLE IF NOT EXISTS almacenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(32) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    zona_planta VARCHAR(64) NOT NULL,
    capacidad_max_paquetes INTEGER NOT NULL CHECK (capacidad_max_paquetes > 0),
    capacidad_volumetrica_m3 NUMERIC(10, 2) NOT NULL CHECK (capacidad_volumetrica_m3 > 0),
    origen_capacidad origen_dato DEFAULT 'ESTIMADO',
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placa VARCHAR(20) UNIQUE NOT NULL,
    identificador VARCHAR(50) NOT NULL,
    capacidad_carga_kg NUMERIC(10, 2) NOT NULL CHECK (capacidad_carga_kg > 0),
    capacidad_volumetrica_m3 NUMERIC(10, 2) NOT NULL CHECK (capacidad_volumetrica_m3 > 0),
    capacidad_max_paquetes INTEGER NOT NULL CHECK (capacidad_max_paquetes > 0),
    costo_operativo_km NUMERIC(10, 2) NOT NULL CHECK (costo_operativo_km >= 0),
    zona_asignada VARCHAR(30) NOT NULL CHECK (zona_asignada IN ('Norte', 'Sur', 'Centro', 'Multi-zona')),
    disponible BOOLEAN DEFAULT TRUE,
    estado_mantenimiento VARCHAR(50) DEFAULT 'OPERATIVO',
    origen_datos origen_dato DEFAULT 'ESTIMADO',
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(32) UNIQUE NOT NULL,
    cliente VARCHAR(255) NOT NULL,
    zona_destino VARCHAR(30) NOT NULL CHECK (zona_destino IN ('Norte', 'Sur', 'Centro')),
    direccion_entrega TEXT NOT NULL,
    fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
    fecha_prometida_original TIMESTAMPTZ NOT NULL,
    fecha_despacho_real TIMESTAMPTZ,
    fecha_entrega_real TIMESTAMPTZ,
    vehiculo_id UUID REFERENCES vehiculos(id),
    estado estado_pedido DEFAULT 'PENDIENTE',
    observaciones TEXT,
    usuario_registro_id UUID NOT NULL REFERENCES usuarios(id),
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_estado_zona ON pedidos(estado, zona_destino);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_prometida ON pedidos(fecha_prometida_original);

CREATE TABLE IF NOT EXISTS pedidos_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    paquetes_solicitados INTEGER NOT NULL CHECK (paquetes_solicitados > 0),
    paquetes_preparados INTEGER NOT NULL DEFAULT 0 CHECK (paquetes_preparados >= 0),
    paquetes_enviados INTEGER NOT NULL DEFAULT 0 CHECK (paquetes_enviados >= 0),
    paquetes_entregados INTEGER NOT NULL DEFAULT 0 CHECK (paquetes_entregados >= 0),
    precio_unitario_paquete NUMERIC(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    almacen_id UUID NOT NULL REFERENCES almacenes(id) ON DELETE RESTRICT,
    tipo tipo_movimiento NOT NULL,
    cantidad_paquetes INTEGER NOT NULL CHECK (cantidad_paquetes > 0),
    volumen_total_litros NUMERIC(12, 3) NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    origen_dato origen_dato DEFAULT 'REAL_FUTURO',
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    pedido_id UUID REFERENCES pedidos(id),
    fecha_movimiento TIMESTAMPTZ DEFAULT NOW(),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_producto_fecha ON movimientos_inventario(producto_id, fecha_movimiento);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_inventario(tipo);

CREATE TABLE IF NOT EXISTS registro_danos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad_paquetes INTEGER NOT NULL CHECK (cantidad_paquetes > 0),
    tipo_dano VARCHAR(80) NOT NULL,
    etapa_incidencia VARCHAR(80) NOT NULL,
    zona_afectada VARCHAR(30) CHECK (zona_afectada IN ('Norte', 'Sur', 'Centro', 'Planta')),
    vehiculo_id UUID REFERENCES vehiculos(id),
    fecha_incidencia TIMESTAMPTZ DEFAULT NOW(),
    costo_perdida_estimado NUMERIC(12, 2) NOT NULL CHECK (costo_perdida_estimado >= 0),
    motivo TEXT NOT NULL,
    accion_correctiva TEXT,
    origen_costo origen_dato DEFAULT 'ESTIMADO',
    usuario_responsable_id UUID NOT NULL REFERENCES usuarios(id),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_danos_fecha_etapa ON registro_danos(fecha_incidencia, etapaIncidencia);

CREATE TABLE IF NOT EXISTS optimizacion_ejecuciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modelo_codigo VARCHAR(20) NOT NULL,
    nombre_modelo VARCHAR(150) NOT NULL,
    nombre_escenario VARCHAR(150) NOT NULL,
    es_escenario_base BOOLEAN DEFAULT FALSE,
    parametros_entrada JSONB NOT NULL,
    origen_parametros origen_dato NOT NULL DEFAULT 'ESTIMADO',
    resultado_optimo JSONB NOT NULL,
    valor_objetivo NUMERIC(16, 4),
    es_factible BOOLEAN NOT NULL,
    tiempo_resolucion_ms INTEGER NOT NULL,
    interpretacion TEXT,
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optimizacion_modelo ON optimizacion_ejecuciones(modelo_codigo, creado_en);

CREATE TABLE IF NOT EXISTS auditoria_acciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    accion VARCHAR(100) NOT NULL,
    modulo VARCHAR(50) NOT NULL,
    detalles JSONB NOT NULL,
    ip_origen VARCHAR(45),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_modulo_fecha ON auditoria_acciones(modulo, creado_en);

-- 3. POLÍTICAS DE SEGURIDAD RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_danos ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimizacion_ejecuciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_acciones ENABLE ROW LEVEL SECURITY;

-- Políticas de Acceso Básico para Supabase Auth / Roles
CREATE POLICY "Lectura pública para usuarios autenticados" ON productos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Lectura almacenes usuarios autenticados" ON almacenes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Lectura vehiculos usuarios autenticados" ON vehiculos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Lectura pedidos usuarios autenticados" ON pedidos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Lectura movimientos usuarios autenticados" ON movimientos_inventario FOR SELECT USING (auth.role() = 'authenticated');
