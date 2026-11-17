# Plan 010 — Clientes nuevos desde el formulario y fusión de clientes

- **Spec**: [spec.md](spec.md) · **Fecha**: 2026-11-16
- **Referencias de diseño**: SDD §7.4 (mapeo a SharePoint), §9.2 (idempotencia del push) · Modelo de datos §6.1 · ADR-0023, ADR-0010, ADR-0024 (misma técnica de verificación posterior)

## 1. Contexto técnico

| Aspecto                    | Valor                                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Lenguaje / framework       | TypeScript strict · React 19 · Vite (ADR-0003)                                                                                                |
| Almacenamiento local       | Dexie, tabla `catalogos` (clave/valor). Sin cambio de esquema Dexie: se agregan las claves `clientesNuevos` y `clientesFusionados` (ver §3.4) |
| Integraciones              | Graph: lista `Clientes` (crear, buscar, desactivar) y lista `Servicios` (buscar y reasignar por cliente). Columnas nuevas en `Clientes`       |
| Pruebas                    | Vitest (dominio, aplicación, mapeadores), emulador MSW de Graph, Playwright (formulario y fusión), `npm run test:live` (SharePoint real)      |
| Plataformas objetivo       | PRD §11                                                                                                                                       |
| Restricciones de desempeño | Alta de cliente: sin red, instantánea. Fusión: ≤ 100 servicios en menos de 1 minuto (PATCH con concurrencia 3)                                |

## 2. Verificación de la constitución

| Artículo                    | ¿Cumple? | Cómo                                                                                                                                                                     |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I Offline primero           | ⚠️→✅    | El **alta** de clientes y su uso funcionan sin red. La **fusión** exige conexión: es una operación de administración, no de captura (justificado en §6)                  |
| II Cero pérdida             | ✅       | Los clientes nuevos pendientes viven en una clave aparte que el refresco del catálogo no toca; entran en el respaldo; la fusión reasigna sin borrar y conserva el origen |
| III Sin backend ni secretos | ✅       | Todo por Graph con la sesión delegada                                                                                                                                    |
| IV Identidad confirmada     | ✅       | Los clientes se suben dentro de la sincronización ya confirmada; la fusión exige sesión vigente y rol Administrador                                                      |
| V Idempotencia              | ✅       | `ClienteGuid` generado en el dispositivo + `NombreNormalizado`; reintentar nunca duplica; la fusión es reanudable                                                        |
| VI Dominio puro y capas     | ✅       | Normalización y resolución de fusiones en `domain/`; Graph solo en `infrastructure/graph/` tras puertos                                                                  |
| VII Pruebas primero         | ✅       | Cada fase lista las pruebas antes de la implementación                                                                                                                   |
| VIII Accesible y es-CO      | ✅       | Textos en i18n, diálogo de confirmación accesible (sin `window.confirm`)                                                                                                 |
| IX Seguridad del cliente    | ✅       | Sin cambios de CSP; el nombre del cliente se muestra siempre como texto (sin HTML)                                                                                       |
| X Simplicidad               | ✅       | Sin estado «provisional» visible, sin migración Dexie, id temporal negativo en vez de un campo nuevo                                                                     |
| XI Trazabilidad             | ✅       | Cada fusión y cada cliente creado se registra en el log local y en `LogSincronizacion`                                                                                   |

## 3. Diseño de la funcionalidad

### 3.1 Archivos (crear / modificar)

```
src/domain/cliente.ts                                   # C  normalizarNombre, tituloDeNombre, resolverVigente, validarNombre
src/domain/cliente.test.ts                              # C
src/application/ports/clientesRemotos.ts                # C  puerto: crear/buscar clientes, listar/reasignar servicios, desactivar origen, log de fusión
src/application/ports/remoteGateway.ts                  # M  Catalogos.fusionados; ClienteCatalogo.fusionadoCon
src/application/clientes/agregarCliente.ts              # C  alta local: sugiere el existente o crea el pendiente con id temporal
src/application/clientes/clientesLocales.ts             # C  leer/guardar la clave clientesNuevos y la secuencia de ids temporales
src/application/clientes/subirClientesNuevos.ts         # C  push previo: crea en SharePoint (idempotente), verifica, remapea servicios
src/application/clientes/remapearFusionados.ts          # C  reasigna servicios locales que apuntan a un cliente fusionado
src/application/clientes/fusionarClientes.ts            # C  caso de uso del administrador (reanudable)
src/application/sync/SyncEngine.ts                      # M  paso antesDelPush; no sube servicios con cliente aún temporal
src/application/sync/pullServicios.ts                   # M  nombrePorCliente incluye clientes pendientes y fusionados
src/application/setup/refrescarCatalogosSync.ts         # M  guarda `clientesFusionados` y NO toca `clientesNuevos`
src/infrastructure/graph/sharepointGateway.ts           # M  implementa el puerto de clientes
src/infrastructure/graph/mappers/catalogos.ts           # M  lee ClienteGuid, FusionadoConId; separa activos de fusionados
src/infrastructure/graph/mappers/servicioMapper.ts      # M  nunca escribe un cliente temporal (id ≤ 0)
src/infrastructure/graph/mockRemoteGateway.ts           # M
scripts/esquema-sharepoint.mjs                          # M  Clientes: ClienteGuid, NombreNormalizado, FusionadoConId, CreadoDesdeApp; LogSincronizacion: Detalle
scripts/provision-sharepoint-graph.mjs                  # M  rellena NombreNormalizado de los clientes existentes
scripts/provision-sharepoint.ps1                        # M  permiso Colaborar del grupo de técnicos sobre Clientes
src/infrastructure/db/hooks.ts                          # M  useClientes(): remotos + pendientes
src/features/servicios/components/CampoCliente.tsx      # M  «Agregar cliente» y sugerencia del existente
src/features/servicios/components/FiltrosServicios.tsx  # M  usa useClientes()
src/features/alertas/AlertasPage.tsx                    # M  usa useClientes()
src/features/tecnico/ClientesPage.tsx                   # C  fusión (solo Administrador)
src/features/tecnico/FusionarClientesDialog.tsx         # C  confirmación y avance
src/features/tecnico/MenuTecnicoPage.tsx                # M  entrada «Clientes»
src/application/respaldo/…                              # M  el respaldo incluye `clientesNuevos`
src/locales/es-CO/servicios.json, tecnico.json, ayuda.json  # M
tests/fixtures/graph/emuladorGraph.ts                   # M  lista Clientes con único, filtros por Cliente, PATCH de lookup
tests/live/sincronizacion-real.live.test.ts             # M  escenarios de clientes
docs/…                                                  # M  03 §6.1, 06 (permisos), 04, PRD, SDD, spec 003 (ES-003-05)
```

### 3.2 Contratos e interfaces

```ts
// domain/cliente.ts
export const normalizarNombre = (nombre: string): string; // MAYÚSCULAS, sin tildes, espacios colapsados («aris  mining segovía» → «ARIS MINING SEGOVIA»)
export const tituloDeNombre = (nombre: string): string; // MAYÚSCULAS y espacios colapsados, conservando tildes (valor de `Title`)
export const validarNombre = (nombre: string): 'VACIO' | 'LARGO' | null; // 1–100 caracteres
export interface ClienteNuevo { id: number /* temporal, negativo */; guid: string; nombre: string; normalizado: string; creadoEn: string }
export interface ClienteFusionado { origenId: number; destinoId: number }
export const resolverVigente = (id: number, fusionados: readonly ClienteFusionado[]): number; // sigue la cadena; detecta ciclos

// application/ports/clientesRemotos.ts
export interface ClienteRemoto { id: number; nombre: string; activo: boolean; guid?: string; normalizado?: string; fusionadoCon?: number }
export interface ClientesRemotos {
  buscarPorGuid(guid: string): Promise<ClienteRemoto | null>;
  buscarPorNormalizado(normalizado: string): Promise<readonly ClienteRemoto[]>; // todos los que lo comparten (id ascendente)
  crearCliente(c: { guid: string; titulo: string; normalizado: string }): Promise<ClienteRemoto>;
  desactivarFusionado(origenId: number, destinoId: number): Promise<void>;
  listarServiciosDeCliente(clienteId: number): Promise<readonly { itemId: string }[]>;
  reasignarServicio(itemId: string, clienteId: number): Promise<void>;
  registrarDetalleLog(entrada: { tipo: string; detalle: string }): Promise<void>;
}
```

### 3.3 Flujos

**Alta (offline).** `CampoCliente`: si la búsqueda no coincide, ofrece «Agregar “{texto}” como cliente nuevo». `agregarCliente(nombre)`:

1. `validarNombre`; calcula `normalizado`.
2. Si coincide con un cliente del catálogo (activo) o con otro pendiente → devuelve ese (no crea).
3. Si no, crea `ClienteNuevo` con `id = -secuencia` (contador persistido en `meta`), `guid` (UUID v4), lo guarda en la clave `clientesNuevos` y lo devuelve. El servicio queda con `clienteId = id` temporal y `clienteNombre`.

**Push (en la sincronización, antes de los servicios).** `subirClientesNuevos`:

```
para cada ClienteNuevo pendiente:
  c = buscarPorGuid(guid)  ?? primero de buscarPorNormalizado(normalizado) ?? crearCliente(...)
  si c es inactivo y fusionado → seguir la cadena hasta el vigente
  verificación posterior (como el ADR-0024): si hay otro cliente con el mismo normalizado y su id es menor,
     este pierde → desactivarFusionado(este, ganador) y se usa el ganador
  remapear: servicios locales con clienteId = temporal → c.id (también camposSucios si ya tenían sp)
  quitar de clientesNuevos y agregar c al catálogo `clientes` local
el motor no sube un servicio cuyo clienteId siga siendo temporal (queda pendiente, reintentable)
```

**Fusión (Administrador, con red).** `fusionarClientes(origen, destino)`:

```
validar: origen ≠ destino; destino = resolverVigente(destino); origen no fusionado ya
servicios = listarServiciosDeCliente(origen)     // se vuelve a consultar: reanudable
por cada servicio (concurrencia 3): reasignarServicio(itemId, destino)   // idempotente
desactivarFusionado(origen, destino)                // Activo = No, FusionadoConId = destino (al final)
registrarDetalleLog(...)
refrescar el catálogo local
```

Si se corta, repetir: lo ya reasignado ya no aparece al consultar y se completa el resto.

**Dispositivos con un servicio apuntando al origen.** `refrescarCatalogosRemotos` guarda `clientesFusionados` (`origenId → destinoId`). Antes de subir y tras cada refresco, `remapearFusionados` cambia a `resolverVigente` el `clienteId` de los servicios **pendientes** (sin `sp` o con `clienteId` sucio). Los ya sincronizados se actualizan solos con el pull.

### 3.4 Decisiones locales

- **Claves de catálogo separadas**: `clientes` (remoto, se sobrescribe), `clientesNuevos` (pendientes, nunca se sobrescribe) y `clientesFusionados`. Así un refresco no pierde clientes creados sin red. `useClientes()` une las dos primeras.
- **Id temporal negativo**: `clienteId` ya es un número; un valor ≤ 0 significa «aún sin id de SharePoint». El mapeador nunca lo escribe y el motor no sube el servicio hasta resolverlo.
- **Sin estado provisional visible**: el cliente pendiente se muestra igual que cualquier otro.
- **Fusionar no borra**: el origen queda `Activo = No` + `FusionadoConId`, y el catálogo remoto deja de ofrecerlo.
- **Verificación posterior en vez de confiar en el valor único**: el spike S9 mostró que SharePoint aplica la unicidad con retraso. Se mantienen las columnas únicas como segunda barrera (el spike S10 confirma si en columnas de texto sí es fiable).
- **Quién puede qué**: cualquier rol puede agregar clientes (aclaración del 2026-11-16); la fusión es solo Administrador (ruta `/tecnico/clientes`, ya restringida).
- **Bitácora**: se agrega la columna `Detalle` a `LogSincronizacion` para registrar las fusiones y las altas.

## 4. Estrategia de pruebas

| Nivel       | Qué                                                                                                                                  | Archivo                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Unitaria    | Normalización, título, validación, resolución de cadenas y ciclos                                                                    | `src/domain/cliente.test.ts`                                             |
| Integración | `agregarCliente`: sugiere el existente (tildes/mayúsculas/espacios), crea el pendiente con id negativo, no duplica entre pendientes  | `src/application/clientes/agregarCliente.int.test.ts`                    |
| Integración | El refresco del catálogo conserva `clientesNuevos`                                                                                   | `src/application/setup/refrescarCatalogosSync.test.ts`                   |
| Integración | `subirClientesNuevos`: crea, es idempotente, adopta el existente, sigue fusiones, verificación posterior, remapea servicios y sucios | `src/application/clientes/subirClientesNuevos.int.test.ts`               |
| Integración | Motor: crea el cliente antes de los servicios; no sube un servicio con cliente temporal; dos dispositivos con el mismo cliente       | `src/application/sync/SyncEngine.clientes.int.test.ts`                   |
| Integración | `fusionarClientes`: reasigna todo, conserva el origen, es reanudable tras un corte, rechaza origen = destino y cadenas               | `src/application/clientes/fusionarClientes.int.test.ts`                  |
| Integración | `remapearFusionados`: pendientes sin `sp` y con `clienteId` sucio; no toca los sincronizados; no pierde datos                        | `src/application/clientes/remapearFusionados.test.ts`                    |
| Gateway     | Crear/buscar/desactivar/reasignar contra el emulador, con valor único                                                                | `src/infrastructure/graph/sharepointGateway.clientes.int.test.ts`        |
| Mapeador    | Nunca escribe un `clienteId` ≤ 0                                                                                                     | `servicioMapper.test.ts`                                                 |
| Componente  | `CampoCliente` ofrece agregar, sugiere el existente; página de fusión solo para Administrador, confirmación y resumen                | `CampoCliente.test.tsx`, `ClientesPage.test.tsx`                         |
| E2E         | Sin red agregar cliente y registrar → sincronizar → un solo cliente; fusión (modo simulado)                                          | `tests/e2e/clientes-nuevos.spec.ts`, `tests/e2e/fusion-clientes.spec.ts` |
| En vivo     | Dos dispositivos crean el mismo cliente a la vez; fusión de 10 servicios contra SharePoint real; limpieza completa                   | `tests/live/sincronizacion-real.live.test.ts`                            |

## 5. Riesgos

| Riesgo                                                                                        | Mitigación                                                                                                          |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| El filtro de `Servicios` por el lookup `Cliente` no funciona o no está indexado en SharePoint | Spike S10 antes de implementar; alternativa: leer los servicios con `delta` y filtrar en la app (volumen bajo)      |
| Valor único de texto con retraso, como pasó con `NumeroSolicitud`                             | Verificación posterior por `NombreNormalizado` con desempate por id (§3.3); el spike S10 lo mide                    |
| Varios valores vacíos en una columna única (clientes existentes sin `ClienteGuid`)            | El spike S10 lo comprueba; el aprovisionamiento rellena `NombreNormalizado` de los existentes                       |
| El técnico necesita permiso de escritura en `Clientes`                                        | Se documenta y se automatiza en `provision-sharepoint.ps1`; sin él, el alta falla con un error claro y reintentable |
| Respaldo/restauración de un servicio con cliente temporal                                     | El respaldo incluye `clientesNuevos`; prueba de ida y vuelta                                                        |
| Fusión interrumpida a medias                                                                  | Reanudable por diseño; el origen se desactiva al final                                                              |
| Nombres casi iguales que la normalización no detecta («ARIS MINING» y «ARIS MINING SAS»)      | Se corrigen con la fusión                                                                                           |

## 6. Seguimiento de complejidad

| Desviación                                    | Por qué es necesaria                                                       | Alternativa simple rechazada                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| La fusión exige conexión (Art. I)             | Reasigna servicios en SharePoint y no puede hacerse en un solo dispositivo | Fusionar «en local» y sincronizar: dejaría servicios de otros dispositivos con el origen |
| Claves de catálogo adicionales                | El refresco sobrescribe `clientes`; los pendientes se perderían            | Mezclar los pendientes dentro de `clientes`: se perderían en el siguiente refresco       |
| Verificación posterior además del valor único | La unicidad de SharePoint llega tarde (spike S9)                           | Confiar solo en el valor único                                                           |
