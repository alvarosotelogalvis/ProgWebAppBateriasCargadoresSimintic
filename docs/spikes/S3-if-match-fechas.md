# S3 — `If-Match` (412), fechas de solo fecha y valor único duplicado

> Tarea T046 · ADR-0010 · Estado: **⏳ guía lista, sin ejecutar** · Ejecutado por: ______ · Fecha: ______

## Preguntas

1. ¿`PATCH …/items/{id}/fields` con `If-Match` devuelve **412** cuando el `eTag` está desactualizado?
2. ¿Cómo vuelven las **fechas de solo fecha** según la zona del sitio?
3. ¿Qué código y mensaje devuelve SharePoint al violar el **valor único** de `ServicioId`?

**Criterio de éxito:** documentar el comportamiento real. Si **no** hay 412, implementar el respaldo «GET + comparar `eTag` antes del PATCH» (SDD §9.5).

## Por qué importa

El motor de sincronización usa `If-Match` para no pisar cambios de otra persona (ES-006, merge a 3 vías) y la idempotencia depende del valor único de `ServicioId` (el `POST` duplicado se resuelve buscando por `ServicioId`). Las pruebas automáticas usan un emulador de Graph: este spike confirma que **SharePoint real** se comporta igual.

## Preparación

- Graph Explorer (`https://developer.microsoft.com/graph/graph-explorer`) con una cuenta que tenga acceso al sitio DEV y consentimiento para `Sites.ReadWrite.All`.
- **Dos servicios ya sincronizados** en la lista `Servicios` (créalos con la app: recepción + Sincronizar). Los llamaremos **S-1** y **S-2**.
- Resuelve los ids (guárdalos): `siteId` (`GET /sites/<tenant>.sharepoint.com:/sites/ServicioTecnicoBC-DEV?$select=id`), `listId` de `Servicios` (`GET /sites/{siteId}/lists?$select=id,name`) y el `itemId` de S-1 y S-2 (`GET /sites/{siteId}/lists/{listId}/items?$expand=fields($select=ServicioId,Title)`).
- La **zona horaria del sitio** debe ser `(UTC-05:00) Bogotá` (Configuración del sitio → Configuración regional). Anótala abajo.

> Usa los campos `Referencia` (texto) y `FechaEntrega` (solo fecha): son inofensivos para la prueba.

## Pasos

**A. `If-Match`**

1. `GET /sites/{siteId}/lists/{listId}/items/{itemId-S1}` → copia `@odata.etag` (p. ej. `"{GUID},3"`) como **ETAG-1**.
2. `PATCH …/items/{itemId-S1}/fields` con cabecera `If-Match: <ETAG-1>` y cuerpo `{ "Referencia": "S3-A" }`. Esperado **200**. Vuelve a hacer `GET` y copia el nuevo `@odata.etag` (**ETAG-2**).
3. Repite el `PATCH` con la cabecera **`If-Match: <ETAG-1>`** (la vieja) y cuerpo `{ "Referencia": "S3-B" }`. Esperado **412**. Anota el código, el `error.code` y el mensaje.
4. `PATCH` **sin** `If-Match` con `{ "Referencia": "S3-C" }`. Anota si responde 200 y pisa el valor (comportamiento que la app **evita** enviando siempre `If-Match`).
5. `PATCH` con `If-Match: *`. Anota el resultado.

**B. Fechas de solo fecha**

6. `PATCH` `{ "FechaEntrega": "2026-10-01T00:00:00Z" }`. Luego `GET` del ítem y anota **literalmente** cómo vuelve `FechaEntrega`.
7. `PATCH` `{ "FechaEntrega": "2026-10-01" }` (sin hora). Anota si lo acepta y cómo vuelve.
8. `PATCH` `{ "FechaEntrega": "2026-10-01T23:30:00-05:00" }`. Anota si el día cambia (¿`2026-10-02`?).
9. Mira cómo se **ve** la fecha en la lista (web de SharePoint) para cada caso. **El día no debe cambiar** en ninguno de los casos que la app usa: la app envía `yyyy-MM-ddT00:00:00Z` y lee los primeros 10 caracteres.

**C. Valor único duplicado**

10. Obtén el `ServicioId` de **S-1** (columna `ServicioId` del ítem). `PATCH` el ítem **S-2** con `{ "ServicioId": "<ServicioId de S-1>" }`. Esperado: error por valor duplicado. Anota **código HTTP, `error.code` y mensaje**.
11. (Opcional) `POST …/items` con `{ "fields": { "Title": "S3-DUP", "ServicioId": "<ServicioId de S-1>" } }`. Si responde que faltan columnas obligatorias, añade las que pida. Anota el error de duplicado, que es el que la app maneja en el caso T-12.
12. **Restaura** `Referencia`, `FechaEntrega` y `ServicioId` originales de S-1 y S-2.

## Resultados obtenidos (2026-11-16, sitio `MineroIndustrial`, Graph con aplicación)

> Ejecutado con una aplicación (`Sites.Manage.All`) sobre la lista `Servicios` real, con elementos de prueba que se borraron al terminar. El comportamiento de `If-Match`, de las fechas y del valor único es del servicio, no de quién se autentica; **falta repetirlo con un usuario real de la PWA** (S2) y con la zona horaria de Bogotá.

| Caso                                                              | Resultado real                                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `PATCH` con el eTag vigente                                       | **200**; el eTag cambia (`…,1` → `…,2`) y la propia respuesta lo devuelve en `@odata.etag`                      |
| `PATCH` con eTag **desactualizado** (entre comillas)              | **412** `resourceModified`; **no** pisa el valor                                                                |
| `PATCH` sin `If-Match`                                            | 200 y **pisa** el valor (por eso la app siempre lo envía)                                                       |
| `PATCH` con `If-Match: *`                                         | 200                                                                                                             |
| El eTag que devuelve el `PATCH`, usado en el siguiente `If-Match` | 200 (sirve)                                                                                                     |
| **eTag sin comillas** (como lo entrega el `delta`) en `If-Match`  | **409** `resourceModified` **aunque esté vigente**; desactualizado también 409. Solo con comillas valida bien.  |
| Fecha enviada `2026-10-01T00:00:00Z` (lo que envía la app)        | vuelve `2026-10-01T00:00:00Z` ✓ (el día no cambia)                                                              |
| Fecha enviada `2026-10-01` (sin hora)                             | vuelve `2026-10-01T07:00:00Z` → el sitio interpreta la medianoche en **UTC-7**, no en Bogotá (UTC-5)            |
| Fecha enviada `2026-10-01T23:30:00-05:00`                         | vuelve `2026-10-02T04:30:00Z` (se normaliza a UTC; ojo con horas tardías)                                       |
| `ServicioId` duplicado (`POST` y `PATCH`)                         | **400** `invalidRequest`: «One or more fields with unique constraints already has the provided value.» (no 409) |

**Defectos que esto destapó y ya están corregidos** (con pruebas; el emulador ahora se comporta como SharePoint real):

1. El motor solo reconocía el duplicado como 409 → ahora también el 400 «unique constraints».
2. El eTag que llega por `delta` no tiene comillas y daba 409 al enviar el servicio descargado → `normalizarETag` (`infrastructure/graph/etag.ts`) lo lleva siempre a la forma con comillas.

**Pendiente:** la zona horaria del sitio parece **UTC-7**; debe ser (UTC-05:00) Bogotá. La app no se ve afectada (envía `T00:00:00Z` y lee los 10 primeros caracteres), pero la web de SharePoint y los reportes podrían mostrar la fecha un día antes. Corrígela en _Configuración del sitio → Configuración regional_ (o con `-ConfigurarRegional` del `.ps1`) y repite los casos de fecha.

## Resultado

| Caso                                                         | Esperado       | Obtenido (código, `error.code`, mensaje) |
| ------------------------------------------------------------ | -------------- | ---------------------------------------- |
| Zona horaria del sitio                                       | Bogotá (UTC-5) |                                          |
| 2. PATCH con ETAG-1 vigente                                  | 200            |                                          |
| 3. PATCH con ETAG-1 desactualizado                           | **412**        |                                          |
| 4. PATCH sin `If-Match`                                      | 200 (pisa)     |                                          |
| 5. PATCH con `If-Match: *`                                   | 200            |                                          |
| 6. `FechaEntrega` enviada `2026-10-01T00:00:00Z` vuelve como | `2026-10-01…`  |                                          |
| 7. Enviada `2026-10-01`                                      |                |                                          |
| 8. Enviada `2026-10-01T23:30:00-05:00`                       |                |                                          |
| 10. `ServicioId` duplicado (PATCH)                           | 4xx            |                                          |
| 11. `ServicioId` duplicado (POST)                            | 4xx            |                                          |

## Decisión

- [ ] **412 confirmado** → la lógica actual (`If-Match` + resolutor de conflictos) es correcta; ADR-0010 pasa a `Aceptado`.
- [ ] **No hay 412** → implementar el respaldo «GET + comparar `eTag` antes del PATCH» (SDD §9.5) y registrar el cambio en un ADR nuevo.
- [ ] **Las fechas cambian de día** → ajustar `fechaASharePoint`/`deCamposSP` en `src/infrastructure/graph/mappers/servicioMapper.ts` (hoy: `T00:00:00Z` al enviar y primeros 10 caracteres al leer) según lo observado.
- [x] **El código de error del duplicado difería** (400 en vez de 409) → ya corregido en `infrastructure/graph/errores.ts` y el motor de sincronización, con su prueba.

Notas / observaciones adicionales:
