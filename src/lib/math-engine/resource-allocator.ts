import { OptimizationResult, LPProblem } from "./types";
import { solveSimplex } from "./simplex-solver";

export interface ResourceAllocationProblem {
  produccionMinimaHervidosLitros: number;
  produccionMinimaJugosLitros: number;
  costoKwhPunta: number; // PEN por kWh
  costoKwhValle: number; // PEN por kWh
  costoM3Agua: number; // PEN por m3
  limiteAguaM3Mensual: number;
  limiteKwhPuntaMensual: number;
}

/**
 * Optimización de Recursos Críticos (Agua y Electricidad) en Industrias CIN
 * Resuelve la programación de turnos de hervido y pasteurizado minimizando
 * el gasto energético e hídrico cumpliendo con las metas de volumen.
 */
export function solveResourceAllocation(problem: ResourceAllocationProblem): OptimizationResult {
  // Variables:
  // x1 = Litros de Hervidos producidos en Horario Valle (kWh Valle)
  // x2 = Litros de Hervidos producidos en Horario Punta (kWh Punta)
  // x3 = Litros de Jugos producidos en Horario Valle
  // x4 = Litros de Jugos producidos en Horario Punta

  // Coeficientes técnicos de planta (basados en auditoría energética):
  // Hervidos: 0.08 kWh/L, 0.0014 m3 agua/L
  // Jugos: 0.05 kWh/L, 0.0011 m3 agua/L
  const kwhHerv = 0.08;
  const kwhJug = 0.05;
  const aguaHerv = 0.0014;
  const aguaJug = 0.0011;

  // Costo por litro:
  const c1 = kwhHerv * problem.costoKwhValle + aguaHerv * problem.costoM3Agua;
  const c2 = kwhHerv * problem.costoKwhPunta + aguaHerv * problem.costoM3Agua;
  const c3 = kwhJug * problem.costoKwhValle + aguaJug * problem.costoM3Agua;
  const c4 = kwhJug * problem.costoKwhPunta + aguaJug * problem.costoM3Agua;

  // LP de Minimización:
  // min c1*x1 + c2*x2 + c3*x3 + c4*x4
  // s.a.
  // 1) x1 + x2 >= produccionMinimaHervidosLitros (Demanda Hervidos)
  // 2) x3 + x4 >= produccionMinimaJugosLitros (Demanda Jugos)
  // 3) aguaHerv*x1 + aguaHerv*x2 + aguaJug*x3 + aguaJug*x4 <= limiteAguaM3Mensual (Cupo Agua)
  // 4) kwhHerv*x2 + kwhJug*x4 <= limiteKwhPuntaMensual (Capacidad Máxima Horario Punta)

  const lp: LPProblem = {
    tipo: "MIN",
    c: [c1, c2, c3, c4],
    A: [
      [1, 1, 0, 0],
      [0, 0, 1, 1],
      [aguaHerv, aguaHerv, aguaJug, aguaJug],
      [0, kwhHerv, 0, kwhJug],
    ],
    b: [
      problem.produccionMinimaHervidosLitros,
      problem.produccionMinimaJugosLitros,
      problem.limiteAguaM3Mensual,
      problem.limiteKwhPuntaMensual,
    ],
    operadores: [">=", ">=", "<=", "<="],
    nombresVariables: [
      "Hervidos_TurnoValle_L",
      "Hervidos_TurnoPunta_L",
      "Jugos_TurnoValle_L",
      "Jugos_TurnoPunta_L",
    ],
    nombresRestricciones: [
      "Meta Mínima Producción Hervidos",
      "Meta Mínima Producción Jugos",
      "Cupo Máximo Agua de Planta (m3)",
      "Límite Eléctrico Horario Punta (kWh)",
    ],
  };

  const res = solveSimplex(lp);
  if (!res.esFactible) {
    res.interpretacion = "INVIABILIDAD: Las metas de volumen exceden el cupo de agua o capacidad eléctrica mensual.";
    return res;
  }

  const v = res.variablesDecision;
  const aguaConsumidaM3 = (v["Hervidos_TurnoValle_L"] + v["Hervidos_TurnoPunta_L"]) * aguaHerv +
    (v["Jugos_TurnoValle_L"] + v["Jugos_TurnoPunta_L"]) * aguaJug;
  const kwhPuntaConsumido = v["Hervidos_TurnoPunta_L"] * kwhHerv + v["Jugos_TurnoPunta_L"] * kwhJug;

  res.unidadesObjetivo = "PEN / Mes (Costo de Servicios Industriales)";
  res.interpretacion =
    `Optimización de Servicios Concluida: Gasto mínimo mensual = $${res.valorObjetivo.toLocaleString("es-PE", { minimumFractionDigits: 2 })}. ` +
    `Se maximizó la producción en Horario Valle (${(v["Hervidos_TurnoValle_L"] + v["Jugos_TurnoValle_L"]).toLocaleString()} L) para evitar sobrecostos por kWh en horario punta. ` +
    `Consumo hídrico proyectado: ${aguaConsumidaM3.toFixed(1)} m3 de ${problem.limiteAguaM3Mensual} m3 disponibles.`;

  return res;
}
