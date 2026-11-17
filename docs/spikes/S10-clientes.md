# S10 — Clientes nuevos y fusión en SharePoint real

- **Fecha**: 2026-11-16 · **Sitio**: `MineroIndustrial` (PRD) · **Cómo**: Graph con token de aplicación (solo para probar; la PWA usa sesión delegada). Ítems de prueba creados y borrados; los 3 clientes que había quedaron intactos y `Servicios` con 0 ítems.
- **Para qué**: validar el diseño del ADR-0023 / spec 010 antes de implementarlo.

## Resultados

| #   | Pregunta                                                                          | Resultado                                                                                                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a   | ¿Se pueden crear las columnas nuevas en `Clientes`?                               | **Sí.** `ClienteGuid` y `NombreNormalizado` (texto, únicas e indexadas), `FusionadoConId` (número) y `CreadoDesdeApp` (Sí/No) se crearon con 201. Las dos de texto quedaron `indexed=true`, `enforceUniqueValues=true`                                                                                           |
| b   | ¿La unicidad de una columna **de texto** llega tarde (como en `NumeroSolicitud`)? | **No.** Un duplicado se rechazó con **400** a los 0,5 s (`ClienteGuid`) y 0,7 s (`NombreNormalizado`). A diferencia de la columna Número del spike S9, aquí sí se puede confiar en el valor único                                                                                                                |
| c   | ¿Varios valores vacíos en una columna única?                                      | **Sí.** Se crearon varios clientes sin `ClienteGuid` y los 3 que ya existían siguen sin él, sin error                                                                                                                                                                                                            |
| d   | ¿Se puede filtrar `Servicios` por el lookup `Cliente`?                            | **Solo con la columna indexada.** Sin índice: 400 «Field 'ClienteLookupId' cannot be referenced in filter … as it is not indexed». Con la cabecera `Prefer: HonorNonIndexedQueriesWarningMayFailRandomly` sí funciona. **Indexando la columna `Cliente` (PATCH `indexed:true`) el filtro funciona sin `Prefer`** |
| e   | ¿Se puede reasignar el cliente de un servicio?                                    | **Sí.** `PATCH …/items/{id}/fields` con `{"ClienteLookupId": N}` responde 200 y la lectura devuelve el nuevo id; el filtro lo refleja de inmediato                                                                                                                                                               |
| f   | ¿Qué pasa con los clientes inactivos?                                             | `PATCH` con `{"Activo": false, "FusionadoConId": N}` → 200. La lista sin filtro **sí devuelve** los inactivos (con `Activo:false` y `FusionadoConId`); el filtro `Activo eq 1` los excluye; filtrar por `NombreNormalizado` funciona                                                                             |

## Consecuencias para el diseño (plan 010)

- **Se elimina la verificación posterior** en los clientes (era la defensa que necesitó el número de solicitud). Como el valor único de texto es inmediato, un choque se resuelve así: ante un 400 se busca por `ClienteGuid` (reintento propio) y, si no está, por `NombreNormalizado` (otro dispositivo) y se adopta ese cliente.
- **`Servicios.Cliente` debe estar indexada** para poder listar los servicios de un cliente al fusionar (sin depender de `Prefer`). Se agrega al esquema y el aprovisionamiento la corrige si existe sin índice.
- Los clientes existentes pueden quedar sin `ClienteGuid`; el aprovisionamiento solo rellena `NombreNormalizado` (único) y no inventa guids.

## Estado dejado en `MineroIndustrial`

- La lista `Clientes` tiene ya las 4 columnas nuevas.
- `Servicios.Cliente` quedó **indexada** (efecto del spike; es lo que el esquema pedirá).
