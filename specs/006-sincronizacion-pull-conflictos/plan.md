# Plan 006 — Sincronización: descarga y conflictos (pull)

- **Spec**: [spec.md](spec.md) · **Fecha**: 2026-10-21
- **Referencias de diseño**: SDD §7.3 (cambios remotos, adjuntos remotos, miniaturas), §9.2 (sección PULL), §9.4 (respaldo por `Modified`), §9.5 (merge a 3 vías), §10.3 (visualización) · Modelo de datos §2, §3, §4 (choices desconocidos), §6, §8 (`meta.deltaLinkServicios`) · UX §3.5, §3.8, §3.9 · **Sistema de diseño `docs/10` §3, §4.3 (tablas), §6** · ADR 0009, 0010, 0011, **0022**

## 1. Contexto técnico

| Aspecto              | Valor                                                                                                                                                                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lenguaje / framework | TypeScript strict · React 19 (ADR-0003)                                                                                                                                                                                                                                                                                        |
| UI                   | Sistema de diseño de la spec 001 (React Aria Components + CSS Modules + tokens, ADR-0022). Reutiliza `Card`, `CardInner`, `Banner`, `PhotoTile` (spec 003), `ListRow`, `SyncBadge`, `PrimaryButton`, `TextLink`. Agrega `TablaResponsive` (tabla real en expandido, tarjetas apiladas en compacto/medio), que reutiliza la 009 |
| Almacenamiento       | Dexie: `servicios` (campos `base`, `conflictos`, `origen`), `adjuntos` (remotos con `blob = null`), `catalogos`, `meta`                                                                                                                                                                                                        |
| Integraciones        | Graph: `lists/{id}/items/delta` (o el filtro por `Modified`, según S4), `drives/{id}/root:/…:/children`, `thumbnails`                                                                                                                                                                                                          |
| Librerías nuevas     | Ninguna                                                                                                                                                                                                                                                                                                                        |
| Pruebas              | Vitest + fake-indexeddb + MSW (emulador de la spec 005 extendido con delta y cambios remotos) · Testing Library · Playwright                                                                                                                                                                                                   |
| Desempeño            | Páginas de 200 ítems, miniaturas máx. 50 por sync, concurrencia 4 para miniaturas                                                                                                                                                                                                                                              |

## 2. Verificación de la constitución

| Artículo                    | ¿Cumple? | Cómo                                                                                                                                                                                                                                                                 |
| --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I Offline primero           | ✅       | Todo lo descargado queda en Dexie y se consulta sin red. Abrir el original es la única acción online, declarada                                                                                                                                                      |
| II Cero pérdida             | ✅       | Un servicio con `camposSucios` nunca se sobrescribe: pasa por el merge. Eliminación remota con pendientes → conflicto. Cada página se guarda en transacción antes de avanzar el `deltaLink`. Pruebas T010, T011                                                      |
| III Sin backend ni secretos | ✅       | Solo Graph delegado                                                                                                                                                                                                                                                  |
| IV Identidad confirmada     | ✅       | El pull corre dentro de la sincronización confirmada de la spec 005                                                                                                                                                                                                  |
| V Idempotencia              | ✅       | Upsert por `ServicioId` / `sp.itemId`. Reaplicar la misma página produce el mismo estado                                                                                                                                                                             |
| VI Dominio puro             | ✅       | `mergeTresVias` (spec 002) y `aplicarCambioRemoto` son puros en `domain/`. Orquestación en `application/sync/pullServicios.ts`                                                                                                                                       |
| VII Pruebas primero         | ✅       | T004–T011 antes de T012–T024                                                                                                                                                                                                                                         |
| VIII Accesible y es-CO      | ✅       | Pantalla de conflicto con RAC `RadioGroup` etiquetado por campo (tarjetas seleccionables "Mi valor" / "SharePoint"), tabla con encabezados `th scope` en expandido, textos en `locales/es-CO/sync.json`. Solo tokens y componentes de `docs/10`. axe en 360/768/1280 |
| IX Seguridad                | ✅       | Miniaturas como Blob locales. `webUrl` abierto con `rel="noopener"`. `img-src` ya cubre `*.sharepoint.com` y `*.svc.ms` (SDD §14.2)                                                                                                                                  |
| X Simplicidad               | ✅       | Sin descarga de originales ni caché del SW para Graph                                                                                                                                                                                                                |
| XI Trazabilidad             | ✅       | FR → RF. Cambios remotos registrados en el log con `correlationId`                                                                                                                                                                                                   |

## 3. Diseño de la funcionalidad

### 3.1 Archivos

```
src/domain/
  merge.ts                         # (spec 002) mergeTresVias — se reutiliza
  sync/aplicarCambioRemoto.ts      # NUEVO: decide insertar / sobrescribir / merge / conflicto por eliminación
  sync/retencion.ts                # NUEVO: debeDescargarse(remoto, ahora, meses)
src/application/
  ports/RemoteGateway.ts           # + cambiosServicios, listarArchivosServicio, descargarMiniatura
  sync/pullServicios.ts            # NUEVO: recorrer cambios, aplicar, guardar deltaLink por página
  sync/resolverConflicto412.ts     # NUEVO: resolutor para el push (reemplaza el por defecto de la 005)
  sync/descargarMiniaturas.ts      # NUEVO
  sync/refrescarCatalogos.ts       # (spec 004 setup) — se reutiliza en cada sync
  servicios/resolverConflictos.ts  # NUEVO: aplicar las elecciones del usuario
  adjuntos/listarAdjuntosRemotos.ts# NUEVO
src/infrastructure/graph/
  sharepointGateway.ts             # + cambiosServicios (delta o filtro), listarArchivosServicio, descargarMiniatura
  mappers/adjuntoMapper.ts         # NUEVO: driveItem + listItem.fields → Adjunto remoto
src/features/sincronizacion/
  pages/ResolverConflictoPage.tsx  # UX §3.9; Card fill + h2; TablaResponsive en expandido
  components/CampoConflicto.tsx    # RAC RadioGroup: dos CardInner seleccionables (Mi valor / SharePoint + quién y cuándo)
  components/ListaConflictos.tsx   # ListRow con el punto de conflicto (pestaña "Conflictos" de la cola de la 005)
src/features/servicios/components/
  BannerConflicto.tsx              # Banner de error en el detalle (UX §3.5) + PrimaryButton small "RESOLVER"
src/features/adjuntos/components/
  AdjuntoRemoto.tsx                # PhotoTile con miniatura o ícono picture_as_pdf + TextLink "Abrir en SharePoint"
src/shared/ui/
  TablaResponsive.tsx              # NUEVO en el catálogo: <table> en expandido, tarjetas apiladas en compacto/medio (docs/10 §4.3)
tests/e2e/conflicto-dos-dispositivos.spec.ts
```

### 3.2 Contratos

```ts
// domain/sync/aplicarCambioRemoto.ts
export type DecisionCambio =
  | { tipo: 'INSERTAR'; servicio: Servicio }
  | { tipo: 'SOBRESCRIBIR'; servicio: Servicio }
  | { tipo: 'COMBINAR'; servicio: Servicio; conflictos: Conflicto[] }
  | { tipo: 'ELIMINAR_LOCAL' }
  | { tipo: 'CONFLICTO_ELIMINACION'; servicio: Servicio }
  | { tipo: 'IGNORAR'; motivo: 'SIN_SERVICIO_ID' | 'FUERA_DE_RETENCION' };
export function aplicarCambioRemoto(
  local: Servicio | undefined,
  cambio: RemoteCambio,
  ctx: { ahora: Date; retencionMeses: number }
): DecisionCambio;

// application/sync/pullServicios.ts
export function crearPullServicios(deps: {
  remoto: RemoteGateway;
  servicios: ServicioRepository;
  meta: MetaRepository;
  reloj: Clock;
  logger: Logger;
  config: () => ConfigApp;
}): (opts: {
  signal: AbortSignal;
  onProgreso: (n: number) => void;
}) => Promise<{ descargados: number; actualizados: number; conflictos: number }>;

// application/servicios/resolverConflictos.ts
export type Eleccion = { campo: keyof CamposServicio; usar: 'LOCAL' | 'REMOTO' };
export function crearResolverConflictos(deps: {
  servicios: ServicioRepository;
  reloj: Clock;
}): (servicioId: string, elecciones: Eleccion[]) => Promise<void>; // exige elegir todos los campos en conflicto
```

### 3.3 Flujo

- **Pull**: SDD §9.2 (sección PULL). Se engancha en el punto `despuesDelPush` del `SyncEngine` de la spec 005.
- **Fuente de cambios**: si el spike S4 confirma `items/delta?$expand=fields`, se usa delta y se guarda `@odata.deltaLink` en `meta.deltaLinkServicios` **al terminar cada página** (transacción con los servicios de esa página). Si no, el filtro por `Modified ≥ ultimaSyncEn − 5 min` (SDD §9.4) y la detección de eliminaciones queda deshabilitada. El método usado se guarda en `meta.metodoPull` (lo muestra el menú técnico, spec 009). Un 410 o un `deltaLink` inválido → borrar el `deltaLink` y hacer una descarga completa.
- **Primera descarga**: completa, filtrando en el cliente con `debeDescargarse` (abiertos + cerrados dentro de la retención).
- **Conflicto 412 en el push**: `resolverConflicto412` obtiene el ítem remoto, aplica `mergeTresVias` y, si no hay choque, devuelve "reintentar" al `pushServicio`, que reenvía el PATCH una vez con el nuevo eTag. Con choque → `syncState='conflict'`.
- **Adjuntos remotos**: al abrir el detalle con conexión, `listarAdjuntosRemotos` hace upsert de los adjuntos con `origen` remoto (`blob = null`). `descargarMiniaturas` corre después del pull para los servicios abiertos sin miniatura, hasta 50, saltándose si la cuota ≥ 80 %.
- **Catálogos y configuración**: `refrescarCatalogos` (spec 004) se invoca al inicio de cada sincronización. Un fallo solo genera una advertencia.

### 3.4 Decisiones locales

- `base` se actualiza siempre con los valores remotos tras aplicar un cambio, aunque queden conflictos (SDD §9.5).
- Orden del flujo para la regla del estado: `RECIBIDO < DIAGNOSTICADO < COTIZADO < EN_REPARACION < ENTREGADO < FACTURADO`. `DISPOSICION_FINAL` y `ANULADO` se consideran finales y ganan. "Incoherente" = el estado ganador exige campos que el resultado combinado no tiene (se verifica con `transicionesDisponibles` y los requisitos de la 002).
- La pantalla de conflicto muestra el "quién y cuándo" si `fields.Editor` y `fields.Modified` vienen en el cambio.
- Los servicios con `origen='remoto'` y sin cambios locales se purgan igual que los propios (spec 009).
- **Adaptación de Resolver conflicto por breakpoint** (`docs/10` §4.3): compacto y medio = una tarjeta por campo, con las dos opciones apiladas ("Mi valor" arriba, "SharePoint" abajo) y `PrimaryButton` "APLICAR Y SINCRONIZAR" fijo abajo; expandido = **tabla** (`TablaResponsive`) con las columnas Campo · Mi valor · Valor en SharePoint (con quién y cuándo) · Elección, y el botón al final. Las elecciones siguen siendo un `RadioGroup` por fila.
- **Adjuntos remotos en el detalle**: se muestran en la misma `PhotoGallery` (3 / 4 / 6 por fila) y en el `PhotoCarousel` de la cabecera (spec 007), con un badge "En SharePoint" y sin opción de eliminar.

## 4. Estrategia de pruebas

| Nivel  | Qué                                                                                                                                                                          | Archivo                                                            | Caso docs/08     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------- |
| Unit   | `aplicarCambioRemoto`: todas las ramas de `DecisionCambio`                                                                                                                   | `src/domain/sync/aplicarCambioRemoto.test.ts`                      | T-16             |
| Unit   | Merge integrado con la regla de estado e incoherencia                                                                                                                        | `src/domain/merge.estado.test.ts`                                  | T-03 (extensión) |
| Unit   | `debeDescargarse` (retención)                                                                                                                                                | `src/domain/sync/retencion.test.ts`                                | —                |
| Unit   | `adjuntoMapper`                                                                                                                                                              | `src/infrastructure/graph/mappers/adjuntoMapper.test.ts`           | —                |
| Int    | Pull: remoto nuevo insertado; remoto modificado sin cambios locales sobrescribe; con cambios → merge; delta paginado y corte a mitad; deltaLink caducado → descarga completa | `src/application/sync/pullServicios.int.test.ts`                   | T-16             |
| Int    | 412 en el push → merge → sin choque reintenta el PATCH; con choque queda `conflict`                                                                                          | `src/application/sync/resolverConflicto412.int.test.ts`            | T-15             |
| Int    | `resolverConflictos`: elecciones parciales rechazadas, LOCAL deja el campo sucio, REMOTO lo limpia, estado → pending                                                         | `src/application/servicios/resolverConflictos.int.test.ts`         | —                |
| Int    | Miniaturas: límite de 50, salto con cuota alta                                                                                                                               | `src/application/sync/descargarMiniaturas.int.test.ts`             | —                |
| Comp   | `ResolverConflictoPage`: elegir por campo, botón deshabilitado hasta elegir todo; tarjetas en compacto y tabla en expandido                                                  | `src/features/sincronizacion/pages/ResolverConflictoPage.test.tsx` | —                |
| Comp   | `TablaResponsive`: `<table>` con `th scope` en expandido y tarjetas con etiqueta por celda en compacto                                                                       | `src/shared/ui/TablaResponsive.test.tsx`                           | —                |
| Visual | Resolver conflicto en 360/768/1280                                                                                                                                           | `tests/e2e/visual.spec.ts`                                         | —                |
| E2E    | Dos contextos de navegador (A y B) sobre el mismo emulador: escenario de aceptación F6 + axe                                                                                 | `tests/e2e/conflicto-dos-dispositivos.spec.ts`                     | —                |

## 5. Riesgos

| Riesgo                                                         | Mitigación                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Delta de listas sin `fields` o inestable (S4)                  | Respaldo por `Modified` ya diseñado; método registrado en `meta`                                  |
| Volumen de la primera descarga                                 | Paginación de 200, guardado por página, progreso visible                                          |
| Conflictos falsos por diferencias de formato (fechas, números) | Comparar valores ya normalizados por el mapper (`deCamposSP`), pruebas de ida y vuelta (spec 005) |

## 6. Seguimiento de complejidad

| Desviación               | Por qué                                                     | Alternativa simple rechazada              |
| ------------------------ | ----------------------------------------------------------- | ----------------------------------------- |
| Merge a 3 vías por campo | Exigido por el ciclo multi-etapa y multi-usuario (ADR-0010) | Last-write-wins: pierde datos en silencio |
