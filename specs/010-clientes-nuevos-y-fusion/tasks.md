# Tareas 010 — Clientes nuevos desde el formulario y fusión de clientes

- **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)
- Formato: `- [ ] T### [P?] [HU-010-x?] Descripción — \`ruta\``
- `[P]` = paralelizable. Las pruebas van **antes** de la implementación (Artículo VII). Commit por tarea: `feat(010): T### …`.
- **Precondición**: ADR-0023 aceptado; spec 010 aprobada; spec 011 integrada en `main`; rama `feature/010-clientes-nuevos-y-fusion`.

## Fase 1 — Preparación

- [x] T001 Marcar la spec 010 como `En implementación` en `specs/README.md`
- [x] T002 **Spike S10** contra SharePoint real (`MineroIndustrial`): (a) crear en `Clientes` las columnas `ClienteGuid` y `NombreNormalizado` (texto, únicas, indexadas), `FusionadoConId` (número) y `CreadoDesdeApp` (Sí/No); (b) ¿la unicidad de una columna **de texto** es inmediata o llega tarde (como en `NumeroSolicitud`)?; (c) ¿se admiten varios valores vacíos en una columna única?; (d) filtrar `Servicios` por el lookup `Cliente` (`fields/ClienteLookupId eq N`); (e) `PATCH` de `ClienteLookupId` en un servicio; (f) consultar `Clientes` incluidos los `Activo = No`. Documentar en `docs/spikes/S10-clientes.md` y ajustar el plan si algo difiere. **Hecho** (`docs/spikes/S10-clientes.md`): la unicidad de texto es inmediata (se elimina la verificación posterior); el filtro por cliente exige indexar `Servicios.Cliente`
- [x] T003 [P] Textos i18n: agregar cliente, sugerencia del existente, errores de nombre, página y diálogo de fusión, resumen, avisos — `src/locales/es-CO/servicios.json`, `tecnico.json`

## Fase 2 — Fundamentos (bloquean las historias)

### Pruebas

- [ ] T004 [P] `normalizarNombre` («aris mining segovía» → `ARIS MINING SEGOVIA`), `tituloDeNombre` (conserva tildes), `validarNombre` (vacío, 101 caracteres), `resolverVigente` (cadena A→B→C, sin cambios, ciclo A→B→A se corta) — `src/domain/cliente.test.ts`
- [ ] T005 [P] Esquema: `Clientes` con las 4 columnas nuevas (únicas e indexadas las dos de texto), `Servicios.Cliente` **indexada** y `LogSincronizacion.Detalle`; el aprovisionamiento corrige columnas existentes y **rellena `NombreNormalizado`** de los clientes que ya existen sin pisar los demás datos — `src/infrastructure/graph/provisionSharepointGraph.test.ts`

### Implementación

- [ ] T006 Implementar `domain/cliente.ts` hasta pasar T004 — `src/domain/cliente.ts`
- [ ] T007 Esquema y aprovisionamiento hasta pasar T005; permiso _Colaborar_ del grupo de técnicos sobre `Clientes` en el script PowerShell — `scripts/esquema-sharepoint.mjs`, `provision-sharepoint-graph.mjs`, `provision-sharepoint.ps1`
- [ ] T008 [P] Emulador de Graph: lista `Clientes` con valor único inmediato (400 como el real), filtro de `Servicios` por `ClienteLookupId`, PATCH del lookup, ítems inactivos; con sus pruebas — `tests/fixtures/graph/emuladorGraph.ts`, `src/infrastructure/graph/emuladorGraph.clientes.int.test.ts`
- [ ] T009 [P] Puertos: `ClientesRemotos`, `Catalogos.fusionados` y `ClienteCatalogo.fusionadoCon`; el adaptador simulado — `src/application/ports/clientesRemotos.ts`, `remoteGateway.ts`, `src/infrastructure/graph/mockRemoteGateway.ts`

## Fase 3 — HU-010-1 Agregar un cliente nuevo al registrar un servicio (P1) 🎯 MVP

**Prueba independiente**: sin conexión, registrar un servicio con un cliente nuevo; al sincronizar el cliente existe una sola vez en SharePoint y el servicio queda asociado.

### Pruebas

- [ ] T010 [P] [HU-010-1] `agregarCliente`: sugiere el existente aunque cambien tildes, mayúsculas o espacios (ES-010-02); crea el pendiente con id negativo y guid (ES-010-01); no duplica entre pendientes; rechaza vacío y > 100 — `src/application/clientes/agregarCliente.int.test.ts`
- [ ] T011 [P] [HU-010-1] El refresco del catálogo **conserva** `clientesNuevos` y guarda `clientesFusionados` (ES-010-05, regla 1 de CLAUDE.md) — `src/application/setup/refrescarCatalogosSync.test.ts`
- [ ] T012 [P] [HU-010-1] `subirClientesNuevos`: crea el cliente (ES-010-03), es idempotente al reintentar, adopta el existente por nombre normalizado, sigue una fusión hasta el vigente, un choque de valor único (400) adopta el cliente existente buscándolo por guid y por nombre normalizado (ES-010-04), remapea los servicios (también los que ya tenían `sp` y `clienteId` sucio) y limpia el pendiente — `src/application/clientes/subirClientesNuevos.int.test.ts`
- [ ] T013 [P] [HU-010-1] Motor con emulador: crea el cliente **antes** de los servicios; un servicio cuyo cliente sigue temporal no se sube y queda pendiente; dos dispositivos con el mismo cliente nuevo terminan con un solo cliente — `src/application/sync/SyncEngine.clientes.int.test.ts`
- [ ] T014 [P] [HU-010-1] Gateway + emulador: `buscarPorGuid`, `buscarPorNormalizado` (ordenado por id), `crearCliente` y su choque de valor único — `src/infrastructure/graph/sharepointGateway.clientes.int.test.ts`
- [ ] T015 [P] [HU-010-1] El mapeador nunca escribe un `clienteId` ≤ 0 (ni en la creación ni como campo sucio) — `src/infrastructure/graph/mappers/servicioMapper.test.ts`
- [ ] T016 [P] [HU-010-1] `CampoCliente`: ofrece «Agregar», sugiere el existente, el cliente pendiente aparece como uno más y se puede elegir en otro servicio; `useClientes` une remotos y pendientes — `CampoCliente.test.tsx`, `src/infrastructure/db/hooks.test.ts`
- [ ] T017 [P] [HU-010-1] El respaldo exporta e importa `clientesNuevos` (un servicio con cliente temporal sobrevive a la restauración en otro dispositivo) — `src/application/respaldo/…test.ts`

### Implementación

- [ ] T018 [HU-010-1] `clientesLocales` (clave `clientesNuevos`, secuencia negativa en `meta`) y `agregarCliente` hasta pasar T010 — `src/application/clientes/`
- [ ] T019 [HU-010-1] Refresco del catálogo y mapeador de clientes (guid, fusionados, activos) hasta pasar T011 — `refrescarCatalogosSync.ts`, `mappers/catalogos.ts`
- [ ] T020 [HU-010-1] Gateway: implementar el puerto de clientes hasta pasar T014 — `sharepointGateway.ts`
- [ ] T021 [HU-010-1] `subirClientesNuevos` hasta pasar T012 — `src/application/clientes/subirClientesNuevos.ts`
- [ ] T022 [HU-010-1] Motor: paso `antesDelPush` y guarda de servicios con cliente temporal hasta pasar T013; conectarlo en el contenedor — `SyncEngine.ts`, `src/app/container.ts`
- [ ] T023 [P] [HU-010-1] Mapeador: ignorar `clienteId` ≤ 0 hasta pasar T015 — `servicioMapper.ts`
- [ ] T024 [HU-010-1] `useClientes()` y su uso en `CampoCliente`, `FiltrosServicios` y `AlertasPage`; `nombrePorCliente` del pull incluye pendientes y fusionados — `hooks.ts`, `pullServicios.ts`
- [ ] T025 [HU-010-1] UI de «Agregar cliente nuevo» (accesible, textos en i18n) hasta pasar T016 — `CampoCliente.tsx`
- [ ] T026 [HU-010-1] Respaldo con `clientesNuevos` hasta pasar T017 — `src/application/respaldo/`

**Punto de control**: ES-010-01 a ES-010-05 en verde con el emulador.

## Fase 4 — HU-010-2 Fusionar dos clientes (P2)

**Prueba independiente**: con dos clientes con servicios, fusionar uno en otro; todos los servicios quedan con el destino y el origen deja de ofrecerse.

### Pruebas

- [ ] T027 [P] [HU-010-2] `fusionarClientes`: reasigna todo y conserva el origen inactivo con `FusionadoConId` (ES-010-06); un corte a mitad se repite y termina sin duplicar (ES-010-07); rechaza origen = destino, destino ya fusionado (sigue la cadena) y sin rol Administrador; con sesión sin red no hace nada (ES-010-10); registra el detalle en la bitácora — `src/application/clientes/fusionarClientes.int.test.ts`
- [ ] T028 [P] [HU-010-2] `remapearFusionados`: cambia al vigente los servicios pendientes sin `sp` y con `clienteId` sucio sin perder ningún dato (ES-010-08); no toca los sincronizados — `src/application/clientes/remapearFusionados.test.ts`
- [ ] T029 [P] [HU-010-2] `ClientesPage`: solo la ve el Administrador (ES-010-09), elige origen y destino, confirma en un diálogo accesible, muestra avance y resumen y errores — `src/features/tecnico/ClientesPage.test.tsx`

### Implementación

- [ ] T030 [HU-010-2] Gateway: `listarServiciosDeCliente`, `reasignarServicio`, `desactivarFusionado`, `registrarDetalleLog` (con la columna `Detalle`) — `sharepointGateway.ts`
- [ ] T031 [HU-010-2] `fusionarClientes` (reanudable, concurrencia 3) hasta pasar T027 — `src/application/clientes/fusionarClientes.ts`
- [ ] T032 [HU-010-2] `remapearFusionados` y su llamada antes de subir y tras cada refresco hasta pasar T028 — `remapearFusionados.ts`, `SyncEngine.ts`
- [ ] T033 [HU-010-2] Página y diálogo de fusión, entrada en el menú técnico y ruta restringida hasta pasar T029 — `ClientesPage.tsx`, `FusionarClientesDialog.tsx`, `MenuTecnicoPage.tsx`, `src/app/routes`

**Punto de control**: ES-010-06 a ES-010-10 en verde con el emulador.

## Fase 5 — Verificación real y cierre

- [ ] T034 Prueba en vivo: dos dispositivos crean el mismo cliente nuevo a la vez (un solo cliente); fusión de 10 servicios con corte y reanudación; limpieza completa (clientes de prueba, servicios y entradas de bitácora) — `tests/live/sincronizacion-real.live.test.ts`
- [ ] T035 [P] E2E: sin red agregar un cliente y registrar → sincronizar → un solo cliente; fusión de clientes en modo simulado — `tests/e2e/clientes-nuevos.spec.ts`, `tests/e2e/fusion-clientes.spec.ts`
- [ ] T036 Aplicar las columnas nuevas y el permiso de escritura sobre `Clientes` en `MineroIndustrial` con el script y verificar — _requiere el secreto temporal; confirmar con el usuario_
- [ ] T037 [P] Documentación: `docs/03` §6.1, `docs/04`, `docs/06` (permisos y columnas), PRD, SDD, spec 003 (ES-003-05 reemplazada), ayuda in-app y `CHANGELOG.md`
- [ ] T038 `npm run verify` + DoD (`CLAUDE.md` §9) + spec 010 → `Implementada` y el índice de specs

## Dependencias

- T002 (hecho) antes de T020, T030.
- T004 → T006; T005 → T007; T008 y T009 antes de las pruebas de integración de la fase 3.
- T018 → T021 → T022; T019 y T020 antes de T021.
- La fase 4 depende de T020 y T022.
- T034 y T036 dependen de las fases 3 y 4.
