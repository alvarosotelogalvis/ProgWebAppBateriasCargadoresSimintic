# Tareas 002 — Dominio y persistencia local

- **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)
- Formato: `- [ ] T### [P?] [HU-002-x?] Descripción — \`ruta\``
- `[P]` = paralelizable. Las pruebas van antes que la implementación (Artículo VII). Commit por tarea: `feat(002): T### …`.
- **Precondición**: spec 001 (andamiaje, capas, reglas de boundaries, `AppError`, i18n, `uiStore`).

## Fase 1 — Preparación
- [ ] T001 Crear la rama `feature/002-dominio-persistencia-local` y marcar la spec como `En implementación` en `specs/README.md`
- [ ] T002 [P] Fakes de prueba: `FakeClock`, `FakeIdGenerator`, `FakeAuth`, `FakeLogger` y `crearDbPrueba()` (fake-indexeddb, base nueva por prueba) — `tests/fakes/`
- [ ] T003 [P] Builders de datos válidos por estado (`servicioBuilder().recibido().conDiagnostico()…`, `adjuntoBuilder`) — `tests/builders/`
- [ ] T004 [P] Namespace `errores` con las claves de validación y de transición — `src/locales/es-CO/errores.json`

## Fase 2 — Fundamentos: tipos y configuración
- [ ] T005 Tipos de dominio de SDD §5 y modelo de datos §2–§3 (incluido el `'DESCONOCIDO'` de solo lectura y `ADJUNTO_POR_ETAPA`) — `src/domain/servicio.ts`, `src/domain/adjunto.ts`, `src/domain/errores.ts`
- [ ] T006 [P] Pruebas de `combinarConfig` (defaults; remoto válido sobrescribe; inválido → defecto + advertencia) — `src/domain/config.test.ts`
- [ ] T007 `ConfigApp`, `CONFIG_DEFECTO` (modelo de datos §6.3) y `esquemaConfigRemota` — `src/domain/config.ts`

## Fase 3 — HU-002-3 Datos válidos y normalizados (P1)
### Pruebas
- [ ] T008 [P] [HU-002-3] Pruebas de normalización (serie, referencia, marca) — `src/domain/normalizacion.test.ts`
- [ ] T009 [P] [HU-002-3] Pruebas de los 8 esquemas de etapa (obligatorios, regex, rangos de fechas ≤ hoy, entrega ≥ recepción, vida útil > entrega, motivo ≥ 10) — `src/domain/validaciones.test.ts`
### Implementación
- [ ] T010 [HU-002-3] `normalizacion.ts` y `validaciones.ts` (mensajes = claves i18n) — `src/domain/`

## Fase 4 — HU-002-2 Reglas del flujo (P1) 🎯
### Pruebas
- [ ] T011 [P] [HU-002-2] Tabla de transiciones al 100 %: cada fila del modelo de datos §5 × {válida, falta requisito (con la lista exacta de faltantes), rol incorrecto}; disposición final; entrega sin reparación; anulación; estados finales sin transiciones (T-01) — `src/domain/estados.test.ts`
- [ ] T012 [P] [HU-002-2] Pruebas de `camposEditables` (etapa actual por rol, etapas pasadas solo Admin, finales solo Admin, DESCONOCIDO vacío) — `src/domain/estados.camposEditables.test.ts`
### Implementación
- [ ] T013 [HU-002-2] `estados.ts`: `TRANSICIONES`, `ORDEN_ESTADOS`, `esFinal`, `transicionesDisponibles`, `aplicarTransicion` (marca `estado` y los campos de la etapa en `camposSucios`, `syncState='pending'`), `camposEditables` — `src/domain/estados.ts`

## Fase 5 — HU-002-6 Código y alertas (P2)
- [ ] T014 [P] [HU-002-6] Pruebas de `generarCodigo` y de `nivelAlerta` / `diasRestantes` (T-04) — `src/domain/codigo.test.ts`, `src/domain/alertas.test.ts`
- [ ] T015 [HU-002-6] `codigo.ts` y `alertas.ts` — `src/domain/`

## Fase 6 — HU-002-5 Combinación de cambios (P2)
- [ ] T016 [P] [HU-002-5] Pruebas de `mergeTresVias`: 4 casos de SDD §9.5 por tipo de campo, regla del estado más avanzado, estado final remoto, `base` y `camposSucios` resultantes (T-03) — `src/domain/merge.test.ts`
- [ ] T017 [HU-002-5] `merge.ts` — `src/domain/merge.ts`

## Fase 7 — HU-002-1 Persistencia sin pérdida (P1)
### Pruebas
- [ ] T018 [P] [HU-002-1] Pruebas de integración de `servicioRepository`: guardar y obtener, índices, `buscarPorSerie`, `listarPendientes` (excluye BORRADOR), `eliminarBorrador` rechaza los no borradores, `purgarCerrados` respeta `syncState` (T-08) — `src/infrastructure/db/servicioRepository.int.test.ts`
- [ ] T019 [P] [HU-002-1] Pruebas de integración de `adjuntoRepository`: blob y miniatura persisten tras reabrir (ES-002-01), `buscarPorHash`, `marcarPendientes`, `purgarOriginales` solo `synced` y antiguos (deja la miniatura) — `src/infrastructure/db/adjuntoRepository.int.test.ts`
- [ ] T020 [P] [HU-002-1] Prueba de atomicidad: una falla inyectada dentro de `UnidadDeTrabajo` no deja cambios parciales (ES-002-02) — `src/infrastructure/db/unidadDeTrabajo.int.test.ts`
- [ ] T021 [P] [HU-002-1] Prueba patrón de migración v1 → v2 simulada que conserva pendientes (T-07) — `src/infrastructure/db/migraciones.int.test.ts`
### Implementación
- [ ] T022 [HU-002-1] Puertos de `application/ports` (contratos del plan §3.2) — `src/application/ports/`
- [ ] T023 [HU-002-1] `AppDB` v1 (SDD §6.1) + `abrir()` con traducción a `AppError` — `src/infrastructure/db/dexie.ts`, `src/shared/errors.ts`
- [ ] T024 [HU-002-1] Repositorios Dexie (`servicio`, `adjunto`, `catalogo`, `meta` con `dispositivoId`) y `unidadDeTrabajo` — `src/infrastructure/db/`
- [ ] T025 [P] [HU-002-1] `uuidGenerator` y `systemClock` — `src/infrastructure/ids/`, `src/infrastructure/reloj/`

## Fase 8 — HU-002-4 Cambios rastreados (P1)
### Pruebas
- [ ] T026 [P] [HU-002-4] Pruebas de integración de los casos de uso: `crearBorrador` (id, fecha de hoy, `capturadoPor`, `dispositivoId`, `syncState='local'`); `actualizarCampos` en borrador (sigue local) y en sincronizado (camposSucios sin duplicados, código recalculado, `CampoNoEditableError`); `completarEtapa('completarRecepcion')` pasa el servicio y los adjuntos a `pending` (T-06, ES-002-16…19) — `src/application/servicios/casosDeUso.int.test.ts`
- [ ] T027 [P] [HU-002-4] Pruebas de `anular` (rol y motivo) y `descartarBorrador` (elimina los adjuntos; rechaza los no borradores) — `src/application/servicios/anularDescartar.int.test.ts`
### Implementación
- [ ] T028 [HU-002-4] `crearBorrador`, `actualizarCampos`, `completarEtapa`, `anular` y `descartarBorrador` (reglas del plan §3.3) — `src/application/servicios/`
- [ ] T029 [HU-002-4] `container.ts`: composición de repositorios, `UnidadDeTrabajo`, ids, reloj, logger y auth (mock de la 001) y exposición de los casos de uso — `src/app/container.ts`

## Fase 9 — Lecturas reactivas y registro (P2/P3)
- [ ] T030 [P] [HU-002-7] Prueba de integración del logger (anillo de 2000, exclusión de claves sensibles) — `src/infrastructure/logging/logger.int.test.ts`
- [ ] T031 [HU-002-7] `logger.ts` + manejadores globales `window.onerror` / `unhandledrejection` — `src/infrastructure/logging/logger.ts`, `src/main.tsx`
- [ ] T032 Hooks `useServicios`, `useServicio`, `useAdjuntos`, `useCatalogo` y `usePendientes` (→ `uiStore.setPendientes`) — `src/infrastructure/db/hooks.ts`, `sincronizarContadorPendientes.ts`
- [ ] T033 [P] Prueba de componente mínima: `usePendientes` actualiza el `ContadorPendientes` de la 001 al guardar un servicio pendiente — `src/infrastructure/db/hooks.test.tsx`

## Fase 10 — Cierre
- [ ] T034 Verificar la cobertura: `domain/` y `application/` ≥ 90 %, `estados.ts` 100 % (CE-002-01, CE-002-02)
- [ ] T035 Medir CE-002-04 (`actualizarCampos` < 50 ms) con un microbenchmark en el navegador (`npm run preview`) y anotar en la spec §8
- [ ] T036 Anotar las ampliaciones de los puertos en SDD §4.3 (plan §3.4) — `docs/02-SDD.md`
- [ ] T037 `npm run verify` + DoD (`CLAUDE.md` §9) + `CHANGELOG.md` + spec → `Implementada` en `specs/README.md`

## Dependencias
- T005 → T007 → T010 → T013 (los requisitos de las transiciones usan los esquemas y la config).
- T022 → T023 → T024 → T028 → T029.
- Las Fases 5 y 6 son independientes de la 7 (se pueden hacer en paralelo).
- La spec 003 necesita: `normalizacion.ts`, `validaciones.ts` (`esquemaRecepcion`), `codigo.ts`, `crearBorrador`, `actualizarCampos`, `completarEtapa`, `descartarBorrador`, `buscarPorSerie`, `buscarPorHash` y los hooks. La 006 consume `merge.ts`. La 009 consume las purgas.
