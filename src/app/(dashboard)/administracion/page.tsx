"use client";

import React, { useEffect, useState } from "react";
import { Users, Shield, Plus, History, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { RolUsuario } from "@/types";

export default function AdministracionPage() {
  const [tabActiva, setTabActiva] = useState<"USUARIOS" | "AUDITORIA">("USUARIOS");
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [auditorias, setAuditorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalUsuario, setModalUsuario] = useState(false);

  const [form, setForm] = useState({
    email: "",
    nombreCompleto: "",
    password: "",
    rol: "PRODUCCION" as RolUsuario,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resUsr, resAud] = await Promise.all([
        fetch("/api/administracion/usuarios"),
        fetch("/api/administracion/auditoria"),
      ]);
      const jsonUsr = await resUsr.json();
      const jsonAud = await resAud.json();

      if (jsonUsr.success) setUsuarios(jsonUsr.usuarios);
      if (jsonAud.success) setAuditorias(jsonAud.auditorias);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/administracion/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear usuario");
      setModalUsuario(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleActivo = async (user: any) => {
    try {
      const res = await fetch("/api/administracion/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, activo: !user.activo }),
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-cin-600" />
            Administración de Usuarios, Roles y Auditoría Inmutable
          </h2>
          <p className="text-xs text-slate-500">
            Control de perfiles RBAC (Administrador, Gerencia, Inventario, Producción, Distribución, Calidad) y bitácora de eventos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalUsuario(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cin-600 hover:bg-cin-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Crear Usuario
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setTabActiva("USUARIOS")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            tabActiva === "USUARIOS"
              ? "border-cin-600 text-cin-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Shield className="w-4 h-4" />
          Usuarios y Permisos por Rol ({usuarios.length})
        </button>
        <button
          onClick={() => setTabActiva("AUDITORIA")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            tabActiva === "AUDITORIA"
              ? "border-cin-600 text-cin-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <History className="w-4 h-4" />
          Bitácora de Auditoría Inmutable ({auditorias.length})
        </button>
      </div>

      {/* Tab 1: Usuarios */}
      {tabActiva === "USUARIOS" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cin-600 mb-2" />
              Cargando usuarios y roles...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Nombre Completo</th>
                    <th className="px-4 py-3">Correo Electrónico</th>
                    <th className="px-4 py-3">Rol del Sistema</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Fecha Alta</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{u.nombreCompleto}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.activo ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 text-[11px] font-medium">
                            <XCircle className="w-3.5 h-3.5" /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono">
                        {new Date(u.creadoEn).toLocaleDateString("es-PE")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleActivo(u)}
                          className="px-2.5 py-1 text-[11px] font-medium border border-slate-200 rounded hover:bg-slate-50 text-slate-700"
                        >
                          {u.activo ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Auditoría */}
      {tabActiva === "AUDITORIA" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Fecha / Hora</th>
                  <th className="px-4 py-3">Usuario Responsable</th>
                  <th className="px-4 py-3">Módulo</th>
                  <th className="px-4 py-3">Acción Registrada</th>
                  <th className="px-4 py-3">Detalles Técnicos</th>
                  <th className="px-4 py-3">IP Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditorias.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {new Date(a.creadoEn).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "medium" })}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {a.usuario ? `${a.usuario.nombreCompleto} (${a.usuario.rol})` : "Sistema / Anónimo"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-700 text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                        {a.modulo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800 font-medium">{a.accion}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 font-mono max-w-sm truncate">
                      {JSON.stringify(a.detalles)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">{a.ipOrigen || "127.0.0.1"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear Usuario */}
      {modalUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Crear Cuenta de Usuario</h3>
            <p className="text-xs text-slate-500 mb-4">Se creará con acceso basado en roles para Industrias CIN.</p>

            <form onSubmit={handleCrearUsuario} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={form.nombreCompleto}
                  onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
                  placeholder="Ej. Ing. Daniel Rojas"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="usuario@cin.com"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rol Operativo</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value as RolUsuario })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                  <option value="GERENCIA">GERENCIA</option>
                  <option value="INVENTARIO">INVENTARIO</option>
                  <option value="PRODUCCION">PRODUCCION</option>
                  <option value="DISTRIBUCION">DISTRIBUCION</option>
                  <option value="CALIDAD">CALIDAD</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contraseña Inicial</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalUsuario(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold bg-cin-600 hover:bg-cin-700 text-white rounded-lg shadow-sm"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
