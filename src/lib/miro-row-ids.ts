// Title -> rowId maps per client board, captured from Miro MCP table_list_rows.
// Used by parseRows in miro-data.ts to attach a stable rowId to each MiroTask
// so /api/miro/complete can PATCH the exact row.
//
// Last refreshed (CYGNUSS): 2026-04-16

export const ROW_IDS: Record<string, Record<string, string>> = {
  "client-cygnuss": {
    "Descargar app Claude y revisar tutoriales":
      "99a03056-257f-4c7e-88a0-faaaf6e7b00b",
    "Ideas de comunidad — actividades extracurriculares, webinars, beneficios":
      "40cba36b-8bd5-4640-a411-04b9acc02ef9",
    "Crear auditorías de puesto de recepción":
      "ff856608-4fe3-414c-824a-b265080f5217",
    "Crear carrusel educativo — urgente, vence en 20 días":
      "17045b3d-657c-4f26-896c-3f9a36867d39",
    "Renovaciones automáticas — código único Bancolombia, validar sistema":
      "8a96e59c-101d-4405-9cf1-9bd9f4131fea",
    "Publicar reel aniversario acortado 15 seg — editar con CapCut":
      "8f815ae5-efa1-4530-be5f-5667f24570aa",
    "Encuesta en búsqueda del diferencial":
      "91313822-2be6-44f6-8d69-c6e3b409a029",
    "Revisión PYG — gastos operación, empleados a precio mercado, gastos compartidos":
      "af02ccbe-5add-4f88-a5ef-544044ca32d0",
    "Revisar sesiones Converto y aplicar feedback":
      "792d32e1-22c3-42ab-a32f-c147e598b3ed",
    "Importación China Reformers — nacionalización, legalización factura":
      "2c77f706-cf71-4adb-8654-c47c7c09129b",
    "Nueva sede — comenzar a buscar personal":
      "6259ec87-ae9d-461d-9d2b-ac5a0bf440bc",
    "Clases por fuera del estudio — estructura de costos, paquetes, criterios":
      "bc04a770-2dd4-4356-bfe0-09820a51b55c",
    "Nueva sede — EVO: validar cómo se crea la otra sede en el software":
      "c82debc2-7469-4da8-be37-a1b9aa9fb948",
    "Reformar contratos arrendamiento y prestación de servicios instructoras — firmar":
      "06368b73-0e9e-446d-90db-d623f28d2acf",
    "Mejorar copies publicaciones existentes plan abril/mayo":
      "c2d3baa4-044d-4117-963c-0c896925814a",
    "Estrategia facturación horas valle — tarifa diferencial mañana, convenios":
      "c0ee6cfa-218e-4d46-bc0c-cdcbacd2c1b7",
    "Crear piezas gráficas feed y stories — 3-4 publicaciones/semana L/M/J/V":
      "9c4e8210-4c5d-439d-aa9b-df727630d25a",
    "Nueva sede — contrato, arquitecta, reforma exterior, meses de gracia":
      "9d0b17af-610b-49da-b496-2643acc5ba8c",
    "Responder comentarios recientes Instagram":
      "a7721624-f24a-4e0c-8317-1a1dd632aad4",
    "Lanzamiento nueva sede — prelanzamiento, mercadeo tradicional y digital":
      "84036682-fc7c-4e71-8975-4b09aec96cd2",
    "Contabilidad — PYG, tiempos entrega, centro de costos nueva sede":
      "5d4af48b-4e28-4f94-a0a2-e8905d0d22f7",
    "Manual áreas, procesos y funciones de socios CYGNUSS":
      "2fe16ea8-35b8-47b6-aa11-35588e90d0b3",
    "Listado de pendientes por comunicar en redes y propuestas de contenido nuevo":
      "71e4eae2-ab6c-45a6-9462-78ef0a4855e3",
    "Habilitación bomberos — SST, señalización sede con branding CYGNUSS":
      "9d813023-f411-4f5d-ac4f-14821acb892e",
    "Reto Glow Up — seguimiento, planilla, retroalimentación, aprendizajes":
      "f0d2f47d-3b9c-4ca2-96ba-5cd301509617",
    "Crear estrategia digital de mercadeo por red — Canva, Capcut, tipografías":
      "7fa249bb-212e-4812-8374-b20ad2b2dbbc",
    "Enviar a Tomás referentes visuales de Instagram":
      "98364337-4f5a-43aa-870e-90d7139124e7",
    "Importación China equipos menores — mat, colchonetas, contacto proveedor":
      "a5825e0a-4973-45d0-a563-7c97450f5e34",
    "Excel costos e inversión nueva sede — carpeta PDF con facturas":
      "40875921-b48a-4ab0-bd21-1deed67a65d2",
    "Pauta digital TikTok Ads — validar con Rubén para crear cuenta":
      "86a5e2ab-c5ef-4acb-95c3-9f9b9056bef8",
    "Estudio de mercado competidores — instructoras y conocidos":
      "6dfd92d8-c23c-48a3-8ff3-54a15d449db4",
    "Validar con Rubén si pauta Meta incluye Facebook o es solo Instagram":
      "02323402-aa29-4587-834f-bc8335c6c868",
    "Nicho lesiones — editar y lanzar pauta Meta":
      "bb0883ae-6c7a-4757-94e0-090d1b0f3933",
    "Estandarizar método de contratación instructoras (Alejandra, Laura, Valentina)":
      "ffc33632-ee92-4c98-baee-1b5abcb51fa8",
    "Aprender a producir contenido TikTok (tendencias, bailes, etc.)":
      "9aac72f3-3926-4913-87ff-524ec89ddb4c",
    "Nicho embarazadas — pauta, embudo de conversión, clase especial 11-12":
      "4ef66fdb-02e4-4cd1-bc64-beae0c26bf7e",
    "Crear Reel de testimonio — urgente, vence en 20 días":
      "8302e03f-aff7-45be-878a-2acce1b653c8",
    "Iniciar cursos de capacitación en redes sociales (Converzzo) — empieza 14 abril":
      "284c690b-ae0c-4a5b-b356-df93e14abf13",
    "Estrategia para cerrar más conversiones de contactos que escriben":
      "7b1f16c2-86c9-4fbf-ad54-f9d6ae06cbbf",
    "Reseñas Google Business — protocolo clase prueba, cercanos y plan vigente":
      "bf3ff97b-fcfa-4587-a1f0-0dfd3d5b3519",
  },
};

export function getRowId(
  clientId: string,
  titulo: string
): string | undefined {
  return ROW_IDS[clientId]?.[titulo];
}
