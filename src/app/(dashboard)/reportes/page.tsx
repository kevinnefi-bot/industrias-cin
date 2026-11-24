"use client";

import React, { useState } from "react";
import { FileSpreadsheet, Download, FileText, Calendar, Database, ShieldCheck, CheckCircle2 } from "lucide-react";
import { DataOriginBadge } from "@/components/common/DataOriginBadge";

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState("MES_ACTUAL");
  const fechaHoy = new Date().toLocaleDateString("es-PE", { dateStyle: "long" });

  const reportesDisponibles = [
    {
      id: "INVENTARIO_GENERAL",
      nombre: "Kardex e Inventario Físico-Valorizado",
      descripcion: "Existencias en paquetes, botellas y litros, stock mínimo/máximo, valorización contable y estado por almacén.",
      tipoPdf: "INVENTARIO",
      tipoExcel: "INVENTARIO_GENERAL",
      origenPrincipal: "RECOPILADO",
    },
    {
      id: "PEDIDOS_DISTRIBUCION",
      nombre: "Pedidos, Cumplimiento SLA y Logística",
      descripcion: "Detalle de pedidos entregados y en tránsito, cálculo de retraso vs fecha prometida original, zonas y camión asignado.",
      tipoPdf: "PEDIDOS",
      tipoExcel: "PEDIDOS_DISTRIBUCION",
      origenPrincipal: "REAL_FUTURO",
    },
    {
      id: "CALIDAD_DANOS",
      nombre: "Control de Calidad, Mermas y Pérdidas",
      descripcion: "Registro de botellas rotas, fallas de estiba, etapas de mayor merma, costos de pérdida estimados y acciones correctivas.",
      tipoPdf: "CALIDAD",
      tipoExcel: "CALIDAD_DANOS",
      origenPrincipal: "ESTIMADO",
    },
    {
      id: "COMPLETO",
      nombre: "Informe Ejecutivo Integral Multidisciplinario",
      descripcion: "Libro unificado de auditoría que compila todas las tablas operativas, almacenes, inventario y métricas de despacho.",
      tipoPdf: "INVENTARIO",
      tipoExcel: "COMPLETO",
      origenPrincipal: "RECOPILADO",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cin-600" />
            Centro de Reportes Ejecutivos Descargables
          </h2>
          <p className="text-xs text-slate-500">
            Exportación formal en formatos Microsoft Excel (.xlsx) y Adobe PDF con firma de periodo y origen de datos.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">Fecha de Generación:</span>
          <strong className="text-slate-900 font-medium">{fechaHoy}</strong>
        </div>
      </div>

      {/* Selector de Periodo */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">Periodo Contable / Operativo:</span>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-cin-500"
          >
            <option value="MES_ACTUAL">Mes Operativo en Curso (Noviembre 2026)</option>
            <option value="TRIMESTRE_ACTUAL">Cuarto Trimestre (Q4 2026)</option>
            <option value="HISTORICO_TOTAL">Histórico Completo Consolidado</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <ShieldCheck className="w-4 h-4 text-cin-600" />
          <span>Cumplimiento Norma de Trazabilidad CIN</span>
        </div>
      </div>

      {/* Grid de Reportes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportesDisponibles.map((rep) => (
          <div
            key={rep.id}
            className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-cin-800 bg-cin-50 px-2.5 py-0.5 rounded border border-cin-200">
                  {rep.id}
                </span>
                <DataOriginBadge origen={rep.origenPrincipal} />
              </div>

              <h3 className="font-bold text-slate-900 text-base mb-1.5">{rep.nombre}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">{rep.descripcion}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Descarga oficial directa</span>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/reportes/pdf?tipo=${rep.tipoPdf}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  Descargar PDF
                </a>
                <a
                  href={`/api/reportes/excel?tipo=${rep.tipoExcel}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar Excel (.xlsx)
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
