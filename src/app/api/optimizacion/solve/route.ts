import { NextRequest, NextResponse } from "next/server";
import { resolverModelo } from "@/lib/math-engine";
import prisma from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/permissions";
import { registrarAuditoria } from "@/lib/services/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado. Inicie sesión para ejecutar modelos." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "OPTIMIZACION")) {
      return NextResponse.json({ error: "Permiso denegado para ejecutar modelos de optimización." }, { status: 403 });
    }

    const body = await req.json();
    const {
      modeloCodigo,
      nombreModelo,
      nombreEscenario,
      esEscenarioBase,
      parametrosEntrada,
      origenParametros,
    } = body;

    if (!modeloCodigo || !parametrosEntrada) {
      return NextResponse.json(
        { error: "Faltan parámetros obligatorios: modeloCodigo y parametrosEntrada son requeridos." },
        { status: 400 }
      );
    }

    // Ejecutar el modelo con algoritmos reales
    const resultado = resolverModelo(modeloCodigo, parametrosEntrada);

    // Persistir ejecución en base de datos
    const ejecucion = await prisma.optimizacionEjecucion.create({
      data: {
        modeloCodigo,
        nombreModelo: nombreModelo || modeloCodigo,
        nombreEscenario: nombreEscenario || (esEscenarioBase ? "Escenario Base" : "Escenario Simulado"),
        esEscenarioBase: Boolean(esEscenarioBase),
        parametrosEntrada: JSON.stringify(parametrosEntrada),
        origenParametros: origenParametros || "ESTIMADO",
        resultadoOptimo: JSON.stringify(resultado),
        valorObjetivo: resultado.valorObjetivo,
        esFactible: resultado.esFactible,
        tiempoResolucionMs: resultado.tiempoResolucionMs,
        interpretacion: resultado.interpretacion,
        usuarioId: session.id,
      },
    });

    // Registrar en auditoría
    await registrarAuditoria({
      usuarioId: session.id,
      accion: "EJECUCION_MODELO_MATEMATICO",
      modulo: "OPTIMIZACION",
      detalles: {
        ejecucionId: ejecucion.id,
        modeloCodigo,
        esFactible: resultado.esFactible,
        valorObjetivo: resultado.valorObjetivo,
      },
    });

    return NextResponse.json({
      success: true,
      ejecucionId: ejecucion.id,
      resultado,
    });
  } catch (error: any) {
    console.error("Error al resolver modelo de optimización:", error);
    return NextResponse.json(
      { error: error.message || "Error interno al ejecutar el modelo de optimización." },
      { status: 500 }
    );
  }
}
