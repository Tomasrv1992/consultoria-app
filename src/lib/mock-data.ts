import {
  Client,
  WorkModule,
  Task,
  Minute,
  MinuteSection,
  UserProfile,
} from "./types";

// Mock users
export const MOCK_USERS: Record<string, UserProfile> = {
  "tomas@estrategiaenaccion.co": {
    id: "user-consultant",
    email: "tomas@estrategiaenaccion.co",
    role: "consultant",
    full_name: "Tomás",
  },
  "contacto@cygnuss.com": {
    id: "user-cygnuss",
    email: "contacto@cygnuss.com",
    role: "client",
    full_name: "CYGNUSS",
    client_id: "client-cygnuss",
  },
  "admin@dentilandia.com": {
    id: "user-dentilandia",
    email: "admin@dentilandia.com",
    role: "client",
    full_name: "Dentilandia",
    client_id: "client-dentilandia",
  },
  "cliente@lativo.co": {
    id: "user-lativo",
    email: "cliente@lativo.co",
    role: "client",
    full_name: "Lativo",
    client_id: "c5",
  },
};

export const MOCK_PASSWORDS: Record<string, string> = {
  "cliente@lativo.co": "lativo2026",
};

export const MOCK_CLIENTS: Client[] = [
  {
    id: "client-cygnuss",
    name: "CYGNUSS",
    industry: "Fitness",
    brand: "estrategia",
    color: "#0D7C5F",
    health: "green",
    contact_name: "Carlos",
    contact_email: "contacto@cygnuss.com",
    created_at: "2024-01-15",
  },
  {
    id: "client-dentilandia",
    name: "Dentilandia",
    industry: "Odontología",
    brand: "sinbata",
    color: "#1B3A5C",
    health: "yellow",
    contact_name: "María",
    contact_email: "admin@dentilandia.com",
    created_at: "2024-02-01",
  },
  {
    id: "client-acautos",
    name: "AC Autos",
    industry: "Autos",
    brand: "estrategia",
    color: "#0D7C5F",
    health: "green",
    contact_name: "Andrés",
    contact_email: "info@acautos.com",
    created_at: "2024-03-10",
  },
  {
    id: "client-paulina",
    name: "Paulina Zarrabe",
    industry: "Odontología",
    brand: "sinbata",
    color: "#1B3A5C",
    health: "red",
    contact_name: "Paulina",
    contact_email: "paulina@zarrabe.com",
    created_at: "2024-04-01",
  },
  {
    id: "c5",
    name: "Lativo",
    industry: "Consultoría de Marca",
    brand: "estrategia",
    color: "#14B8A6",
    health: "green",
    contact_name: "Lativo",
    contact_email: "cliente@lativo.co",
    created_at: "2026-04-13",
    proxima_reunion: "2026-04-15",
  },
];

export const MOCK_MODULES: WorkModule[] = [
  // CYGNUSS modules
  { id: "mod-cyg-1", client_id: "client-cygnuss", category: "ingresos", name: "Estrategia de precios", order: 1 },
  { id: "mod-cyg-2", client_id: "client-cygnuss", category: "gestion", name: "Procesos internos", order: 2 },
  { id: "mod-cyg-3", client_id: "client-cygnuss", category: "operaciones", name: "Operación diaria", order: 3 },
  { id: "mod-cyg-4", client_id: "client-cygnuss", category: "mercadeo", name: "Marketing digital", order: 4 },
  // Dentilandia modules
  { id: "mod-dent-1", client_id: "client-dentilandia", category: "ingresos", name: "Captación de pacientes", order: 1 },
  { id: "mod-dent-2", client_id: "client-dentilandia", category: "gestion", name: "Gestión de equipo", order: 2 },
  { id: "mod-dent-3", client_id: "client-dentilandia", category: "operaciones", name: "Flujo clínico", order: 3 },
  { id: "mod-dent-4", client_id: "client-dentilandia", category: "mercadeo", name: "Presencia digital", order: 4 },
  // AC Autos
  { id: "mod-ac-1", client_id: "client-acautos", category: "ingresos", name: "Ventas y cotizaciones", order: 1 },
  { id: "mod-ac-2", client_id: "client-acautos", category: "gestion", name: "Admin y finanzas", order: 2 },
  { id: "mod-ac-3", client_id: "client-acautos", category: "operaciones", name: "Taller y servicio", order: 3 },
  { id: "mod-ac-4", client_id: "client-acautos", category: "mercadeo", name: "Publicidad local", order: 4 },
  // Paulina
  { id: "mod-pau-1", client_id: "client-paulina", category: "ingresos", name: "Paquetes de tratamiento", order: 1 },
  { id: "mod-pau-2", client_id: "client-paulina", category: "gestion", name: "Agenda y personal", order: 2 },
  { id: "mod-pau-3", client_id: "client-paulina", category: "operaciones", name: "Protocolos clínicos", order: 3 },
  { id: "mod-pau-4", client_id: "client-paulina", category: "mercadeo", name: "Redes sociales", order: 4 },
];

export const MOCK_TASKS: Task[] = [
  // CYGNUSS - Ingresos
  { id: "t1", module_id: "mod-cyg-1", client_id: "client-cygnuss", title: "Definir estructura de precios por servicio", completed: true, completed_at: "2024-06-01", order: 1 },
  { id: "t2", module_id: "mod-cyg-1", client_id: "client-cygnuss", title: "Crear tabla comparativa vs competencia", completed: true, completed_at: "2024-06-05", order: 2 },
  { id: "t3", module_id: "mod-cyg-1", client_id: "client-cygnuss", title: "Implementar precios en sistema de cobro", completed: false, order: 3 },
  // CYGNUSS - Gestión
  { id: "t4", module_id: "mod-cyg-2", client_id: "client-cygnuss", title: "Documentar procesos clave del negocio", completed: true, completed_at: "2024-05-20", order: 1 },
  { id: "t5", module_id: "mod-cyg-2", client_id: "client-cygnuss", title: "Crear organigrama funcional", completed: false, order: 2 },
  { id: "t6", module_id: "mod-cyg-2", client_id: "client-cygnuss", title: "Definir KPIs por área", completed: false, order: 3 },
  // CYGNUSS - Operaciones
  { id: "t7", module_id: "mod-cyg-3", client_id: "client-cygnuss", title: "Mapear flujo de atención al cliente", completed: true, completed_at: "2024-06-10", order: 1 },
  { id: "t8", module_id: "mod-cyg-3", client_id: "client-cygnuss", title: "Estandarizar checklist de apertura/cierre", completed: true, completed_at: "2024-06-12", order: 2 },
  { id: "t9", module_id: "mod-cyg-3", client_id: "client-cygnuss", title: "Capacitar equipo en nuevo protocolo", completed: false, order: 3 },
  // CYGNUSS - Mercadeo
  { id: "t10", module_id: "mod-cyg-4", client_id: "client-cygnuss", title: "Definir buyer persona", completed: true, completed_at: "2024-05-15", order: 1 },
  { id: "t11", module_id: "mod-cyg-4", client_id: "client-cygnuss", title: "Crear calendario de contenido mensual", completed: false, order: 2 },
  { id: "t12", module_id: "mod-cyg-4", client_id: "client-cygnuss", title: "Configurar campañas Meta Ads", completed: false, order: 3 },

  // Dentilandia - Ingresos
  { id: "t13", module_id: "mod-dent-1", client_id: "client-dentilandia", title: "Analizar servicios más rentables", completed: true, completed_at: "2024-06-01", order: 1 },
  { id: "t14", module_id: "mod-dent-1", client_id: "client-dentilandia", title: "Crear paquetes de tratamiento", completed: false, order: 2 },
  { id: "t15", module_id: "mod-dent-1", client_id: "client-dentilandia", title: "Implementar sistema de referidos", completed: false, order: 3 },
  // Dentilandia - Gestión
  { id: "t16", module_id: "mod-dent-2", client_id: "client-dentilandia", title: "Evaluar desempeño del equipo", completed: false, order: 1 },
  { id: "t17", module_id: "mod-dent-2", client_id: "client-dentilandia", title: "Definir roles y responsabilidades", completed: true, completed_at: "2024-05-25", order: 2 },
  { id: "t18", module_id: "mod-dent-2", client_id: "client-dentilandia", title: "Crear manual de onboarding", completed: false, order: 3 },
  // Dentilandia - Operaciones
  { id: "t19", module_id: "mod-dent-3", client_id: "client-dentilandia", title: "Optimizar flujo de citas", completed: true, completed_at: "2024-06-08", order: 1 },
  { id: "t20", module_id: "mod-dent-3", client_id: "client-dentilandia", title: "Reducir tiempos de espera", completed: false, order: 2 },
  // Dentilandia - Mercadeo
  { id: "t21", module_id: "mod-dent-4", client_id: "client-dentilandia", title: "Rediseñar perfil de Google Business", completed: true, completed_at: "2024-05-30", order: 1 },
  { id: "t22", module_id: "mod-dent-4", client_id: "client-dentilandia", title: "Crear estrategia de reseñas", completed: false, order: 2 },

  // AC Autos
  { id: "t23", module_id: "mod-ac-1", client_id: "client-acautos", title: "Estandarizar proceso de cotización", completed: true, completed_at: "2024-06-01", order: 1 },
  { id: "t24", module_id: "mod-ac-1", client_id: "client-acautos", title: "Crear seguimiento post-venta", completed: true, completed_at: "2024-06-10", order: 2 },
  { id: "t25", module_id: "mod-ac-2", client_id: "client-acautos", title: "Implementar control de gastos", completed: false, order: 1 },
  { id: "t26", module_id: "mod-ac-3", client_id: "client-acautos", title: "Crear checklist de entrega de vehículo", completed: true, completed_at: "2024-06-05", order: 1 },
  { id: "t27", module_id: "mod-ac-4", client_id: "client-acautos", title: "Lanzar campaña de temporada", completed: false, order: 1 },

  // Paulina
  { id: "t28", module_id: "mod-pau-1", client_id: "client-paulina", title: "Definir paquetes estrella", completed: false, order: 1 },
  { id: "t29", module_id: "mod-pau-2", client_id: "client-paulina", title: "Reorganizar agenda semanal", completed: false, order: 1 },
  { id: "t30", module_id: "mod-pau-3", client_id: "client-paulina", title: "Documentar protocolo de higiene", completed: true, completed_at: "2024-06-01", order: 1 },
  { id: "t31", module_id: "mod-pau-4", client_id: "client-paulina", title: "Planificar contenido de Instagram", completed: false, order: 1 },
];

// Placeholders de estructura para la UI. El contenido real de las minutas
// debe venir de Supabase (ver plan: Tier 1-C) — no poner aquí nombres de
// terceros, cifras, decisiones legales/tributarias u otra información
// confidencial de los clientes.
const MOCK_MINUTE_SECTIONS: MinuteSection[] = [
  {
    id: "ms1",
    minute_id: "min-cyg-2",
    title: "Resumen ejecutivo",
    content: "(Placeholder) Resumen de la reunión disponible en Supabase una vez migrado.",
    order: 1,
  },
  {
    id: "ms2",
    minute_id: "min-cyg-2",
    title: "Decisiones",
    content: "(Placeholder) Decisiones clave disponibles en Supabase.",
    order: 2,
  },
  {
    id: "ms3",
    minute_id: "min-cyg-2",
    title: "Tareas generadas",
    content: "(Placeholder) Ver tab Plan para las tareas activas del cliente.",
    order: 3,
  },
  {
    id: "ms4",
    minute_id: "min-cyg-1",
    title: "Resumen ejecutivo",
    content: "(Placeholder) Resumen de la reunión disponible en Supabase una vez migrado.",
    order: 1,
  },
  {
    id: "ms5",
    minute_id: "min-cyg-1",
    title: "Decisiones",
    content: "(Placeholder) Decisiones clave disponibles en Supabase.",
    order: 2,
  },
  {
    id: "ms6",
    minute_id: "min-cyg-1",
    title: "Alertas",
    content: "(Placeholder) Alertas disponibles en Supabase.",
    order: 3,
  },
  {
    id: "ms7",
    minute_id: "min-dent-1",
    title: "Resumen ejecutivo",
    content: "(Placeholder) Resumen de la reunión disponible en Supabase una vez migrado.",
    order: 1,
  },
  {
    id: "ms8",
    minute_id: "min-dent-1",
    title: "Decisiones",
    content: "(Placeholder) Decisiones clave disponibles en Supabase.",
    order: 2,
  },
  {
    id: "ms9",
    minute_id: "min-dent-1",
    title: "Alertas",
    content: "(Placeholder) Alertas disponibles en Supabase.",
    order: 3,
  },
  {
    id: "ms10",
    minute_id: "min-dent-1",
    title: "Próxima reunión",
    content: "(Placeholder) Fecha y agenda disponibles en Supabase.",
    order: 4,
  },
];

// Placeholders de minutas. El contenido real debe venir de Supabase.
// No incluir aquí nombres de terceros (abogados, contadores, empleados del
// cliente) ni detalles confidenciales de la reunión.
export const MOCK_MINUTES: Minute[] = [
  {
    id: "min-cyg-2",
    client_id: "client-cygnuss",
    date: "2026-04-10",
    title: "Reunión de estrategia",
    attendees: ["Equipo EA"],
    sections: MOCK_MINUTE_SECTIONS.filter((s) => s.minute_id === "min-cyg-2"),
    created_at: "2026-04-10",
  },
  {
    id: "min-cyg-1",
    client_id: "client-cygnuss",
    date: "2026-04-09",
    title: "Reunión de contenido",
    attendees: ["Equipo EA"],
    sections: MOCK_MINUTE_SECTIONS.filter((s) => s.minute_id === "min-cyg-1"),
    created_at: "2026-04-09",
  },
  {
    id: "min-dent-1",
    client_id: "client-dentilandia",
    date: "2026-04-08",
    title: "Comité Trimestral",
    attendees: ["Equipo EA"],
    sections: MOCK_MINUTE_SECTIONS.filter((s) => s.minute_id === "min-dent-1"),
    created_at: "2026-04-08",
  },
];

// Helper functions
export function getClientTasks(clientId: string): Task[] {
  return MOCK_TASKS.filter((t) => t.client_id === clientId);
}

export function getClientModules(clientId: string): WorkModule[] {
  return MOCK_MODULES.filter((m) => m.client_id === clientId);
}

export function getClientMinutes(clientId: string): Minute[] {
  return MOCK_MINUTES.filter((m) => m.client_id === clientId);
}

export function getModuleTasks(moduleId: string): Task[] {
  return MOCK_TASKS.filter((t) => t.module_id === moduleId);
}
