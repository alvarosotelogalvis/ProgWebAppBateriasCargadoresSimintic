# S9 — Número de solicitud consecutivo en SharePoint real

- **Fecha**: 2026-11-16 · **Sitio**: `MineroIndustrial` (PRD) · **Cómo**: Graph con token de aplicación (solo para probar; la PWA usa sesión delegada). Ítems de prueba creados y borrados; la lista `Servicios` quedó con 0 ítems.
- **Para qué**: validar el diseño del ADR-0024 / spec 011 antes de implementarlo.

## Resultados

| #   | Pregunta                                                                   | Resultado                                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| a   | ¿Se puede volver única una columna Número que ya existe?                   | **Sí.** `PATCH /lists/{id}/columns/{col}` con `{"indexed":true,"enforceUniqueValues":true}` responde 200. Antes de eso la columna estaba **sin índice** aunque el script la pedía indexada |
| b   | ¿Se puede leer el mayor con `$orderby=fields/NumeroSolicitud desc&$top=1`? | **Sí**, con y sin la cabecera `Prefer: HonorNonIndexedQueriesWarningMayFailRandomly`, y también combinado con `$filter … ge 1`. Devolvió 5, 10 según lo creado                             |
| c   | ¿Qué responde al repetir un número?                                        | **400 `invalidRequest`** «One or more fields with unique constraints already has the provided value.» (igual que `ServicioId`), **pero no siempre inmediatamente** (ver abajo)             |
| d   | ¿Y con la lista vacía?                                                     | 200 con 0 ítems → el siguiente número es 1                                                                                                                                                 |
| e   | ¿Un PATCH a un número ya usado?                                            | Mismo comportamiento que la creación: **se aceptó** dentro de la ventana de retraso                                                                                                        |

## Hallazgo importante: la unicidad llega tarde

La restricción de valor único **no se aplica al instante**. Medido con un duplicado intentado tras crear el primer ítem:

- 0,9 s después → **201** (aceptó el duplicado)
- 4,1 s después → **400** (lo rechazó)

En otra pasada se aceptó un duplicado y un PATCH a número usado a los pocos segundos, y se rechazó a los 20 s. Además, la lectura de los metadatos de la columna (`enforceUniqueValues`) fue inconsistente durante los primeros segundos tras el PATCH (`false`, y luego `true`).

**Consecuencia**: dos dispositivos que lean el mismo máximo y creen el ítem con 1–3 s de diferencia **pueden crear el mismo número sin recibir error**. El «valor único + reintento» del ADR-0024 protege la mayoría de los casos pero no es suficiente por sí solo.

## Ajuste de diseño (plan 011 §3.3)

Se agrega una **verificación posterior a la creación**:

1. Tras crear el ítem con el número `n`, se consultan los ítems con `NumeroSolicitud = n`.
2. Si hay más de uno, **gana el de menor id de ítem** (SharePoint asigna ids crecientes). El perdedor se asigna `máximo + 1` con un PATCH y repite la verificación (acotado).
3. El valor único sigue activo como segunda barrera (rechaza los duplicados que llegan después de la ventana).

Esto no necesita bloqueos ni backend y es determinista: ambos dispositivos llegan a la misma conclusión sobre quién gana.

## Correcciones al aprovisionamiento

- Aplicar `indexed` y `enforceUniqueValues` también a una columna ya existente (PATCH), sin confiar solo en la creación.
- Verificar la unicidad por **comportamiento** (intentar un duplicado y esperar el 400, con reintento), no solo leyendo `enforceUniqueValues`, que se actualiza tarde.
- Estado actual en `MineroIndustrial`: la columna `NumeroSolicitud` quedó **indexada y única** (aplicado durante este spike).
