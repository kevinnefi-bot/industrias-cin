import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { ProductStockInfo, TipoMovimiento, OrigenDato } from "@/types";

const TIPOS_ENTRADA = new Set(["ENTRADA_PRODUCCION", "DEVOLUCION", "AJUSTE_POSITIVO", "REPOSICION"]);
const TIPOS_SALIDA = new Set(["SALIDA_PEDIDO", "DANADO", "AJUSTE_NEGATIVO"]);

function aplicarMovimiento(balance: number, tipo: string, cantidad: number): number {
  if (TIPOS_ENTRADA.has(tipo)) return balance + cantidad;
  if (TIPOS_SALIDA.has(tipo)) return balance - cantidad;
  return balance;
}

export async function obtenerStockPorProducto(
  productoId: string,
  almacenId?: string
): Promise<number> {
  const movimientos = await prisma.movimientoInventario.findMany({
    where: { productoId, ...(almacenId ? { almacenId } : {}) },
    select: { tipo: true, cantidadPaquetes: true },
  });

  return movimientos.reduce(
    (balance, movimiento) =>
      aplicarMovimiento(balance, movimiento.tipo, movimiento.cantidadPaquetes),
    0
  );
}

export async function obtenerResumenInventario(): Promise<ProductStockInfo[]> {
  const productos = await prisma.producto.findMany({
    orderBy: [{ linea: "asc" }, { nombre: "asc" }],
  });

  const todosMovimientos = await prisma.movimientoInventario.findMany({
    select: { productoId: true, tipo: true, cantidadPaquetes: true },
  });

  // Movimientos agrupados por producto
  const balances = new Map<string, number>();
  for (const m of todosMovimientos) {
    balances.set(
      m.productoId,
      aplicarMovimiento(balances.get(m.productoId) || 0, m.tipo, m.cantidadPaquetes)
    );
  }

  // Stock comprometido en pedidos pendientes o en preparación
  const pedidosPendientes = await prisma.pedidoDetalle.findMany({
    where: {
      pedido: {
        estado: { in: ["PENDIENTE", "CONFIRMADO", "EN_PREPARACION"] },
      },
    },
    select: {
      productoId: true,
      paquetesSolicitados: true,
      paquetesEnviados: true,
    },
  });

  const comprometidos: Record<string, number> = {};
  for (const p of pedidosPendientes) {
    const restante = Math.max(0, p.paquetesSolicitados - p.paquetesEnviados);
    comprometidos[p.productoId] = (comprometidos[p.productoId] || 0) + restante;
  }

  return productos.map((prod) => {
    const stockActual = balances.get(prod.id) || 0;
    const stockComprometido = comprometidos[prod.id] || 0;
    const stockDisponible = Math.max(0, stockActual - stockComprometido);

    let estadoStock: "NORMAL" | "MINIMO" | "CRITICO" | "SOBREINVENTARIO" = "NORMAL";
    if (stockActual <= 0) {
      estadoStock = "CRITICO";
    } else if (stockActual <= prod.stockMinimoPaquetes) {
      estadoStock = "MINIMO";
    } else if (stockActual >= prod.stockMaximoPaquetes) {
      estadoStock = "SOBREINVENTARIO";
    }

    return {
      id: prod.id,
      sku: prod.sku,
      nombre: prod.nombre,
      linea: prod.linea,
      sabor: prod.sabor,
      presentacion: prod.presentacion,
      volumenLitros: prod.volumenLitros,
      botellasPorPaquete: prod.botellasPorPaquete,
      precioPaquete: prod.precioPaquete,
      costoProduccionPaquete: prod.costoProduccionPaquete,
      stockMinimoPaquetes: prod.stockMinimoPaquetes,
      stockMaximoPaquetes: prod.stockMaximoPaquetes,
      activo: prod.activo,
      origenCosto: prod.origenCosto as OrigenDato,
      stockActualPaquetes: stockActual,
      stockActualBotellas: stockActual * prod.botellasPorPaquete,
      stockActualLitros: Number((stockActual * prod.botellasPorPaquete * prod.volumenLitros).toFixed(2)),
      stockDisponiblePaquetes: stockDisponible,
      stockComprometidoPaquetes: stockComprometido,
      estadoStock,
    };
  });
}

type MovimientoInventarioData = {
  productoId: string;
  almacenId: string;
  tipo: TipoMovimiento;
  cantidadPaquetes: number;
  motivo: string;
  usuarioId: string;
  origenDato?: OrigenDato;
  pedidoId?: string;
};

export async function conTransaccionSerializable<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  for (let intento = 0; intento < 3; intento++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const esConflictoSerializable =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!esConflictoSerializable || intento === 2) throw error;
    }
  }
  throw new Error("No se pudo completar la transacción después de varios intentos.");
}

export async function registrarMovimientoEnTransaccion(
  tx: Prisma.TransactionClient,
  data: MovimientoInventarioData
) {
  if (!Number.isInteger(data.cantidadPaquetes) || data.cantidadPaquetes <= 0) {
    throw new Error("La cantidad de paquetes debe ser estrictamente mayor a 0.");
  }
  if (data.tipo === "TRANSFERENCIA" || data.tipo === "RESERVA") {
    throw new Error(`El tipo de movimiento ${data.tipo} aún no está implementado.`);
  }

  const producto = await tx.producto.findUnique({
    where: { id: data.productoId },
  });
  if (!producto) {
    throw new Error(`Producto con ID ${data.productoId} no encontrado.`);
  }

  const almacen = await tx.almacen.findUnique({
    where: { id: data.almacenId },
  });
  if (!almacen) {
    throw new Error(`Almacén con ID ${data.almacenId} no encontrado.`);
  }

  const esSalida = TIPOS_SALIDA.has(data.tipo);

  if (esSalida) {
    const movimientos = await tx.movimientoInventario.findMany({
      where: { productoId: data.productoId, almacenId: data.almacenId },
      select: { tipo: true, cantidadPaquetes: true },
    });

    const stockActual = movimientos.reduce(
      (balance, movimiento) =>
        aplicarMovimiento(balance, movimiento.tipo, movimiento.cantidadPaquetes),
      0
    );

    if (stockActual < data.cantidadPaquetes) {
      throw new Error(
        `Operación denegada por consistencia contable: Stock insuficiente para ${producto.nombre} en el almacén ${almacen.nombre}. Stock actual: ${stockActual} paquetes, Solicitado a egresar: ${data.cantidadPaquetes} paquetes.`
      );
    }
  }

  const volumenTotalLitros =
    data.cantidadPaquetes * producto.botellasPorPaquete * producto.volumenLitros;

  return tx.movimientoInventario.create({
    data: {
      productoId: data.productoId,
      almacenId: data.almacenId,
      tipo: data.tipo,
      cantidadPaquetes: data.cantidadPaquetes,
      volumenTotalLitros,
      motivo: data.motivo,
      origenDato: data.origenDato || "REAL_FUTURO",
      usuarioId: data.usuarioId,
      pedidoId: data.pedidoId || null,
    },
    include: {
      producto: true,
      almacen: true,
      usuario: true,
    },
  });
}

export async function registrarMovimientoTransaccional(data: MovimientoInventarioData) {
  return conTransaccionSerializable((tx) => registrarMovimientoEnTransaccion(tx, data));
}
