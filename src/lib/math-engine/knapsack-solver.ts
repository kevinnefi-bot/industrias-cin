import { OptimizationResult } from "./types";

export interface BinaryItem {
  id: string;
  nombre: string;
  costo: number; // Peso o presupuesto consumido
  beneficio: number; // Daño evitado o retorno financiero
  descripcion?: string;
}

export interface KnapsackProblem {
  presupuestoMaximo: number;
  items: BinaryItem[];
  objetivoNombre: string;
  unidadesBeneficio: string;
}

/**
 * Resuelve el Problema de la Mochila 0-1 con Programación Dinámica Exacta
 * Aplicable a Selección de Inversiones (Modelo G) y Protección contra Daños (Modelo C)
 */
export function solveKnapsack01(problem: KnapsackProblem): OptimizationResult {
  const startTime = Date.now();
  const n = problem.items.length;
  const W = Math.floor(problem.presupuestoMaximo);

  if (W <= 0 || n === 0) {
    return {
      esFactible: false,
      valorObjetivo: 0,
      unidadesObjetivo: problem.unidadesBeneficio,
      tiempoResolucionMs: Date.now() - startTime,
      variablesDecision: {},
      interpretacion: "Presupuesto o conjunto de alternativas insuficiente para optimizar.",
    };
  }

  // DP table: dp[i][w] = beneficio máximo con los primeros i items y presupuesto w
  // Para manejar decimales con precisión monetaria, escalamos a enteros si es necesario
  const scale = 1; // Unidades directas
  const scaledW = Math.round(W * scale);
  const costs = problem.items.map((it) => Math.round(it.costo * scale));
  const values = problem.items.map((it) => it.beneficio);

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(scaledW + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    const c = costs[i - 1];
    const v = values[i - 1];
    for (let w = 0; w <= scaledW; w++) {
      if (c <= w) {
        dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - c] + v);
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  // Reconstrucción de la solución (Backtracking)
  let w = scaledW;
  const variablesDecision: Record<string, number> = {};
  let costoTotalUtilizado = 0;

  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      const item = problem.items[i - 1];
      variablesDecision[item.nombre] = 1; // Seleccionado (binario 1)
      costoTotalUtilizado += item.costo;
      w -= costs[i - 1];
    } else {
      variablesDecision[problem.items[i - 1].nombre] = 0; // No seleccionado
    }
  }

  const beneficioMaximo = Number(dp[n][scaledW].toFixed(2));
  costoTotalUtilizado = Number(costoTotalUtilizado.toFixed(2));
  const presupuestoRestante = Number((problem.presupuestoMaximo - costoTotalUtilizado).toFixed(2));

  const itemsSeleccionados = Object.entries(variablesDecision)
    .filter(([_, v]) => v === 1)
    .map(([k]) => k);

  const interpretacion =
    `Optimización Binaria 0-1 Concluida: ${problem.objetivoNombre} máximo alcanzado = $${beneficioMaximo.toLocaleString("es-PE", { minimumFractionDigits: 2 })} ${problem.unidadesBeneficio}. ` +
    `Presupuesto utilizado: $${costoTotalUtilizado.toLocaleString("es-PE", { minimumFractionDigits: 2 })} de $${problem.presupuestoMaximo.toLocaleString("es-PE", { minimumFractionDigits: 2 })} (Remanente: $${presupuestoRestante.toLocaleString("es-PE", { minimumFractionDigits: 2 })}). ` +
    `Alternativas activadas (${itemsSeleccionados.length}): ${itemsSeleccionados.join(", ") || "Ninguna"}.`;

  return {
    esFactible: true,
    valorObjetivo: beneficioMaximo,
    unidadesObjetivo: problem.unidadesBeneficio,
    tiempoResolucionMs: Date.now() - startTime,
    variablesDecision,
    interpretacion,
    holgurasRestricciones: {
      "Presupuesto de Capital": {
        valor: costoTotalUtilizado,
        limite: problem.presupuestoMaximo,
        tipo: "<=",
      },
    },
    detallesCalculo: {
      itemsSeleccionados,
      costoTotalUtilizado,
      presupuestoRestante,
    },
  };
}
