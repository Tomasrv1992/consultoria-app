const API_BASE = "/api/tasks";

interface ApiOptions {
  token: string;
  clientId: string;
}

async function safeError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

export async function completeTask(
  taskId: string,
  opts: ApiOptions
): Promise<void> {
  const url = `${API_BASE}/${encodeURIComponent(taskId)}/complete?embedToken=${encodeURIComponent(opts.token)}`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(await safeError(res, "Error completando tarea"));
}

export async function patchTask(
  taskId: string,
  patch: { estado?: string; responsable?: string | null },
  opts: ApiOptions
): Promise<void> {
  const url = `${API_BASE}/${encodeURIComponent(taskId)}?embedToken=${encodeURIComponent(opts.token)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await safeError(res, "Error actualizando tarea"));
}

export async function deleteTask(
  taskId: string,
  opts: ApiOptions
): Promise<void> {
  const url = `${API_BASE}/${encodeURIComponent(taskId)}?embedToken=${encodeURIComponent(opts.token)}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(await safeError(res, "Error borrando tarea"));
}

export async function createTask(
  task: { titulo: string; modulo: string; clientId: string },
  opts: ApiOptions
): Promise<{ id: string }> {
  const url = `${API_BASE}/bulk-create?embedToken=${encodeURIComponent(opts.token)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: task.clientId, tasks: [{ titulo: task.titulo, modulo: task.modulo }] }),
  });
  if (!res.ok) throw new Error(await safeError(res, "Error creando tarea"));
  const data = (await res.json()) as { ids?: string[] };
  return { id: data.ids?.[0] ?? "" };
}

export async function fetchResponsables(opts: ApiOptions): Promise<string[]> {
  const url = `${API_BASE}/responsables?clientId=${encodeURIComponent(opts.clientId)}&embedToken=${encodeURIComponent(opts.token)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { responsables?: string[] };
  return data.responsables || [];
}
