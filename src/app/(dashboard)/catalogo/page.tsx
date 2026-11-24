"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ProductStockInfo, LineaProducto } from "@/types";
import { DataOriginBadge } from "../../../components/common/DataOriginBadge";
import { EmptyState } from "../../../components/common/EmptyState";
import {
  Wine,
  Search,
  Plus,
  Filter,
  FileSpreadsheet,
  RefreshCw,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

export default function CatalogoPage() {
  const [productos, setProductos] = useState<ProductStockInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [lineaFiltro, setLineaFiltro] = useState<string>("TODAS");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductStockInfo | null>(null);

  // Formulario nuevo producto
  const [form, setForm] = useState({
    sku: "",
    nombre: "",
    linea: "HERVIDOS",
    sabor: "",
    presentacion: "Botella 500ml (Pack x6)",
    volumenLitros: 0.5,
    botellasPorPaquete: 6,
    precioPaquete: 18.0,
    costoProduccionPaquete: 11.0,
    stockMinimoPaquetes: 15,
    stockMaximoPaquetes: 500,
  });

  const fetchProductos = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/productos?busqueda=${encodeURIComponent(busqueda)}`;
      if (lineaFiltro !== "TODAS") url += `&linea=${lineaFiltro}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setProductos(json.productos);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [busqueda, lineaFiltro]);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProductos();
  };

  const handleGuardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear producto");
      setModalAbierto(false);
      fetchProductos();
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
            <Wine className="w-5 h-5 text-cin-600" />
            Catálogo Oficial de Productos
          </h2>
          <p className="text-xs text-slate-500">
            Líneas de Bebidas No Carbonatadas (Hervidos y Jugos) | Empaque estándar de 6 botellas por paquete.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/reportes/excel?tipo=INVENTARIO_GENERAL"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Exportar Catálogo
          </a>
          <button
            onClick={() => setModalAbierto(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cin-600 hover:bg-cin-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleBuscar} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por SKU, nombre del sabor o presentación..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cin-500 text-slate-800"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            Buscar
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500">Línea:</span>
          <select
            value={lineaFiltro}
            onChange={(e) => setLineaFiltro(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-cin-500"
          >
            <option value="TODAS">Todas las Líneas</option>
            <option value="HERVIDOS">Línea Hervidos</option>
            <option value="JUGOS">Línea Jugos</option>
          </select>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cin-600 mb-2" />
            Cargando catálogo oficial...
          </div>
        ) : productos.length === 0 ? (
          <EmptyState
            titulo="No se encontraron productos"
            descripcion="No hay productos que coincidan con los criterios de búsqueda o línea seleccionada."
            esDatosInsuficientes={false}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Producto / Sabor</th>
                  <th className="px-4 py-3">Línea</th>
                  <th className="px-4 py-3">Presentación</th>
                  <th className="px-4 py-3">Precio Paquete</th>
                  <th className="px-4 py-3">Costo Prod.</th>
                  <th className="px-4 py-3">Stock Actual</th>
                  <th className="px-4 py-3">Volumen Total</th>
                  <th className="px-4 py-3">Estado Stock</th>
                  <th className="px-4 py-3">Origen Costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productos.map((prod) => {
                  const estadoBadgeColor =
                    prod.estadoStock === "CRITICO"
                      ? "bg-rose-100 text-rose-700 border-rose-200"
                      : prod.estadoStock === "MINIMO"
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : prod.estadoStock === "SOBREINVENTARIO"
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : "bg-emerald-100 text-emerald-700 border-emerald-200";

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-slate-800">{prod.sku}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{prod.nombre}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            prod.linea === "HERVIDOS"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-orange-50 text-orange-700 border border-orange-200"
                          }`}
                        >
                          {prod.linea}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{prod.presentacion}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        Bs. {prod.precioPaquete.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        Bs. {prod.costoProduccionPaquete.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900">{prod.stockActualPaquetes}</span>{" "}
                        <span className="text-[10px] text-slate-400">paq ({prod.stockActualBotellas} bot)</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {prod.stockActualLitros} L
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${estadoBadgeColor}`}>
                          {prod.estadoStock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <DataOriginBadge origen={prod.origenCosto} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Producto */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Registrar Nuevo Producto</h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarProducto} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">SKU Único</label>
                  <input
                    type="text"
                    required
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="CIN-HERV-XYZ-500"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Línea</label>
                  <select
                    value={form.linea}
                    onChange={(e) => setForm({ ...form, linea: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="HERVIDOS">HERVIDOS</option>
                    <option value="JUGOS">JUGOS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Hervido de Menta y Limón Andino"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sabor</label>
                  <input
                    type="text"
                    required
                    value={form.sabor}
                    onChange={(e) => setForm({ ...form, sabor: e.target.value })}
                    placeholder="Menta y Limón"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Presentación</label>
                  <input
                    type="text"
                    required
                    value={form.presentacion}
                    onChange={(e) => setForm({ ...form, presentacion: e.target.value })}
                    placeholder="Botella 500ml (Pack x6)"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Volumen Botella (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={form.volumenLitros}
                    onChange={(e) => setForm({ ...form, volumenLitros: parseFloat(e.target.value) || 0.5 })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Precio Paquete (Bs.)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={form.precioPaquete}
                    onChange={(e) => setForm({ ...form, precioPaquete: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Costo Prod. (Bs.)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={form.costoProduccionPaquete}
                    onChange={(e) => setForm({ ...form, costoProduccionPaquete: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Stock Mínimo (Paq)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.stockMinimoPaquetes}
                    onChange={(e) => setForm({ ...form, stockMinimoPaquetes: parseInt(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Stock Máximo (Paq)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.stockMaximoPaquetes}
                    onChange={(e) => setForm({ ...form, stockMaximoPaquetes: parseInt(e.target.value) || 500 })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
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
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
