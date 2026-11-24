import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/permissions";
import { registrarAuditoria } from "@/lib/services/audit";
import {
  conTransaccionSerializable,
  registrarMovimientoEnTransaccion,
} from "@/lib/services/inventory";

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
  fechaPrometidaOriginal: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Fecha inválida."),
  vehiculoId: z.string().uuid().optional().nullable(),
  observaciones: z.string().optional(),
  items: z.array(PedidoItemSchema).min(1),
});

const PedidoUpdateSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum([
    "PENDIENTE",
    "CONFIRMADO",
    "EN_PREPARACION",
    "LISTO",
    "EN_TRANSITO",
    "ENTREGADO",
    "ENTREGADO_PARCIALMENTE",
    "RETRASADO",
    "CANCELADO",
  ]).optional(),
  vehiculoId: z.string().uuid().nullable().optional(),
  observaciones: z.string().max(1000).nullable().optional(),
  fechaEntregaReal: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Fecha inválida.").optional(),
  detallesEntrega: z.array(z.object({
    id: z.string().uuid(),
    paquetesEntregados: z.number().int().min(0),
    paquetesEnviados: z.number().int().min(0).optional(),
  })).optional(),
}).strict();

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

    const parseResult = PedidoUpdateSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Datos de actualización inválidos.", detalles: parseResult.error.format() },
        { status: 400 }
      );
    }
    const data = parseResult.data;

    const result = await conTransaccionSerializable(
      async (tx) => {
        const pedidoActual = await tx.pedido.findUnique({
          where: { id: data.id },
          include: { detalles: true },
        });
        if (!pedidoActual) return { error: "NOT_FOUND" as const };

        if (
          (data.estado === "ENTREGADO" || data.estado === "ENTREGADO_PARCIALMENTE") &&
          pedidoActual.estado !== "EN_TRANSITO"
        ) {
          return { error: "INVALID_STATE" as const };
        }
        if (data.estado === "ENTREGADO_PARCIALMENTE" && !data.detallesEntrega) {
          return { error: "INVALID_DETAILS" as const };
        }

        const detalles = data.detallesEntrega || (
          data.estado === "ENTREGADO"
            ? pedidoActual.detalles.map((detalle) => ({
                id: detalle.id,
                paquetesEntregados: detalle.paquetesEnviados || detalle.paquetesSolicitados,
                paquetesEnviados: detalle.paquetesEnviados || detalle.paquetesSolicitados,
              }))
            : []
        );
        const detallesPorId = new Map(pedidoActual.detalles.map((detalle) => [detalle.id, detalle]));
        if (new Set(detalles.map((detalle) => detalle.id)).size !== detalles.length) {
          return { error: "INVALID_DETAILS" as const };
        }
        for (const detalle of detalles) {
          const actual = detallesPorId.get(detalle.id);
          const enviados = detalle.paquetesEnviados ?? detalle.paquetesEntregados;
          if (
            !actual ||
            detalle.paquetesEntregados > actual.paquetesSolicitados ||
            enviados > actual.paquetesSolicitados ||
            detalle.paquetesEntregados > enviados
          ) {
            return { error: "INVALID_DETAILS" as const };
          }
        }
        if (data.estado === "ENTREGADO_PARCIALMENTE") {
          const totalEntregado = detalles.reduce((total, detalle) => total + detalle.paquetesEntregados, 0);
          const totalSolicitado = pedidoActual.detalles.reduce(
            (total, detalle) => total + detalle.paquetesSolicitados,
            0
          );
          if (totalEntregado === 0 || totalEntregado >= totalSolicitado) {
            return { error: "INVALID_DETAILS" as const };
          }
        }

        const dataUpdate: {
          estado?: string;
          vehiculoId?: string | null;
          observaciones?: string | null;
          fechaDespachoReal?: Date;
          fechaEntregaReal?: Date;
        } = {};
        if (data.estado) dataUpdate.estado = data.estado;
        if (data.vehiculoId !== undefined) dataUpdate.vehiculoId = data.vehiculoId;
        if (data.observaciones !== undefined) dataUpdate.observaciones = data.observaciones;

        if (data.estado === "EN_TRANSITO" && pedidoActual.estado !== "EN_TRANSITO") {
          if (pedidoActual.fechaDespachoReal) {
            return { error: "ALREADY_DISPATCHED" as const };
          }
          const almacenCentral = await tx.almacen.findFirst({
            where: { codigo: "ALM-CENTRAL" },
            select: { id: true },
          });
          if (!almacenCentral) {
            throw new Error("No existe el almacén central para despachar el pedido.");
          }
          for (const detalle of pedidoActual.detalles) {
            await registrarMovimientoEnTransaccion(tx, {
              productoId: detalle.productoId,
              almacenId: almacenCentral.id,
              tipo: "SALIDA_PEDIDO",
              cantidadPaquetes: detalle.paquetesSolicitados,
              motivo: `Despacho de pedido ${pedidoActual.codigo}`,
              usuarioId: session.id,
              pedidoId: pedidoActual.id,
            });
          }
          dataUpdate.fechaDespachoReal = new Date();
        }

        if (
          (data.estado === "ENTREGADO" || data.estado === "ENTREGADO_PARCIALMENTE") &&
          !pedidoActual.fechaEntregaReal
        ) {
          dataUpdate.fechaEntregaReal = data.fechaEntregaReal
            ? new Date(data.fechaEntregaReal)
            : new Date();
        }

        for (const detalle of detalles) {
          await tx.pedidoDetalle.update({
            where: { id: detalle.id },
            data: {
              paquetesEntregados: detalle.paquetesEntregados,
              paquetesEnviados: detalle.paquetesEnviados ?? detalle.paquetesEntregados,
            },
          });
        }

        const pedidoActualizado = await tx.pedido.update({
          where: { id: data.id },
          data: dataUpdate,
          include: { detalles: true, vehiculo: true },
        });
        return { pedido: pedidoActualizado };
      }
    );

    if ("error" in result && result.error === "NOT_FOUND") {
      return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    }
    if ("error" in result && result.error === "INVALID_DETAILS") {
      return NextResponse.json(
        { error: "Las cantidades entregadas/enviadas deben corresponder al pedido y no superar lo solicitado." },
        { status: 400 }
      );
    }
    if ("error" in result && result.error === "INVALID_STATE") {
      return NextResponse.json(
        { error: "Para registrar una entrega, el pedido debe estar en tránsito." },
        { status: 400 }
      );
    }
    if ("error" in result && result.error === "ALREADY_DISPATCHED") {
      return NextResponse.json(
        { error: "El pedido ya tiene un despacho registrado y no puede volver a descontarse del inventario." },
        { status: 409 }
      );
    }
    if ("error" in result) {
      return NextResponse.json({ error: "No se pudo actualizar el pedido." }, { status: 400 });
    }
    const pedidoActualizado = result.pedido;

    await registrarAuditoria({
      usuarioId: session.id,
      accion: "ACTUALIZAR_ESTADO_PEDIDO",
      modulo: "PEDIDOS",
      detalles: { codigo: pedidoActualizado.codigo, nuevoEstado: data.estado },
    });

    return NextResponse.json({ success: true, pedido: pedidoActualizado });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar pedido.";
    const status = message.includes("Stock insuficiente") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
