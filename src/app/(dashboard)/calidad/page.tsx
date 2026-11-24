"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ShieldAlert,
  Plus,
  RefreshCw,
  AlertTriangle,
  Cpu,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import { DataOriginBadge } from "../../../components/common/DataOriginBadge";
import Link from "next/link";

export default function CalidadPage() {
  const [danos, setDanos] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<any>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Form nuevo registro
  const [form, setForm] = useState({
    productoId: "",
    cantidadPaquetes: 2,
    tipoDano: "Botella rota por impacto",
    etapaIncidencia: "Carga",
    zonaAfectada: "Planta",
    vehiculoId: "",
    almacenId: "",
    motivo: "",
    accionCorrectiva: "",
    descontarDeInventario: true,
  });

  const fetchCalidad = useCallback(async () => {
    try {
      setLoading(true);
      const [resCal, resProd, resVeh, resAlm] = await Promise.all([
        fetch("/api/calidad"),
        fetch("/api/productos"),
        fetch("/api/vehiculos"),
        fetch("/api/almacenes"),
      ]);
      const jsonCal = await resCal.json();
      const jsonProd = await resProd.json();
      const jsonVeh = await resVeh.json();
      const jsonAlm = await resAlm.json();

      if (jsonCal.success) {
        setDanos(jsonCal.danos);
        setIndicadores(jsonCal.indicadores);
      }
      if (jsonProd.success && jsonProd.productos.length > 0) {
        setProductos(jsonProd.productos);
        if (!form.productoId) setForm((p) => ({ ...p, productoId: jsonProd.productos[0].id }));
      }
      if (jsonVeh.success) setVehiculos(jsonVeh.vehiculos);
      if (jsonAlm.success && jsonAlm.almacenes.length > 0) {
        setAlmacenes(jsonAlm.almacenes);
        if (!form.almacenId) setForm((p) => ({ ...p, almacenId: jsonAlm.almacenes[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [form.almacenId, form.productoId]);

  useEffect(() => {
    fetchCalidad();
  }, [fetchCalidad]);

  const handleCrearDano = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/calidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar daño");
      setModalAbierto(false);
      setForm((p) => ({ ...p, motivo: "", accionCorrectiva: "", cantidadPaquetes: 1 }));
      fetchCalidad();
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
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            Control de Calidad, Mermas y Productos Dañados
          </h2>
          <p className="text-xs text-slate-500">
            Registro de roturas, pérdidas de vacío, botellas defectuosas y planes de acción correctiva.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/reportes/pdf?tipo=CALIDAD"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-rose-600" />
            Reporte PDF
          </a>
          <Link
            href="/optimizacion"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <Cpu className="w-3.5 h-3.5" />
            Optimizar Mitigación (Modelo C)
          </Link>
          <button
            onClick={() => setModalAbierto(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Registrar Incidencia
          </button>
        </div>
      </div>

      {/* Tarjetas Indicadoras */}
      {indicadores && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <span className="text-xs text-slate-500 font-medium">Total Incidencias</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{indicadores.totalRegistros}</p>
            <p className="text-[11px] text-slate-400 mt-1">Eventos reportados</p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <span className="text-xs text-slate-500 font-medium">Paquetes Afectados</span>
            <p className="text-2xl font-bold text-rose-600 mt-1">{indicadores.totalPaquetesDanados} <span className="text-xs font-normal text-slate-500">paq</span></p>
            <p className="text-[11px] text-slate-400 mt-1">Merma física total</p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <span className="text-xs text-slate-500 font-medium">Costo Pérdida Estimado</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">S/ {indicadores.costoTotalPerdidas.toFixed(2)}</p>
            <span className="inline-block mt-1">
              <DataOriginBadge origen="ESTIMADO" />
            </span>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <span className="text-xs text-slate-500 font-medium">Etapa Crítica Principal</span>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {Object.entries(indicadores.danosPorEtapa).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "Ninguna"}
            </p>
            <p className="text-[11px] text-amber-600 font-medium mt-1">Mayor concentración de mermas</p>
          </div>
        </div>
      )}

      {/* Historial de Daños Registrados */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Bitácora de Daños y Acciones Correctivas
            </h3>
            <p className="text-[11px] text-slate-400">Trazabilidad con responsable, etapa y causa</p>
          </div>
          <button onClick={fetchCalidad} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-600 mb-2" />
            Cargando registros de calidad...
          </div>
        ) : danos.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No se registran incidencias de daño en el sistema.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Tipo de Daño</th>
                  <th className="px-4 py-3">Etapa</th>
                  <th className="px-4 py-3">Zona / Camión</th>
                  <th className="px-4 py-3">Costo Pérdida</th>
                  <th className="px-4 py-3">Causa Raíz</th>
                  <th className="px-4 py-3">Acción Correctiva</th>
                  <th className="px-4 py-3">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {danos.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {new Date(d.fechaIncidencia).toLocaleDateString("es-PE")}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{d.producto.nombre}</td>
                    <td className="px-4 py-3 font-bold text-rose-700">{d.cantidadPaquetes} paq</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{d.tipoDano}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700 text-[10px]">
                        {d.etapaIncidencia}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {d.vehiculo ? d.vehiculo.identificador : d.zonaAfectada || "Planta"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">S/ {d.costoPerdidaEstimado.toFixed(2)}</span>
                        <DataOriginBadge origen={d.origenCosto} size="sm" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">{d.motivo}</td>
                    <td className="px-4 py-3 text-slate-700 italic max-w-xs">{d.accionCorrectiva || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {d.usuarioResponsable?.nombreCompleto}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Incidencia */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Registrar Incidencia de Merma / Daño</h3>
            <p className="text-xs text-slate-500 mb-4">
              Se calcula el costo estimado de pérdida y se deduce automáticamente del kardex contable.
            </p>

            <form onSubmit={handleCrearDano} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Producto Afectado</label>
                <select
                  required
                  value={form.productoId}
                  onChange={(e) => setForm({ ...form, productoId: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                >
                  {productos.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.sku} - {prod.nombre} (Costo prod: S/ {prod.costoProduccionPaquete.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cantidad de Paquetes</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.cantidadPaquetes}
                    onChange={(e) => setForm({ ...form, cantidadPaquetes: parseInt(e.target.value) || 1 })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Daño</label>
                  <select
                    value={form.tipoDano}
                    onChange={(e) => setForm({ ...form, tipoDano: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Botella rota por impacto">Botella rota por impacto</option>
                    <option value="Sello roto / Fuga de vacío">Sello roto / Fuga de vacío</option>
                    <option value="Etiqueta defectuosa / manchada">Etiqueta defectuosa / manchada</option>
                    <option value="Embalaje secundario aplastado">Embalaje secundario aplastado</option>
                    <option value="Sedimento / Turbidez">Sedimento / Turbidez fuera de norma</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Etapa de la Incidencia</label>
                  <select
                    value={form.etapaIncidencia}
                    onChange={(e) => setForm({ ...form, etapaIncidencia: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Producción">Producción / Envasado</option>
                    <option value="Almacén">Almacén Intermedio</option>
                    <option value="Carga">Carga en Rampa</option>
                    <option value="Tránsito">Tránsito / Ruta</option>
                    <option value="Descarga">Descarga en Cliente</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zona Afectada</label>
                  <select
                    value={form.zonaAfectada}
                    onChange={(e) => setForm({ ...form, zonaAfectada: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Planta">Planta Principal</option>
                    <option value="Norte">Zona Norte</option>
                    <option value="Centro">Zona Centro</option>
                    <option value="Sur">Zona Sur</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Causa Raíz / Motivo</label>
                <textarea
                  required
                  rows={2}
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  placeholder="Descripción de la causa de la rotura o falla técnica..."
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Acción Correctiva Adoptada</label>
                <input
                  type="text"
                  value={form.accionCorrectiva}
                  onChange={(e) => setForm({ ...form, accionCorrectiva: e.target.value })}
                  placeholder="Ej. Calibración de rampa o ajuste de torque en selladora..."
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm"
                >
                  Registrar Merma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
