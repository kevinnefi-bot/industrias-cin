"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ShoppingCart,
  Plus,
  Clock,
  Truck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  ChevronRight,
  User,
} from "lucide-react";
import { EstadoPedido } from "@/types";

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [metricas, setMetricas] = useState<any>(null);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState<string>("TODOS");
  const [zonaFiltro, setZonaFiltro] = useState<string>("TODAS");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEstadoAbierto, setModalEstadoAbierto] = useState(false);
  const [pedidoParaEditar, setPedidoParaEditar] = useState<any>(null);
  const [editarEntregaParcial, setEditarEntregaParcial] = useState(false);
  const [cantidadesEntrega, setCantidadesEntrega] = useState<Record<string, number>>({});

  // Form nuevo pedido
  const [form, setForm] = useState({
    codigo: "",
    cliente: "",
    zonaDestino: "Norte",
    direccionEntrega: "",
    fechaPrometidaOriginal: "",
    vehiculoId: "",
    observaciones: "",
    items: [{ productoId: "", paquetesSolicitados: 20, precioUnitarioPaquete: 18.0 }],
  });
  const primerProductoId = form.items[0].productoId;

  const fetchPedidos = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/pedidos?estado=${estadoFiltro}&zona=${zonaFiltro}`;
      const [resPed, resVeh, resProd] = await Promise.all([
        fetch(url),
        fetch("/api/vehiculos"),
        fetch("/api/productos"),
      ]);
      const jsonPed = await resPed.json();
      const jsonVeh = await resVeh.json();
      const jsonProd = await resProd.json();

      if (jsonPed.success) {
        setPedidos(jsonPed.pedidos);
        setMetricas(jsonPed.metricas);
      }
      if (jsonVeh.success) setVehiculos(jsonVeh.vehiculos);
      if (jsonProd.success && jsonProd.productos.length > 0) {
        setProductos(jsonProd.productos);
        if (!primerProductoId) {
          setForm((prev) => ({
            ...prev,
            items: [{ ...prev.items[0], productoId: jsonProd.productos[0].id, precioUnitarioPaquete: jsonProd.productos[0].precioPaquete }],
          }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [estadoFiltro, primerProductoId, zonaFiltro]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  const handleCrearPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear pedido");
      setModalAbierto(false);
      fetchPedidos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleActualizarEstado = async (
    nuevoEstado: string,
    nuevoVehiculoId?: string | null,
    detallesEntrega?: { id: string; paquetesEntregados: number; paquetesEnviados: number }[]
  ) => {
    if (!pedidoParaEditar) return;
    try {
      const res = await fetch("/api/pedidos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pedidoParaEditar.id,
          estado: nuevoEstado,
          vehiculoId: nuevoVehiculoId !== undefined ? nuevoVehiculoId : pedidoParaEditar.vehiculoId,
          ...(detallesEntrega ? { detallesEntrega } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar estado");
      setModalEstadoAbierto(false);
      setEditarEntregaParcial(false);
      fetchPedidos();
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
            <ShoppingCart className="w-5 h-5 text-cin-600" />
            Gestión Integral de Pedidos y Despachos
          </h2>
          <p className="text-xs text-slate-500">
            Seguimiento de entregas con cálculo estricto de retrasos frente a la fecha prometida original.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/reportes/pdf?tipo=PEDIDOS"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            Reporte PDF
          </a>
          <button
            onClick={() => {
              const now = new Date();
              now.setHours(now.getHours() + 4);
              setForm((prev) => ({
                ...prev,
                codigo: `PED-2026-${Math.floor(100 + Math.random() * 900)}`,
                fechaPrometidaOriginal: now.toISOString().slice(0, 16),
              }));
              setModalAbierto(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cin-600 hover:bg-cin-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Pedido
          </button>
        </div>
      </div>

      {/* Tarjetas Métricas de SLA */}
      {metricas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <span className="text-xs text-slate-500 font-medium">Cumplimiento OTIF</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metricas.porcentajeCumplimientoOTIF}%</p>
            <p className="text-[11px] text-cin-600 font-medium mt-1">Entregas a tiempo completas</p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <span className="text-xs text-slate-500 font-medium">Entregas Puntuales</span>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{metricas.pedidosPuntuales}</p>
            <p className="text-[11px] text-slate-500 mt-1">Dentro de ventana acordada</p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <span className="text-xs text-slate-500 font-medium">Pedidos Retrasados</span>
            <p className="text-2xl font-bold text-rose-600 mt-1">{metricas.pedidosRetrasados}</p>
            <p className="text-[11px] text-slate-500 mt-1">Excedieron fecha prometida</p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <span className="text-xs text-slate-500 font-medium">Entregas Incompletas</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{metricas.pedidosIncompletos}</p>
            <p className="text-[11px] text-slate-500 mt-1">Faltaron paquetes solicitados</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-wrap gap-4 items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">Filtrar Estado:</span>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="EN_PREPARACION">En Preparación</option>
            <option value="LISTO">Listo para Despacho</option>
            <option value="EN_TRANSITO">En Tránsito</option>
            <option value="ENTREGADO">Entregado Conforme</option>
            <option value="ENTREGADO_PARCIALMENTE">Entregado Parcialmente</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">Zona de Destino:</span>
          <select
            value={zonaFiltro}
            onChange={(e) => setZonaFiltro(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="TODAS">Todas las Zonas</option>
            <option value="Norte">Zona Norte</option>
            <option value="Centro">Zona Centro</option>
            <option value="Sur">Zona Sur</option>
          </select>
        </div>
      </div>

      {/* Tabla de Pedidos */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cin-600 mb-2" />
            Cargando pedidos y métricas SLA...
          </div>
        ) : pedidos.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No se encontraron pedidos con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Cliente / Destino</th>
                  <th className="px-4 py-3">Zona</th>
                  <th className="px-4 py-3">Fecha Prometida</th>
                  <th className="px-4 py-3">Estado / Flujo</th>
                  <th className="px-4 py-3">Vehículo Asignado</th>
                  <th className="px-4 py-3">SLA / Retraso</th>
                  <th className="px-4 py-3">Paquetes</th>
                  <th className="px-4 py-3">Total (PEN)</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidos.map((p) => {
                  let badgeEstadoColor = "bg-slate-100 text-slate-700";
                  if (p.estado === "ENTREGADO") badgeEstadoColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
                  else if (p.estado === "EN_TRANSITO") badgeEstadoColor = "bg-blue-100 text-blue-800 border-blue-300";
                  else if (p.estado === "EN_PREPARACION") badgeEstadoColor = "bg-amber-100 text-amber-800 border-amber-300";
                  else if (p.estado === "CANCELADO") badgeEstadoColor = "bg-rose-100 text-rose-800 border-rose-300";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{p.codigo}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{p.cliente}</p>
                        <p className="text-[11px] text-slate-400">{p.direccionEntrega}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700 text-[10px]">
                          {p.zonaDestino}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {new Date(p.fechaPrometidaOriginal).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeEstadoColor}`}>
                          {p.estado.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {p.vehiculo ? (
                          <span className="font-mono text-slate-900 font-medium">
                            {p.vehiculo.identificador} ({p.vehiculo.placa})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.retrasoMinutos > 0 ? (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                            <Clock className="w-3 h-3" />
                            +{p.retrasoMinutos} min
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium text-[11px]">Puntual</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {p.totalPaquetesSolicitados} paq
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        S/ {p.montoTotal.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setPedidoParaEditar(p);
                            setEditarEntregaParcial(false);
                            setCantidadesEntrega(
                              Object.fromEntries(
                                p.detalles.map((detalle: any) => [
                                  detalle.id,
                                  detalle.paquetesEntregados || 0,
                                ])
                              )
                            );
                            setModalEstadoAbierto(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                        >
                          Actualizar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cambiar Estado */}
      {modalEstadoAbierto && pedidoParaEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Actualizar Pedido {pedidoParaEditar.codigo}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Cliente: {pedidoParaEditar.cliente} ({pedidoParaEditar.zonaDestino})
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nuevo Estado</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    "CONFIRMADO",
                    "EN_PREPARACION",
                    "LISTO",
                    "EN_TRANSITO",
                    "ENTREGADO",
                    "ENTREGADO_PARCIALMENTE",
                    "CANCELADO",
                  ].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        if (st === "ENTREGADO_PARCIALMENTE") {
                          setEditarEntregaParcial(true);
                        } else {
                          handleActualizarEstado(st);
                        }
                      }}
                      className={`py-1.5 px-3 border rounded-lg text-left transition-colors font-medium ${
                        pedidoParaEditar.estado === st
                          ? "bg-cin-50 border-cin-400 text-cin-800"
                          : "hover:bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {st.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              {editarEntregaParcial && (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="font-semibold text-slate-700">Paquetes entregados por producto</p>
                  {pedidoParaEditar.detalles.map((detalle: any) => {
                    const paquetesEnviados = detalle.paquetesEnviados || detalle.paquetesSolicitados;
                    return (
                      <label key={detalle.id} className="flex items-center justify-between gap-3">
                        <span className="text-slate-600">
                          {detalle.producto.nombre} (enviados: {paquetesEnviados})
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={paquetesEnviados}
                          value={cantidadesEntrega[detalle.id] ?? 0}
                          onChange={(event) =>
                            setCantidadesEntrega((actual) => ({
                              ...actual,
                              [detalle.id]: Number(event.target.value),
                            }))
                          }
                          className="w-20 rounded border border-slate-300 px-2 py-1"
                        />
                      </label>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() =>
                      handleActualizarEstado(
                        "ENTREGADO_PARCIALMENTE",
                        undefined,
                        pedidoParaEditar.detalles.map((detalle: any) => ({
                          id: detalle.id,
                          paquetesEntregados: cantidadesEntrega[detalle.id] ?? 0,
                          paquetesEnviados: detalle.paquetesEnviados || detalle.paquetesSolicitados,
                        }))
                      )
                    }
                    className="w-full rounded-lg bg-cin-600 px-3 py-1.5 font-semibold text-white hover:bg-cin-700"
                  >
                    Guardar entrega parcial
                  </button>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Asignar Camión de Flota</label>
                <select
                  defaultValue={pedidoParaEditar.vehiculoId || ""}
                  onChange={(e) =>
                    handleActualizarEstado(pedidoParaEditar.estado, e.target.value || null)
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">(Sin camión asignado)</option>
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.identificador} ({v.placa}) - Zona: {v.zonaAsignada}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setModalEstadoAbierto(false);
                  setEditarEntregaParcial(false);
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Pedido */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Registrar Nuevo Pedido de Cliente</h3>
            <p className="text-xs text-slate-500 mb-4">Se registra con fecha prometida original para control estricto de SLA.</p>

            <form onSubmit={handleCrearPedido} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código Pedido</label>
                  <input
                    type="text"
                    required
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zona Destino</label>
                  <select
                    value={form.zonaDestino}
                    onChange={(e) => setForm({ ...form, zonaDestino: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Norte">Zona Norte</option>
                    <option value="Centro">Zona Centro</option>
                    <option value="Sur">Zona Sur</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre del Cliente / Empresa</label>
                <input
                  type="text"
                  required
                  value={form.cliente}
                  onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                  placeholder="Cadena Supermercados del Norte"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dirección de Entrega</label>
                <input
                  type="text"
                  required
                  value={form.direccionEntrega}
                  onChange={(e) => setForm({ ...form, direccionEntrega: e.target.value })}
                  placeholder="Av. Principal 450, Almacén Central"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha y Hora Prometida (SLA)</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.fechaPrometidaOriginal}
                    onChange={(e) => setForm({ ...form, fechaPrometidaOriginal: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Camión Asignado (Opcional)</label>
                  <select
                    value={form.vehiculoId}
                    onChange={(e) => setForm({ ...form, vehiculoId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">(Asignar más tarde)</option>
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.identificador} ({v.placa}) - {v.zonaAsignada}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-700 mb-1">Producto a Despachar</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <select
                      value={form.items[0].productoId}
                      onChange={(e) => {
                        const prod = productos.find((p) => p.id === e.target.value);
                        setForm({
                          ...form,
                          items: [
                            {
                              ...form.items[0],
                              productoId: e.target.value,
                              precioUnitarioPaquete: prod ? prod.precioPaquete : 18.0,
                            },
                          ],
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    >
                      {productos.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.nombre} (Stock disp: {prod.stockDisponiblePaquetes} paq)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      required
                      value={form.items[0].paquetesSolicitados}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          items: [
                            {
                              ...form.items[0],
                              paquetesSolicitados: parseInt(e.target.value) || 1,
                            },
                          ],
                        })
                      }
                      placeholder="Paquetes"
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
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
                  className="px-4 py-1.5 font-semibold bg-cin-600 hover:bg-cin-700 text-white rounded-lg shadow-sm"
                >
                  Confirmar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
