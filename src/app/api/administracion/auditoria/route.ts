import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.rol !== "ADMINISTRADOR" && session.rol !== "GERENCIA")) {
      return NextResponse.json({ error: "Acceso denegado. Requiere rol Administrador o Gerencia." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const modulo = searchParams.get("modulo");

    const where: any = {};
    if (modulo && modulo !== "TODOS") where.modulo = modulo;

    const auditorias = await prisma.auditoriaAccion.findMany({
      where,
      include: {
        usuario: { select: { nombreCompleto: true, email: true, rol: true } },
      },
      orderBy: { creadoEn: "desc" },
      take: 100,
    });

    const parsed = auditorias.map((a) => ({
      ...a,
      detalles: JSON.parse(a.detalles),
    }));

    return NextResponse.json({ success: true, auditorias: parsed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
