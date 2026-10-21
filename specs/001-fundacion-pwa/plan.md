# Plan 001 — Fundación PWA e interfaz base

- **Spec**: [spec.md](spec.md) · **Fecha**: 2026-10-21
- **Referencias de diseño**: SDD §4 (capas y carpetas), §11 (PWA), §12 (UI), §14.2 (`_headers`), §16 (env y ambientes), §17 (rendimiento) · UX §1–§4 · **Sistema de diseño `docs/10-Sistema-de-Diseno.md` §2–§5, §8, §9** · Referencia visual `docs/diseno/referencia/` (`styles.css`, `01`, `04`) · `docs/05` §12 (andamiaje) · `docs/07` §F0, §F2 · ADR 0003, 0004, 0014, 0015, 0020, **0022**

## 1. Contexto técnico
| Aspecto | Valor |
|---|---|
| Lenguaje / framework | TypeScript strict · React 19 · Vite (ADR-0003) |
| UI | Sistema de diseño propio (ADR-0022): `src/shared/ui/` con **CSS Modules** + `tokens.css`; controles accesibles sobre **`react-aria-components`** (+ `@internationalized/date`); fuente **Montserrat** autoalojada (`@fontsource/montserrat` 400–800); íconos **Material Symbols Rounded** como SVG (`@material-symbols/svg-500` + `vite-plugin-svgr`); `stylelint` para tokens |
| Breakpoints | compacto < 600 · medio 600–1023 · expandido ≥ 1024 · amplio ≥ 1440 (contenido máx. 1280) (`docs/10` §4.1) |
| PWA | `vite-plugin-pwa` (generateSW, `registerType: 'prompt'`), `workbox-window` |
| Router | React Router 7 (`createBrowserRouter`), rutas lazy |
| Estado | Zustand (conexión, `beforeinstallprompt`, preferencias con `persist`, toasts). Sin datos de negocio (ADR-0005) |
| Almacenamiento | Solo `localStorage` para preferencias (permitido en `features/ajustes`, ADR-0018). Dexie entra en la 002 |
| Integraciones | Ninguna remota, salvo los spikes (MSAL y Graph de prueba en ramas `spike/*` desechables) |
| Hosting | Cloudflare Pages, `wrangler pages deploy` rama `dev` (ADR-0014) |
| Pruebas | Vitest + Testing Library · Playwright (`chromium-mobile`, `webkit-mobile`, `chromium-desktop`) · `@axe-core/playwright` |
| Desempeño | Arranque offline < 2 s · JS inicial ≤ 350 KB gzip (las fuentes woff2 y los SVG cuentan en el precaché, no en el JS inicial) |

## 2. Verificación de la constitución
| Artículo | ¿Cumple? | Cómo |
|---|---|---|
| I Offline primero | ✅ | Precaché del app shell completo, **incluidas las fuentes woff2 y los íconos SVG** (sin Google Fonts ni CDN). Ninguna pantalla de esta spec usa red |
| II Cero pérdida | ✅ | No hay datos de negocio aún. La actualización del SW espera si hay un formulario con cambios (contrato `bloqueoActualizacion`), lo que deja lista la protección para las specs siguientes |
| III Sin backend ni secretos | ✅ | Solo hosting estático. `.env.*` con valores públicos validados con zod. El build de producción falla con `VITE_AUTH_MODE=mock` (SDD §8.6) |
| IV Identidad confirmada | ✅ | No hay escritura remota. Los spikes S1/S2 usan cuentas de prueba en DEV y no se integran a `main` |
| V Idempotencia | ✅ N/A | Sin operaciones remotas |
| VI Dominio puro | ✅ | Se crean `domain/`, `application/`, `infrastructure/`, `features/` y `shared/` con las reglas de `eslint-plugin-boundaries` desde el primer commit |
| VII Pruebas primero | ✅ | Pruebas de guards, standalone, plataforma y bloqueo de actualización antes de sus implementaciones |
| VIII Accesible y es-CO | ✅ | i18next `es-CO` desde el inicio, regla de lint contra literales en JSX, axe en E2E en 3 viewports, escala de fuente en `rem`. **Tokens con los valores AA de `docs/10` §2.1** (no los originales de la referencia), controles de 44 px, foco visible en todos los componentes (anillo de 2 px), controles complejos sobre React Aria (teclado, ARIA, lectores de pantalla) |
| IX Seguridad | ✅ | `public/_headers` con la CSP de SDD §14.2, **sin `style-src 'unsafe-inline'`** (CSS Modules estáticos, sin CSS-in-JS) y con `font-src 'self'`. Lo valida el spike S8. Reglas de lint: prohibido `dangerouslySetInnerHTML`, y `localStorage` solo en `infrastructure/auth` y `features/ajustes` |
| X Simplicidad | ✅ | Solo las dependencias de `docs/05` §1.2 con el reemplazo de UI del ADR-0022. Sin librería de gráficas ni de CSS-in-JS. El catálogo base se limita a lo que usan las pantallas de esta spec. El resto lo agrega la spec que lo necesite |
| XI Trazabilidad | ✅ | FR → RF. Los spikes que cambien una decisión generan ADR |

## 3. Diseño de la funcionalidad

### 3.1 Archivos
```
/ (raíz del repo)
  .gitattributes  .gitignore  .editorconfig  .node-version  .nvmrc(opc.)
  .vscode/settings.json  .vscode/extensions.json
  .env.example  .env.development  .env.test        # .env.production se crea en F10
  .husky/pre-commit  .husky/commit-msg  .husky/pre-push
  commitlint.config.js  .lintstagedrc.json  .prettierrc.json
  eslint.config.js  .stylelintrc.json  tsconfig.json  tsconfig.node.json
  vite.config.ts  vitest.config.ts  playwright.config.ts
  index.html  CHANGELOG.md
public/
  _headers  robots.txt
  icons/icon-192.png  icon-512.png  maskable-512.png  apple-touch-icon-180.png
src/
  main.tsx                          # en esta spec: render directo (MSAL entra en la 004). Importa fuentes y tokens
  vite-env.d.ts                     # tipos de __APP_VERSION__, __GIT_COMMIT__, __BUILD_DATE__ y de los SVG (?react)
  app/
    App.tsx  router.tsx  providers.tsx  escalaFuente.ts   # escala → html { font-size: calc(87.5% * var(--escala-fuente)) }
    guards/SetupGuard.tsx  InstallGate.tsx  RoleGuard.tsx
    layout/AppShell.tsx  BarraSuperior.tsx  FranjaAmbiente.tsx  BotonNuevo.tsx   # BotonNuevo = FAB / botón de sidebar
    ErrorRuta.tsx                   # error boundary por ruta
  shared/
    env.ts                          # validación zod de import.meta.env
    i18n.ts
    errors.ts                       # AppError + CodigoError (SDD §13), base para todas las specs
    hooks/useOnline.ts  useBreakpoint.ts   # useBreakpoint(): 'compacto' | 'medio' | 'expandido' | 'amplio'
    ui/                              # Sistema de diseño (docs/10 §3). Cada componente = .tsx + .module.css + .test.tsx
      tokens.css  global.css         # tokens AA (docs/10 §2), reset, tipografía base, foco, safe areas
      breakpoints.ts                 # constantes 600 / 1024 / 1440 (las mismas que las media queries)
      Icon.tsx                       # SVG Material Symbols (aria-hidden, currentColor, tamaños 20/24/28/72)
      GradientBackground.tsx  DecoCircle.tsx
      Card.tsx  CardInner.tsx
      PrimaryButton.tsx  SecondaryButton.tsx  TextLink.tsx  PillButton.tsx
      TextField.tsx  SelectField.tsx  Checkbox.tsx  SegmentedControl.tsx
      ResponsiveNav.tsx              # BottomNav (compacto) / NavRail (medio) / Sidebar (expandido) con una sola lista de ítems
      QuickActionGrid.tsx  SummaryCard.tsx  Avatar.tsx  ListRow.tsx
      Sheet.tsx  Dialog.tsx  ResponsiveDialog.tsx   # Sheet en compacto, Dialog en medio/expandido (RAC Modal + Dialog)
      Banner.tsx  Toast.tsx  StatusBadge.tsx  SyncBadge.tsx  EmptyState.tsx  Skeleton.tsx
      IndicadorConexion.tsx  ContadorPendientes.tsx  PantallaSinPermiso.tsx
    stores/sesionStore.ts          # mock en esta spec: cuenta, roles, configuracionInicialCompleta
    stores/uiStore.ts              # toasts, bloqueoActualizacion, pendientes (proveedor inyectable)
  infrastructure/pwa/
    standalone.ts  plataforma.ts  installPrompt.ts  registerSW.ts
  features/
    instalacion/InstalarPage.tsx  instrucciones/*.tsx  BannerInstalar.tsx
    inicio/InicioPage.tsx
    mas/MasPage.tsx
    ajustes/AjustesPage.tsx  preferenciasStore.ts
    ayuda/AyudaPage.tsx  AyudaTemaPage.tsx
    acerca/AcercaPage.tsx
    actualizacion/AvisoActualizacion.tsx
    sincronizacion/SincronizacionPage.tsx   # marcador
    configuracion/ConfiguracionInicialPage.tsx  # marcador (la implementa la 004)
    tecnico/TecnicoPage.tsx                 # marcador (la implementa la 009)
    tecnico/CatalogoUiPage.tsx              # /tecnico/ui — solo con VITE_APP_ENV=dev: todos los componentes y estados
  locales/es-CO/common.json  navegacion.json  instalacion.json  ajustes.json  ayuda.json  acerca.json
tests/e2e/
  instalacion.spec.ts  navegacion.spec.ts  offline-shell.spec.ts  actualizacion.spec.ts  a11y.spec.ts
  visual.spec.ts                            # capturas 360×740, 768×1024, 1280×800 (docs/10 §9)
docs/spikes/
  S1-msal-redirect-pwa.md … S8-csp.md
```

### 3.2 Contratos
```ts
// infrastructure/pwa/plataforma.ts
export type Plataforma = 'android-chrome' | 'android-samsung' | 'android-otro'
  | 'ios-safari' | 'ios-otro' | 'windows-edge' | 'windows-chrome' | 'macos-chrome' | 'macos-safari' | 'otro';
export function detectarPlataforma(ua: string, uaData?: { platform?: string; brands?: { brand: string }[] }): Plataforma;
export function esStandalone(w: Pick<Window, 'matchMedia'> & { navigator: { standalone?: boolean } }): boolean;
export function requiereInstalacion(p: Plataforma, standalone: boolean): 'bloquear' | 'advertir' | 'no';

// infrastructure/pwa/installPrompt.ts
export function capturarInstallPrompt(): void;      // escucha beforeinstallprompt → uiStore
export function puedeInstalar(): boolean;
export function mostrarInstalacion(): Promise<'accepted' | 'dismissed' | 'no-disponible'>;

// infrastructure/pwa/registerSW.ts
export function registrarSW(opts: { onNuevaVersion: () => void; intervaloMs?: number }): { aplicar: () => Promise<void> };

// shared/stores/uiStore.ts
interface UiState {
  bloqueosActualizacion: Set<string>;                 // ids de formularios con cambios o sync en curso
  bloquearActualizacion(id: string): void; liberarActualizacion(id: string): void;
  pendientes: number;                                 // lo alimenta la 002/005 mediante setPendientes
}

// app/guards
<SetupGuard>  // si !sesion.configuracionInicialCompleta → <Navigate to="/configuracion-inicial" />
<InstallGate> // requiereInstalacion(...) === 'bloquear' → <Navigate to="/instalar" />
<RoleGuard roles={['Administrador']}> // sin rol → <PantallaSinPermiso />

// shared/hooks/useBreakpoint.ts
export type Breakpoint = 'compacto' | 'medio' | 'expandido' | 'amplio';
export function useBreakpoint(): Breakpoint;          // matchMedia con las constantes de breakpoints.ts

// shared/ui/ResponsiveNav.tsx
export interface ItemNav { id: string; ruta: string; icono: IconName; etiquetaKey: string; roles?: Rol[]; grupo: 'principal' | 'mas'; badge?: number }
export function ResponsiveNav(props: { items: ItemNav[] }): JSX.Element;
// compacto → BottomNav con los 'principal' (4) · medio → NavRail con 'principal' · expandido → Sidebar con 'principal' + 'mas'

// shared/ui/ResponsiveDialog.tsx
export function ResponsiveDialog(props: { titulo: string; abierto: boolean; onCerrar(): void; children: ReactNode }): JSX.Element;
// compacto → Sheet inferior con asa; medio/expandido → Dialog modal centrado, máx. 560 px

// shared/ui/PrimaryButton.tsx (patrón de todos los controles)
export function PrimaryButton(props: RACButtonProps & { size?: 'normal' | 'small' }): JSX.Element;

// app/escalaFuente.ts
export type EscalaFuente = 1 | 1.15 | 1.3;
export function aplicarEscalaFuente(escala: EscalaFuente, root?: HTMLElement): void; // fija --escala-fuente en <html>
```

### 3.3 Flujo de actualización
```
registrarSW → onNeedRefresh → uiStore.hayNuevaVersion = true → <AvisoActualizacion/>
Usuario pulsa "Actualizar":
  si bloqueosActualizacion.size > 0 → texto "Se actualizará al terminar" y suscribirse:
       al quedar vacío → aplicar()
  si no → aplicar()  (updateSW(true) → recarga)
Además: registration.update() al arrancar y cada 60 min (SDD §11.4)
```

### 3.4 Decisiones locales
- **Sesión mock en esta spec**: `sesionStore` arranca desde `.env.test`/`.env.development` con `VITE_AUTH_MODE=mock` (cuenta y roles fijos, `configuracionInicialCompleta=true`) para poder recorrer las rutas. La 004 reemplaza la fuente por el `AuthPort` real sin cambiar la interfaz del store.
- **Escala de fuente**: todos los tamaños tipográficos y de espaciado de texto están en `rem` (`docs/10` §2.4). `aplicarEscalaFuente` fija `--escala-fuente` en `<html>` y `global.css` define `html { font-size: calc(87.5% * var(--escala-fuente, 1)) }`. Se aplica antes del primer render (desde la preferencia guardada) para evitar saltos.
- **Solo tema claro** (ADR-0022): no hay selector de tema. El modo oscuro queda en el backlog.
- **Tokens**: `tokens.css` es el **único** archivo con colores, radios, sombras y tamaños literales, con los valores **AA** de `docs/10` §2.1 (no los originales de la referencia). `stylelint` (`color-no-hex` + `declaration-property-value-disallowed-list`) prohíbe literales en cualquier otro `*.css`. Los colores de estado de servicio y sync también son tokens (`--estado-recibido`, `--sync-pendiente`, …).
- **Fuentes**: `@fontsource/montserrat/{400,500,600,700,800}.css` importados en `main.tsx`, solo el subconjunto latin. Vite los empaqueta y el SW los precachea.
- **Íconos**: `@material-symbols/svg-500/rounded/<nombre>-fill.svg?react` vía `vite-plugin-svgr`. `Icon.tsx` expone un mapa tipado `IconName` con los íconos de `docs/10` §2.5, para que el bundle incluya solo esos.
- **React Aria Components**: base de `PrimaryButton`/`SecondaryButton`/`PillButton` (`Button`), `TextLink` (`Link`), `TextField`, `SelectField` (`Select`), `Checkbox`, `SegmentedControl` (`ToggleButtonGroup`), `Sheet`/`Dialog` (`Modal` + `Dialog`) y `ListRow` (`GridList`). Se estilizan con CSS Modules mediante los atributos `data-*` de estado de RAC (`[data-focus-visible]`, `[data-disabled]`, `[data-pressed]`, `[data-invalid]`).
- **Navegación**: `ResponsiveNav` recibe una sola lista de ítems. La presentación cambia **solo con CSS** cuando es posible (BottomNav ↔ NavRail). La Sidebar (que agrega los ítems de "Más") usa `useBreakpoint`. Safe areas con `env(safe-area-inset-*)`.
- **Fondo**: `GradientBackground` (variantes `principal` y `suave`; Inicio usa `suave` como la referencia 04) con 2–3 `DecoCircle` posicionados por breakpoint (`docs/10` §2.6, §4.4), `aria-hidden`.
- **Mapeo de pantallas de esta spec** (`docs/10` §6): Instalar ← referencia 01 (logo "ST" en un círculo blanco, `h1` y subtítulo, instrucciones en una `Card`, `PrimaryButton` "INSTALAR"). Inicio ← referencia 04 (`SummaryCard` con avatar y saludo + `QuickActionGrid` de 3/4/6 columnas con accesos marcadores). Más, Ajustes, Ayuda y Acerca de: `Card fill` + `h2` centrado + filas `ListRow` con ícono `primary` y chevron.
- **Catálogo `/tecnico/ui`**: se registra en el router solo si `env.VITE_APP_ENV === 'dev'` (el import dinámico queda fuera del build de PRD). Muestra cada componente en sus estados y sirve de base a las capturas de `visual.spec.ts`.
- **Novedades**: `AcercaPage` importa `CHANGELOG.md?raw` y muestra la sección de la versión actual como texto preformateado (sin HTML, Artículo IX).
- **Ayuda**: contenido estructurado en `ayuda.json` (títulos, párrafos y listas), renderizado con componentes. Sin Markdown a HTML.
- **Literales en JSX**: regla `i18next/no-literal-string` o `react/jsx-no-literals` (lo que esté disponible) en modo error dentro de `src/features` y `src/app`.
- **Íconos de la app (PWA)**: provisionales hasta resolver la aclaración del logo ("ST" en un círculo blanco sobre el degradado principal). Generados una sola vez y versionados en `public/icons/`. `theme_color` del manifest = `#4A4AF8` (`--primary`) y `background_color` = `#1F6FE5` (`--gradient-start`).
- **Spikes**: cada spike vive en una rama `spike/Sx-*` que **no** se integra a `main`. Solo se integra su documento `docs/spikes/Sx-*.md` (plantilla: pregunta, entorno, pasos, resultado, evidencia y decisión/ADR).

## 4. Estrategia de pruebas
| Nivel | Qué | Archivo |
|---|---|---|
| Unit | `detectarPlataforma` (matriz de user agents), `esStandalone`, `requiereInstalacion` | `src/infrastructure/pwa/plataforma.test.ts` |
| Unit | `aplicarEscalaFuente` fija la variable; `env.ts` rechaza configuraciones inválidas; `useBreakpoint` con `matchMedia` simulado | `src/app/escalaFuente.test.ts`, `src/shared/env.test.ts`, `src/shared/hooks/useBreakpoint.test.ts` |
| Comp | Componentes base del sistema de diseño: estados (foco visible, deshabilitado, error), roles ARIA, teclado; `ResponsiveNav` por breakpoint; `ResponsiveDialog` Sheet vs. Dialog | `src/shared/ui/*.test.tsx` |
| Estático | `stylelint`: sin colores ni radios literales fuera de `tokens.css` | `npm run lint` |
| Comp | Guards (redirecciones y sin permiso) | `src/app/guards/guards.test.tsx` |
| Comp | `AvisoActualizacion` con y sin bloqueos | `src/features/actualizacion/AvisoActualizacion.test.tsx` |
| Comp | `AjustesPage` persiste las preferencias | `src/features/ajustes/AjustesPage.test.tsx` |
| Script | El build de producción con mock falla (T-18 del plan de pruebas) | `scripts/check-build-mock.mjs` |
| E2E | Pantalla Instalar en webkit-mobile no standalone bloquea (T-22); navegación en 360 / 768 / 1280 (BottomNav, NavRail, Sidebar); app shell offline tras la primera carga, con fuentes e íconos (`npm run preview` + `context.setOffline`); actualización con bloqueo (T-23); axe en los 3 viewports; sin desplazamiento horizontal de 320 a 1920 px | `tests/e2e/*.spec.ts` |
| Visual | Capturas de Inicio, Más, Ajustes, Instalar y `/tecnico/ui` en 360×740, 768×1024 y 1280×800 (`toHaveScreenshot`), línea base aprobada tras compararla con `docs/diseno/referencia/*.png` | `tests/e2e/visual.spec.ts` |
| Manual | Matriz M-01, M-02, M-12 y M-13 (`docs/08` §5) en DEV | `docs/pruebas/` |

## 5. Riesgos
| Riesgo | Mitigación |
|---|---|
| El login por redirect falla en la PWA instalada de iOS (S1) | Se prueba primero. Si falla, se crea un ADR con la alternativa antes de la 004 |
| La CSP sin `style-src 'unsafe-inline'` rompe React Aria (estilos posicionales), MSAL (iframe) o el worker (S8) | Validar con un build real en Cloudflare. React Aria aplica estilos vía el CSSOM (`element.style`), que la CSP no bloquea. Si algo falla, documentarlo en S8 y ajustar SDD §14.2 con un ADR |
| El precaché crece con las fuentes (5 pesos) | Solo el subconjunto latin en woff2 (~20 KB por peso). Revisar con el visualizer y quitar pesos no usados |
| Las capturas visuales son frágiles entre sistemas operativos | Generar la línea base y comparar siempre en el mismo entorno (Chromium de Playwright en el PC de desarrollo), con un umbral `maxDiffPixelRatio` bajo |
| Desviaciones respecto a la referencia por los ajustes AA | Están documentadas en `docs/10` §2. Las aprueba el dueño del producto al aceptar la línea base visual (CE-001-07) |
| `beforeinstallprompt` no se dispara en algunos navegadores | Siempre hay instrucciones manuales |

## 6. Seguimiento de complejidad
| Desviación | Por qué | Alternativa simple rechazada |
|---|---|---|
| Sistema de diseño propio (~25 componentes base) en lugar de una librería con estilos | La referencia visual del usuario no se puede reproducir con Fluent o MUI sin sobrescribirlo casi todo (ADR-0022) | Fluent UI con tema: baja fidelidad y CSP con `unsafe-inline` |
