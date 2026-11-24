"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Activity, BarChart3, Play } from "lucide-react";

interface OptimizationChartsPanelProps {
  modeloCodigo: string;
  parametrosBase: any;
  resultado: any;
  historial: any[];
}

export function OptimizationChartsPanel({
  modeloCodigo,
  parametrosBase,
  resultado,
  historial,
}: OptimizationChartsPanelProps) {
  const [sensibilidad, setSensibilidad] = useState<any[]>([]);
  const [loadingSens, setLoadingSens] = useState(false);

  const runSensibilidad = async () => {
    try {
      setLoadingSens(true);
      const res = await fetch("/api/optimizacion/sensibilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modeloCodigo, parametrosBase }),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.puntos)) {
        setSensibilidad(json.puntos);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSens(false);
    }
  };

  // Variables de decisión para gráfico de barras
  const varData = resultado?.variablesDecision
    ? Object.entries(resultado.variablesDecision)
        .filter(([, v]) => typeof v === "number")
        .slice(0, 10)
        .map(([k, v]) => ({
          nombre: k.length > 14 ? k.substring(0, 12) + "..." : k,
          valor: Number(v),
        }))
    : [];

  // Comparación de escenarios del historial
  const escenariosData = (historial || []).slice(0, 6).map((h: any) => ({
    escenario: (h.nombreEscenario || "Escenario").substring(0, 15),
    valorObjetivo: Number(h.valorObjetivo || 0),
    esBase: h.esEscenarioBase,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* 1. Análisis de Sensibilidad Real */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cin-600" />
              Análisis de Sensibilidad Real (-20% a +20%)
            </h4>
            <p className="text-[11px] text-slate-500">
              Re-ejecuta el solucionador matemático variando el parámetro clave del modelo
            </p>
          </div>
          <button
            type="button"
            onClick={runSensibilidad}
            disabled={loadingSens}
            className="px-3 py-1.5 text-xs font-semibold bg-cin-50 text-cin-700 hover:bg-cin-100 border border-cin-200 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            {loadingSens ? "Calculando..." : "Simular Sensibilidad"}
          </button>
        </div>

        <div className="h-56 w-full">
          {sensibilidad.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensibilidad} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="variacion" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line
                  type="monotone"
                  dataKey="valorObjetivo"
                  name="Valor Objetivo"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              Presione &quot;Simular Sensibilidad&quot; para evaluar el impacto de variaciones reales.
            </div>
          )}
        </div>
      </div>

      {/* 2. Comparación de Escenarios o Variables de Decisión */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            {escenariosData.length > 1 ? "Comparación de Escenarios Guardados" : "Distribución de Variables Óptimas"}
          </h4>
          <p className="text-[11px] text-slate-500">
            {escenariosData.length > 1
              ? "Valor objetivo alcanzado en las últimas simulaciones"
              : "Valores asignados a las principales variables de decisión"}
          </p>
        </div>

        <div className="h-56 w-full">
          {escenariosData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={escenariosData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="escenario" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                <Bar dataKey="valorObjetivo" name="Valor Objetivo" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : varData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={varData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                <Bar dataKey="valor" name="Valor Óptimo" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              Ejecute el modelo para visualizar el gráfico de resultados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
