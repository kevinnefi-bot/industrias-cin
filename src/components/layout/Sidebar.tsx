"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserSession } from "@/types";
import { tienePermiso, ModuloSistema } from "@/lib/auth/permissions";
import {
  LayoutDashboard,
  Wine,
  Package,
  Boxes,
  Truck,
  ShoppingCart,
  ShieldAlert,
  TrendingUp,
  Cpu,
  FileSpreadsheet,
  Users,
  Layers,
} from "lucide-react";

interface Props {
  user: UserSession;
}

interface NavItem {
  nombre: string;
  href: string;
  icono: React.ElementType;
  modulo: ModuloSistema;
}

const MENU_ITEMS: NavItem[] = [
  { nombre: "Dashboard Ejecutivo", href: "/", icono: LayoutDashboard, modulo: "DASHBOARD" },
  { nombre: "Catálogo de Productos", href: "/catalogo", icono: Wine, modulo: "CATALOGO" },
  { nombre: "Inventario y Kardex", href: "/inventario", icono: Package, modulo: "INVENTARIO" },
  { nombre: "Almacenes y Capacidad", href: "/inventario/almacenes", icono: Boxes, modulo: "ALMACENES" },
  { nombre: "Pedidos y Ventas", href: "/pedidos", icono: ShoppingCart, modulo: "PEDIDOS" },
  { nombre: "Distribución y Flota", href: "/pedidos/distribucion", icono: Truck, modulo: "DISTRIBUCION" },
  { nombre: "Calidad y Daños", href: "/calidad", icono: ShieldAlert, modulo: "CALIDAD" },
  { nombre: "Demanda y Rotación", href: "/demanda", icono: TrendingUp, modulo: "DEMANDA" },
  { nombre: "Centro de Optimización", href: "/optimizacion", icono: Cpu, modulo: "OPTIMIZACION" },
  { nombre: "Reportes Descargables", href: "/reportes", icono: FileSpreadsheet, modulo: "REPORTES" },
  { nombre: "Administración y Roles", href: "/administracion", icono: Users, modulo: "ADMINISTRACION" },
];

export const Sidebar: React.FC<Props> = ({ user }) => {
  const pathname = usePathname();

  // Filtrar según permisos de RBAC
  const itemsVisibles = MENU_ITEMS.filter((item) => tienePermiso(user.rol, item.modulo));

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 text-slate-300 min-h-screen flex flex-col border-r border-slate-800">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800 bg-slate-950">
        <div className="w-9 h-9 rounded-xl bg-cin-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-cin-900/40">
          CIN
        </div>
        <div>
          <h1 className="font-bold text-sm text-white tracking-tight">Industrias CIN</h1>
          <p className="text-[10px] text-cin-400 font-medium">Hervidos & Jugos Naturales</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-3 overflow-y-auto space-y-1">
        <div className="px-3 mb-2">
          <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Módulos del Sistema
          </p>
        </div>

        {itemsVisibles.map((item) => {
          const Icon = item.icono;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-cin-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{item.nombre}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/50">
        <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800 text-[11px] space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span>Versión:</span>
            <span className="font-mono text-slate-300">v1.0.0-PROD</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Planta:</span>
            <span className="text-cin-400 font-medium">Línea CIN Central</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
