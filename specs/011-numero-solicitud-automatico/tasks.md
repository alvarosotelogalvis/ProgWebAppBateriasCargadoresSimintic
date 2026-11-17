# Tareas 011 — Número de solicitud automático

- **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)
- Formato: `- [ ] T### [P?] [HU-011-1?] Descripción — \`ruta\``
- `[P]` = paralelizable. Las pruebas van **antes** de la implementación (Artículo VII). Commit por tarea: `feat(011): T### …`.
- **Precondición**: specs 005 y 006 implementadas; ADR-0024 aceptado; rama `feature/011-numero-solicitud-automatico`.

## Fase 1 — Preparación

- [x] T001 Marcar la spec 011 como `En implementación` en `specs/README.md`
- [x] T002 **Spike S9** contra SharePoint real (`MineroIndustrial`, lista vacía): (a) volver única la columna `NumeroSolicitud` ya existente, (b) leer el mayor con `$orderby=fields/NumeroSolicitud desc&$top=1`, (c) el error de valor único al repetir un número, (d) lista vacía devuelve 0 ítems. Hecho: `docs/spikes/S9-numero-solicitud.md`. **Hallazgo: la unicidad llega 1–4 s tarde**, el plan se ajustó (verificación posterior)
- [x] T003 [P] Textos i18n: «Pendiente», aviso de serie repetida sin número, ayuda del número pendiente — `src/locales/es-CO/servicios.json`

## Fase 2 — Fundamentos (bloquean la historia)

### Pruebas

- [x] T004 [P] `generarCodigo` con número 0 → `BAT-PEND-NV4520`; con número → `BAT-42-NV4520` — `src/domain/codigo.test.ts`
- [x] T005 [P] `siguienteNumero` (null, 0, 41 → 42), `esPendiente` — `src/domain/sync/numeroSolicitud.test.ts`
- [x] T006 [P] `esquemaRecepcion` acepta un servicio sin número; `camposEditables` de RECIBIDO ya no incluye `numeroSolicitud`; `estadoCoherente` no lo exige — `src/domain/validaciones.test.ts`, `estados.test.ts`, `merge.test.ts`

### Implementación

- [x] T007 Implementar `numeroSolicitud.ts` y el código con «PEND» hasta pasar T004–T005 — `src/domain/`
- [x] T008 Quitar `numeroSolicitud` de validaciones, campos editables de recepción y mínimos de RECIBIDO hasta pasar T006 — `src/domain/validaciones.ts`, `estados.ts`, `merge.ts`
- [x] T009 [P] Emulador de Graph: valor único en `NumeroSolicitud` (400 como el real) y orden descendente por ese campo — `tests/fixtures/graph/emuladorGraph.ts`

## Fase 3 — HU-011-1 El número se asigna al sincronizar (P1) 🎯 MVP

**Prueba independiente**: registrar un servicio sin conexión, sincronizar y ver que recibe el siguiente consecutivo.

### Pruebas

- [ ] T010 [P] [HU-011-1] `pushServicio`: asigna máximo+1 (ES-011-02), empieza en 1 (ES-011-03), adopta el número del ítem ya existente (ES-011-06), reintenta ante choque de número y agota los intentos con error reintentable (ES-011-05), **y la verificación posterior: si tras crear hay otro ítem con el mismo número, gana el de menor id y el otro se renumera** — `src/application/sync/pushServicio.numero.int.test.ts`
- [ ] T011 [P] [HU-011-1] Motor: dos pendientes reciben consecutivos en el orden registrado (ES-011-04); un corte tras asignar conserva el número (ES-011-06); el servicio queda con código definitivo — `src/application/sync/SyncEngine.numero.int.test.ts`
- [ ] T012 [P] [HU-011-1] Gateway + emulador: `ultimoNumeroSolicitud` (0 si vacío) y distinción entre choque de `ServicioId` y de `NumeroSolicitud` — `src/infrastructure/graph/sharepointGateway.numero.int.test.ts`
- [ ] T013 [P] [HU-011-1] Buscador: encuentra un servicio pendiente por serie y no indexa «0» (ES-011-09); advertencia por serie repetida en servicios no finales — `src/application/servicios/buscarServicios.test.ts`
- [ ] T014 [P] [HU-011-1] Componentes: el formulario no tiene campo de número (ES-011-01); el detalle muestra «Pendiente» y luego el número, sin edición (ES-011-08); `camposCorregibles` sin `numeroSolicitud` — `FormRecepcion.test.tsx`, `DetalleServicioPage.test.tsx`, `camposCorregibles.test.ts`

### Implementación

- [ ] T015 [HU-011-1] Puerto `ultimoNumeroSolicitud` y `contarPorNumeroSolicitud`/`renumerarServicio`, adaptador (`sharepointGateway`) con `SP_NUMERO_DUPLICADO` — `src/application/ports/RemoteGatewayPush.ts`, `src/infrastructure/graph/sharepointGateway.ts`
- [ ] T016 [HU-011-1] `pushServicio`: asignación, reintento acotado con pausa inyectable, adopción del número existente y verificación posterior — `src/application/sync/pushServicio.ts`
- [ ] T017 [HU-011-1] Motor: `fusionarConLaBase` guarda `numeroSolicitud`, `codigo` y `base` — `src/application/sync/SyncEngine.ts`
- [ ] T018 [P] [HU-011-1] Mapeadores: la creación omite `NumeroSolicitud = 0` y recalcula `Title` — `src/infrastructure/graph/mappers/servicioMapper.ts`
- [ ] T019 [P] [HU-011-1] Buscador y duplicados por serie — `src/application/servicios/buscarServicios.ts`, `EtapaRecepcionPage.tsx`
- [ ] T020 [HU-011-1] UI: quitar el campo del formulario, «Pendiente» en el detalle y sacar el campo de las correcciones — `FormRecepcion.tsx`, `DetalleServicioPage.tsx`, `camposCorregibles.ts`
- [ ] T021 [P] [HU-011-1] Esquema y aprovisionamiento: `NumeroSolicitud` única; el script la aplica también a una columna ya existente (PATCH), avisa si hay repetidos y verifica la unicidad por comportamiento (no solo por `enforceUniqueValues`) — `scripts/esquema-sharepoint.mjs`, `scripts/provision-sharepoint-graph.mjs` (+ su prueba)

**Punto de control**: ES-011-01 a ES-011-09 en verde con el emulador.

## Fase 4 — Verificación real y cierre

- [ ] T022 Ampliar la prueba en vivo: dos dispositivos suben 5 servicios cada uno a la vez; los 10 números son únicos y consecutivos (CE-011-01); limpieza completa — `tests/live/sincronizacion-real.live.test.ts`
- [ ] T023 [P] E2E offline: registrar sin conexión → «Pendiente» → sincronizar → número visible — `tests/e2e/numero-solicitud.spec.ts`
- [ ] T024 [P] Verificar con el script que `MineroIndustrial` conserva la columna única (ya aplicada en el spike S9) y repetirlo en DEV/PRD nuevos — _requiere el secreto temporal; confirmar con el usuario_
- [ ] T025 [P] Documentación: `docs/03` §2.2, `docs/04`, `docs/06`, PRD PA-07 (reemplazada por ADR-0024), SDD, nota en spec 003 (ES-003 del número), ayuda in-app, `CHANGELOG.md`
- [ ] T026 `npm run verify` + DoD (`CLAUDE.md` §9) + spec 011 → `Implementada` y el índice de specs

## Dependencias

- T002 (hecho) antes de T015–T016.
- T004–T006 antes de T007–T008; T009 antes de T010–T012.
- T015 → T016 → T017; T018–T021 pueden ir en paralelo tras T015.
- T022 y T024 dependen de T015–T021.
