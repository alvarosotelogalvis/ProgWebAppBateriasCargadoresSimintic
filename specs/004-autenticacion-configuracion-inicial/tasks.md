# Tareas 004 — Autenticación y configuración inicial

- **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)
- Formato: `- [ ] T### [P?] [HU-004-x?] Descripción — \`ruta\``
- `[P]` = paralelizable. Las pruebas van antes que la implementación (Artículo VII). Commit por tarea: `feat(004): T### …`.
- **Precondición**: specs 001 y 002 implementadas. Spikes S1, S2 y S7 con resultado favorable (o sus ADR de reemplazo). Tenant DEV según `docs/06` §1–§2 y `.env.development` con los IDs públicos reales.

## Fase 1 — Preparación

- [x] T001 Crear la rama `feature/004-autenticacion-configuracion-inicial` y marcar la spec como `En implementación` en `specs/README.md`
- [x] T002 [P] Emulador de Graph en memoria para MSW y Playwright: sitio, listas por nombre, drive, `columns` con choices, items de `Clientes`, `Marcas` y `ConfiguracionApp`, paginación y errores inyectables (`failNext(status)`, `desconectar()`) — `tests/fixtures/graph/handlers.ts`, `tests/fixtures/graph/emulador.ts`
- [x] T003 [P] Namespaces i18n `auth` y `configuracion` (+ mensajes de los `CodigoError` de auth y SharePoint en `errores.json`) — `src/locales/es-CO/`
- [ ] T004 [P] (Opcional) `scripts/provision-sharepoint.ps1` idempotente con PnP.PowerShell (listas, columnas con nombres internos, índices, valor único, versiones, vistas, datos iniciales y claves de configuración; `docs/06` §2.6) — `scripts/`

## Fase 2 — Fundamentos: cliente Graph (bloquea las historias y la 005)

### Pruebas

- [x] T005 [P] Pruebas de `calcularEspera` y `traducirRespuesta` (tabla SDD §9.6) — `src/infrastructure/graph/backoff.test.ts`, `errores.test.ts`
- [x] T006 [P] Pruebas de integración de `graphClient` con MSW (cabeceras, timeout 10 s, 429 + `Retry-After`, 5xx con backoff (4 reintentos), 401 → refresh → OK, 401 doble → `AUTH_REQUERIDA`, red caída → `RED_SIN_CONEXION`, paginación) — `src/infrastructure/graph/graphClient.int.test.ts`

### Implementación

- [x] T007 `backoff.ts` y `errores.ts` (+ los códigos faltantes en `CodigoError`) — `src/infrastructure/graph/`, `src/shared/errors.ts`
- [x] T008 `graphClient.ts` (contrato del plan §3.2; registra método, ruta sin query, estado y `client-request-id` en el logger) — `src/infrastructure/graph/graphClient.ts`

## Fase 3 — HU-004-1 Preparar la app (P1) 🎯 MVP

### Pruebas

- [x] T009 [P] [HU-004-1] Pruebas de `validarTenantYRoles` y `extraerCuenta` (ES-004-03, ES-004-04) — `src/infrastructure/auth/claims.test.ts`
- [x] T010 [P] [HU-004-1] Pruebas de integración de `sharepointGateway` (resolverSitio, leerCatalogos con solo activos y choices de 5 columnas, leerConfiguracion) + mappers — `src/infrastructure/graph/sharepointGateway.int.test.ts`
- [x] T011 [P] [HU-004-1] Pruebas de integración de `ejecutarPreparacion` (éxito, 403, 404, catálogo vacío → advertencia, reintento por tarea, `storage.persist` denegado → advertencia, `configuracionInicialCompleta` solo con las 3 primeras OK) — `src/application/setup/configuracionInicial.int.test.ts`
- [x] T012 [P] [HU-004-1] Prueba de componente del asistente (progreso accesible, estados por tarea, Reintentar, no avanzar sin login y catálogos) — `src/features/configuracion/ConfiguracionInicialPage.test.tsx`

### Implementación

- [x] T013 [HU-004-1] `msalConfig.ts` (SDD §8.1) y `msalInstance.ts` — `src/infrastructure/auth/`
- [x] T014 [HU-004-1] `claims.ts` — `src/infrastructure/auth/claims.ts`
- [x] T015 [HU-004-1] `main.tsx`: `initialize()` + `handleRedirectPromise()` + validación + rechazo sin cerrar la sesión de M365 (plan §3.3) — `src/main.tsx`
- [x] T016 [HU-004-1] Ampliar el puerto `AuthPort` y crear `RemoteGateway` (subconjunto) y `StoragePort.persistir()` — `src/application/ports/`
- [x] T017 [HU-004-1] `msalAuthAdapter.ts` (iniciarSesion, asegurarToken, cuentaActiva con respaldo en `meta.ultimaCuenta`) y `mockAuthAdapter.ts` — `src/infrastructure/auth/`
- [x] T018 [HU-004-1] `sharepointGateway.ts` (resolverSitio, leerCatalogos, leerConfiguracion) + `mappers/catalogos.ts` — `src/infrastructure/graph/`
- [x] T019 [HU-004-1] `configuracionInicial.ts` y `refrescarCatalogos.ts` (guardan en `meta` y `catalogos`; config combinada con `combinarConfig`) — `src/application/setup/`
- [x] T020 [HU-004-1] `ConfiguracionInicialPage` + los 4 pasos (UX §3.2), reemplazando el marcador de la 001. Estilo: Bienvenida e Iniciar sesión según la referencia 01 (`GradientBackground`, logo, `PillButton` "Iniciar sesión con Microsoft"); Preparar datos y Listo en una `Card` con una `ListRow` por tarea; centrado con un máx. de 480/720 px en medio y expandido (plan §3.4). `PantallaSinAcceso` — `src/features/configuracion/`, `src/features/auth/PantallaSinAcceso.tsx`
- [x] T021 [HU-004-1] `container.ts`: AuthPort real o mock según `VITE_AUTH_MODE`, `graphClient`, `sharepointGateway` — `src/app/container.ts`
      **Punto de control**: en DEV, el asistente se completa con una cuenta real y los catálogos quedan en Dexie (DevTools → IndexedDB).

## Fase 4 — HU-004-2 Trabajar sin conexión con la cuenta recordada (P1)

- [x] T022 [P] [HU-004-2] Prueba de integración: `cuentaActiva()` sin red devuelve la cuenta del caché; con el caché vacío devuelve `meta.ultimaCuenta` con un aviso de login requerido (ES-004-08, ES-004-10) — `src/infrastructure/auth/msalAuthAdapter.int.test.ts`
- [x] T023 [HU-004-2] `sesionStore` alimentado por `AuthPort` (misma interfaz de la 001). `SetupGuard` lee `meta.configuracionInicialCompleta`. `crearBorrador` usa la cuenta real para `capturadoPor` (ES-004-09) — `src/shared/stores/sesionStore.ts`, `src/app/guards/SetupGuard.tsx`, `src/app/container.ts`
- [x] T024 [HU-004-2] Banner "Inicia sesión para poder sincronizar" cuando no hay sesión de MSAL pero sí `ultimaCuenta` — `src/features/inicio/`

## Fase 5 — HU-004-3 Permisos por rol (P1)

- [x] T025 [P] [HU-004-3] Prueba de componente de `RoleGuard` con roles reales y de la ocultación de acciones de Admin (ES-004-12) — `src/app/guards/RoleGuard.test.tsx`
- [x] T026 [HU-004-3] `useRoles()` + `RoleGuard` real + ocultar las entradas de Admin en `MasPage` — `src/shared/hooks/useRoles.ts`, `src/app/guards/RoleGuard.tsx`, `src/features/mas/MasPage.tsx`

## Fase 6 — HU-004-4 Mi cuenta (P2)

- [x] T027 [P] [HU-004-4] Prueba de integración: `cerrarSesion` y `cambiarCuenta` no modifican `servicios` ni `adjuntos` (CE-004-04). Prueba de componente del diálogo con N pendientes (ES-004-15) — `src/infrastructure/auth/msalAuthAdapter.int.test.ts`, `src/features/auth/DialogoCerrarSesion.test.tsx`
- [x] T028 [HU-004-4] `MiCuentaPage` estilo de la referencia 02 sin teclado PIN (`Avatar`, nombre en `h1`, correo, roles, último login; `PrimaryButton` "CAMBIAR DE CUENTA" y `SecondaryButton onGradient` "CERRAR SESIÓN") + `DialogoCerrarSesion` (`ResponsiveDialog` + `Banner` si hay pendientes) + Cambiar de cuenta (`prompt: 'select_account'`) — `src/features/auth/`

## Fase 7 — HU-004-5 Repetir la configuración (P3)

- [x] T029 [HU-004-5] Entrada "Configuración inicial" en Más → asistente en modo "repetir" (sin pasos de bienvenida; refresca sitio, catálogos y configuración; no borra datos) + prueba de integración — `src/features/configuracion/`, `src/application/setup/refrescarCatalogos.int.test.ts`

## Fase 8 — Cierre

- [x] T030 E2E `configuracion-inicial.spec.ts`: mock auth + Graph emulado → asistente completo → `setOffline(true)` → nuevo borrador con un cliente del catálogo y `capturadoPor` correcto → axe en 360/768/1280. Agregar a `visual.spec.ts` las capturas de Bienvenida, Preparar datos, Mi cuenta y Sin acceso — `tests/e2e/configuracion-inicial.spec.ts`, `tests/e2e/visual.spec.ts`
- [x] T031 Verificación manual en DEV con cuentas reales (con rol, sin rol, otro tenant si existe) en la app instalada de Android, iOS y Windows _(Android y Windows ✅; iOS pendiente, ver `docs/pruebas/004-verificacion-dev.md`)_: M-03, M-04, ES-004-01…17. Anotar en `docs/pruebas/`
- [x] T032 Actualizar el estado de los ADR 0006 y 0007 según los resultados (Propuesto → Aceptado o reemplazo) y el índice — `docs/adr/`
- [x] T033 Medir CE-004-01 (tiempo del asistente) y anotar en la spec §8
- [x] T034 `npm run verify` + DoD (`CLAUDE.md` §9) + `CHANGELOG.md` + spec → `Implementada` en `specs/README.md`

## Dependencias

- T007 → T008 → T018 → T019 → T020. T013 → T014 → T015 → T017.
- T016 antes de T017 y T018. T021 después de T017 y T018.
- Las Fases 4–7 dependen de la Fase 3. Las Fases 5 y 6 pueden ir en paralelo.
- La 005 reutiliza `graphClient`, `backoff`, `errores`, el emulador de Graph y `AuthPort.asegurarToken`, y amplía `RemoteGateway`. La 006 agrega a la preparación la descarga de servicios abiertos.
