import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/permissions";
import { conTransaccionSerializable, registrarMovimientoEnTransaccion } from "@/lib/services/inventory";
import { registrarAuditoria } from "@/lib/services/audit";

const bodySchema = z.object({
  almacenOrigenId: z.string().uuid("ID de almacén origen inválido"),
  almacenDestinoId: z.string().uuid("ID de almacén destino inválido"),
  productoId: z.string().uuid("ID de producto inválido"),
  cantidadPaquetes: z.number().int().positive("La cantidad debe ser un entero positivo"),
  motivo: z.string().min(5, "Motivo demasiado corto").max(250),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "INVENTARIO") && !tienePermiso(session.rol, "ALMACENES")) {
      return NextResponse.json({ error: "Permiso denegado para registrar transferencias." }, { status: 403 });
    }

    const rawBody = await request.json();
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos.", detalles: parsed.error.flatten() }, { status: 400 });
    }

    const { almacenOrigenId, almacenDestinoId, productoId, cantidadPaquetes, motivo } = parsed.data;

    if (almacenOrigenId === almacenDestinoId) {
      return NextResponse.json({ error: "El almacén de origen y destino no pueden ser el mismo." }, { status: 400 });
    }

    const { egreso, ingreso } = await conTransaccionSerializable(async (tx) => {
      // Egreso del almacén origen
      const egresoMov = await registrarMovimientoEnTransaccion(tx, {
        productoId,
        almacenId: almacenOrigenId,
        tipo: "AJUSTE_NEGATIVO", // Usamos AJUSTE_NEGATIVO para que sea reconocido como salida
        cantidadPaquetes,
        motivo: `[TRANSFERENCIA → Destino] ${motivo}`,
        usuarioId: session.id,
        origenDato: "REAL_FUTURO",
      });

      // Ingreso al almacén destino
      const ingresoMov = await registrarMovimientoEnTransaccion(tx, {
        productoId,
        almacenId: almacenDestinoId,
        tipo: "AJUSTE_POSITIVO", // Usamos AJUSTE_POSITIVO para que sea reconocido como entrada
        cantidadPaquetes,
        motivo: `[TRANSFERENCIA ← Origen] ${motivo}`,
        usuarioId: session.id,
        origenDato: "REAL_FUTURO",
      });

      return { egreso: egresoMov, ingreso: ingresoMov };
    });

    // Audit log outside the transaction to avoid prisma client type mismatch
    await registrarAuditoria({
      usuarioId: session.id,
      accion: "TRANSFERENCIA_ALMACEN",
      modulo: "INVENTARIO",
      detalles: { almacenOrigenId, almacenDestinoId, productoId, cantidadPaquetes, motivo },
    });

    return NextResponse.json({
      success: true,
      mensaje: `Transferencia de ${cantidadPaquetes} paquetes completada exitosamente.`,
      egreso: { id: egreso.id },
      ingreso: { id: ingreso.id },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Error interno" }, { status: 500 });
  }
}
