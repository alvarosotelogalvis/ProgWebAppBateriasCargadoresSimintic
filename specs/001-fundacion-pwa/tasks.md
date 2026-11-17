# Tareas 001 — Fundación PWA e interfaz base

- **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Sistema de diseño**: [`docs/10`](../../docs/10-Sistema-de-Diseno.md) · ADR-0022
- Formato: `- [ ] T### [P?] [HU-001-x?] Descripción — \`ruta\``
- `[P]` = paralelizable. Las pruebas van antes que la implementación (Artículo VII). Commit por tarea: `feat(001): T### …` (o `chore(001)` para herramientas).
- **Precondición**: PC preparado según `docs/05` §2–§11. Para los spikes S1, S2 y S7: tenant DEV configurado (`docs/06` §1–§2).

## Fase 1 — Preparación (andamiaje y herramientas, F0.1–F0.5)

- [x] T001 Repo fuera de OneDrive + `git init` + andamiaje de Vite react-ts sin pisar `docs/`, `README.md` ni `CLAUDE.md` (`docs/05` §3, §12) — `/`
- [x] T002 [P] `.gitattributes` (`* text=auto eol=lf`), `.gitignore` (incluye `.env*` excepto `.env.example`), `.editorconfig`, `.node-version` — `/`
- [x] T003 [P] `.vscode/settings.json` (formatear al guardar, ESLint, Stylelint) y `.vscode/extensions.json` (`docs/05` §6 + `stylelint.vscode-stylelint`) — `.vscode/`
- [x] T004 Instalar las dependencias y devDependencies de `docs/05` §12 con el reemplazo de UI del ADR-0022 (**sin** `@fluentui/*`; **con** `react-aria-components`, `@internationalized/date`, `@fontsource/montserrat`, `@material-symbols/svg-500`, `vite-plugin-svgr`, `stylelint`, `stylelint-config-standard`) y anotar las versiones en `docs/05` §16 — `package.json`
- [x] T005 `tsconfig.json` estricto (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, alias `@/`) — `tsconfig.json`, `vite.config.ts`
- [x] T006 Esqueleto de capas vacío (`domain`, `application/ports`, `infrastructure/{db,graph,auth,media,pwa,logging}`, `features`, `shared/ui`) con un `index.ts` por carpeta — `src/` _(solo `domain/index.ts`; las demás capas existen con código real)_
- [x] T007 ESLint flat config: typescript-eslint, react-hooks, jsx-a11y, `eslint-plugin-boundaries` (reglas de SDD §4.1), prohibir `dangerouslySetInnerHTML`, `localStorage` restringido, literales de UI prohibidos en JSX, **prohibido importar `@fluentui/*`** + Prettier — `eslint.config.js`, `.prettierrc.json` _(regla de capas activa en `eslint.config.js`, sin excepciones)_
- [x] T008 [P] Stylelint: `stylelint-config-standard`, `color-no-hex` y `declaration-property-value-disallowed-list` (radios, sombras y colores literales) en todo `*.css` **excepto** `src/shared/ui/tokens.css` — `.stylelintrc.json`
- [x] T009 Husky: `pre-commit` (lint-staged con eslint, stylelint y prettier), `commit-msg` (commitlint convencional), `pre-push` (typecheck + test) — `.husky/`, `commitlint.config.js`, `.lintstagedrc.json`
- [x] T010 Scripts de `CLAUDE.md` §6 (`dev`, `build`, `build:dev`, `preview`, `lint` = eslint + stylelint, `typecheck`, `test`, `test:e2e`, `test:visual`, `verify`, `deploy:dev`, `deploy:prod`, `release`) — `package.json`
- [x] T011 [P] `CHANGELOG.md` inicial con la sección `Unreleased` — `CHANGELOG.md`

## Fase 2 — Fundamentos (bloquean las historias)

### Pruebas

- [x] T012 [P] Pruebas de `env.ts`: variables obligatorias y formato UUID de tenant y client — `src/shared/env.test.ts`
- [x] T013 [P] Script que verifica que `vite build --mode production` con `VITE_AUTH_MODE=mock` falla (T-18) — `scripts/check-build-mock.mjs` _(también corre dentro de `npm run verify` como `check:build-mock`)_
- [x] T014 [P] Pruebas de `aplicarEscalaFuente` (1.0 / 1.15 / 1.3 → `--escala-fuente` en `<html>`) y de `useBreakpoint` (límites 599/600, 1023/1024, 1439/1440 con `matchMedia` simulado) — `src/app/escalaFuente.test.ts`, `src/shared/hooks/useBreakpoint.test.ts`

### Implementación

- [x] T015 `.env.example`, `.env.development`, `.env.test` (`VITE_AUTH_MODE=mock`) + `src/shared/env.ts` con zod y pantalla de error de configuración (SDD §16.1) — `/`, `src/shared/env.ts`
- [x] T016 `vite.config.ts`: plugins de React y **svgr**, `define` de `__APP_VERSION__`, `__GIT_COMMIT__` y `__BUILD_DATE__`, bloqueo del build con mock, visualizer opcional; CSS Modules con `localsConvention: 'camelCaseOnly'` — `vite.config.ts`, `src/vite-env.d.ts`
- [x] T017 [P] `AppError` y `CodigoError` (SDD §13) — `src/shared/errors.ts`
- [x] T018 [P] `i18n.ts` (i18next es-CO, namespaces) + `common.json` y `navegacion.json` — `src/shared/i18n.ts`, `src/locales/es-CO/`
- [x] T019 `escalaFuente.ts`, `useBreakpoint.ts` y `breakpoints.ts` (600 / 1024 / 1440) + `providers.tsx` (I18nextProvider, `RouterProvider` de React Aria con `useNavigate`, `I18nProvider locale="es-CO"` de React Aria, ErrorBoundary raíz) — `src/app/`, `src/shared/hooks/`, `src/shared/ui/breakpoints.ts`
- [x] T020 Vitest (jsdom, setup de jest-dom, `coverage.thresholds`: domain/application 90 %, global 70 %) + Playwright (proyectos chromium-mobile 360×740, chromium-tablet 768×1024, chromium-desktop 1280×800 y webkit-mobile; `webServer` = `npm run preview`) con una prueba trivial de cada uno — `vitest.config.ts`, `playwright.config.ts`
- [x] T021 `vite-plugin-pwa`: manifest de SDD §11.1 con `theme_color #4A4AF8` y `background_color #1F6FE5`, `registerType: 'prompt'`, precaché (**incluye `woff2` y `svg`**), `navigateFallback`, sin runtime caching de Graph ni login, `cleanupOutdatedCaches`. `index.html` con `apple-touch-icon`, `apple-mobile-web-app-capable`, `robots noindex`, `lang="es-CO"` y `viewport-fit=cover` — `vite.config.ts`, `index.html`
- [x] T022 [P] Íconos provisionales de la app ("ST" en un círculo blanco sobre el degradado principal; 192, 512, maskable 512, apple 180) — `public/icons/`
- [x] T023 [P] `public/_headers` (SDD §14.2 **sin** `style-src 'unsafe-inline'`, con `font-src 'self'`) y `public/robots.txt` (`Disallow: /`) — `public/`

## Fase 3 — Sistema de diseño base (bloquea las pantallas) — HU-001-7 (P1)

**Prueba independiente**: `/tecnico/ui` en DEV muestra todos los componentes base en sus estados, sin violaciones de axe, en 360, 768 y 1280 px.

### Pruebas

- [x] T024 [P] [HU-001-7] Pruebas de componentes de botones (`PrimaryButton` normal/small, `SecondaryButton` + `onGradient`, `PillButton`, `TextLink`): rol, foco visible (`data-focus-visible`), deshabilitado con `aria-disabled`, área táctil ≥ 44 px — `src/shared/ui/botones.test.tsx`
- [x] T025 [P] [HU-001-7] Pruebas de campos (`TextField`, `SelectField`, `Checkbox`, `SegmentedControl`): etiqueta asociada, error con `aria-describedby`, teclado (flechas en Select y Segmented) — `src/shared/ui/campos.test.tsx`
- [x] T026 [P] [HU-001-7] Pruebas de `ResponsiveNav` (4 ítems en compacto; riel en medio; sidebar con los ítems de "Más" en expandido; ítem activo con `aria-current="page"`; filtrado por rol) y de `ResponsiveDialog` (Sheet en compacto, Dialog en medio/expandido, foco atrapado, Esc cierra) — `src/shared/ui/ResponsiveNav.test.tsx`, `ResponsiveDialog.test.tsx` _(`ResponsiveNav.test.tsx` y `ResponsiveDialog.test.tsx`)_

### Implementación

- [x] T027 [HU-001-7] `tokens.css` con **todos** los tokens de `docs/10` §2 (colores AA, colores de estado de servicio y de sync, radios, sombras, espaciado, gutters por breakpoint, alturas de control 44 px, tipografía en rem) + `global.css` (reset, `html { font-size: calc(87.5% * var(--escala-fuente, 1)) }`, Montserrat, `tabular-nums`, anillo de foco, `prefers-reduced-motion`, safe areas) — `src/shared/ui/tokens.css`, `global.css`
- [x] T028 [P] [HU-001-7] Fuentes: importar `@fontsource/montserrat` 400/500/600/700/800 (latin) en `main.tsx`; verificar en `dist/` que no hay referencias a `fonts.googleapis.com` — `src/main.tsx`
- [x] T029 [P] [HU-001-7] `Icon.tsx` con el mapa tipado `IconName` (íconos de `docs/10` §2.5 desde `@material-symbols/svg-500/rounded/*-fill.svg?react`), `aria-hidden`, `currentColor`, tamaños 20/24/28/72 — `src/shared/ui/Icon.tsx`
- [x] T030 [P] [HU-001-7] `GradientBackground` (`principal` | `suave`) + `DecoCircle` (posiciones por breakpoint, `aria-hidden`), `Card` (`fill`, `pegadaAbajo`) y `CardInner` — `src/shared/ui/`
- [x] T031 [HU-001-7] Botones sobre RAC `Button`/`Link`: `PrimaryButton`, `SecondaryButton`, `PillButton`, `TextLink` (hasta pasar T024) — `src/shared/ui/`
- [x] T032 [HU-001-7] Campos sobre RAC: `TextField` (con la variante textarea), `SelectField`, `Checkbox`, `SegmentedControl` (`ToggleButtonGroup`) (hasta pasar T025) — `src/shared/ui/`
- [x] T033 [HU-001-7] `ResponsiveNav` (BottomNav / NavRail / Sidebar con el degradado `--nav-start → --nav-end`, ítems inactivos al 85 %, safe area inferior) y `ResponsiveDialog` sobre `Sheet`/`Dialog` (RAC `Modal` + `Dialog`) (hasta pasar T026) — `src/shared/ui/`
- [x] T034 [P] [HU-001-7] `QuickActionGrid` (3 / 4 / 6 columnas según el breakpoint, círculo `primary` con halo `primary-light`, badge numérico opcional), `SummaryCard`, `Avatar`, `ListRow` (RAC `GridList`), `StatusBadge`, `SyncBadge` (punto + ícono + texto) — `src/shared/ui/`
- [x] T035 [P] [HU-001-7] `Banner` (`role="status"`/`alert`), `Toast` (región `aria-live`) + `uiStore.toasts`, `EmptyState`, `Skeleton` — `src/shared/ui/`
- [x] T036 [HU-001-7] `CatalogoUiPage` en `/tecnico/ui` (solo con `VITE_APP_ENV=dev`, import dinámico excluido del build de PRD) con cada componente y sus estados — `src/features/tecnico/CatalogoUiPage.tsx`, `src/app/router.tsx`
      **Punto de control**: el catálogo se ve como la referencia (`docs/diseno/referencia/`) en 360 px y se adapta en 768 y 1280.

## Fase 4 — HU-001-1 Instalar la app (P1) 🎯 MVP

**Prueba independiente**: instalar desde DEV en Android, iOS y Windows y abrir en modo avión.

### Pruebas

- [x] T037 [P] [HU-001-1] Pruebas de `detectarPlataforma`, `esStandalone` y `requiereInstalacion` con una matriz de user agents (las 10 plataformas del contrato) — `src/infrastructure/pwa/plataforma.test.ts`
- [x] T038 [P] [HU-001-1] E2E: webkit-mobile no standalone → `/instalar` sin "Continuar" (T-22); chromium-desktop → banner y "Continuar sin instalar" — `tests/e2e/instalacion.spec.ts`
- [x] T039 [P] [HU-001-1] E2E: tras la primera carga con `preview`, `setOffline(true)` + recarga → Inicio visible, con Montserrat aplicada (`document.fonts.check`) e íconos renderizados (ES-001-05, ES-001-25) — `tests/e2e/offline-shell.spec.ts` _(`tests/e2e/offline-shell.spec.ts`)_

### Implementación

- [x] T040 [HU-001-1] `plataforma.ts` y `standalone.ts` — `src/infrastructure/pwa/`
- [x] T041 [HU-001-1] `installPrompt.ts` (captura `beforeinstallprompt` → uiStore; `mostrarInstalacion`) — `src/infrastructure/pwa/installPrompt.ts` _(implementado en `src/features/instalacion/useInstallPrompt.ts`, no en `infrastructure/pwa` ni en `uiStore`)_
- [x] T042 [HU-001-1] `InstalarPage` estilo de la referencia 01 (fondo principal, logo "ST" en un círculo blanco, `h1` "SERVICIO TÉCNICO" + subtítulo, instrucciones por plataforma en una `Card`, `PrimaryButton` "INSTALAR", `TextLink` "Continuar sin instalar" on-gradient) + `BannerInstalar` descartable (preferencia recordada) + `instalacion.json` — `src/features/instalacion/`, `src/locales/es-CO/instalacion.json`
- [ ] T043 [HU-001-1] Primer despliegue DEV: crear el proyecto Cloudflare Pages, `npm run deploy:dev`, comprobar HTTPS, cabeceras (`curl -I`) e instalación en dispositivos reales (M-01, M-02) — `docs/pruebas/`
      **Punto de control**: app instalable y offline en DEV, con la identidad visual.

## Fase 5 — HU-001-6 Spikes de riesgo (P1)

Cada spike en una rama `spike/Sx-*` desechable. Solo se integra el documento (plantilla del plan §3.4). Si cambia una decisión → ADR nuevo + índice.

- [ ] T044 [P] [HU-001-6] S1 — MSAL `loginRedirect` + `acquireTokenSilent` en la PWA instalada (iOS, Android, Windows) y persistencia de la sesión al reabrir — `docs/spikes/S1-msal-redirect-pwa.md` _(guía lista: `docs/spikes/S1-msal-redirect-pwa.md`; falta ejecutarla)_
- [ ] T045 [P] [HU-001-6] S2 — `Sites.Selected` delegado + grant `write`: POST de ítem y PUT de archivo con un usuario Colaborar — `docs/spikes/S2-sites-selected.md` _(guía lista; falta ejecutarla)_
- [x] T046 [P] [HU-001-6] S3 — `PATCH …/fields` con `If-Match` (¿412?), formato de las fechas de solo fecha y código de error del valor único duplicado — `docs/spikes/S3-if-match-fechas.md` _(guía lista; falta ejecutarla)_ _(ejecutado con Graph el 2026-11-16: ver `docs/spikes/S3-if-match-fechas.md`; falta repetir las fechas con la zona de Bogotá)_
- [x] T047 [P] [HU-001-6] S4 — `lists/{id}/items/delta?$expand=fields` vs. el filtro por `Modified` — `docs/spikes/S4-delta-listas.md` _(guía lista; falta ejecutarla; confirma la suposición del borrado remoto de campos)_ _(ejecutado con Graph el 2026-11-16: ver `docs/spikes/S4-delta-listas.md`; falta probar la caducidad del deltaLink)_
- [ ] T048 [P] [HU-001-6] S5 — `storage.persist()`, cuota y supervivencia de 8 días en iOS instalada — `docs/spikes/S5-almacenamiento-ios.md` _(guía lista; requiere 8 días)_
- [ ] T049 [P] [HU-001-6] S6 — `capture` en iOS y Android y tiempo de compresión de 12 MP en gama media y baja — `docs/spikes/S6-camara-compresion.md` _(guía lista; el tiempo de procesado ya se registra en `adjunto.agregado`)_
- [ ] T050 [P] [HU-001-6] S7 — Acceso Condicional con un dispositivo no administrado (Graph 200 desde un teléfono personal) — `docs/spikes/S7-acceso-condicional.md` _(guía lista; falta ejecutarla)_
- [x] T051 [P] [HU-001-6] S8 — CSP de `_headers` **sin `style-src 'unsafe-inline'`** con React Aria Components (overlays y posicionamiento), CSS Modules, fuentes autoalojadas, SVG, iframe de MSAL y worker de compresión, sin violaciones en la consola — `docs/spikes/S8-csp.md` _(resultado: 2 violaciones de librerías encontradas y resueltas; guarda `tests/e2e/csp.spec.ts`)_
- [ ] T052 [HU-001-6] Consolidar los resultados: actualizar los estados de los ADR afectados (0006, 0007, 0008, 0010, 0011, 0022) o crear sus reemplazos — `docs/adr/`

## Fase 6 — HU-001-2 Navegación (P1)

### Pruebas

- [x] T053 [P] [HU-001-2] Pruebas de componentes de `SetupGuard`, `InstallGate` y `RoleGuard` (redirecciones y pantalla sin permiso) — `src/app/guards/guards.test.tsx`
- [x] T054 [P] [HU-001-2] E2E de navegación en 360 (BottomNav + FAB), 768 (NavRail) y 1280 (Sidebar con los ítems de "Más"), del indicador de conexión al pasar a offline y del redimensionamiento cruzando breakpoints sin perder la ruta (ES-001-07…10) — `tests/e2e/navegacion.spec.ts`

### Implementación

- [x] T055 [HU-001-2] `sesionStore` (mock desde env: cuenta, roles, `configuracionInicialCompleta`) con una interfaz estable para la 004 — `src/shared/stores/sesionStore.ts`
- [x] T056 [HU-001-2] `uiStore` (toasts, `bloqueosActualizacion`, `pendientes`, `hayNuevaVersion`, install prompt) — `src/shared/stores/uiStore.ts` _(el aviso de instalación vive en `useInstallPrompt`, no en `uiStore`)_
- [x] T057 [HU-001-2] Guards — `src/app/guards/`
- [x] T058 [HU-001-2] `router.tsx` con todas las rutas de UX §2 (lazy). Las no implementadas son un marcador con `EmptyState`. `ErrorRuta` por ruta — `src/app/router.tsx`, `src/app/ErrorRuta.tsx`
- [x] T059 [HU-001-2] `useOnline`, `IndicadorConexion`, `ContadorPendientes` (en la barra superior sobre el degradado) — `src/shared/`
- [x] T060 [HU-001-2] `AppShell` (GradientBackground + `BarraSuperior` + `ResponsiveNav` + área de contenido con gutters y ancho máximo 1280), `BotonNuevo` (FAB amarillo sobre la BottomNav en compacto, FAB en la parte superior del riel en medio, `PrimaryButton` arriba en la sidebar en expandido; `docs/10` §4.2), `FranjaAmbiente` (ES-001-17) — `src/app/layout/`
- [x] T061 [HU-001-2] `InicioPage` estilo de la referencia 04 (fondo `suave`, `SummaryCard` con avatar y saludo y número de pendientes en `display`, `QuickActionGrid` con accesos marcadores, estado vacío "Aún no hay servicios") y `MasPage` (`Card fill` + `ListRow` por sección de UX §4) — `src/features/inicio/`, `src/features/mas/`

## Fase 7 — HU-001-5 Actualizaciones (P1)

### Pruebas

- [x] T062 [P] [HU-001-5] Prueba de componente de `AvisoActualizacion` (con bloqueo espera, sin bloqueo aplica) — `src/features/actualizacion/AvisoActualizacion.test.tsx`
- [x] T063 [P] [HU-001-5] E2E T-23 (dos builds con distinta versión servidos por `preview`; formulario simulado con bloqueo) — `tests/e2e/actualizacion.spec.ts`

### Implementación

- [x] T064 [HU-001-5] `registerSW.ts` (onNeedRefresh, `registration.update()` al iniciar y cada 60 min) — `src/infrastructure/pwa/registerSW.ts`
- [x] T065 [HU-001-5] `AvisoActualizacion` (`Toast` / `Banner` con `PrimaryButton small` "ACTUALIZAR" y espera por bloqueos) montado en `AppShell` — `src/features/actualizacion/`

## Fase 8 — HU-001-3 Ajustes (P2)

- [x] T066 [P] [HU-001-3] Prueba de `AjustesPage`: cambia y persiste el **tamaño de fuente** (sin selector de tema) y aplica la escala antes del primer render al recargar — `src/features/ajustes/AjustesPage.test.tsx`
- [x] T067 [HU-001-3] `preferenciasStore` (Zustand `persist` → `localStorage`, con try/catch; solo `escalaFuente` y `bannerInstalarDescartado`) + `AjustesPage` (`Card fill`, `SegmentedControl` Normal / Grande / Muy grande, vista previa en vivo) + `ajustes.json` — `src/features/ajustes/`

## Fase 9 — HU-001-4 Ayuda y Acerca de (P2)

- [x] T068 [P] [HU-001-4] Contenido inicial de Ayuda (instalar, trabajar sin conexión, FAQ) — `src/locales/es-CO/ayuda.json`
- [x] T069 [HU-001-4] `AyudaPage` y `AyudaTemaPage` (`Card fill`, `ListRow` por tema; renderizado estructurado, sin HTML) — `src/features/ayuda/`
- [x] T070 [HU-001-4] `AcercaPage` (versión, commit, fecha, ambiente, CHANGELOG `?raw` de la versión actual, licencia, privacidad) + `acerca.json` — `src/features/acerca/`

## Fase 10 — Cierre

- [x] T071 E2E de accesibilidad con axe en Inicio, Más, Ajustes, Ayuda, Acerca de, Instalar y `/tecnico/ui`, en 360, 768 y 1280 (CE-001-04), y comprobación de que no hay desplazamiento horizontal de 320 a 1920 px (CE-001-08) — `tests/e2e/a11y.spec.ts` _(`tests/e2e/accesibilidad.spec.ts`: 11 rutas con axe + desbordamiento de 320 a 1920 px)_
- [ ] T072 Capturas visuales `visual.spec.ts` (Inicio, Más, Ajustes, Instalar, `/tecnico/ui` × 360/768/1280). Comparar con `docs/diseno/referencia/*.png`, pedir la aprobación del dueño del producto y versionar la línea base (CE-001-07) — `tests/e2e/visual.spec.ts`
- [ ] T073 Medir CE-001-01 (arranque offline), CE-001-02 (Lighthouse) y CE-001-03 (bundle) en DEV. Anotar en la spec §8
- [ ] T074 Verificación manual M-01, M-02, M-12 y M-13 en Android, iPhone y Windows, más rotación de la tablet y redimensionamiento de la ventana del PC — `docs/pruebas/matriz-AAAA-MM-DD.md` _(plantilla lista: `docs/pruebas/matriz-PLANTILLA.md`)_
- [ ] T075 `npm run verify` + DoD (`CLAUDE.md` §9) + `CHANGELOG.md` + spec → `Implementada` en `specs/README.md`

## Dependencias

- Fase 1 → Fase 2 → **Fase 3 (sistema de diseño)** → Fase 4. La Fase 5 (spikes) puede empezar cuando exista el despliegue DEV (T043) y avanza en paralelo con las Fases 6–9. S8 (T051) necesita la Fase 3 para validar la CSP con los componentes reales.
- T021 depende de T016. T027 antes de T030–T035. T031–T033 dependen de T024–T026. T036 depende de T030–T035. T043 depende de T021–T023 y T042. T058 depende de T057. T060 depende de T033 y T059. T065 depende de T064, T056 y T035.
- La 002 y la 004 dependen de esta spec. La 004 reemplaza la fuente mock de `sesionStore` (T055) y el marcador de `/configuracion-inicial`. Las specs 003, 005, 007 y 008 agregan al catálogo los componentes específicos (ComboboxField, DateChip/Calendar/RangeCalendar, AmountInput, PhotoCarousel, BarList, DonutProgress, Pagination) sobre los tokens de la Fase 3.
