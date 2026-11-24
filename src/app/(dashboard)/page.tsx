"use client";

import React, { useEffect, useState } from "react";
import {
  Package,
  ShoppingCart,
  Truck,
  ShieldAlert,
  Boxes,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Link from "next/link";
import { EmptyState } from "@/components/common/EmptyState";

const COLORS_LINEA = ["#16a34a", "#f97316", "#0284c7", "#a855f7"];

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/stats");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-cin-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Cargando indicadores operativos en tiempo real...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.kpis) {
    return (
      <EmptyState
        titulo="Error al cargar indicadores"
        descripcion="No se pudieron conectar los indicadores con la base de datos."
        onAccion={fetchStats}
        textoAccion="Reintentar conexión"
      />
    );
  }

  const { kpis, alertas, inventarioPorProducto } = data;

  // Datos para gráfico de inventario
  const chartDataInventario = inventarioPorProducto.map((p: any) => ({
    name: p.nombre.length > 18 ? p.nombre.substring(0, 16) + "..." : p.nombre,
    "Stock Actual": p.stockActual,
    "Mínimo Requerido": p.stockMinimo,
    "Capacidad Máx": p.stockMaximo,
    linea: p.linea,
  }));

  // Distribución por líneas
  const totalHervidos = inventarioPorProducto
    .filter((p: any) => p.linea === "HERVIDOS")
    .reduce((acc: number, p: any) => acc + p.stockActual, 0);

  const totalJugos = inventarioPorProducto
    .filter((p: any) => p.linea === "JUGOS")
    .reduce((acc: number, p: any) => acc + p.stockActual, 0);

  const pieData = [
    { name: "Línea Hervidos", value: totalHervidos },
    { name: "Línea Jugos", value: totalJugos },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-cin-600 text-white rounded-full">
              Industrias CIN
            </span>
            <span className="text-xs text-slate-400">Plataforma Operativa Central</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Panel de Control Ejecutivo</h2>
          <p className="text-xs text-slate-400">
            Monitoreo en tiempo real de producción, inventario en almacenes, pedidos OTIF y calidad.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar KPIs
          </button>
          <Link
            href="/reportes"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-cin-600 hover:bg-cin-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Descargar Reporte
          </Link>
        </div>
      </div>

      {/* Grid de KPIs Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Productos y Stock */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Stock en Kardex</span>
            <Package className="w-4 h-4 text-cin-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{kpis.stockTotalPaquetes} <span className="text-xs font-normal text-slate-500">paq</span></p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Disponibles: <strong className="text-slate-800">{kpis.stockTotalDisponible}</strong></span>
            <span>Comprometidos: <strong className="text-amber-700">{kpis.stockTotalComprometido}</strong></span>
          </div>
        </div>

        {/* KPI 2: Pedidos y OTIF */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Cumplimiento SLA</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{kpis.porcentajePuntuales}%</p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Entregados: <strong className="text-slate-800">{kpis.pedidosEntregados}</strong></span>
            <span>Retrasados: <strong className="text-rose-600">{kpis.pedidosRetrasados}</strong></span>
          </div>
        </div>

        {/* KPI 3: Ocupación Almacenes */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Ocupación Almacenes</span>
            <Boxes className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{kpis.porcentajeUsoAlmacenamiento}%</p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Ocupado: <strong className="text-slate-800">{kpis.stockTotalPaquetes}</strong></span>
            <span>Capacidad: <strong className="text-slate-800">{kpis.capacidadTotalAlmacenes}</strong></span>
          </div>
        </div>

        {/* KPI 4: Calidad y Mermas */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Pérdidas por Daños</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">Bs. {kpis.costoTotalDanos.toFixed(2)}</p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Paquetes: <strong className="text-slate-800">{kpis.totalPaquetesDanados}</strong></span>
            <span className="text-amber-700 font-medium">Costo Estimado</span>
          </div>
        </div>
      </div>

      {/* Alertas Inteligentes Automatizadas */}
      {alertas && alertas.length > 0 && (
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Alertas Inteligentes Automatizadas ({alertas.length})
            </h3>
            <span className="text-[11px] text-slate-400">Detección continua sobre datos de base de datos</span>
          </div>

          <div className="space-y-2">
            {alertas.map((al: any, idx: number) => {
              const borderCol =
                al.severidad === "alta"
                  ? "border-rose-200 bg-rose-50/60"
                  : al.severidad === "media"
                  ? "border-amber-200 bg-amber-50/60"
                  : "border-slate-200 bg-slate-50";

              const badgeCol =
                al.severidad === "alta"
                  ? "bg-rose-100 text-rose-800"
                  : al.severidad === "media"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-700";

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-2 ${borderCol}`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${badgeCol}`}>
                        {al.tipo}
                      </span>
                      <p className="text-xs font-semibold text-slate-900">{al.titulo}</p>
                    </div>
                    <p className="text-[11px] text-slate-600">{al.motivo}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-block text-[10px] font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-700">
                      {al.datosUtilizados}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gráficos Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Inventario vs Mínimos por Producto */}
        <div className="lg:col-span-2 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Inventario Físico vs Stock Mínimo de Seguridad (Paquetes x6)
              </h3>
              <p className="text-[11px] text-slate-400">Datos derivados directamente de movimientos de Kardex</p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-cin-50 text-cin-700 border border-cin-200 rounded">
              Datos Recopilados
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataInventario} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar dataKey="Stock Actual" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Mínimo Requerido" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Proporción de Stock por Línea */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Distribución por Línea de Producto
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-cin-50 text-cin-700 border border-cin-200 rounded">
                Recopilado
              </span>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_LINEA[index % COLORS_LINEA.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cin-600" />
                Línea Hervidos (Canela, Jengibre, etc.)
              </span>
              <strong className="text-slate-800">{totalHervidos} paq</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Línea Jugos (Naranja, Mango, etc.)
              </span>
              <strong className="text-slate-800">{totalJugos} paq</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
