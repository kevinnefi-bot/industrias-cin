import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de Industrias CIN...");

  // 1. Limpieza controlada en orden inverso de dependencias
  await prisma.auditoriaAccion.deleteMany({});
  await prisma.optimizacionEjecucion.deleteMany({});
  await prisma.registroDano.deleteMany({});
  await prisma.pedidoDetalle.deleteMany({});
  await prisma.movimientoInventario.deleteMany({});
  await prisma.pedido.deleteMany({});
  await prisma.vehiculo.deleteMany({});
  await prisma.almacen.deleteMany({});
  await prisma.producto.deleteMany({});
  await prisma.usuario.deleteMany({});

  // 2. Creación de Usuarios con Roles
  const passwordHash = await bcrypt.hash("cin123456", 10);

  const usuariosData = [
    { email: "admin@cin.com", nombreCompleto: "Ing. Carlos Mendoza (Admin)", rol: "ADMINISTRADOR" },
    { email: "gerencia@cin.com", nombreCompleto: "Lic. Valeria Rosas (Gerencia General)", rol: "GERENCIA" },
    { email: "inventario@cin.com", nombreCompleto: "Marco Aurelio Peña (Jefe Almacenes)", rol: "INVENTARIO" },
    { email: "produccion@cin.com", nombreCompleto: "Ing. Fernando Morales (Jefe Planta)", rol: "PRODUCCION" },
    { email: "distribucion@cin.com", nombreCompleto: "Roberto Gómez (Coordinador Logístico)", rol: "DISTRIBUCION" },
    { email: "calidad@cin.com", nombreCompleto: "Dra. Sofía Alarcón (Control Calidad)", rol: "CALIDAD" },
  ];

  const usuariosCreados: Record<string, any> = {};
  for (const u of usuariosData) {
    const user = await prisma.usuario.create({
      data: {
        email: u.email,
        nombreCompleto: u.nombreCompleto,
        passwordHash,
        rol: u.rol,
        activo: true,
      },
    });
    usuariosCreados[u.rol] = user;
  }
  console.log("✓ Usuarios y roles creados.");

  // 3. Catálogo Oficial de Productos (Líneas: Hervidos y Jugos)
  const productosData = [
    {
      sku: "CIN-HERV-LIM-500",
      nombre: "Hervido de Manzanilla con Limón",
      linea: "HERVIDOS",
      sabor: "Manzanilla y Limón",
      presentacion: "Botella 500ml (Pack x6)",
      volumenLitros: 0.5,
      botellasPorPaquete: 6,
      precioPaquete: 18.00,
      costoProduccionPaquete: 11.50,
      stockMinimoPaquetes: 20,
      stockMaximoPaquetes: 600,
      origenCosto: "RECOPILADO",
    },
    {
      sku: "CIN-HERV-CAN-500",
      nombre: "Hervido Tradicional de Canela y Clavo",
      linea: "HERVIDOS",
      sabor: "Canela y Clavo",
      presentacion: "Botella 500ml (Pack x6)",
      volumenLitros: 0.5,
      botellasPorPaquete: 6,
      precioPaquete: 18.00,
      costoProduccionPaquete: 11.20,
      stockMinimoPaquetes: 15,
      stockMaximoPaquetes: 500,
      origenCosto: "RECOPILADO",
    },
    {
      sku: "CIN-HERV-JNG-1000",
      nombre: "Hervido Concentrado de Jengibre y Miel",
      linea: "HERVIDOS",
      sabor: "Jengibre y Miel",
      presentacion: "Botella 1L (Pack x6)",
      volumenLitros: 1.0,
      botellasPorPaquete: 6,
      precioPaquete: 28.00,
      costoProduccionPaquete: 17.00,
      stockMinimoPaquetes: 25,
      stockMaximoPaquetes: 700,
      origenCosto: "RECOPILADO",
    },
    {
      sku: "CIN-HERV-FRU-1000",
      nombre: "Hervido Artesanal de Frutos Rojos",
      linea: "HERVIDOS",
      sabor: "Frutos Rojos",
      presentacion: "Botella 1L (Pack x6)",
      volumenLitros: 1.0,
      botellasPorPaquete: 6,
      precioPaquete: 30.00,
      costoProduccionPaquete: 18.50,
      stockMinimoPaquetes: 20,
      stockMaximoPaquetes: 600,
      origenCosto: "RECOPILADO",
    },
    {
      sku: "CIN-JUG-NAR-500",
      nombre: "Jugo Natural de Naranja Valencia",
      linea: "JUGOS",
      sabor: "Naranja Valencia",
      presentacion: "Botella 500ml (Pack x6)",
      volumenLitros: 0.5,
      botellasPorPaquete: 6,
      precioPaquete: 22.00,
      costoProduccionPaquete: 14.00,
      stockMinimoPaquetes: 30,
      stockMaximoPaquetes: 800,
      origenCosto: "RECOPILADO",
    },
    {
      sku: "CIN-JUG-MAR-500",
      nombre: "Jugo Tropical de Maracuyá",
      linea: "JUGOS",
      sabor: "Maracuyá",
      presentacion: "Botella 500ml (Pack x6)",
      volumenLitros: 0.5,
      botellasPorPaquete: 6,
      precioPaquete: 24.00,
      costoProduccionPaquete: 15.00,
      stockMinimoPaquetes: 20,
      stockMaximoPaquetes: 600,
      origenCosto: "RECOPILADO",
    },
    {
      sku: "CIN-JUG-MAN-1000",
      nombre: "Jugo Néctar de Mango Criollo",
      linea: "JUGOS",
      sabor: "Mango Criollo",
      presentacion: "Botella 1L (Pack x6)",
      volumenLitros: 1.0,
      botellasPorPaquete: 6,
      precioPaquete: 32.00,
      costoProduccionPaquete: 20.00,
      stockMinimoPaquetes: 30,
      stockMaximoPaquetes: 750,
      origenCosto: "RECOPILADO",
    },
    {
      sku: "CIN-JUG-DUR-1000",
      nombre: "Jugo Néctar de Durazno Selección",
      linea: "JUGOS",
      sabor: "Durazno",
      presentacion: "Botella 1L (Pack x6)",
      volumenLitros: 1.0,
      botellasPorPaquete: 6,
      precioPaquete: 32.00,
      costoProduccionPaquete: 19.80,
      stockMinimoPaquetes: 25,
      stockMaximoPaquetes: 700,
      origenCosto: "RECOPILADO",
    },
  ];

  const productosCreados: Record<string, any> = {};
  for (const p of productosData) {
    const prod = await prisma.producto.create({ data: p });
    productosCreados[p.sku] = prod;
  }
  console.log("✓ Catálogo de 8 productos creado.");

  // 4. Almacenes (Capacidades marcadas como ESTIMADO)
  const almacenesData = [
    {
      codigo: "ALM-CENTRAL",
      nombre: "Almacén Central de Despacho",
      zonaPlanta: "Nave A - Despacho Principal",
      capacidadMaxPaquetes: 5000,
      capacidadVolumetricaM3: 250.0,
      origenCapacidad: "ESTIMADO",
    },
    {
      codigo: "ALM-HERV",
      nombre: "Almacén Intermedio Hervidos",
      zonaPlanta: "Nave B - Línea Hervidos",
      capacidadMaxPaquetes: 2500,
      capacidadVolumetricaM3: 125.0,
      origenCapacidad: "ESTIMADO",
    },
    {
      codigo: "ALM-JUG",
      nombre: "Almacén Intermedio Jugos",
      zonaPlanta: "Nave C - Línea Jugos",
      capacidadMaxPaquetes: 2500,
      capacidadVolumetricaM3: 125.0,
      origenCapacidad: "ESTIMADO",
    },
  ];

  const almacenesCreados: Record<string, any> = {};
  for (const a of almacenesData) {
    const alm = await prisma.almacen.create({ data: a });
    almacenesCreados[a.codigo] = alm;
  }
  console.log("✓ Almacenes creados.");

  // 5. Flota de 6 Camiones
  const vehiculosData = [
    { placa: "CIN-7101", identificador: "Camión 1 - C-01", capacidadCargaKg: 3500, capacidadVolumetricaM3: 18.0, capacidadMaxPaquetes: 450, costoOperativoKm: 2.40, zonaAsignada: "Norte" },
    { placa: "CIN-7102", identificador: "Camión 2 - C-02", capacidadCargaKg: 3500, capacidadVolumetricaM3: 18.0, capacidadMaxPaquetes: 450, costoOperativoKm: 2.40, zonaAsignada: "Norte" },
    { placa: "CIN-7103", identificador: "Camión 3 - C-03", capacidadCargaKg: 4500, capacidadVolumetricaM3: 24.0, capacidadMaxPaquetes: 600, costoOperativoKm: 2.80, zonaAsignada: "Centro" },
    { placa: "CIN-7104", identificador: "Camión 4 - C-04", capacidadCargaKg: 4500, capacidadVolumetricaM3: 24.0, capacidadMaxPaquetes: 600, costoOperativoKm: 2.80, zonaAsignada: "Centro" },
    { placa: "CIN-7105", identificador: "Camión 5 - C-05", capacidadCargaKg: 5500, capacidadVolumetricaM3: 30.0, capacidadMaxPaquetes: 750, costoOperativoKm: 3.20, zonaAsignada: "Sur" },
    { placa: "CIN-7106", identificador: "Camión 6 - C-06", capacidadCargaKg: 5500, capacidadVolumetricaM3: 30.0, capacidadMaxPaquetes: 750, costoOperativoKm: 3.20, zonaAsignada: "Sur" },
  ];

  const vehiculosCreados: any[] = [];
  for (const v of vehiculosData) {
    const veh = await prisma.vehiculo.create({ data: v });
    vehiculosCreados.push(veh);
  }
  console.log("✓ Flota de 6 camiones registrada.");

  // 6. Movimientos Iniciales de Producción (Kardex auditado para pruebas mínimas de stock)
  // Se registran entradas formales de producción con usuario responsable de PRODUCCION
  const produccionUser = usuariosCreados["PRODUCCION"];
  const almCentral = almacenesCreados["ALM-CENTRAL"];

  const stockInicial = [
    { sku: "CIN-HERV-LIM-500", paquetes: 120, motivo: "Lote de Producción Inicial L-H01" },
    { sku: "CIN-HERV-CAN-500", paquetes: 90, motivo: "Lote de Producción Inicial L-H02" },
    { sku: "CIN-HERV-JNG-1000", paquetes: 80, motivo: "Lote de Producción Inicial L-H03" },
    { sku: "CIN-HERV-FRU-1000", paquetes: 75, motivo: "Lote de Producción Inicial L-H04" },
    { sku: "CIN-JUG-NAR-500", paquetes: 150, motivo: "Lote de Producción Inicial L-J01" },
    { sku: "CIN-JUG-MAR-500", paquetes: 110, motivo: "Lote de Producción Inicial L-J02" },
    { sku: "CIN-JUG-MAN-1000", paquetes: 140, motivo: "Lote de Producción Inicial L-J03" },
    { sku: "CIN-JUG-DUR-1000", paquetes: 130, motivo: "Lote de Producción Inicial L-J04" },
  ];

  for (const item of stockInicial) {
    const prod = productosCreados[item.sku];
    const volumenTotal = item.paquetes * prod.botellasPorPaquete * prod.volumenLitros;

    await prisma.movimientoInventario.create({
      data: {
        productoId: prod.id,
        almacenId: almCentral.id,
        tipo: "ENTRADA_PRODUCCION",
        cantidadPaquetes: item.paquetes,
        volumenTotalLitros: volumenTotal,
        motivo: item.motivo,
        origenDato: "RECOPILADO",
        usuarioId: produccionUser.id,
      },
    });
  }
  console.log("✓ Entradas de inventario inicial registradas en Kardex.");

  // 7. Pedidos de Prueba con Estados de Flujo y Fechas Prometidas Originales
  const distribUser = usuariosCreados["DISTRIBUCION"];
  const ahora = new Date();
  
  // Pedido 1: Zona Norte - En tránsito
  const fechaPrometidaP1 = new Date(ahora.getTime() + 4 * 3600 * 1000);
  const p1 = await prisma.pedido.create({
    data: {
      codigo: "PED-2026-001",
      cliente: "Distribuidora Norte SAC",
      zonaDestino: "Norte",
      direccionEntrega: "Av. Los Laureles 450, Trujillo",
      fechaSolicitud: ahora,
      fechaPrometidaOriginal: fechaPrometidaP1,
      fechaDespachoReal: new Date(ahora.getTime() + 1 * 3600 * 1000),
      vehiculoId: vehiculosCreados[0].id,
      estado: "EN_TRANSITO",
      observaciones: "Prioridad matutina",
      usuarioRegistroId: distribUser.id,
      detalles: {
        create: [
          { productoId: productosCreados["CIN-HERV-LIM-500"].id, paquetesSolicitados: 25, paquetesPreparados: 25, paquetesEnviados: 25, precioUnitarioPaquete: 18.00 },
          { productoId: productosCreados["CIN-JUG-NAR-500"].id, paquetesSolicitados: 30, paquetesPreparados: 30, paquetesEnviados: 30, precioUnitarioPaquete: 22.00 },
        ],
      },
    },
  });

  // Salida de inventario contable para PED-2026-001
  await prisma.movimientoInventario.create({
    data: {
      productoId: productosCreados["CIN-HERV-LIM-500"].id,
      almacenId: almCentral.id,
      tipo: "SALIDA_PEDIDO",
      cantidadPaquetes: 25,
      volumenTotalLitros: 25 * 6 * 0.5,
      motivo: "Despacho a pedido PED-2026-001",
      origenDato: "REAL_FUTURO",
      usuarioId: distribUser.id,
      pedidoId: p1.id,
    },
  });

  await prisma.movimientoInventario.create({
    data: {
      productoId: productosCreados["CIN-JUG-NAR-500"].id,
      almacenId: almCentral.id,
      tipo: "SALIDA_PEDIDO",
      cantidadPaquetes: 30,
      volumenTotalLitros: 30 * 6 * 0.5,
      motivo: "Despacho a pedido PED-2026-001",
      origenDato: "REAL_FUTURO",
      usuarioId: distribUser.id,
      pedidoId: p1.id,
    },
  });

  // Pedido 2: Zona Centro - Entregado con ligero retraso para medir cálculo SLA
  const fechaSolicitudP2 = new Date(ahora.getTime() - 24 * 3600 * 1000);
  const fechaPrometidaP2 = new Date(fechaSolicitudP2.getTime() + 5 * 3600 * 1000);
  const fechaEntregaP2 = new Date(fechaPrometidaP2.getTime() + 45 * 60 * 1000); // 45 min retraso

  await prisma.pedido.create({
    data: {
      codigo: "PED-2026-002",
      cliente: "Supermercados El Centro",
      zonaDestino: "Centro",
      direccionEntrega: "Jr. Ayacucho 120, Lima Cercado",
      fechaSolicitud: fechaSolicitudP2,
      fechaPrometidaOriginal: fechaPrometidaP2,
      fechaDespachoReal: new Date(fechaSolicitudP2.getTime() + 2 * 3600 * 1000),
      fechaEntregaReal: fechaEntregaP2,
      vehiculoId: vehiculosCreados[2].id,
      estado: "ENTREGADO",
      observaciones: "Entregado conforme en rampa 2",
      usuarioRegistroId: distribUser.id,
      detalles: {
        create: [
          { productoId: productosCreados["CIN-JUG-MAN-1000"].id, paquetesSolicitados: 20, paquetesPreparados: 20, paquetesEnviados: 20, paquetesEntregados: 20, precioUnitarioPaquete: 32.00 },
          { productoId: productosCreados["CIN-HERV-JNG-1000"].id, paquetesSolicitados: 15, paquetesPreparados: 15, paquetesEnviados: 15, paquetesEntregados: 15, precioUnitarioPaquete: 28.00 },
        ],
      },
    },
  });

  // 8. Registro de Calidad y Daños (con costos estimados)
  const calidadUser = usuariosCreados["CALIDAD"];
  await prisma.registroDano.create({
    data: {
      productoId: productosCreados["CIN-HERV-CAN-500"].id,
      cantidadPaquetes: 2,
      tipoDano: "Botella rota por impacto",
      etapaIncidencia: "Carga",
      zonaAfectada: "Planta",
      vehiculoId: vehiculosCreados[0].id,
      costoPerdidaEstimado: 22.40,
      motivo: "Estiba inadecuada en rampa de carga",
      accionCorrectiva: "Capacitación en protocolo de estiba y uso de esquineros de cartón",
      origenCosto: "ESTIMADO",
      usuarioResponsableId: calidadUser.id,
    },
  });

  // Auditoría inicial
  await prisma.auditoriaAccion.create({
    data: {
      usuarioId: usuariosCreados["ADMINISTRADOR"].id,
      accion: "INICIALIZACION_SISTEMA",
      modulo: "SISTEMA",
      detalles: JSON.stringify({ mensaje: "Sistema inicializado con catálogo y flota de Industrias CIN", timestamp: new Date() }),
      ipOrigen: "127.0.0.1",
    },
  });

  console.log("✓ Seed completado exitosamente para Industrias CIN.");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
