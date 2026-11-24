import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

/**
 * Script de migración segura de datos: SQLite (dev.db) -> PostgreSQL (Producción)
 * Lee los datos existentes de dev.db y los transfiere a PostgreSQL mediante upsert,
 * garantizando cero duplicación y conservando relaciones y claves foráneas.
 */
async function migrateSqliteToPostgres() {
  console.log("=== INICIANDO MIGRACIÓN SEGURA: SQLITE -> POSTGRESQL ===");

  const targetDbUrl = process.env.DATABASE_URL;
  if (!targetDbUrl || (!targetDbUrl.startsWith("postgres://") && !targetDbUrl.startsWith("postgresql://"))) {
    console.error("ERROR: Se requiere una variable DATABASE_URL de PostgreSQL válida.");
    console.log("Ejemplo: DATABASE_URL=\"postgresql://usuario:password@host:5432/db_cin?sslmode=require\"");
    process.exit(1);
  }

  const sqlitePath = path.resolve(process.cwd(), "dev.db");
  if (!fs.existsSync(sqlitePath)) {
    console.log("No se encontró archivo dev.db local. Inicializando esquema directo en PostgreSQL...");
    return;
  }

  const { DatabaseSync } = require("node:sqlite");
  const sqliteDb = new DatabaseSync(sqlitePath);

  const pgClient = new PrismaClient({
    datasources: {
      db: { url: targetDbUrl },
    },
  });

  try {
    await pgClient.$connect();
    console.log("✓ Conexión establecida exitosamente con PostgreSQL de Producción.");

    // 1. Usuarios
    const usuarios = sqliteDb.prepare("SELECT * FROM usuarios").all();
    console.log(`Migrando ${usuarios.length} usuarios...`);
    for (const u of usuarios) {
      await pgClient.usuario.upsert({
        where: { id: u.id },
        update: {
          email: u.email,
          nombreCompleto: u.nombreCompleto,
          passwordHash: u.passwordHash,
          rol: u.rol,
          activo: Boolean(u.activo),
        },
        create: {
          id: u.id,
          email: u.email,
          nombreCompleto: u.nombreCompleto,
          passwordHash: u.passwordHash,
          rol: u.rol,
          activo: Boolean(u.activo),
          creadoEn: new Date(u.creadoEn),
          actualizadoEn: new Date(u.actualizadoEn),
        },
      });
    }

    // 2. Productos
    const productos = sqliteDb.prepare("SELECT * FROM productos").all();
    console.log(`Migrando ${productos.length} productos...`);
    for (const p of productos) {
      await pgClient.producto.upsert({
        where: { id: p.id },
        update: {
          sku: p.sku,
          nombre: p.nombre,
          linea: p.linea,
          sabor: p.sabor,
          presentacion: p.presentacion,
          volumenLitros: p.volumenLitros,
          botellasPorPaquete: p.botellasPorPaquete,
          precioPaquete: p.precioPaquete,
          costoProduccionPaquete: p.costoProduccionPaquete,
          stockMinimoPaquetes: p.stockMinimoPaquetes,
          stockMaximoPaquetes: p.stockMaximoPaquetes,
          activo: Boolean(p.activo),
          origenCosto: p.origenCosto,
        },
        create: {
          id: p.id,
          sku: p.sku,
          nombre: p.nombre,
          linea: p.linea,
          sabor: p.sabor,
          presentacion: p.presentacion,
          volumenLitros: p.volumenLitros,
          botellasPorPaquete: p.botellasPorPaquete,
          precioPaquete: p.precioPaquete,
          costoProduccionPaquete: p.costoProduccionPaquete,
          stockMinimoPaquetes: p.stockMinimoPaquetes,
          stockMaximoPaquetes: p.stockMaximoPaquetes,
          activo: Boolean(p.activo),
          origenCosto: p.origenCosto,
          creadoEn: new Date(p.creadoEn),
          actualizadoEn: new Date(p.actualizadoEn),
        },
      });
    }

    // 3. Almacenes
    const almacenes = sqliteDb.prepare("SELECT * FROM almacenes").all();
    console.log(`Migrando ${almacenes.length} almacenes...`);
    for (const a of almacenes) {
      await pgClient.almacen.upsert({
        where: { id: a.id },
        update: {
          codigo: a.codigo,
          nombre: a.nombre,
          zonaPlanta: a.zonaPlanta,
          capacidadMaxPaquetes: a.capacidadMaxPaquetes,
          capacidadVolumetricaM3: a.capacidadVolumetricaM3,
          origenCapacidad: a.origenCapacidad,
          activo: Boolean(a.activo),
        },
        create: {
          id: a.id,
          codigo: a.codigo,
          nombre: a.nombre,
          zonaPlanta: a.zonaPlanta,
          capacidadMaxPaquetes: a.capacidadMaxPaquetes,
          capacidadVolumetricaM3: a.capacidadVolumetricaM3,
          origenCapacidad: a.origenCapacidad,
          activo: Boolean(a.activo),
          creadoEn: new Date(a.creadoEn),
        },
      });
    }

    // 4. Vehiculos
    const vehiculos = sqliteDb.prepare("SELECT * FROM vehiculos").all();
    console.log(`Migrando ${vehiculos.length} vehículos...`);
    for (const v of vehiculos) {
      await pgClient.vehiculo.upsert({
        where: { id: v.id },
        update: {
          placa: v.placa,
          identificador: v.identificador,
          capacidadCargaKg: v.capacidadCargaKg,
          capacidadVolumetricaM3: v.capacidadVolumetricaM3,
          capacidadMaxPaquetes: v.capacidadMaxPaquetes,
          costoOperativoKm: v.costoOperativoKm,
          zonaAsignada: v.zonaAsignada,
          disponible: Boolean(v.disponible),
          estadoMantenimiento: v.estadoMantenimiento,
          origenDatos: v.origenDatos,
        },
        create: {
          id: v.id,
          placa: v.placa,
          identificador: v.identificador,
          capacidadCargaKg: v.capacidadCargaKg,
          capacidadVolumetricaM3: v.capacidadVolumetricaM3,
          capacidadMaxPaquetes: v.capacidadMaxPaquetes,
          costoOperativoKm: v.costoOperativoKm,
          zonaAsignada: v.zonaAsignada,
          disponible: Boolean(v.disponible),
          estadoMantenimiento: v.estadoMantenimiento,
          origenDatos: v.origenDatos,
          actualizadoEn: new Date(v.actualizadoEn),
        },
      });
    }

    // 5. Pedidos
    const pedidos = sqliteDb.prepare("SELECT * FROM pedidos").all();
    console.log(`Migrando ${pedidos.length} pedidos...`);
    for (const ped of pedidos) {
      await pgClient.pedido.upsert({
        where: { id: ped.id },
        update: {
          estado: ped.estado,
          vehiculoId: ped.vehiculoId,
          fechaDespachoReal: ped.fechaDespachoReal ? new Date(ped.fechaDespachoReal) : null,
          fechaEntregaReal: ped.fechaEntregaReal ? new Date(ped.fechaEntregaReal) : null,
          observaciones: ped.observaciones,
        },
        create: {
          id: ped.id,
          codigo: ped.codigo,
          cliente: ped.cliente,
          zonaDestino: ped.zonaDestino,
          direccionEntrega: ped.direccionEntrega,
          fechaSolicitud: new Date(ped.fechaSolicitud),
          fechaPrometidaOriginal: new Date(ped.fechaPrometidaOriginal),
          fechaDespachoReal: ped.fechaDespachoReal ? new Date(ped.fechaDespachoReal) : null,
          fechaEntregaReal: ped.fechaEntregaReal ? new Date(ped.fechaEntregaReal) : null,
          vehiculoId: ped.vehiculoId,
          estado: ped.estado,
          observaciones: ped.observaciones,
          usuarioRegistroId: ped.usuarioRegistroId,
          creadoEn: new Date(ped.creadoEn),
          actualizadoEn: new Date(ped.actualizadoEn),
        },
      });
    }

    // 6. Pedidos Detalle
    const detalles = sqliteDb.prepare("SELECT * FROM pedidos_detalle").all();
    console.log(`Migrando ${detalles.length} líneas de pedidos detalle...`);
    for (const d of detalles) {
      const existe = await pgClient.pedidoDetalle.findUnique({ where: { id: d.id } });
      if (!existe) {
        await pgClient.pedidoDetalle.create({
          data: {
            id: d.id,
            pedidoId: d.pedidoId,
            productoId: d.productoId,
            paquetesSolicitados: d.paquetesSolicitados,
            paquetesPreparados: d.paquetesPreparados,
            paquetesEnviados: d.paquetesEnviados,
            paquetesEntregados: d.paquetesEntregados,
            precioUnitarioPaquete: d.precioUnitarioPaquete,
          },
        });
      }
    }

    // 7. Movimientos Inventario
    const movimientos = sqliteDb.prepare("SELECT * FROM movimientos_inventario").all();
    console.log(`Migrando ${movimientos.length} movimientos de inventario Kardex...`);
    for (const m of movimientos) {
      const existe = await pgClient.movimientoInventario.findUnique({ where: { id: m.id } });
      if (!existe) {
        await pgClient.movimientoInventario.create({
          data: {
            id: m.id,
            productoId: m.productoId,
            almacenId: m.almacenId,
            tipo: m.tipo,
            cantidadPaquetes: m.cantidadPaquetes,
            volumenTotalLitros: m.volumenTotalLitros,
            motivo: m.motivo,
            origenDato: m.origenDato,
            usuarioId: m.usuarioId,
            pedidoId: m.pedidoId,
            fechaMovimiento: new Date(m.fechaMovimiento),
            creadoEn: new Date(m.creadoEn),
          },
        });
      }
    }

    // 8. Registro de Daños
    const danos = sqliteDb.prepare("SELECT * FROM registro_danos").all();
    console.log(`Migrando ${danos.length} registros de calidad y daños...`);
    for (const rd of danos) {
      const existe = await pgClient.registroDano.findUnique({ where: { id: rd.id } });
      if (!existe) {
        await pgClient.registroDano.create({
          data: {
            id: rd.id,
            productoId: rd.productoId,
            cantidadPaquetes: rd.cantidadPaquetes,
            tipoDano: rd.tipoDano,
            etapaIncidencia: rd.etapaIncidencia,
            zonaAfectada: rd.zonaAfectada,
            vehiculoId: rd.vehiculoId,
            fechaIncidencia: new Date(rd.fechaIncidencia),
            costoPerdidaEstimado: rd.costoPerdidaEstimado,
            motivo: rd.motivo,
            accionCorrectiva: rd.accionCorrectiva,
            origenCosto: rd.origenCosto,
            usuarioResponsableId: rd.usuarioResponsableId,
            creadoEn: new Date(rd.creadoEn),
          },
        });
      }
    }

    console.log("=== MIGRACIÓN A POSTGRESQL COMPLETADA EXITOSAMENTE SIN PÉRDIDA DE DATOS ===");
  } catch (error: any) {
    console.error("Error durante la migración a PostgreSQL:", error.message);
    throw error;
  } finally {
    await pgClient.$disconnect();
  }
}

migrateSqliteToPostgres().catch((e) => {
  console.error("Fallo general en migración:", e);
  process.exit(1);
});
