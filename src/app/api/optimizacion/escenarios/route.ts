import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "OPTIMIZACION")) {
      return NextResponse.json({ error: "Permiso denegado para consultar escenarios." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const modeloCodigo = searchParams.get("modeloCodigo");

    const whereClause: any = {};
    if (modeloCodigo) {
      whereClause.modeloCodigo = modeloCodigo;
    }

    const ejecuciones = await prisma.optimizacionEjecucion.findMany({
      where: whereClause,
      include: {
        usuario: {
          select: { nombreCompleto: true, rol: true },
        },
      },
      orderBy: { creadoEn: "desc" },
      take: 50,
    });

    const parsed = ejecuciones.map((e) => ({
      ...e,
      parametrosEntrada: JSON.parse(e.parametrosEntrada),
      resultadoOptimo: JSON.parse(e.resultadoOptimo),
    }));

    return NextResponse.json({ success: true, ejecuciones: parsed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
