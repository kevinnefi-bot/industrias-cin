export interface ModelInputConfig {
  codigo: string;
  nombre: string;
  descripcion: string;
  unidades: string;
  metodo: string;
  origenDatoDefault: "RECOPILADO" | "ESTIMADO";
}

export interface OptimizationResult {
  esFactible: boolean;
  valorObjetivo: number;
  unidadesObjetivo: string;
  tiempoResolucionMs: number;
  variablesDecision: Record<string, number>;
  holgurasRestricciones?: Record<string, { valor: number; limite: number; tipo: string }>;
  preciosSombra?: Record<string, number>;
  sensibilidad?: Record<string, { limiteInferior?: number; limiteSuperior?: number; valorActual: number }>;
  interpretacion: string;
  detallesCalculo?: Record<string, any>;
}

export interface LPProblem {
  tipo: "MAX" | "MIN";
  c: number[]; // Coeficientes función objetivo
  A: number[][]; // Matriz de coeficientes de restricciones
  b: number[]; // Términos independientes
  operadores: ("<=" | ">=" | "=")[];
  nombresVariables: string[];
  nombresRestricciones: string[];
}
