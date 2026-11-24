import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/permissions";
import { registrarAuditoria } from "@/lib/services/audit";

const bodySchema = z.object({
  codigo: z.string().min(2).max(20),
  nombre: z.string().min(3).max(80),
  zonaPlanta: z.string().min(3).max(80),
  capacidadMaxPaquetes: z.number().int().positive(),
  capacidadVolumetricaM3: z.number().positive(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (
      !tienePermiso(session.rol, "ALMACENES") &&
      !tienePermiso(session.rol, "INVENTARIO") &&
      !tienePermiso(session.rol, "CALIDAD")
    ) {
      return NextResponse.json({ error: "Permiso denegado para consultar almacenes." }, { status: 403 });
    }

    const almacenes = await prisma.almacen.findMany({
      include: {
        movimientos: {
          select: {
            productoId: true,
            tipo: true,
            cantidadPaquetes: true,
            volumenTotalLitros: true,
          },
        },
      },
    });

    const almacenesCalculados = almacenes.map((alm) => {
      let ocupacionPaquetes = 0;
      let ocupacionLitros = 0;

      for (const m of alm.movimientos) {
        if (
          m.tipo === "ENTRADA_PRODUCCION" ||
          m.tipo === "DEVOLUCION" ||
          m.tipo === "AJUSTE_POSITIVO" ||
          m.tipo === "REPOSICION"
        ) {
          ocupacionPaquetes += m.cantidadPaquetes;
          ocupacionLitros += m.volumenTotalLitros;
        } else if (
          m.tipo === "SALIDA_PEDIDO" ||
          m.tipo === "DANADO" ||
          m.tipo === "AJUSTE_NEGATIVO"
        ) {
          ocupacionPaquetes -= m.cantidadPaquetes;
          ocupacionLitros -= m.volumenTotalLitros;
        }
      }

      ocupacionPaquetes = Math.max(0, ocupacionPaquetes);
      // Estimación volumétrica en m3 (1 m3 = aprox 20 paquetes considerando empaque secundario y palet)
      const volumenOcupadoM3 = Number((ocupacionPaquetes * 0.045).toFixed(2));
      const porcentajeUso = Number(
        ((ocupacionPaquetes / alm.capacidadMaxPaquetes) * 100).toFixed(1)
      );

      return {
        id: alm.id,
        codigo: alm.codigo,
        nombre: alm.nombre,
        zonaPlanta: alm.zonaPlanta,
        capacidadMaxPaquetes: alm.capacidadMaxPaquetes,
        capacidadVolumetricaM3: alm.capacidadVolumetricaM3,
        origenCapacidad: alm.origenCapacidad,
        activo: alm.activo,
        ocupacionPaquetes,
        volumenOcupadoM3,
        porcentajeUso,
        estadoCapacidad:
          porcentajeUso >= 90 ? "CRITICO" : porcentajeUso >= 70 ? "ALTO" : "NORMAL",
      };
    });

    return NextResponse.json({ success: true, almacenes: almacenesCalculados });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "INVENTARIO")) {
      return NextResponse.json({ error: "Solo el rol INVENTARIO o ADMINISTRADOR puede crear almacenes." }, { status: 403 });
    }

    const rawBody = await request.json();
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos.", detalles: parsed.error.flatten() }, { status: 400 });
    }

    const { codigo, nombre, zonaPlanta, capacidadMaxPaquetes, capacidadVolumetricaM3 } = parsed.data;

    const existente = await prisma.almacen.findUnique({ where: { codigo } });
    if (existente) {
      return NextResponse.json({ error: `Ya existe un almacén con el código ${codigo}.` }, { status: 409 });
    }

    const almacen = await prisma.almacen.create({
      data: {
        codigo,
        nombre,
        zonaPlanta,
        capacidadMaxPaquetes,
        capacidadVolumetricaM3,
        origenCapacidad: "REAL_FUTURO",
        activo: true,
      },
    });

    // Audit log
    await registrarAuditoria({
      usuarioId: session.id,
      accion: "CREAR_ALMACEN",
      modulo: "INVENTARIO",
      detalles: { nombre, codigo, capacidadMaxPaquetes, capacidadVolumetricaM3 },
    });

    return NextResponse.json({ success: true, almacen });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
