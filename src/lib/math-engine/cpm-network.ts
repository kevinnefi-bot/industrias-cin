import { OptimizationResult } from "./types";

export interface CPMActivity {
  id: string;
  nombre: string;
  duracionHoras: number;
  predecesores: string[]; // IDs de actividades predecesoras
}

export interface CPMProblem {
  nombreProyecto: string;
  actividades: CPMActivity[];
}

export interface CPMCalculatedActivity {
  id: string;
  nombre: string;
  duracion: number;
  es: number; // Early Start
  ef: number; // Early Finish
  ls: number; // Late Start
  lf: number; // Late Finish
  holguraTotal: number; // Total Slack = LS - ES = LF - EF
  holguraLibre: number; // Free Slack
  esCritica: boolean;
}

/**
 * Motor de Método de Ruta Crítica (CPM) de Red de Operaciones
 * Calcula Forward Pass, Backward Pass, Holguras y la Ruta Crítica exacta.
 */
export function solveCPM(problem: CPMProblem): OptimizationResult {
  const startTime = Date.now();
  const acts = problem.actividades;

  if (acts.length === 0) {
    return {
      esFactible: false,
      valorObjetivo: 0,
      unidadesObjetivo: "Horas",
      tiempoResolucionMs: Date.now() - startTime,
      variablesDecision: {},
      interpretacion: "No hay actividades en la red CPM.",
    };
  }

  // Mapa de actividades
  const actMap = new Map<string, CPMActivity>();
  acts.forEach((a) => actMap.set(a.id, a));

  // Mapa de sucesores
  const successorsMap = new Map<string, string[]>();
  acts.forEach((a) => successorsMap.set(a.id, []));
  acts.forEach((a) => {
    a.predecesores.forEach((predId) => {
      const succList = successorsMap.get(predId);
      if (succList) succList.push(a.id);
    });
  });

  // 1. FORWARD PASS (Early Start y Early Finish)
  const es = new Map<string, number>();
  const ef = new Map<string, number>();

  // Ordenamiento topológico
  const inDegree = new Map<string, number>();
  acts.forEach((a) => inDegree.set(a.id, a.predecesores.length));

  const queue: string[] = [];
  acts.forEach((a) => {
    if (inDegree.get(a.id) === 0) {
      queue.push(a.id);
      es.set(a.id, 0);
      ef.set(a.id, a.duracionHoras);
    }
  });

  const topoOrder: string[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    topoOrder.push(currentId);

    const curEf = ef.get(currentId)!;
    const succs = successorsMap.get(currentId) || [];

    for (const succId of succs) {
      const currentSuccEs = es.get(succId) || 0;
      es.set(succId, Math.max(currentSuccEs, curEf));

      const deg = (inDegree.get(succId) || 0) - 1;
      inDegree.set(succId, deg);
      if (deg === 0) {
        const succAct = actMap.get(succId)!;
        const succEs = es.get(succId)!;
        ef.set(succId, succEs + succAct.duracionHoras);
        queue.push(succId);
      }
    }
  }

  // Comprobar ciclos
  if (topoOrder.length < acts.length) {
    return {
      esFactible: false,
      valorObjetivo: 0,
      unidadesObjetivo: "Horas",
      tiempoResolucionMs: Date.now() - startTime,
      variablesDecision: {},
      interpretacion: "ERROR DE GRAFO: La red CPM contiene ciclos o dependencias circulares que impiden calcular la ruta crítica.",
    };
  }

  // Duración total del proyecto = max(EF)
  let maxProjectDuration = 0;
  acts.forEach((a) => {
    maxProjectDuration = Math.max(maxProjectDuration, ef.get(a.id) || 0);
  });

  // 2. BACKWARD PASS (Late Start y Late Finish)
  const lf = new Map<string, number>();
  const ls = new Map<string, number>();

  // Inicializar LF para los nodos finales
  acts.forEach((a) => {
    const succs = successorsMap.get(a.id) || [];
    if (succs.length === 0) {
      lf.set(a.id, maxProjectDuration);
      ls.set(a.id, maxProjectDuration - a.duracionHoras);
    }
  });

  // Procesar en orden topológico inverso
  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const currentId = topoOrder[i];
    const succs = successorsMap.get(currentId) || [];

    if (succs.length > 0) {
      let minSuccLs = Infinity;
      for (const sId of succs) {
        minSuccLs = Math.min(minSuccLs, ls.get(sId)!);
      }
      lf.set(currentId, minSuccLs);
      const curAct = actMap.get(currentId)!;
      ls.set(currentId, minSuccLs - curAct.duracionHoras);
    }
  }

  // 3. CÁLCULO DE HOLGURAS Y RUTA CRÍTICA
  const resultadosDetalle: CPMCalculatedActivity[] = [];
  const variablesDecision: Record<string, number> = {};
  const rutaCriticaNombres: string[] = [];

  acts.forEach((a) => {
    const actEs = es.get(a.id)!;
    const actEf = ef.get(a.id)!;
    const actLs = ls.get(a.id)!;
    const actLf = lf.get(a.id)!;
    const holguraTotal = actLs - actEs;

    // Holgura libre = min(ES de sucesores) - EF
    const succs = successorsMap.get(a.id) || [];
    let holguraLibre = 0;
    if (succs.length === 0) {
      holguraLibre = maxProjectDuration - actEf;
    } else {
      let minSuccEs = Infinity;
      succs.forEach((s) => (minSuccEs = Math.min(minSuccEs, es.get(s)!)));
      holguraLibre = minSuccEs - actEf;
    }

    const esCritica = Math.abs(holguraTotal) < 1e-4;
    if (esCritica) {
      rutaCriticaNombres.push(a.nombre);
    }

    variablesDecision[`${a.nombre} [ES:${actEs}h, EF:${actEf}h, Holgura:${holguraTotal}h]`] =
      esCritica ? 1 : 0;

    resultadosDetalle.push({
      id: a.id,
      nombre: a.nombre,
      duracion: a.duracionHoras,
      es: actEs,
      ef: actEf,
      ls: actLs,
      lf: actLf,
      holguraTotal,
      holguraLibre,
      esCritica,
    });
  });

  const interpretacion =
    `Análisis de Ruta Crítica (CPM): Duración mínima del lote = ${maxProjectDuration} horas. ` +
    `Ruta Crítica identificada (${rutaCriticaNombres.length} tareas de holgura cero): ` +
    `${rutaCriticaNombres.join(" ➔ ")}. Cualquier demora en estas etapas retrasa directamente la entrega final.`;

  return {
    esFactible: true,
    valorObjetivo: maxProjectDuration,
    unidadesObjetivo: "Horas Totales del Ciclo de Producción",
    tiempoResolucionMs: Date.now() - startTime,
    variablesDecision,
    interpretacion,
    detallesCalculo: {
      duracionTotalHoras: maxProjectDuration,
      rutaCriticaNombres,
      tablaActividades: resultadosDetalle,
    },
  };
}
