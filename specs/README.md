# Specs — Desarrollo guiado por especificaciones (Spec-Driven Development)

> Esta carpeta es la capa **ejecutable** del diseño. Los documentos de `docs/` (PRD, SDD, modelo de datos, ADR) explican el _qué_ y el _por qué_ a nivel de producto y arquitectura. Cada carpeta de `specs/` define una funcionalidad entregable con lo que un agente de IA necesita para construirla de principio a fin.
> La estructura es compatible con [GitHub Spec Kit](https://github.com/github/spec-kit) (`.specify/memory/constitution.md`, `specs/NNN-nombre/{spec,plan,tasks}.md`). No requiere instalar la CLI: si se usa, los comandos `/speckit.*` reconocerán estos archivos.

## 1. Artefactos por funcionalidad

| Archivo    | Pregunta que responde                                                                                                                            | Nivel     | Quién lo escribe y aprueba                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ----------------------------------------- |
| `spec.md`  | **¿Qué** debe hacer y **por qué**? Historias, escenarios Given/When/Then, requisitos FR-xxx, casos borde, criterios de éxito. **Sin tecnología** | Negocio   | Diseño → aprueba el dueño del producto    |
| `plan.md`  | **¿Cómo** se construye? Contexto técnico, verificación de la constitución, archivos a crear o modificar, contratos, decisiones locales, riesgos  | Técnico   | Diseño / agente → revisa el desarrollador |
| `tasks.md` | **¿En qué orden?** Tareas atómicas `T###` con ruta de archivo, dependencias, `[P]` = paralelizable, pruebas antes que código                     | Ejecución | Agente → ejecuta el agente                |

Los `plan.md` **no repiten** el SDD: lo citan por sección (`SDD §9.2`) y agregan solo lo específico de la funcionalidad.

## 2. Flujo de trabajo (por funcionalidad)

```
specify ─► clarify ─► plan ─► tasks ─► implement ─► verify ─► cerrar
   │          │         │        │          │           │
 spec.md   resolver   plan.md  tasks.md   código +    criterios de
 (Borrador) [NECESITA  (+ver.   (T###)     pruebas     aceptación +
            ACLARAR]   constit.)                       DoD (CLAUDE.md §9)
```

1. **Specify**: la spec queda en estado `Borrador`.
2. **Clarify**: cada marca `[NECESITA ACLARACIÓN: …]` se pregunta al usuario o se acepta su valor por defecto (PRD §12). La respuesta se anota en la sección "Aclaraciones" con la fecha. Estado → `Aprobada`.
3. **Plan**: verificación de la constitución (artículo por artículo). Si algo viola un artículo, se justifica en "Seguimiento de complejidad" o se rediseña.
4. **Tasks**: el orden respeta _pruebas → dominio → aplicación → infraestructura → UI → E2E_.
5. **Implement**: una rama por spec (`feature/NNN-nombre`) y commits por tarea (`feat(003): T012 galería de fotos`). Cada tarea terminada se marca `[x]` en `tasks.md`.
6. **Verify**: escenarios de aceptación de `spec.md` + `npm run verify` + DoD. Estado → `Implementada`.

## 3. Índice de specs

| #   | Spec                                                                                     | Fase (`docs/07`) | Depende de                                                                             | Estado            |
| --- | ---------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------- | ----------------- |
| 001 | [Fundación PWA e interfaz base](001-fundacion-pwa/spec.md)                               | F0 + F2          | —                                                                                      | Implementada      |
| 002 | [Dominio y persistencia local](002-dominio-persistencia-local/spec.md)                   | F1               | 001                                                                                    | Implementada      |
| 003 | [Recepción y adjuntos offline](003-recepcion-adjuntos-offline/spec.md)                   | F3               | 002                                                                                    | Implementada      |
| 004 | [Autenticación y configuración inicial](004-autenticacion-configuracion-inicial/spec.md) | F4               | 001, 002 (y el puerto `StoragePort` de la 003: si la 004 se implementa antes, lo crea) | Implementada      |
| 005 | [Sincronización: subida](005-sincronizacion-push/spec.md)                                | F5               | 003, 004                                                                               | Implementada      |
| 006 | [Sincronización: descarga y conflictos](006-sincronizacion-pull-conflictos/spec.md)      | F6               | 005                                                                                    | En implementación |
| 007 | [Etapas del servicio y roles](007-etapas-servicio-roles/spec.md)                         | F7               | 003, 006                                                                               | En implementación |
| 008 | [Alertas de vida útil y notificaciones](008-alertas-notificaciones/spec.md)              | F8               | 007                                                                                    | Implementada      |
| 009 | [Soporte técnico, respaldo y purgas](009-soporte-respaldo-purgas/spec.md)                | F9               | 006                                                                                    | Implementada      |
| 010 | [Clientes nuevos desde el formulario y fusión](010-clientes-nuevos-y-fusion/spec.md)     | posterior a F10  | 003, 006, 009                                                                          | Aprobada          |
| 011 | [Número de solicitud automático](011-numero-solicitud-automatico/spec.md)                | posterior a F10  | 003, 005, 006                                                                          | Implementada      |

La Fase F10 (endurecimiento y release) no es una funcionalidad: se rige por `docs/07` §F10, `docs/08` §6 y `docs/09` §3.

## 4. Convenciones

- **IDs**: requisitos `FR-NNN-xx` (NNN = número de spec), escenarios `ES-NNN-xx`, tareas `T###` (numeración propia de cada spec), criterios de éxito `CE-NNN-xx`.
- **Trazabilidad**: cada FR indica su RF/RNF del PRD entre corchetes, p. ej. `[RF-04]`.
- **Marcas**: `[NECESITA ACLARACIÓN: pregunta — por defecto: valor (PA-xx)]` en las specs. `[P]` en las tareas que se pueden hacer en paralelo (archivos distintos, sin dependencia).
- **Estados de la spec**: `Borrador` → `Aprobada` → `En implementación` → `Implementada`.
- **Plantillas**: `.specify/templates/` (para nuevas funcionalidades posteriores a la v1.0).
- Una spec nueva que contradiga un ADR exige primero un ADR que lo reemplace.
