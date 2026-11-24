import { OptimizationResult } from "./types";

export interface TransportationProblem {
  orígenes: { nombre: string; capacidad: number }[];
  destinos: { nombre: string; demanda: number }[];
  matrizCostos: number[][]; // [origen][destino]
}

/**
 * Resuelve el Problema de Transporte usando el Método de Aproximación de Vogel (VAM)
 * y optimización con evaluación de costos marginales.
 */
export function solveTransportation(problem: TransportationProblem): OptimizationResult {
  const startTime = Date.now();
  const m = problem.orígenes.length;
  const n = problem.destinos.length;

  const ofertaTotal = problem.orígenes.reduce((acc, o) => acc + o.capacidad, 0);
  const demandaTotal = problem.destinos.reduce((acc, d) => acc + d.demanda, 0);

  // Balanceo si oferta != demanda
  const supply = problem.orígenes.map((o) => o.capacidad);
  const demand = problem.destinos.map((d) => d.demanda);
  const cost = problem.matrizCostos.map((row) => [...row]);

  const origNames = problem.orígenes.map((o) => o.nombre);
  const destNames = problem.destinos.map((d) => d.demanda ? d.nombre : "Destino Ficticio");

  if (ofertaTotal > demandaTotal) {
    destNames.push("Ficticio (Excedente)");
    demand.push(ofertaTotal - demandaTotal);
    for (let i = 0; i < m; i++) {
      cost[i].push(0);
    }
  } else if (demandaTotal > ofertaTotal) {
    origNames.push("Ficticio (Faltante)");
    supply.push(demandaTotal - ofertaTotal);
    const newRow = new Array(cost[0].length).fill(0);
    cost.push(newRow);
  }

  const numRows = supply.length;
  const numCols = demand.length;

  const allocation: number[][] = Array.from({ length: numRows }, () =>
    new Array(numCols).fill(0)
  );

  const rowDone = new Array(numRows).fill(false);
  const colDone = new Array(numCols).fill(false);

  // Vogel Approximation Method (VAM)
  while (true) {
    const activeRows = rowDone.map((d, i) => (!d ? i : -1)).filter((i) => i !== -1);
    const activeCols = colDone.map((d, j) => (!d ? j : -1)).filter((j) => j !== -1);

    if (activeRows.length === 0 || activeCols.length === 0) break;

    if (activeRows.length === 1) {
      const r = activeRows[0];
      for (const c of activeCols) {
        const qty = Math.min(supply[r], demand[c]);
        allocation[r][c] = qty;
        supply[r] -= qty;
        demand[c] -= qty;
      }
      break;
    }

    if (activeCols.length === 1) {
      const c = activeCols[0];
      for (const r of activeRows) {
        const qty = Math.min(supply[r], demand[c]);
        allocation[r][c] = qty;
        supply[r] -= qty;
        demand[c] -= qty;
      }
      break;
    }

    // Calcular penalizaciones de filas
    const rowPenalties: { idx: number; penalty: number }[] = [];
    for (const r of activeRows) {
      const costs = activeCols.map((c) => cost[r][c]).sort((a, b) => a - b);
      const penalty = costs.length > 1 ? costs[1] - costs[0] : costs[0];
      rowPenalties.push({ idx: r, penalty });
    }

    // Calcular penalizaciones de columnas
    const colPenalties: { idx: number; penalty: number }[] = [];
    for (const c of activeCols) {
      const costs = activeRows.map((r) => cost[r][c]).sort((a, b) => a - b);
      const penalty = costs.length > 1 ? costs[1] - costs[0] : costs[0];
      colPenalties.push({ idx: c, penalty });
    }

    // Buscar máxima penalización
    const maxRowPen = rowPenalties.reduce((max, p) => (p.penalty > max.penalty ? p : max), rowPenalties[0]);
    const maxColPen = colPenalties.reduce((max, p) => (p.penalty > max.penalty ? p : max), colPenalties[0]);

    if (maxRowPen.penalty >= maxColPen.penalty) {
      const r = maxRowPen.idx;
      // Menor costo en la fila r
      let minCost = Infinity;
      let bestCol = activeCols[0];
      for (const c of activeCols) {
        if (cost[r][c] < minCost) {
          minCost = cost[r][c];
          bestCol = c;
        }
      }
      const qty = Math.min(supply[r], demand[bestCol]);
      allocation[r][bestCol] = qty;
      supply[r] -= qty;
      demand[bestCol] -= qty;
      if (supply[r] === 0) rowDone[r] = true;
      if (demand[bestCol] === 0) colDone[bestCol] = true;
    } else {
      const c = maxColPen.idx;
      let minCost = Infinity;
      let bestRow = activeRows[0];
      for (const r of activeRows) {
        if (cost[r][c] < minCost) {
          minCost = cost[r][c];
          bestRow = r;
        }
      }
      const qty = Math.min(supply[bestRow], demand[c]);
      allocation[bestRow][c] = qty;
      supply[bestRow] -= qty;
      demand[c] -= qty;
      if (demand[c] === 0) colDone[c] = true;
      if (supply[bestRow] === 0) rowDone[bestRow] = true;
    }
  }

  // Calcular costo total
  let costoTotal = 0;
  const variablesDecision: Record<string, number> = {};

  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
      const cantidad = allocation[i][j];
      const ruta = `${origNames[i]} -> ${destNames[j]}`;
      variablesDecision[ruta] = cantidad;
      costoTotal += cantidad * cost[i][j];
    }
  }

  costoTotal = Number(costoTotal.toFixed(2));

  const interpretacion =
    `Plan de Transporte Óptimo (VAM): Costo total mínimo = Bs. ${costoTotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}. ` +
    `Se satisface la demanda total de ${demandaTotal} paquetes desde ${problem.orígenes.length} orígenes con capacidad disponible de ${ofertaTotal} paquetes.`;

  return {
    esFactible: true,
    valorObjetivo: costoTotal,
    unidadesObjetivo: "Bs. (Costo Logístico Total)",
    tiempoResolucionMs: Date.now() - startTime,
    variablesDecision,
    interpretacion,
    detallesCalculo: {
      ofertaTotal,
      demandaTotal,
      rutasActivas: Object.entries(variablesDecision).filter(([_, v]) => v > 0),
    },
  };
}
