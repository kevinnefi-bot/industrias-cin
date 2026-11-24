export interface PronosticoDemanda {
  estado: "DISPONIBLE" | "DATOS_INSUFICIENTES";
  demandaEstimadaSiguientePeriodo: number | null;
  tendencia: "CRECIENTE" | "DECRECIENTE" | "ESTABLE" | "INDETERMINADA";
  periodosUtilizados: string[];
}

export function calcularPronosticoMensual(
  ventasMensuales: Record<string, number>,
  periodos: string[]
): PronosticoDemanda {
  const tieneHistorialCompleto =
    periodos.length === 3 &&
    periodos.every(
      (periodo) =>
        Object.prototype.hasOwnProperty.call(ventasMensuales, periodo) &&
        Number.isFinite(ventasMensuales[periodo]) &&
        ventasMensuales[periodo] >= 0
    );

  if (!tieneHistorialCompleto) {
    return {
      estado: "DATOS_INSUFICIENTES",
      demandaEstimadaSiguientePeriodo: null,
      tendencia: "INDETERMINADA",
      periodosUtilizados: [],
    };
  }

  const ventas = periodos.map((periodo) => ventasMensuales[periodo]);
  const promedio = ventas.reduce((total, cantidad) => total + cantidad, 0) / ventas.length;
  const tendencia =
    ventas[2] > ventas[0]
      ? "CRECIENTE"
      : ventas[2] < ventas[0]
        ? "DECRECIENTE"
        : "ESTABLE";

  return {
    estado: "DISPONIBLE",
    demandaEstimadaSiguientePeriodo: Math.round(promedio),
    tendencia,
    periodosUtilizados: periodos,
  };
}
