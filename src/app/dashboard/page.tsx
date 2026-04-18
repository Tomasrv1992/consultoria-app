"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import { ClientCard } from "@/components/ClientCard";
import { AppShell } from "@/components/AppShell";
import { computeClientHealth } from "@/lib/client-health";
import {
  getCachedMiroSnapshot,
  setCachedMiroSnapshot,
  MiroSnapshot,
} from "@/lib/miro-cache";
import { miroTotals } from "@/lib/miro-progress";
import { EMPTY_HISTORICAL } from "@/lib/miro-historico";
import { MIRO_BOARDS } from "@/lib/clients-config";

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { clients, getClientTasks } = useData();
  const router = useRouter();
  const [miroByClient, setMiroByClient] = useState<
    Record<string, MiroSnapshot>
  >({});

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const isConsultant = profile?.role === "consultant";
  const visibleClients = useMemo(
    () =>
      isConsultant ? clients : clients.filter((c) => c.id === profile?.client_id),
    [isConsultant, clients, profile?.client_id]
  );

  useEffect(() => {
    if (!user || visibleClients.length === 0) return;
    const ids = visibleClients.filter((c) => MIRO_BOARDS[c.id]).map((c) => c.id);
    if (ids.length === 0) return;

    const cachedAll: Record<string, MiroSnapshot> = {};
    const toFetch: string[] = [];
    for (const id of ids) {
      const hit = getCachedMiroSnapshot(id);
      if (hit) cachedAll[id] = hit;
      else toFetch.push(id);
    }
    if (Object.keys(cachedAll).length > 0) {
      setMiroByClient((prev) => ({ ...prev, ...cachedAll }));
    }
    if (toFetch.length === 0) return;

    let cancelled = false;
    Promise.all(
      toFetch.map(async (id) => {
        try {
          const res = await fetch(`/api/tasks?clientId=${id}`);
          if (!res.ok)
            return [
              id,
              { tasks: [], historical: EMPTY_HISTORICAL } as MiroSnapshot,
            ] as const;
          const data = await res.json();
          const snapshot: MiroSnapshot = {
            tasks: data.tasks || [],
            historical: data.historical || EMPTY_HISTORICAL,
          };
          setCachedMiroSnapshot(id, snapshot);
          return [id, snapshot] as const;
        } catch {
          return [
            id,
            { tasks: [], historical: EMPTY_HISTORICAL } as MiroSnapshot,
          ] as const;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const patch: Record<string, MiroSnapshot> = {};
      for (const [id, snap] of results) patch[id] = snap;
      setMiroByClient((prev) => ({ ...prev, ...patch }));
    });

    return () => {
      cancelled = true;
    };
  }, [user, visibleClients]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-line border-t-ink rounded-full animate-spin" />
      </div>
    );
  }

  if (!isConsultant && profile?.client_id) {
    router.replace(`/client/${profile.client_id}`);
    return null;
  }

  const perClientTotals = visibleClients.map((c) => {
    const snap = miroByClient[c.id];
    return {
      id: c.id,
      totals: snap ? miroTotals(snap.tasks, snap.historical) : null,
    };
  });

  const totals = perClientTotals.reduce(
    (acc, p) => {
      if (!p.totals) return acc;
      acc.total += p.totals.total;
      acc.completed += p.totals.completed;
      return acc;
    },
    { total: 0, completed: 0 }
  );
  const allLoaded = perClientTotals.every((p) => p.totals !== null);
  const overallPct =
    totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;

  return (
    <AppShell
      title="Clientes"
      subtitle={
        allLoaded
          ? `${visibleClients.length} activos · ${overallPct}% avance global`
          : `${visibleClients.length} activos · cargando avance…`
      }
      actions={
        isConsultant ? (
          <button
            onClick={() => router.push("/dashboard/new-client")}
            className="h-9 px-3 rounded-btn bg-ink text-white text-[13px] font-medium hover:bg-ink/90 transition-colors"
          >
            + Nuevo cliente
          </button>
        ) : null
      }
    >
      <div className="max-w-5xl space-y-6">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <StatCard label="Clientes" value={visibleClients.length.toString()} />
          <StatCard
            label="Completadas"
            value={allLoaded ? totals.completed.toString() : "—"}
          />
          <StatCard
            label="Pendientes"
            value={
              allLoaded ? (totals.total - totals.completed).toString() : "—"
            }
          />
        </div>

        {/* Client grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {perClientTotals.map(({ id, totals: clientTotals }) => {
            const client = visibleClients.find((c) => c.id === id)!;
            return (
              <ClientCard
                key={client.id}
                client={client}
                progress={clientTotals}
                health={
                  computeClientHealth(client.id, getClientTasks(client.id))
                    .status
                }
                onClick={() => router.push(`/client/${client.id}`)}
              />
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-line shadow-card rounded-card p-4 md:p-5">
      <div className="text-[11px] uppercase tracking-label text-muted font-medium">
        {label}
      </div>
      <div className="text-[28px] font-semibold text-ink tabular-nums leading-none mt-2">
        {value}
      </div>
    </div>
  );
}
