import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { obtenerResumenInventario } from "@/lib/services/inventory";
import { getSession } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/permissions";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "DASHBOARD")) {
      return NextResponse.json({ error: "Permiso denegado para consultar el dashboard." }, { status: 403 });
    }

    const stock = await obtenerResumenInventario();
    const productosTotales = stock.length;

    let stockTotalPaquetes = 0;
    let stockTotalDisponible = 0;
    let stockTotalComprometido = 0;
    let stockCriticoCount = 0;
    let stockMinimoCount = 0;
    let stockAgotadoCount = 0;
    let sobreinventarioCount = 0;

    const alertas: { tipo: string; titulo: string; motivo: string; datosUtilizados: string; severidad: "alta" | "media" | "baja" }[] = [];

    for (const s of stock) {
      stockTotalPaquetes += s.stockActualPaquetes;
      stockTotalDisponible += s.stockDisponiblePaquetes;
      stockTotalComprometido += s.stockComprometidoPaquetes;

      if (s.stockActualPaquetes <= 0) {
        stockAgotadoCount++;
        alertas.push({
          tipo: "STOCK_AGOTADO",
          titulo: `Producto Agotado: ${s.nombre}`,
          motivo: "El stock físico en kardex es 0 paquetes. Riesgo inminente de quiebre de servicio.",
          datosUtilizados: `Stock actual: 0 paq | Stock Mínimo requerido: ${s.stockMinimoPaquetes} paq`,
          severidad: "alta",
        });
      } else if (s.stockActualPaquetes <= s.stockMinimoPaquetes) {
        stockMinimoCount++;
        alertas.push({
          tipo: "STOCK_MINIMO",
          titulo: `Reposición Urgente: ${s.nombre}`,
          motivo: "El stock actual descendió por debajo del stock mínimo de seguridad.",
          datosUtilizados: `Stock actual: ${s.stockActualPaquetes} paq | Mínimo: ${s.stockMinimoPaquetes} paq`,
          severidad: "media",
        });
      } else if (s.stockActualPaquetes >= s.stockMaximoPaquetes) {
        sobreinventarioCount++;
        alertas.push({
          tipo: "SOBREINVENTARIO",
          titulo: `Sobreinventario Detectado: ${s.nombre}`,
          motivo: "El nivel de existencias supera el umbral máximo de almacenamiento, comprometiendo capital de trabajo.",
          datosUtilizados: `Stock actual: ${s.stockActualPaquetes} paq | Máximo permitido: ${s.stockMaximoPaquetes} paq`,
          severidad: "baja",
        });
      }
    }

    // Pedidos y SLA
    const ahora = new Date();
    const pedidos = await prisma.pedido.findMany({
      include: { detalles: true, vehiculo: true },
    });

    let pedidosPendientes = 0;
    let pedidosEnTransito = 0;
    let pedidosEntregados = 0;
    let pedidosRetrasados = 0;
    let pedidosPuntuales = 0;

    for (const p of pedidos) {
      if (p.estado === "PENDIENTE" || p.estado === "CONFIRMADO" || p.estado === "EN_PREPARACION") {
        pedidosPendientes++;
      } else if (p.estado === "EN_TRANSITO") {
        pedidosEnTransito++;
      } else if (p.estado === "ENTREGADO" || p.estado === "ENTREGADO_PARCIALMENTE") {
        pedidosEntregados++;
      }

      if (p.estado !== "CANCELADO") {
        const fechaFin = p.fechaEntregaReal ? new Date(p.fechaEntregaReal) : ahora;
        if (fechaFin > new Date(p.fechaPrometidaOriginal)) {
          pedidosRetrasados++;
          if (p.estado !== "ENTREGADO") {
            const minutos = Math.floor((ahora.getTime() - new Date(p.fechaPrometidaOriginal).getTime()) / 60000);
            alertas.push({
              tipo: "PEDIDO_RETRASADO",
              titulo: `Pedido Retrasado: ${p.codigo} (${p.cliente})`,
              motivo: `El pedido no ha sido entregado dentro de la ventana horaria prometida originalmente.`,
              datosUtilizados: `Fecha Prometida: ${new Date(p.fechaPrometidaOriginal).toLocaleTimeString()} | Retraso actual: ${minutos} min | Zona: ${p.zonaDestino}`,
              severidad: "alta",
            });
          }
        } else if (p.estado === "ENTREGADO") {
          pedidosPuntuales++;
        }
      }
    }

    const totalEvaluados = pedidosPuntuales + pedidosRetrasados;
    const porcentajePuntuales = totalEvaluados > 0
      ? Number(((pedidosPuntuales / totalEvaluados) * 100).toFixed(1))
      : 100;

    // Daños
    const danos = await prisma.registroDano.findMany();
    const totalPaquetesDanados = danos.reduce((acc, d) => acc + d.cantidadPaquetes, 0);
    const costoTotalDanos = Number(danos.reduce((acc, d) => acc + d.costoPerdidaEstimado, 0).toFixed(2));

    // Vehículos y capacidad de almacenamiento
    const vehiculos = await prisma.vehiculo.findMany();
    const vehiculosDisponibles = vehiculos.filter((v) => v.disponible && v.estadoMantenimiento === "OPERATIVO").length;
    const vehiculosFueraServicio = vehiculos.filter((v) => !v.disponible || v.estadoMantenimiento !== "OPERATIVO");

    for (const v of vehiculosFueraServicio) {
      alertas.push({
        tipo: "VEHICULO_NO_DISPONIBLE",
        titulo: `Unidad Fuera de Servicio: ${v.identificador} (${v.placa})`,
        motivo: `Camión no disponible para asignación de rutas de distribución. Estado: ${v.estadoMantenimiento}.`,
        datosUtilizados: `Zona asignada: ${v.zonaAsignada} | Capacidad: ${v.capacidadMaxPaquetes} paquetes`,
        severidad: "media",
      });
    }

    const almacenes = await prisma.almacen.findMany();
    const capacidadTotalAlmacenes = almacenes.reduce((acc, a) => acc + a.capacidadMaxPaquetes, 0);
    const porcentajeUsoAlmacenamiento = capacidadTotalAlmacenes > 0
      ? Number(((stockTotalPaquetes / capacidadTotalAlmacenes) * 100).toFixed(1))
      : 0;

    if (porcentajeUsoAlmacenamiento >= 90) {
      alertas.push({
        tipo: "CAPACIDAD_ALMACEN_EXCEDIDA",
        titulo: "Capacidad Crítica de Almacenamiento Global",
        motivo: "La ocupación de paquetes supera el 90% de la capacidad física máxima instalada.",
        datosUtilizados: `Ocupación: ${stockTotalPaquetes} / ${capacidadTotalAlmacenes} paquetes (${porcentajeUsoAlmacenamiento}%)`,
        severidad: "alta",
      });
    }

    return NextResponse.json({
      success: true,
      kpis: {
        productosTotales,
        stockTotalPaquetes,
        stockTotalDisponible,
        stockTotalComprometido,
        stockCriticoCount,
        stockMinimoCount,
        stockAgotadoCount,
        sobreinventarioCount,
        pedidosTotales: pedidos.length,
        pedidosPendientes,
        pedidosEnTransito,
        pedidosEntregados,
        pedidosRetrasados,
        porcentajePuntuales,
        totalPaquetesDanados,
        costoTotalDanos,
        vehiculosTotales: vehiculos.length,
        vehiculosDisponibles,
        capacidadTotalAlmacenes,
        porcentajeUsoAlmacenamiento,
      },
      alertas,
      inventarioPorProducto: stock.map((s) => ({
        nombre: s.nombre,
        linea: s.linea,
        stockActual: s.stockActualPaquetes,
        stockMinimo: s.stockMinimoPaquetes,
        stockMaximo: s.stockMaximoPaquetes,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
