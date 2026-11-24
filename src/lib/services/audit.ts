import prisma from "@/lib/db/prisma";

export async function registrarAuditoria(params: {
  usuarioId?: string;
  accion: string;
  modulo: string;
  detalles: Record<string, any>;
  ipOrigen?: string;
}) {
  try {
    await prisma.auditoriaAccion.create({
      data: {
        usuarioId: params.usuarioId || null,
        accion: params.accion,
        modulo: params.modulo,
        detalles: JSON.stringify(params.detalles),
        ipOrigen: params.ipOrigen || "127.0.0.1",
      },
    });
  } catch (error) {
    console.error("Error al registrar auditoría:", error);
  }
}
