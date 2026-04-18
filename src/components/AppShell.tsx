"use client";

import { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  key: string;
  label: string;
  onClick: () => void;
  active: boolean;
}

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Secondary tabs shown under the topbar (desktop) and as bottom-nav on mobile */
  tabs?: NavItem[];
  /** Back button (mobile only by default) */
  onBack?: () => void;
  children: ReactNode;
}

export function AppShell({
  title,
  subtitle,
  actions,
  tabs,
  onBack,
  children,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  const sidebarItems: { key: string; label: string; href: string }[] =
    profile?.role === "consultant"
      ? [
          { key: "clientes", label: "Clientes", href: "/dashboard" },
        ]
      : [];

  return (
    <div className="min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 bg-sidebar flex-col z-30">
        <div className="px-5 py-5">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded bg-teal">
            <span className="font-brand text-white text-sm leading-none">EA</span>
          </div>
        </div>

        <nav className="flex-1 px-2">
          {sidebarItems.map((item) => {
            const active = pathname === item.href;
            return (
              <button
                key={item.key}
                onClick={() => router.push(item.href)}
                className={`w-full text-left pl-4 pr-3 py-2 text-[13px] border-l-2 transition-colors ${
                  active
                    ? "text-white border-teal"
                    : "text-[#9CA3AF] border-transparent hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/5">
          <div className="text-[11px] text-[#6B7280] mb-1">
            {profile?.full_name}
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
            className="text-[13px] text-[#9CA3AF] hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="md:pl-56">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-surface border-b border-line h-[52px] flex items-center">
          <div className="flex items-center gap-3 px-4 md:px-6 w-full">
            {onBack && (
              <button
                onClick={onBack}
                className="md:hidden -ml-1 w-9 h-9 flex items-center justify-center text-ink"
                aria-label="Volver"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-[15px] font-medium text-ink truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[12px] text-muted truncate leading-tight">
                  {subtitle}
                </p>
              )}
            </div>
            {actions}
          </div>
        </header>

        {/* Desktop secondary tabs */}
        {tabs && tabs.length > 0 && (
          <div className="hidden md:block bg-surface border-b border-line">
            <div className="px-6 flex gap-6 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={t.onClick}
                  className={`py-3 text-[13px] border-b-2 -mb-px whitespace-nowrap transition-colors ${
                    t.active
                      ? "border-teal text-ink font-medium"
                      : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <main className="px-4 md:px-6 py-5 md:py-6 pb-28 md:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav (only when tabs provided) */}
      {tabs && tabs.length > 0 && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-line z-30">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(tabs.length, 4)}, minmax(0, 1fr))` }}>
            {tabs.slice(0, 4).map((t) => (
              <button
                key={t.key}
                onClick={t.onClick}
                className={`min-h-[56px] py-2 px-1 text-[12px] transition-colors ${
                  t.active ? "text-teal font-medium" : "text-muted"
                }`}
                style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
