"use client";

import React, { useEffect, useState } from "react";
import { Package, Plus, RefreshCw, ArrowUpRight, ArrowDownLeft, AlertCircle, FileSpreadsheet } from "lucide-react";
import { DataOriginBadge } from "@/components/common/DataOriginBadge";

export default function InventarioPage() {
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [resumenStock, setResumenStock] = useState<any[]>([]);
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Formulario nuevo movimiento
  const [form, setForm] = useState({
    productoId: "",
    almacenId: "",
    tipo: "ENTRADA_PRODUCCION",
    cantidadPaquetes: 50,
    motivo: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resInv, resAlm] = await Promise.all([
        fetch("/api/inventario"),
        fetch("/api/almacenes"),
      ]);
      const jsonInv = await resInv.json();
      const jsonAlm = await resAlm.json();

      if (jsonInv.success) {
        setMovimientos(jsonInv.movimientos);
        setResumenStock(jsonInv.resumenStock);
        if (jsonInv.resumenStock.length > 0 && !form.productoId) {
          setForm((prev) => ({ ...prev, productoId: jsonInv.resumenStock[0].id }));
        }
      }
      if (jsonAlm.success && jsonAlm.almacenes.length > 0) {
        setAlmacenes(jsonAlm.almacenes);
        if (!form.almacenId) {
          setForm((prev) => ({ ...prev, almacenId: jsonAlm.almacenes[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCrearMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);

    try {
      const res = await fetch("/api/inventario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al registrar movimiento.");
      }

      setModalAbierto(false);
      setForm((prev) => ({ ...prev, motivo: "", cantidadPaquetes: 10 }));
      fetchData();
    } catch (err: any) {
      setErrorModal(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-cin-600" />
            Inventario y Kardex Contable de Stock
          </h2>
          <p className="text-xs text-slate-500">
            Trazabilidad inmutable de entradas y salidas. El stock físico se deriva estrictamente de los movimientos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/reportes/excel?tipo=INVENTARIO_GENERAL"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Descargar Kardex
          </a>
          <button
            onClick={() => setModalAbierto(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cin-600 hover:bg-cin-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Registrar Movimiento
          </button>
        </div>
      </div>

      {/* Resumen Superior de Existencias */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500 font-medium">Líneas de Producción</p>
          <p className="text-xl font-bold text-slate-900 mt-1">Hervidos y Jugos</p>
          <p className="text-[11px] text-cin-600 font-medium mt-1">8 productos registrados</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500 font-medium">Total Paquetes Físicos</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {resumenStock.reduce((a, b) => a + b.stockActualPaquetes, 0)} <span className="text-xs font-normal text-slate-500">paq</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Consistencia en doble partida</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500 font-medium">Volumen Líquido Total</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {resumenStock.reduce((a, b) => a + b.stockActualLitros, 0).toFixed(1)} <span className="text-xs font-normal text-slate-500">L</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Calculado botellas x volumen</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500 font-medium">Stock Comprometido</p>
          <p className="text-xl font-bold text-amber-700 mt-1">
            {resumenStock.reduce((a, b) => a + b.stockComprometidoPaquetes, 0)} <span className="text-xs font-normal text-slate-500">paq</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">En pedidos pendientes</p>
        </div>
      </div>

      {/* Historial de Movimientos Kardex */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Historial de Movimientos Registrados en Kardex
            </h3>
            <p className="text-[11px] text-slate-400">Auditoría cronológica con fecha, usuario y almacén</p>
          </div>
          <button
            onClick={fetchData}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cin-600 mb-2" />
            Cargando kardex contable...
          </div>
        ) : movimientos.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No se registran movimientos en el historial.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Fecha / Hora</th>
                  <th className="px-4 py-3">Tipo Movimiento</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Almacén</th>
                  <th className="px-4 py-3">Cantidad (Paquetes)</th>
                  <th className="px-4 py-3">Volumen (Litros)</th>
                  <th className="px-4 py-3">Motivo / Trazabilidad</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimientos.map((m) => {
                  const esEntrada =
                    m.tipo === "ENTRADA_PRODUCCION" ||
                    m.tipo === "DEVOLUCION" ||
                    m.tipo === "AJUSTE_POSITIVO" ||
                    m.tipo === "REPOSICION";

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {new Date(m.fechaMovimiento).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            esEntrada
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {esEntrada ? (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                          )}
                          {m.tipo.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{m.producto?.nombre}</td>
                      <td className="px-4 py-3 text-slate-600">{m.almacen?.nombre}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {esEntrada ? `+${m.cantidadPaquetes}` : `-${m.cantidadPaquetes}`} paq
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {m.volumenTotalLitros.toFixed(1)} L
                      </td>
                      <td className="px-4 py-3 text-slate-600">{m.motivo}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {m.usuario?.nombreCompleto} ({m.usuario?.rol})
                      </td>
                      <td className="px-4 py-3">
                        <DataOriginBadge origen={m.origenDato} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Movimiento */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Registrar Movimiento de Inventario</h3>
              <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {errorModal && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorModal}</span>
              </div>
            )}

            <form onSubmit={handleCrearMovimiento} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Producto</label>
                <select
                  required
                  value={form.productoId}
                  onChange={(e) => setForm({ ...form, productoId: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  {resumenStock.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.sku} - {prod.nombre} (Stock actual: {prod.stockActualPaquetes} paq)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tipo de Movimiento</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="ENTRADA_PRODUCCION">Entrada (Producción)</option>
                    <option value="SALIDA_PEDIDO">Salida (Pedido / Despacho)</option>
                    <option value="DEVOLUCION">Devolución de Cliente</option>
                    <option value="DANADO">Merma / Producto Dañado</option>
                    <option value="AJUSTE_POSITIVO">Ajuste Físico (+)</option>
                    <option value="AJUSTE_NEGATIVO">Ajuste Físico (-)</option>
                    <option value="REPOSICION">Reposición de Lote</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Almacén Destino/Origen</label>
                  <select
                    required
                    value={form.almacenId}
                    onChange={(e) => setForm({ ...form, almacenId: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    {almacenes.map((alm) => (
                      <option key={alm.id} value={alm.id}>
                        {alm.nombre} ({alm.zonaPlanta})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cantidad de Paquetes</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.cantidadPaquetes}
                  onChange={(e) => setForm({ ...form, cantidadPaquetes: parseInt(e.target.value) || 1 })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Equivale a {form.cantidadPaquetes * 6} botellas individuales (Pack x6).
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Motivo / Trazabilidad</label>
                <textarea
                  required
                  rows={2}
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  placeholder="Ej. Ingreso de lote terminado batch L-2026-H12 o merma en línea..."
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-cin-600 hover:bg-cin-700 text-white rounded-lg shadow-sm"
                >
                  Confirmar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
