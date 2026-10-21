# ADR-0013 — Correo de la OT y alertas de vida útil con Power Automate

- **Estado**: Propuesto (confirmar PA-04 y PA-05 y que Power Automate es aceptable como "no backend")
- **Fecha**: 2026-10-21
- **Decisores**: Propuesto por Claude; pendiente de aprobación de Álvaro Sotelo
- **Origen en la guía**: doc. base §11 (webhooks), §12 (envío de correos), `01-Comun` §6

## Contexto
El Excel pide "que llegue correo" al generar la OT interna y "alertas que arroje el sistema" para la proyección de vida útil. Las alertas son **temporales** (ocurren aunque nadie abra la app), así que no pueden depender solo del cliente. No hay backend.

## Opciones consideradas
1. **Power Automate** sobre la lista `Servicios` (flujo automático para la OT y flujo programado diario para las alertas). Pros: incluido en M365 (conectores estándar), sin código propio ni servidor, editable por un administrador. Contras: los flujos dependen de la cuenta del propietario; los cambios se hacen en el portal.
2. **Enviar el correo desde la app con Graph `Mail.Send` delegado** al sincronizar. Pros: sin flujos. Contras: otro permiso sensible (enviar correo como el usuario), solo funciona al sincronizar y **no resuelve las alertas temporales**.
3. **Alertas solo dentro de la app**. Contras: nadie las ve si nadie abre la app.

## Decisión
- **Power Automate** con dos flujos (`docs/06` §3):
  - "Correo OT": al crear o modificar un ítem con `Estado = En reparación` y `OTCorreoEnviado = No` → correo a `CorreoDestinoOT` → `OTCorreoEnviado = Sí`.
  - "Alertas de vida útil": diario a las 07:00 → equipos Entregados o Facturados con `ProyeccionVidaUtil` dentro de los umbrales → un correo resumen a `CorreoDestinoAlertas` → actualizar `AlertaVidaUtilNivel` para no repetir.
- La app **además** muestra las alertas localmente (`/alertas`).
- La app nunca escribe `OTCorreoEnviado` ni `AlertaVidaUtilNivel`.

## Consecuencias
- **Positivas**: requisitos cubiertos sin backend ni permisos extra para la app.
- **Negativas**: la configuración vive fuera del repositorio → se exportan los flujos a `docs/powerautomate/` y se documentan.
- **Riesgos**: el propietario del flujo se va de la empresa → cuenta de servicio o copropietarios.

## Cumplimiento / verificación
Pruebas de `docs/06` §3.3 en DEV y PRD.

## Referencias
- `docs/06` §3 · PRD HU-06, HU-12
