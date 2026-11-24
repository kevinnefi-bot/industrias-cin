import React from "react";
import { OrigenDato } from "@/types";

interface Props {
  origen: OrigenDato | string;
  size?: "sm" | "md";
}

export const DataOriginBadge: React.FC<Props> = ({ origen, size = "sm" }) => {
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  switch (origen) {
    case "RECOPILADO":
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${pad}`}
          title="Dato oficial comprobado y verificado en planta o kardex"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
          Recopilado
        </span>
      );
    case "ESTIMADO":
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-300 ${pad}`}
          title="Dato proyectado o preliminar; no constituye un registro físico oficial"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
          Estimado
        </span>
      );
    case "REAL_FUTURO":
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${pad}`}
          title="Dato operativo incorporado por usuarios en tiempo real"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
          Real Futuro
        </span>
      );
  }
};
