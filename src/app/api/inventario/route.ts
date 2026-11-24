import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { registrarMovimientoTransaccional, obtenerResumenInventario } from "@/lib/services/inventory";
import { registrarAuditoria } from "@/lib/services/audit";

const MovimientoSchema = z.object({
  productoId: z.string().uuid(),
  almacenId: z.string().uuid(),
  tipo: z.enum([
    "ENTRADA_PRODUCCION",
    "SALIDA_PEDIDO",
    "DEVOLUCION",
    "DANADO",
    "AJUSTE_POSITIVO",
    "AJUSTE_NEGATIVO",
    "REPOSICION",
    "TRANSFERENCIA",
    "RESERVA",
  ]),
  cantidadPaquetes: z.number().int().positive(),
  motivo: z.string().min(3).max(255),
  origenDato: z.enum(["RECOPILADO", "ESTIMADO", "REAL_FUTURO"]).default("REAL_FUTURO"),
  pedidoId: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productoId = searchParams.get("productoId");
    const tipo = searchParams.get("tipo");
    const almacenId = searchParams.get("almacenId");

    const where: any = {};
    if (productoId) where.productoId = productoId;
    if (tipo && tipo !== "TODOS") where.tipo = tipo;
    if (almacenId && almacenId !== "TODOS") where.almacenId = almacenId;

    const movimientos = await prisma.movimientoInventario.findMany({
      where,
      include: {
        producto: { select: { sku: true, nombre: true, linea: true, volumenLitros: true, botellasPorPaquete: true } },
        almacen: { select: { codigo: true, nombre: true, zonaPlanta: true } },
        usuario: { select: { nombreCompleto: true, rol: true } },
      },
      orderBy: { fechaMovimiento: "desc" },
      take: 100,
    });

    const resumenStock = await obtenerResumenInventario();

    return NextResponse.json({
      success: true,
      movimientos,
      resumenStock,
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

    const body = await req.json();
    const parseResult = MovimientoSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Datos de movimiento inválidos.", detalles: parseResult.error.format() },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Ejecución transaccional con regla contable de prevención de inventario negativo
    const nuevoMovimiento = await registrarMovimientoTransaccional({
      ...data,
      usuarioId: session.id,
    });

    await registrarAuditoria({
      usuarioId: session.id,
      accion: "REGISTRAR_MOVIMIENTO_INVENTARIO",
      modulo: "INVENTARIO",
      detalles: {
        tipo: data.tipo,
        productoId: data.productoId,
        cantidadPaquetes: data.cantidadPaquetes,
        motivo: data.motivo,
      },
    });

    return NextResponse.json({ success: true, movimiento: nuevoMovimiento }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
