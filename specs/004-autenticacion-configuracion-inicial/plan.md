# Plan 004 — Autenticación y configuración inicial

- **Spec**: [spec.md](spec.md) · **Fecha**: 2026-10-21
- **Referencias de diseño**: SDD §7.1–§7.3 (cliente Graph, resolución de IDs, operaciones de catálogo), §8.1–§8.3, §8.5–§8.6 (MSAL, primer uso, offline, roles, mock), §9.6 (reintentos), §13 (errores), §16 (env) · Modelo de datos §6, §8 · UX §3.2, §4 · **Sistema de diseño `docs/10` §3, §4, §6 (referencias 01 y 02)** · `docs/06` §1–§2 · ADR 0006, 0007, 0009, 0018, 0020, **0022**

## 1. Contexto técnico
| Aspecto | Valor |
|---|---|
| Lenguaje / framework | TypeScript strict · React 19 (ADR-0003) |
| UI | Sistema de diseño de la spec 001 (`src/shared/ui/`, React Aria Components + CSS Modules + tokens, ADR-0022). Sin componentes nuevos: `GradientBackground`, `Card`, `PillButton`, `PrimaryButton`, `SecondaryButton` (`onGradient`), `TextLink`, `Avatar`, `ListRow`, `Banner`, `ResponsiveDialog` |
| Identidad | `@azure/msal-browser` + `@azure/msal-react`, SPA + PKCE, `loginRedirect`/`acquireTokenRedirect`, `cacheLocation: 'localStorage'` (ADR-0006, 0018) |
| Datos remotos | Microsoft Graph v1.0 con `fetch` propio (sin SDK), scopes `User.Read` + `Sites.Selected` (ADR-0007) |
| Almacenamiento | Dexie: `meta` (siteId, listIds, driveId, ultimoLoginInteractivoEn, cuentaHomeId, ultimaCuenta, configuracionInicialCompleta, almacenamientoPersistente) y `catalogos` (spec 002) |
| Pruebas | Vitest + MSW (Graph simulado) · Testing Library · Playwright con `VITE_AUTH_MODE=mock` + `page.route` · manual en dispositivos (S1) |
| Opcional | PowerShell 7 + PnP.PowerShell para `scripts/provision-sharepoint.ps1` (`docs/05` §11) |

## 2. Verificación de la constitución
| Artículo | ¿Cumple? | Cómo |
|---|---|---|
| I Offline primero | ✅ | La red solo se usa en el asistente y al repetirlo. `cuentaActiva()` y los roles salen del caché de MSAL o de `meta.ultimaCuenta`, sin red |
| II Cero pérdida | ✅ | `cerrarSesion` y `cambiarCuenta` no tocan Dexie (prueba T021). Repetir la configuración solo sobrescribe `meta` y `catalogos` |
| III Sin backend ni secretos | ✅ | Cliente público SPA. Solo `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_SP_*`. Mock bloqueado en producción (T-18, spec 001) |
| IV Identidad confirmada | ✅ | Esta spec **no escribe** en SharePoint (solo lecturas de configuración y catálogos). La confirmación previa a la escritura es de la 005 |
| V Idempotencia | ✅ | Las lecturas son idempotentes. Repetir el asistente reemplaza los catálogos completos |
| VI Dominio puro | ✅ | `msal*` y `fetch` solo en `infrastructure/auth` y `infrastructure/graph`. `application/setup` usa `AuthPort` y `RemoteGateway` |
| VII Pruebas primero | ✅ | Pruebas de `graphClient`, del adapter (validación de tid/roles) y de `configuracionInicial` con MSW antes de la implementación |
| VIII Accesible y es-CO | ✅ | Asistente con indicador de progreso accesible (`aria-current="step"`), mensajes i18n por `CodigoError`. Pantallas con los tokens y componentes de `docs/10` (referencias 01 y 02) y texto blanco solo sobre el degradado AA. axe y capturas en 360/768/1280 |
| IX Seguridad | ✅ | `piiLoggingEnabled: false`. El logger no guarda tokens. CSP con `login.microsoftonline.com` en `connect-src`, `frame-src` y `form-action` (validada en S8) |
| X Simplicidad | ✅ | Sin SDK de Graph. Sin librería de wizard |
| XI Trazabilidad | ✅ | FR → RF. Los resultados de S1, S2 y S7 se reflejan en los ADR 0006 y 0007 |

## 3. Diseño de la funcionalidad

### 3.1 Archivos
```
src/main.tsx                                   # MODIFICAR: msal.initialize() + handleRedirectPromise() antes de render (SDD §8.1)
src/infrastructure/auth/
  msalConfig.ts                                # SDD §8.1 (SCOPES_GRAPH, SCOPES_LOGIN)
  msalInstance.ts                              # singleton PublicClientApplication
  msalAuthAdapter.ts                           # implementa AuthPort
  mockAuthAdapter.ts                           # solo VITE_AUTH_MODE=mock
  claims.ts                                    # extraerCuenta(idTokenClaims), validarTenantYRoles()
src/infrastructure/graph/
  graphClient.ts                               # fetch + token + client-request-id + timeouts + reintentos + AppError
  errores.ts                                   # traducirRespuesta(status, body) → AppError (SDD §9.6)
  backoff.ts                                   # calcularEspera(intento, retryAfter?) (reutilizable por la 005)
  sharepointGateway.ts                         # PARCIAL: resolverSitio, leerCatalogos, leerConfiguracion
  mappers/catalogos.ts                         # items → Cliente[], Marca[]; columns → choices por columna
src/application/ports/
  AuthPort.ts                                  # (spec 002) — ampliar: iniciarSesion(), estado(), ultimaCuenta
  RemoteGateway.ts                             # NUEVO: subconjunto de SDD §4.3 (la 005 y la 006 lo amplían)
  StoragePort.ts                               # (spec 003) — ampliar con persistir(): Promise<boolean>
src/application/setup/
  configuracionInicial.ts                      # orquesta las tareas del paso 3 con un estado observable
  refrescarCatalogos.ts                        # reutilizado al repetir el asistente
src/shared/stores/sesionStore.ts               # MODIFICAR: la fuente pasa a AuthPort (interfaz estable de la 001)
src/shared/hooks/useRoles.ts
src/app/guards/RoleGuard.tsx  SetupGuard.tsx   # MODIFICAR: roles reales; setup leído de meta
src/features/configuracion/
  ConfiguracionInicialPage.tsx  pasos/Bienvenida.tsx  pasos/IniciarSesion.tsx  pasos/PrepararDatos.tsx  pasos/Listo.tsx
src/features/auth/
  MiCuentaPage.tsx  DialogoCerrarSesion.tsx  PantallaSinAcceso.tsx
src/app/container.ts                           # MODIFICAR: AuthPort real o mock según env; graphClient; gateway
src/locales/es-CO/auth.json  configuracion.json
scripts/provision-sharepoint.ps1               # opcional (docs/06 §2.6)
tests/fixtures/graph/handlers.ts               # emulador en memoria: sitio, listas, columns, items (lo amplían la 005 y la 006)
tests/e2e/configuracion-inicial.spec.ts
```

### 3.2 Contratos
```ts
// application/ports/AuthPort.ts (amplía la 002)
export interface CuentaUsuario { homeId: string; upn: string; nombre: string; tenantId: string; roles: Rol[]; ultimoLoginInteractivoEn?: string; }
export interface AuthPort {
  cuentaActiva(): CuentaUsuario | null;                 // caché MSAL → meta.ultimaCuenta (sin red)
  rolesCacheados(): Rol[];
  iniciarSesion(opts?: { prompt?: 'select_account' | 'login' }): Promise<void>;   // redirect: la promesa no resuelve en la misma página
  asegurarToken(opts: { interactivoSiEsNecesario: boolean; forzarLogin?: boolean }): Promise<string>;
  cambiarCuenta(): Promise<void>;
  cerrarSesion(): Promise<void>;                        // logoutRedirect SIN tocar Dexie (solo meta.cuentaHomeId)
}

// infrastructure/auth/claims.ts
export function validarTenantYRoles(claims: IdTokenClaims, tenantEsperado: string):
  | { ok: true; cuenta: CuentaUsuario }
  | { ok: false; codigo: 'AUTH_TENANT_INVALIDO' | 'AUTH_SIN_ROL' };

// infrastructure/graph/graphClient.ts
export interface GraphRequest { metodo: 'GET'|'POST'|'PATCH'|'PUT'|'DELETE'; ruta: string; cuerpo?: unknown;
  cabeceras?: Record<string,string>; timeoutMs?: number; signal?: AbortSignal; correlationId?: string; }
export interface GraphClient {
  enviar<T>(req: GraphRequest): Promise<{ datos: T; estado: number; cabeceras: Headers; clientRequestId: string }>;
  paginar<T>(ruta: string, opts?: Omit<GraphRequest,'metodo'|'ruta'>): AsyncGenerator<T>;   // sigue @odata.nextLink
}
export function crearGraphClient(deps: { auth: AuthPort; logger: Logger; ids: IdGenerator;
  fetchImpl?: typeof fetch; reintentosPorLlamada?: number /* 4 */ }): GraphClient;

// application/ports/RemoteGateway.ts (subconjunto)
export interface RemoteGateway {
  resolverSitio(): Promise<SitioResuelto>;              // { siteId, webUrl, listas: Record<NombreLista,string>, driveId }
  leerCatalogos(): Promise<Catalogos>;                  // { clientes, marcas, choices: Record<string,string[]> }
  leerConfiguracion(): Promise<Record<string,string>>;
}

// application/setup/configuracionInicial.ts
export type TareaSetup = 'sitio' | 'catalogos' | 'configuracion' | 'almacenamiento';
export type EstadoTarea = { tarea: TareaSetup; estado: 'pendiente'|'en-curso'|'ok'|'error'|'advertencia'; error?: AppError; detalle?: string };
export function ejecutarPreparacion(deps, onEstado: (e: EstadoTarea) => void): Promise<{ completa: boolean }>;
```

### 3.3 Flujo de arranque y login
```
main.tsx:
  await msal.initialize()
  resultado = await msal.handleRedirectPromise()
  si resultado?.idTokenClaims:
     v = validarTenantYRoles(claims, env.TENANT)
     si !ok → guardar el motivo en sessionStorage ('auth_rechazo') → msal.logoutRedirect({ onRedirectNavigate: () => false })  # limpia el caché sin navegar
     si ok  → msal.setActiveAccount(acc); meta.ultimoLoginInteractivoEn = ahora; meta.ultimaCuenta = cuenta
  render(<App/>)   # si hay 'auth_rechazo' → PantallaSinAcceso con el mensaje según el código
```
- `asegurarToken`: `acquireTokenSilent({ scopes: SCOPES_GRAPH, account })`. Ante `InteractionRequiredAuthError`, si `interactivoSiEsNecesario` → `acquireTokenRedirect` (antes se guarda la ruta actual para volver). Si no → `AppError('AUTH_REQUERIDA')`.
- `graphClient` ante 401: un reintento con `asegurarToken({ interactivoSiEsNecesario:false, forceRefresh })`. Si vuelve a fallar → `AUTH_REQUERIDA`.
- `cerrarSesion`: `logoutRedirect({ account, postLogoutRedirectUri })`. **No** borra `meta.ultimaCuenta` (ES-004-10) ni ningún dato de negocio.

### 3.4 Decisiones locales
- **Rechazo por tenant o rol**: se limpia el caché de MSAL sin cerrar la sesión de Microsoft en el navegador (`onRedirectNavigate: () => false`), para no expulsar al usuario de otras apps de M365.
- **Choices leídos**: `Diagnostico`, `Estado`, `CotizacionEstado` y `TipoEquipo` de `Servicios`, y `TipoAdjunto` de `ServiciosAdjuntos`. Se guardan como `catalogos['choices:<Columna>']`.
- **Configuración**: `leerConfiguracion()` devuelve un mapa crudo; `combinarConfig` (spec 002) lo valida y el resultado se guarda en `catalogos['config']`.
- **Catálogo de clientes vacío** → tarea en `advertencia` (permite terminar, edge case de la spec).
- **Paso Preparar datos**: tareas secuenciales (sitio → catálogos → configuración → almacenamiento). Cada una reintentable por separado. `configuracionInicialCompleta = true` solo cuando las 3 primeras están en `ok`/`advertencia`.
- **Los reintentos y el backoff** de SDD §9.6 se implementan aquí en `graphClient`/`backoff.ts` para todas las llamadas. La clasificación por servicio (`proximoIntentoEn`, 8 intentos) es de la 005.
- **Timeouts**: 10 s para metadatos (SDD §7.1). El de archivos (60 s) lo usa la 005 por `timeoutMs`.
- **Script de aprovisionamiento**: opcional y fuera de la ruta crítica. Si el administrador crea las listas a mano, la tarea se marca como no aplicable.
- **Estilo de las pantallas** (`docs/10` §6):
  - *Bienvenida* e *Iniciar sesión* ← **referencia 01**: `GradientBackground principal` con `DecoCircle`, logo "ST" en un círculo blanco, `h1` "SERVICIO TÉCNICO" + subtítulo "BATERÍAS Y CARGADORES" con tracking. En lugar del campo de contraseña de la referencia: `PillButton` "Iniciar sesión con Microsoft" (la contraseña se escribe en la página de Microsoft). `TextLink onGradient` "¿Cómo instalar?" y "Ayuda" abajo.
  - *Preparar datos* y *Listo*: `Card` (fill en compacto) con `h2` centrado y una `ListRow` por tarea (ícono de estado `schedule`/spinner/`check_circle`/`error` + texto + `SecondaryButton small` "REINTENTAR"). `PrimaryButton` "IR AL INICIO" al terminar.
  - *Mi cuenta* ← **referencia 02** (sin teclado PIN): `Avatar` grande, nombre en `h1`, correo y roles como chips, último login. `PrimaryButton` "CAMBIAR DE CUENTA" y `SecondaryButton onGradient` "CERRAR SESIÓN". `DialogoCerrarSesion` sobre `ResponsiveDialog`, con `Banner` de advertencia si hay pendientes.
  - *PantallaSinAcceso*: misma composición de la 01, con ícono `block`, mensaje según el código y `PrimaryButton` "USAR OTRA CUENTA".
- **Adaptación por breakpoint**: compacto = composición a pantalla completa sobre el degradado, como la referencia. Medio y expandido = contenido centrado en una columna de máx. 480 px (bienvenida y login) o en una `Card` de máx. 720 px (preparar datos, Mi cuenta), con los círculos decorativos escalados en las esquinas (`docs/10` §4.3–§4.4). En expandido se mantiene la `Sidebar` en Mi cuenta. El asistente se muestra **sin** navegación (pantalla completa) en todos los tamaños.

## 4. Estrategia de pruebas
| Nivel | Qué | Archivo |
|---|---|---|
| Unit | `validarTenantYRoles` (tenant distinto, sin roles, roles desconocidos filtrados), `extraerCuenta` | `src/infrastructure/auth/claims.test.ts` |
| Unit | `calcularEspera` (exponencial, tope de 30 s, jitter, `Retry-After` en segundos y en fecha) y `traducirRespuesta` (tabla SDD §9.6) | `src/infrastructure/graph/backoff.test.ts`, `errores.test.ts` |
| Int | `graphClient` con MSW: cabeceras `Authorization` y `client-request-id`, timeout → reintentable, 429 con `Retry-After`, 401 → refresh → OK, 401 doble → `AUTH_REQUERIDA`, red caída → `RED_SIN_CONEXION`, paginación con `@odata.nextLink` | `src/infrastructure/graph/graphClient.int.test.ts` |
| Int | `sharepointGateway` + mappers con el emulador: resolución de sitio, listas y drive, catálogos (activos y choices), configuración | `src/infrastructure/graph/sharepointGateway.int.test.ts` |
| Int | `ejecutarPreparacion`: éxito, 403 (sin permiso en el sitio), 404 (sitio), catálogo vacío → advertencia, reintento por tarea, `configuracionInicialCompleta` | `src/application/setup/configuracionInicial.int.test.ts` |
| Int | `cerrarSesion` / `cambiarCuenta` no modifican servicios ni adjuntos (CE-004-04) | `src/infrastructure/auth/msalAuthAdapter.int.test.ts` (MSAL simulado) |
| Comp | Asistente: pasos, estados por tarea, Reintentar, bloqueo de avance | `src/features/configuracion/ConfiguracionInicialPage.test.tsx` |
| Comp | `RoleGuard` con roles reales y `MiCuentaPage` con la advertencia de pendientes | `src/features/auth/*.test.tsx` |
| Visual | Bienvenida, Iniciar sesión, Preparar datos, Mi cuenta y Sin acceso en 360/768/1280, comparadas con las referencias 01 y 02 | `tests/e2e/visual.spec.ts` |
| E2E | Asistente con mock auth + Graph interceptado → modo offline → la recepción usa el cliente del catálogo (parte de T-19) | `tests/e2e/configuracion-inicial.spec.ts` |
| Manual | Login real en la app instalada de Android, iOS y Windows; persistencia al reabrir; cuenta sin rol; MFA (M-03, M-04) | `docs/pruebas/` |

## 5. Riesgos
| Riesgo | Mitigación |
|---|---|
| El redirect falla en iOS standalone (S1) | Validado en la 001. Si falla, ADR de reemplazo antes de empezar esta spec |
| `Sites.Selected` no concedido o mal concedido (S2) | Error 403 diferenciado y guía en `docs/09` §8. Alternativa en el ADR-0007 |
| Acceso Condicional (S7) | Mensaje específico. Coordinación con el administrador (`docs/06` §1.8) |
| El caché de MSAL en `localStorage` se borra (limpieza del navegador) | `meta.ultimaCuenta` permite seguir capturando. El login se pide al sincronizar |
| Cambios de API entre majors de MSAL | Versión fijada en `package-lock`. Revisar la guía de migración (ADR-0003) |

## 6. Seguimiento de complejidad
| Desviación | Por qué | Alternativa simple rechazada |
|---|---|---|
| Cliente HTTP propio en lugar del SDK de Graph | Control de reintentos, timeouts, `client-request-id` y bundle pequeño (SDD §7.1) | `@microsoft/microsoft-graph-client` (más peso, reintentos menos controlables) |
