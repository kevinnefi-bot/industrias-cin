"use client";

import React, { useState, useEffect } from "react";
import { MODELOS_CATALOGO } from "@/lib/math-engine";
import {
  Cpu,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Clock,
  Sparkles,
} from "lucide-react";
import { DataOriginBadge } from "@/components/common/DataOriginBadge";

// Parámetros por defecto realistas para cada uno de los 10 modelos
const DEFAULT_PARAMS: Record<string, any> = {
  MODELO_A: {
    tipo: "MAX",
    c: [6.5, 6.8, 11.0, 11.5, 8.0, 9.0, 12.0, 12.2], // Margen unitario por paquete
    A: [
      [0.05, 0.05, 0.10, 0.10, 0.04, 0.04, 0.08, 0.08], // Horas hervido/macerado (max 80h)
      [0.03, 0.03, 0.05, 0.05, 0.03, 0.03, 0.05, 0.05], // Horas pasteurizado flash (max 50h)
      [0.02, 0.02, 0.03, 0.03, 0.02, 0.02, 0.03, 0.03], // Horas envasadora rotativa (max 40h)
    ],
    b: [80, 50, 40],
    operadores: ["<=", "<=", "<="],
    nombresVariables: [
      "CIN-HERV-LIM-500",
      "CIN-HERV-CAN-500",
      "CIN-HERV-JNG-1000",
      "CIN-HERV-FRU-1000",
      "CIN-JUG-NAR-500",
      "CIN-JUG-MAR-500",
      "CIN-JUG-MAN-1000",
      "CIN-JUG-DUR-1000",
    ],
    nombresRestricciones: [
      "Capacidad Marmitas de Hervido / Macerado (Horas)",
      "Capacidad Pasteurizador Flash Tubular (Horas)",
      "Capacidad Envasadora y Tapadora Rotativa (Horas)",
    ],
  },
  MODELO_B: {
    orígenes: [
      { nombre: "Almacén Central (Despacho)", capacidad: 1200 },
      { nombre: "Planta Hervidos (Nave B)", capacidad: 800 },
      { nombre: "Planta Jugos (Nave C)", capacidad: 900 },
    ],
    destinos: [
      { nombre: "Zona Norte (Trujillo/Chimbote)", demanda: 950 },
      { nombre: "Zona Centro (Lima/Callao)", demanda: 1100 },
      { nombre: "Zona Sur (Ica/Arequipa)", demanda: 750 },
    ],
    matrizCostos: [
      [4.5, 2.2, 5.8],
      [5.0, 2.8, 6.2],
      [4.2, 2.5, 5.5],
    ],
  },
  MODELO_C: {
    presupuestoMaximo: 8500,
    objetivoNombre: "Daño y Merma Evitada",
    unidadesBeneficio: "PEN / Mes Evitado en Mermas",
    items: [
      { id: "T1", nombre: "Separadores de Cartón Corrugado Amortiguado", costo: 2200, beneficio: 4800 },
      { id: "T2", nombre: "Esquineros Reforzados de PVC en Palets", costo: 1500, beneficio: 2900 },
      { id: "T3", nombre: "Film Termoencogible Doble Calibre 80", costo: 2800, beneficio: 5600 },
      { id: "T4", nombre: "Capacitación en Protocolos de Estiba y Rampa", costo: 1200, beneficio: 2400 },
      { id: "T5", nombre: "Bases de Goma Antivibratoria en 6 Camiones", costo: 3500, beneficio: 6200 },
    ],
  },
  MODELO_D: {
    almacenes: [
      { codigo: "ALM-CENTRAL", nombre: "Nave A (Rampa Principal)", capacidadPaquetes: 5000, volumenM3: 250, distanciaRampaMetros: 12 },
      { codigo: "ALM-HERV", nombre: "Nave B (Línea Hervidos)", capacidadPaquetes: 2500, volumenM3: 125, distanciaRampaMetros: 35 },
      { codigo: "ALM-JUG", nombre: "Nave C (Línea Jugos)", capacidadPaquetes: 2500, volumenM3: 125, distanciaRampaMetros: 48 },
    ],
    productos: [
      { sku: "CIN-JUG-NAR-500", nombre: "Jugo Naranja Valencia", rotacion: "ALTA", volumenUnitarioM3: 0.015, stockRequeridoPaquetes: 1200, stockSeguridadPaquetes: 100 },
      { sku: "CIN-HERV-LIM-500", nombre: "Hervido Limón Manzanilla", rotacion: "ALTA", volumenUnitarioM3: 0.015, stockRequeridoPaquetes: 1100, stockSeguridadPaquetes: 80 },
      { sku: "CIN-JUG-MAN-1000", nombre: "Jugo Mango Criollo", rotacion: "MEDIA", volumenUnitarioM3: 0.025, stockRequeridoPaquetes: 800, stockSeguridadPaquetes: 60 },
      { sku: "CIN-HERV-JNG-1000", nombre: "Hervido Jengibre Miel", rotacion: "MEDIA", volumenUnitarioM3: 0.025, stockRequeridoPaquetes: 600, stockSeguridadPaquetes: 50 },
      { sku: "CIN-HERV-CAN-500", nombre: "Hervido Canela Clavo", rotacion: "BAJA", volumenUnitarioM3: 0.015, stockRequeridoPaquetes: 400, stockSeguridadPaquetes: 40 },
    ],
  },
  MODELO_E: {
    demandaAnualUnidades: 12000,
    costoEmisionPedido: 180,
    costoMantenimientoUnitario: 3.5,
    diasLaboralesAno: 300,
    tiempoEntregaDias: 5,
    desviacionEstandarDemandaDiaria: 8,
    nivelServicioZ: 1.96, // 97.5% de nivel de servicio
    costoUnitarioFaltante: 8.0,
  },
  MODELO_F: {
    produccionMinimaHervidosLitros: 15000,
    produccionMinimaJugosLitros: 22000,
    costoKwhPunta: 0.45,
    costoKwhValle: 0.22,
    costoM3Agua: 4.80,
    limiteAguaM3Mensual: 60.0,
    limiteKwhPuntaMensual: 650.0,
  },
  MODELO_G: {
    presupuestoMaximo: 45000,
    objetivoNombre: "Retorno y Ahorro Operativo Anual (Capex)",
    unidadesBeneficio: "PEN / Año (Ahorro)",
    items: [
      { id: "INV-1", nombre: "Generador de Vapor Pirotubular de Alta Eficiencia (Hervidos)", costo: 22000, beneficio: 14500 },
      { id: "INV-2", nombre: "Brazo Robótico Paletizador Automático", costo: 18000, beneficio: 11200 },
      { id: "INV-3", nombre: "Sistema CIP Automatizado de Lavado de Tanques", costo: 12000, beneficio: 8800 },
      { id: "INV-4", nombre: "Equipo de Filtración por Membrana Osmótica", costo: 15000, beneficio: 9500 },
      { id: "INV-5", nombre: "Sensorística IoT para Monitoreo de Temperatura de Lote", costo: 8000, beneficio: 5600 },
    ],
  },
  MODELO_H: {
    tecnicos: [
      { id: "T1", nombre: "Técnico Mecánico (Pedro)", tarifaHora: 28 },
      { id: "T2", nombre: "Técnico Eléctrico/Electrónico (Miguel)", tarifaHora: 30 },
      { id: "T3", nombre: "Técnico de Calderas y Vapor (Jorge)", tarifaHora: 32 },
      { id: "T4", nombre: "Técnico de Automatización (Luis)", tarifaHora: 35 },
    ],
    tareas: [
      { id: "M1", nombre: "Overhaul de Caldera de Hervido", maquina: "Caldera Central" },
      { id: "M2", nombre: "Calibración de Servomotores", maquina: "Envasadora Rotativa" },
      { id: "M3", nombre: "Mantenimiento Bombas Sanitarias", maquina: "Línea Jugos" },
      { id: "M4", nombre: "Revisión Panel PLC y Sensores", maquina: "Pasteurizador Flash" },
    ],
    matrizHoras: [
      [14, 18, 10, 22],
      [20, 12, 16, 11],
      [8, 24, 18, 25],
      [22, 10, 20, 9],
    ],
  },
  MODELO_I: {
    nombreProyecto: "Ciclo Integral de Producción y Envasado Lote L-2026",
    actividades: [
      { id: "A", nombre: "Recepción e Inspección de Insumos", duracionHoras: 2, predecesores: [] },
      { id: "B", nombre: "Pesaje y Dosificación de Fórmulas", duracionHoras: 1, predecesores: ["A"] },
      { id: "C", nombre: "Extracción y Molienda de Frutas", duracionHoras: 3, predecesores: ["A"] },
      { id: "D", nombre: "Hervido y Maceración en Marmitas", duracionHoras: 4, predecesores: ["B"] },
      { id: "E", nombre: "Estandarización y Filtrado de Pulpa", duracionHoras: 2, predecesores: ["C", "D"] },
      { id: "F", nombre: "Pasteurización Flash a 90°C", duracionHoras: 3, predecesores: ["E"] },
      { id: "G", nombre: "Esterilización de Línea y Botellas", duracionHoras: 2, predecesores: ["B"] },
      { id: "H", nombre: "Envasado en Caliente y Tapado", duracionHoras: 4, predecesores: ["F", "G"] },
      { id: "I", nombre: "Enfriamiento en Túnel de Ducha", duracionHoras: 2, predecesores: ["H"] },
      { id: "J", nombre: "Etiquetado y Empaque en Packs x6", duracionHoras: 3, predecesores: ["I"] },
      { id: "K", nombre: "Liberación Microbiológica de Calidad", duracionHoras: 6, predecesores: ["J"] },
    ],
  },
  MODELO_J: {
    alternativas: [
      "A1: Mantener Capacidad Actual de Planta",
      "A2: Expandir Línea de Hervidos Tradicionales",
      "A3: Tercerizar Distribución en Zona Sur",
    ],
    estadosNaturaleza: [
      "E1: Demanda Alta (+30%)",
      "E2: Demanda Normal (Base)",
      "E3: Demanda Baja / Recesión (-20%)",
    ],
    probabilidades: [0.30, 0.50, 0.20],
    matrizPagos: [
      [85000, 52000, 22000],
      [140000, 68000, -15000],
      [95000, 48000, 32000],
    ],
    coeficienteHurwiczAlfa: 0.65,
  },
};

export default function OptimizacionPage() {
  const [modeloActivo, setModeloActivo] = useState("MODELO_A");
  const [paramsJson, setParamsJson] = useState<string>(
    JSON.stringify(DEFAULT_PARAMS["MODELO_A"], null, 2)
  );
  const [resultado, setResultado] = useState<any>(null);
  const [ejecutando, setEjecutando] = useState(false);
  const [errorEjecucion, setErrorEjecucion] = useState<string | null>(null);

  // Escenarios
  const [escenarioBase, setEscenarioBase] = useState<any>(null);
  const [nombreEscenario, setNombreEscenario] = useState("Escenario Simulado 1");

  const modeloInfo = MODELOS_CATALOGO.find((m) => m.codigo === modeloActivo)!;

  const handleCambiarModelo = (nuevoCodigo: string) => {
    setModeloActivo(nuevoCodigo);
    setParamsJson(JSON.stringify(DEFAULT_PARAMS[nuevoCodigo], null, 2));
    setResultado(null);
    setEscenarioBase(null);
    setErrorEjecucion(null);
  };

  const handleResolver = async (esBase = false) => {
    setEjecutando(true);
    setErrorEjecucion(null);

    try {
      const parsedParams = JSON.parse(paramsJson);

      const res = await fetch("/api/optimizacion/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modeloCodigo: modeloActivo,
          nombreModelo: modeloInfo.nombre,
          nombreEscenario: esBase ? "Escenario Base Oficial" : nombreEscenario,
          esEscenarioBase: esBase,
          parametrosEntrada: parsedParams,
          origenParametros: "ESTIMADO",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al ejecutar motor matemático.");
      }

      setResultado(data.resultado);
      if (esBase) {
        setEscenarioBase(data.resultado);
      }
    } catch (err: any) {
      setErrorEjecucion(err.message);
    } finally {
      setEjecutando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-600 text-white rounded-full">
              Núcleo Matemático IO
            </span>
            <span className="text-xs text-slate-300">Algoritmos Reales (Sin Simulaciones Falsas)</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Centro de Optimización de Operaciones</h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Ejecuta 10 modelos matemáticos parametrizables de Investigación de Operaciones (Simplex, Vogel, Mochila 0-1,
            EOQ/ROP, CPM y Teoría de Decisiones). Modifica variables para comprobar sensibilidad y holguras.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DataOriginBadge origen="ESTIMADO" />
        </div>
      </div>

      {/* Selector de Modelos (Pestañas A - J) */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {MODELOS_CATALOGO.map((m) => {
            const isActive = m.codigo === modeloActivo;
            return (
              <button
                key={m.codigo}
                onClick={() => handleCambiarModelo(m.codigo)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  isActive
                    ? "bg-cin-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <span className="font-mono">{m.codigo.replace("MODELO_", "Mod ")}</span>
                <span className="hidden md:inline font-normal opacity-90">{m.categoria}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ficha Técnica del Modelo Seleccionado */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-xs font-bold text-cin-700 bg-cin-50 px-2 py-0.5 rounded border border-cin-200">
              {modeloInfo.codigo}
            </span>
            <h3 className="font-bold text-slate-900 text-sm">{modeloInfo.nombre}</h3>
          </div>
          <p className="text-xs text-slate-500">{modeloInfo.descripcion}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Algoritmo / Solucionador</span>
          <span className="text-xs font-semibold text-slate-800">{modeloInfo.metodo}</span>
        </div>
      </div>

      {/* Editor Interactivo y Panel de Ejecución */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: Parámetros Editables */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cin-600" />
                Parámetros de Entrada (JSON Parametrizable)
              </h4>
              <button
                type="button"
                onClick={() => setParamsJson(JSON.stringify(DEFAULT_PARAMS[modeloActivo], null, 2))}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Restaurar Base
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mb-3">
              Edita cualquier número (capacidades, costos, demandas o probabilidades) y ejecuta el motor para ver cómo
              reaccionan las variables de decisión y el valor óptimo:
            </p>

            <textarea
              rows={14}
              value={paramsJson}
              onChange={(e) => setParamsJson(e.target.value)}
              className="w-full p-3 font-mono text-[11px] text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cin-500"
            />

            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombre de Escenario</label>
              <input
                type="text"
                value={nombreEscenario}
                onChange={(e) => setNombreEscenario(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2 justify-between">
            <button
              type="button"
              disabled={ejecutando}
              onClick={() => handleResolver(true)}
              className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              Fijar como Escenario Base
            </button>
            <button
              type="button"
              disabled={ejecutando}
              onClick={() => handleResolver(false)}
              className="px-4 py-2 text-xs font-semibold bg-cin-600 hover:bg-cin-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {ejecutando ? "Resolviendo con Algoritmo..." : "Ejecutar Motor Matemático"}
            </button>
          </div>
        </div>

        {/* Columna Derecha: Resultado Óptimo y Análisis */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Resultado Óptimo y Verificación
              </h4>
              {resultado && (
                <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {resultado.tiempoResolucionMs} ms
                </span>
              )}
            </div>

            {errorEjecucion && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Error de Formato o Inviabilidad:</strong>
                  {errorEjecucion}
                </div>
              </div>
            )}

            {!resultado ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <Cpu className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                Presiona <strong>Ejecutar Motor Matemático</strong> para resolver el modelo seleccionado con los
                algoritmos exactos de Investigación Operativa.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Banner de Factibilidad y Valor Objetivo */}
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    resultado.esFactible
                      ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                      {resultado.esFactible ? "Solución Factible Óptima" : "Modelo Inviable"}
                    </span>
                    <p className="text-2xl font-black mt-0.5">
                      {resultado.esFactible ? (
                        <>
                          {typeof resultado.valorObjetivo === "number"
                            ? resultado.valorObjetivo.toLocaleString("es-PE", { minimumFractionDigits: 2 })
                            : resultado.valorObjetivo}{" "}
                          <span className="text-xs font-normal opacity-80">{resultado.unidadesObjetivo}</span>
                        </>
                      ) : (
                        "Sin Solución"
                      )}
                    </p>
                  </div>
                  {resultado.esFactible ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-rose-600" />
                  )}
                </div>

                {/* Interpretación Operativa */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
                  <strong className="font-semibold block text-slate-900 mb-1">Interpretación Industrial:</strong>
                  <p>{resultado.interpretacion}</p>
                </div>

                {/* Tabla de Variables de Decisión */}
                <div>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Variables de Decisión Activas
                  </h5>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-1.5">Variable</th>
                          <th className="px-3 py-1.5 text-right">Valor Asignado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(resultado.variablesDecision).map(([k, v]: [string, any], idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 text-slate-800 font-medium">{k}</td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900">
                              {typeof v === "number" ? v.toLocaleString() : v}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Holguras y Precios Sombra (Si Aplica) */}
                {resultado.holgurasRestricciones && Object.keys(resultado.holgurasRestricciones).length > 0 && (
                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Holguras de Recursos y Restricciones
                    </h5>
                    <div className="space-y-1.5">
                      {Object.entries(resultado.holgurasRestricciones).map(([k, v]: [string, any], idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between"
                        >
                          <span className="text-slate-700 font-medium">{k}</span>
                          <span className="font-mono text-slate-900">
                            Uso: <strong>{v.valor}</strong> / Límite: {v.limite} ({v.tipo})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comparación de Escenarios (Base vs Simulado) */}
          {escenarioBase && resultado && escenarioBase !== resultado && (
            <div className="mt-5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs">
              <strong className="font-semibold text-blue-900 block mb-1">
                Comparación: Escenario Base vs Simulado
              </strong>
              <div className="flex items-center justify-between text-blue-800">
                <span>Base: S/ {escenarioBase.valorObjetivo.toLocaleString()}</span>
                <span>Simulado: S/ {resultado.valorObjetivo.toLocaleString()}</span>
                <span className="font-bold flex items-center gap-1">
                  {resultado.valorObjetivo >= escenarioBase.valorObjetivo ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                  )}
                  {((resultado.valorObjetivo - escenarioBase.valorObjetivo) / (escenarioBase.valorObjetivo || 1) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
