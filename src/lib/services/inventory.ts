import prisma from "@/lib/db/prisma";
import { ProductStockInfo, TipoMovimiento, OrigenDato } from "@/types";

export async function obtenerStockPorProducto(productoId: string): Promise<number> {
  const movimientos = await prisma.movimientoInventario.findMany({
    where: { productoId },
    select: { tipo: true, cantidadPaquetes: true },
  });

  let balance = 0;
  for (const m of movimientos) {
    if (
      m.tipo === "ENTRADA_PRODUCCION" ||
      m.tipo === "DEVOLUCION" ||
      m.tipo === "AJUSTE_POSITIVO" ||
      m.tipo === "REPOSICION"
    ) {
      balance += m.cantidadPaquetes;
    } else if (
      m.tipo === "SALIDA_PEDIDO" ||
      m.tipo === "DANADO" ||
      m.tipo === "AJUSTE_NEGATIVO"
    ) {
      balance -= m.cantidadPaquetes;
    }
    // RESERVA y TRANSFERENCIA se tratan de acuerdo a su almacén origen/destino
  }
  return balance;
}

export async function obtenerResumenInventario(): Promise<ProductStockInfo[]> {
  const productos = await prisma.producto.findMany({
    orderBy: [{ linea: "asc" }, { nombre: "asc" }],
  });

  const todosMovimientos = await prisma.movimientoInventario.findMany({
    select: { productoId: true, tipo: true, cantidadPaquetes: true },
  });

  // Movimientos agrupados por producto
  const balances: Record<string, number> = {};
  for (const m of todosMovimientos) {
    if (!balances[m.productoId]) balances[m.productoId] = 0;
    if (
      m.tipo === "ENTRADA_PRODUCCION" ||
      m.tipo === "DEVOLUCION" ||
      m.tipo === "AJUSTE_POSITIVO" ||
      m.tipo === "REPOSICION"
    ) {
      balances[m.productoId] += m.cantidadPaquetes;
    } else if (
      m.tipo === "SALIDA_PEDIDO" ||
      m.tipo === "DANADO" ||
      m.tipo === "AJUSTE_NEGATIVO"
    ) {
      balances[m.productoId] -= m.cantidadPaquetes;
    }
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
    const stockActual = balances[prod.id] || 0;
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

export async function registrarMovimientoTransaccional(data: {
  productoId: string;
  almacenId: string;
  tipo: TipoMovimiento;
  cantidadPaquetes: number;
  motivo: string;
  usuarioId: string;
  origenDato?: OrigenDato;
  pedidoId?: string;
}) {
  if (data.cantidadPaquetes <= 0) {
    throw new Error("La cantidad de paquetes debe ser estrictamente mayor a 0.");
  }

  return await prisma.$transaction(async (tx) => {
    // Verificación de producto
    const producto = await tx.producto.findUnique({
      where: { id: data.productoId },
    });
    if (!producto) {
      throw new Error(`Producto con ID ${data.productoId} no encontrado.`);
    }

    // Verificación de almacén
    const almacen = await tx.almacen.findUnique({
      where: { id: data.almacenId },
    });
    if (!almacen) {
      throw new Error(`Almacén con ID ${data.almacenId} no encontrado.`);
    }

    // Regla contable: Impedir stock negativo si es movimiento de salida
    const esSalida =
      data.tipo === "SALIDA_PEDIDO" ||
      data.tipo === "DANADO" ||
      data.tipo === "AJUSTE_NEGATIVO";

    if (esSalida) {
      const movimientos = await tx.movimientoInventario.findMany({
        where: { productoId: data.productoId },
        select: { tipo: true, cantidadPaquetes: true },
      });

      let stockActual = 0;
      for (const m of movimientos) {
        if (
          m.tipo === "ENTRADA_PRODUCCION" ||
          m.tipo === "DEVOLUCION" ||
          m.tipo === "AJUSTE_POSITIVO" ||
          m.tipo === "REPOSICION"
        ) {
          stockActual += m.cantidadPaquetes;
        } else if (
          m.tipo === "SALIDA_PEDIDO" ||
          m.tipo === "DANADO" ||
          m.tipo === "AJUSTE_NEGATIVO"
        ) {
          stockActual -= m.cantidadPaquetes;
        }
      }

      if (stockActual < data.cantidadPaquetes) {
        throw new Error(
          `Operación denegada por consistencia contable: Stock insuficiente para ${producto.nombre}. Stock actual: ${stockActual} paquetes, Solicitado a egresar: ${data.cantidadPaquetes} paquetes.`
        );
      }
    }

    const volumenTotalLitros =
      data.cantidadPaquetes * producto.botellasPorPaquete * producto.volumenLitros;

    const movimiento = await tx.movimientoInventario.create({
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

    return movimiento;
  });
}
