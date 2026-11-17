# ADR-0016 — Metodología: Kanban personal por fases con DoR/DoD

- **Estado**: Propuesto
- **Fecha**: 2026-10-21
- **Decisores**: Propuesto por Claude a partir de "soy el único desarrollador"; pendiente de aprobación de Álvaro Sotelo
- **Origen en la guía**: `01-Comun` §14 (SDLC), doc. base §24

## Contexto

Un solo desarrollador asistido por IA. Los requerimientos están mayormente claros, pero hay preguntas abiertas que se resolverán durante la implementación.

## Opciones consideradas

1. **Waterfall**. Contras: las preguntas abiertas y los spikes requieren iterar.
2. **Scrum**. Contras: las ceremonias (daily, sprint review) no aportan a una sola persona.
3. **Kanban personal** por fases (`docs/07`) con WIP = 1 tarea y DoR/DoD. Pros: flujo continuo, fácil de seguir por el agente.

## Decisión

- Tablero simple (GitHub Projects o un archivo `docs/tablero.md`) con columnas: _Backlog → Listo (DoR) → En curso (WIP 1) → Verificación → Hecho_.
- **DoR**: la tarea tiene criterios de aceptación en `docs/07`, las preguntas abiertas de su fase están respondidas (o se acepta el valor por defecto) y existen los ADR necesarios.
- **DoD**: `CLAUDE.md` §9.
- Revisión al final de cada fase: ¿cambió alguna decisión? → ADR nuevo.
- Trazabilidad RF → SDD → tarea → prueba (SDD §20, `docs/08` §2).
- Los cambios de alcance se anotan en el PRD (versión y fecha) antes de implementarlos.

## Consecuencias

- **Positivas**: bajo costo de proceso y avance visible por fases.
- **Negativas**: depende de la disciplina personal para mantener el tablero.

## Referencias

- `docs/07`
