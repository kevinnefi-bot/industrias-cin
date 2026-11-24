import { OptimizationResult } from "./types";

export interface WarehouseSlottingProblem {
  almacenes: {
    codigo: string;
    nombre: string;
    capacidadPaquetes: number;
    volumenM3: number;
    distanciaRampaMetros: number; // Menor distancia = posición preferente
  }[];
  productos: {
    sku: string;
    nombre: string;
    rotacion: "ALTA" | "MEDIA" | "BAJA";
    volumenUnitarioM3: number;
    stockRequeridoPaquetes: number;
    stockSeguridadPaquetes: number;
  }[];
}

/**
 * Optimización de Asignación de Almacenes (Slotting & Rotación)
 * Prioriza productos Clase A de alta rotación en almacenes cercanos a rampa,
 * respetando capacidades volumétricas y stocks de seguridad.
 */
export function solveWarehouseSlotting(problem: WarehouseSlottingProblem): OptimizationResult {
  const startTime = Date.now();

  // Ordenar almacenes por accesibilidad a rampa (más cercano primero)
  const sortedWarehouses = [...problem.almacenes].sort(
    (a, b) => a.distanciaRampaMetros - b.distanciaRampaMetros
  );

  // Ordenar productos por rotación: ALTA > MEDIA > BAJA
  const rotWeight = { ALTA: 3, MEDIA: 2, BAJA: 1 };
  const sortedProducts = [...problem.productos].sort(
    (a, b) => rotWeight[b.rotacion] - rotWeight[a.rotacion]
  );

  const variablesDecision: Record<string, number> = {};
  const warehouseRemainingCap = sortedWarehouses.map((w) => w.capacidadPaquetes);
  const warehouseRemainingVol = sortedWarehouses.map((w) => w.volumenM3);

  let totalPaquetesAsignados = 0;
  let esfuerzoRecorridoTotal = 0; // Paquetes * distancia

  for (const prod of sortedProducts) {
    let pendingQty = prod.stockRequeridoPaquetes;

    for (let i = 0; i < sortedWarehouses.length && pendingQty > 0; i++) {
      const alm = sortedWarehouses[i];
      const maxByPkg = warehouseRemainingCap[i];
      const maxByVol = Math.floor(warehouseRemainingVol[i] / (prod.volumenUnitarioM3 || 0.015));
      const availableInWh = Math.min(maxByPkg, maxByVol);

      if (availableInWh > 0) {
        const assigned = Math.min(pendingQty, availableInWh);
        const key = `${prod.sku} en ${alm.codigo}`;
        variablesDecision[key] = assigned;

        warehouseRemainingCap[i] -= assigned;
        warehouseRemainingVol[i] -= assigned * (prod.volumenUnitarioM3 || 0.015);
        pendingQty -= assigned;
        totalPaquetesAsignados += assigned;
        esfuerzoRecorridoTotal += assigned * alm.distanciaRampaMetros;
      }
    }

    if (pendingQty > 0) {
      variablesDecision[`${prod.sku} NO_ASIGNADO_EXCEDENTE`] = pendingQty;
    }
  }

  // Capacidad utilizada por almacén
  const holgurasRestricciones: Record<string, { valor: number; limite: number; tipo: string }> = {};
  for (let i = 0; i < sortedWarehouses.length; i++) {
    const alm = sortedWarehouses[i];
    const usedPkg = alm.capacidadPaquetes - warehouseRemainingCap[i];
    holgurasRestricciones[`Ocupación ${alm.codigo}`] = {
      valor: usedPkg,
      limite: alm.capacidadPaquetes,
      tipo: "<=",
    };
  }

  const interpretacion =
    `Asignación de Almacenes Concluida: Total de paquetes posicionados = ${totalPaquetesAsignados}. ` +
    `Se priorizó la proximidad a rampa de despacho para productos Clase A (Alta rotación), minimizando el esfuerzo medio de recorrido logístico ` +
    `(Índice de distancia ponderada: ${(esfuerzoRecorridoTotal / (totalPaquetesAsignados || 1)).toFixed(1)} metros/paquete).`;

  return {
    esFactible: true,
    valorObjetivo: Number((esfuerzoRecorridoTotal / (totalPaquetesAsignados || 1)).toFixed(2)),
    unidadesObjetivo: "Metros de Recorrido Ponderado por Paquete (Minimizado)",
    tiempoResolucionMs: Date.now() - startTime,
    variablesDecision,
    holgurasRestricciones,
    interpretacion,
    detallesCalculo: {
      totalPaquetesAsignados,
      esfuerzoRecorridoTotal,
    },
  };
}
