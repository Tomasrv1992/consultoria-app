"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, isDemoMode } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setIsLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[360px]">
        <div className="mb-10 text-center md:text-left">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-teal mb-5">
            <span className="font-brand text-white text-base leading-none">EA</span>
          </div>
          <h1 className="font-brand text-[28px] text-ink leading-tight">
            Estrategia en Acción
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Console de consultoría
          </p>
        </div>

        {isDemoMode && (
          <div className="bg-surface border border-line rounded-card p-4 mb-6">
            <p className="text-[11px] uppercase tracking-label font-medium text-muted mb-2">
              Modo demo
            </p>
            <p className="text-[13px] text-ink mb-2">
              Supabase no configurado. Credenciales de prueba:
            </p>
            <ul className="text-[12px] text-muted space-y-0.5 font-mono">
              <li>tomas@estrategiaenaccion.co / demo123</li>
              <li>contacto@cygnuss.com / demo123</li>
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-ink mb-2">
              Correo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              className="w-full h-11 px-3 rounded-btn border border-line bg-surface text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-11 px-3 pr-14 rounded-btn border border-line bg-surface text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted hover:text-ink"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-btn bg-surface border border-line px-3 py-2">
              <p className="text-[13px] text-danger">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-btn bg-ink text-white text-[14px] font-medium hover:bg-ink/90 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-center text-[12px] text-muted mt-10">
          © 2026 Estrategia en Acción · Sin Bata
        </p>
      </div>
    </div>
  );
}
