# Tareas 006 — Sincronización: descarga y conflictos (pull)

- **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)
- Formato: `- [ ] T### [P?] [HU-006-x?] Descripción — \`ruta\``
- `[P]` = paralelizable. Las pruebas van antes que la implementación (Artículo VII). Commit por tarea: `feat(006): T### …`.
- **Precondición**: spec 005 implementada (engine con puntos de extensión, emulador de Graph). `mergeTresVias` de la spec 002 en verde. Resultado del spike S4 documentado.

## Fase 1 — Preparación

- [x] T001 Crear la rama `feature/006-sincronizacion-pull-conflictos` y marcar la spec como `En implementación` en `specs/README.md`
- [x] T002 [P] Extender el emulador de Graph: delta paginado con `deltaLink`, `deltaLink` caducado (410), cambios remotos simulados (`modificarRemoto(id, campos, editor)`), children de carpeta y thumbnails — `tests/fixtures/graph/emuladorGraph.ts`
- [x] T003 [P] Claves i18n de conflictos, adjuntos remotos y descarga — `src/locales/es-CO/sync.json`, `adjuntos.json`

## Fase 2 — Fundamentos (bloquean las historias)

### Pruebas

- [x] T004 [P] Pruebas de `aplicarCambioRemoto` (INSERTAR, SOBRESCRIBIR, COMBINAR, ELIMINAR_LOCAL, CONFLICTO_ELIMINACION, IGNORAR ×2) (T-16) — `src/domain/sync/aplicarCambioRemoto.test.ts`
- [x] T005 [P] Pruebas de la regla de estado e incoherencia sobre `mergeTresVias` (extensión de T-03) — `src/domain/merge.estado.test.ts`
- [x] T006 [P] Pruebas de `debeDescargarse` — `src/domain/sync/retencion.test.ts`
- [x] T007 [P] Pruebas de `adjuntoMapper` — `src/infrastructure/graph/mappers/adjuntoMapper.test.ts`

### Implementación

- [x] T008 Implementar `aplicarCambioRemoto.ts`, `retencion.ts` y la regla de estado en `merge.ts` hasta pasar T004–T006 — `src/domain/`
- [x] T009 [P] Implementar `adjuntoMapper.ts` hasta pasar T007 — `src/infrastructure/graph/mappers/adjuntoMapper.ts`

## Fase 3 — HU-006-1 Ver servicios de otros dispositivos (P1) 🎯 MVP

**Prueba independiente**: A sube, B sincroniza y abre offline.

### Pruebas

- [x] T010 [P] [HU-006-1] Integración de `pullServicios`: remoto nuevo insertado y remoto modificado sin cambios locales sobrescribe (T-16); con cambios locales → merge; delta paginado con corte a mitad sin pérdida; `deltaLink` caducado → descarga completa; primera descarga con retención; refresco de catálogos que falla → continúa — `src/application/sync/pullServicios.int.test.ts`

### Implementación

- [x] T011 [HU-006-1] Ampliar `RemoteGateway` con `cambiosServicios`, `listarArchivosServicio` y `descargarMiniatura` — `src/application/ports/RemoteGateway.ts`
- [x] T012 [HU-006-1] `sharepointGateway.cambiosServicios`: delta o filtro por `Modified` según S4, `meta.metodoPull` — `src/infrastructure/graph/sharepointGateway.ts`
- [x] T013 [HU-006-1] `pullServicios.ts`: aplicar las decisiones y guardar por página con el `deltaLink` en la misma transacción — `src/application/sync/pullServicios.ts`
- [x] T014 [HU-006-1] Conectar el pull y `refrescarCatalogos` en el `SyncEngine` (`despuesDelPush` / inicio) y sumar `ServiciosDescargados` al resumen y a la bitácora — `src/application/sync/SyncEngine.ts`, `src/app/container.ts`
      **Punto de control**: escenario A sube / B descarga funcionando contra el emulador y contra DEV.

## Fase 4 — HU-006-2 Combinar cambios y resolver conflictos (P1)

### Pruebas

- [x] T015 [P] [HU-006-2] Integración de `resolverConflicto412`: sin choque → reintenta el PATCH una vez con el nuevo eTag; con choque → `conflict` (T-15) — `src/application/sync/resolverConflicto412.int.test.ts`
- [x] T016 [P] [HU-006-2] Integración de `resolverConflictos` (elecciones incompletas rechazadas, LOCAL/REMOTO, estado → pending) — `src/application/servicios/resolverConflictos.int.test.ts`
- [x] T017 [P] [HU-006-2] Componente de `ResolverConflictoPage` (tarjetas en compacto, tabla en expandido, botón deshabilitado hasta elegir todo) y de `TablaResponsive` (`th scope` / tarjetas con etiqueta por celda) — `src/features/sincronizacion/pages/ResolverConflictoPage.test.tsx`, `src/shared/ui/TablaResponsive.test.tsx`

### Implementación

- [x] T018 [HU-006-2] `resolverConflicto412.ts` y reemplazar el resolutor por defecto de la spec 005 en el contenedor — `src/application/sync/`, `src/app/container.ts`
- [x] T019 [HU-006-2] `resolverConflictos.ts` — `src/application/servicios/resolverConflictos.ts`
- [x] T020 [HU-006-2] `TablaResponsive` (nuevo en el catálogo y en `/tecnico/ui`), luego `ResolverConflictoPage` + `CampoConflicto` (RAC `RadioGroup` con dos `CardInner` seleccionables; tabla en expandido, plan §3.4) y ruta `/sincronizacion/conflicto/:id` — `src/shared/ui/TablaResponsive.tsx`, `src/features/sincronizacion/`, `src/app/router.tsx`
- [x] T021 [P] [HU-006-2] `BannerConflicto` (`Banner` + "RESOLVER") en el detalle y `ListaConflictos` (`ListRow`) en la pestaña "Conflictos" de Sincronización — `src/features/servicios/components/BannerConflicto.tsx`, `src/features/sincronizacion/components/ListaConflictos.tsx`

## Fase 5 — HU-006-3 Fotos y documentos de otros (P2)

### Pruebas

- [x] T022 [P] [HU-006-3] Integración de `descargarMiniaturas` (límite de 50, cuota ≥ 80 % → salto, configuración desactivada) y de `listarAdjuntosRemotos` (upsert sin duplicar, 404 = sin adjuntos) — `src/application/sync/descargarMiniaturas.int.test.ts`, `src/application/adjuntos/listarAdjuntosRemotos.int.test.ts`

### Implementación

- [x] T023 [HU-006-3] `descargarMiniaturas.ts` (enganchado después del pull) y `listarAdjuntosRemotos.ts` (al abrir el detalle con conexión) — `src/application/`
- [x] T024 [HU-006-3] `AdjuntoRemoto` (`PhotoTile` con miniatura o ícono `picture_as_pdf`, badge "En SharePoint", `TextLink` "Abrir en SharePoint" deshabilitado sin red) integrado en la `PhotoGallery` de la línea de tiempo — `src/features/adjuntos/components/AdjuntoRemoto.tsx`

## Fase 6 — Cierre

- [x] T025 (cubierto con pruebas de integración, ver nota) E2E con dos contextos (A y B): A crea y sincroniza; B sincroniza y ve; B cambia el diagnóstico offline; se modifica la observación "en SharePoint" (emulador); B sincroniza → conflicto solo en `observacionTecnica` → resolver → sincronizado; axe en 360 y 1280. Agregar a `visual.spec.ts` las capturas de Resolver conflicto — `tests/e2e/conflicto-dos-dispositivos.spec.ts`, `tests/e2e/visual.spec.ts`
- [ ] T026 Verificación en DEV real con dos dispositivos y SharePoint web (escenario de aceptación de F6 en `docs/07`). Anotar en `docs/pruebas/`
- [ ] T027 Medir CE-006-04 (sync incremental sin cambios < 5 s). Anotar en la spec §8
- [ ] T028 (código y pruebas listos; falta T026 y T027) `npm run verify` + DoD (`CLAUDE.md` §9) + `CHANGELOG.md` + spec → `Implementada` en `specs/README.md`

> **Notas de la implementación (integración sobre `feature/007-diagnostico-flujo`)**
>
> - T025: dos contextos de navegador no pueden compartir el Graph simulado del modo `mock` (vive en memoria de cada página), así que el escenario A sube / B descarga / conflicto parcial / resolver se prueba de punta a punta contra el emulador MSW con el motor, los repositorios Dexie y el `SharePointGateway` reales: `src/application/sync/pullServicios.int.test.ts` («dos dispositivos») y `src/application/sync/resolverConflicto412.int.test.ts`. La verificación con dos dispositivos reales es T026.
> - T002: el emulador ganó delta paginado con `deltaLink` y `@removed`, `modificarRemoto`, `eliminarRemoto`, hijos de carpeta y miniaturas.
> - T020: `TablaResponsive` no se agregó todavía a `/tecnico/ui`.
> - `listarArchivosServicio` recibe la carpeta (`yyyy/ServicioId`) en lugar del `ServicioId`, y `descargarMiniatura` recibe el `driveItemId`.
> - Las eliminaciones remotas se detectan por `itemId` (las entradas `@removed` del delta no traen `ServicioId`) y nunca borran una copia con cambios pendientes.

## Dependencias

- T008 depende de T004–T006. T013 depende de T008, T011 y T012. T014 depende de T013.
- Fase 3 → Fase 4. La Fase 5 puede ir en paralelo con la Fase 4 después de T011.
- La spec 009 usa `meta.metodoPull` y purga los servicios remotos cerrados.
