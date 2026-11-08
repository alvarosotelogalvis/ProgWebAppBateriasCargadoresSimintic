# Tareas 009 — Soporte técnico, respaldo y purgas

- **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)
- Formato: `- [ ] T### [P?] [HU-009-x?] Descripción — \`ruta\``
- `[P]` = paralelizable. Las pruebas van antes que la implementación (Artículo VII). Commit por tarea: `feat(009): T### …`.
- **Precondición**: specs 005 y 006 implementadas (engine con `alFinalizar`, `meta.metodoPull`, `ultimoCorrelationId`). Spec 004 (`useRoles`, `refrescarCatalogos`, `AuthPort.cerrarSesion`). Spec 001 (`registration.update()`).

## Fase 1 — Preparación ✅

- [x] T001 Crear la rama `feature/009-soporte-respaldo-purgas` y marcar la spec como `En implementación` en `specs/README.md`
- [x] T002 [P] Namespace i18n `tecnico` (secciones, acciones, confirmaciones, resúmenes, errores de respaldo) — `src/locales/es-CO/tecnico.json`
- [x] T003 [P] Fixtures de respaldo: ZIP válido, manifiesto con formato inválido y con `esquemaDb` futuro — `tests/fixtures/respaldo/`

## Fase 2 — Fundamentos (bloquean las historias) ✅

### Pruebas

- [x] T004 [P] Pruebas de `seleccionarPurgables` (T-08: ningún estado ≠ `synced`, límites de días y meses, cerrados vs. abiertos) — `src/domain/purgas.test.ts`
- [x] T005 [P] Pruebas de `validarManifiesto` — `src/domain/respaldo.test.ts`
- [x] T006 [P] Pruebas de `sanitizar` (claves sensibles, URLs sin query) — `src/infrastructure/logging/logger.test.ts`

### Implementación

- [x] T007 Implementar `purgas.ts` y `respaldo.ts` hasta pasar T004–T005 — `src/domain/`
- [x] T008 [P] `sanitizar` y `consultar(filtro)` en el logger hasta pasar T006 — `src/infrastructure/logging/logger.ts`
- [x] T009 [P] `zip.ts` (empaquetar en streaming con `ZipPassThrough`/`ZipDeflate` y desempaquetar) — `src/infrastructure/respaldo/zip.ts`

## Fase 3 — HU-009-1 Respaldo manual (P1) 🎯 MVP

**Prueba independiente**: exportar 2 pendientes con fotos y abrir el ZIP.

### Pruebas

- [ ] T010 [P] [HU-009-1] Integración de ida y vuelta exportar → importar en dos bases: importados, omitidos (incluido un existente con pendientes), estados `pending`/`synced` resultantes, manifiesto inválido sin efectos — `src/application/respaldo/respaldo.int.test.ts`
- [ ] T011 [P] [HU-009-1] E2E: exportar respaldo genera un ZIP con `manifiesto.json`, `servicios.json` y los archivos de los adjuntos pendientes (T-24) — `tests/e2e/respaldo.spec.ts`

### Implementación

- [ ] T012 [HU-009-1] `exportarRespaldo.ts` (alcance, tamaño estimado, nombre de archivo) — `src/application/respaldo/exportarRespaldo.ts`
- [ ] T013 [HU-009-1] `compartir.ts` (Web Share con archivos; `AbortError` o no soportado → descarga) — `src/infrastructure/respaldo/compartir.ts`
- [ ] T014 [HU-009-1] `importarRespaldo.ts` (validar, transacción por servicio, resumen) — `src/application/respaldo/importarRespaldo.ts`
- [ ] T015 [HU-009-1] `ExportarRespaldoDialog` (alcance, tamaño, progreso, compartir/descargar) e `ImportarRespaldoDialog` (solo Admin, resumen) — `src/features/tecnico/components/`
      **Punto de control**: ES-009-01…06 en Android (compartir) y Windows (descarga).

## Fase 4 — HU-009-2 Limpieza segura del espacio (P1)

### Pruebas

- [ ] T016 [P] [HU-009-2] Integración de `ejecutarPurgas`: solo tras resultado `OK`; edición concurrente entre la selección y el borrado → no se borra; libera el blob y conserva la miniatura; elimina cerrados con sus adjuntos (T-08) — `src/application/sync/purgas.int.test.ts`

### Implementación

- [ ] T017 [HU-009-2] `ejecutarPurgas` transaccional con re-verificación y log `purga` — `src/application/sync/purgas.ts`
- [ ] T018 [HU-009-2] Enganchar las purgas en `SyncEngine.alFinalizar` (solo si `resultado === 'OK'`) — `src/application/sync/SyncEngine.ts`, `src/app/container.ts`
- [ ] T019 [HU-009-2] `LiberarEspacioDialog` (confirmación + resultado con espacio liberado vía `estimate()` antes y después) — `src/features/tecnico/components/LiberarEspacioDialog.tsx`

## Fase 5 — HU-009-3 Diagnóstico para soporte (P2)

- [ ] T020 [P] [HU-009-3] `estadoDispositivo.ts` y `EstadoDispositivo` — `src/application/tecnico/`, `src/features/tecnico/components/`
- [ ] T021 [P] [HU-009-3] `estadoSharePoint.ts` y `EstadoSharePoint` (copiar el `correlationId`) — `src/application/tecnico/`, `src/features/tecnico/components/`
- [ ] T022 [HU-009-3] `VisorLogs` (`SegmentedControl` por nivel, búsqueda con `PillInput`, `TablaResponsive` virtualizada: tarjetas en compacto y tabla en expandido; copiar, exportar `.json` sanitizado) — `src/features/tecnico/components/VisorLogs.tsx`

## Fase 6 — HU-009-4 Acciones de mantenimiento (P2)

### Pruebas

- [ ] T023 [P] [HU-009-4] Integración de `restablecerApp` (rechazado con pendientes sin salvaguardas; OK sin pendientes) y de `reintentarErrores` — `src/application/tecnico/restablecerApp.int.test.ts`, `reintentarErrores.int.test.ts`
- [ ] T024 [P] [HU-009-4] Componente de `MenuTecnicoPage` por rol, estado de red y breakpoint (tarjetas apiladas vs. tablas y 2 columnas) — `src/features/tecnico/pages/MenuTecnicoPage.test.tsx`

### Implementación

- [ ] T025 [HU-009-4] `reintentarErrores.ts` y `restablecerApp.ts` + `RestablecerAppDialog` (exportar primero + escribir "BORRAR") — `src/application/tecnico/`, `src/features/tecnico/components/`
- [ ] T026 [HU-009-4] `MenuTecnicoPage` (UX §5; `Card fill` + `ListRow` por opción; en expandido, opciones a la izquierda y el panel de detalle a la derecha; `EstadoDispositivo` con `DonutProgress` de cuota y `TablaResponsive`; enlace a `/tecnico/ui` solo en DEV) con Refrescar catálogos (requiere red), Buscar actualización (`registration.update()` + mensaje) y la ruta `/tecnico` — `src/features/tecnico/pages/MenuTecnicoPage.tsx`, `src/app/router.tsx`

## Fase 7 — Cierre

- [ ] T027 Verificación manual: exportar en A, importar en B (Admin), sincronizar B → mismos ítems sin duplicar (aceptación de F9 en `docs/07`, CE-009-04). Anotar en `docs/pruebas/`
- [ ] T028 Medir CE-009-02 (tiempo de respaldo) y CE-009-03 (espacio liberado). Anotar en la spec §8
- [ ] T029 axe sin violaciones serias en `/tecnico` y sus diálogos en 360/768/1280 (agregar a `tests/e2e/a11y.spec.ts`) y capturas del menú técnico, el visor de logs y los diálogos en `tests/e2e/visual.spec.ts`
- [ ] T030 `npm run verify` + DoD (`CLAUDE.md` §9) + `CHANGELOG.md` + spec → `Implementada` en `specs/README.md`

## Dependencias

- T007 depende de T004–T005. T012–T014 dependen de T007 y T009. T017 depende de T007. T018 depende de T017.
- Fase 3 y Fase 4 pueden avanzar en paralelo después de la Fase 2. Las Fases 5 y 6 van después.
