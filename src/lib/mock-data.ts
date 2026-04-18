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

export const MOCK_MINUTE_SECTIONS: MinuteSection[] = [
  // CYGNUSS — 10 Abril 2026 — Estructura Legal Nueva Sede
  { id: "ms1", minute_id: "min-cyg-2", title: "Resumen ejecutivo", content: "Reunión con Marcela Puerta (abogada) para definir la estructura legal de la inversión en la nueva sede. Se recomienda el Contrato de Cuentas en Participación (CdeP) como vehículo jurídico. CYGNUSS mantiene control operativo total, el inversionista aporta capital a cambio de participación en utilidades. Antes de avanzar, Juan Esteban debe confirmar que el contador puede manejar los requisitos contables y tributarios del CdeP.", order: 1 },
  { id: "ms2", minute_id: "min-cyg-2", title: "Decisiones y estructura recomendada", content: "Estructura legal: Contrato de Cuentas en Participación (CdeP)\n- CYGNUSS mantiene el 100% del control operativo — el inversionista no puede interferir\n- El inversionista es \"socio oculto\" — aporta capital a cambio de % de utilidades\n- No es un préstamo — la inversión está sujeta al éxito del negocio\n- Puede convertirse a capital (acciones SAS) si la alianza es exitosa\n\nManagement Fee: variable, punto de partida sugerido 10% de ingresos\nDistribución: Utilidad neta = Ingresos − Costos directos − Costos compartidos − Management Fee\nPlazo inicial recomendado: 3 años", order: 2 },
  { id: "ms3", minute_id: "min-cyg-2", title: "Tareas generadas", content: "- Marcela — Enviar plantilla de cálculo de utilidades + puntos clave para redacción del contrato\n- Marcela — Enviar propuesta de honorarios fijos para redacción CdeP + 1-2 revisiones\n- Juan Esteban — Confirmar con Carlos (contador) si puede manejar contabilidad y tributación del CdeP\n- Juan Esteban y Paulina — Definir términos centrales: plazo, porcentajes, frecuencia de auditoría\n- Juan Esteban y Paulina — Decidir % del Management Fee\n- Tomás — Consultar con Carlos sobre contabilidad/tributación del CdeP y confirmar con Marcela", order: 3 },
  // CYGNUSS — 09 Abril 2026 — Estrategia de Contenido
  { id: "ms4", minute_id: "min-cyg-1", title: "Resumen ejecutivo", content: "Reunión enfocada en analizar el rendimiento actual de redes sociales y definir una nueva estrategia de contenido para Instagram y TikTok. Se usó Claude AI para auditar el plan de contenido actual y generar la nueva estrategia. Se identificaron brechas críticas en el plan de abril/mayo y se definieron acciones inmediatas.", order: 1 },
  { id: "ms5", minute_id: "min-cyg-1", title: "Decisiones tomadas", content: "- Instagram como canal principal — 3 publicaciones por semana\n- TikTok como canal de visibilidad — arranca a mediados de mayo de cara a apertura nueva sede junio/julio\n- Pauli tiene autonomía total sobre creación de contenido\n- Claude AI como herramienta de trabajo — planificación, guiones y análisis de rendimiento\n- CapCut para edición de video\n- Mezcla de contenido: Viernes nicho (embarazadas, lesionados), Jueves emocional (testimonios), Quincenal humor", order: 2 },
  { id: "ms6", minute_id: "min-cyg-1", title: "Alertas", content: "- 4 publicaciones sin grabar con vencimiento en 20 días — riesgo operativo alto\n- Alineación del plan actual: 6/10 — cero testimonios, cero carruseles educativos\n- Validar con Rubén si la pauta Meta incluye Facebook o es solo Instagram\n- Alta dependencia de proveedor externo para cumplir estrategia — tener autonomía", order: 3 },
  // Dentilandia — 08 Abril 2026 — Comité Trimestral
  { id: "ms7", minute_id: "min-dent-1", title: "Resumen ejecutivo", content: "Comité trimestral de revisión estratégica y operativa. 3 sesiones — aprox. 3 horas. Participantes: Jorge, Clara Villa, Lina Ruiz, Tomás Ramírez. Se revisó desempeño financiero T1 (22% de meta vs 25% objetivo), se aprobó uso de IA para automatizar tareas, nueva política de frenectomías, incentivo por referidos con clínicas aliadas, y se detectaron problemas críticos en horas extra y agencia de marketing.", order: 1 },
  { id: "ms8", minute_id: "min-dent-1", title: "Decisiones tomadas", content: "- Política de frenectomías — Odontopediatras solo realizan linguales. Labiales se remiten a periodoncista.\n- Incentivo por referidos — Bono no salarial pagado por clínica receptora al personal de Dentilandia\n- Suscripción Cloud premium — Aprobada a USD $17/mes\n- Estudio riesgo psicosocial y clima — Aprobado por 1.5 SMMLV (~2.6M COP)\n- Auditorías clínicas — Mensuales, 1 por sede, desde abril\n- Nueva agencia de marketing — Aprobada búsqueda nuevo proveedor\n- Rotación de auxiliares — Aprobada entre doctoras y sedes\n- Monitoreo cámaras con audio — Aprobado aleatoriamente", order: 2 },
  { id: "ms9", minute_id: "min-dent-1", title: "Alertas", content: "- ALERTA ALTA — Ingresos T1 en 22% de meta (objetivo 25%). Enero fue el mes más bajo.\n- ALERTA ALTA — Horas extra insostenibles. Requiere solución antes de próximo comité.\n- ALERTA ALTA — Agencia UCAO con bajo desempeño desde enero. Reemplazo en curso.\n- ALERTA MEDIA — Doctoras Carolina Gómez y Estefanía Mesa cerraron agenda 6 meses. Probable competidor (Viena).\n- ALERTA MEDIA — Doctor en revisión por errores procedimentales. Auditoría sin aviso programada.", order: 3 },
  { id: "ms10", minute_id: "min-dent-1", title: "Próxima reunión", content: "- 22 de abril — Revisión declaración de impuestos con Carlos\n- 15 de mayo — Comité\n- Temas a preparar: Propuesta incentivo referidos (Lina y Clara) / Análisis horas extra (Jorge) / Resultados encuesta satisfacción (Jorge) / Estrategia marketing completa (Jorge)", order: 4 },
];

export const MOCK_MINUTES: Minute[] = [
  {
    id: "min-cyg-2",
    client_id: "client-cygnuss",
    date: "2026-04-10",
    title: "Estructura Legal Nueva Sede",
    attendees: ["Juan Esteban", "Paulina", "Tomás", "Marcela Puerta"],
    sections: MOCK_MINUTE_SECTIONS.filter((s) => s.minute_id === "min-cyg-2"),
    created_at: "2026-04-10",
  },
  {
    id: "min-cyg-1",
    client_id: "client-cygnuss",
    date: "2026-04-09",
    title: "Estrategia de Contenido",
    attendees: ["Paulina", "Tomás"],
    sections: MOCK_MINUTE_SECTIONS.filter((s) => s.minute_id === "min-cyg-1"),
    created_at: "2026-04-09",
  },
  {
    id: "min-dent-1",
    client_id: "client-dentilandia",
    date: "2026-04-08",
    title: "Comité Trimestral",
    attendees: ["Jorge", "Clara Villa", "Lina Ruiz", "Tomás"],
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
