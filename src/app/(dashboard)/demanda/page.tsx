"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, AlertCircle, RefreshCw, BarChart2, ShieldCheck, HelpCircle } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { DataOriginBadge } from "@/components/common/DataOriginBadge";

export default function DemandaPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDemanda = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/demanda");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemanda();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-xs text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-cin-600 mb-2" />
          Procesando clasificación ABC y análisis de rotación real...
        </div>
      </div>
    );
  }

  const { totalValorVentasGlobal, analisis } = data || { totalValorVentasGlobal: 0, analisis: [] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cin-600" />
            Análisis de Demanda, Clasificación ABC y Rotación
          </h2>
          <p className="text-xs text-slate-500">
            Clasificación estricta por volumen de ventas real. Si no hay historial suficiente, se declara insuficiencia de datos.
          </p>
        </div>

        <button
          onClick={fetchDemanda}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Recalcular Pareto ABC
        </button>
      </div>

      {/* Regla Crítica */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">Política Estricta de Integridad Operativa:</strong>
          Los pronósticos y rotaciones se calculan exclusivamente sobre facturación y despachos reales registrados en base de datos.
          Los           productos sin tres meses completos de entregas reales permanecen en estado <strong>Datos Insuficientes</strong>.
        </div>
      </div>

      {/* Tabla Clasificación ABC */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Matriz de Clasificación ABC por Ventas Acumuladas
            </h3>
            <p className="text-[11px] text-slate-400">
              Ventas Totales Reales: <strong>S/ {totalValorVentasGlobal.toFixed(2)}</strong> (Base de Pedidos Entregados)
            </p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
            Datos Recopilados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Línea</th>
                <th className="px-4 py-3">Ventas Reales (PEN)</th>
                <th className="px-4 py-3">Paquetes Vendidos</th>
                <th className="px-4 py-3">% Acumulado</th>
                <th className="px-4 py-3">Clase ABC</th>
                <th className="px-4 py-3">Nivel Rotación</th>
                <th className="px-4 py-3">Riesgos Operativos</th>
                <th className="px-4 py-3">Estado Pronóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analisis.map((item: any) => {
                const abcColor =
                  item.claseABC === "A"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : item.claseABC === "B"
                    ? "bg-blue-100 text-blue-800 border-blue-300"
                    : item.claseABC === "C"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-slate-100 text-slate-600 border-slate-300";

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">{item.sku}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{item.linea}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      S/ {item.valorVentasReal.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.paquetesVendidos} paq</td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {item.porcentajeAcumulado > 0 ? `${item.porcentajeAcumulado}%` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${abcColor}`}>
                        {item.claseABC}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-700">{item.rotacion}</span>
                    </td>
                    <td className="px-4 py-3">
                      {item.riesgoAgotamiento ? (
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded border border-rose-200">
                          Riesgo Agotamiento
                        </span>
                      ) : item.riesgoSobreinventario ? (
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded border border-blue-200">
                          Sobreinventario
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Normal</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.pronostico.estado === "DISPONIBLE" ? (
                        <span className="text-emerald-700 font-semibold text-[11px]">
                          Est: {item.pronostico.demandaEstimadaSiguientePeriodo} paq (Tendencia: {item.pronostico.tendencia})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 italic text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          <HelpCircle className="w-3 h-3 text-slate-400" />
                          Datos insuficientes
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
