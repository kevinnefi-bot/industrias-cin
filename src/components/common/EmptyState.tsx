import React from "react";
import { AlertCircle, Database, RefreshCw } from "lucide-react";

interface Props {
  titulo: string;
  descripcion: string;
  esDatosInsuficientes?: boolean;
  onAccion?: () => void;
  textoAccion?: string;
}

export const EmptyState: React.FC<Props> = ({
  titulo,
  descripcion,
  esDatosInsuficientes = true,
  onAccion,
  textoAccion,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-dashed border-slate-300 rounded-xl my-4">
      <div
        className={`p-3 rounded-full mb-3 ${
          esDatosInsuficientes ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
        }`}
      >
        {esDatosInsuficientes ? (
          <AlertCircle className="w-8 h-8" />
        ) : (
          <Database className="w-8 h-8" />
        )}
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{titulo}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-4">{descripcion}</p>
      {esDatosInsuficientes && (
        <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md mb-4">
          REGLA ESTRICTA: Sin datos simulados ni ficticios. Requiere registros en base de datos.
        </span>
      )}
      {onAccion && textoAccion && (
        <button
          onClick={onAccion}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cin-700 bg-cin-50 border border-cin-200 rounded-lg hover:bg-cin-100 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {textoAccion}
        </button>
      )}
    </div>
  );
};
