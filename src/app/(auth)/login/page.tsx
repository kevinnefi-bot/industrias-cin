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
    setPassword("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 p-8 text-white text-center border-b border-slate-800">
          <div className="w-14 h-14 bg-cin-600 rounded-2xl mx-auto flex items-center justify-center font-bold text-2xl shadow-lg shadow-cin-900/60 mb-3">
            CIN
          </div>
          <h2 className="text-xl font-bold tracking-tight">Industrias CIN</h2>
          <p className="text-xs text-cin-400 font-medium mt-1">
            Plataforma Empresarial | Líneas de Hervidos y Jugos
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cin-500 focus:border-transparent text-slate-800"
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
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cin-500 focus:border-transparent text-slate-800"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-cin-600 hover:bg-cin-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? (
                "Verificando..."
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cin-600" />
                Usuarios de prueba:
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Administrador", email: "admin@cin.com" },
                  { label: "Gerencia", email: "gerencia@cin.com" },
                  { label: "Inventario", email: "inventario@cin.com" },
                  { label: "Producción", email: "produccion@cin.com" },
                  { label: "Distribución", email: "distribucion@cin.com" },
                  { label: "Calidad", email: "calidad@cin.com" },
                ].map((role) => (
                  <button
                    key={role.email}
                    type="button"
                    onClick={() => handleQuickRole(role.email)}
                    className={`text-[11px] py-1 px-2 border rounded text-left transition-colors flex items-center justify-between ${
                      email === role.email
                        ? "bg-cin-50 border-cin-300 text-cin-800 font-semibold"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>{role.label}</span>
                    {email === role.email && <CheckCircle2 className="w-3 h-3 text-cin-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
