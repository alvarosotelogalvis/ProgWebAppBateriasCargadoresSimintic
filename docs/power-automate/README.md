# Power Automate — Alertas de vida útil

## Descripción

Dos flujos de automatización en SharePoint Online para:

1. **Correo OT**: enviar correo al responsable de taller cuando un servicio llega a EN_REPARACION
2. **Alertas diarias**: resumen diario (07:00 CO) de equipos por vencer su vida útil

## Flujo 1: Correo OT (T008)

### Trigger

- Cuando un ítem en lista `Servicios` es **modificado**
- Condición: `estado = ''EN_REPARACION''`

### Acciones

1. Buscar configuración en `ConfiguracionApp` (DestinatarioOT)
2. Verificar que `OTCorreoEnviado ≠ true`
3. Enviar correo a `DestinatarioOT` con:
   - Asunto: "[Alertas PWA] Orden de Trabajo - {código}"
   - Cuerpo: código, cliente, OT detalles, costo
4. Set `OTCorreoEnviado = true` en registro de control
5. Si error: log en `LogSincronizacion` con código "OT_EMAIL_FAILED"

### Tabla de control

- Nombre: `OTCorreoEnviado`
- Campos:
  - ServicioId (Lookup → Servicios)
  - EnvioPendiente (Yes/No, default: false)

## Flujo 2: Alertas diarias (T010)

### Trigger

- Programada: **diariamente a las 07:00 CO** (UTC-5)

### Acciones

1. Query `Servicios` con:
   - estado IN [ENTREGADO, FACTURADO]
   - proyeccionVidaUtil ≤ hoy + 90 días
2. For each servicio:
   - Calcular nivel: `calcularNivelAlerta(proyeccionVidaUtil, umbrales)`
   - Comparar con `NivelAlertaNotificado` actual
   - Si cambió: agregar entrada en tabla
3. Construir tabla HTML si hay cambios
4. Enviar correo a `DestinatarioAlertas` si hay cambios
5. Si sin cambios: no enviar

### Tabla de control

- Nombre: `NivelAlertaNotificado`
- Campos:
  - ServicioId (Lookup → Servicios)
  - Nivel (Choice: vencida/90/60/30)
  - FechaNotificacion (Date)

## Variables de entorno

- `SharePoint site ID`: necesario para queries
- `Tenant ID`: necesario para autenticación
- `DestinatarioOT`: dirección de correo o grupo (config en ConfiguracionApp)
- `DestinatarioAlertas`: dirección de correo o grupo (config en ConfiguracionApp)

## Notas de implementación

### Zona horaria

- Flujo diario: UTC-5 (Hora Colombia)
- App calcula proyeccionVidaUtil sin hora (solo fecha)

### Idempotencia

- `OTCorreoEnviado` previene envíos duplicados de OT
- `NivelAlertaNotificado` evita correos si nivel no cambió

### Documentación de exportación

- Exportar flujos como solución de Dynamics 365/Power Platform
- Archivo: `001-correo-ot.json`, `002-alertas-diarias.json`
- Incluir pasos de importación en README

## Checklist de validación

- [ ] Flujo OT se dispara en EN_REPARACION
- [ ] Correo llega en <10 min post-sync
- [ ] 0 correos duplicados (validar con OTCorreoEnviado)
- [ ] Flujo diario se dispara a las 07:00 CO
- [ ] Correo diario incluye solo cambios de nivel
- [ ] Tablas de control existen en SharePoint
- [ ] Variables de entorno registradas
- [ ] Flujos exportados como JSON
