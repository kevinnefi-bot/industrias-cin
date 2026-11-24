import { LPProblem, OptimizationResult } from "./types";

/**
 * Solucionador Simplex de Dos Fases de Alta Precisión
 * Soporta restricciones <=, >=, = y maximización o minimización
 */
export function solveSimplex(problem: LPProblem): OptimizationResult {
  const startTime = Date.now();
  const numVars = problem.c.length;
  const numConstraints = problem.b.length;

  // Normalización: Si es MIN, convertir a MAX invirtiendo signos
  const isMin = problem.tipo === "MIN";
  const objCoeffs = problem.c.map((val) => (isMin ? -val : val));

  // Manejo de términos independientes negativos (multiplicar fila por -1 e invertir operador)
  const A: number[][] = [];
  const b: number[] = [...problem.b];
  const ops = [...problem.operadores];

  for (let i = 0; i < numConstraints; i++) {
    A[i] = [...problem.A[i]];
    if (b[i] < 0) {
      b[i] = -b[i];
      A[i] = A[i].map((val) => -val);
      if (ops[i] === "<=") ops[i] = ">=";
      else if (ops[i] === ">=") ops[i] = "<=";
    }
  }

  // Contar variables de holgura (slack), exceso (surplus) y artificiales
  let numSlack = 0;
  let numSurplus = 0;
  let numArtificial = 0;

  for (let i = 0; i < numConstraints; i++) {
    if (ops[i] === "<=") numSlack++;
    else if (ops[i] === ">=") {
      numSurplus++;
      numArtificial++;
    } else if (ops[i] === "=") {
      numArtificial++;
    }
  }

  const needsPhase1 = numArtificial > 0;
  const totalCols = numVars + numSlack + numSurplus + numArtificial + 1; // +1 para RHS
  const totalRows = numConstraints + (needsPhase1 ? 2 : 1);

  // Inicializar Tableau
  const tableau: number[][] = Array.from({ length: totalRows }, () =>
    new Array(totalCols).fill(0)
  );

  let currentSlack = 0;
  let currentSurplus = 0;
  let currentArt = 0;
  const basicVars: number[] = new Array(numConstraints).fill(0);

  // Llenar restricciones
  for (let i = 0; i < numConstraints; i++) {
    for (let j = 0; j < numVars; j++) {
      tableau[i][j] = A[i][j];
    }

    if (ops[i] === "<=") {
      tableau[i][numVars + currentSlack] = 1;
      basicVars[i] = numVars + currentSlack;
      currentSlack++;
    } else if (ops[i] === ">=") {
      tableau[i][numVars + numSlack + currentSurplus] = -1;
      currentSurplus++;
      const artIdx = numVars + numSlack + numSurplus + currentArt;
      tableau[i][artIdx] = 1;
      basicVars[i] = artIdx;
      currentArt++;
    } else if (ops[i] === "=") {
      const artIdx = numVars + numSlack + numSurplus + currentArt;
      tableau[i][artIdx] = 1;
      basicVars[i] = artIdx;
      currentArt++;
    }

    tableau[i][totalCols - 1] = b[i];
  }

  // Configurar Fila Objetivo Original (Penúltima o Última fila)
  const origObjRow = needsPhase1 ? totalRows - 2 : totalRows - 1;
  for (let j = 0; j < numVars; j++) {
    tableau[origObjRow][j] = -objCoeffs[j];
  }

  // FASE 1 si hay variables artificiales
  if (needsPhase1) {
    const phase1ObjRow = totalRows - 1;
    const artStart = numVars + numSlack + numSurplus;
    for (let j = artStart; j < artStart + numArtificial; j++) {
      tableau[phase1ObjRow][j] = 1;
    }

    // Hacer canónica la fila de Fase 1 restando las filas donde las artificiales son básicas
    for (let i = 0; i < numConstraints; i++) {
      if (basicVars[i] >= artStart) {
        for (let c = 0; c < totalCols; c++) {
          tableau[phase1ObjRow][c] -= tableau[i][c];
        }
      }
    }

    // Iteraciones Simplex Fase 1
    const p1Success = runSimplexIterations(tableau, basicVars, phase1ObjRow, numConstraints, totalCols - 1);
    if (!p1Success || Math.abs(tableau[phase1ObjRow][totalCols - 1]) > 1e-4) {
      return {
        esFactible: false,
        valorObjetivo: 0,
        unidadesObjetivo: "",
        tiempoResolucionMs: Date.now() - startTime,
        variablesDecision: {},
        interpretacion: "El modelo es INVIABLE: No existe ninguna combinación de variables que satisfaga todas las restricciones simultáneamente.",
      };
    }
  }

  // FASE 2: Resolver con la función objetivo original
  // Hacer canónica la fila objetivo original respecto a las variables básicas actuales
  for (let i = 0; i < numConstraints; i++) {
    const bv = basicVars[i];
    const factor = tableau[origObjRow][bv];
    if (Math.abs(factor) > 1e-7) {
      for (let c = 0; c < totalCols; c++) {
        tableau[origObjRow][c] -= factor * tableau[i][c];
      }
    }
  }

  // En Fase 2 excluimos columnas artificiales
  const activeColsLimit = needsPhase1 ? numVars + numSlack + numSurplus : totalCols - 1;
  const p2Success = runSimplexIterations(tableau, basicVars, origObjRow, numConstraints, activeColsLimit);

  if (!p2Success) {
    return {
      esFactible: false,
      valorObjetivo: 0,
      unidadesObjetivo: "",
      tiempoResolucionMs: Date.now() - startTime,
      variablesDecision: {},
      interpretacion: "El modelo es NO ACOTADO: La función objetivo puede crecer infinitamente sin violar restricciones.",
    };
  }

  // Extraer valores de variables de decisión
  const variablesDecision: Record<string, number> = {};
  for (let j = 0; j < numVars; j++) {
    const varName = problem.nombresVariables[j] || `x${j + 1}`;
    const rowIdx = basicVars.indexOf(j);
    if (rowIdx !== -1) {
      variablesDecision[varName] = Math.max(0, Number(tableau[rowIdx][totalCols - 1].toFixed(4)));
    } else {
      variablesDecision[varName] = 0;
    }
  }

  let finalObjective = tableau[origObjRow][totalCols - 1];
  if (!isMin) {
    // Si era MAX, el valor en tableau[origObjRow][RHS] es el óptimo
    finalObjective = Math.abs(finalObjective);
  } else {
    // Si era MIN, invertimos el signo de vuelta
    finalObjective = -finalObjective;
  }
  finalObjective = Number(finalObjective.toFixed(4));

  // Calcular holguras y precios sombra para restricciones
  const holgurasRestricciones: Record<string, { valor: number; limite: number; tipo: string }> = {};
  const preciosSombra: Record<string, number> = {};

  for (let i = 0; i < numConstraints; i++) {
    const restName = problem.nombresRestricciones[i] || `Restriccion_${i + 1}`;
    let consumo = 0;
    for (let j = 0; j < numVars; j++) {
      const vName = problem.nombresVariables[j] || `x${j + 1}`;
      consumo += problem.A[i][j] * (variablesDecision[vName] || 0);
    }
    const holgura = Number(Math.abs(problem.b[i] - consumo).toFixed(4));
    holgurasRestricciones[restName] = {
      valor: Number(consumo.toFixed(4)),
      limite: problem.b[i],
      tipo: problem.operadores[i],
    };

    // Precio sombra estimado (dual multiplier)
    const slackCol = numVars + i;
    if (slackCol < totalCols - 1) {
      preciosSombra[restName] = Number(Math.abs(tableau[origObjRow][slackCol]).toFixed(4));
    } else {
      preciosSombra[restName] = 0;
    }
  }

  const interpretacion = `Solución Óptima Encontrada: ${problem.tipo} = $${finalObjective.toLocaleString("es-PE", { minimumFractionDigits: 2 })}. ` +
    `Se maximiza/minimiza el rendimiento operativo respetando las ${numConstraints} restricciones del sistema. ` +
    `Variables activas: ${Object.entries(variablesDecision).filter(([_, v]) => v > 0).map(([k, v]) => `${k}=${v}`).join(", ") || "Ninguna"}.`;

  return {
    esFactible: true,
    valorObjetivo: finalObjective,
    unidadesObjetivo: "PEN / Cantidad",
    tiempoResolucionMs: Date.now() - startTime,
    variablesDecision,
    holgurasRestricciones,
    preciosSombra,
    interpretacion,
  };
}

function runSimplexIterations(
  tableau: number[][],
  basicVars: number[],
  objRow: number,
  numConstraints: number,
  colsLimit: number
): boolean {
  const totalCols = tableau[0].length;
  const maxIterations = 500;
  let iter = 0;

  while (iter < maxIterations) {
    iter++;

    // 1. Elegir variable entrante (coeficiente más negativo en fila objetivo)
    let minVal = -1e-6;
    let enterCol = -1;
    for (let j = 0; j < colsLimit; j++) {
      if (tableau[objRow][j] < minVal) {
        minVal = tableau[objRow][j];
        enterCol = j;
      }
    }

    // Si no hay negativos, es óptimo
    if (enterCol === -1) return true;

    // 2. Elegir variable saliente (test de la mínima razón positiva)
    let minRatio = Infinity;
    let leaveRow = -1;

    for (let i = 0; i < numConstraints; i++) {
      const a_ij = tableau[i][enterCol];
      if (a_ij > 1e-7) {
        const ratio = tableau[i][totalCols - 1] / a_ij;
        if (ratio >= 0 && ratio < minRatio) {
          minRatio = ratio;
          leaveRow = i;
        }
      }
    }

    // Si no hay razón positiva, es no acotado
    if (leaveRow === -1) return false;

    // 3. Pivotar
    const pivot = tableau[leaveRow][enterCol];
    for (let j = 0; j < totalCols; j++) {
      tableau[leaveRow][j] /= pivot;
    }
    basicVars[leaveRow] = enterCol;

    for (let i = 0; i < tableau.length; i++) {
      if (i !== leaveRow) {
        const factor = tableau[i][enterCol];
        if (Math.abs(factor) > 1e-7) {
          for (let j = 0; j < totalCols; j++) {
            tableau[i][j] -= factor * tableau[leaveRow][j];
          }
        }
      }
    }
  }

  return true;
}
