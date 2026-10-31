# Tareas 005 — Sincronización: subida (push)

- **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)
- Formato: `- [ ] T### [P?] [HU-005-x?] Descripción — \`ruta\``
- `[P]` = paralelizable. Las pruebas van antes que la implementación (Artículo VII). Commit por tarea: `feat(005): T### …`.
- **Precondición**: specs 003 (servicios y adjuntos `pending`) y 004 (`AuthPort`, `graphClient`, `sharepointGateway` con resolución de sitio y catálogos) implementadas. Resultados de los spikes S1, S3 y S7 documentados.

## Fase 1 — Preparación

- [x] T001 Crear la rama `feature/005-sincronizacion-push` y marcar la spec como `En implementación` en `specs/README.md`
- [x] T002 [P] Namespace i18n `sync` (estados, mensajes por `CodigoError`, resumen, aviso, recordatorio) — `src/locales/es-CO/sync.json`
- [x] T003 [P] Emulador de Graph en memoria (listas con `ServicioId` único, eTag por ítem, drive con carpetas, upload sessions) con fallas inyectables `failNext(status, headers)`, `dropConnectionAfter(bytes)`, `etagMismatch()` — `tests/fixtures/graph/emuladorGraph.ts`, `handlers.ts`

## Fase 2 — Fundamentos (bloquean las historias)

### Pruebas

- [x] T004 [P] Pruebas de `clasificarError` con la tabla de SDD §9.6 — `src/domain/sync/errores.test.ts`
- [x] T005 [P] Pruebas de backoff (`retrasoEnEjecucion` con jitter inyectado, `proximoIntento`, `MAX_INTENTOS_AUTOMATICOS`) — `src/domain/sync/backoff.test.ts`
- [x] T006 [P] Pruebas de `rutaCarpeta` y `nombreArchivo` (año, sanitización de caracteres) — `src/domain/sync/rutas.test.ts`
- [x] T007 [P] Pruebas de `compararSemver` — `src/domain/sync/version.test.ts`
- [x] T008 [P] Pruebas de ida y vuelta de `servicioMapper` y `choices` (T-05: fechas de solo fecha, lookup de cliente, Choice desconocido, nunca `OTCorreoEnviado`/`AlertaVidaUtilNivel`) — `src/infrastructure/graph/mappers/servicioMapper.test.ts`

### Implementación

- [x] T009 Implementar `errores.ts`, `backoff.ts`, `rutas.ts` y `version.ts` hasta pasar T004–T007 — `src/domain/sync/`
- [x] T010 Implementar `servicioMapper.ts` y `choices.ts` hasta pasar T008 — `src/infrastructure/graph/mappers/`

## Fase 3 — HU-005-2 Subida confiable sin duplicados (P1) 🎯 MVP

**Prueba independiente**: ES-005-07…13 contra el emulador y luego contra DEV.

### Pruebas

- [ ] T011 [P] [HU-005-2] Integración de uploads: simple ≤ 4 MB; sesión por fragmentos de 3 200 KiB; reanudar desde `siguienteByte` tras reinicio; sesión expirada → nueva (T-11) — `src/infrastructure/graph/uploads.int.test.ts`
- [ ] T012 [P] [HU-005-2] Integración del push: caso feliz con log (T-09); red caída a mitad de un archivo (T-10); 409 al crear → búsqueda (T-12); 412 → resolutor y los demás continúan (T-15, parte push); edición local durante la subida no se pierde; eliminar el adjunto remoto — `src/application/sync/SyncEngine.push.int.test.ts`
- [ ] T013 [P] [HU-005-2] Integración de errores: 429 con `Retry-After` y 8 fallos → error manual (T-13); 401 → silent → redirect pedido y 403 no reintentable (T-14); 404 de lista → abortar con CONFIGURACION — `src/application/sync/SyncEngine.errores.int.test.ts`

### Implementación

- [ ] T014 [HU-005-2] Ampliar el puerto `RemoteGateway` con las operaciones de push (SDD §4.3) y su `ConflictoError` — `src/application/ports/RemoteGateway.ts`
- [ ] T015 [HU-005-2] `uploads.ts`: subida simple y upload session reanudable que persiste el avance tras cada fragmento (sin `Authorization` en `uploadUrl`) — `src/infrastructure/graph/uploads.ts`
- [ ] T016 [HU-005-2] `sharepointGateway`: `buscarServicioPorId`, `crearServicio` (409 → búsqueda), `actualizarServicio` con `If-Match` (o el respaldo según S3), `actualizarMetadatosArchivo`, `eliminarArchivo` — `src/infrastructure/graph/sharepointGateway.ts`
- [ ] T017 [HU-005-2] `pushServicio`: asegurar ítem → eliminar remotos marcados → subir adjuntos (concurrencia 2) → PATCH de los campos sucios con instantánea y fusión — `src/application/sync/pushServicio.ts`
- [ ] T018 [HU-005-2] `SyncEngine` (push): precondiciones, orden, `proximoIntentoEn`, clasificación de errores, eventos, `AbortSignal`, puntos de extensión `despuesDelPush`/`alFinalizar`, resolutor de conflictos por defecto — `src/application/sync/SyncEngine.ts`, `eventosSync.ts`
- [ ] T019 [P] [HU-005-2] `conLockSync` con Web Locks (T-17) + prueba — `src/infrastructure/sync/webLocks.ts`, `webLocks.int.test.ts`
- [ ] T020 [HU-005-2] Composición del engine en el contenedor — `src/app/container.ts`
      **Punto de control**: T011–T013 en verde; una sincronización manual desde la consola de dev contra DEV crea los ítems y archivos esperados.

## Fase 4 — HU-005-1 Confirmar identidad y sincronizar (P1)

### Pruebas

- [ ] T021 [P] [HU-005-1] Integración de `confirmarIdentidad`: dentro y fuera de la ventana, modo `reautenticar`, otra cuenta, tenant inválido, sin rol, intención guardada y recuperada (< 10 min) o descartada — `src/application/sync/confirmarIdentidad.int.test.ts`
- [ ] T022 [P] [HU-005-1] Componente de `SincronizacionPage`: sin red, resumen de pendientes, cuenta, confirmar, usar otra cuenta, layout de 1 columna en compacto y 2 en expandido. Además, pruebas de los componentes nuevos del catálogo `BarList` (`role="progressbar"`, `aria-valuenow`), `DonutProgress` (`role="img"` + `aria-label` con el %) y `Chip` — `src/features/sincronizacion/pages/SincronizacionPage.test.tsx`, `src/shared/ui/BarList.test.tsx`, `DonutProgress.test.tsx`, `Chip.test.tsx`

### Implementación

- [x] T023 [HU-005-1] `intencionSync.ts` (sessionStorage) y su puerto — `src/infrastructure/sync/intencionSync.ts`, `src/application/ports/IntencionSyncPort.ts`
- [ ] T024 [HU-005-1] `confirmarIdentidad.ts` y `resumenPendientes.ts` — `src/application/sync/`
- [ ] T025 [HU-005-1] Reanudar tras el redirect en `main.tsx` (`/sincronizacion?reanudar=1`) — `src/main.tsx`
- [ ] T026 [HU-005-1] Componentes del catálogo `BarList`, `DonutProgress` (SVG propio, sin librería) y `Chip` (`account`), agregados a `/tecnico/ui`. Luego `SincronizacionPage` + `ConfirmacionCuenta` según la referencia 09 (plan §3.4: `amount-xl`, chips "ESTE DISPOSITIVO" → "SHAREPOINT", `PillButton` outlined "Confirmar como …", sin teclado PIN) y el layout por breakpoint — `src/shared/ui/`, `src/features/sincronizacion/`

## Fase 5 — HU-005-3 Progreso, errores y reintentos (P1)

- [ ] T027 [HU-005-3] `useSyncStore` (Zustand) suscrito a los eventos del engine — `src/features/sincronizacion/store/useSyncStore.ts`
- [ ] T028 [P] [HU-005-3] `ProgresoSync` (`BarList` por servicio y archivo), `SecondaryButton` "CANCELAR" — `src/features/sincronizacion/components/ProgresoSync.tsx`
- [ ] T029 [P] [HU-005-3] `ResumenCola` según la referencia 07 (`DonutProgress` + `SegmentedControl` En cola · Con error · Conflictos + `ListRow` con el punto de sync), `ListaErrores` (mensaje por código + "REINTENTAR" → `intentos=0`) y `ResumenSyncDialog` (`ResponsiveDialog`) — `src/features/sincronizacion/components/`

## Fase 6 — HU-005-4 Recordatorios y aviso de conexión (P2)

- [ ] T030 [P] [HU-005-4] Conectar `IndicadorConexion` y `ContadorPendientes` (creados en la 001) a los datos reales de pendientes, y el badge numérico del acceso "Sincronizar" en el `QuickActionGrid` y en la `ResponsiveNav` — `src/shared/ui/`, `src/features/inicio/`
- [ ] T031 [P] [HU-005-4] `useAvisoConexion` (evento `online` + sesión vigente + máx. 1 cada 30 min) — `src/features/sincronizacion/hooks/useAvisoConexion.ts`
- [ ] T032 [P] [HU-005-4] `RecordatorioPendientes` en Inicio (`RecordatorioPendientesHoras`) — `src/features/inicio/components/RecordatorioPendientes.tsx`

## Fase 7 — HU-005-5 Versión mínima y bitácora (P2)

- [ ] T033 [HU-005-5] Bloqueo por `VersionMinimaApp` en la pantalla y en las precondiciones del engine, con el botón "Buscar actualización" (`registration.update()`) — `src/features/sincronizacion/pages/SincronizacionPage.tsx`
- [ ] T034 [HU-005-5] `registrarLogSync` best-effort (Modelo §6.4, errores truncados) — `src/infrastructure/graph/sharepointGateway.ts`

## Fase 8 — Cierre

- [ ] T035 E2E `sync-online.spec.ts`: offline → crear 2 recepciones → online → aviso → confirmar → badges ✓ → resumen; axe sin violaciones serias en 360/768/1280 (T-20). Agregar a `visual.spec.ts` las capturas de confirmar, progreso y cola — `tests/e2e/sync-online.spec.ts`, `tests/e2e/visual.spec.ts`
- [ ] T036 Verificación en DEV real (Android instalada + Windows): ES-005-01…25, incluido el corte de red manual a mitad. Verificar en SharePoint 0 duplicados y el ítem en `LogSincronizacion`. Anotar en `docs/pruebas/`
- [ ] T037 Medir CE-005-01 (20 cortes aleatorios) y CE-005-03 (tiempo con 4G). Anotar en la spec §8
- [ ] T038 `npm run verify` + DoD (`CLAUDE.md` §9) + `CHANGELOG.md` + spec → `Implementada` en `specs/README.md`

## Dependencias

- T009 depende de T004–T007. T010 de T008. T015–T018 dependen de T014. T018 depende de T009, T015–T017.
- Fase 3 → Fase 4 → Fase 5. Las Fases 6 y 7 pueden ir en paralelo después de la Fase 4.
- La spec 006 conecta el pull y el resolutor de conflictos en los puntos de extensión de T018. La spec 009 conecta las purgas en `alFinalizar`.
