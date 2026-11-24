"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Mail, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const targetEmail = window.sessionStorage.getItem("cin_login_email");
    if (targetEmail) {
      setEmail(targetEmail);
      window.sessionStorage.removeItem("cin_login_email");
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al iniciar sesión.");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = (targetEmail: string) => {
    setEmail(targetEmail);
    setPassword("cin123456");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Corporativo */}
        <div className="bg-slate-950 p-8 text-white text-center border-b border-slate-800">
          <div className="w-16 h-16 bg-gradient-to-br from-cin-500 to-cin-700 rounded-2xl mx-auto flex items-center justify-center font-black text-2xl shadow-lg shadow-cin-900/60 mb-3 border border-cin-400/30">
            CIN
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Industrias CIN</h2>
          <p className="text-xs text-cin-400 font-semibold tracking-wide uppercase mt-1">
            Plataforma Empresarial | Hervidos y Jugos
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Sistema en Línea & Base de Datos Conectada
          </div>
        </div>

        {/* Formulario de Login */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cin-500 focus:border-transparent text-slate-800 font-medium"
                  placeholder="usuario@cin.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cin-500 focus:border-transparent text-slate-800 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-cin-600 hover:bg-cin-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg shadow-cin-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? (
                "Verificando Credenciales..."
              ) : (
                <>
                  <span>Ingresar a la Plataforma</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Acceso Rápido para Demostración / Auditoría */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cin-600" />
                Perfiles de Prueba Rápida (1-Click):
              </p>
              <span className="text-[10px] text-slate-400 font-mono">pass: cin123456</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Administrador", email: "admin@cin.com", desc: "Control Total" },
                { label: "Gerencia General", email: "gerencia@cin.com", desc: "KPIs & Reportes" },
                { label: "Jefe Inventario", email: "inventario@cin.com", desc: "Kardex & Almacén" },
                { label: "Jefe Producción", email: "produccion@cin.com", desc: "Modelos & Planta" },
                { label: "Distribución", email: "distribucion@cin.com", desc: "Rutas & Flota" },
                { label: "Control Calidad", email: "calidad@cin.com", desc: "Mermas & Daños" },
              ].map((role) => (
                <button
                  key={role.email}
                  type="button"
                  onClick={() => handleQuickRole(role.email)}
                  className={`p-2 border rounded-xl text-left transition-all flex flex-col justify-between ${
                    email === role.email
                      ? "bg-cin-50 border-cin-400 text-cin-800 shadow-sm ring-1 ring-cin-400"
                      : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-bold text-slate-800">{role.label}</span>
                    {email === role.email && <CheckCircle2 className="w-3.5 h-3.5 text-cin-600 flex-shrink-0" />}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5">{role.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
