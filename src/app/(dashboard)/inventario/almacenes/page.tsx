"use client";

import React, { useEffect, useState } from "react";
import { Boxes, Cpu, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { DataOriginBadge } from "@/components/common/DataOriginBadge";
import Link from "next/link";

export default function AlmacenesPage() {
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlmacenes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/almacenes");
      const json = await res.json();
      if (json.success) {
        setAlmacenes(json.almacenes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlmacenes();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-cin-600" />
            Almacenes y Capacidad Volumétrica
          </h2>
          <p className="text-xs text-slate-500">
            Control de capacidad física en paquetes y m³ para líneas de Hervidos, Jugos y Producto Terminado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAlmacenes}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar Ocupación
          </button>
          <Link
            href="/optimizacion"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cin-600 hover:bg-cin-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <Cpu className="w-3.5 h-3.5" />
            Optimizar Slotting (Modelo D)
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cin-600 mb-2" />
          Calculando ocupación espacial...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {almacenes.map((alm) => {
            const barColor =
              alm.porcentajeUso >= 90
                ? "bg-rose-500"
                : alm.porcentajeUso >= 70
                ? "bg-amber-500"
                : "bg-cin-600";

            return (
              <div
                key={alm.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {alm.codigo}
                    </span>
                    <DataOriginBadge origen={alm.origenCapacidad} />
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{alm.nombre}</h3>
                  <p className="text-xs text-slate-500 mb-4">{alm.zonaPlanta}</p>

                  {/* Barra de Progreso */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>Uso de Capacidad</span>
                      <span>{alm.porcentajeUso}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(100, alm.porcentajeUso)}%` }}
                      />
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Ocupación Física
                      </span>
                      <strong className="text-slate-900 text-sm">
                        {alm.ocupacionPaquetes}{" "}
                        <span className="text-[11px] font-normal text-slate-500">
                          / {alm.capacidadMaxPaquetes} paq
                        </span>
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Espacio en m³
                      </span>
                      <strong className="text-slate-900 text-sm">
                        {alm.volumenOcupadoM3}{" "}
                        <span className="text-[11px] font-normal text-slate-500">
                          / {alm.capacidadVolumetricaM3} m³
                        </span>
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    {alm.estadoCapacidad === "NORMAL" ? (
                      <CheckCircle2 className="w-4 h-4 text-cin-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    Estado: <strong className="text-slate-700">{alm.estadoCapacidad}</strong>
                  </span>
                  <span className="text-cin-600 font-medium">Unidad: Pack x6</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
