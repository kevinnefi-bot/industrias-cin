import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { obtenerResumenInventario } from "@/lib/services/inventory";
import { getSession } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/permissions";

function getDateRange(range: string, startParam?: string | null, endParam?: string | null) {
  const now = new Date();
  let end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start = new Date(now);

  if (range === "custom" && startParam && endParam) {
    start = new Date(startParam);
    start.setHours(0, 0, 0, 0);
    end = new Date(endParam);
    end.setHours(23, 59, 59, 999);
  } else {
    const daysMap: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "3m": 90,
      "6m": 180,
      "1y": 365,
    };
    const days = daysMap[range] || 30;
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);
  }

  const durationMs = Math.max(end.getTime() - start.getTime(), 86400000);
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return { start, end, prevStart, prevEnd };
}

function calcVariation(current: number, previous: number): { variacion: number; tendencia: "up" | "down" | "neutral" } {
  if (previous === 0) {
    if (current === 0) return { variacion: 0, tendencia: "neutral" };
    return { variacion: 100, tendencia: "up" };
  }
  const pct = Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
  return {
    variacion: pct,
    tendencia: pct > 0 ? "up" : pct < 0 ? "down" : "neutral",
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "DASHBOARD")) {
      return NextResponse.json({ error: "Permiso denegado para consultar el dashboard." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    const metric = searchParams.get("metric") || "ingresos";

    const { start, end, prevStart, prevEnd } = getDateRange(range, startParam, endParam);

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
        stockCriticoCount++;
        alertas.push({
          tipo: "STOCK_AGOTADO",
          titulo: `Producto Agotado: ${s.nombre}`,
          motivo: "El stock físico en kardex es 0 paquetes. Riesgo inminente de quiebre de servicio.",
          datosUtilizados: `Stock actual: 0 paq | Stock Mínimo requerido: ${s.stockMinimoPaquetes} paq`,
          severidad: "alta",
        });
      } else if (s.stockActualPaquetes <= s.stockMinimoPaquetes) {
        stockMinimoCount++;
        stockCriticoCount++;
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

    const ahora = new Date();
    const [pedidos, movimientos, danos, vehiculos, almacenes] = await Promise.all([
      prisma.pedido.findMany({ include: { detalles: true, vehiculo: true } }),
      prisma.movimientoInventario.findMany({ orderBy: { fechaMovimiento: "asc" } }),
      prisma.registroDano.findMany(),
      prisma.vehiculo.findMany(),
      prisma.almacen.findMany(),
    ]);

    let pedidosPendientes = 0;
    let pedidosEnTransito = 0;
    let pedidosEntregados = 0;
    let pedidosRetrasados = 0;
    let pedidosPuntuales = 0;

    // Periodos actual y anterior
    let ventasActual = 0;
    let ventasAnterior = 0;
    let ingresosActual = 0;
    let ingresosAnterior = 0;

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

        const fSol = new Date(p.fechaSolicitud);
        const totalPaq = p.detalles.reduce((acc, d) => acc + d.paquetesSolicitados, 0);
        const totalBs = p.detalles.reduce((acc, d) => acc + d.paquetesSolicitados * d.precioUnitarioPaquete, 0);

        if (fSol >= start && fSol <= end) {
          ventasActual += totalPaq;
          ingresosActual += totalBs;
        } else if (fSol >= prevStart && fSol <= prevEnd) {
          ventasAnterior += totalPaq;
          ingresosAnterior += totalBs;
        }
      }
    }

    let produccionActual = 0;
    let produccionAnterior = 0;
    for (const m of movimientos) {
      if (m.tipo === "ENTRADA_PRODUCCION") {
        const fMov = new Date(m.fechaMovimiento);
        if (fMov >= start && fMov <= end) {
          produccionActual += m.cantidadPaquetes;
        } else if (fMov >= prevStart && fMov <= prevEnd) {
          produccionAnterior += m.cantidadPaquetes;
        }
      }
    }

    let costosActual = 0;
    let costosAnterior = 0;
    for (const d of danos) {
      const fInc = new Date(d.fechaIncidencia);
      if (fInc >= start && fInc <= end) {
        costosActual += d.costoPerdidaEstimado;
      } else if (fInc >= prevStart && fInc <= prevEnd) {
        costosAnterior += d.costoPerdidaEstimado;
      }
    }

    const totalEvaluados = pedidosPuntuales + pedidosRetrasados;
    const porcentajePuntuales = totalEvaluados > 0
      ? Number(((pedidosPuntuales / totalEvaluados) * 100).toFixed(1))
      : 100;

    const totalPaquetesDanados = danos.reduce((acc, d) => acc + d.cantidadPaquetes, 0);
    const costoTotalDanos = Number(danos.reduce((acc, d) => acc + d.costoPerdidaEstimado, 0).toFixed(2));

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

    const disponibilidadFlota = vehiculos.length > 0 ? (vehiculosDisponibles / vehiculos.length) * 100 : 100;
    const eficienciaOperativa = Number(((porcentajePuntuales * 0.6) + (disponibilidadFlota * 0.4)).toFixed(1));

    // Construcción de serie temporal para el gráfico lineal dinámico
    const bucketCount = range === "7d" ? 7 : range === "30d" ? 10 : 12;
    const bucketSizeMs = (end.getTime() - start.getTime()) / bucketCount;
    const serieTemporal = [];

    for (let i = 0; i < bucketCount; i++) {
      const bStart = new Date(start.getTime() + i * bucketSizeMs);
      const bEnd = new Date(start.getTime() + (i + 1) * bucketSizeMs);
      const pStart = new Date(prevStart.getTime() + i * bucketSizeMs);
      const pEnd = new Date(prevStart.getTime() + (i + 1) * bucketSizeMs);

      const label = bStart.toLocaleDateString("es-BO", { day: "2-digit", month: "short" });

      let valActual = 0;
      let valAnterior = 0;

      if (metric === "produccion") {
        valActual = movimientos
          .filter((m) => m.tipo === "ENTRADA_PRODUCCION" && new Date(m.fechaMovimiento) >= bStart && new Date(m.fechaMovimiento) < bEnd)
          .reduce((acc, m) => acc + m.cantidadPaquetes, 0);
        valAnterior = movimientos
          .filter((m) => m.tipo === "ENTRADA_PRODUCCION" && new Date(m.fechaMovimiento) >= pStart && new Date(m.fechaMovimiento) < pEnd)
          .reduce((acc, m) => acc + m.cantidadPaquetes, 0);
      } else if (metric === "ventas") {
        valActual = pedidos
          .filter((p) => p.estado !== "CANCELADO" && new Date(p.fechaSolicitud) >= bStart && new Date(p.fechaSolicitud) < bEnd)
          .reduce((acc, p) => acc + p.detalles.reduce((s, d) => s + d.paquetesSolicitados, 0), 0);
        valAnterior = pedidos
          .filter((p) => p.estado !== "CANCELADO" && new Date(p.fechaSolicitud) >= pStart && new Date(p.fechaSolicitud) < pEnd)
          .reduce((acc, p) => acc + p.detalles.reduce((s, d) => s + d.paquetesSolicitados, 0), 0);
      } else if (metric === "ingresos") {
        valActual = pedidos
          .filter((p) => p.estado !== "CANCELADO" && new Date(p.fechaSolicitud) >= bStart && new Date(p.fechaSolicitud) < bEnd)
          .reduce((acc, p) => acc + p.detalles.reduce((s, d) => s + d.paquetesSolicitados * d.precioUnitarioPaquete, 0), 0);
        valAnterior = pedidos
          .filter((p) => p.estado !== "CANCELADO" && new Date(p.fechaSolicitud) >= pStart && new Date(p.fechaSolicitud) < pEnd)
          .reduce((acc, p) => acc + p.detalles.reduce((s, d) => s + d.paquetesSolicitados * d.precioUnitarioPaquete, 0), 0);
      } else if (metric === "costos") {
        valActual = danos
          .filter((d) => new Date(d.fechaIncidencia) >= bStart && new Date(d.fechaIncidencia) < bEnd)
          .reduce((acc, d) => acc + d.costoPerdidaEstimado, 0);
        valAnterior = danos
          .filter((d) => new Date(d.fechaIncidencia) >= pStart && new Date(d.fechaIncidencia) < pEnd)
          .reduce((acc, d) => acc + d.costoPerdidaEstimado, 0);
      } else if (metric === "pedidos") {
        valActual = pedidos.filter((p) => new Date(p.fechaSolicitud) >= bStart && new Date(p.fechaSolicitud) < bEnd).length;
        valAnterior = pedidos.filter((p) => new Date(p.fechaSolicitud) >= pStart && new Date(p.fechaSolicitud) < pEnd).length;
      } else if (metric === "inventario") {
        const netActual = movimientos
          .filter((m) => new Date(m.fechaMovimiento) >= bStart && new Date(m.fechaMovimiento) < bEnd)
          .reduce((acc, m) => acc + (m.tipo.startsWith("ENTRADA") || m.tipo === "AJUSTE_POSITIVO" || m.tipo === "DEVOLUCION" ? m.cantidadPaquetes : -m.cantidadPaquetes), 0);
        valActual = Math.max(0, stockTotalDisponible + netActual);
        valAnterior = stockTotalDisponible;
      }

      serieTemporal.push({
        fecha: label,
        periodoActual: Number(valActual.toFixed(2)),
        periodoAnterior: Number(valAnterior.toFixed(2)),
      });
    }

    return NextResponse.json({
      success: true,
      ultimaActualizacion: ahora.toISOString(),
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
        eficienciaOperativa,
      },
      kpisComparativos: {
        produccion: {
          actual: produccionActual,
          anterior: produccionAnterior,
          ...calcVariation(produccionActual, produccionAnterior),
        },
        ventas: {
          actual: ventasActual,
          anterior: ventasAnterior,
          ...calcVariation(ventasActual, ventasAnterior),
        },
        ingresos: {
          actual: Number(ingresosActual.toFixed(2)),
          anterior: Number(ingresosAnterior.toFixed(2)),
          ...calcVariation(ingresosActual, ingresosAnterior),
        },
        costos: {
          actual: Number(costosActual.toFixed(2)),
          anterior: Number(costosAnterior.toFixed(2)),
          ...calcVariation(costosActual, costosAnterior),
        },
      },
      serieTemporal,
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
