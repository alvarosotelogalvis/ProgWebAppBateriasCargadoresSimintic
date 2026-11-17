# Plan 011 — Número de solicitud automático

- **Spec**: [spec.md](spec.md) · **Fecha**: 2026-11-16
- **Referencias de diseño**: SDD §7.4 (mapeo a SharePoint), §9.2 (idempotencia del push) · Modelo de datos §2.2 · ADR-0024, ADR-0010

## 1. Contexto técnico

| Aspecto                    | Valor                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Lenguaje / framework       | TypeScript strict · React 19 · Vite (ADR-0003)                                                                                  |
| Almacenamiento local       | Sin cambio de esquema Dexie: `numeroSolicitud: 0` significa «pendiente» (el borrador ya nace con 0)                             |
| Integraciones              | Graph: lectura del mayor `NumeroSolicitud` y creación del ítem; columna `NumeroSolicitud` pasa a valor único                    |
| Pruebas                    | Vitest (dominio, aplicación, mapeadores), emulador MSW de Graph, Playwright (formulario), `npm run test:live` (SharePoint real) |
| Plataformas objetivo       | PRD §11                                                                                                                         |
| Restricciones de desempeño | +1 petición de lectura por servicio nuevo (máximo y creación); reintentos acotados a 5                                          |

## 2. Verificación de la constitución

| Artículo                    | ¿Cumple? | Cómo                                                                                                                        |
| --------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| I Offline primero           | ✅       | El registro no necesita red: el número se asigna solo al sincronizar; nunca se inventa en el dispositivo                    |
| II Cero pérdida             | ✅       | No toca la lógica de purga; el servicio pendiente conserva todo; si falla la asignación queda pendiente y se reintenta      |
| III Sin backend ni secretos | ✅       | Todo por Graph con la sesión delegada                                                                                       |
| IV Identidad confirmada     | ✅       | Sin cambios: la asignación ocurre dentro de la sincronización ya confirmada                                                 |
| V Idempotencia              | ✅       | Un servicio con número no se reasigna; reencontrar el ítem por `ServicioId` adopta su número; valor único + reintento       |
| VI Dominio puro y capas     | ✅       | Cálculo y código en `domain/`; lectura del máximo tras el puerto `RemoteGatewayPush`; Graph solo en `infrastructure/graph/` |
| VII Pruebas primero         | ✅       | Cada fase lista las pruebas antes de la implementación                                                                      |
| VIII Accesible y es-CO      | ✅       | Texto «Pendiente» en i18n; un campo menos en el formulario                                                                  |
| IX Seguridad del cliente    | ✅       | Sin cambios de CSP ni de permisos                                                                                           |
| X Simplicidad               | ✅       | `0` = pendiente, sin campo nuevo ni migración de Dexie                                                                      |
| XI Trazabilidad             | ✅       | Cada reintento por choque de número se registra en el log local                                                             |

## 3. Diseño de la funcionalidad

### 3.1 Archivos (crear / modificar)

```
src/domain/codigo.ts                          # M  «PEND» cuando numeroSolicitud = 0
src/domain/validaciones.ts                    # M  esquemaRecepcion sin numeroSolicitud
src/domain/estados.ts                         # M  numeroSolicitud fuera de los campos editables de recepción
src/domain/merge.ts                           # M  numeroSolicitud fuera de los mínimos de RECIBIDO
src/domain/sync/numeroSolicitud.ts            # C  siguienteNumero(maximo), esPendiente(n), constantes de reintento
src/application/ports/RemoteGatewayPush.ts    # M  ultimoNumeroSolicitud(), contarPorNumeroSolicitud(n), renumerarServicio(itemId, n)
src/application/sync/pushServicio.ts          # M  asigna número antes de crear; reintenta ante choque; adopta el del ítem existente
src/application/sync/SyncEngine.ts            # M  fusionarConLaBase conserva numeroSolicitud/codigo/base asignados
src/application/servicios/buscarServicios.ts  # M  no indexa «0»; duplicados por serie en servicios no finales
src/infrastructure/graph/sharepointGateway.ts # M  ultimoNumeroSolicitud(); distingue choque de NumeroSolicitud del de ServicioId
src/infrastructure/graph/mappers/*.ts         # M  la creación omite NumeroSolicitud = 0; el delta lo trae
scripts/esquema-sharepoint.mjs                # M  NumeroSolicitud: unico + indice
scripts/provision-sharepoint-graph.mjs        # M  asegura valor único en una columna ya existente
src/features/servicios/components/FormRecepcion.tsx          # M  sin campo de número
src/features/servicios/pages/DetalleServicioPage.tsx         # M  «Pendiente» cuando es 0
src/features/servicios/pages/EtapaRecepcionPage.tsx          # M  duplicado por serie
src/features/servicios/camposCorregibles.ts                  # M  quita numeroSolicitud
src/locales/es-CO/servicios.json                             # M  textos nuevos
tests/fixtures/graph/emuladorGraph.ts         # M  valor único y orden por NumeroSolicitud
tests/live/sincronizacion-real.live.test.ts   # M  escenario de dos dispositivos a la vez
docs/…                                        # M  03 §2.2, 04, 06, PRD PA-07, SDD, specs/003 (nota de reemplazo)
```

### 3.2 Contratos e interfaces

```ts
// domain/sync/numeroSolicitud.ts
export const NUMERO_PENDIENTE = 0;
export const MAX_INTENTOS_NUMERO = 5;
export const esPendiente = (numero: number): boolean => numero <= NUMERO_PENDIENTE;
export const siguienteNumero = (maximo: number | null | undefined): number => (maximo && maximo > 0 ? maximo + 1 : 1);

// application/ports/RemoteGatewayPush.ts
ultimoNumeroSolicitud(): Promise<number>; // 0 si la lista está vacía
contarPorNumeroSolicitud(numero: number): Promise<readonly { itemId: string }[]>; // ids ordenables
renumerarServicio(itemId: string, numero: number, codigo: string): Promise<{ eTag?: string }>; // devuelve el eTag nuevo (el PATCH lo cambia)

// application/sync/pushServicio.ts
export interface ResultadoPushServicio { /* … */ readonly numeroSolicitud?: number; }
```

### 3.3 Flujo

```
pushServicio(servicio):
  si sp.itemId  → ya existe: nada que asignar
  si no:
    existente = buscarServicioPorId(id)
    si existente → adopta existente.fields.NumeroSolicitud (si lo tiene) y continúa
    si no si esPendiente(servicio.numeroSolicitud):
      repetir hasta MAX_INTENTOS_NUMERO:
        n = siguienteNumero(await ultimoNumeroSolicitud())
        intentar crearServicio({ …campos, NumeroSolicitud: n, Title: generarCodigo(n) })
        si choca por NumeroSolicitud → registrar, esperar un tiempo aleatorio y repetir
        tras crear: contarPorNumeroSolicitud(n); si hay otro ítem con n y su id es menor
          → este perdió: renumerarServicio(máximo+1) y repetir la verificación (acotado)
      si se agotan los intentos → error reintentable (el servicio sigue «Pendiente»)
    resultado.numeroSolicitud = n
  engine.fusionarConLaBase: numeroSolicitud = n, codigo = generarCodigo, base.numeroSolicitud = n
```

El gateway distingue los dos choques de valor único: si `buscarItemServicio(ServicioId)` encuentra el ítem, es el reintento idempotente de siempre (devuelve ese ítem); si no lo encuentra, el choque es de `NumeroSolicitud` y lanza `AppError` con código `SP_NUMERO_DUPLICADO` (reintentable).

### 3.4 Decisiones locales

- **`0` = pendiente**: evita un campo booleano nuevo y la migración de Dexie. El borrador ya usa 0.
- **Código con «PEND»**: `generarCodigo` devuelve `BAT-PEND-{serie}` para número 0; al asignar se recalcula y el `Title` de SharePoint se crea ya con el código definitivo.
- **Detección de duplicados**: sin número no se puede comparar «serie + solicitud». Se advierte cuando existe otro servicio **no final** con la misma serie (la advertencia sigue siendo informativa, no bloquea).
- **Pausa entre reintentos**: valor aleatorio de 50 a 350 ms, inyectable (`pausa`) para que las pruebas no esperen.
- **Orden de subida**: el motor ya ordena por `actualizadoEn`, así que ES-011-04 (consecutivos en el orden registrado) se cumple sin cambios.
- **Unicidad en SharePoint**: no se confía en ella (spike S9, con la actualización del 2026-11-16: acepta duplicados durante segundos y Graph no refleja el ajuste). La columna solo se indexa. La garantía es la verificación posterior (el ítem de menor id conserva el número; el otro se renumera).

## 4. Estrategia de pruebas

| Nivel       | Qué                                                                                                       | Archivo                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Unitaria    | `generarCodigo` con 0, `siguienteNumero`, `esPendiente`                                                   | `src/domain/codigo.test.ts`, `src/domain/sync/numeroSolicitud.test.ts` |
| Unitaria    | Formulario sin número; `estados`/`merge` sin el campo                                                     | `validaciones.test.ts`, `estados.test.ts`, `merge.test.ts`             |
| Integración | `pushServicio`: asigna máximo+1, empieza en 1, adopta el del ítem existente, reintenta ante choque, agota | `src/application/sync/pushServicio.numero.int.test.ts`                 |
| Integración | Motor: 2 pendientes reciben consecutivos en orden; reintento tras corte conserva el número                | `src/application/sync/SyncEngine.numero.int.test.ts`                   |
| Integración | Gateway + emulador: `ultimoNumeroSolicitud` y choque de valor único distinguido del de `ServicioId`       | `src/infrastructure/graph/sharepointGateway.numero.int.test.ts`        |
| Componente  | Formulario sin campo; detalle muestra «Pendiente» y luego el número; no se edita                          | `FormRecepcion.test.tsx`, `DetalleServicioPage.test.tsx`               |
| E2E         | Registrar offline → ver «Pendiente» → sincronizar → ver el número                                         | `tests/e2e/numero-solicitud.spec.ts`                                   |
| En vivo     | Dos dispositivos suben 5 servicios a la vez a SharePoint real: números únicos y consecutivos              | `tests/live/sincronizacion-real.live.test.ts`                          |

## 5. Riesgos

| Riesgo                                                                                                   | Mitigación                                                                                     |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| SharePoint no ordena por una columna indizada de tipo Número como se espera                              | Verificado en el spike S9: el orden descendente funciona                                       |
| La unicidad de SharePoint se aplica con 1–4 s de retraso (dos dispositivos pueden crear el mismo número) | Verificación posterior a la creación con desempate por id de ítem (§3.3)                       |
| Carrera entre dispositivos produce muchos reintentos                                                     | Pausa aleatoria + 5 intentos; con el volumen esperado (decenas de servicios) el choque es raro |
| Etiquetas impresas antes de sincronizar muestran «PEND»                                                  | Documentado en ADR-0024; la ayuda in-app lo explica                                            |
| Hacer única una columna ya con datos duplicados en PRD                                                   | La lista está vacía hoy; el script verifica y avisa antes de aplicar si hubiera repetidos      |
| Cambio de `Title` (código) en un ítem ya creado por otra versión de la app                               | Solo se recalcula en servicios nuevos; los existentes conservan su código                      |

## 6. Seguimiento de complejidad

| Desviación                                                                | Por qué es necesaria                                                                      | Alternativa simple rechazada                           |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Reintento con valor único + verificación posterior, en vez de un contador | Es la única forma de ser consecutivo sin backend, y la unicidad de SharePoint es eventual | Contador en `ConfiguracionApp`: carrera sin atomicidad |
