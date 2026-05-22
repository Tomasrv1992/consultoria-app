-- ===================================================================
-- FINAL SYNC SQL — generated 2026-04-29T13:11:07.206Z
-- Reflects post-meeting state of Dentilandia (April 22 + Tomás manual edits)
-- + pending orphan migrations for AC Autos, Paulina, Lativo.
-- Run ONCE in Supabase SQL Editor.
-- ===================================================================

-- 1. MIGRATION: miro_row_id column
alter table public.tasks
  add column if not exists miro_row_id text;
create index if not exists tasks_miro_row_id_idx
  on public.tasks(miro_row_id) where miro_row_id is not null;

-- 2. DEDUP: remove duplicates per (client_id, lower(titulo)). Keeps oldest.
with ranked as (
  select id, client_id, titulo,
    row_number() over (
      partition by client_id, lower(trim(titulo))
      order by fecha_ingreso asc nulls last, created_at asc
    ) as rn
  from public.tasks
  where client_id in ('client-dentilandia', 'client-acautos', 'client-paulina')
)
delete from public.tasks
where id in (select id from ranked where rn > 1);

-- 3. DENTILANDIA — DELETE 31 tasks Tomás removed from Miro during 2026-04-22 cleanup
delete from public.tasks
where client_id = 'client-dentilandia'
  and lower(trim(titulo)) in (
    'declaración de renta (20 mayo) — industria y comercio municipios, solicitar factura',
    'abrir centro de costo en seguridad social (fabricato y américas)',
    'monitorear cámaras con audio aleatoriamente',
    'enviar y recolectar firmas comunicado procedimientos autorizados/no autorizados',
    'reorganizar agenda lunes am por corte recepción',
    'conseguir aspiradora para corte recepción (domingo)',
    'diseñar campaña reseñas google business — meta 50/mes',
    'rotar auxiliares entre doctoras y sedes',
    'cargar consentimiento arturo 11',
    'programar auditorías clínicas mensuales — 1 por sede desde abril',
    'configurar pago cloud con tarjeta e iniciar uso de ia',
    'preparar contenido pantallas américas/fabricato — coordinar con lucao',
    'abrir centros de costos seguridad social fabricato y américas',
    'crear tabla de ventas por servicio en cloud — compartir próxima semana',
    'batas de las doctoras',
    'actualizar inventario seguros con valores comerciales — agregar rc américas',
    'estrategia emocional para el equipo — ambiente por ellas mismas',
    'coordinar con vladimir piloto coronas pmma en américas o fabricato',
    'analizar costos horas extra y modelar soluciones — supernumerario/turnos',
    'estrategia nueva de mercadeo en redes para dentilandia.',
    'conciliación libros oficiales - carlos',
    'recontactar bancolombia — certificado cancelación cuenta la dentijería',
    'enviar inventario contable por sede + contacto ceferino imax a jorge',
    'arreglos dentilandia — carpintería mueble, pintura consultorio (ok)',
    'yiyo — indumentaria, cotización modista, toma de medidas',
    'investigar opciones inversión mayor rendimiento en bancolombia',
    'obtener cotización mensajero para habilitaciones doctores',
    'definir y comunicar a doctoras: tope 2/jornada, 20 min/cita, no reprogramar',
    'encuesta de satisfaccion del usuario 6 ultimos meses',
    'reuniones semanales con nuevas colaboradoras para seguimiento y feedback',
    'alvaro abogado — vinculación laboral, horas extras, manejo especialistas'
  );

-- 4. DENTILANDIA — INSERT 49 tasks present in Miro but missing in Supabase
insert into public.tasks (client_id, titulo, modulo, categoria, responsable, prioridad, fecha_limite, estado, miro_row_id, fecha_ingreso) values
  ('client-dentilandia', 'Enviar a Carlos PDFs de renta/conciliación diligenciados', 'Gestión interna', 'gestion', 'Lina', 'Alta', null, 'En curso', '52357e96-6d2c-49e1-b27f-1f41a8d7ffdd', '22/04/2026'),
  ('client-dentilandia', 'Enviar a Jorge permisos de API B2Chat; luego solicitar API y agendar reunión con Eliana', 'Operaciones', 'operaciones', 'Tomás', 'Alta', null, 'En curso', '4fe8e51b-e34f-4114-b2f5-23b3ea2028d5', '22/04/2026'),
  ('client-dentilandia', 'Enviar diseños de uniformes a Gloria; solicitar cotización', 'Operaciones', 'operaciones', 'Gerencia', 'Media', null, 'En curso', '30f72067-e997-4fb9-b258-38909930674c', '22/04/2026'),
  ('client-dentilandia', 'Recalcular costos horas extra por salario e IBC', 'Gestión interna', 'gestion', 'Lina', 'Alta', 'Abr 16 2026', 'En curso', 'ed913de8-cadd-4b6a-92ba-52401d4de233', '15/04/2026'),
  ('client-dentilandia', 'Averiguar dónde comprar naipes de mensajes para urnas', 'Gestión interna', 'gestion', 'Gerencia', 'Baja', null, 'En curso', '3749d853-0916-418f-9467-7214389cdd1f', '22/04/2026'),
  ('client-dentilandia', 'Corregir video institucional: quitar ''Claravilla'' en inicio/final', 'Mercadeo', 'mercadeo', 'Gerencia', 'Media', null, 'En curso', '7db72c3c-8f81-469c-a80e-caaac8886eea', '22/04/2026'),
  ('client-dentilandia', 'Renovación de marca Provimarca — pendiente firma Dra. Clara', 'Mercadeo', 'mercadeo', 'Jorge', 'Alta', 'Por definir', 'En curso', 'ff1667da-7617-4094-96f7-71bbcd785cb3', '15/04/2026'),
  ('client-dentilandia', 'Crear campaña para recaudar reseñas de Google Business', 'Mercadeo', 'mercadeo', 'Jorge', 'Alta', '29/04/2026', 'En curso', '1bb8f9c7-7996-4c10-a116-edcc58a90539', '15/04/2026'),
  ('client-dentilandia', 'Diseñar y arrancar CARDEX para Cuenta 2 desde enero 1 2026', 'Contabilidad', 'gestion', 'Lina', 'Alta', 'Abr 22 2026', 'En curso', 'c9422382-19ef-47f1-8c77-bfbcca42634d', '15/04/2026'),
  ('client-dentilandia', 'Enviar a Jorge template Miro parrilla de contenido', 'Mercadeo', 'mercadeo', 'Tomás', 'Alta', 'Abr 16 2026', 'En curso', '2dbfdab1-baa6-473f-a4b6-75ee81cc531b', '15/04/2026'),
  ('client-dentilandia', 'Enviar tutoriales YouTube Claude/IA a Lina', 'Gestión interna', 'gestion', 'Tomás', 'Media', 'Abr 16 2026', 'En curso', '3312729e-7515-440a-a99a-d4e1dd183267', '15/04/2026'),
  ('client-dentilandia', 'Agendar reunión con Tomás para revisar cuenta 2 del estudio de costos', 'Ingresos', 'ingresos', 'Gerencia', 'Alta', null, 'En curso', '3cc6f7ab-5607-4cb7-8c30-eb19e6b59021', '22/04/2026'),
  ('client-dentilandia', 'Arreglos Dentilandia — carpintería', 'Operaciones', 'operaciones', 'Jorge', 'Media', 'Por definir', 'En curso', '2ee696a2-5f15-454a-9a28-c33dd897167c', '15/04/2026'),
  ('client-dentilandia', 'Confirmar comité presencial 6 de mayo — agendar', 'Gestión interna', 'gestion', 'Jorge', 'Alta', 'Por definir', 'En curso', '559bd4ab-0c8c-4e70-b78d-27f95369489c', '15/04/2026'),
  ('client-dentilandia', 'Enviar foto de Gillo con nuevo vestuario a Tomás, Lina, Clara', 'Mercadeo', 'mercadeo', 'Gerencia', 'Baja', null, 'En curso', '1dcd2c20-bf6c-48eb-b309-5117188f31e3', '22/04/2026'),
  ('client-dentilandia', 'Redactar acta de retroalimentación a Melisa', 'Gestión interna', 'gestion', 'Gerencia', 'Alta', null, 'En curso', '9219d6ff-37e0-437c-9eec-97d18b5b6067', '22/04/2026'),
  ('client-dentilandia', 'Redactar y comunicar política de gotas en valoraciones; solicitar firma', 'Operaciones', 'operaciones', 'Gerencia', 'Alta', null, 'En curso', '03abf4a2-8dcc-4d23-9171-1d96a3363fac', '22/04/2026'),
  ('client-dentilandia', 'Llamar a Santiago — correcciones video presentación (notas de Clara)', 'Mercadeo', 'mercadeo', 'Jorge', 'Alta', 'Abr 16 2026', 'En curso', '7b742445-3692-43af-9a5b-98b53d910c8f', '15/04/2026'),
  ('client-dentilandia', 'Equipo de trabajo — preguntas interrupción, comité asesor, clima organizacional', 'Gestión interna', 'gestion', 'Jorge', 'Alta', 'Abr 8 2026', 'Iniciativa', '0a32c845-8c76-4148-a2f4-dae1ae925166', '15/04/2026'),
  ('client-dentilandia', 'Realizar auditoría interna en Américas', 'Operaciones', 'operaciones', 'Gerencia', 'Alta', 'Sem Abr 27 2026', 'En curso', 'e8873c1c-3403-41c5-be84-fbac31a34c21', '22/04/2026'),
  ('client-dentilandia', 'Actualizar política de reparaciones: sin impresión 2.5×, con impresión 3×; mínimo 270k', 'Operaciones', 'operaciones', 'Gerencia', 'Alta', null, 'En curso', 'c62d3514-c471-4778-8aeb-6b6a92478a59', '22/04/2026'),
  ('client-dentilandia', 'Realizar auditoría interna en Bello', 'Operaciones', 'operaciones', 'Gerencia', 'Alta', 'Abr 23 2026', 'En curso', '65fb941e-1ad5-4c39-9546-0ca729cbd497', '22/04/2026'),
  ('client-dentilandia', 'Coordinar con Santiago logística medición riesgo psicosocial (sede remota)', 'Gestión interna', 'gestion', 'Jorge', 'Media', 'Por definir', 'En curso', 'be209a0d-b283-4a2b-8e59-22149a46f3fa', '15/04/2026'),
  ('client-dentilandia', 'Definir y comprar obsequios educativos para Día de los Niños', 'Mercadeo', 'mercadeo', 'Gerencia', 'Media', 'May 29-30 2026', 'En curso', 'bfb2590c-c67a-46d6-aca5-2045067c0c40', '22/04/2026'),
  ('client-dentilandia', 'Enviar carta a fiduciaria para cierre de Fidu Cuenta', 'Gestión interna', 'gestion', 'Lina', 'Alta', null, 'En curso', '56d53c03-8d7f-47d5-b02c-ff3b7134c962', '22/04/2026'),
  ('client-dentilandia', 'Diseñar campaña reseñas Google Business — meta 50/mes + Confirmar kit dental INVIMA — pedir 500-1000 unidades', 'Mercadeo', 'mercadeo', 'Jorge', 'Alta', 'Abr 30 2026', 'En curso', 'b3217e81-97bc-4403-b1da-69f4fb3e249e', '15/04/2026'),
  ('client-dentilandia', 'Coordinar con Dr. Álvaro cita presencial UGPP (Medellín) con radicado', 'Gestión interna', 'gestion', 'Lina', 'Alta', 'Por definir', 'En curso', '43f0d4a7-f97a-4857-9610-22555231516f', '15/04/2026'),
  ('client-dentilandia', 'Comprimir video institucional para portarretratos; coordinar con Dentistería rotación en TVs', 'Mercadeo', 'mercadeo', 'Gerencia', 'Media', null, 'En curso', 'b2393b27-1b4b-478c-97d3-64c3921badc8', '22/04/2026'),
  ('client-dentilandia', 'Enviar a contabilidad comunicado de reposiciones de caja menor; avisar en grupo', 'Gestión interna', 'gestion', 'Gerencia', 'Media', null, 'En curso', '2c6d2f38-e87e-4db7-b128-03859607a61d', '22/04/2026'),
  ('client-dentilandia', 'Asamblea: Enviar bitácora de diferencias EF firmados vs excel', 'Contabilidad', 'gestion', 'Lina', 'Alta', 'Por definir', 'Iniciativa', 'e66c9cf2-081b-410e-80f3-893667b1f171', '15/04/2026'),
  ('client-dentilandia', 'Enviar link de reunión 11:00 a Carlos', 'Operaciones', 'operaciones', 'Lina', 'Media', null, 'En curso', '4f45484a-5c05-486e-b960-36edd6b6bb8e', '22/04/2026'),
  ('client-dentilandia', 'Porta retratos — crear imágenes, videos y demás de porta retratos de las marcas - Ray consigue soportes.', 'Mercadeo', 'mercadeo', 'Jorge', 'Media', '15/05/2026', 'En curso', 'cbac465d-633b-482d-acad-0228434bd809', '15/04/2026'),
  ('client-dentilandia', 'Iniciar seguimientos semanales con el equipo — próxima semana', 'Gestión interna', 'gestion', 'Jorge', 'Alta', 'Abr 22 2026', 'En curso', '574d9b87-64d3-4da2-8315-501680e337da', '15/04/2026'),
  ('client-dentilandia', 'Batas de las auxiliares — cotización a 105.000 / falta tomar medidas en DCA', 'Gestión interna', 'gestion', 'Jorge', 'Baja', '30/05/2026', 'En curso', 'fc510c5a-6c8b-4660-9b73-caa288535376', '15/04/2026'),
  ('client-dentilandia', 'Enviar a Tomás fotos de urnas de bienestar para aprobación', 'Gestión interna', 'gestion', 'Gerencia', 'Media', null, 'En curso', 'be807ac1-ec61-44ae-989e-3a121ce2eb6a', '22/04/2026'),
  ('client-dentilandia', 'Agendar reunión IA con Eliana (Bituchat) y Tomás — Apr 16 11:00 - Oral drive envia el API', 'Gestión interna', 'gestion', 'Jorge', 'Alta', 'Abr 16 2026', 'En curso', 'e88e03b8-eae2-458a-82e2-a7b2446c76bb', '15/04/2026'),
  ('client-dentilandia', 'Enviar a Gladys CC 150% de Daniela; consultar con Santiago modalidad ARL; afiliar/pagar', 'Gestión interna', 'gestion', 'Gerencia', 'Alta', null, 'En curso', '59650535-f5aa-4c57-ada9-9f926eee5150', '22/04/2026'),
  ('client-dentilandia', 'Agendar medición de riesgo psicosocial', 'Gestión interna', 'gestion', 'Gerencia', 'Media', 'May 20-21 2026', 'En curso', '5695e2bc-f7eb-4a53-a956-76f7d06f570a', '22/04/2026'),
  ('client-dentilandia', 'Reenviar formularios de habilitación con dirección corregida', 'Operaciones', 'operaciones', 'Gerencia', 'Alta', null, 'En curso', 'e1a3355c-cc6d-4fdf-8f2e-8113c2b2a7f5', '22/04/2026'),
  ('client-dentilandia', 'Reprogramar capacitación con Santiago para junio', 'Gestión interna', 'gestion', 'Gerencia', 'Media', 'Jun 2026', 'En curso', 'a784bc81-4863-469a-830e-67253143a42f', '22/04/2026'),
  ('client-dentilandia', 'Agregar Código contable y Concepto a informes financieros mensuales', 'Contabilidad', 'gestion', 'Lina', 'Alta', 'Por definir', 'En curso', 'a759bc19-e860-488b-85e2-d6ca70f8b7d8', '15/04/2026'),
  ('client-dentilandia', 'Reanudar rotación semanal auxiliares recepción — consultorio', 'Gestión interna', 'gestion', 'Jorge', 'Alta', 'Por definir', 'Iniciativa', '55e1fade-cdd4-462b-9760-48c63e9b9ce8', '15/04/2026'),
  ('client-dentilandia', 'Solicitar factura electrónica a Dentilandia (3.5% retención) — pagar 50% abril 50% mayo', 'Gestión interna', 'gestion', 'Tomás', 'Alta', 'Abr 30 2026', 'En curso', '47fbf345-1075-4609-8a80-5325fead981d', '15/04/2026'),
  ('client-dentilandia', 'Firmar documento en notaría; informar en chat; coordinar transferencia de 25M', 'Gestión interna', 'gestion', 'Gerencia', 'Alta', null, 'En curso', 'b7b993b9-8e0e-4e55-b850-1ee0f1fb7e2f', '22/04/2026'),
  ('client-dentilandia', 'Instruir a Andrés que copie a Jorge/comité en reportes de auditoría', 'Gestión interna', 'gestion', 'Clara', 'Alta', 'Por definir', 'En curso', 'e260a5a2-d41f-40c0-b95f-0c886119ac90', '15/04/2026'),
  ('client-dentilandia', 'Alvaro Abogado — vinculación laboral, horas extras, manejo especialistas - Cuadrar fecha?', 'Gestión interna', 'gestion', 'Jorge', 'Alta', 'Por definir', 'En curso', 'c4f43ad2-1eed-4a9b-b537-0d395e9e575f', '15/04/2026'),
  ('client-dentilandia', 'Medición de riesgo psicosocial y clima organizacional - Se programa para mayo de 2026', 'Gestión interna', 'gestion', 'Jorge', 'Media', 'Mayo 30 2026', 'En curso', '6b821609-dd75-44e7-b1c7-f9e12deb2db6', '15/04/2026'),
  ('client-dentilandia', 'Confirmar a Luz (MAFRE) compra póliza contado — iniciar trámites - Entrega poliza el 24 de abril.', 'Gestión interna', 'gestion', 'Jorge', 'Alta', 'Abr 16 2026', 'En curso', '8e5e3ebd-27a4-4cf8-ae8d-5bf072a66ed9', '15/04/2026'),
  ('client-dentilandia', 'Conciliación libros oficiales — Carlos', 'Gestión interna', 'gestion', 'Lina', 'Alta', 'Por definir', 'Iniciativa', 'cba18fe5-d795-44f7-a6b1-569415697ab1', '15/04/2026');

-- 5. client-acautos — INSERT 10 orphans (Miro tasks missing in Supabase)
insert into public.tasks (client_id, titulo, modulo, categoria, responsable, prioridad, fecha_limite, estado, miro_row_id, fecha_ingreso) values
  ('client-acautos', 'Agendar reunión presencial Medellín (21 abril) con Tomás y Luli', 'Gestión interna', 'gestion', 'Mateo', 'Alta', 'Abr 21 2026', 'En curso', 'b241b243-adc8-4010-9625-1b6c1600ab52', now()),
  ('client-acautos', 'Reunirse con Luli (17 abril) — pauta/captación — definir plan ciclovía 3 meses con Tomás', 'Mercadeo', 'mercadeo', 'Mateo', 'Alta', 'Abr 17 2026', 'En curso', '187d99b9-19db-48d0-ba2c-6acbddd44358', now()),
  ('client-acautos', 'Lanzar campaña ''Tráigame un carro y se lo compramos hoy''', 'Mercadeo', 'mercadeo', 'Mateo', 'Alta', 'Por definir', 'En curso', 'f1e5dbc2-da55-4907-8948-8b766d087787', now()),
  ('client-acautos', 'Definir y comunicar meta de captación mensual — 60 carros/mes', 'Ingresos', 'ingresos', 'Mateo', 'Alta', 'Por definir', 'En curso', '65b2c4c4-9241-4781-83b9-356c4db796b1', now()),
  ('client-acautos', 'Calcular y enviar a Mateo monto adeudado de factura', 'Ingresos', 'ingresos', 'Tomás', 'Alta', 'Por definir', 'En curso', 'c563b52b-c6df-489b-8be4-a9013f86f7c5', now()),
  ('client-acautos', 'Definir formato de registro compras propias en PYG — luego registrar compras', 'Ingresos', 'ingresos', 'Mateo', 'Alta', 'Por definir', 'En curso', '1b5afc1b-a0d7-4685-9991-fb665b3dc0cf', now()),
  ('client-acautos', 'Revisar con Luli sitio web — decidir reforma o reasignar presupuesto', 'Mercadeo', 'mercadeo', 'Mateo', 'Alta', 'Por definir', 'En curso', 'ec562531-f995-4308-bf39-c17d18c11785', now()),
  ('client-acautos', 'Pedir a Camilo investigar curso de estrategia/conversión — evaluar compra mes 2', 'Gestión interna', 'gestion', 'Mateo', 'Media', 'Por definir', 'En curso', '3c2c9df7-b7f5-4efd-8b29-91ee7c9c784d', now()),
  ('client-acautos', 'Pedir a Mercedes 2 proveedores para digitalizar contratos', 'Operaciones', 'operaciones', 'Mateo', 'Media', 'Por definir', 'En curso', 'e13225dc-8e63-469e-8ea0-a48aa8402af3', now()),
  ('client-acautos', 'Pedir a Luli plan mensual y cierre de pauta', 'Mercadeo', 'mercadeo', 'Mateo', 'Alta', 'Abr 17 2026', 'En curso', '8dde068d-38dc-42ac-b875-c88445360642', now());

-- 5. client-paulina — INSERT 7 orphans (Miro tasks missing in Supabase)
insert into public.tasks (client_id, titulo, modulo, categoria, responsable, prioridad, fecha_limite, estado, miro_row_id, fecha_ingreso) values
  ('client-paulina', 'Comprar gramera y vasos desechables para calibrar yeso', 'Operaciones', 'operaciones', 'Paulina', 'Baja', 'Por definir', 'En curso', 'ee5f5f8f-187c-4983-b61e-bf602625c174', now()),
  ('client-paulina', 'Leidy — rotular cajones, planilla esterilización, planilla atención, plan residuos, agenda Paulina', 'Operaciones', 'operaciones', 'Paulina', 'Alta', 'Por definir', 'Iniciativa', 'bc446742-0e21-4b15-bde2-6f0ce56008ae', now()),
  ('client-paulina', 'Solicitar a ortodoncista contrato de ortodoncia — adaptar cláusula no-reembolso', 'Gestión interna', 'gestion', 'Tomás', 'Alta', 'Por definir', 'En curso', '9e3439af-1770-44a8-aad8-b1fa2dedf159', now()),
  ('client-paulina', 'Implementar cierre de caja: base 100k, imprimir/firmar, conciliar Volt/banco — actualizar manual', 'Operaciones', 'operaciones', 'Paulina', 'Alta', 'Por definir', 'En curso', '731ffde3-a733-49dc-845a-8ff512f8fbde', now()),
  ('client-paulina', 'Documentar paso a paso de habilitación en Dentalink (RIVS, T/H, frecuencias)', 'Operaciones', 'operaciones', 'Paulina', 'Alta', 'Por definir', 'En curso', '73bf4bf8-d9df-43e2-a878-51a55268e8c4', now()),
  ('client-paulina', 'Circular pieza de alquiler de consultorio (71k/h) en grupos de odontólogos', 'Mercadeo', 'mercadeo', 'Paulina', 'Media', 'Por definir', 'En curso', 'a048b1bc-50b6-4083-8de6-ec0a0669460f', now()),
  ('client-paulina', 'Crear pestaña de rentabilidad por producto (Brumas, limpiadores, jabones)', 'Ingresos', 'ingresos', 'Tomás', 'Alta', 'Por definir', 'En curso', '3d8b3d1e-df33-43be-8a40-4c6a8c8b014d', now());

-- 5. c5 — INSERT 5 orphans (Miro tasks missing in Supabase)
insert into public.tasks (client_id, titulo, modulo, categoria, responsable, prioridad, fecha_limite, estado, miro_row_id, fecha_ingreso) values
  ('c5', 'Investigar pagos en USD (Stripe/Payoneer) + carga tributaria', 'Operaciones', 'operaciones', 'Mliesa', 'Alta', 'Abr 29 2026', 'En curso', '059ba7f2-1568-4b89-9747-654aa227b235', now()),
  ('c5', 'Compartir tablero de Miro con Melissa (acceso de edición)', 'Operaciones', 'operaciones', 'Tomás', 'Alta', 'Abr 22 2026', 'Completada', '097c80b0-4148-4333-b6aa-dcb83da8c50d', now()),
  ('c5', 'Enviar tutoriales de automatización con IA (Claude) para presentaciones', 'Operaciones', 'operaciones', 'Tomás', 'Media', 'Abr 29 2026', 'Completada', '9cc98644-ed71-4b43-9999-1cd92f64bc29', now()),
  ('c5', 'Enviar las 12 preguntas ancla previas a la Sesión 2', 'Operaciones', 'operaciones', 'Tomás', 'Alta', 'Abr 27 2026', 'En curso', 'cc2c35ec-6590-4ce9-894b-16ddc1f378de', now()),
  ('c5', 'Revisar las preguntas pre-sesión y completar tareas en Miro', 'Operaciones', 'operaciones', 'Melissa', 'Alta', 'Abr 29 2026', 'En curso', '01523a9c-4fc3-44bf-825a-471d4f30aaab', now());

-- 6. VERIFICATION
select client_id, estado, count(*) as total
from public.tasks
group by client_id, estado
order by client_id, estado;
