# ADR-0017 — Observabilidad sin backend: log local, bitácora de sync en SharePoint y `client-request-id`

- **Estado**: Propuesto
- **Fecha**: 2026-10-21
- **Decisores**: Propuesto por Claude; pendiente de aprobación de Álvaro Sotelo
- **Origen en la guía**: `01-Comun` §9 (logging, métricas, Correlation ID, alertas), `02-App-Web.md` §3.14, `05-App-Movil.md` §11

## Contexto

Para dar soporte hay que saber qué pasó en un dispositivo remoto. No hay backend, y enviar telemetría a terceros implica sacar datos del tenant y agregar dominios a la CSP.

## Opciones consideradas

1. **Sentry**. Pros: excelente para errores. Contras: servicio externo, datos fuera de M365 y un costo posible.
2. **Azure Application Insights (SDK JS)**. Pros: ecosistema Microsoft. Contras: requiere un recurso Azure (que el proyecto no tiene) y una cadena de conexión pública.
3. **Log local + bitácora de sync en SharePoint**. Pros: sin servicios nuevos; los datos se quedan en el dispositivo y en el tenant. Contras: los errores fuera del sync solo se ven si el usuario exporta el log.

## Decisión

- **Logger local** en IndexedDB (anillo de 2000 entradas), exportable desde el menú técnico y en el respaldo ZIP.
- **`LogSincronizacion`** en SharePoint: un ítem por ejecución con totales y errores resumidos.
- **Trazabilidad**: `correlationId` por ejecución de sync y `client-request-id` por llamada a Graph (Microsoft lo usa para rastrear sus logs), ambos en el log local.
- **Alertas operativas**: vista de SharePoint "Errores de sync (7 días)". Opcionalmente, un flujo de Power Automate que avise si hay más de N resultados `Error` en el día.
- Sin Sentry ni App Insights en v1.0. Si se agregan, se hace con un ADR nuevo (y con su ajuste de CSP).

## Consecuencias

- **Positivas**: privacidad y costo cero.
- **Negativas**: los errores de UI fuera del sync no se reportan solos.

## Referencias

- SDD §15 · `docs/03` §6.4
