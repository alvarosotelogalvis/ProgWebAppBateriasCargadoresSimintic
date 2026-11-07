# Verificación en DEV real — Spec 004 (Autenticación y configuración inicial)

> Tareas T031 y T033 de [`specs/004-autenticacion-configuracion-inicial/tasks.md`](../../specs/004-autenticacion-configuracion-inicial/tasks.md).
> Se ejecutó junto con la verificación de la spec 005 ([`005-verificacion-dev.md`](005-verificacion-dev.md)), con el mismo build y las mismas cuentas de DEV.

| Dato              | Valor                             |
| ----------------- | --------------------------------- |
| Fecha             | Reportado el 2026-11-07           |
| Versión de la app | 0.1.0                             |
| Ejecutado por     | Desarrollador del proyecto        |
| Plataformas       | Android (app instalada) · Windows |

## Resultado reportado

| Verificación                                                                                                   | Resultado                                          |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| ES-004-01…17 y M-03, M-04: login, asistente de configuración inicial, cuenta con rol, sin rol y de otro tenant | ✅ Android y Windows                               |
| Las mismas verificaciones en **iOS** (app instalada desde Safari)                                              | ⏳ **Pendiente**                                   |
| CE-004-01 — asistente completo en ≤ 3 min con buena conexión                                                   | ✅ 3 min o menos (no se registró el tiempo exacto) |

> El resultado se reportó de forma resumida, sin el detalle por escenario.

## Pendiente: iOS

Repetir en un iPhone o iPad con la app instalada desde Safari (Compartir → _Agregar a pantalla de inicio_):

1. Configuración inicial completa con la cuenta con rol (ES-004-01…).
2. Cuenta sin rol → pantalla "Sin acceso".
3. Cerrar y reabrir la app: la sesión se conserva (caché de MSAL en `localStorage`, ADR-0018).
4. Una sincronización con fotos (spec 005, ES-005-07).

Anotar aquí el resultado y, si algo falla, abrir una tarea de corrección.

| Fecha | Dispositivo / versión de iOS | Resultado | Notas |
| ----- | ---------------------------- | --------- | ----- |
|       |                              |           |       |
