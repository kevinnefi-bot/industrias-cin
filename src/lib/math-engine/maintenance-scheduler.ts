import { OptimizationResult } from "./types";

export interface MaintenanceProblem {
  tecnicos: { id: string; nombre: string; tarifaHora: number }[];
  tareas: { id: string; nombre: string; maquina: string }[];
  matrizHoras: number[][]; // [tecnico][tarea]
}

/**
 * Modelo de Asignación de Mantenimiento Preventivo (Algoritmo Húngaro / Bipartite Matching)
 * Minimiza las horas-persona y el costo técnico asignando a cada especialista la tarea más afín.
 */
export function solveMaintenanceAssignment(problem: MaintenanceProblem): OptimizationResult {
  const startTime = Date.now();
  const n = problem.tecnicos.length;
  const m = problem.tareas.length;

  if (n === 0 || m === 0) {
    return {
      esFactible: false,
      valorObjetivo: 0,
      unidadesObjetivo: "Horas-Persona",
      tiempoResolucionMs: Date.now() - startTime,
      variablesDecision: {},
      interpretacion: "No hay técnicos o tareas suficientes para asignar.",
    };
  }

  // Si no es cuadrada, ajustar a tamaño K x K
  const K = Math.max(n, m);
  const costMatrix: number[][] = Array.from({ length: K }, () => new Array(K).fill(0));

  for (let i = 0; i < K; i++) {
    for (let j = 0; j < K; j++) {
      if (i < n && j < m) {
        costMatrix[i][j] = problem.matrizHoras[i][j];
      } else {
        costMatrix[i][j] = 999; // Penalidad para tareas o técnicos ficticios
      }
    }
  }

  // Implementación del Algoritmo Húngaro (Kuhn-Munkres)
  const u = new Array(K + 1).fill(0);
  const v = new Array(K + 1).fill(0);
  const p = new Array(K + 1).fill(0);
  const way = new Array(K + 1).fill(0);

  for (let i = 1; i <= K; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(K + 1).fill(Infinity);
    const used = new Array(K + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= K; j++) {
        if (!used[j]) {
          const cur = costMatrix[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= K; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }

      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  // Extraer asignaciones
  const variablesDecision: Record<string, number> = {};
  let totalHoras = 0;
  let costoTotal = 0;

  for (let j = 1; j <= K; j++) {
    const techIdx = p[j] - 1;
    const taskIdx = j - 1;

    if (techIdx < n && taskIdx < m) {
      const horas = problem.matrizHoras[techIdx][taskIdx];
      const tech = problem.tecnicos[techIdx];
      const task = problem.tareas[taskIdx];
      const key = `${tech.nombre} -> ${task.maquina} (${task.nombre})`;
      variablesDecision[key] = horas;
      totalHoras += horas;
      costoTotal += horas * tech.tarifaHora;
    }
  }

  totalHoras = Number(totalHoras.toFixed(1));
  costoTotal = Number(costoTotal.toFixed(2));

  const interpretacion =
    `Asignación de Mantenimiento Óptima: Total de horas-persona mínimas = ${totalHoras} hrs. ` +
    `Costo estimado de mano de obra técnica: $${costoTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}. ` +
    `Cada especialista asume la tarea de mayor compatibilidad técnica para minimizar el tiempo de paro de planta.`;

  return {
    esFactible: true,
    valorObjetivo: totalHoras,
    unidadesObjetivo: "Horas-Persona Totales",
    tiempoResolucionMs: Date.now() - startTime,
    variablesDecision,
    interpretacion,
    detallesCalculo: {
      totalHoras,
      costoTotal,
      asignaciones: Object.entries(variablesDecision),
    },
  };
}
