"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Package,
  ShoppingCart,
  Truck,
  ShieldAlert,
  Boxes,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  DollarSign,
  Factory,
  Activity,
  Calendar,
} from "lucide-react";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Link from "next/link";
import { EmptyState } from "@/components/common/EmptyState";

const COLORS_LINEA = ["#16a34a", "#f97316", "#0284c7", "#a855f7"];

const RANGOS = [
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "3m", label: "3 meses" },
  { id: "6m", label: "6 meses" },
  { id: "1y", label: "1 año" },
  { id: "custom", label: "Personalizado" },
];

const METRICAS = [
  { id: "ingresos", label: "Ingresos (Bs.)", unit: "Bs." },
  { id: "ventas", label: "Ventas (Paq.)", unit: "paq" },
  { id: "produccion", label: "Producción (Paq.)", unit: "paq" },
  { id: "costos", label: "Costos / Mermas (Bs.)", unit: "Bs." },
  { id: "pedidos", label: "Pedidos", unit: "ped" },
  { id: "inventario", label: "Inventario (Paq.)", unit: "paq" },
];

function TrendBadge({ variacion, tendencia, invertColor = false }: { variacion: number; tendencia: string; invertColor?: boolean }) {
  const isPositive = invertColor ? tendencia === "down" : tendencia === "up";
  const isNegative = invertColor ? tendencia === "up" : tendencia === "down";

  const colorClass = isPositive
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isNegative
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${colorClass}`}>
      {tendencia === "up" && <TrendingUp className="w-3 h-3" />}
      {tendencia === "down" && <TrendingDown className="w-3 h-3" />}
      {tendencia === "neutral" && <Minus className="w-3 h-3" />}
      {variacion > 0 ? `+${variacion}%` : `${variacion}%`}
    </span>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [metric, setMetric] = useState("ingresos");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comparePeriods, setComparePeriods] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ range, metric });
      if (range === "custom" && startDate && endDate) {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      }
      const res = await fetch(`/api/dashboard/stats?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [range, metric, startDate, endDate]);

  useEffect(() => {
    if (range !== "custom" || (startDate && endDate)) {
      fetchStats();
    }
  }, [fetchStats, range, startDate, endDate]);

  if (loading && !data) {
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

  const { kpis, kpisComparativos, serieTemporal, alertas, inventarioPorProducto, ultimaActualizacion } = data;
  const activeMetricObj = METRICAS.find((m) => m.id === metric) || METRICAS[0];

  const chartDataInventario = (inventarioPorProducto || []).map((p: any) => ({
    name: p.nombre.length > 18 ? p.nombre.substring(0, 16) + "..." : p.nombre,
    "Stock Actual": p.stockActual,
    "Mínimo Requerido": p.stockMinimo,
    "Capacidad Máx": p.stockMaximo,
    linea: p.linea,
  }));

  const totalHervidos = (inventarioPorProducto || [])
    .filter((p: any) => p.linea === "HERVIDOS")
    .reduce((acc: number, p: any) => acc + p.stockActual, 0);

  const totalJugos = (inventarioPorProducto || [])
    .filter((p: any) => p.linea === "JUGOS")
    .reduce((acc: number, p: any) => acc + p.stockActual, 0);

  const pieData = [
    { name: "Línea Hervidos", value: totalHervidos },
    { name: "Línea Jugos", value: totalJugos },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Centro de Control Empresarial</h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Industrias CIN · Monitoreo en tiempo real</span>
            {ultimaActualizacion && (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Clock className="w-3 h-3" />
                Actualizado: {new Date(ultimaActualizacion).toLocaleString("es-BO")}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cin-600" : ""}`} />
          Actualizar Datos
        </button>
      </div>

      {/* 8 KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Producción Total */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Producción Total</span>
            <Factory className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {kpisComparativos?.produccion?.actual?.toLocaleString() ?? 0} <span className="text-xs font-normal text-slate-500">paq</span>
            </span>
            {kpisComparativos?.produccion && (
              <TrendBadge variacion={kpisComparativos.produccion.variacion} tendencia={kpisComparativos.produccion.tendencia} />
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Periodo anterior: {kpisComparativos?.produccion?.anterior?.toLocaleString() ?? 0} paq
          </p>
        </div>

        {/* 2. Ventas Totales */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Ventas Totales</span>
            <ShoppingCart className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {kpisComparativos?.ventas?.actual?.toLocaleString() ?? 0} <span className="text-xs font-normal text-slate-500">paq</span>
            </span>
            {kpisComparativos?.ventas && (
              <TrendBadge variacion={kpisComparativos.ventas.variacion} tendencia={kpisComparativos.ventas.tendencia} />
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Periodo anterior: {kpisComparativos?.ventas?.anterior?.toLocaleString() ?? 0} paq
          </p>
        </div>

        {/* 3. Ingresos */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Ingresos</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              Bs. {kpisComparativos?.ingresos?.actual?.toLocaleString() ?? 0}
            </span>
            {kpisComparativos?.ingresos && (
              <TrendBadge variacion={kpisComparativos.ingresos.variacion} tendencia={kpisComparativos.ingresos.tendencia} />
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Periodo anterior: Bs. {kpisComparativos?.ingresos?.anterior?.toLocaleString() ?? 0}
          </p>
        </div>

        {/* 4. Costos Operativos / Mermas */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Costos por Mermas</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              Bs. {kpisComparativos?.costos?.actual?.toLocaleString() ?? 0}
            </span>
            {kpisComparativos?.costos && (
              <TrendBadge variacion={kpisComparativos.costos.variacion} tendencia={kpisComparativos.costos.tendencia} invertColor />
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Periodo anterior: Bs. {kpisComparativos?.costos?.anterior?.toLocaleString() ?? 0}
          </p>
        </div>

        {/* 5. Inventario Disponible */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Inventario Disponible</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {kpis.stockTotalDisponible.toLocaleString()} <span className="text-xs font-normal text-slate-500">paq</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {kpis.porcentajeUsoAlmacenamiento}% cap.
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            {kpis.stockCriticoCount} productos en stock crítico
          </p>
        </div>

        {/* 6. Pedidos Pendientes */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pedidos Pendientes</span>
            <Package className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{kpis.pedidosPendientes}</span>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              {kpis.pedidosEnTransito} en tránsito
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            {kpis.pedidosRetrasados} pedidos con retraso SLA
          </p>
        </div>

        {/* 7. Cumplimiento de Objetivos (SLA) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cumplimiento SLA</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{kpis.porcentajePuntuales}%</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {kpis.pedidosEntregados} entregados
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Meta corporativa: 95.0% puntualidad
          </p>
        </div>

        {/* 8. Eficiencia Operativa */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Eficiencia Operativa</span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{kpis.eficienciaOperativa ?? 100}%</span>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Truck className="w-3 h-3" /> {kpis.vehiculosDisponibles}/{kpis.vehiculosTotales} flota
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Índice combinado SLA + disponibilidad flota
          </p>
        </div>
      </div>

      {/* Gráfico Lineal Dinámico Principal */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Evolución Dinámica de Indicadores</h2>
            <p className="text-xs text-slate-500">
              Análisis temporal de {activeMetricObj.label} con comparación frente al periodo anterior
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de Métrica */}
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-cin-500"
            >
              {METRICAS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Selector de Rango */}
            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg">
              {RANGOS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    range === r.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Toggle Comparación */}
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer ml-1">
              <input
                type="checkbox"
                checked={comparePeriods}
                onChange={(e) => setComparePeriods(e.target.checked)}
                className="rounded border-slate-300 text-cin-600 focus:ring-cin-500"
              />
              Comparar periodo anterior
            </label>
          </div>
        </div>

        {range === "custom" && (
          <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white"
              />
            </div>
          </div>
        )}

        <div className="h-72 w-full">
          {serieTemporal && serieTemporal.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serieTemporal} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="periodoActual"
                  name={`Periodo Actual (${activeMetricObj.unit})`}
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                {comparePeriods && (
                  <Line
                    type="monotone"
                    dataKey="periodoAnterior"
                    name={`Periodo Anterior (${activeMetricObj.unit})`}
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">
              No hay suficientes datos registrados en el rango seleccionado.
            </div>
          )}
        </div>
      </div>

      {/* Gráficos de Inventario y Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras: Stock Actual vs Mínimo */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Nivel de Existencias por Producto</h2>
              <p className="text-xs text-slate-500">Comparación de stock actual frente a mínimo de seguridad</p>
            </div>
            <Link href="/inventario" className="text-xs font-semibold text-cin-600 hover:underline">
              Ver Kardex →
            </Link>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataInventario} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="Stock Actual" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Mínimo Requerido" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución por Línea + Alertas */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1">Distribución por Línea</h2>
            <p className="text-xs text-slate-500 mb-3">Participación en paquetes en stock</p>
            <div className="h-44 w-full">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS_LINEA[idx % COLORS_LINEA.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">Sin stock registrado</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Alertas Activas ({alertas.length})
              </h2>
            </div>
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {alertas.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No hay alertas críticas activas.</p>
              ) : (
                alertas.slice(0, 6).map((a: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs ${
                      a.severidad === "alta"
                        ? "bg-red-50/70 border-red-200 text-red-900"
                        : a.severidad === "media"
                        ? "bg-amber-50/70 border-amber-200 text-amber-900"
                        : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    <p className="font-bold">{a.titulo}</p>
                    <p className="text-[11px] opacity-85 mt-0.5">{a.motivo}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
