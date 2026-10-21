# ADR-0002 — App web progresiva (PWA) offline-first, sin backend propio

- **Estado**: Aceptado
- **Fecha**: 2026-10-21
- **Decisores**: Álvaro Sotelo
- **Origen en la guía**: `02-App-Web.md` §2 (PWA / soporte offline), `05-App-Movil.md` §2 (nativo vs. multiplataforma, offline), `01-Comun` §1

## Contexto
- Se necesita capturar datos, fotos y PDFs en sitios **sin conexión** y subirlos luego a SharePoint.
- Hay que cubrir **muchos tipos de dispositivo** (celular, tablet, laptop, escritorio; Android, iOS, Windows, macOS), que **no están administrados** (sin Intune ni tiendas corporativas).
- **No hay backend** ni se quiere operar uno.
- Hay un solo desarrollador.

## Opciones consideradas
1. **PWA (React) instalable**. Pros: un solo código para todos los dispositivos, sin tiendas, actualización inmediata, hosting estático gratuito. Contras: limitaciones de iOS (sin Background Sync, riesgo de borrado de almacenamiento si no está instalada) y almacenamiento dependiente del navegador.
2. **React Native / Expo**. Pros: almacenamiento y cámara nativos, sincronización en segundo plano. Contras: no cubre escritorio sin otro proyecto, exige tiendas o MDM para distribuir (los dispositivos no están administrados) y ciclo de builds por plataforma.
3. **Flutter / .NET MAUI**. Contras similares a la opción 2, además de otro lenguaje.
4. **Power Apps**. Contras: el modo offline requiere Dataverse (no SharePoint), con un costo de licencias adicional.
5. **App con backend (Azure Functions) y credenciales de aplicación**. Contras: descartada por el usuario (no hay backend). Además, el secreto de la aplicación no puede vivir en el cliente.

## Decisión
**PWA instalable, offline-first, sin backend.** Toda la lógica corre en el dispositivo. El hosting estático (ADR-0014) solo entrega los archivos. Los datos se escriben en SharePoint con el **token delegado del usuario** (ADR-0006), nunca con credenciales de aplicación en el cliente.

## Consecuencias
- **Positivas**: cobertura total de dispositivos, costo de infraestructura ≈ 0 y despliegue instantáneo.
- **Negativas**: la sincronización requiere la app abierta y una confirmación del usuario. iOS exige instalación y mitigaciones (ADR-0008).
- **Riesgos y mitigación**: comportamiento de iOS → spikes S1/S5/S6 en la Fase 0. Si fallan, un ADR nuevo evalúa empaquetar el mismo código con Capacitor.
- **Deuda aceptada**: sin sincronización en segundo plano.

## Cumplimiento / verificación
`CLAUDE.md` §10 prohíbe agregar un backend. Revisión de PR: ningún secreto ni llamada a servidores propios.

## Referencias
- Conversación de diseño 2026-10-21. PRD §5 y §10.
