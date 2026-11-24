import React from "react";
import { OrigenDato } from "@/types";

export type OrigenDatoExtendido =
  | OrigenDato
  | "REAL"
  | "OFICIAL"
  | "PROYECTADO"
  | "REFERENCIAL"
  | "BENCHMARK"
  | "NORMATIVO";

interface Props {
  origen: OrigenDatoExtendido | string;
  size?: "sm" | "md";
}

export const DataOriginBadge: React.FC<Props> = ({ origen, size = "sm" }) => {
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  const origUpper = (origen || "REAL_FUTURO").toUpperCase();

  switch (origUpper) {
    case "RECOPILADO":
    case "REAL":
    case "OFICIAL":
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${pad}`}
          title="Dato real oficial comprobado y verificado en planta o kardex contable"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
          Dato Real
        </span>
      );

    case "ESTIMADO":
    case "PROYECTADO":
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-300 ${pad}`}
          title="Dato estimado o proyectado; parámetro sujeto a calibración que no constituye registro físico oficial"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
          Dato Estimado
        </span>
      );

    case "REFERENCIAL":
    case "BENCHMARK":
    case "NORMATIVO":
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${pad}`}
          title="Dato referencial de ingeniería o norma técnica industrial"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5" />
          Referencial
        </span>
      );

    case "REAL_FUTURO":
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${pad}`}
          title="Dato operativo incorporado por usuarios del sistema en tiempo real"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
          Real Futuro
        </span>
      );
  }
};

export default DataOriginBadge;
