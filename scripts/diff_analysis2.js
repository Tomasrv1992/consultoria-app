// Full diff analysis for all 4 clients
const fs = require('fs');

function norm(s) {
  if (!s) return '';
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function diffClient(name, sbTasksRaw, miroRowsRaw) {
  // Deduplicate Supabase by normalized titulo (first wins)
  const sbMap = new Map();
  for (const t of sbTasksRaw) {
    const key = norm(t.titulo);
    if (!sbMap.has(key)) sbMap.set(key, t);
  }

  // Build miro map by normalized tarea
  const miroMap = new Map();
  for (const r of miroRowsRaw) {
    const key = norm(r.tarea);
    if (!miroMap.has(key)) miroMap.set(key, r);
    // If duplicate miro rows with same title, just use first
  }

  let updates = [], inserts = [], orphans = [];

  // Each Supabase task -> find in Miro
  for (const [key, sb] of sbMap) {
    const miroRow = miroMap.get(key);
    if (miroRow) {
      const changes = [];
      if (norm(miroRow.estado) !== norm(sb.estado)) changes.push({columnTitle:'Estado', value:sb.estado});
      if (norm(miroRow.responsable) !== norm(sb.responsable)) changes.push({columnTitle:'Responsable', value:sb.responsable});
      if (norm(miroRow.prioridad) !== norm(sb.prioridad)) changes.push({columnTitle:'Prioridad', value:sb.prioridad});
      if (norm(miroRow.area) !== norm(sb.modulo)) changes.push({columnTitle:'Área', value:sb.modulo});
      // Only update fecha if sb has a non-empty date AND it differs
      if (sb.fecha && norm(miroRow.fecha) !== norm(sb.fecha)) changes.push({columnTitle:'Fecha límite', value:sb.fecha});
      if (changes.length > 0) updates.push({rowId:miroRow.rowId, tarea:miroRow.tarea, cells:changes});
    } else {
      inserts.push(sb);
    }
  }

  // Each Miro row -> orphan if no match in Supabase
  for (const [key, miroRow] of miroMap) {
    if (!sbMap.has(key)) orphans.push(miroRow);
  }

  console.log('\n=== ' + name + ' ===');
  console.log('Supabase unique:', sbMap.size, '| Miro unique rows:', miroMap.size);
  console.log('Updates:', updates.length, '| Inserts:', inserts.length, '| Orphans:', orphans.length);
  updates.forEach(u => console.log('  UPDATE [' + u.rowId.substring(0,8) + '] ' + u.tarea.substring(0,50) + ' ->', JSON.stringify(u.cells)));
  inserts.forEach(i => console.log('  INSERT:', i.titulo.substring(0,70)));
  orphans.slice(0,5).forEach(o => console.log('  ORPHAN [' + o.rowId.substring(0,8) + '] ' + o.tarea.substring(0,70)));
  if (orphans.length > 5) console.log('  ... and', orphans.length - 5, 'more orphans');

  return {updates, inserts, orphans, sbMap, miroMap};
}

// =============================================
// AC AUTOS
// =============================================
const acSbTasks = [
  {titulo:'Buscar opciones proveedores para digitalización del proceso de venta', modulo:'Operaciones', responsable:'Mateo', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Toma de la ciclovía — evento de running', modulo:'Operaciones', responsable:'Mateo', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Buscar cursos — ticket mínimo 3M, liderazgo empresarial', modulo:'Gestión interna', responsable:'Mateo', prioridad:'Media', fecha:'', estado:'Iniciativa'},
  {titulo:'Digitalización proceso operativo', modulo:'Operaciones', responsable:'Por definir', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Mercadeo — plan de trabajo mensual, plan de cierre, foco, modernizar página web', modulo:'Mercadeo', responsable:'Mateo', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Ingresar venta de cada vehículo al PYG inmediatamente después de cada venta', modulo:'Ingresos', responsable:'Mateo', prioridad:'Alta', fecha:'Permanente', estado:'En curso'},
  {titulo:'Google Business — definir estrategia para captar opiniones', modulo:'Mercadeo', responsable:'Mateo', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Luli gestiona a Camilo', modulo:'Gestión interna', responsable:'Luli', prioridad:'Media', fecha:'', estado:'Iniciativa'},
  {titulo:'Auditoría cajas menores — automático Claude', modulo:'Gestión interna', responsable:'Por definir', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Tablero de seguimiento operativo', modulo:'Gestión interna', responsable:'Mateo', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Lobby para aumentar ventas — importadores, lavaderos, servitecas', modulo:'Mercadeo', responsable:'Mateo', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  // duplicates from double batch - will be deduplicated
  {titulo:'Buscar opciones proveedores para digitalización del proceso de venta', modulo:'Operaciones', responsable:'Mateo', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Toma de la ciclovía — evento de running', modulo:'Operaciones', responsable:'Mateo', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Buscar cursos — ticket mínimo 3M, liderazgo empresarial', modulo:'Gestión interna', responsable:'Mateo', prioridad:'Media', fecha:'', estado:'Iniciativa'},
  {titulo:'Digitalización proceso operativo', modulo:'Operaciones', responsable:'Por definir', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Mercadeo — plan de trabajo mensual, plan de cierre, foco, modernizar página web', modulo:'Mercadeo', responsable:'Mateo', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Ingresar venta de cada vehículo al PYG inmediatamente después de cada venta', modulo:'Ingresos', responsable:'Mateo', prioridad:'Alta', fecha:'Permanente', estado:'En curso'},
  {titulo:'Google Business — definir estrategia para captar opiniones', modulo:'Mercadeo', responsable:'Mateo', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Luli gestiona a Camilo', modulo:'Gestión interna', responsable:'Luli', prioridad:'Media', fecha:'', estado:'Iniciativa'},
  {titulo:'Auditoría cajas menores — automático Claude', modulo:'Gestión interna', responsable:'Por definir', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Tablero de seguimiento operativo', modulo:'Gestión interna', responsable:'Mateo', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Lobby para aumentar ventas — importadores, lavaderos, servitecas', modulo:'Mercadeo', responsable:'Mateo', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
];

const acMiroRows = [
  {rowId:'b241b243-adc8-4010-9625-1b6c1600ab52', tarea:'Agendar reunión presencial Medellín (21 abril) con Tomás y Luli', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 21 2026'},
  {rowId:'187d99b9-19db-48d0-ba2c-6acbddd44358', tarea:'Reunirse con Luli (17 abril) — pauta/captación — definir plan ciclovía 3 meses con Tomás', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Mercadeo', fecha:'Abr 17 2026'},
  {rowId:'1617b631-51a3-40a0-96cf-a42444f6d761', tarea:'Lobby para aumentar ventas — importadores, lavaderos, servitecas', estado:'Iniciativa', responsable:'Mateo', prioridad:'Alta', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'f1e5dbc2-da55-4907-8948-8b766d087787', tarea:"Lanzar campaña 'Tráigame un carro y se lo compramos hoy'", estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'d056b913-aaae-4e49-8a82-a47d95ab4609', tarea:'Mercadeo — plan de trabajo mensual, plan de cierre, foco, modernizar página web', estado:'Iniciativa', responsable:'Mateo', prioridad:'Alta', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'65b2c4c4-9241-4781-83b9-356c4db796b1', tarea:'Definir y comunicar meta de captación mensual — 60 carros/mes', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Ingresos', fecha:'Por definir'},
  {rowId:'c563b52b-c6df-489b-8be4-a9013f86f7c5', tarea:'Calcular y enviar a Mateo monto adeudado de factura', estado:'En curso', responsable:'Tomás', prioridad:'Alta', area:'Ingresos', fecha:'Por definir'},
  {rowId:'4c055158-5111-4d6c-9a7d-4e8f07638321', tarea:'Auditoría cajas menores — automático Claude', estado:'Iniciativa', responsable:'Por definir', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'27fc4cb4-9905-4925-9631-3a5bc8049cdc', tarea:'Luli gestiona a Camilo', estado:'Iniciativa', responsable:'Luli', prioridad:'Media', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'a3ceb2d7-e216-4258-9dc3-0d2086bf4ac9', tarea:'Google Business — definir estrategia para captar opiniones', estado:'Iniciativa', responsable:'Mateo', prioridad:'Alta', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'497d28f1-8e77-442b-8740-ee9fad83b837', tarea:'Buscar cursos — ticket mínimo 3M, liderazgo empresarial', estado:'Iniciativa', responsable:'Mateo', prioridad:'Media', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'1b5afc1b-a0d7-4685-9991-fb665b3dc0cf', tarea:'Definir formato de registro compras propias en PYG — luego registrar compras', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Ingresos', fecha:'Por definir'},
  {rowId:'ef70a4a1-94f3-49cb-ac68-9a129c8dd395', tarea:'Digitalización proceso operativo', estado:'Iniciativa', responsable:'Por definir', prioridad:'Alta', area:'Operaciones', fecha:'Por definir'},
  {rowId:'a49213f8-128c-442f-b4c2-506308c98b23', tarea:'Tablero de seguimiento operativo', estado:'Iniciativa', responsable:'Mateo', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'ec562531-f995-4308-bf39-c17d18c11785', tarea:'Revisar con Luli sitio web — decidir reforma o reasignar presupuesto', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'3c2c9df7-b7f5-4efd-8b29-91ee7c9c784d', tarea:'Pedir a Camilo investigar curso de estrategia/conversión — evaluar compra mes 2', estado:'En curso', responsable:'Mateo', prioridad:'Media', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'8ccba231-bb3a-40e7-bbc9-f53c2159ee54', tarea:'Ingresar venta de cada vehículo al PYG inmediatamente después de cada venta', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Ingresos', fecha:'Permanente'},
  {rowId:'03c24783-1d5a-4a73-a604-d9c8a3df36ae', tarea:'Toma de la ciclovía — evento de running', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Operaciones', fecha:'Por definir'},
  {rowId:'e13225dc-8e63-469e-8ea0-a48aa8402af3', tarea:'Pedir a Mercedes 2 proveedores para digitalizar contratos', estado:'En curso', responsable:'Mateo', prioridad:'Media', area:'Operaciones', fecha:'Por definir'},
  {rowId:'227a5972-5b01-4a0c-86b0-398c1359f5ca', tarea:'Buscar opciones proveedores para digitalización del proceso de venta', estado:'Iniciativa', responsable:'Mateo', prioridad:'Alta', area:'Operaciones', fecha:'Por definir'},
  {rowId:'8dde068d-38dc-42ac-b875-c88445360642', tarea:'Pedir a Luli plan mensual y cierre de pauta', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Mercadeo', fecha:'Abr 17 2026'},
];

const acResult = diffClient('AC AUTOS', acSbTasks, acMiroRows);

// =============================================
// PAULINA ZARRABE
// =============================================
const paulSbTasks = [
  {titulo:'Nueva pauta a partir de junio', modulo:'Mercadeo', responsable:'Paulina', prioridad:'Alta', fecha:'Jun 2026', estado:'Iniciativa'},
  {titulo:'Modificar cuantía póliza responsabilidad doctores a 500 millones — pendiente Sara y Ortodoncista', modulo:'Gestión interna', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Agenda — actualizar días Paulina Zarrabe, ajustar horarios Sara, Rehabilitadora, Camila Periodoncista', modulo:'Operaciones', responsable:'Paulina', prioridad:'Alta', fecha:'Mayo 2026', estado:'En curso'},
  {titulo:'Crear contrato de ortodoncia e implementarlo en el sistema', modulo:'Operaciones', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Dentalink — reunión para validar posibilidad de obtener API', modulo:'Operaciones', responsable:'Paulina', prioridad:'Media', fecha:'', estado:'Iniciativa'},
  {titulo:'Dentalink vs Ki Planner — eliminar reprocesos, validar integración', modulo:'Operaciones', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Implementar cierre de caja — Paulina', modulo:'Gestión interna', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Vasos medidores del yeso', modulo:'Operaciones', responsable:'Leidy', prioridad:'Baja', fecha:'', estado:'Iniciativa'},
  {titulo:'Implementar archivo control pacientes Invisalign y control diario', modulo:'Operaciones', responsable:'Paulina / Leidy', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Dentalink — seguimiento general sistema', modulo:'Operaciones', responsable:'Paulina', prioridad:'Media', fecha:'', estado:'Iniciativa'},
  {titulo:'Consultorio — rotulación, esterilización, protocolos limpieza, archivo operación diaria', modulo:'Operaciones', responsable:'Leidy / Paulina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Control de RX digital en carpeta de operación', modulo:'Operaciones', responsable:'Leidy / Paulina', prioridad:'Media', fecha:'', estado:'Iniciativa'},
  {titulo:'Firmar contrato Sara Calle y doctores faltantes', modulo:'Gestión interna', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Firmas pacientes — autorización datos, contrato tratamiento, presupuestos, evolución', modulo:'Gestión interna', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Explicar presupuestos en consultorio — mejorar periodoncista y rehabilitación', modulo:'Operaciones', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Archivo de control dirección de casos clínicos', modulo:'Operaciones', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Rentabilidad de ventas de producto', modulo:'Ingresos', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Crear política de agenda ortodoncia — 40.000 no reembolsable, consulta 80 con escaneo', modulo:'Gestión interna', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Revisar políticas de operación Dentilandia como referencia', modulo:'Operaciones', responsable:'Paulina', prioridad:'Media', fecha:'', estado:'Iniciativa'},
  {titulo:'Costos deducible de la sedación', modulo:'Ingresos', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Salario emocional equipo — Leidy, Paulina, doctores', modulo:'Gestión interna', responsable:'Paulina', prioridad:'Media', fecha:'', estado:'Iniciativa'},
  {titulo:'Leidy — rotular cajones, planilla esterilización, planilla atención, plan residuos, agenda Paulina, agregar prestación antes de salir paciente', modulo:'Operaciones', responsable:'Leidy / Paulina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Conseguir contrato de tratamiento — Dra. Manuela Castro', modulo:'Gestión interna', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Enviar contactos de sedación intravenosa y óxido nitroso', modulo:'Operaciones', responsable:'Paulina', prioridad:'Media', fecha:'', estado:'Iniciativa'},
  {titulo:'Carga de elementos en manual de funciones', modulo:'Operaciones', responsable:'Paulina', prioridad:'Media', fecha:'', estado:'Iniciativa'},
  {titulo:'Manual de funciones doctores y Paulina — tiempos, evoluciones', modulo:'Gestión interna', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Mandar a diseñar entregable de métodos de pago', modulo:'Mercadeo', responsable:'Paulina', prioridad:'Media', fecha:'', estado:'Iniciativa'},
  {titulo:'Datos para indicadores mensuales — ventas, productos, pacientes nuevos, canales', modulo:'Operaciones', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Redes — descripción diferencial del servicio y bruxismo para contenido', modulo:'Mercadeo', responsable:'Paulina', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Limpiadores de lengua por AliExpress', modulo:'Operaciones', responsable:'Paulina', prioridad:'Baja', fecha:'', estado:'En curso'},
];

// Miro rows for Paulina (18 rows)
const paulMiroRows = [
  {rowId:'ee5f5f8f-187c-4983-b61e-bf602625c174', tarea:'Comprar gramera y vasos desechables para calibrar yeso', estado:'En curso', responsable:'Paulina', prioridad:'Baja', area:'Operaciones', fecha:'Por definir'},
  {rowId:'fdd3a5c3-67cb-4dde-8a8e-b2eb76cb92b1', tarea:'Explicar presupuestos en consultorio — mejorar periodoncista y rehabilitación', estado:'Iniciativa', responsable:'Paulina', prioridad:'Alta', area:'Operaciones', fecha:'Por definir'},
  {rowId:'bc446742-0e21-4b15-bde2-6f0ce56008ae', tarea:'Leidy — rotular cajones, planilla esterilización, planilla atención, plan residuos, agenda Paulina', estado:'Iniciativa', responsable:'Paulina', prioridad:'Alta', area:'Operaciones', fecha:'Por definir'},
  {rowId:'5836e5bc-fb24-45e5-84b4-a11db5f9e703', tarea:'Revisar políticas de operación Dentilandia como referencia', estado:'Iniciativa', responsable:'Paulina', prioridad:'Media', area:'Operaciones', fecha:'Por definir'},
  {rowId:'7a27fde2-8825-4f8a-ab01-353373825bfd', tarea:'Crear contrato de ortodoncia e implementarlo en el sistema', estado:'Iniciativa', responsable:'Paulina', prioridad:'Alta', area:'Operaciones', fecha:'Por definir'},
  {rowId:'b1963cbb-4d87-42b1-8e81-1e95d7e34365', tarea:'Modificar cuantía póliza responsabilidad doctores a 500 millones — pendiente Sara y Ortodoncista', estado:'En curso', responsable:'Paulina', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'9e3439af-1770-44a8-aad8-b1fa2dedf159', tarea:'Solicitar a ortodoncista contrato de ortodoncia — adaptar cláusula no-reembolso', estado:'En curso', responsable:'Tomás', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'731ffde3-a733-49dc-845a-8ff512f8fbde', tarea:'Implementar cierre de caja: base 100k, imprimir/firmar, conciliar Volt/banco — actualizar manual', estado:'En curso', responsable:'Paulina', prioridad:'Alta', area:'Operaciones', fecha:'Por definir'},
  {rowId:'73bf4bf8-d9df-43e2-a878-51a55268e8c4', tarea:'Documentar paso a paso de habilitación en Dentalink (RIVS, T/H, frecuencias)', estado:'En curso', responsable:'Paulina', prioridad:'Alta', area:'Operaciones', fecha:'Por definir'},
  {rowId:'74a4400b-ce66-48a7-bbd0-8874efc11fc5', tarea:'Firmar contrato Sara Calle y doctores faltantes', estado:'Iniciativa', responsable:'Paulina', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'a048b1bc-50b6-4083-8de6-ec0a0669460f', tarea:'Circular pieza de alquiler de consultorio (71k/h) en grupos de odontólogos', estado:'En curso', responsable:'Paulina', prioridad:'Media', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'f7cd2f2c-18ab-4c24-ab91-9c04f983fd13', tarea:'Nueva pauta a partir de junio', estado:'Iniciativa', responsable:'Paulina', prioridad:'Alta', area:'Mercadeo', fecha:'Jun 2026'},
  {rowId:'3d8b3d1e-df33-43be-8a40-4c6a8c8b014d', tarea:'Crear pestaña de rentabilidad por producto (Brumas, limpiadores, jabones)', estado:'En curso', responsable:'Tomás', prioridad:'Alta', area:'Ingresos', fecha:'Por definir'},
  {rowId:'eba8ecaa-f434-470f-a655-576461e151f5', tarea:'Crear política de agenda ortodoncia — 40.000 no reembolsable, consulta 80 con escaneo', estado:'Bloqueada', responsable:'Paulina', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'8a7b8aef-8292-44e8-ac9c-2c34b4d6f450', tarea:'Manual de funciones doctores y Paulina — tiempos, evoluciones', estado:'Iniciativa', responsable:'Paulina', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'b68217a7-1b24-4de5-8eaa-91422bdf1623', tarea:'Mandar a diseñar entregable de métodos de pago', estado:'En curso', responsable:'Paulina', prioridad:'Media', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'911e2fc3-2264-46aa-a96a-3b4108efbd14', tarea:'Rentabilidad de ventas de producto', estado:'Iniciativa', responsable:'Paulina', prioridad:'Alta', area:'Ingresos', fecha:'Por definir'},
  {rowId:'d5b143df-5e7d-43b3-b151-7a4f32bd99d9', tarea:'Salario emocional equipo — Leidy, Paulina, doctores', estado:'Iniciativa', responsable:'Paulina', prioridad:'Media', area:'Gestión interna', fecha:'Por definir'},
];

const paulResult = diffClient('PAULINA ZARRABE', paulSbTasks, paulMiroRows);

// =============================================
// LATIVO (Supabase=0, all Miro are orphans)
// =============================================
const lativoSbTasks = [];
const lativoMiroRows = [
  {rowId:'059ba7f2-1568-4b89-9747-654aa227b235', tarea:'Investigar pagos en USD (Stripe/Payoneer) + carga tributaria', estado:'En curso', responsable:'Melissa', prioridad:'Alta', area:'', fecha:'Abr 29 2026'},
  {rowId:'097c80b0-4148-4333-b6aa-dcb83da8c50d', tarea:'Compartir tablero de Miro con Melissa (acceso de edición)', estado:'Completada', responsable:'Tomás', prioridad:'Alta', area:'', fecha:'Abr 22 2026'},
  {rowId:'9cc98644-ed71-4b43-9999-1cd92f64bc29', tarea:'Enviar tutoriales de automatización con IA (Claude) para presentaciones', estado:'Completada', responsable:'Tomás', prioridad:'Media', area:'', fecha:'Abr 29 2026'},
  {rowId:'cc2c35ec-6590-4ce9-894b-16ddc1f378de', tarea:'Enviar las 12 preguntas ancla previas a la Sesión 2', estado:'En curso', responsable:'Tomás', prioridad:'Alta', area:'', fecha:'Abr 27 2026'},
  {rowId:'01523a9c-4fc3-44bf-825a-471d4f30aaab', tarea:'Revisar las preguntas pre-sesión y completar tareas en Miro', estado:'En curso', responsable:'Melissa', prioridad:'Alta', area:'', fecha:'Abr 29 2026'},
];

const lativoResult = diffClient('LATIVO', lativoSbTasks, lativoMiroRows);

// =============================================
// DENTILANDIA - analyze orphans
// =============================================
const dentSbTasks = [
  {titulo:'Iniciar auditorías administrativas internas con Cirley', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Alta', fecha:'Abr 2026', estado:'En curso'},
  {titulo:'Declaración de renta (20 mayo) — industria y comercio municipios, solicitar factura', modulo:'Gestión interna', responsable:'Lina', prioridad:'Alta', fecha:'May 20 2026', estado:'Iniciativa'},
  {titulo:'Desplegar encuesta satisfacción vía B2Chat y sedes — resultados al comité 15 mayo', modulo:'Mercadeo', responsable:'Jorge', prioridad:'Alta', fecha:'May 15 2026', estado:'En curso'},
  {titulo:'Abrir centro de costo en seguridad social (Fabricato y Américas)', modulo:'Gestión interna', responsable:'Lina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Monitorear cámaras con audio aleatoriamente', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Alta', fecha:'Permanente', estado:'En curso'},
  {titulo:'Estudio control de horas extras - Panorama completo de los 3 escenearios', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Media', fecha:'15/04/2026', estado:'Iniciativa'},
  {titulo:'Enviar y recolectar firmas comunicado procedimientos autorizados/no autorizados', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Reorganizar agenda lunes AM por corte recepción', modulo:'Operaciones', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Estudio de costos 2026 — reporte Oral Drive, pacientes por sede, horas trabajadas, distribución ventas', modulo:'Ingresos', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Conseguir aspiradora para corte recepción (domingo)', modulo:'Operaciones', responsable:'Jorge', prioridad:'Baja', fecha:'', estado:'En curso'},
  {titulo:'Diseñar campaña reseñas Google Business — meta 50/mes', modulo:'Mercadeo', responsable:'Jorge', prioridad:'Alta', fecha:'Abr 30 2026', estado:'En curso'},
  {titulo:'Implementación Coronas PMMA — protocolo clínico, insumos, escaneo vs impresión', modulo:'Operaciones', responsable:'Clara', prioridad:'Media', fecha:'', estado:'Iniciativa'},
  {titulo:'Rotar auxiliares entre doctoras y sedes', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Cargar consentimiento Arturo 11', modulo:'Operaciones', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Programar auditorías clínicas mensuales — 1 por sede desde abril', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Alta', fecha:'Abr 2026', estado:'En curso'},
  {titulo:'Configurar pago Cloud con tarjeta e iniciar uso de IA', modulo:'Gestión interna', responsable:'Jorge / Clara', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Preparar contenido pantallas Américas/Fabricato — coordinar con Lucao', modulo:'Mercadeo', responsable:'Jorge', prioridad:'Media', fecha:'', estado:'En curso'},
  {titulo:'Abrir centros de costos seguridad social Fabricato y Américas', modulo:'Gestión interna', responsable:'Lina', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Crear tabla de ventas por servicio en Cloud — compartir próxima semana', modulo:'Gestión interna', responsable:'Tomás', prioridad:'Alta', fecha:'Abr 16 2026', estado:'En curso'},
  {titulo:'Batas de las doctoras', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Baja', fecha:'30/05/2026', estado:'En curso'},
  {titulo:'Actualizar inventario seguros con valores comerciales — agregar RC Américas', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Presentar balance primer trimestre en último comité de abril', modulo:'Gestión interna', responsable:'Lina', prioridad:'Alta', fecha:'Abr 2026', estado:'Iniciativa'},
  {titulo:'Estrategia emocional para el equipo — ambiente por ellas mismas', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Media', fecha:'30/04/2026', estado:'Iniciativa'},
  {titulo:'Video de presentación para convenios con empresas — correcciones pendientes', modulo:'Mercadeo', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Asamblea: Enviar bitacora de diferencias EF firmados vs excel - Enviar firmados ultima versión', modulo:'Gestión interna', responsable:'Lina', prioridad:'Alta', fecha:'por', estado:'Iniciativa'},
  {titulo:'Agendar auditoría clínica sin aviso a doctor en revisión', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Alta', fecha:'Esta semana', estado:'En curso'},
  {titulo:'Coordinar con Vladimir piloto coronas PMMA en Américas o Fabricato', modulo:'Operaciones', responsable:'Jorge', prioridad:'Media', fecha:'', estado:'En curso'},
  {titulo:'Analizar costos horas extra y modelar soluciones — supernumerario/turnos', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Alta', fecha:'May 15 2026', estado:'En curso'},
  {titulo:'Estrategia nueva de mercadeo en redes para Dentilandia.', modulo:'Mercadeo', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Conciliación libros oficiales - Carlos', modulo:'Gestión interna', responsable:'Lina', prioridad:'Alta', fecha:'', estado:'Iniciativa'},
  {titulo:'Nueva estrategia de recuperación — valoración gratis abril, contenido', modulo:'Mercadeo', responsable:'Jorge', prioridad:'Alta', fecha:'Abr 2026', estado:'En curso'},
  {titulo:'Estrategia fidelización — membresía, estudio mercado medicinas prepagadas, beneficios', modulo:'Mercadeo', responsable:'Jorge', prioridad:'Media', fecha:'', estado:'En curso'},
  {titulo:'Recontactar Bancolombia — certificado cancelación cuenta La Dentijería', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Enviar inventario contable por sede + contacto Ceferino IMAX a Jorge', modulo:'Gestión interna', responsable:'Lina / Tomás', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Arreglos Dentilandia — carpintería mueble, pintura consultorio (ok)', modulo:'Operaciones', responsable:'Jorge', prioridad:'Media', fecha:'', estado:'En curso'},
  {titulo:'Habilitación Dras — habilitar pendientes por sede, autoevaluación próximas a vencer', modulo:'Gestión interna', responsable:'jorge', prioridad:'Alta', fecha:'30/06/2026', estado:'Iniciativa'},
  {titulo:'Gestionar transferencia 4x1000 a Clara vía Adriana', modulo:'Ingresos', responsable:'Jorge', prioridad:'Media', fecha:'', estado:'En curso'},
  {titulo:'Buscar proveedores alternos marketing — pedir CVs — enviar a Clara para entrevista', modulo:'Mercadeo', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Porta retrato electrónico — comprar Mercado Libre, cuadrar con Santiago', modulo:'Mercadeo', responsable:'Jorge', prioridad:'Baja', fecha:'', estado:'Iniciativa'},
  {titulo:'Abrir CDT en USD con saldo disponible', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Crear imagenes, videos y demas de porta retratos de las marcas', modulo:'Mercadeo', responsable:'Jorge', prioridad:'Media', fecha:'15 / 05 / 2026', estado:'Iniciativa'},
  {titulo:'Yiyo — indumentaria, cotización modista, toma de medidas', modulo:'Operaciones', responsable:'Jorge', prioridad:'Media', fecha:'', estado:'En curso'},
  {titulo:'Investigar opciones inversión mayor rendimiento en Bancolombia', modulo:'Ingresos', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Enviar archivo de costos a Lina — depurar sedación y cuenta 2', modulo:'Ingresos', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Obtener cotización mensajero para habilitaciones doctores', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Media', fecha:'', estado:'En curso'},
  {titulo:'Definir y comunicar a doctoras: tope 2/jornada, 20 min/cita, no reprogramar', modulo:'Operaciones', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'En curso'},
  {titulo:'Encuesta de satisfaccion del usuario 6 ultimos meses', modulo:'Mercadeo', responsable:'Jorge', prioridad:'Media', fecha:'15/05/82026', estado:'Iniciativa'},
  {titulo:'Reuniones semanales con nuevas colaboradoras para seguimiento y feedback', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Alta', fecha:'Permanente', estado:'En curso'},
  {titulo:'Estructurar incentivo por referidos — monto y controles — presentar en comité', modulo:'Ingresos', responsable:'Lina / Clara', prioridad:'Alta', fecha:'Abr 16 2026', estado:'En curso'},
  {titulo:'Alvaro Abogado — vinculación laboral, horas extras, manejo especialistas', modulo:'Gestión interna', responsable:'Jorge', prioridad:'Alta', fecha:'', estado:'En curso'},
];

// All 92 Dentilandia Miro rows
const dentMiroRows = [
  {rowId:'be209a0d-b283-4a2b-8e59-22149a46f3fa', tarea:'Coordinar con Santiago logística medición riesgo psicosocial (sede rem...)', estado:'En curso', responsable:'Jorge', prioridad:'Media', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'4da8c594-390a-4830-b731-ed7e2115177e', tarea:'Revisar formatos auditoría interna con Cirley — briefing doctores — co...', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 22 2026'},
  {rowId:'e4731c0d-a748-4c7f-9516-4542d97252fb', tarea:'Compartir acceso curso automatización con Lina', estado:'En curso', responsable:'Tomás', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 16 2026'},
  {rowId:'4c2f54df-a59b-49cf-9e4f-5f639efb2e44', tarea:'Reuniones semanales con nuevas colaboradoras para seguimiento y feedback', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Permanente'},
  {rowId:'896a01aa-03b2-4700-af19-15f661375e16', tarea:'Implementar política: usar gotas reveladoras en todas las valoraciones', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Operaciones', fecha:'Por definir'},
  {rowId:'6b2ca398-9794-4c83-8cba-e3b9dcfea722', tarea:'Obtener cotización mensajero para habilitaciones doctores', estado:'En curso', responsable:'Jorge', prioridad:'Media', area:'Gestión interna', fecha:''},
  {rowId:'4cc84a1d-403a-421f-89eb-315fa3f838ce', tarea:'Implementación Coronas PMMA — protocolo clínico, insumos, escaneo vs impresión', estado:'Iniciativa', responsable:'Clara', prioridad:'Media', area:'Operaciones', fecha:'Por definir'},
  {rowId:'e392054c-0ad8-41fa-bab8-ccf2c1e01f69', tarea:'Presentar estrategia integral marketing incl. Instagram Stories', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Mercadeo', fecha:'Abr 30 2026'},
  {rowId:'b3217e81-97bc-4403-b1da-69f4fb3e249e', tarea:'Diseñar campaña reseñas Google Business — meta 50/mes + Confirmar kit ...', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Mercadeo', fecha:'Abr 30 2026'},
  {rowId:'43f0d4a7-f97a-4857-9610-22555231516f', tarea:'Coordinar con Dr. Álvaro cita presencial UGPP (Medellín) con radicado', estado:'En curso', responsable:'Lina', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'3be77593-d26e-42e4-9dfa-ba75bd192b71', tarea:'Gestionar transferencia 4x1000 a Clara vía Adriana', estado:'En curso', responsable:'Jorge', prioridad:'Media', area:'Ingresos', fecha:''},
  {rowId:'ed913de8-cadd-4b6a-92ba-52401d4de233', tarea:'Recalcular costos horas extra por salario e IBC', estado:'En curso', responsable:'Lina', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 16 2026'},
  {rowId:'e1686908-31be-49fc-8dd0-8c0ae78e2fc3', tarea:'Porta retrato electrónico — comprar Mercado Libre, cuadrar con Santiago', estado:'Iniciativa', responsable:'Jorge', prioridad:'Baja', area:'Mercadeo', fecha:''},
  {rowId:'b9e48ef0-58b8-4e12-8e0e-d0299d689830', tarea:'Confirmar comité virtual 22 abril con Carlos a las 11AM', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 16 2026'},
  {rowId:'e66c9cf2-081b-410e-80f3-893667b1f171', tarea:'Asamblea: Enviar bitácora de diferencias EF firmados vs excel', estado:'Iniciativa', responsable:'Lina', prioridad:'Alta', area:'Contabilidad', fecha:'Por definir'},
  {rowId:'6a33a6d6-bea2-43f5-82e0-19490ac4ae74', tarea:'Reunirse con Melisa (Américas) — plan de mejora recepción', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 16 2026'},
  {rowId:'ff1667da-7617-4094-96f7-71bbcd785cb3', tarea:'Renovación de marca Provimarca — pendiente firma Dra. Clara', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'fa12ed90-653a-4205-9fbb-2c81c8c2e68e', tarea:'Gestionar NIT para Cloud — correcta contabilización', estado:'En curso', responsable:'Lina', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'6696cd3b-bbe3-4f04-aa81-b46d4e483dda', tarea:'Preparar contenido pantallas Américas/Fabricato — coordinar con Lucao', estado:'En curso', responsable:'Jorge', prioridad:'Media', area:'Mercadeo', fecha:''},
  {rowId:'08130612-7423-4dbd-8b94-a52ab5fc0e24', tarea:'Desplegar encuesta satisfacción vía B2Chat y sedes — resultados al comité 15 mayo', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Mercadeo', fecha:'May 15 2026'},
  {rowId:'cbac465d-633b-482d-acad-0228434bd809', tarea:'Porta retratos — crear imágenes, videos y demás de porta retratos de las marcas', estado:'Iniciativa', responsable:'Jorge', prioridad:'Media', area:'Mercadeo', fecha:'15/05/2026'},
  {rowId:'0501c30a-75d8-456b-a848-eb5515201ac8', tarea:'Documentar preguntas comunes de interrupción con respuestas para auxiliar', estado:'En curso', responsable:'Jorge', prioridad:'Media', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'a618b719-82a0-480e-8d1a-0be90f692ca5', tarea:'Estrategia nueva de mercadeo en redes para Dentilandia.', estado:'Iniciativa', responsable:'Jorge', prioridad:'Alta', area:'Mercadeo', fecha:''},
  {rowId:'f48fab00-665a-4a65-82f0-60f154df60c6', tarea:'Agendar auditoría clínica sin aviso a doctor en revisión', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Esta semana'},
  {rowId:'6e3b6733-ea7c-45fd-a21b-fdd218d1e9a3', tarea:'Enviar inventario contable por sede + contacto Ceferino IMAX a Jorge', estado:'En curso', responsable:'Lina / Tomás', prioridad:'Alta', area:'Gestión interna', fecha:''},
  {rowId:'574d9b87-64d3-4da2-8315-501680e337da', tarea:'Iniciar seguimientos semanales con el equipo — próxima semana', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 22 2026'},
  {rowId:'150cb885-f4c3-422a-a23a-21ec843b0a4e', tarea:'Monitorear cámaras con audio aleatoriamente', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Permanente'},
  {rowId:'1bb8f9c7-7996-4c10-a116-edcc58a90539', tarea:'Crear campaña para recaudar reseñas de Google Business', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Mercadeo', fecha:'29/04/2026'},
  {rowId:'d34d9926-f953-41cb-873a-25f433d79596', tarea:'Estructurar incentivo por referidos — monto y controles — presentar en comité', estado:'En curso', responsable:'Lina / Clara', prioridad:'Alta', area:'Ingresos', fecha:'Abr 16 2026'},
  {rowId:'2c58491d-b894-4bc4-9689-c38baf80eac3', tarea:'Crear tabla de ventas por servicio en Cloud — compartir próxima semana', estado:'En curso', responsable:'Tomás', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 16 2026'},
  {rowId:'11a324f8-acfd-49b0-975e-c85f15a9e340', tarea:'Estudio de costos 2026 — reporte Oral Drive, pacientes por sede, horas trabajadas, distribución ventas', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Ingresos', fecha:'Por definir'},
  {rowId:'3b846b9e-4378-42b0-929d-5425dbb4fbbe', tarea:'Video de presentación para convenios con empresas — correcciones pendientes', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'b229de36-b96a-4bb9-a4ec-b8c51eb07761', tarea:'Asegurar que doctoras marquen y entreguen tarjetas a pacientes nuevos', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Operaciones', fecha:'Por definir'},
  {rowId:'fc510c5a-6c8b-4660-9b73-caa288535376', tarea:'Batas de las doctoras — cotización a 105.000', estado:'En curso', responsable:'Jorge', prioridad:'Baja', area:'Gestión interna', fecha:'30/05/2026'},
  {rowId:'387e8e9b-2a0d-4774-abc5-84646ad2a61c', tarea:'Cargar consentimiento Arturo 11', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Operaciones', fecha:''},
  {rowId:'c9422382-19ef-47f1-8c77-bfbcca42634d', tarea:'Diseñar y arrancar CARDEX para Cuenta 2 desde enero 1 2026', estado:'En curso', responsable:'Lina', prioridad:'Alta', area:'Contabilidad', fecha:'Abr 22 2026'},
  {rowId:'2dbfdab1-baa6-473f-a4b6-75ee81cc531b', tarea:'Enviar a Jorge template Miro parrilla de contenido', estado:'En curso', responsable:'Tomás', prioridad:'Alta', area:'Mercadeo', fecha:'Abr 16 2026'},
  {rowId:'4ac1755d-8c4f-45c8-991f-8dbc96a96752', tarea:'Estrategia fidelización — membresía, estudio mercado medicinas prepagadas, beneficios', estado:'En curso', responsable:'Jorge', prioridad:'Media', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'7c410269-6acc-4558-ab16-320e475b9dd3', tarea:'Pagar horas extras acumuladas marzo-abril al corte', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 30 2026'},
  {rowId:'01db2110-270c-4cfa-93d4-9adb7afab422', tarea:'Conseguir aspiradora para corte recepción (domingo)', estado:'En curso', responsable:'Jorge', prioridad:'Baja', area:'Operaciones', fecha:''},
  {rowId:'e92c2e44-489b-4041-ba1f-756de87ad750', tarea:'Nueva estrategia de recuperación — valoración gratis abril, contenido', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Mercadeo', fecha:'Abr 2026'},
  {rowId:'e88e03b8-eae2-458a-82e2-a7b2446c76bb', tarea:'Agendar reunión IA con Eliana (Bituchat) y Tomás — Apr 16 11:00', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 16 2026'},
  {rowId:'875924c9-4382-4745-88c8-ed6707a06483', tarea:'Confirmar con Adriana logística y fecha carpintería domingo 19', estado:'En curso', responsable:'Clara', prioridad:'Alta', area:'Operaciones', fecha:'Abr 16 2026'},
  {rowId:'deebefd2-f9a4-4cc3-a37f-3e59dd574d47', tarea:'Habilitación Dras — habilitar pendientes por sede, autoevaluación próximas a vencer', estado:'Iniciativa', responsable:'jorge', prioridad:'Alta', area:'Gestión interna', fecha:'30/06/2026'},
  {rowId:'85a48820-0444-4025-a7a7-c4a8bd097ea7', tarea:'Buscar un nuevo proveedor de redes sociales', estado:'En curso', responsable:'Jorge', prioridad:'Media', area:'Mercadeo', fecha:'30/04/2026'},
  {rowId:'3312729e-7515-440a-a99a-d4e1dd183267', tarea:'Enviar tutoriales YouTube Claude/IA a Lina', estado:'En curso', responsable:'Tomás', prioridad:'Media', area:'Gestión interna', fecha:'Abr 16 2026'},
  {rowId:'d66bdbfb-138d-421b-a66c-b44f426c475d', tarea:'Recontactar Bancolombia — certificado cancelación cuenta La Dentijería', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:''},
  {rowId:'0a18353e-bd08-4784-80f6-57ccbfd727ba', tarea:'Aclarar con Martín alcance y costos contratos/otrosíes — informar al comité', estado:'En curso', responsable:'Lina', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 16 2026'},
  {rowId:'4ccbbb1c-4145-4f1a-8e6b-ba8a5c5346d8', tarea:'Definir color bolígrafos con Adriana — comprar — asignar mejor letra para pacientes', estado:'En curso', responsable:'Jorge / Clara', prioridad:'Media', area:'Operaciones', fecha:'Por definir'},
  {rowId:'8d324adb-cdb6-44d9-ba08-2553583cd571', tarea:'Abrir CDT en USD con saldo disponible', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:''},
  {rowId:'ecda07f0-7721-49f6-9331-41cd2cc09d7c', tarea:'Encuesta de satisfacción del usuario 6 últimos meses', estado:'Iniciativa', responsable:'Jorge', prioridad:'Media', area:'Mercadeo', fecha:'15/05/2026'},
  {rowId:'2ee696a2-5f15-454a-9a28-c33dd897167c', tarea:'Arreglos Dentilandia — carpintería mueble, pintura consultorio', estado:'En curso', responsable:'Jorge', prioridad:'Media', area:'Operaciones', fecha:'Por definir'},
  {rowId:'8633a884-4c32-49b1-a935-c5208af8e6f3', tarea:'Declaración de renta (20 mayo) — industria y comercio municipios, solicitar factura', estado:'Iniciativa', responsable:'Lina', prioridad:'Alta', area:'Gestión interna', fecha:'May 20 2026'},
  {rowId:'d4a28a4f-92a1-432c-8da3-b10a4735e978', tarea:'Auditoría Instagram — crear parrilla de contenido — briefing Lucao', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Mercadeo', fecha:'Abr 16 2026'},
  {rowId:'b03c7284-78d7-4d80-9653-1f0e39f3ff06', tarea:'Encuesta de satisfaccion del usuario 6 ultimos meses', estado:'Iniciativa', responsable:'Jorge', prioridad:'Media', area:'Mercadeo', fecha:''},
  {rowId:'780f861c-ad4e-43d9-b571-a1d62c998cdc', tarea:'Yiyo — indumentaria, cotización modista, toma de medidas', estado:'En curso', responsable:'Jorge', prioridad:'Media', area:'Operaciones', fecha:'Por definir'},
  {rowId:'37dbdb31-7aab-458a-b298-6daf862ee289', tarea:'Investigar opciones inversión mayor rendimiento en Bancolombia', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Ingresos', fecha:''},
  {rowId:'a759bc19-e860-488b-85e2-d6ca70f8b7d8', tarea:'Agregar Código contable y Concepto a informes financieros mensuales', estado:'En curso', responsable:'Lina', prioridad:'Alta', area:'Contabilidad', fecha:'Por definir'},
  {rowId:'55e1fade-cdd4-462b-9760-48c63e9b9ce8', tarea:'Reanudar rotación semanal auxiliares recepción — consultorio', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'4dfdcb14-72d3-429a-979c-da6fa9e93ef5', tarea:'Programar auditorías clínicas mensuales — 1 por sede desde abril', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 2026'},
  {rowId:'d00f5790-08f3-4f74-8830-b12e673a1b94', tarea:'Comprar audífono para reuniones', estado:'En curso', responsable:'Jorge', prioridad:'Baja', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'ab65c2bb-8844-49ba-b60d-b400bfe2fd14', tarea:'Analizar costos horas extra y modelar soluciones — supernumerario/turnos', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'May 15 2026'},
  {rowId:'47fbf345-1075-4609-8a80-5325fead981d', tarea:'Solicitar factura electrónica a Dentilandia (3.5% retención) — pagar 5...', estado:'En curso', responsable:'Tomás', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 30 2026'},
  {rowId:'559bd4ab-0c8c-4e70-b78d-27f95369489c', tarea:'Confirmar comité presencial 6 de mayo — agendar', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'d38a6296-aea9-477a-8840-d0986482dc9a', tarea:'Iniciar auditorías administrativas internas con Cirley', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 2026'},
  {rowId:'070e17eb-88c8-49fc-855f-37be1b5c6084', tarea:'Confirmar disponibilidad de video con proveedor Google Ads', estado:'En curso', responsable:'Jorge', prioridad:'Media', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'e164cecc-a101-4602-88d6-6a359011ac6c', tarea:'Reorganizar agenda lunes AM por corte recepción', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Operaciones', fecha:''},
  {rowId:'4d337d50-37ce-4f7d-bcff-41cdca233741', tarea:'Abrir centro de costo en seguridad social (Fabricato y Américas)', estado:'Iniciativa', responsable:'Lina', prioridad:'Alta', area:'Gestión interna', fecha:''},
  {rowId:'e260a5a2-d41f-40c0-b95f-0c886119ac90', tarea:'Instruir a Andrés que copie a Jorge/comité en reportes de auditoría', estado:'En curso', responsable:'Clara', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'e442793d-e5e5-42ed-84e0-f74596b29f67', tarea:'Abrir centros de costos seguridad social Fabricato y Américas', estado:'En curso', responsable:'Lina', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'a90a2c85-3539-4f93-995e-b4ec04ce9a9a', tarea:'Enviar y recolectar firmas comunicado procedimientos autorizados/no autorizados', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:''},
  {rowId:'7b742445-3692-43af-9a5b-98b53d910c8f', tarea:'Llamar a Santiago — correcciones video presentación (notas de Clara)', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Mercadeo', fecha:'Abr 16 2026'},
  {rowId:'9d488b00-18d3-4483-b031-aad6e0c65916', tarea:'Configurar pago Cloud con tarjeta e iniciar uso de IA', estado:'En curso', responsable:'Jorge / Clara', prioridad:'Alta', area:'Gestión interna', fecha:''},
  {rowId:'c4f43ad2-1eed-4a9b-b537-0d395e9e575f', tarea:'Alvaro Abogado — vinculación laboral, horas extras, manejo especialistas', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'6b821609-dd75-44e7-b1c7-f9e12deb2db6', tarea:'Medición de riesgo psicosocial y clima organizacional', estado:'Iniciativa', responsable:'Jorge', prioridad:'Media', area:'Gestión interna', fecha:'Mayo 30 2026'},
  {rowId:'56352765-5bd9-4625-b7ee-adf522dfb187', tarea:'Definir y comunicar a doctoras: tope 2/jornada, 20 min/cita, no reprogramar', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Operaciones', fecha:''},
  {rowId:'f1d85195-368c-4e00-b8b2-e891aab69c73', tarea:'Coordinar con Vladimir piloto coronas PMMA en Américas o Fabricato', estado:'En curso', responsable:'Jorge', prioridad:'Media', area:'Operaciones', fecha:'Por definir'},
  {rowId:'0a32c845-8c76-4148-a2f4-dae1ae925166', tarea:'Equipo de trabajo — preguntas interrupción, comité asesor, clima organizacional', estado:'Iniciativa', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 8 2026'},
  {rowId:'f01c20e2-30cb-4f00-8b99-ec56957d6b8c', tarea:'Crear CDT virtual Bancolombia por 100M — dejar 27M en cuenta — cerrar...', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Ingresos', fecha:'Abr 16 2026'},
  {rowId:'59fea427-4d0c-422b-a677-db146d9a6c7c', tarea:'Crear imagenes, videos y demas de porta retratos de las marcas', estado:'Iniciativa', responsable:'Jorge', prioridad:'Media', area:'Mercadeo', fecha:'15 / 05 / 2026'},
  {rowId:'c7b008f0-df19-4176-a9e3-7dccf9bc406d', tarea:'Estudio control de horas extras - Panorama completo de los 3 escenearios', estado:'Iniciativa', responsable:'Jorge', prioridad:'Media', area:'Gestión interna', fecha:'15/04/2026'},
  {rowId:'2883e766-7b07-4793-9fae-d7ed50a84ccd', tarea:'Estrategia emocional para el equipo — ambiente por ellas mismas', estado:'Iniciativa', responsable:'Jorge', prioridad:'Media', area:'Gestión interna', fecha:'30/04/2026'},
  {rowId:'36de047d-39e1-46cb-9037-cc9be27fc455', tarea:'Enviar archivo de costos a Lina — depurar sedación y cuenta 2', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Ingresos', fecha:'Por definir'},
  {rowId:'c378d15f-3004-40a7-88c2-a3a5e9cfe37e', tarea:'Asamblea: Enviar bitacora de diferencias EF firmados vs excel - Enviar firmados ultima versión', estado:'Iniciativa', responsable:'Lina', prioridad:'Alta', area:'Gestión interna', fecha:''},
  {rowId:'8b3e2dc2-4ad2-4e71-8903-265163c65c66', tarea:'Rotar auxiliares entre doctoras y sedes', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:''},
  {rowId:'8e5e3ebd-27a4-4cf8-ae8d-5bf072a66ed9', tarea:'Confirmar a Luz (MAFRE) compra póliza contado — iniciar trámites', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 16 2026'},
  {rowId:'abbe5799-6343-4e0c-80f4-7024f16eb4df', tarea:'Buscar proveedores alternos marketing — pedir CVs — enviar a Clara para entrevista', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'c6eab49a-199d-4016-9646-cff037a573ec', tarea:'Implementar horario 8:30 desde May 1 — reagendar citas 8AM — entrada 1...', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:'May 1 2026'},
  {rowId:'cba18fe5-d795-44f7-a6b1-569415697ab1', tarea:'Conciliación libros oficiales — Carlos', estado:'Iniciativa', responsable:'Lina', prioridad:'Alta', area:'Gestión interna', fecha:'Por definir'},
  {rowId:'89971c8c-73fb-4483-914e-4664295136c5', tarea:'Comprar USD 500 Apr 16 y USD 500 fin de abril', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Ingresos', fecha:'Abr 16 2026'},
  {rowId:'52a17247-2c08-4139-a4d3-0b70c09c5ba8', tarea:'Presentar balance primer trimestre en último comité de abril', estado:'Iniciativa', responsable:'Lina', prioridad:'Alta', area:'Gestión interna', fecha:'Abr 2026'},
  {rowId:'38c3a2cf-d1a6-4b54-9099-bc8330406625', tarea:'Actualizar inventario seguros con valores comerciales — agregar RC Américas', estado:'En curso', responsable:'Jorge', prioridad:'Alta', area:'Gestión interna', fecha:''},
];

const dentResult = diffClient('DENTILANDIA', dentSbTasks, dentMiroRows);

// Build orphan JSON for Dentilandia
const dentOrphansJson = dentResult.orphans.map(o => ({
  rowId: o.rowId,
  titulo: o.tarea,
  estado: o.estado,
  responsable: o.responsable,
  prioridad: o.prioridad,
  area: o.area,
  fecha_limite: o.fecha
}));

console.log('\n\nDENTILANDIA ORPHANS COUNT:', dentOrphansJson.length);
console.log('First 5:');
dentOrphansJson.slice(0,5).forEach(o => console.log(' -', o.rowId.substring(0,8), o.titulo.substring(0,60)));

fs.writeFileSync('C:/Users/TOMAS/Desktop/consultoria-app/scripts/dentilandia-orphans.json', JSON.stringify(dentOrphansJson, null, 2), 'utf8');
console.log('\nSaved to scripts/dentilandia-orphans.json');

// Print sync payloads for AC Autos and Paulina
console.log('\n\n=== AC AUTOS SYNC PAYLOAD ===');
const acSyncRows = [];
acResult.updates.forEach(u => acSyncRows.push({rowId:u.rowId, cells:u.cells}));
acResult.inserts.forEach(i => acSyncRows.push({cells:[
  {columnTitle:'Tarea', value:i.titulo},
  {columnTitle:'Estado', value:i.estado},
  {columnTitle:'Responsable', value:i.responsable},
  {columnTitle:'Prioridad', value:i.prioridad},
  {columnTitle:'Área', value:i.modulo},
  {columnTitle:'Fecha límite', value:i.fecha||''}
]}));
console.log(JSON.stringify(acSyncRows));

console.log('\n\n=== PAULINA SYNC PAYLOAD ===');
const paulSyncRows = [];
paulResult.updates.forEach(u => paulSyncRows.push({rowId:u.rowId, cells:u.cells}));
paulResult.inserts.forEach(i => paulSyncRows.push({cells:[
  {columnTitle:'Tarea', value:i.titulo},
  {columnTitle:'Estado', value:i.estado},
  {columnTitle:'Responsable', value:i.responsable},
  {columnTitle:'Prioridad', value:i.prioridad},
  {columnTitle:'Área', value:i.modulo},
  {columnTitle:'Fecha límite', value:i.fecha||''}
]}));
console.log(JSON.stringify(paulSyncRows));
