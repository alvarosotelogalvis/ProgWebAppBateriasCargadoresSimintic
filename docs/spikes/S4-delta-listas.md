# S4 — `delta` de listas de SharePoint vs. filtro por `Modified`

> Tarea T047 · ADR-0010 · Estado: **⏳ guía lista, sin ejecutar** · Ejecutado por: ______ · Fecha: ______

## Preguntas

1. ¿`GET …/lists/{id}/items/delta?$expand=fields` devuelve los **campos** y un `@odata.deltaLink` **estable**?
2. Cuando un ítem cambia, ¿el delta lo trae **completo** (todas las columnas con valor) o **solo las columnas que cambiaron**?
3. Cuando una columna se **vacía**, ¿aparece como `null`, falta, o el ítem no se entera?
4. ¿Cómo vienen los ítems **eliminados** y qué pasa si el token **caduca**?

**Criterio de éxito:** si el delta devuelve los campos y un `deltaLink` estable, se usa delta; si no, el filtro por `Modified` (SDD §9.4).

## Por qué importa — y una suposición que hay que confirmar

La descarga (spec 006) usa delta. Además, la función «**borrado remoto de campos al descargar**» (commit `d796f737`) **supone** que cuando un ítem llega en el delta, trae **todas sus columnas con valor** y que una columna **ausente** significa «vaciada» (si falta el campo y es opcional, se borra en el dispositivo). **Si en la prueba 2 el delta solo trae las columnas modificadas, esa lógica sería incorrecta y borraría datos locales por error.** Anota con cuidado el resultado de los pasos 5 y 6 y avisa: hay que cambiar esa función.

## Preparación

- Graph Explorer con acceso al sitio DEV (como en [S3](S3-if-match-fechas.md)) y los ids `siteId` y `listId` de `Servicios`.
- Al menos **3 servicios sincronizados** en la lista, **uno de ellos con varias columnas rellenas** (diagnóstico, observación, cotización…): complétalos en la app y sincroniza.

## Pasos

1. **Ronda completa.** `GET /sites/{siteId}/lists/{listId}/items/delta?$expand=fields`. Si trae `@odata.nextLink`, síguelo hasta que aparezca `@odata.deltaLink`. Anota: ¿cada ítem trae `fields` con `ServicioId`, `Estado`, etc.? ¿cuántos ítems y cuántas páginas? Guarda el **deltaLink-1**.
2. **Sin cambios.** `GET <deltaLink-1>`. Esperado: lista vacía y un `deltaLink` nuevo (**deltaLink-2**). Anota si el token cambió o es el mismo (**¿estable?**).
3. **Cambio de una columna.** En la web de SharePoint edita **solo** `Referencia` de un servicio que tenga muchas columnas rellenas. `GET <deltaLink-2>` → ¿viene el ítem **completo** (con `Diagnostico`, `ObservacionTecnica`…) o solo `Referencia`? Anota la lista exacta de columnas que vienen. Guarda **deltaLink-3**.
4. **Cambio por la app.** Edita el mismo servicio desde la app (otra etapa) y sincroniza; `GET <deltaLink-3>`. ¿Mismo comportamiento que el paso 3? Guarda **deltaLink-4**.
5. **Columna vaciada.** En la web de SharePoint **borra el contenido** de `ObservacionTecnica` del servicio del paso 3 (dejar vacío). `GET <deltaLink-4>` → ¿el ítem viene? ¿`ObservacionTecnica` aparece como `null`, como `""`, o **falta**? ¿vienen las **demás** columnas? **Anota literalmente.** Guarda **deltaLink-5**.
6. **Comprobación en la app.** Con el servicio del paso 5 descargado en un dispositivo y **sin cambios locales**, sincroniza: ¿la observación **se borra** en el dispositivo (comportamiento esperado de la función de borrado remoto)? ¿se borró algo más que no debía?
7. **Eliminación.** Borra un ítem de la lista (papelera). `GET <deltaLink-5>` → esperado: entrada con `"@removed": { "reason": "deleted" }`. Anota si trae **solo el `id`** (sin `ServicioId`).
8. **Caducidad.** Guarda un `deltaLink` y vuelve a usarlo **a las 24 h** (y, si puedes, a los 7 días). Anota si responde 200 o **410 (`resyncRequired`)**. La app ya reinicia con una ronda completa si recibe 410 (FR-006-10): si ocurre, el registro `pull.delta.caducado` debe aparecer en el menú técnico.
9. **Respaldo por `Modified`.** `GET /sites/{siteId}/lists/{listId}/items?$expand=fields&$filter=fields/Modified ge '<fecha ISO>'&$top=200` con la cabecera `Prefer: HonorNonIndexedQueriesWarningMayFailRandomly`. Anota si funciona (¿`Modified` está indexado?) y que **no detecta eliminaciones**.

## Resultado

| Pregunta                                                               | Obtenido |
| ---------------------------------------------------------------------- | -------- |
| Paso 1: ¿vienen `fields`? ¿páginas?                                    |          |
| Paso 2: ¿`deltaLink` estable (mismo token o uno válido nuevo)?         |          |
| Paso 3: columnas que vienen al cambiar **una**                         |          |
| Paso 4: ídem cambiando desde la app                                    |          |
| Paso 5: columna vaciada → ¿`null` / `""` / ausente? ¿vienen las demás? |          |
| Paso 6: ¿la app borra la observación? ¿algo de más?                    |          |
| Paso 7: ítem eliminado → forma de la entrada                           |          |
| Paso 8: `deltaLink` a 24 h / 7 días                                    |          |
| Paso 9: filtro por `Modified`                                          |          |

## Decisión

- [ ] Delta trae `fields` y `deltaLink` estable → **se mantiene delta** (ADR-0010 `Aceptado`).
- [ ] Delta **no** trae `fields` o no es estable → usar el filtro por `Modified` (SDD §9.4): cambio en `sharepointGateway.ts` y ADR nuevo. Las eliminaciones se detectarían con una pasada de reconciliación.
- [ ] **El delta trae solo las columnas modificadas** → **cambiar ya** el borrado remoto de campos (`vaciadosDe` en `infrastructure/graph/mappers/cambioRemotoMapper.ts`): dejaría de inferir «vaciado» por ausencia. Avisar antes de usar la app en producción.
- [ ] Hay 410 con `deltaLink` viejo → comprobar que el pull termina bien con una ronda completa (`pull.delta.caducado` en los registros); la lógica ya existe, solo se confirma contra SharePoint real.

Notas / observaciones adicionales:
