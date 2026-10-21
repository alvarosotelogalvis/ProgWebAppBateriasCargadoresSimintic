# ADR-0010 — Sincronización por estado (campos sucios), push → pull y merge a 3 vías por campo

- **Estado**: Propuesto
- **Fecha**: 2026-10-21
- **Decisores**: Propuesto por Claude; pendiente de aprobación de Álvaro Sotelo
- **Origen en la guía**: `05-App-Movil.md` §4 (cola de operaciones, resolución de conflictos, indicadores), doc. base §25 (idempotencia, retries con backoff)

## Contexto
El Excel muestra que **un mismo registro se completa en varias etapas**, posiblemente en dispositivos y por usuarios distintos (técnico y comercial). La sincronización debe ser bidireccional, idempotente, reanudable y manejar ediciones concurrentes.

## Opciones consideradas
1. **Cola de operaciones (outbox) con cada cambio**. Pros: historial exacto. Contras: muchas operaciones por autoguardado, hay que compactar y es más difícil reanudar.
2. **Sincronización por estado**: cada servicio guarda `camposSucios` y `base` (valores del servidor en el último sync); cada adjunto, su `syncState`. Pros: varios cambios al mismo campo se combinan en uno, el push es simple de reanudar y permite el merge por campo.
3. **Last-write-wins por registro**. Contras: pierde datos silenciosamente cuando dos personas editan etapas distintas.
4. **CRDT / motores de sync (RxDB, PowerSync…)**. Contras: requieren un backend propio o no tienen conector para SharePoint.

## Decisión
- **Opción 2**, con el algoritmo de SDD §9.2: push (asegurar el ítem por `ServicioId` → archivos → PATCH de los campos sucios con `If-Match`) y luego pull (delta o filtro por `Modified`, según el spike S4).
- **Merge a 3 vías por campo** (SDD §9.5). Solo los choques reales del mismo campo se marcan como `conflict` y los resuelve el usuario. El campo `estado` sigue la regla de "el más avanzado".
- **Idempotencia**: `ServicioId` único generado en el dispositivo + búsqueda previa + nombres de archivo deterministas con `conflictBehavior=replace`.
- **Robustez**: Web Locks (una sola sincronización a la vez), clasificación de errores y backoff exponencial con jitter, respetando `Retry-After` (SDD §9.6). Upload sessions reanudables para archivos > 4 MB.
- **Disparo**: siempre con confirmación del usuario (ADR-0006). Aviso al volver la conexión. Sin Background Sync API.

## Consecuencias
- **Positivas**: sin duplicados, sin pérdidas silenciosas y reanudable tras cortes.
- **Negativas**: más lógica en el cliente; requiere pruebas exhaustivas (T-09…T-17).
- **Riesgos**: el comportamiento de `If-Match` y de `delta` en listas está por confirmar → spikes S3 y S4, con alternativas documentadas en el SDD.

## Cumplimiento / verificación
Suite de integración con MSW (T-09…T-17). Escenario de aceptación de la F6.

## Referencias
- SDD §9
