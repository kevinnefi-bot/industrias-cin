import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { obtenerResumenInventario } from "@/lib/services/inventory";
import { getSession } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/permissions";
import { calcularPronosticoMensual } from "@/lib/services/demand";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "DEMANDA")) {
      return NextResponse.json({ error: "Permiso denegado para consultar demanda." }, { status: 403 });
    }

    const productos = await obtenerResumenInventario();

    // Obtener ventas reales históricas agrupadas por producto
    const detallesVentas = await prisma.pedidoDetalle.findMany({
      where: {
        pedido: { estado: { in: ["ENTREGADO", "ENTREGADO_PARCIALMENTE"] } },
      },
      select: {
        productoId: true,
        paquetesEntregados: true,
        precioUnitarioPaquete: true,
        pedido: { select: { fechaEntregaReal: true, zonaDestino: true } },
      },
    });

    const ahora = new Date();
    const periodosPronostico = [-3, -2, -1].map((desfase) => {
      const fecha = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + desfase, 1));
      return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
    });

    // Ventas acumuladas reales por producto
    const ventasPorProducto: Record<string, { paquetes: number; valorTotal: number; zonas: Record<string, number> }> = {};
    const ventasMensualesPorProducto: Record<string, Record<string, number>> = {};
    let totalValorVentasGlobal = 0;

    for (const d of detallesVentas) {
      if (!ventasPorProducto[d.productoId]) {
        ventasPorProducto[d.productoId] = { paquetes: 0, valorTotal: 0, zonas: { Norte: 0, Sur: 0, Centro: 0 } };
      }
      const valor = d.paquetesEntregados * d.precioUnitarioPaquete;
      ventasPorProducto[d.productoId].paquetes += d.paquetesEntregados;
      ventasPorProducto[d.productoId].valorTotal += valor;
      totalValorVentasGlobal += valor;

      const zona = d.pedido.zonaDestino;
      if (zona) {
        ventasPorProducto[d.productoId].zonas[zona] = (ventasPorProducto[d.productoId].zonas[zona] || 0) + d.paquetesEntregados;
      }

      if (d.pedido.fechaEntregaReal) {
        const fechaEntrega = new Date(d.pedido.fechaEntregaReal);
        const periodo = `${fechaEntrega.getUTCFullYear()}-${String(fechaEntrega.getUTCMonth() + 1).padStart(2, "0")}`;
        if (periodosPronostico.includes(periodo)) {
          if (!ventasMensualesPorProducto[d.productoId]) {
            ventasMensualesPorProducto[d.productoId] = {};
          }
          ventasMensualesPorProducto[d.productoId][periodo] =
            (ventasMensualesPorProducto[d.productoId][periodo] || 0) + d.paquetesEntregados;
        }
      }
    }

    // Clasificación ABC Real
    // Ordenar productos por valor de ventas descendente
    const productosOrdenados = productos.map((p) => {
      const v = ventasPorProducto[p.id] || { paquetes: 0, valorTotal: 0, zonas: { Norte: 0, Sur: 0, Centro: 0 } };
      return {
        ...p,
        paquetesVendidos: v.paquetes,
        valorVentasReal: Number(v.valorTotal.toFixed(2)),
        ventasPorZona: v.zonas,
      };
    }).sort((a, b) => b.valorVentasReal - a.valorVentasReal);

    let acumuladoValor = 0;
    const analisisProductos = productosOrdenados.map((p) => {
      let claseABC: "A" | "B" | "C" | "SIN_MOVIMIENTO" = "SIN_MOVIMIENTO";
      let rotacion: "ALTA" | "MEDIA" | "BAJA" | "SIN_MOVIMIENTO" = "SIN_MOVIMIENTO";
      let porcentajeAcumulado = 0;

      if (p.valorVentasReal > 0 && totalValorVentasGlobal > 0) {
        acumuladoValor += p.valorVentasReal;
        porcentajeAcumulado = Number(((acumuladoValor / totalValorVentasGlobal) * 100).toFixed(1));

        if (porcentajeAcumulado <= 80) {
          claseABC = "A";
          rotacion = "ALTA";
        } else if (porcentajeAcumulado <= 95) {
          claseABC = "B";
          rotacion = "MEDIA";
        } else {
          claseABC = "C";
          rotacion = "BAJA";
        }
      }

      // Riesgo de agotamiento y sobreinventario
      let riesgoAgotamiento = false;
      let riesgoSobreinventario = false;

      if (p.stockActualPaquetes <= p.stockMinimoPaquetes) {
        riesgoAgotamiento = true;
      }
      if (p.stockActualPaquetes >= p.stockMaximoPaquetes) {
        riesgoSobreinventario = true;
      }

      const pronostico = calcularPronosticoMensual(
        ventasMensualesPorProducto[p.id] || {},
        periodosPronostico
      );

      return {
        ...p,
        claseABC,
        rotacion,
        porcentajeAcumulado,
        riesgoAgotamiento,
        riesgoSobreinventario,
        pronostico,
      };
    });

    return NextResponse.json({
      success: true,
      totalValorVentasGlobal: Number(totalValorVentasGlobal.toFixed(2)),
      totalProductos: productos.length,
      analisis: analisisProductos,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
