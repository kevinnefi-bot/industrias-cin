"use client";

import React, { useState } from "react";
import { UserSession, RolUsuario } from "@/types";
import { LogOut, User, Shield, ChevronDown, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  user: UserSession;
}

const ROLES_DISPONIBLES: { rol: RolUsuario; email: string; label: string }[] = [
  { rol: "ADMINISTRADOR", email: "admin@cin.com", label: "Administrador General" },
  { rol: "GERENCIA", email: "gerencia@cin.com", label: "Gerencia Ejecutiva" },
  { rol: "INVENTARIO", email: "inventario@cin.com", label: "Jefatura de Inventario" },
  { rol: "PRODUCCION", email: "produccion@cin.com", label: "Jefe de Planta / Producción" },
  { rol: "DISTRIBUCION", email: "distribucion@cin.com", label: "Coordinador de Distribución" },
  { rol: "CALIDAD", email: "calidad@cin.com", label: "Jefe de Control de Calidad" },
];

export const Navbar: React.FC<Props> = ({ user }) => {
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cambiando, setCambiando] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCambiarRol = async (targetEmail: string) => {
    try {
      setCambiando(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: "cin123456" }),
      });
      if (res.ok) {
        setMenuAbierto(false);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCambiando(false);
    }
  };

  const getRoleBadgeColor = (rol: RolUsuario) => {
    switch (rol) {
      case "ADMINISTRADOR":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "GERENCIA":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "INVENTARIO":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "PRODUCCION":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "DISTRIBUCION":
        return "bg-cyan-100 text-cyan-800 border-cyan-300";
      case "CALIDAD":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cin-600 animate-pulse" />
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">
            Sistema en Línea | Base de Datos Conectada
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Switcher Rápido de Roles */}
        <div className="relative">
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-cin-600" />
            <span className="hidden md:inline">Rol Activo:</span>
            <span className={`px-2 py-0.5 rounded-full font-semibold border text-[11px] ${getRoleBadgeColor(user.rol)}`}>
              {user.rol}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {menuAbierto && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">Prueba Rápida de Roles (RBAC)</p>
                <p className="text-[11px] text-slate-500">Cambia de perfil instantáneamente para verificar permisos y vistas:</p>
              </div>
              <div className="py-1">
                {ROLES_DISPONIBLES.map((item) => (
                  <button
                    key={item.rol}
                    onClick={() => handleCambiarRol(item.email)}
                    disabled={cambiando || user.rol === item.rol}
                    className={`w-full flex items-center justify-between px-4 py-2 text-xs text-left transition-colors ${
                      user.rol === item.rol
                        ? "bg-slate-50 font-semibold text-cin-700"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-[10px] text-slate-400">{item.email}</p>
                    </div>
                    {user.rol === item.rol && <Check className="w-4 h-4 text-cin-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Perfil y Salir */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right hidden md:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user.nombreCompleto}</p>
            <p className="text-[10px] text-slate-400">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
