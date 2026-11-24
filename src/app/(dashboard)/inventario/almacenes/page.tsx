"use client";

import React, { useEffect, useState } from "react";
import { Boxes, Cpu, RefreshCw, AlertTriangle, CheckCircle2, ArrowLeftRight, PlusCircle, X, Loader2 } from "lucide-react";
import { DataOriginBadge } from "../../../../components/common/DataOriginBadge";
import Link from "next/link";

interface Almacen {
  id: string;
  codigo: string;
  nombre: string;
  zonaPlanta: string;
  capacidadMaxPaquetes: number;
  capacidadVolumetricaM3: number;
  origenCapacidad: string;
  activo: boolean;
  ocupacionPaquetes: number;
  volumenOcupadoM3: number;
  porcentajeUso: number;
  estadoCapacidad: "NORMAL" | "ALTO" | "CRITICO";
}

interface Producto {
  id: string;
  sku: string;
  nombre: string;
  linea: string;
}

const INITIAL_TRANSFER = {
  almacenOrigenId: "",
  almacenDestinoId: "",
  productoId: "",
  cantidadPaquetes: 1,
  motivo: "",
};

const INITIAL_ALMACEN = {
  codigo: "",
  nombre: "",
  zonaPlanta: "",
  capacidadMaxPaquetes: 500,
  capacidadVolumetricaM3: 100,
};

export default function AlmacenesPage() {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showNewAlmacen, setShowNewAlmacen] = useState(false);
  const [transfer, setTransfer] = useState(INITIAL_TRANSFER);
  const [newAlmacen, setNewAlmacen] = useState(INITIAL_ALMACEN);
  const [submitting, setSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const fetchAlmacenes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/almacenes");
      const json = await res.json();
      if (json.success) setAlmacenes(json.almacenes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductos = async () => {
    try {
      const res = await fetch("/api/productos");
      const json = await res.json();
      if (json.success) setProductos(json.productos);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAlmacenes();
    fetchProductos();
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/almacenes/transferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...transfer,
          cantidadPaquetes: Number(transfer.cantidadPaquetes),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al transferir");
      setMensaje({ tipo: "ok", texto: json.mensaje });
      setTransfer(INITIAL_TRANSFER);
      setShowTransfer(false);
      await fetchAlmacenes();
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewAlmacen = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/almacenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAlmacen),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al crear almacén");
      setMensaje({ tipo: "ok", texto: `Almacén "${newAlmacen.nombre}" creado exitosamente.` });
      setNewAlmacen(INITIAL_ALMACEN);
      setShowNewAlmacen(false);
      await fetchAlmacenes();
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchAlmacenes}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
          <button
            onClick={() => { setShowTransfer(true); setMensaje(null); }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Transferir Stock
          </button>
          <button
            onClick={() => { setShowNewAlmacen(true); setMensaje(null); }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cin-600 hover:bg-cin-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Nuevo Almacén
          </button>
          <Link
            href="/optimizacion"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-colors"
          >
            <Cpu className="w-3.5 h-3.5" />
            Slotting (Mod. D)
          </Link>
        </div>
      </div>

      {/* Feedback message */}
      {mensaje && (
        <div className={`p-3 rounded-xl text-xs font-medium border ${
          mensaje.tipo === "ok"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {mensaje.tipo === "ok" ? "✓ " : "✗ "}{mensaje.texto}
        </div>
      )}

      {/* Warehouse cards */}
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

                  {/* Progress Bar */}
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

                  {/* Metrics */}
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
                  <span className="text-cin-600 font-medium">Pack x6</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Transferencia de Stock */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-amber-500" />
                Transferencia Entre Almacenes
              </h3>
              <button
                onClick={() => setShowTransfer(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Almacén Origen *</label>
                <select
                  value={transfer.almacenOrigenId}
                  onChange={(e) => setTransfer({ ...transfer, almacenOrigenId: e.target.value })}
                  required
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cin-500"
                >
                  <option value="">— Seleccionar almacén —</option>
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.codigo} · {a.nombre} ({a.ocupacionPaquetes} paq disponibles)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Almacén Destino *</label>
                <select
                  value={transfer.almacenDestinoId}
                  onChange={(e) => setTransfer({ ...transfer, almacenDestinoId: e.target.value })}
                  required
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cin-500"
                >
                  <option value="">— Seleccionar almacén —</option>
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === transfer.almacenOrigenId}>
                      {a.codigo} · {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Producto *</label>
                <select
                  value={transfer.productoId}
                  onChange={(e) => setTransfer({ ...transfer, productoId: e.target.value })}
                  required
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cin-500"
                >
                  <option value="">— Seleccionar producto —</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} · {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cantidad de Paquetes *
                </label>
                <input
                  type="number"
                  min={1}
                  value={transfer.cantidadPaquetes}
                  onChange={(e) => setTransfer({ ...transfer, cantidadPaquetes: Number(e.target.value) })}
                  required
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cin-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo *</label>
                <textarea
                  value={transfer.motivo}
                  onChange={(e) => setTransfer({ ...transfer, motivo: e.target.value })}
                  required
                  minLength={5}
                  rows={2}
                  placeholder="Ej: Rebalanceo de stock por campaña de verano"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cin-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransfer(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar Transferencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Almacén */}
      {showNewAlmacen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-cin-600" />
                Registrar Nuevo Almacén
              </h3>
              <button
                onClick={() => setShowNewAlmacen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleNewAlmacen} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código *</label>
                  <input
                    value={newAlmacen.codigo}
                    onChange={(e) => setNewAlmacen({ ...newAlmacen, codigo: e.target.value.toUpperCase() })}
                    required
                    placeholder="ALM-004"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cin-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre *</label>
                  <input
                    value={newAlmacen.nombre}
                    onChange={(e) => setNewAlmacen({ ...newAlmacen, nombre: e.target.value })}
                    required
                    placeholder="Nave D - Materias Primas"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cin-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Zona en Planta *</label>
                <input
                  value={newAlmacen.zonaPlanta}
                  onChange={(e) => setNewAlmacen({ ...newAlmacen, zonaPlanta: e.target.value })}
                  required
                  placeholder="Nave D - Área de Recepción"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cin-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cap. Máx. (paquetes) *</label>
                  <input
                    type="number"
                    min={1}
                    value={newAlmacen.capacidadMaxPaquetes}
                    onChange={(e) =>
                      setNewAlmacen({ ...newAlmacen, capacidadMaxPaquetes: Number(e.target.value) })
                    }
                    required
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cin-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cap. Volumétrica (m³) *</label>
                  <input
                    type="number"
                    min={1}
                    step="0.1"
                    value={newAlmacen.capacidadVolumetricaM3}
                    onChange={(e) =>
                      setNewAlmacen({ ...newAlmacen, capacidadVolumetricaM3: Number(e.target.value) })
                    }
                    required
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cin-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewAlmacen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-cin-600 hover:bg-cin-700 text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Crear Almacén
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
