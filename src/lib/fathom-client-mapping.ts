// Mapeo de aliases que aparecen en titles de emails Fathom → clientId interno.
//
// Fathom usa el nombre de la reunión (típicamente con el cliente) como subject.
// Ej: "Reunión consultoría Dentilandia 02/05" → matchea "Dentilandia" → client-dentilandia.
//
// "Longest match wins" para evitar falsos positivos: si dos clientes tienen aliases
// que se solapan ("AC" vs "AC Autos"), gana el más largo.
//
// Lativo NO se incluye: es estructuración de proyectos, no consultoría recurrente,
// no se procesan minutas vía este flujo.

export const FATHOM_CLIENT_ALIASES: Record<string, string[]> = {
  "client-cygnuss": ["cygnuss", "Cygnuss", "CYGNUSS"],
  "client-acautos": ["AC Autos", "ac autos", "AcAutos", "Mateo Mejía", "Mateo Mejia"],
  "client-dentilandia": ["Dentilandia", "dentilandia", "Clara Villa", "Lina Mesa"],
  "client-paulina": ["Paulina Calle", "Paulina", "paulina"],
};

/**
 * Devuelve el clientId que matchea el subject del email Fathom, o null si ninguno.
 * Match case-insensitive. Si varios aliases matchean, gana el más largo (más específico).
 */
export function getClientFromSubject(subject: string): string | null {
  const lower = subject.toLowerCase();
  let bestClient: string | null = null;
  let bestLen = 0;
  for (const [clientId, aliases] of Object.entries(FATHOM_CLIENT_ALIASES)) {
    for (const alias of aliases) {
      if (lower.includes(alias.toLowerCase()) && alias.length > bestLen) {
        bestClient = clientId;
        bestLen = alias.length;
      }
    }
  }
  return bestClient;
}
