// === DIFF ANALYSIS FOR ALL CLIENTS ===

// ========= AC AUTOS =========
const acSbData = {
  'buscar opciones proveedores para digitalizacion del proceso de venta': {orig:'Buscar opciones proveedores para digitalización del proceso de venta', estado:'Iniciativa',responsable:'Mateo',prioridad:'Alta',modulo:'Operaciones',fecha:''},
  'toma de la ciclovia — evento de running': {orig:'Toma de la ciclovía — evento de running', estado:'En curso',responsable:'Mateo',prioridad:'Alta',modulo:'Operaciones',fecha:''},
  'buscar cursos — ticket minimo 3m, liderazgo empresarial': {orig:'Buscar cursos — ticket mínimo 3M, liderazgo empresarial', estado:'Iniciativa',responsable:'Mateo',prioridad:'Media',modulo:'Gestión interna',fecha:''},
  'digitalizacion proceso operativo': {orig:'Digitalización proceso operativo', estado:'Iniciativa',responsable:'Por definir',prioridad:'Alta',modulo:'Operaciones',fecha:''},
  'mercadeo — plan de trabajo mensual, plan de cierre, foco, modernizar pagina web': {orig:'Mercadeo — plan de trabajo mensual, plan de cierre, foco, modernizar página web', estado:'Iniciativa',responsable:'Mateo',prioridad:'Alta',modulo:'Mercadeo',fecha:''},
  'ingresar venta de cada vehiculo al pyg inmediatamente despues de cada venta': {orig:'Ingresar venta de cada vehículo al PYG inmediatamente después de cada venta', estado:'En curso',responsable:'Mateo',prioridad:'Alta',modulo:'Ingresos',fecha:'Permanente'},
  'google business — definir estrategia para captar opiniones': {orig:'Google Business — definir estrategia para captar opiniones', estado:'Iniciativa',responsable:'Mateo',prioridad:'Alta',modulo:'Mercadeo',fecha:''},
  'luli gestiona a camilo': {orig:'Luli gestiona a Camilo', estado:'Iniciativa',responsable:'Luli',prioridad:'Media',modulo:'Gestión interna',fecha:''},
  'auditoria cajas menores — automatico claude': {orig:'Auditoría cajas menores — automático Claude', estado:'Iniciativa',responsable:'Por definir',prioridad:'Alta',modulo:'Gestión interna',fecha:''},
  'tablero de seguimiento operativo': {orig:'Tablero de seguimiento operativo', estado:'Iniciativa',responsable:'Mateo',prioridad:'Alta',modulo:'Gestión interna',fecha:''},
  'lobby para aumentar ventas — importadores, lavaderos, servitecas': {orig:'Lobby para aumentar ventas — importadores, lavaderos, servitecas', estado:'Iniciativa',responsable:'Mateo',prioridad:'Alta',modulo:'Mercadeo',fecha:''},
};

const acMiroRows = [
  {rowId:'b241b243-adc8-4010-9625-1b6c1600ab52', tarea:'Agendar reunion presencial Medellin (21 abril) con Tomas y Luli', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Gestion interna', fecha:'Abr 21 2026'},
  {rowId:'187d99b9-19db-48d0-ba2c-6acbddd44358', tarea:'Reunirse con Luli (17 abril) — pauta/captacion — definir plan ciclovia 3 meses con Tomas', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Mercadeo', fecha:'Abr 17 2026'},
  {rowId:'1617b631-51a3-40a0-96cf-a42444f6d761', tarea:'Lobby para aumentar ventas — importadores, lavaderos, servitecas', estado:'Iniciativa', responsable:'Mateo', prioridad:'Alta', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'f1e5dbc2-da55-4907-8948-8b766d087787', tarea:"Lanzar campana Traigame un carro y se lo compramos hoy", estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'d056b913-aaae-4e49-8a82-a47d95ab4609', tarea:'Mercadeo — plan de trabajo mensual, plan de cierre, foco, modernizar pagina web', estado:'Iniciativa', responsable:'Mateo', prioridad:'Alta', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'65b2c4c4-9241-4781-83b9-356c4db796b1', tarea:'Definir y comunicar meta de captacion mensual — 60 carros/mes', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Ingresos', fecha:'Por definir'},
  {rowId:'c563b52b-c6df-489b-8be4-a9013f86f7c5', tarea:'Calcular y enviar a Mateo monto adeudado de factura', estado:'En curso', responsable:'Tomas', prioridad:'Alta', area:'Ingresos', fecha:'Por definir'},
  {rowId:'4c055158-5111-4d6c-9a7d-4e8f07638321', tarea:'Auditoria cajas menores — automatico Claude', estado:'Iniciativa', responsable:'Por definir', prioridad:'Alta', area:'Gestion interna', fecha:'Por definir'},
  {rowId:'27fc4cb4-9905-4925-9631-3a5bc8049cdc', tarea:'Luli gestiona a Camilo', estado:'Iniciativa', responsable:'Luli', prioridad:'Media', area:'Gestion interna', fecha:'Por definir'},
  {rowId:'a3ceb2d7-e216-4258-9dc3-0d2086bf4ac9', tarea:'Google Business — definir estrategia para captar opiniones', estado:'Iniciativa', responsable:'Mateo', prioridad:'Alta', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'497d28f1-8e77-442b-8740-ee9fad83b837', tarea:'Buscar cursos — ticket minimo 3M, liderazgo empresarial', estado:'Iniciativa', responsable:'Mateo', prioridad:'Media', area:'Gestion interna', fecha:'Por definir'},
  {rowId:'1b5afc1b-a0d7-4685-9991-fb665b3dc0cf', tarea:'Definir formato de registro compras propias en PYG — luego registrar compras', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Ingresos', fecha:'Por definir'},
  {rowId:'ef70a4a1-94f3-49cb-ac68-9a129c8dd395', tarea:'Digitalizacion proceso operativo', estado:'Iniciativa', responsable:'Por definir', prioridad:'Alta', area:'Operaciones', fecha:'Por definir'},
  {rowId:'a49213f8-128c-442f-b4c2-506308c98b23', tarea:'Tablero de seguimiento operativo', estado:'Iniciativa', responsable:'Mateo', prioridad:'Alta', area:'Gestion interna', fecha:'Por definir'},
  {rowId:'ec562531-f995-4308-bf39-c17d18c11785', tarea:'Revisar con Luli sitio web — decidir reforma o reasignar presupuesto', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Mercadeo', fecha:'Por definir'},
  {rowId:'3c2c9df7-b7f5-4efd-8b29-91ee7c9c784d', tarea:'Pedir a Camilo investigar curso de estrategia/conversion — evaluar compra mes 2', estado:'En curso', responsable:'Mateo', prioridad:'Media', area:'Gestion interna', fecha:'Por definir'},
  {rowId:'8ccba231-bb3a-40e7-bbc9-f53c2159ee54', tarea:'Ingresar venta de cada vehiculo al PYG inmediatamente despues de cada venta', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Ingresos', fecha:'Permanente'},
  {rowId:'03c24783-1d5a-4a73-a604-d9c8a3df36ae', tarea:'Toma de la ciclovia — evento de running', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Operaciones', fecha:'Por definir'},
  {rowId:'e13225dc-8e63-469e-8ea0-a48aa8402af3', tarea:'Pedir a Mercedes 2 proveedores para digitalizar contratos', estado:'En curso', responsable:'Mateo', prioridad:'Media', area:'Operaciones', fecha:'Por definir'},
  {rowId:'227a5972-5b01-4a0c-86b0-398c1359f5ca', tarea:'Buscar opciones proveedores para digitalizacion del proceso de venta', estado:'Iniciativa', responsable:'Mateo', prioridad:'Alta', area:'Operaciones', fecha:'Por definir'},
  {rowId:'8dde068d-38dc-42ac-b875-c88445360642', tarea:'Pedir a Luli plan mensual y cierre de pauta', estado:'En curso', responsable:'Mateo', prioridad:'Alta', area:'Mercadeo', fecha:'Abr 17 2026'},
];

function normalize(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s—\-\/]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function diffClient(name, sbData, miroRows) {
  const miroMap = new Map(miroRows.map(r=>[normalize(r.tarea), r]));
  let updates=[], inserts=[], orphans=[];

  for (const [key, sb] of Object.entries(sbData)) {
    const miroRow = miroMap.get(key);
    if (miroRow) {
      const changes = [];
      if (normalize(miroRow.estado) !== normalize(sb.estado)) changes.push({columnTitle:'Estado', value:sb.estado});
      if (normalize(miroRow.responsable) !== normalize(sb.responsable)) changes.push({columnTitle:'Responsable', value:sb.responsable});
      if (normalize(miroRow.prioridad) !== normalize(sb.prioridad)) changes.push({columnTitle:'Prioridad', value:sb.prioridad});
      if (normalize(miroRow.area) !== normalize(sb.modulo)) changes.push({columnTitle:'Área', value:sb.modulo});
      if (sb.fecha && normalize(miroRow.fecha) !== normalize(sb.fecha)) changes.push({columnTitle:'Fecha límite', value:sb.fecha});
      if (changes.length > 0) updates.push({rowId:miroRow.rowId, tarea:miroRow.tarea.substring(0,50), cells:changes});
    } else {
      inserts.push(sb);
    }
  }

  for (const [key, miroRow] of miroMap) {
    if (!sbData[key]) orphans.push({rowId:miroRow.rowId, tarea:miroRow.tarea.substring(0,70)});
  }

  console.log('\n=== ' + name + ' ===');
  console.log('Supabase unique:', Object.keys(sbData).length, '| Miro rows:', miroRows.length);
  console.log('Updates:', updates.length, '| Inserts:', inserts.length, '| Orphans:', orphans.length);
  updates.forEach(u => console.log('  UPDATE', u.rowId.substring(0,8), u.tarea, '->', JSON.stringify(u.cells)));
  inserts.forEach(i => console.log('  INSERT:', i.orig ? i.orig.substring(0,60) : JSON.stringify(i).substring(0,60)));
  orphans.forEach(o => console.log('  ORPHAN:', o.rowId.substring(0,8), o.tarea));

  return {updates, inserts, orphans};
}

const acResult = diffClient('AC AUTOS', acSbData, acMiroRows);

// Output sync rows for AC Autos
const acSyncRows = [];
acResult.updates.forEach(u => acSyncRows.push({rowId:u.rowId, cells:u.cells}));
acResult.inserts.forEach(i => {
  acSyncRows.push({cells:[
    {columnTitle:'Tarea', value:i.orig},
    {columnTitle:'Estado', value:i.estado},
    {columnTitle:'Responsable', value:i.responsable},
    {columnTitle:'Prioridad', value:i.prioridad},
    {columnTitle:'Área', value:i.modulo},
    {columnTitle:'Fecha límite', value:i.fecha||''}
  ]});
});
console.log('\nAC AUTOS sync_rows payload:', JSON.stringify(acSyncRows, null, 2));
