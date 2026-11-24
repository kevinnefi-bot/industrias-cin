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

const RegistroDanoSchema = z.object({
  productoId: z.string().uuid(),
  cantidadPaquetes: z.number().int().positive(),
  tipoDano: z.string().min(2).max(80),
  etapaIncidencia: z.string().min(2).max(80),
  zonaAfectada: z.enum(["Norte", "Sur", "Centro", "Planta"]).optional().nullable(),
  vehiculoId: z.string().uuid().optional().nullable(),
  motivo: z.string().min(3),
  accionCorrectiva: z.string().optional().nullable(),
  descontarDeInventario: z.boolean().default(true),
  almacenId: z.string().uuid().optional().nullable(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "CALIDAD")) {
      return NextResponse.json({ error: "Permiso denegado para consultar calidad." }, { status: 403 });
    }

    const danos = await prisma.registroDano.findMany({
      include: {
        producto: { select: { sku: true, nombre: true, linea: true, precioPaquete: true, costoProduccionPaquete: true } },
        vehiculo: { select: { placa: true, identificador: true } },
        usuarioResponsable: { select: { nombreCompleto: true, rol: true } },
      },
      orderBy: { fechaIncidencia: "desc" },
    });

    // Indicadores agregados
    let totalPaquetesDanados = 0;
    let costoTotalPerdidas = 0;
    const danosPorEtapa: Record<string, number> = {};
    const danosPorZona: Record<string, number> = {};
    const danosPorProducto: Record<string, number> = {};

    for (const d of danos) {
      totalPaquetesDanados += d.cantidadPaquetes;
      costoTotalPerdidas += d.costoPerdidaEstimado;

      danosPorEtapa[d.etapaIncidencia] = (danosPorEtapa[d.etapaIncidencia] || 0) + d.cantidadPaquetes;
      const zona = d.zonaAfectada || "Planta";
      danosPorZona[zona] = (danosPorZona[zona] || 0) + d.cantidadPaquetes;
      danosPorProducto[d.producto.nombre] = (danosPorProducto[d.producto.nombre] || 0) + d.cantidadPaquetes;
    }

    return NextResponse.json({
      success: true,
      danos,
      indicadores: {
        totalRegistros: danos.length,
        totalPaquetesDanados,
        costoTotalPerdidas: Number(costoTotalPerdidas.toFixed(2)),
        danosPorEtapa,
        danosPorZona,
        danosPorProducto,
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
    if (!tienePermiso(session.rol, "CALIDAD")) {
      return NextResponse.json({ error: "Permiso denegado para registrar incidentes de calidad." }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = RegistroDanoSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Datos de registro de daño inválidos.", detalles: parseResult.error.format() },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const producto = await prisma.producto.findUnique({
      where: { id: data.productoId },
    });
    if (!producto) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    // Costo de pérdida estimado = paquetes * costo de producción
    const costoEstimado = Number((data.cantidadPaquetes * producto.costoProduccionPaquete).toFixed(2));

    // Si se solicita descontar inventario, debe existir un almacén concreto.
    let almacenId: string | undefined;
    if (data.descontarDeInventario) {
      const almacen = data.almacenId
        ? { id: data.almacenId }
        : await prisma.almacen.findFirst({ where: { codigo: "ALM-CENTRAL" }, select: { id: true } });
      if (!almacen) {
        return NextResponse.json(
          { error: "No existe un almacén para descontar el daño del inventario." },
          { status: 400 }
        );
      }
      almacenId = almacen.id;
    }

    const nuevoDano = await conTransaccionSerializable(
      async (tx) => {
        if (almacenId) {
          await registrarMovimientoEnTransaccion(tx, {
            productoId: data.productoId,
            almacenId,
            tipo: "DANADO",
            cantidadPaquetes: data.cantidadPaquetes,
            motivo: `Merma por calidad: ${data.tipoDano} en etapa ${data.etapaIncidencia}`,
            usuarioId: session.id,
          });
        }

        return tx.registroDano.create({
          data: {
            productoId: data.productoId,
            cantidadPaquetes: data.cantidadPaquetes,
            tipoDano: data.tipoDano,
            etapaIncidencia: data.etapaIncidencia,
            zonaAfectada: data.zonaAfectada || null,
            vehiculoId: data.vehiculoId || null,
            costoPerdidaEstimado: costoEstimado,
            motivo: data.motivo,
            accionCorrectiva: data.accionCorrectiva || null,
            origenCosto: "ESTIMADO",
            usuarioResponsableId: session.id,
          },
        });
      }
    );

    await registrarAuditoria({
      usuarioId: session.id,
      accion: "REGISTRAR_DANO_PRODUCTO",
      modulo: "CALIDAD",
      detalles: {
        producto: producto.nombre,
        paquetes: data.cantidadPaquetes,
        costoEstimado,
        etapa: data.etapaIncidencia,
      },
    });

    return NextResponse.json({ success: true, dano: nuevoDano }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al registrar daño.";
    const status = message.includes("Stock insuficiente") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
