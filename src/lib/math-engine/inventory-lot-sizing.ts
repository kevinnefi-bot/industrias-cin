import { OptimizationResult } from "./types";

export interface LotSizingProblem {
  demandaAnualUnidades: number; // D (paquetes/año)
  costoEmisionPedido: number; // S ($ por orden o batch de preparación)
  costoMantenimientoUnitario: number; // H ($/paquete/año)
  diasLaboralesAno: number; // ej. 300 o 365
  tiempoEntregaDias: number; // Lead time L
  desviacionEstandarDemandaDiaria: number; // sigma_d
  nivelServicioZ: number; // ej. 1.645 (95%), 1.96 (97.5%), 2.33 (99%)
  costoUnitarioFaltante?: number; // Cs ($/unidad faltante)
}

/**
 * Modelo de Reposición de Faltantes y Lote Económico (EOQ + ROP + Stock de Seguridad)
 */
export function solveLotSizing(problem: LotSizingProblem): OptimizationResult {
  const startTime = Date.now();
  const D = problem.demandaAnualUnidades;
  const S = problem.costoEmisionPedido;
  const H = problem.costoMantenimientoUnitario;
  const L = problem.tiempoEntregaDias;
  const days = problem.diasLaboralesAno || 300;
  const sigmaD = problem.desviacionEstandarDemandaDiaria;
  const Z = problem.nivelServicioZ || 1.645;
  const Cs = problem.costoUnitarioFaltante;

  if (D <= 0 || S <= 0 || H <= 0) {
    return {
      esFactible: false,
      valorObjetivo: 0,
      unidadesObjetivo: "Bs. / Año",
      tiempoResolucionMs: Date.now() - startTime,
      variablesDecision: {},
      interpretacion: "Parámetros de demanda o costos insuficientes para calcular EOQ.",
    };
  }

  // 1. Demanda diaria promedio
  const d_diaria = D / days;

  // 2. EOQ Clásico
  let Q_optimo = Math.sqrt((2 * D * S) / H);

  // Si hay faltantes permitidos con costo Cs
  let faltanteMaximo = 0;
  if (Cs && Cs > 0) {
    // Modelo EOQ con déficit planeado
    const factorDeficit = Math.sqrt((H + Cs) / Cs);
    Q_optimo = Q_optimo * factorDeficit;
    faltanteMaximo = (Q_optimo * H) / (H + Cs);
  }

  Q_optimo = Math.round(Q_optimo);
  faltanteMaximo = Math.round(faltanteMaximo);

  // 3. Stock de Seguridad (SS = Z * sigma_L = Z * sigma_d * sqrt(L))
  const sigmaL = sigmaD * Math.sqrt(L);
  const stockSeguridad = Math.round(Z * sigmaL);

  // 4. Punto de Reorden (ROP = d * L + SS)
  const demandaLeadTime = d_diaria * L;
  const puntoReorden = Math.round(demandaLeadTime + stockSeguridad);

  // 5. Número de órdenes al año y frecuencia
  const numOrdenesAno = Number((D / Q_optimo).toFixed(2));
  const diasEntreOrdenes = Number((days / numOrdenesAno).toFixed(1));

  // 6. Costo Total Anual de Inventario (CTA = D/Q * S + Q/2 * H)
  const costoOrdenamiento = (D / Q_optimo) * S;
  const costoMantenimiento = (Q_optimo / 2) * H;
  const costoTotalAnual = Number((costoOrdenamiento + costoMantenimiento).toFixed(2));

  const variablesDecision: Record<string, number> = {
    "Lote Óptimo de Producción (Q*)": Q_optimo,
    "Punto de Reorden (ROP)": puntoReorden,
    "Stock de Seguridad (SS)": stockSeguridad,
    "Número de Lotes al Año (N)": numOrdenesAno,
    "Frecuencia entre Pedidos (Días)": diasEntreOrdenes,
  };

  if (Cs && Cs > 0) {
    variablesDecision["Déficit Máximo Permitido (B*)"] = faltanteMaximo;
  }

  const interpretacion =
    `Plan de Lote Óptimo y Reposición: Lote Económico Q* = ${Q_optimo.toLocaleString()} paquetes por tirada. ` +
    `Emitir nueva orden cuando el inventario descienda al ROP de ${puntoReorden.toLocaleString()} paquetes ` +
    `(incluye amortiguador de seguridad de ${stockSeguridad.toLocaleString()} paquetes para garantizar un Nivel de Servicio de ${(Z >= 2.32 ? 99 : Z >= 1.95 ? 97.5 : 95)}%). ` +
    `Costo total anual óptimo de inventario: Bs. ${costoTotalAnual.toLocaleString("es-BO", { minimumFractionDigits: 2 })}.`;

  return {
    esFactible: true,
    valorObjetivo: costoTotalAnual,
    unidadesObjetivo: "Bs. / Año (Costo Total de Gestión de Inventario)",
    tiempoResolucionMs: Date.now() - startTime,
    variablesDecision,
    interpretacion,
    detallesCalculo: {
      demandaDiariaPromedio: Number(d_diaria.toFixed(2)),
      demandaDuranteLeadTime: Number(demandaLeadTime.toFixed(2)),
      costoOrdenamientoAnual: Number(costoOrdenamiento.toFixed(2)),
      costoMantenimientoAnual: Number(costoMantenimiento.toFixed(2)),
    },
  };
}
