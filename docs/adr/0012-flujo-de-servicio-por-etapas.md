# ADR-0012 — Flujo del servicio como máquina de estados por etapas

- **Estado**: Propuesto (validar PA-01, PA-02, PA-03 y PA-12)
- **Fecha**: 2026-10-21
- **Decisores**: Propuesto por Claude a partir del Excel del usuario; pendiente de aprobación de Álvaro Sotelo
- **Origen en la guía**: doc. base §6.1 (reglas de negocio), §22 (roles)

## Contexto
El Excel tiene columnas que corresponden a etapas secuenciales: recepción, diagnóstico, cotización, OT, entrega, vida útil y facturación. Además tiene una regla explícita: "cuando se da disposición final se socializa al cliente y se omiten los demás registros". No se pueden exigir todos los campos al crear el registro.

## Opciones consideradas
1. **Formulario único con todos los campos opcionales**. Contras: sin control de calidad ni de flujo; los reportes por etapa no son confiables.
2. **Máquina de estados declarativa** (tabla de transiciones con roles y requisitos). Pros: reglas explícitas, testeables al 100 % y reutilizadas por la UI (qué botón mostrar, qué falta).
3. **Flujo en Power Automate o aprobaciones**. Contras: no funciona offline.

## Decisión
- Estados: `BORRADOR` (solo local) → `RECIBIDO` → `DIAGNOSTICADO` → `COTIZADO` → `EN_REPARACION` → `ENTREGADO` → `FACTURADO`. Además `DISPOSICION_FINAL` (desde `RECIBIDO`) y `ANULADO` (Admin, desde cualquier estado no final).
- Supuesto PA-03: `COTIZADO` con cotización rechazada → `ENTREGADO` sin OT.
- Transiciones, roles y requisitos según `docs/03-Modelo-de-Datos.md` §5, implementados como tabla en `domain/estados.ts`.
- Los campos de etapas completadas son de solo lectura salvo para Admin. Los estados finales no se reabren en v1.0.
- La disposición final se detecta por el valor configurable `DiagnosticoValorDisposicionFinal`.

## Consecuencias
- **Positivas**: datos completos por etapa, UI guiada y reportes confiables.
- **Negativas**: si el negocio cambia el flujo, hay que cambiar la tabla (un ADR nuevo si cambia la semántica).
- **Riesgos**: los supuestos PA-02 y PA-03 pueden no coincidir con la realidad → confirmarlos antes de la F7.

## Cumplimiento / verificación
Prueba T-01 (100 % de transiciones). E2E T-21.

## Referencias
- Excel de campos · PRD §6 · `docs/03` §4–§5
