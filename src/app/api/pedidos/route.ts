import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/permissions";
import { registrarAuditoria } from "@/lib/services/audit";
import { registrarMovimientoTransaccional } from "@/lib/services/inventory";

const PedidoItemSchema = z.object({
  productoId: z.string().uuid(),
  paquetesSolicitados: z.number().int().positive(),
  precioUnitarioPaquete: z.number().min(0),
});

const PedidoCreateSchema = z.object({
  codigo: z.string().min(3).max(32),
  cliente: z.string().min(2).max(255),
  zonaDestino: z.enum(["Norte", "Sur", "Centro"]),
  direccionEntrega: z.string().min(3),
  fechaPrometidaOriginal: z.string(), // ISO string
  vehiculoId: z.string().uuid().optional().nullable(),
  observaciones: z.string().optional(),
  items: z.array(PedidoItemSchema).min(1),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "PEDIDOS") && !tienePermiso(session.rol, "DISTRIBUCION")) {
      return NextResponse.json({ error: "Permiso denegado para consultar pedidos." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado");
    const zona = searchParams.get("zona");

    const where: any = {};
    if (estado && estado !== "TODOS") where.estado = estado;
    if (zona && zona !== "TODAS") where.zonaDestino = zona;

    const pedidos = await prisma.pedido.findMany({
      where,
      include: {
        vehiculo: true,
        usuarioRegistro: { select: { nombreCompleto: true, email: true } },
        detalles: {
          include: {
            producto: {
              select: { sku: true, nombre: true, linea: true, volumenLitros: true, botellasPorPaquete: true },
            },
          },
        },
      },
      orderBy: { creadoEn: "desc" },
    });

    // Cálculos de SLA y métricas de cumplimiento
    const ahora = new Date();
    let pedidosPuntuales = 0;
    let pedidosRetrasados = 0;
    let pedidosIncompletos = 0;
    let pedidosEntregados = 0;

    const pedidosCalculados = pedidos.map((p) => {
      const fechaPrometida = new Date(p.fechaPrometidaOriginal);
      let retrasoMinutos = 0;
      let esRetrasado = false;

      if (p.estado === "ENTREGADO" || p.estado === "ENTREGADO_PARCIALMENTE") {
        pedidosEntregados++;
        const fechaFin = p.fechaEntregaReal ? new Date(p.fechaEntregaReal) : ahora;
        if (fechaFin > fechaPrometida) {
          retrasoMinutos = Math.floor((fechaFin.getTime() - fechaPrometida.getTime()) / (60 * 1000));
          esRetrasado = true;
          pedidosRetrasados++;
        } else {
          pedidosPuntuales++;
        }
      } else if (p.estado !== "CANCELADO") {
        if (ahora > fechaPrometida) {
          retrasoMinutos = Math.floor((ahora.getTime() - fechaPrometida.getTime()) / (60 * 1000));
          esRetrasado = true;
          pedidosRetrasados++;
        }
      }

      // Evaluar si es incompleto
      let totalSolicitado = 0;
      let totalEntregado = 0;
      p.detalles.forEach((d) => {
        totalSolicitado += d.paquetesSolicitados;
        totalEntregado += d.paquetesEntregados;
      });

      const esIncompleto = (p.estado === "ENTREGADO_PARCIALMENTE") || (totalEntregado < totalSolicitado && p.estado === "ENTREGADO");
      if (esIncompleto) pedidosIncompletos++;

      return {
        ...p,
        retrasoMinutos,
        esRetrasado,
        esIncompleto,
        totalPaquetesSolicitados: totalSolicitado,
        totalPaquetesEntregados: totalEntregado,
        montoTotal: p.detalles.reduce((sum, d) => sum + d.paquetesSolicitados * d.precioUnitarioPaquete, 0),
      };
    });

    const totalEvaluados = pedidosPuntuales + pedidosRetrasados;
    const porcentajeCumplimientoOTIF = totalEvaluados > 0
      ? Number(((pedidosPuntuales / totalEvaluados) * 100).toFixed(1))
      : 100;

    return NextResponse.json({
      success: true,
      pedidos: pedidosCalculados,
      metricas: {
        totalPedidos: pedidos.length,
        pedidosPuntuales,
        pedidosRetrasados,
        pedidosIncompletos,
        porcentajeCumplimientoOTIF,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "PEDIDOS") && !tienePermiso(session.rol, "DISTRIBUCION")) {
      return NextResponse.json({ error: "Permiso denegado para registrar pedidos." }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = PedidoCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Datos de pedido inválidos.", detalles: parseResult.error.format() },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Verificar código único
    const existeCodigo = await prisma.pedido.findUnique({
      where: { codigo: data.codigo },
    });
    if (existeCodigo) {
      return NextResponse.json({ error: `El código de pedido ${data.codigo} ya existe.` }, { status: 400 });
    }

    // Crear pedido con detalles
    const nuevoPedido = await prisma.pedido.create({
      data: {
        codigo: data.codigo,
        cliente: data.cliente,
        zonaDestino: data.zonaDestino,
        direccionEntrega: data.direccionEntrega,
        fechaPrometidaOriginal: new Date(data.fechaPrometidaOriginal),
        vehiculoId: data.vehiculoId || null,
        estado: "PENDIENTE",
        observaciones: data.observaciones || null,
        usuarioRegistroId: session.id,
        detalles: {
          create: data.items.map((it) => ({
            productoId: it.productoId,
            paquetesSolicitados: it.paquetesSolicitados,
            precioUnitarioPaquete: it.precioUnitarioPaquete,
          })),
        },
      },
      include: {
        detalles: true,
      },
    });

    await registrarAuditoria({
      usuarioId: session.id,
      accion: "CREAR_PEDIDO",
      modulo: "PEDIDOS",
      detalles: { codigo: nuevoPedido.codigo, cliente: nuevoPedido.cliente, zona: nuevoPedido.zonaDestino },
    });

    return NextResponse.json({ success: true, pedido: nuevoPedido }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "PEDIDOS") && !tienePermiso(session.rol, "DISTRIBUCION")) {
      return NextResponse.json({ error: "Permiso denegado para actualizar pedidos." }, { status: 403 });
    }

    const body = await req.json();
    const { id, estado, vehiculoId, fechaEntregaReal, fechaDespachoReal, observaciones, detallesEntrega } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de pedido requerido." }, { status: 400 });
    }

    const pedidoActual = await prisma.pedido.findUnique({
      where: { id },
      include: { detalles: true },
    });

    if (!pedidoActual) {
      return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    }

    const dataUpdate: any = {};
    if (estado) dataUpdate.estado = estado;
    if (vehiculoId !== undefined) dataUpdate.vehiculoId = vehiculoId;
    if (observaciones !== undefined) dataUpdate.observaciones = observaciones;

    if (estado === "EN_TRANSITO" && !pedidoActual.fechaDespachoReal) {
      dataUpdate.fechaDespachoReal = new Date();
      // Si pasa a en tránsito, generar automáticamente salidas de inventario contable desde el Almacén Central
      const almCentral = await prisma.almacen.findFirst({ where: { codigo: "ALM-CENTRAL" } });
      if (almCentral) {
        for (const det of pedidoActual.detalles) {
          await registrarMovimientoTransaccional({
            productoId: det.productoId,
            almacenId: almCentral.id,
            tipo: "SALIDA_PEDIDO",
            cantidadPaquetes: det.paquetesSolicitados,
            motivo: `Despacho de pedido ${pedidoActual.codigo}`,
            usuarioId: session.id,
            pedidoId: pedidoActual.id,
          });
        }
      }
    }

    if ((estado === "ENTREGADO" || estado === "ENTREGADO_PARCIALMENTE") && !pedidoActual.fechaEntregaReal) {
      dataUpdate.fechaEntregaReal = fechaEntregaReal ? new Date(fechaEntregaReal) : new Date();
    }

    // Actualizar detalles si se suministran
    if (detallesEntrega && Array.isArray(detallesEntrega)) {
      for (const item of detallesEntrega) {
        await prisma.pedidoDetalle.update({
          where: { id: item.id },
          data: {
            paquetesEntregados: item.paquetesEntregados,
            paquetesEnviados: item.paquetesEnviados ?? item.paquetesEntregados,
          },
        });
      }
    }

    const pedidoActualizado = await prisma.pedido.update({
      where: { id },
      data: dataUpdate,
      include: { detalles: true, vehiculo: true },
    });

    await registrarAuditoria({
      usuarioId: session.id,
      accion: "ACTUALIZAR_ESTADO_PEDIDO",
      modulo: "PEDIDOS",
      detalles: { codigo: pedidoActualizado.codigo, nuevoEstado: estado },
    });

    return NextResponse.json({ success: true, pedido: pedidoActualizado });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
