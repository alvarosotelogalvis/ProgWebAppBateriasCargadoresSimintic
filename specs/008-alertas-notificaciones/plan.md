# Plan 008 — Alertas de vida útil y notificaciones

## Estrategia

### Parte 1: App (6 tareas)

1. **T001–T002**: Dominio (función `calcularNivelAlerta`, pruebas)
2. **T003**: Componente `/alertas` (pestañas, filtro, lista)
3. **T004**: Tarjeta resumen en Inicio
4. **T005–T006**: Rutas, i18n, E2E

### Parte 2: Power Automate (4 tareas)

5. **T007**: Flujo "Correo OT" (trigger: EN_REPARACION)
6. **T008**: Flujo "Alertas diarias" (horario 07:00 CO)
7. **T009**: Tablas de control (`OTCorreoEnviado`, `NivelAlertaNotificado`) en SharePoint
8. **T010**: Documentación y exportación de flujos

## Arquitectura

### Domain

```
domain/alertas.ts
  ├── calcularNivelAlerta(fechaProyectada, umbrales): 'vencida' | '90' | '60' | '30' | null
  ├── diasRestantes(fecha): number
  └── filtrarAlertasActivas(servicios, umbrales): Alerta[]
```

### UI

```
/alertas (lazy, protected)
  ├── PestañasAlertas (Vencidas, ≤30, ≤60, ≤90)
  ├── FiltroCliente (combobox)
  └── Lista (código, cliente, serie, fecha, días)

Inicio
  └── TarjetaAlertas (contador vencidas + 30 días)
```

### Power Automate (SharePoint)

```
Flow 1: "Cuando EN_REPARACION"
  → Enviar correo OT
  → Set OTCorreoEnviado = true

Flow 2: "Programada 07:00 CO"
  → Query Servicios ENTREGADO/FACTURADO ≤90 días
  → Calcular cambios de nivel
  → Enviar resumen si hay cambios
```

## Constitución

✅ Offline-first: alertas funcionan sin red
✅ Respeto de capas: dominio sin React
✅ Idempotencia: indicadores previenen duplicados
