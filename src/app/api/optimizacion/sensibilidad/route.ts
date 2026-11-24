import { NextRequest, NextResponse } from "next/server";
import { resolverModelo } from "@/lib/math-engine";
import { getSession } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/permissions";

const VARIATIONS = [-0.2, -0.1, 0, 0.1, 0.2];

function applyVariation(modeloCodigo: string, baseParams: any, factor: number): { params: any; label: string } {
  const clone = JSON.parse(JSON.stringify(baseParams));
  const mult = 1 + factor;
  const pctLabel = factor === 0 ? "Base (0%)" : `${factor > 0 ? "+" : ""}${Math.round(factor * 100)}%`;

  switch (modeloCodigo) {
    case "MODELO_A":
      if (Array.isArray(clone.b)) clone.b = clone.b.map((v: number) => Number((v * mult).toFixed(2)));
      return { params: clone, label: `Capacidad ${pctLabel}` };
    case "MODELO_B":
      if (Array.isArray(clone.destinos)) {
        clone.destinos = clone.destinos.map((d: any) => ({ ...d, demanda: Math.max(1, Math.round(d.demanda * mult)) }));
      }
      return { params: clone, label: `Demanda ${pctLabel}` };
    case "MODELO_C":
      if (typeof clone.presupuestoMaximo === "number") {
        clone.presupuestoMaximo = Math.max(100, Math.round(clone.presupuestoMaximo * mult));
      }
      return { params: clone, label: `Presupuesto ${pctLabel}` };
    case "MODELO_D":
      if (Array.isArray(clone.productos)) {
        clone.productos = clone.productos.map((p: any) => ({
          ...p,
          stockRequeridoPaquetes: Math.max(10, Math.round(p.stockRequeridoPaquetes * mult)),
        }));
      }
      return { params: clone, label: `Stock Req. ${pctLabel}` };
    case "MODELO_E":
      if (typeof clone.demandaAnualUnidades === "number") {
        clone.demandaAnualUnidades = Math.max(100, Math.round(clone.demandaAnualUnidades * mult));
      }
      return { params: clone, label: `Demanda Anual ${pctLabel}` };
    case "MODELO_F":
      if (Array.isArray(clone.productos)) {
        clone.productos = clone.productos.map((p: any) => ({
          ...p,
          demandaMensual: Math.max(10, Math.round(p.demandaMensual * mult)),
        }));
      }
      return { params: clone, label: `Demanda ${pctLabel}` };
    case "MODELO_G":
      if (typeof clone.horasDisponiblesTotales === "number") {
        clone.horasDisponiblesTotales = Math.max(10, Math.round(clone.horasDisponiblesTotales * mult));
      }
      return { params: clone, label: `Horas Disp. ${pctLabel}` };
    case "MODELO_H":
      if (Array.isArray(clone.actividades)) {
        clone.actividades = clone.actividades.map((a: any) => ({
          ...a,
          duracion: Math.max(1, Number((a.duracion * mult).toFixed(1))),
        }));
      }
      return { params: clone, label: `Duración ${pctLabel}` };
    case "MODELO_I":
      if (Array.isArray(clone.equipos)) {
        clone.equipos = clone.equipos.map((e: any) => ({
          ...e,
          costoFallaCorrectiva: Math.max(100, Math.round(e.costoFallaCorrectiva * mult)),
        }));
      }
      return { params: clone, label: `Costo Falla ${pctLabel}` };
    case "MODELO_J":
      if (Array.isArray(clone.alternativas)) {
        clone.alternativas = clone.alternativas.map((alt: any) => ({
          ...alt,
          matrizPagos: Array.isArray(alt.matrizPagos)
            ? alt.matrizPagos.map((v: number) => Number((v * mult).toFixed(2)))
            : alt.matrizPagos,
        }));
      }
      return { params: clone, label: `Pagos ${pctLabel}` };
    default:
      return { params: clone, label: pctLabel };
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "OPTIMIZACION")) {
      return NextResponse.json({ error: "Permiso denegado." }, { status: 403 });
    }

    const { modeloCodigo, parametrosBase } = await req.json();
    if (!modeloCodigo || !parametrosBase) {
      return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 });
    }

    const puntos = VARIATIONS.map((factor) => {
      const { params, label } = applyVariation(modeloCodigo, parametrosBase, factor);
      try {
        const res = resolverModelo(modeloCodigo, params);
        return {
          variacion: label,
          factorPct: Math.round(factor * 100),
          valorObjetivo: Number(res.valorObjetivo.toFixed(2)),
          esFactible: res.esFactible,
        };
      } catch {
        return {
          variacion: label,
          factorPct: Math.round(factor * 100),
          valorObjetivo: 0,
          esFactible: false,
        };
      }
    });

    return NextResponse.json({ success: true, puntos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error en análisis de sensibilidad." }, { status: 500 });
  }
}
