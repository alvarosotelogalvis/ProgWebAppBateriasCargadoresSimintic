# Plan 005 — Sincronización: subida (push)

- **Spec**: [spec.md](spec.md) · **Fecha**: 2026-10-21
- **Referencias de diseño**: SDD §7 (Graph: cliente, operaciones, mappers), §8.4 (confirmación al sincronizar), §9.1–§9.3, §9.6–§9.7 (motor, errores, disparadores), §11.4 (VersionMinimaApp), §13 (errores), §15 (observabilidad) · Modelo de datos §2, §3.2, §6.3, §6.4 · UX §3.3, §3.8 · **Sistema de diseño `docs/10` §3, §4, §6 (referencias 07 y 09)** · ADR 0006, 0007, 0009, 0010, 0011, 0017, **0022**

## 1. Contexto técnico
| Aspecto | Valor |
|---|---|
| Lenguaje / framework | TypeScript strict · React 19 (ADR-0003) |
| UI | Sistema de diseño de la spec 001 (React Aria Components + CSS Modules + tokens, ADR-0022). Esta spec **agrega** al catálogo: `BarList` (progreso), `DonutProgress` y `Chip` (`account`). Reutiliza `Card`, `Avatar`, `PillButton` (outlined), `PrimaryButton`, `SecondaryButton`, `SegmentedControl`, `ListRow`, `SyncBadge`, `Banner`, `Toast` y `ResponsiveDialog` |
| Almacenamiento | Dexie: `servicios`, `adjuntos`, `meta` (spec 002). Sin cambios de esquema |
| Integraciones | Microsoft Graph v1.0 (listas, drive, upload sessions) vía `graphClient` de la spec 004. MSAL vía `AuthPort` (spec 004) |
| APIs del navegador | Web Locks (`navigator.locks`), `AbortController`, `sessionStorage` (intención de sync), eventos `online`/`offline` |
| Librerías nuevas | Ninguna |
| Pruebas | Vitest + fake-indexeddb + MSW (emulador de Graph en memoria, `tests/fixtures/graph/`) · Testing Library · Playwright con auth mock y `page.route` |
| Desempeño | Concurrencia de subida de archivos = 2 por servicio. Timeouts de 10 s (metadatos) y 60 s (archivo o fragmento) |

## 2. Verificación de la constitución
| Artículo | ¿Cumple? | Cómo |
|---|---|---|
| I Offline primero | ✅ | La sincronización es la excepción declarada a la red. Sin red, el botón se deshabilita y la captura sigue disponible |
| II Cero pérdida | ✅ | Cada servicio se guarda en una transacción al terminar su paso. Cancelación, error, red o auth nunca borran datos. Las ediciones durante el sync se fusionan (`camposSucios` se recalcula comparando con lo enviado). Pruebas T018, T020 |
| III Sin backend ni secretos | ✅ | Solo Graph con token delegado. La `uploadUrl` se usa sin `Authorization` (SDD §7.3) |
| IV Identidad confirmada | ✅ | `PantallaSincronizacion` exige el toque. `confirmarIdentidad` aplica el modo y la ventana. Validación de `tid` y `roles` antes de escribir |
| V Idempotencia | ✅ | `ServicioId` único + `buscarServicioPorId` antes de crear + 409 → búsqueda. Archivos con nombre determinista y `replace` (Modelo §3.2) |
| VI Dominio puro | ✅ | `clasificarError`, `calcularBackoff`, `rutaAdjunto` y `nombreArchivo` son funciones puras en `domain/`. `SyncEngine` en `application/` depende solo de puertos. Graph en `infrastructure/graph` |
| VII Pruebas primero | ✅ | T004–T013 antes de T014–T030 |
| VIII Accesible y es-CO | ✅ | Progreso con `role="progressbar"` y `aria-valuenow` (`BarList`), `DonutProgress` con `role="img"` y `aria-label`, estado de sync con punto + ícono + texto (nunca solo color), mensajes por código en `locales/es-CO/sync.json`. axe y capturas en 360/768/1280 |
| IX Seguridad | ✅ | Los logs no incluyen tokens ni query strings. `Errores` de la bitácora truncado a 4000 caracteres, solo con el UPN |
| X Simplicidad | ✅ | Sin SDK de Graph. Sin cola de operaciones (sync por estado, ADR-0010) |
| XI Trazabilidad | ✅ | FR → RF. `correlationId` por ejecución y `client-request-id` por llamada |

## 3. Diseño de la funcionalidad

### 3.1 Archivos
```
src/domain/
  sync/errores.ts                 # clasificarError(status, headers, causa) → ClaseError (tabla SDD §9.6)
  sync/backoff.ts                 # retrasoEnEjecucion(n), proximoIntento(intentos, ahora)
  sync/rutas.ts                   # rutaCarpeta(servicio), nombreArchivo(servicio, adjunto) (Modelo §3.2)
  sync/version.ts                 # compararSemver(a, b)
src/application/
  ports/RemoteGateway.ts          # (SDD §4.3) — operaciones de push
  sync/SyncEngine.ts              # orquestación push (SDD §9.2, solo la sección PUSH + POST: log)
  sync/pushServicio.ts            # asegurar ítem → adjuntos → campos sucios
  sync/eventosSync.ts             # tipos de eventos (inicio, servicio:*, archivo:progreso, conflicto, fin)
  sync/confirmarIdentidad.ts      # modo confirmar/reautenticar, ventana de horas, validación tid/roles
  sync/resumenPendientes.ts       # conteos y tamaño para la pantalla
src/infrastructure/
  graph/mappers/servicioMapper.ts # aCamposSP / deCamposSP (SDD §7.4)
  graph/mappers/choices.ts        # código ↔ valor visible (Modelo §4, §3.1)
  graph/sharepointGateway.ts      # + buscarServicioPorId, crearServicio, actualizarServicio,
                                  #   actualizarMetadatosArchivo, eliminarArchivo, registrarLogSync
  graph/uploads.ts                # subida simple ≤ 4 MB y upload session por fragmentos de 3 200 KiB
  sync/webLocks.ts                # conLockSync(fn) con navigator.locks (ifAvailable)
  sync/intencionSync.ts           # guardar/leer/borrar la intención en sessionStorage
src/features/sincronizacion/
  store/useSyncStore.ts           # Zustand: progreso y eventos (ADR-0005)
  pages/SincronizacionPage.tsx    # UX §3.8
  components/ConfirmacionCuenta.tsx   # referencia 09: Avatar + amount-xl "N registros · M archivos" + Chip "ESTE DISPOSITIVO" → "SHAREPOINT" + PillButton outlined "Confirmar como …"
  components/ProgresoSync.tsx         # BarList: una fila por servicio/archivo en curso
  components/ResumenCola.tsx          # referencia 07: DonutProgress (% sincronizado) + SegmentedControl En cola · Con error · Conflictos + ListRow con punto de color de sync
  components/ListaErrores.tsx
  components/ResumenSyncDialog.tsx    # ResponsiveDialog
  hooks/useAvisoConexion.ts       # aviso al volver la conexión (SDD §9.7), con Toast/Banner
src/features/inicio/components/RecordatorioPendientes.tsx   # Banner + acción en la SummaryCard de Inicio
src/shared/ui/                    # se agregan al catálogo (docs/10 §3) y a /tecnico/ui
  BarList.tsx  DonutProgress.tsx  Chip.tsx
  # IndicadorConexion y ContadorPendientes ya existen (spec 001); aquí se conectan a los datos reales
src/locales/es-CO/sync.json
tests/fixtures/graph/emuladorGraph.ts  handlers.ts   # listas + drive en memoria con fallas inyectables
tests/e2e/sync-online.spec.ts
```

### 3.2 Contratos
```ts
// domain/sync/errores.ts
export type ClaseError =
  | 'RED' | 'AUTH' | 'SIN_PERMISO' | 'CONFIGURACION' | 'IDEMPOTENCIA'
  | 'CONFLICTO' | 'NO_REINTENTABLE' | 'REINTENTABLE' | 'SESION_SUBIDA_EXPIRADA';
export function clasificarError(e: { status?: number; esTimeout?: boolean; esRed?: boolean }): ClaseError;

// domain/sync/backoff.ts
export function retrasoEnEjecucion(n: number, aleatorio: () => number): number; // min(30 s, 1 s·2^n) + jitter 0–500 ms
export function proximoIntento(intentos: number, ahora: Date): Date;            // ahora + min(1 h, 1 min·2^intentos)
export const MAX_INTENTOS_AUTOMATICOS = 8;

// application/sync/confirmarIdentidad.ts
export type ResultadoIdentidad =
  | { ok: true; token: string; cuenta: CuentaUsuario }
  | { ok: false; motivo: 'REDIRECT_EN_CURSO' | 'TENANT_INVALIDO' | 'SIN_ROL' | 'CANCELADO' };
export function crearConfirmarIdentidad(deps: { auth: AuthPort; meta: MetaRepository; reloj: Clock; config: () => ConfigApp;
  intencion: IntencionSyncPort }): (opts: { otraCuenta?: boolean }) => Promise<ResultadoIdentidad>;

// application/sync/SyncEngine.ts
export interface SyncEngine {
  sincronizar(opts: { correlationId: string; signal: AbortSignal }): Promise<ResumenSync>;
  on(evento: EventoSync['tipo'], cb: (e: EventoSync) => void): () => void;
}
export interface ResumenSync { subidos: number; archivos: number; errores: number; conflictos: number;
  resultado: 'OK' | 'Parcial' | 'Error'; }
```
La firma de `RemoteGateway.actualizarServicio` lanza `ConflictoError` en 412 (SDD §4.3). En esta spec, un `ConflictoError` solo marca el servicio para la spec 006: se emite el evento `conflicto` y se invoca el puerto `ResolutorConflictos`. Mientras la 006 no esté implementada, el resolutor por defecto deja `syncState='conflict'`.

### 3.3 Flujo
Push según SDD §9.2 (secciones PUSH y POST/log). Precisiones:
1. `SincronizacionPage` → `confirmarIdentidad()`. Si hace falta un redirect, se guarda `{ intencion: 'sync', correlationId, en }` en `sessionStorage` y se llama a `acquireTokenRedirect`. En `main.tsx`, tras `handleRedirectPromise`, si existe una intención con < 10 min de antigüedad → navegar a `/sincronizacion?reanudar=1`, que invoca el engine sin pedir otra confirmación (ES-005-03). Intenciones más viejas se descartan.
2. Precondiciones (`online`, `VersionMinimaApp` con `compararSemver`, configuración inicial completa) antes del lock.
3. `conLockSync` envuelve todo. Si el lock no está disponible → evento `ocupado` (ES-005-20).
4. Por servicio: se toma una **instantánea** de `camposSucios` al empezar. Al terminar se quitan solo los campos enviados cuyo valor local no cambió durante la subida. Los demás siguen sucios (Artículo II).
5. Archivos: `uploads.ts` decide simple (≤ 4 MB) o sesión. En una sesión persiste `{url, expira, siguienteByte}` después de **cada** fragmento confirmado. Un 404 en `uploadUrl` → `SESION_SUBIDA_EXPIRADA` → se descarta y se reinicia.
6. `actualizarServicio` con `If-Match`. Si el spike S3 concluye que no hay 412, se usa el respaldo "GET eTag → comparar → PATCH" dentro de `sharepointGateway` (decisión ya prevista en SDD §7.3, sin cambiar el puerto).
7. Al final: `registrarLogSync` (best-effort, captura y loguea su fallo) y `meta.ultimaSyncEn`. El pull (spec 006) y las purgas (spec 009) se enganchan en puntos de extensión del engine (`despuesDelPush`, `alFinalizar`).

### 3.4 Decisiones locales
- Orden de servicios: `actualizadoEn` ascendente, saltando los que tienen `proximoIntentoEn > ahora` (salvo "Reintentar" manual, que pone `intentos = 0`).
- Concurrencia: los servicios se procesan en serie; los archivos de un servicio, de a 2 (`p-limit` manual, sin dependencia).
- `client-request-id` = UUID por llamada, guardado en el log junto al `correlationId`.
- El aviso de conexión (`useAvisoConexion`) solo aparece si la sesión está dentro de la ventana (no fuerza redirects inesperados) y como máximo una vez cada 30 min.
- La versión de la app que se envía en `AppVersion` es `__APP_VERSION__`.
- **Estilo de la pantalla de sincronización** (`docs/10` §6):
  - *Confirmar* ← **referencia 09** (sin teclado PIN): `Card fill` con `h2` "Sincronizar", número `amount-xl` "3 registros · 11 archivos (6,2 MB)", `Chip account` amarillos "ESTE DISPOSITIVO" → (ícono `arrow_forward`) → "SHAREPOINT", `Avatar` + correo de la cuenta y `PillButton` outlined "Confirmar como ana@empresa.com" como acción principal. "USAR OTRA CUENTA" como `TextLink`. En lugar del teclado: la lista de lo que se subirá (`ListRow`) y, durante el sync, `ProgresoSync` (`BarList` con la barra `accent` por archivo y `primary` por servicio).
  - *Resumen y cola* ← **referencia 07**: `DonutProgress` con el % sincronizado (o el % de la ejecución en curso), `SegmentedControl` "En cola · Con error · Conflictos" y `ListRow` por servicio con el punto de color de su `syncState` + `SyncBadge` + acción "REINTENTAR" (`SecondaryButton small`) en los errores.
  - *Sin conexión*: `Banner` informativo "Sin conexión. Tus datos están seguros en este dispositivo" y el botón deshabilitado. *Versión obsoleta*: `Banner` + `PrimaryButton` "ACTUALIZAR APP".
- **Adaptación por breakpoint** (`docs/10` §4.3): compacto = `Card fill` pegada a la BottomNav, con confirmación arriba y cola abajo (scroll); medio = `Card` centrada de máx. 720 px; expandido = dos columnas (confirmación y progreso a la izquierda, con 5 col.; donut, segmentos y cola a la derecha, con 7 col.). `ResumenSyncDialog`: Sheet en compacto y modal en medio/expandido.

## 4. Estrategia de pruebas
| Nivel | Qué | Archivo | Caso docs/08 |
|---|---|---|---|
| Unit | `clasificarError` (tabla completa SDD §9.6) | `src/domain/sync/errores.test.ts` | T-13, T-14 (parcial) |
| Unit | `retrasoEnEjecucion`, `proximoIntento`, límite de 8 | `src/domain/sync/backoff.test.ts` | T-13 |
| Unit | `rutaCarpeta`, `nombreArchivo` (sanitización) | `src/domain/sync/rutas.test.ts` | — |
| Unit | Mappers ida y vuelta (fechas de solo fecha, Choice, lookup, campos excluidos) | `src/infrastructure/graph/mappers/servicioMapper.test.ts` | T-05 |
| Int | Push feliz: crear ítem, N archivos, metadatos, PATCH de los campos sucios, log | `src/application/sync/SyncEngine.push.int.test.ts` | T-09 |
| Int | Red caída a mitad de un archivo → reintento sin duplicar | ídem | T-10 |
| Int | Upload session reanudada desde `siguienteByte`; sesión expirada → nueva | `src/infrastructure/graph/uploads.int.test.ts` | T-11 |
| Int | `POST` con conflicto de valor único → búsqueda por `ServicioId` | `SyncEngine.push.int.test.ts` | T-12 |
| Int | 429 con `Retry-After` → espera y reintento; 8 fallos → error manual | ídem | T-13 |
| Int | 401 → silent → redirect pedido; 403 → no reintentable | ídem | T-14 |
| Int | 412 → servicio entregado al resolutor, los demás continúan | ídem | T-15 (parte push) |
| Int | Dos syncs simultáneos → uno ocupado | `src/infrastructure/sync/webLocks.int.test.ts` | T-17 |
| Int | `confirmarIdentidad`: ventana, modo reautenticar, tenant y rol inválidos, intención | `src/application/sync/confirmarIdentidad.int.test.ts` | — |
| Comp | `SincronizacionPage`: estados sin red, versión obsoleta, progreso, cancelar, resumen | `src/features/sincronizacion/pages/SincronizacionPage.test.tsx` | — |
| Comp | `BarList` (valores y `aria-valuenow`), `DonutProgress` (porcentaje y etiqueta), `Chip` | `src/shared/ui/*.test.tsx` | — |
| E2E | Offline → online → aviso → confirmar → sync OK → badges ✓ + axe | `tests/e2e/sync-online.spec.ts` | T-20 |
| Visual | Confirmar, progreso, resumen y cola en 360/768/1280 | `tests/e2e/visual.spec.ts` | — |

## 5. Riesgos
| Riesgo | Mitigación |
|---|---|
| `If-Match` no soportado en `/fields` (S3) | Respaldo GET + comparar eTag dentro del adaptador |
| Pérdida de la intención en el redirect de iOS standalone (S1) | Si no se recupera, el usuario vuelve a pulsar; no hay efecto dañino. Documentar el resultado del spike |
| Throttling con muchos archivos | Concurrencia 2, `Retry-After`, backoff |
| Fechas de solo fecha desplazadas por la zona del sitio | Prueba de mapper + resultado de S3; zona del sitio Bogotá (docs/06 §2.1) |

## 6. Seguimiento de complejidad
| Desviación | Por qué | Alternativa simple rechazada |
|---|---|---|
| Instantánea de `camposSucios` y fusión al terminar | Evita perder ediciones hechas durante la subida (Artículo II) | Bloquear la edición durante el sync: mala UX offline |
