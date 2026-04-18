"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useData, NewClientResult } from "@/lib/data-context";
import { AppShell } from "@/components/AppShell";

type Brand = "estrategia" | "sinbata";

export default function NewClientPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { addClient } = useData();

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [brand, setBrand] = useState<Brand>("estrategia");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [proximaReunion, setProximaReunion] = useState("");
  const [result, setResult] = useState<NewClientResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace("/login");
      else if (profile?.role !== "consultant") router.replace("/dashboard");
    }
  }, [loading, user, profile, router]);

  if (loading || !user || profile?.role !== "consultant") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-line border-t-ink rounded-full animate-spin" />
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = addClient({
      name: name.trim(),
      industry: industry.trim(),
      brand,
      description: description.trim(),
      contact_email: email.trim(),
      proxima_reunion: proximaReunion || undefined,
    });
    setResult(r);
  }

  async function copyCredentials() {
    if (!result) return;
    const text = `Correo: ${result.email}\nContraseña: ${result.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const canSubmit = name.trim() && industry.trim() && email.trim();

  return (
    <AppShell
      title="Nuevo cliente"
      subtitle="Crea el acceso del cliente a su portal"
      onBack={() => router.push("/dashboard")}
    >
      <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
        <div className="bg-surface border border-line shadow-card rounded-card p-5 md:p-6 space-y-5">
          <Input
            label="Nombre del cliente / empresa"
            value={name}
            onChange={setName}
            placeholder="Ej. Acme Studio"
            required
          />

          <Input
            label="Industria / sector"
            value={industry}
            onChange={setIndustry}
            placeholder="Ej. Retail, Salud, Consultoría"
            required
          />

          <div>
            <Label>Tipo de consultoría</Label>
            <div className="grid grid-cols-2 gap-2">
              <BrandOption
                active={brand === "estrategia"}
                onClick={() => setBrand("estrategia")}
                label="Estrategia en Acción"
                accent="#0D7C5F"
              />
              <BrandOption
                active={brand === "sinbata"}
                onClick={() => setBrand("sinbata")}
                label="Sin Bata"
                accent="#1B3A5C"
              />
            </div>
          </div>

          <div>
            <Label>Descripción breve</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexto rápido del negocio y objetivos"
              rows={3}
              className="w-full px-3 py-2 rounded-btn border border-line bg-surface text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors resize-none"
            />
          </div>

          <Input
            label="Correo del cliente"
            value={email}
            onChange={setEmail}
            placeholder="cliente@empresa.com"
            type="email"
            required
            hint="Se usará como usuario de acceso al portal"
          />

          <Input
            label="Próxima reunión"
            value={proximaReunion}
            onChange={setProximaReunion}
            type="date"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-11 px-5 rounded-btn bg-ink text-white text-[14px] font-medium hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Crear cliente
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="h-11 px-4 rounded-btn border border-line text-[14px] font-medium text-ink hover:bg-bg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>

      {result && (
        <SuccessModal
          result={result}
          copied={copied}
          onCopy={copyCredentials}
          onOpen={() => router.push(`/client/${result.client.id}`)}
          onClose={() => router.push("/dashboard")}
        />
      )}
    </AppShell>
  );
}

function SuccessModal({
  result,
  copied,
  onCopy,
  onOpen,
  onClose,
}: {
  result: NewClientResult;
  copied: boolean;
  onCopy: () => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 py-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface rounded-card shadow-card border border-line overflow-hidden"
      >
        <div className="p-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-teal-50 text-teal-600 mb-4">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-[18px] font-semibold text-ink">
            {result.client.name} está listo
          </h2>
          <p className="text-[13px] text-muted mt-1">
            Comparte estas credenciales con tu cliente. Su tablero en Miro será
            creado en las próximas horas.
          </p>

          <div className="mt-5 rounded-btn bg-bg border border-line p-4 space-y-2">
            <Field label="Correo" value={result.email} />
            <Field label="Contraseña" value={result.password} mono />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-5">
            <button
              onClick={onCopy}
              className="h-11 px-4 rounded-btn bg-ink text-white text-[13px] font-medium hover:bg-ink/90 transition-colors"
            >
              {copied ? "Copiado" : "Copiar credenciales"}
            </button>
            <button
              onClick={onOpen}
              className="h-11 px-4 rounded-btn border border-line text-[13px] font-medium text-ink hover:bg-bg transition-colors"
            >
              Abrir tablero
            </button>
            <button
              onClick={onClose}
              className="h-11 px-4 rounded-btn text-[13px] font-medium text-muted hover:text-ink transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[12px] font-medium text-ink mb-2">
      {children}
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full h-11 px-3 rounded-btn border border-line bg-surface text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
      />
      {hint && <p className="text-[12px] text-muted mt-1.5">{hint}</p>}
    </div>
  );
}

function BrandOption({
  active,
  onClick,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-btn border text-[13px] font-medium text-left px-3 flex items-center gap-2 transition-colors ${
        active
          ? "border-ink bg-surface text-ink"
          : "border-line bg-surface text-muted hover:text-ink"
      }`}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: accent }}
      />
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] uppercase tracking-label font-medium text-muted">
        {label}
      </span>
      <span
        className={`text-[14px] text-ink ${
          mono ? "font-mono tabular-nums" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
