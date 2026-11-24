import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/permissions";
import { registrarAuditoria } from "@/lib/services/audit";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (
      !tienePermiso(session.rol, "DISTRIBUCION") &&
      !tienePermiso(session.rol, "PEDIDOS") &&
      !tienePermiso(session.rol, "CALIDAD")
    ) {
      return NextResponse.json({ error: "Permiso denegado para consultar la flota." }, { status: 403 });
    }

    const vehiculos = await prisma.vehiculo.findMany({
      include: {
        pedidos: {
          where: { estado: { in: ["EN_TRANSITO", "EN_PREPARACION", "LISTO"] } },
          select: { codigo: true, zonaDestino: true, cliente: true, estado: true },
        },
      },
      orderBy: { identificador: "asc" },
    });

    return NextResponse.json({ success: true, vehiculos });
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
    if (!tienePermiso(session.rol, "DISTRIBUCION")) {
      return NextResponse.json({ error: "Permiso denegado para administrar flota y distribución." }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...resto } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de vehículo requerido." }, { status: 400 });
    }

    const vehiculoActualizado = await prisma.vehiculo.update({
      where: { id },
      data: resto,
    });

    await registrarAuditoria({
      usuarioId: session.id,
      accion: "ACTUALIZAR_VEHICULO",
      modulo: "DISTRIBUCION",
      detalles: { placa: vehiculoActualizado.placa, cambios: resto },
    });

    return NextResponse.json({ success: true, vehiculo: vehiculoActualizado });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
