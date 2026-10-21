# Tareas NNN — [Nombre de la funcionalidad]

- **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)
- Formato: `- [ ] T### [P?] [HU-NNN-x?] Descripción — \`ruta/archivo\``
- `[P]` = paralelizable (archivo distinto, sin dependencia pendiente). Las tareas de prueba van **antes** de su implementación (Artículo VII).
- Commit por tarea: `feat(NNN): T### descripción`.

## Fase 1 — Preparación
- [ ] T001 …

## Fase 2 — Fundamentos (bloquean todas las historias)
- [ ] T0xx …

## Fase 3 — HU-NNN-1 (P1) 🎯 MVP
**Prueba independiente**: …
### Pruebas
- [ ] T0xx [P] [HU-NNN-1] …
### Implementación
- [ ] T0xx [HU-NNN-1] …
**Punto de control**: …

## Fase N — Cierre
- [ ] T0xx Verificar ES-NNN-xx manualmente (offline)
- [ ] T0xx `npm run verify` + DoD (`CLAUDE.md` §9) + actualizar el estado de la spec y el índice

## Dependencias
- …
