"use client";

import React, { useEffect, useState } from "react";
import { Truck, Cpu, RefreshCw, AlertCircle, CheckCircle, Wrench, FileSpreadsheet } from "lucide-react";
import { DataOriginBadge } from "@/components/common/DataOriginBadge";
import Link from "next/link";

export default function DistribucionPage() {
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehiculoEditando, setVehiculoEditando] = useState<any>(null);

  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vehiculos");
      const json = await res.json();
      if (json.success) {
        setVehiculos(json.vehiculos);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiculos();
  }, []);

  const handleGuardarVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/vehiculos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehiculoEditando),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar camión");
      setVehiculoEditando(null);
      fetchVehiculos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-cin-600" />
            Flota de Distribución y Reparto (6 Camiones CIN)
          </h2>
          <p className="text-xs text-slate-500">
            Registro técnico de capacidades en kilogramos, volumen en m³, costos operativos por km y rutas zonales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchVehiculos}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar Flota
          </button>
          <Link
            href="/optimizacion"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cin-600 hover:bg-cin-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <Cpu className="w-3.5 h-3.5" />
            Optimizar Transporte (Modelo B)
          </Link>
        </div>
      </div>

      {/* Grid de los 6 Camiones */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cin-600 mb-2" />
          Cargando flota de vehículos...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehiculos.map((v) => {
            const operativo = v.disponible && v.estadoMantenimiento === "OPERATIVO";

            return (
              <div
                key={v.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {v.placa}
                    </span>
                    <DataOriginBadge origen={v.origenDatos} />
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-slate-900 text-base">{v.identificador}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        operativo
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-rose-50 text-rose-700 border-rose-300"
                      }`}
                    >
                      {v.estadoMantenimiento}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-4">
                    Zona Asignada: <strong className="text-slate-800 font-semibold">{v.zonaAsignada}</strong>
                  </p>

                  {/* Especificaciones Técnicas */}
                  <div className="space-y-2 text-xs py-3 border-y border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Capacidad Carga:</span>
                      <strong className="text-slate-800">{v.capacidadCargaKg.toLocaleString()} kg</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Capacidad Volumétrica:</span>
                      <strong className="text-slate-800">{v.capacidadVolumetricaM3} m³</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Carga Máxima de Paquetes:</span>
                      <strong className="text-slate-800">{v.capacidadMaxPaquetes} paquetes (Pack x6)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Costo Operativo:</span>
                      <strong className="text-slate-800">Bs. {v.costoOperativoKm.toFixed(2)} / km</strong>
                    </div>
                  </div>

                  {/* Pedidos activos */}
                  <div className="mt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Despachos en Curso ({v.pedidos ? v.pedidos.length : 0})
                    </span>
                    {v.pedidos && v.pedidos.length > 0 ? (
                      <div className="space-y-1">
                        {v.pedidos.map((ped: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-1.5 rounded bg-slate-50 border border-slate-100 text-[11px] flex justify-between"
                          >
                            <span className="font-mono font-medium text-slate-800">{ped.codigo}</span>
                            <span className="text-slate-500">{ped.cliente}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Sin despachos asignados actualmente.</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Disponibilidad: <strong>{v.disponible ? "Habilitado" : "No disponible"}</strong>
                  </span>
                  <button
                    onClick={() => setVehiculoEditando({ ...v })}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  >
                    Editar Ficha
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Editar Camión */}
      {vehiculoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Editar Ficha Técnica: {vehiculoEditando.identificador}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Placa: {vehiculoEditando.placa}</p>

            <form onSubmit={handleGuardarVehiculo} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zona Asignada</label>
                  <select
                    value={vehiculoEditando.zonaAsignada}
                    onChange={(e) => setVehiculoEditando({ ...vehiculoEditando, zonaAsignada: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Norte">Zona Norte</option>
                    <option value="Centro">Zona Centro</option>
                    <option value="Sur">Zona Sur</option>
                    <option value="Multi-zona">Multi-zona</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estado de Mantenimiento</label>
                  <select
                    value={vehiculoEditando.estadoMantenimiento}
                    onChange={(e) => setVehiculoEditando({ ...vehiculoEditando, estadoMantenimiento: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="OPERATIVO">OPERATIVO</option>
                    <option value="EN_MANTENIMIENTO">EN MANTENIMIENTO</option>
                    <option value="FUERA_DE_SERVICIO">FUERA DE SERVICIO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacidad Carga (kg)</label>
                  <input
                    type="number"
                    min="500"
                    required
                    value={vehiculoEditando.capacidadCargaKg}
                    onChange={(e) => setVehiculoEditando({ ...vehiculoEditando, capacidadCargaKg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacidad Volumétrica (m³)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="5"
                    required
                    value={vehiculoEditando.capacidadVolumetricaM3}
                    onChange={(e) => setVehiculoEditando({ ...vehiculoEditando, capacidadVolumetricaM3: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Costo Operativo (Bs. / km)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={vehiculoEditando.costoOperativoKm}
                    onChange={(e) => setVehiculoEditando({ ...vehiculoEditando, costoOperativoKm: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Disponibilidad en Turno</label>
                  <select
                    value={vehiculoEditando.disponible ? "true" : "false"}
                    onChange={(e) => setVehiculoEditando({ ...vehiculoEditando, disponible: e.target.value === "true" })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="true">Disponible</option>
                    <option value="false">No disponible</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVehiculoEditando(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold bg-cin-600 hover:bg-cin-700 text-white rounded-lg shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
