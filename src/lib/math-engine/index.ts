import { OptimizationResult } from "./types";
import { solveSimplex } from "./simplex-solver";
import { solveTransportation } from "./transportation-solver";
import { solveKnapsack01 } from "./knapsack-solver";
import { solveWarehouseSlotting } from "./warehouse-optimizer";
import { solveLotSizing } from "./inventory-lot-sizing";
import { solveResourceAllocation } from "./resource-allocator";
import { solveMaintenanceAssignment } from "./maintenance-scheduler";
import { solveCPM } from "./cpm-network";
import { solveDecisionTheory } from "./decision-theory";

export const MODELOS_CATALOGO = [
  {
    codigo: "MODELO_A",
    nombre: "Modelo A: Programación Lineal (Mix y Capacidad Pedidos Prioritarios)",
    descripcion: "Maximiza el margen de contribución sujeto a cuellos de botella en marmitas de hervido, pasteurizado flash y horas de envasado.",
    categoria: "Producción y Capacidad",
    metodo: "Método Simplex Primal / Dos Fases",
  },
  {
    codigo: "MODELO_B",
    nombre: "Modelo B: Problema de Transporte (Distribución a Zonas)",
    descripcion: "Minimiza el costo total de despacho desde planta y almacenes hacia las zonas Norte, Centro y Sur con balanceo de oferta/demanda.",
    categoria: "Logística y Transporte",
    metodo: "Método de Aproximación de Vogel (VAM)",
  },
  {
    codigo: "MODELO_C",
    nombre: "Modelo C: Protección contra Daños y Mermas (0-1 MIP)",
    descripcion: "Optimiza la selección de tecnologías de embalaje y amortiguación para minimizar pérdidas por botellas rotas bajo presupuesto limitado.",
    categoria: "Calidad y Daños",
    metodo: "Programación Dinámica Mochila 0-1 (Knapsack)",
  },
  {
    codigo: "MODELO_D",
    nombre: "Modelo D: Asignación de Almacenes y Slotting de Inventario",
    descripcion: "Asigna inventario para maximizar el uso volumétrico y priorizar productos de alta rotación (Clase A) cercanos a rampa de carga.",
    categoria: "Almacenamiento",
    metodo: "Heurística de Slotting Ponderado por Rotación",
  },
  {
    codigo: "MODELO_E",
    nombre: "Modelo E: Reposición de Faltantes y Lote Económico (EOQ / ROP)",
    descripcion: "Determina el tamaño óptimo de lote Q*, punto de reorden ROP y stock de seguridad para evitar roturas de stock bajo demanda estocástica.",
    categoria: "Inventario",
    metodo: "EOQ Clásico + Safety Stock con Nivel de Servicio Z",
  },
  {
    codigo: "MODELO_F",
    nombre: "Modelo F: Optimización de Agua y Electricidad Mensual",
    descripcion: "Programa la producción mensual minimizando el consumo de agua y energía eléctrica aprovechando la tarifa horaria valle.",
    categoria: "Servicios Industriales",
    metodo: "Programación Lineal Continua (Simplex)",
  },
  {
    codigo: "MODELO_G",
    nombre: "Modelo G: Selección de Inversiones en Planta (Capex 0-1)",
    descripcion: "Selecciona el portafolio de proyectos de modernización de maquinaria que maximiza el ahorro operativo dentro del presupuesto de capital.",
    categoria: "Finanzas y Planta",
    metodo: "Programación Entera Binaria 0-1",
  },
  {
    codigo: "MODELO_H",
    nombre: "Modelo H: Asignación de Mantenimiento Preventivo",
    descripcion: "Asigna especialistas técnicos a tareas críticas en calderas, prensas y envasadoras minimizando las horas-persona de paro técnico.",
    categoria: "Mantenimiento",
    metodo: "Algoritmo Húngaro (Kuhn-Munkres)",
  },
  {
    codigo: "MODELO_I",
    nombre: "Modelo I: CPM (Ruta Crítica de Lotes de Producción)",
    descripcion: "Determina tiempos tempranos, tardíos, holguras totales y libres, identificando la ruta crítica que rige la entrega del lote.",
    categoria: "Planificación Operativa",
    metodo: "Critical Path Method (Forward/Backward Pass)",
  },
  {
    codigo: "MODELO_J",
    nombre: "Modelo J: Teoría de Decisiones Estratégicas",
    descripcion: "Evalúa matrices de pago ante incertidumbre de demanda con criterios VME, Maximin (Wald), Maximax, Hurwicz y Savage Minimax Regret.",
    categoria: "Estrategia Gerencial",
    metodo: "Criterios Multiatributo bajo Incertidumbre y Riesgo",
  },
];

export function resolverModelo(codigo: string, parametros: any): OptimizationResult {
  switch (codigo) {
    case "MODELO_A":
      return solveSimplex(parametros);
    case "MODELO_B":
      return solveTransportation(parametros);
    case "MODELO_C":
    case "MODELO_G":
      return solveKnapsack01(parametros);
    case "MODELO_D":
      return solveWarehouseSlotting(parametros);
    case "MODELO_E":
      return solveLotSizing(parametros);
    case "MODELO_F":
      return solveResourceAllocation(parametros);
    case "MODELO_H":
      return solveMaintenanceAssignment(parametros);
    case "MODELO_I":
      return solveCPM(parametros);
    case "MODELO_J":
      return solveDecisionTheory(parametros);
    default:
      throw new Error(`Modelo con código "${codigo}" no reconocido en el motor matemático.`);
  }
}
