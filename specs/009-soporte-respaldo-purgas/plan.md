# Plan 009 — Soporte técnico, respaldo y purgas

- **Spec**: [spec.md](spec.md) · **Fecha**: 2026-10-21
- **Referencias de diseño**: SDD §6.2 (purgas, cuota), §11.4 (actualización), §15 (logger), §4.2 (`application/respaldo`, `features/tecnico`) · Modelo de datos §6.3, §8 · UX §4, §5 · **Sistema de diseño `docs/10` §3, §4.3 (tablas), §6** · ADR 0008, 0017, 0018, **0022** · `docs/09` §7

## 1. Contexto técnico
| Aspecto | Valor |
|---|---|
| Lenguaje / framework | TypeScript strict · React 19 (ADR-0003) |
| UI | Sistema de diseño de la spec 001 (React Aria Components + CSS Modules + tokens, ADR-0022). Reutiliza `Card`, `ListRow`, `ResponsiveDialog`, `Banner`, `PrimaryButton`, `SecondaryButton`, `TextField`, `SegmentedControl`, `DonutProgress` (005, uso de almacenamiento) y `TablaResponsive` (006). Sin componentes nuevos en el catálogo. La página `/tecnico/ui` (catálogo, solo DEV) ya existe desde la 001 y se mantiene junto al menú técnico |
| Almacenamiento | Dexie: todas las tablas. Sin cambios de esquema |
| Integraciones | Ninguna nueva. Reutiliza `refrescarCatalogos` (004), el engine (005/006) y `registration.update()` (001) |
| APIs del navegador | Web Share API Level 2 (`navigator.canShare({ files })`), `URL.createObjectURL` para descarga, `navigator.storage.estimate()/persisted()`, `navigator.userAgentData` |
| Librerías | `fflate` (ya en el stack, ADR-0003) |
| Pruebas | Vitest + fake-indexeddb · Testing Library · Playwright (descarga interceptada) |
| Desempeño | Respaldo en streaming con `fflate.Zip` + `ZipPassThrough` para los JPEG/PDF (ya comprimidos) y `ZipDeflate` para el JSON |

## 2. Verificación de la constitución
| Artículo | ¿Cumple? | Cómo |
|---|---|---|
| I Offline primero | ✅ | Todo funciona sin red salvo "Refrescar catálogos" y "Buscar actualización" (declarados y deshabilitados sin red) |
| II Cero pérdida | ✅ | Purgas filtran `syncState === 'synced'` en la misma transacción que borran. La importación nunca sobrescribe. El restablecimiento con pendientes exige respaldo + "BORRAR". Pruebas T006–T009 (T-08) |
| III Sin backend ni secretos | ✅ | El respaldo se comparte con las apps del dispositivo; no se sube a ningún servidor propio |
| IV Identidad confirmada | ✅ | No hay escrituras remotas en esta spec. Las importaciones se suben por la sincronización confirmada normal |
| V Idempotencia | ✅ | La importación omite los IDs existentes. La subida posterior es idempotente (spec 005) |
| VI Dominio puro | ✅ | `seleccionarPurgables` y `validarManifiesto` son puros en `domain/`. Casos de uso en `application/respaldo` y `application/sync/purgas.ts` |
| VII Pruebas primero | ✅ | T004–T010 antes de T011–T026 |
| VIII Accesible y es-CO | ✅ | Menú técnico navegable por teclado, confirmaciones con `ResponsiveDialog` (RAC `Modal` + `Dialog`: foco atrapado, Esc), tablas con `th scope` en expandido, textos en `locales/es-CO/tecnico.json`. Solo tokens y componentes de `docs/10`. axe en 360/768/1280 |
| IX Seguridad | ✅ | El logger y la exportación filtran claves sensibles (`token`, `authorization`, `blob`, query strings). El respaldo no incluye el caché de MSAL ni `localStorage` |
| X Simplicidad | ✅ | Sin cifrado del respaldo (ADR-0018). Sin servicio de telemetría |
| XI Trazabilidad | ✅ | FR → RF. El manifiesto del respaldo lleva versión de app, dispositivo y fecha |

## 3. Diseño de la funcionalidad

### 3.1 Archivos
```
src/domain/
  purgas.ts                         # seleccionarPurgables(servicios, adjuntos, ahora, cfg) → {blobs[], servicios[]}
  respaldo.ts                       # ManifiestoRespaldo, validarManifiesto(), FORMATO_RESPALDO_VERSION = 1
src/application/
  sync/purgas.ts                    # ejecutarPurgas() — transaccional; se engancha en alFinalizar del SyncEngine si resultado = 'OK'
  respaldo/exportarRespaldo.ts      # (alcance: 'pendientes' | 'todos') → Blob ZIP + nombre
  respaldo/importarRespaldo.ts      # (zip) → { importados, omitidos, errores }
  tecnico/estadoDispositivo.ts      # agrega plataforma, standalone, persisted, estimate, dispositivoId, versión DB
  tecnico/estadoSharePoint.ts       # lee meta (siteId, listIds, driveId, ultimaSyncEn, metodoPull, ultimoCorrelationId)
  tecnico/reintentarErrores.ts      # intentos = 0, proximoIntentoEn = undefined en syncState = 'error'
  tecnico/restablecerApp.ts         # salvaguardas + db.delete() + limpiar MSAL vía AuthPort.cerrarSesion()
src/infrastructure/
  respaldo/zip.ts                   # fflate (streaming) para empaquetar y desempaquetar
  respaldo/compartir.ts             # Web Share con respaldo de descarga
  logging/logger.ts                 # (spec 002) + sanitizar(datos) y consultar(filtro)
src/features/tecnico/
  pages/MenuTecnicoPage.tsx         # UX §5: Card fill + h2 + ListRow por opción (ícono primary + chevron)
  components/EstadoDispositivo.tsx  # DonutProgress de uso/cuota + TablaResponsive clave/valor
  components/EstadoSharePoint.tsx   # TablaResponsive clave/valor (IDs, última sync, método de pull)
  components/VisorLogs.tsx          # SegmentedControl por nivel + búsqueda; TablaResponsive virtualizada (ts · nivel · evento · mensaje · correlationId)
  components/ExportarRespaldoDialog.tsx   # ResponsiveDialog
  components/ImportarRespaldoDialog.tsx   # ResponsiveDialog, solo Admin
  components/RestablecerAppDialog.tsx     # ResponsiveDialog + Banner de peligro, solo Admin
  components/LiberarEspacioDialog.tsx     # ResponsiveDialog
src/locales/es-CO/tecnico.json
tests/e2e/respaldo.spec.ts
```

### 3.2 Contratos
```ts
// domain/respaldo.ts
export interface ManifiestoRespaldo {
  formato: 1; appVersion: string; esquemaDb: number; dispositivoId: string;
  creadoEn: string; alcance: 'pendientes' | 'todos';
  servicios: number; adjuntos: number;
}
// Estructura del ZIP:
//   manifiesto.json
//   servicios.json            → Servicio[] (sin campos de sesión de subida)
//   adjuntos.json             → metadatos de Adjunto[] (sin blob/miniatura)
//   archivos/{adjuntoId}.{jpg|pdf}
//   miniaturas/{adjuntoId}.jpg
//   logs.json
export function validarManifiesto(m: unknown): { ok: true; m: ManifiestoRespaldo } | { ok: false; motivo: 'FORMATO' | 'VERSION' };

// domain/purgas.ts
export function seleccionarPurgables(s: Servicio[], a: Adjunto[], ahora: Date,
  cfg: { retencionOriginalesDias: number; retencionCerradosMeses: number }):
  { blobsALiberar: string[]; serviciosAEliminar: string[] };   // solo syncState === 'synced'

// application/tecnico/restablecerApp.ts
export type SalvaguardaRestablecer =
  | { pendientes: 0 }
  | { pendientes: number; respaldoExportado: true; confirmacionEscrita: 'BORRAR' };
```

### 3.3 Flujo
- **Purgas**: `SyncEngine.alFinalizar` (spec 005) → si `resultado === 'OK'` → `ejecutarPurgas()`. Dentro de **una** transacción `rw` sobre `servicios` y `adjuntos`, se vuelve a leer cada candidato y se confirma `syncState === 'synced'` antes de modificarlo (evita las carreras con ediciones concurrentes). Se registra `purga` en el log con los conteos y los bytes estimados liberados.
- **Exportar**: `exportarRespaldo` lee los servicios según el alcance, sus adjuntos con blob y los logs; arma el ZIP en streaming (`zip.ts`) y devuelve `Blob` + nombre `respaldo-servicioTec-{dispositivo8}-{yyyyMMdd-HHmm}.zip`. `compartir.ts`: si `navigator.canShare?.({ files: [file] })` → `navigator.share`; si no, o si se cancela (`AbortError`), descarga con un `<a download>`.
- **Importar** (Admin): desempaqueta → `validarManifiesto` (formato 1; `esquemaDb` ≤ el actual) → por servicio: si existe el `id` localmente → omitido; si no → insertar con `syncState = 'pending'`, `camposSucios` = todos los campos si no tiene `sp.itemId`, o los que traía si lo tiene, y sus adjuntos con `syncState = 'pending'` (los que no traen archivo y ya estaban sincronizados → `synced` sin blob). Todo en una transacción por servicio.
- **Restablecer** (Admin): contar los pendientes → aplicar `SalvaguardaRestablecer` → `AuthPort.cerrarSesion()` → `db.delete()` → recargar en `/configuracion-inicial`.

### 3.4 Decisiones locales
- Visibilidad por rol con `useRoles()` (spec 004): Importar y Restablecer solo para `Administrador`. El resto, para todos (UX §5).
- `sanitizar(datos)` elimina recursivamente las claves `token`, `accessToken`, `authorization`, `blob`, `miniatura`, `uploadUrl` y recorta las URLs a origen + ruta (sin query).
- El visor de logs usa `@tanstack/react-virtual` y lee de Dexie ordenado por `seq` descendente.
- **Adaptación por breakpoint** (`docs/10` §4.3): compacto y medio = estado del dispositivo, estado de SharePoint y logs como **tarjetas apiladas** (`TablaResponsive` en modo tarjeta: una tarjeta por entrada, con la etiqueta de cada valor); expandido = **tablas reales** con encabezados, y el menú técnico en dos columnas (opciones a la izquierda, con 4 col.; panel del detalle seleccionado a la derecha, con 8 col.). Los diálogos son Sheet en compacto y modal de máx. 560 px en medio/expandido.
- **Estilo**: mismo lenguaje que Más (`Card fill` sobre el degradado, `h2` centrado). Las acciones destructivas (Restablecer) usan `SecondaryButton` con texto `--danger` y un `Banner` de advertencia. Nunca el amarillo `accent` para acciones peligrosas.
- "Estado del dispositivo" muestra los bytes con `Intl.NumberFormat` (KB/MB/GB).
- El tamaño estimado del respaldo = Σ `tamanoBytes` de los adjuntos con blob + ~2 KB por servicio.

## 4. Estrategia de pruebas
| Nivel | Qué | Archivo | Caso docs/08 |
|---|---|---|---|
| Unit | `seleccionarPurgables`: nunca incluye `pending`/`error`/`conflict`/`syncing`/`local`; límites de días y meses | `src/domain/purgas.test.ts` | T-08 |
| Unit | `validarManifiesto` (formato, versión, campos faltantes) | `src/domain/respaldo.test.ts` | — |
| Unit | `sanitizar` del logger | `src/infrastructure/logging/logger.test.ts` | — |
| Int | `ejecutarPurgas`: edición concurrente entre la selección y el borrado → no se borra; solo tras sync OK | `src/application/sync/purgas.int.test.ts` | T-08 |
| Int | `exportarRespaldo` → `importarRespaldo` ida y vuelta en dos bases (fake-indexeddb): importados, omitidos, estados resultantes | `src/application/respaldo/respaldo.int.test.ts` | T-24 (parcial) |
| Int | `restablecerApp`: rechazado sin salvaguardas con pendientes; OK sin pendientes | `src/application/tecnico/restablecerApp.int.test.ts` | — |
| Comp | `MenuTecnicoPage` por rol (Admin vs. no Admin), botones deshabilitados sin red, tarjetas en compacto y tablas y 2 columnas en expandido | `src/features/tecnico/pages/MenuTecnicoPage.test.tsx` | — |
| Visual | Menú técnico, visor de logs y diálogos en 360/768/1280 | `tests/e2e/visual.spec.ts` | — |
| E2E | Exportar respaldo genera un ZIP con `servicios.json` y los adjuntos pendientes (descarga interceptada y descomprimida en la prueba) | `tests/e2e/respaldo.spec.ts` | T-24 |

## 5. Riesgos
| Riesgo | Mitigación |
|---|---|
| Memoria al generar un ZIP grande en iOS | Streaming con fflate, opción "Solo pendientes" por defecto, aviso de tamaño |
| `navigator.share` con archivos no soportado en escritorio | Respaldo de descarga |
| Carrera entre la purga y una edición | Re-lectura y verificación dentro de la transacción |
| Importar un respaldo de una versión de esquema más nueva | Rechazo por `esquemaDb` > actual |

## 6. Seguimiento de complejidad
| Desviación | Por qué | Alternativa simple rechazada |
|---|---|---|
| ZIP en streaming | Evita duplicar en memoria cientos de MB en móviles | `zipSync` en memoria: riesgo de quedarse sin memoria en gama baja |
