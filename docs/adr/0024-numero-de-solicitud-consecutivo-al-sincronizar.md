# ADR-0024 — Número de solicitud consecutivo asignado al sincronizar

- **Estado**: Aceptado (decisión del usuario) · Propuesto (detalles técnicos)
- **Fecha**: 2026-11-16
- **Decisores**: Álvaro Sotelo; detalles propuestos por Claude
- **Reemplaza**: PA-07 del PRD («lo digita el usuario, numérico, no único») y el campo de captura de la spec 003.

## Contexto

Hoy quien llena el servicio digita el número de solicitud. El usuario quiere que sea **automático**: «cuando se suba, debe leerse en ese momento en qué número de solicitud va y asignar el próximo». La app trabaja sin conexión, así que el número solo puede conocerse al sincronizar.

## Opciones consideradas

1. **Consecutivo asignado por SharePoint al sincronizar** (elegida, pedida por el usuario).
2. Número generado en el dispositivo (prefijo del dispositivo + fecha + n): único sin coordinar, pero no es un consecutivo y deja de ser numérico.
3. Un número por visita compartido entre equipos: exige agrupar equipos, fuera de lo pedido.

## Decisión

- El formulario **ya no pide** el número de solicitud. Mientras el servicio no se ha sincronizado muestra **«Pendiente»**.
- Al subir un servicio nuevo, la app **lee el mayor número existente** en SharePoint en ese momento y asigna **el siguiente** (máximo + 1). Si no hay ninguno, empieza en 1.
- **Un número por servicio (equipo)**. Dos equipos de la misma visita reciben números distintos.
- **Unicidad y concurrencia**: dos dispositivos pueden leer el mismo máximo a la vez. Por eso `NumeroSolicitud` pasa a ser **valor único** en SharePoint. Si la escritura falla por valor único, la app **vuelve a leer el máximo y reintenta** (acotado, con espera aleatoria). Es el mismo patrón de idempotencia del ADR-0010.
- **Idempotencia**: si el servicio ya tiene número (reintento tras un corte), **no se reasigna**; se conserva el que quedó en SharePoint.
- **Código visible**: `{BAT|CAR}-{numero}-{serie}` se calcula al recibir el número. Antes de eso el código usa `PEND` en lugar del número (`BAT-PEND-{serie}`) y se actualiza al sincronizar.
- Los servicios ya existentes con número digitado conservan su número. El siguiente consecutivo parte del mayor existente.
- El número de solicitud deja de ser editable desde la app (se quita de los campos corregibles). Una corrección se hace en SharePoint.

## Consecuencias

- **Positivas**: numeración consecutiva y sin errores de digitación; el técnico captura menos datos.
- **Negativas**: el número no existe hasta sincronizar, y el código visible cambia en ese momento (una etiqueta impresa antes mostraría `PEND`). Ya no hay varios equipos con el mismo número de solicitud.
- **Riesgos**: carrera entre dispositivos (mitigada con valor único + reintento); si se elimina en SharePoint el servicio con el número más alto, ese número puede volver a asignarse (se toma el máximo vigente); se acepta y se documenta.

## Cumplimiento / verificación

Pruebas unitarias del cálculo del siguiente número y del reintento; integración con el emulador (carrera de dos dispositivos); prueba en vivo contra SharePoint real (`npm run test:live`) con dos dispositivos subiendo a la vez.

## Referencias

- ADR-0009, ADR-0010, ADR-0012; PRD PA-07; `docs/03-Modelo-de-Datos.md` §2.2
- Spec 011 (`specs/011-numero-solicitud-automatico/spec.md`)
