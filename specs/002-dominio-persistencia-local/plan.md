# Plan 002 — Dominio y persistencia local

- **Spec**: [spec.md](spec.md) · **Fecha**: 2026-10-21
- **Referencias de diseño**: SDD §4.3 (puertos), §5 (dominio, máquina de estados, validación), §6 (Dexie), §9.5 (merge), §13 (errores), §15 (logger) · Modelo de datos §2–§6, §8 · ADR 0004, 0005, 0008, 0010, 0012

## 1. Contexto técnico

| Aspecto        | Valor                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Lenguaje       | TypeScript strict (ADR-0003)                                                                     |
| Dominio        | Funciones puras + `zod` + `date-fns` (las únicas dependencias permitidas en `domain/`, SDD §4.1) |
| Almacenamiento | Dexie 4 + `dexie-react-hooks`, base `servicio-tecnico-bc`, esquema v1 (SDD §6.1)                 |
| Integraciones  | Ninguna remota                                                                                   |
| Pruebas        | Vitest (unitarias del dominio) + `fake-indexeddb` (integración de repositorios y casos de uso)   |
| Desempeño      | `actualizarCampos` < 50 ms. Consultas por índice                                                 |

## 2. Verificación de la constitución

| Artículo                    | ¿Cumple? | Cómo                                                                                                                                                                    |
| --------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I Offline primero           | ✅       | Todo es local                                                                                                                                                           |
| II Cero pérdida             | ✅       | Transacciones `rw` que abarcan servicios y adjuntos. `eliminarBorrador` y las purgas verifican `syncState`/`estado` dentro de la transacción. Pruebas T011, T012 y T030 |
| III Sin backend ni secretos | ✅ N/A   | —                                                                                                                                                                       |
| IV Identidad confirmada     | ✅ N/A   | Sin escritura remota. `capturadoPor` sale de `AuthPort.cuentaActiva()` (en esta spec, el fake o la sesión mock de la 001)                                               |
| V Idempotencia              | ✅       | `id` UUID v4 vía `IdGenerator`. `camposSucios` sin duplicados                                                                                                           |
| VI Dominio puro             | ✅       | `domain/` sin imports de React, Dexie ni MSAL (regla de boundaries de la 001). Casos de uso con puertos inyectados                                                      |
| VII Pruebas primero         | ✅       | Cada módulo de dominio y caso de uso tiene su tarea de prueba antes de la de código                                                                                     |
| VIII Accesible y es-CO      | ✅       | Los mensajes de validación son claves i18n (`errores.*`). Las traducciones se agregan a `common.json` / `errores.json`                                                  |
| IX Seguridad                | ✅       | El logger filtra tokens, blobs y campos sensibles (lista de exclusión)                                                                                                  |
| X Simplicidad               | ✅       | DI manual en `container.ts`, sin librerías nuevas                                                                                                                       |
| XI Trazabilidad             | ✅       | FR → RF. Ampliaciones de los puertos del SDD §4.3 documentadas en §3.4                                                                                                  |

## 3. Diseño de la funcionalidad

### 3.1 Archivos

```
src/domain/
  servicio.ts            # tipos de SDD §5 (TipoEquipo, EstadoServicio, CamposServicio, Servicio, SyncState, Rol…)
  adjunto.ts             # Adjunto, TipoAdjunto, ADJUNTO_POR_ETAPA
  config.ts              # ConfigApp, CONFIG_DEFECTO, esquemaConfigRemota, combinarConfig()
  normalizacion.ts       # normalizarCodigoAlfanumerico, normalizarMarca (los usa la 003)
  validaciones.ts        # esquemaRecepcion, esquemaDiagnostico, esquemaDisposicionFinal, esquemaCotizacion,
                         # esquemaOrdenTrabajo, esquemaEntrega, esquemaFacturacion, esquemaAnulacion
  estados.ts             # TRANSICIONES, ORDEN_ESTADOS, esFinal, transicionesDisponibles, aplicarTransicion, camposEditables
  codigo.ts              # generarCodigo
  alertas.ts             # nivelAlerta(dias, umbrales), diasRestantes(fecha, hoy)
  merge.ts               # mergeTresVias(local, remoto, base, camposSucios) → { resultado, camposSucios, conflictos }
  errores.ts             # ErrorValidacion { campo | adjunto, clave }
src/application/
  ports/ServicioRepository.ts  AdjuntoRepository.ts  UnidadDeTrabajo.ts
  ports/AuthPort.ts  IdGenerator.ts  Clock.ts  Logger.ts  MetaRepository.ts  CatalogoRepository.ts
  servicios/crearBorrador.ts  actualizarCampos.ts  completarEtapa.ts  anular.ts  descartarBorrador.ts
src/infrastructure/
  db/dexie.ts            # AppDB v1 (SDD §6.1) + manejo de error de apertura
  db/servicioRepository.ts  adjuntoRepository.ts  catalogoRepository.ts  metaRepository.ts  unidadDeTrabajo.ts
  db/hooks.ts            # useServicios, useServicio, useAdjuntos, useCatalogo, usePendientes
  db/sincronizarContadorPendientes.ts   # usePendientes → uiStore.pendientes (contrato de la 001)
  logging/logger.ts      # anillo de 2000 en la tabla logs + consola en dev
  ids/uuidGenerator.ts   # crypto.randomUUID()
  reloj/systemClock.ts
src/app/container.ts     # composición de puertos → adaptadores (auth: el mock de la 001 hasta la 004)
src/locales/es-CO/errores.json
tests/fakes/             # FakeClock, FakeIdGenerator, FakeAuth, FakeLogger, crearDbPrueba()
tests/builders/          # servicioBuilder, adjuntoBuilder (datos válidos por estado)
```

### 3.2 Contratos

```ts
// domain/estados.ts
export interface Transicion {
  desde: EstadoServicio; hacia: EstadoServicio; accion: AccionEtapa; roles: Rol[];
  requisitos: (s: Servicio, adj: Adjunto[], cfg: ConfigApp) => ErrorValidacion[];
}
export type AccionEtapa = 'completarRecepcion' | 'completarDiagnostico' | 'registrarDisposicionFinal'
  | 'registrarCotizacion' | 'generarOT' | 'registrarEntrega' | 'registrarEntregaSinReparacion'
  | 'registrarFacturacion' | 'anular';
export const TRANSICIONES: readonly Transicion[];
export function transicionesDisponibles(s: Servicio, roles: Rol[], adj: Adjunto[], cfg: ConfigApp):
  { t: Transicion; errores: ErrorValidacion[] }[];
export function aplicarTransicion(s: Servicio, accion: AccionEtapa, roles: Rol[], adj: Adjunto[],
  cfg: ConfigApp, ahora: string): Servicio;                       // lanza TransicionInvalidaError
export function camposEditables(s: Servicio, roles: Rol[]): ReadonlySet<keyof CamposServicio>;

// domain/merge.ts
export function mergeTresVias(local: Servicio, remoto: Partial<CamposServicio>): {
  servicio: Servicio;                                  // con base = remoto, camposSucios ajustados, conflictos
  conflictos: Servicio['conflictos'];
};

// application/ports (ampliaciones de SDD §4.3, ver §3.4)
export interface ServicioRepository {
  obtener(id: string): Promise<Servicio | undefined>;
  guardar(s: Servicio): Promise<void>;
  listarPendientes(): Promise<Servicio[]>;
  buscarPorSpItemId(itemId: string): Promise<Servicio | undefined>;
  buscarPorSerie(serie: string): Promise<Servicio[]>;          // NUEVO (lo usa la 003)
  eliminarBorrador(id: string): Promise<void>;                 // lanza si estado ≠ BORRADOR
  purgarCerrados(antesDe: string): Promise<number>;
}
export interface AdjuntoRepository {
  obtener(id: string): Promise<Adjunto | undefined>;           // NUEVO
  listarPorServicio(servicioId: string): Promise<Adjunto[]>;
  buscarPorHash(servicioId: string, tipo: TipoAdjunto, sha256: string): Promise<Adjunto | undefined>; // NUEVO
  guardar(a: Adjunto): Promise<void>;
  eliminarLocal(id: string): Promise<void>;
  marcarPendientes(servicioId: string): Promise<number>;       // NUEVO: local → pending
  purgarOriginales(sincronizadosAntesDe: string): Promise<number>;
}
export interface UnidadDeTrabajo { ejecutar<T>(fn: () => Promise<T>): Promise<T>; }  // NUEVO: Dexie rw sobre servicios+adjuntos
export interface MetaRepository { obtener<T>(clave: string): Promise<T | undefined>; guardar(clave: string, v: unknown): Promise<void>;
  dispositivoId(): Promise<string>; }                         // genera y persiste en el primer uso
export interface Logger { debug/info/warn/error(evento: string, datos?: Record<string, unknown>, ctx?: { correlationId?: string }): void; }

// application/servicios
crearBorrador(): Promise<Servicio>
actualizarCampos(id: string, cambios: Partial<CamposServicio>, roles: Rol[]): Promise<Servicio>  // valida camposEditables
completarEtapa(id: string, accion: AccionEtapa, roles: Rol[]): Promise<Servicio>                 // aplica la transición y marca adjuntos
anular(id: string, motivo: string, roles: Rol[]): Promise<Servicio>
descartarBorrador(id: string): Promise<void>
```

### 3.3 Reglas de `actualizarCampos` y `completarEtapa`

```
actualizarCampos(id, cambios, roles):
  s = obtener(id) ; editables = camposEditables(s, roles)
  si algún campo ∉ editables → CampoNoEditableError
  aplicar normalizaciones ; recalcular codigo si cambia tipoEquipo|numeroSolicitud|serie
  s.actualizadoEn = reloj.ahora()
  si s.estado ≠ BORRADOR: camposSucios = unión(camposSucios, campos con valor distinto); syncState = 'pending' (salvo 'conflict', que se mantiene)
  guardar(s)          # el estado 'local' de los borradores no cambia

completarEtapa(id, accion, roles):
  UnidadDeTrabajo.ejecutar:
    s, adj = obtener(id), listarPorServicio(id)
    s' = aplicarTransicion(s, accion, roles, adj, cfg, ahora)   # agrega 'estado' y los campos de la etapa a camposSucios
    si s.estado == BORRADOR: s'.camposSucios = TODOS los campos con valor ; marcarPendientes(id)
    si s.estado ≠ BORRADOR: marcar como 'pending' los adjuntos 'local' de la etapa
    guardar(s')
```

### 3.4 Decisiones locales

- **Ampliación de los puertos del SDD §4.3**: `buscarPorSerie`, `AdjuntoRepository.obtener`, `buscarPorHash`, `marcarPendientes`, `UnidadDeTrabajo` y `MetaRepository`. Son extensiones compatibles, no cambian decisiones (sin ADR). Se anota en el SDD §4.3 al cerrar la spec.
- **Estado `syncState` de un adjunto en borrador**: `'local'`. Del servicio en borrador: `'local'` (SDD §9.3).
- **Requisitos como datos**: cada transición referencia un esquema zod de etapa + requisitos de adjuntos (`{ tipo, min, max }` desde la config). `ErrorValidacion.clave` = clave i18n (`errores.serie.formato`, `errores.adjunto.min`).
- **Estado desconocido**: `EstadoServicio` admite el valor `'DESCONOCIDO'` solo en lectura (lo asigna el mapper de la 005/006). `camposEditables` devuelve un conjunto vacío y `transicionesDisponibles`, una lista vacía.
- **Merge**: la comparación usa una igualdad estructural (números, strings, `undefined` ≡ campo ausente). La regla del `estado` usa `ORDEN_ESTADOS`. Un estado final en el remoto gana siempre.
- **Error de apertura de la DB**: `AppDB.abrir()` traduce el error a `AppError('ALMACENAMIENTO_NO_DISPONIBLE')`. Si el código no existe en `CodigoError` (SDD §13), se agrega en esta spec.
- **Logger**: la escritura en Dexie no espera (fire-and-forget con catch). Recorte del anillo cada 100 escrituras. Exclusión de claves: `token`, `accessToken`, `idToken`, `blob`, `miniatura`, `authorization`.
- **Hooks**: `usePendientes()` cuenta los servicios con `syncState` en `pending`, `error` o `conflict` y publica el valor en `uiStore.setPendientes` (contrato de la 001).

## 4. Estrategia de pruebas

| Nivel | Qué                                                                                                                                | Archivo                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Unit  | Normalización y esquemas de cada etapa (campos, rangos de fechas, regex)                                                           | `src/domain/normalizacion.test.ts`, `validaciones.test.ts` |
| Unit  | Tabla de transiciones al 100 %: cada fila × {válida, falta requisito, rol incorrecto} (T-01) + `camposEditables`                   | `src/domain/estados.test.ts`                               |
| Unit  | `mergeTresVias`: 4 casos + regla del estado + estado final (T-03)                                                                  | `src/domain/merge.test.ts`                                 |
| Unit  | `nivelAlerta` y `diasRestantes` (T-04), `generarCodigo`, `combinarConfig` (valores inválidos → defecto)                            | `src/domain/*.test.ts`                                     |
| Int   | Repositorios con `fake-indexeddb`: persistencia de blobs, índices, `eliminarBorrador`, `purgarCerrados`, `purgarOriginales` (T-08) | `src/infrastructure/db/*.int.test.ts`                      |
| Int   | Casos de uso: crear → actualizar → completar recepción (T-06), atomicidad ante una falla inyectada, anular, descartar              | `src/application/servicios/*.int.test.ts`                  |
| Int   | Patrón de migración: prueba plantilla que abre v1 con datos y simula `version(2).upgrade` sin perder pendientes (T-07)             | `src/infrastructure/db/migraciones.int.test.ts`            |
| Int   | Logger: anillo de 2000 y filtrado de datos sensibles                                                                               | `src/infrastructure/logging/logger.int.test.ts`            |

## 5. Riesgos

| Riesgo                                               | Mitigación                                                                                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| La tabla de transiciones diverge del modelo de datos | La prueba T-01 se construye leyendo el modelo de datos §5 fila por fila. Cualquier cambio de PA-02/PA-03 actualiza primero el modelo y luego la tabla |
| `fake-indexeddb` no reproduce los límites de cuota   | Las fallas de cuota se simulan con un `UnidadDeTrabajo` que lanza error                                                                               |
| Supuestos de negocio (PA-01, 02, 03) cambian         | Están aislados en `estados.ts` y `validaciones.ts`. Si cambia la semántica, ADR nuevo que reemplace al 0012                                           |

## 6. Seguimiento de complejidad

| Desviación               | Por qué                                                                                        | Alternativa simple rechazada                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Puerto `UnidadDeTrabajo` | El Artículo II exige atomicidad entre servicio y adjuntos sin que `application/` importe Dexie | Llamar a `db.transaction` desde los casos de uso (viola el Artículo VI) |
