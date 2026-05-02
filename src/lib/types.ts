export type UserRole = "consultant" | "client";

export type Brand = "estrategia" | "sinbata";

export type HealthStatus = "green" | "yellow" | "red";

export type ModuleCategory = "ingresos" | "gestion" | "operaciones" | "mercadeo";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  client_id?: string;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  brand: Brand;
  color: string;
  health: HealthStatus;
  logo_url?: string;
  contact_name: string;
  contact_email: string;
  created_at: string;
  proxima_reunion?: string;
  description?: string;
}

export interface WorkModule {
  id: string;
  client_id: string;
  category: ModuleCategory;
  name: string;
  order: number;
}

export interface Task {
  id: string;
  module_id: string;
  client_id: string;
  title: string;
  description?: string;
  completed: boolean;
  due_date?: string;
  completed_at?: string;
  completed_by?: string;
  order: number;
}

export interface Minute {
  id: string;
  client_id: string;
  date: string;
  title: string;
  attendees: string[];
  sections: MinuteSection[];
  created_at: string;
}

export interface MinuteSection {
  id: string;
  minute_id: string;
  title: string;
  content: string;
  order: number;
}

export interface Meeting {
  id: string;
  client_id: string;
  fecha_reunion: string;          // ISO date "YYYY-MM-DD"
  duracion_min: number | null;
  asistentes: string[];
  transcript_raw: string;
  minuta_md: string;

  tareas_creadas_ids: string[];
  tareas_completadas_ids: string[];
  tareas_actualizadas_ids: string[];

  pending_miro_sync: boolean;
  miro_doc_id: string | null;
  miro_synced_at: string | null;  // ISO timestamp

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressByModule {
  category: ModuleCategory;
  label: string;
  total: number;
  completed: number;
  percentage: number;
}

export const MODULE_LABELS: Record<ModuleCategory, string> = {
  ingresos: "Ingresos",
  gestion: "Gestión Interna",
  operaciones: "Operaciones",
  mercadeo: "Mercadeo",
};

export const MODULE_ICONS: Record<ModuleCategory, string> = {
  ingresos: "DollarSign",
  gestion: "Settings",
  operaciones: "Cog",
  mercadeo: "Megaphone",
};

export const BRAND_CONFIG: Record<Brand, { name: string; color: string }> = {
  estrategia: { name: "Estrategia en Acción", color: "#0D7C5F" },
  sinbata: { name: "Sin Bata", color: "#1B3A5C" },
};

export interface MiroTask {
  id?: string;
  titulo: string;
  modulo: string;
  responsable: string;
  prioridad: string;
  fecha: string;
  estado: string;
  fechaIngreso?: string;
  rowId?: string;
  completedAt?: string;
  completedBy?: string;
}
