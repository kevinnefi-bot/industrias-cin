"use client";

import React from "react";
import { HelpCircle } from "lucide-react";

interface GuidedModelFormProps {
  modeloCodigo: string;
  params: any;
  onChange: (newParams: any) => void;
}

export function GuidedModelForm({ modeloCodigo, params, onChange }: GuidedModelFormProps) {
  if (!params) return null;

  const updateField = (path: string, value: any) => {
    const clone = JSON.parse(JSON.stringify(params));
    const keys = path.split(".");
    let curr = clone;
    for (let i = 0; i < keys.length - 1; i++) {
      curr = curr[keys[i]];
    }
    curr[keys[keys.length - 1]] = value;
    onChange(clone);
  };

  // MODELO A: Programación Lineal (Simplex)
  if (modeloCodigo === "MODELO_A") {
    return (
      <div className="space-y-4">
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex gap-2">
          <HelpCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
          <span>
            <strong>Planificación de Producción (Simplex):</strong> Ajuste las capacidades máximas disponibles (en horas) de sus líneas de planta y el margen de ganancia por paquete de cada producto.
          </span>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-2">Capacidades Máximas de Planta (Horas)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(params.b || []).map((val: number, idx: number) => (
              <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {params.nombresRestricciones?.[idx] || `Recurso ${idx + 1}`}
                </label>
                <input
                  type="number"
                  step="1"
                  value={val}
                  onChange={(e) => updateField(`b.${idx}`, Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-2">Margen Unitario por Producto (Bs. / Paquete)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(params.c || []).map((val: number, idx: number) => (
              <div key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 truncate mb-1" title={params.nombresVariables?.[idx]}>
                  {params.nombresVariables?.[idx] || `Prod ${idx + 1}`}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={val}
                  onChange={(e) => updateField(`c.${idx}`, Number(e.target.value))}
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // MODELO B: Transporte
  if (modeloCodigo === "MODELO_B") {
    return (
      <div className="space-y-4">
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex gap-2">
          <HelpCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
          <span>
            <strong>Modelo de Transporte:</strong> Defina la oferta disponible en cada almacén/planta y la demanda requerida en cada zona geográfica para minimizar el costo total de envío.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700">Capacidad de Orígenes (Paquetes)</h4>
            {(params.orígenes || []).map((o: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="text-xs font-medium text-slate-700 truncate">{o.nombre}</span>
                <input
                  type="number"
                  value={o.capacidad}
                  onChange={(e) => updateField(`orígenes.${idx}.capacidad`, Number(e.target.value))}
                  className="w-24 px-2 py-1 text-xs bg-white border border-slate-300 rounded-md text-right"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700">Demanda por Destino (Paquetes)</h4>
            {(params.destinos || []).map((d: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="text-xs font-medium text-slate-700 truncate">{d.nombre}</span>
                <input
                  type="number"
                  value={d.demanda}
                  onChange={(e) => updateField(`destinos.${idx}.demanda`, Number(e.target.value))}
                  className="w-24 px-2 py-1 text-xs bg-white border border-slate-300 rounded-md text-right"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // MODELO C: Mochila (Knapsack)
  if (modeloCodigo === "MODELO_C") {
    return (
      <div className="space-y-4">
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex gap-2">
          <HelpCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
          <span>
            <strong>Selección de Inversiones (Mochila):</strong> Establezca el presupuesto máximo disponible y ajuste el costo y beneficio mensual estimado de cada iniciativa.
          </span>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 max-w-xs">
          <label className="block text-xs font-bold text-slate-700 mb-1">Presupuesto Máximo Disponible (Bs.)</label>
          <input
            type="number"
            value={params.presupuestoMaximo || 0}
            onChange={(e) => updateField("presupuestoMaximo", Number(e.target.value))}
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
          />
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700">Iniciativas Evaluadas</h4>
          {(params.items || []).map((item: any, idx: number) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="sm:col-span-2 text-xs font-medium text-slate-700">{item.nombre}</span>
              <div>
                <span className="text-[10px] text-slate-500 block">Costo (Bs.)</span>
                <input
                  type="number"
                  value={item.costo}
                  onChange={(e) => updateField(`items.${idx}.costo`, Number(e.target.value))}
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Beneficio (Bs.)</span>
                <input
                  type="number"
                  value={item.beneficio}
                  onChange={(e) => updateField(`items.${idx}.beneficio`, Number(e.target.value))}
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // MODELO E: Inventario EOQ
  if (modeloCodigo === "MODELO_E") {
    const fields = [
      { key: "demandaAnualUnidades", label: "Demanda Anual (Paquetes)" },
      { key: "costoEmisionPedido", label: "Costo de Emisión por Pedido (Bs.)" },
      { key: "costoMantenimientoUnitario", label: "Costo Mantenimiento Anual/Paq (Bs.)" },
      { key: "tiempoEntregaDias", label: "Tiempo de Entrega / Lead Time (Días)" },
      { key: "nivelServicioZ", label: "Factor Nivel de Servicio (Z, ej. 1.96 = 97.5%)" },
    ];
    return (
      <div className="space-y-4">
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex gap-2">
          <HelpCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
          <span>
            <strong>Lote Económico de Pedido (EOQ):</strong> Calcule el tamaño óptimo de lote y el punto de reorden para minimizar costos de pedido y almacenamiento.
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fields.map((f) => (
            <div key={f.key} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">{f.label}</label>
              <input
                type="number"
                step="any"
                value={params[f.key] ?? 0}
                onChange={(e) => updateField(f.key, Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Vista genérica amigable para modelos D, F, G, H, I, J (edición de campos numéricos principales)
  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex gap-2">
        <HelpCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
        <span>
          <strong>Configuración Guiada ({modeloCodigo}):</strong> Modifique los parámetros principales del modelo. Si necesita editar estructuras matriciales complejas, active el <em>Modo JSON Avanzado</em>.
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(params).map(([key, val]) => {
          if (typeof val === "number") {
            return (
              <div key={key} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 capitalize">
                  {key.replace(/([A-Z])/g, " $1")}
                </label>
                <input
                  type="number"
                  step="any"
                  value={val}
                  onChange={(e) => updateField(key, Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            );
          }
          return null;
        })}
      </div>

      {Array.isArray(params.productos) && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700">Parámetros por Producto</h4>
          {params.productos.map((p: any, idx: number) => (
            <div key={idx} className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">{p.nombre || p.sku}</span>
              <div className="flex items-center gap-3">
                {typeof p.stockRequeridoPaquetes === "number" && (
                  <label className="text-[11px] text-slate-600 flex items-center gap-1">
                    Stock Req:
                    <input
                      type="number"
                      value={p.stockRequeridoPaquetes}
                      onChange={(e) => updateField(`productos.${idx}.stockRequeridoPaquetes`, Number(e.target.value))}
                      className="w-20 px-2 py-1 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </label>
                )}
                {typeof p.demandaMensual === "number" && (
                  <label className="text-[11px] text-slate-600 flex items-center gap-1">
                    Demanda Mes:
                    <input
                      type="number"
                      value={p.demandaMensual}
                      onChange={(e) => updateField(`productos.${idx}.demandaMensual`, Number(e.target.value))}
                      className="w-20 px-2 py-1 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
