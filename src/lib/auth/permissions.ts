import { RolUsuario } from "@/types";

export type ModuloSistema =
  | "DASHBOARD"
  | "CATALOGO"
  | "INVENTARIO"
  | "ALMACENES"
  | "PEDIDOS"
  | "DISTRIBUCION"
  | "CALIDAD"
  | "DEMANDA"
  | "OPTIMIZACION"
  | "REPORTES"
  | "ADMINISTRACION";

export const PERMISOS_POR_ROL: Record<RolUsuario, ModuloSistema[]> = {
  ADMINISTRADOR: [
    "DASHBOARD",
    "CATALOGO",
    "INVENTARIO",
    "ALMACENES",
    "PEDIDOS",
    "DISTRIBUCION",
    "CALIDAD",
    "DEMANDA",
    "OPTIMIZACION",
    "REPORTES",
    "ADMINISTRACION",
  ],
  GERENCIA: [
    "DASHBOARD",
    "CATALOGO",
    "INVENTARIO",
    "ALMACENES",
    "PEDIDOS",
    "DISTRIBUCION",
    "CALIDAD",
    "DEMANDA",
    "OPTIMIZACION",
    "REPORTES",
  ],
  INVENTARIO: [
    "DASHBOARD",
    "CATALOGO",
    "INVENTARIO",
    "ALMACENES",
    "DEMANDA",
    "REPORTES",
  ],
  PRODUCCION: [
    "DASHBOARD",
    "CATALOGO",
    "INVENTARIO",
    "OPTIMIZACION",
    "REPORTES",
  ],
  DISTRIBUCION: [
    "DASHBOARD",
    "PEDIDOS",
    "DISTRIBUCION",
    "OPTIMIZACION",
    "REPORTES",
  ],
  CALIDAD: [
    "DASHBOARD",
    "CALIDAD",
    "REPORTES",
  ],
};

export function tienePermiso(rol: RolUsuario, modulo: ModuloSistema): boolean {
  const modulosPermitidos = PERMISOS_POR_ROL[rol];
  return modulosPermitidos ? modulosPermitidos.includes(modulo) : false;
}
