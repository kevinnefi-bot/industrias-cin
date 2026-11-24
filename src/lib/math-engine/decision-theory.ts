import { OptimizationResult } from "./types";

export interface DecisionTheoryProblem {
  alternativas: string[]; // ej. ["A1: Mantener Capacidad", "A2: Expandir Línea Hervidos", "A3: Tercerizar Distribución Sur"]
  estadosNaturaleza: string[]; // ej. ["E1: Demanda Alta", "E2: Demanda Media", "E3: Demanda Baja"]
  probabilidades: number[]; // ej. [0.30, 0.50, 0.20] (deben sumar 1.0)
  matrizPagos: number[][]; // [alternativa][estado] (Beneficios o utilidades)
  coeficienteHurwiczAlfa?: number; // ej. 0.60 (0 = pesimista, 1 = optimista)
}

/**
 * Motor de Teoría de Decisiones bajo Incertidumbre y Riesgo
 * Aplica los criterios clásicos de Investigación Operativa:
 * 1. VME (Valor Monetario Esperado)
 * 2. Criterio Wald (Maximin - Conservador)
 * 3. Criterio Maximax (Optimista)
 * 4. Criterio Hurwicz (Ponderado por alfa)
 * 5. Criterio Savage (Minimax Regret / Matriz de Arrepentimiento)
 */
export function solveDecisionTheory(problem: DecisionTheoryProblem): OptimizationResult {
  const startTime = Date.now();
  const n = problem.alternativas.length;
  const m = problem.estadosNaturaleza.length;

  if (n === 0 || m === 0) {
    return {
      esFactible: false,
      valorObjetivo: 0,
      unidadesObjetivo: "PEN",
      tiempoResolucionMs: Date.now() - startTime,
      variablesDecision: {},
      interpretacion: "Matriz de decisión vacía.",
    };
  }

  const alfa = problem.coeficienteHurwiczAlfa ?? 0.6;
  const probs = problem.probabilidades;

  // 1. VME (Valor Monetario Esperado)
  const vmeValores: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < m; j++) {
      sum += problem.matrizPagos[i][j] * probs[j];
    }
    vmeValores.push(Number(sum.toFixed(2)));
  }

  let bestVmeIdx = 0;
  for (let i = 1; i < n; i++) {
    if (vmeValores[i] > vmeValores[bestVmeIdx]) bestVmeIdx = i;
  }

  // 2. Maximin (Wald - Peor escenario de cada alternativa y luego el máximo)
  const minimosPorAlt = problem.matrizPagos.map((row) => Math.min(...row));
  let bestMaximinIdx = 0;
  for (let i = 1; i < n; i++) {
    if (minimosPorAlt[i] > minimosPorAlt[bestMaximinIdx]) bestMaximinIdx = i;
  }

  // 3. Maximax (Optimista - Mejor escenario de cada alternativa y luego el máximo)
  const maximosPorAlt = problem.matrizPagos.map((row) => Math.max(...row));
  let bestMaximaxIdx = 0;
  for (let i = 1; i < n; i++) {
    if (maximosPorAlt[i] > maximosPorAlt[bestMaximaxIdx]) bestMaximaxIdx = i;
  }

  // 4. Hurwicz = alfa * Max + (1 - alfa) * Min
  const hurwiczValores = problem.matrizPagos.map((_, i) =>
    Number((alfa * maximosPorAlt[i] + (1 - alfa) * minimosPorAlt[i]).toFixed(2))
  );
  let bestHurwiczIdx = 0;
  for (let i = 1; i < n; i++) {
    if (hurwiczValores[i] > hurwiczValores[bestHurwiczIdx]) bestHurwiczIdx = i;
  }

  // 5. Savage (Minimax Regret)
  // Hallar el máximo pago por cada estado de la naturaleza
  const maxPorEstado: number[] = [];
  for (let j = 0; j < m; j++) {
    let maxCol = -Infinity;
    for (let i = 0; i < n; i++) {
      if (problem.matrizPagos[i][j] > maxCol) maxCol = problem.matrizPagos[i][j];
    }
    maxPorEstado.push(maxCol);
  }

  // Construir matriz de arrepentimiento
  const matrizArrepentimiento: number[][] = [];
  const maxPesarPorAlt: number[] = [];
  for (let i = 0; i < n; i++) {
    const filaPesar: number[] = [];
    for (let j = 0; j < m; j++) {
      filaPesar.push(maxPorEstado[j] - problem.matrizPagos[i][j]);
    }
    matrizArrepentimiento.push(filaPesar);
    maxPesarPorAlt.push(Math.max(...filaPesar));
  }

  let bestSavageIdx = 0;
  for (let i = 1; i < n; i++) {
    if (maxPesarPorAlt[i] < maxPesarPorAlt[bestSavageIdx]) bestSavageIdx = i;
  }

  const variablesDecision: Record<string, number> = {};
  problem.alternativas.forEach((alt, idx) => {
    variablesDecision[`VME: ${alt}`] = vmeValores[idx];
    variablesDecision[`Maximin (Peor Pago): ${alt}`] = minimosPorAlt[idx];
    variablesDecision[`Maximax (Mejor Pago): ${alt}`] = maximosPorAlt[idx];
    variablesDecision[`Hurwicz (Alfa ${alfa}): ${alt}`] = hurwiczValores[idx];
    variablesDecision[`Savage (Pesar Máximo): ${alt}`] = maxPesarPorAlt[idx];
  });

  const altRecomendadaVME = problem.alternativas[bestVmeIdx];
  const altRecomendadaWald = problem.alternativas[bestMaximinIdx];
  const altRecomendadaSavage = problem.alternativas[bestSavageIdx];

  const interpretacion =
    `Evaluación de Teoría de Decisiones Concluida: ` +
    `Bajo riesgo probabilístico (VME), la alternativa óptima es "${altRecomendadaVME}" con un retorno esperado de $${vmeValores[bestVmeIdx].toLocaleString("es-PE", { minimumFractionDigits: 2 })}. ` +
    `Bajo criterio conservador de aversión al riesgo (Wald Maximin), se recomienda "${altRecomendadaWald}" (pago garantizado mínimo de $${minimosPorAlt[bestMaximinIdx].toLocaleString("es-PE", { minimumFractionDigits: 2 })}). ` +
    `Para minimizar el costo de oportunidad o pesar (Savage Minimax Regret), la elección óptima es "${altRecomendadaSavage}".`;

  return {
    esFactible: true,
    valorObjetivo: vmeValores[bestVmeIdx],
    unidadesObjetivo: "PEN (Valor Monetario Esperado VME)",
    tiempoResolucionMs: Date.now() - startTime,
    variablesDecision,
    interpretacion,
    detallesCalculo: {
      criterioVME: { recomendada: altRecomendadaVME, valor: vmeValores[bestVmeIdx] },
      criterioMaximin: { recomendada: altRecomendadaWald, valor: minimosPorAlt[bestMaximinIdx] },
      criterioMaximax: { recomendada: problem.alternativas[bestMaximaxIdx], valor: maximosPorAlt[bestMaximaxIdx] },
      criterioHurwicz: { recomendada: problem.alternativas[bestHurwiczIdx], valor: hurwiczValores[bestHurwiczIdx] },
      criterioSavage: { recomendada: altRecomendadaSavage, pesarMinimo: maxPesarPorAlt[bestSavageIdx] },
      matrizArrepentimiento,
    },
  };
}
