# S5 — Almacenamiento persistente, cuota y supervivencia de 8 días en iOS

> Tarea T048 · ADR-0008 · Estado: **⏳ guía lista, sin ejecutar** · Ejecutado por: ______ · Fecha de inicio: ______ · Fecha de cierre: ______

## Preguntas

1. En una PWA **instalada** en iOS, ¿`navigator.storage.persist()` se concede? ¿cuál es la cuota?
2. ¿Los datos de IndexedDB (servicios, fotos y PDFs como `Blob`) **sobreviven 8 días** sin abrir la app?
3. En Android y Windows, ¿se concede el almacenamiento persistente y cuál es la cuota?

**Criterio de éxito:** datos presentes tras 8 días y la cuota reportada documentada.

## Por qué importa

Safari borra el almacenamiento de los sitios que no se usan durante ~7 días (_Intelligent Tracking Prevention_). Las PWA instaladas deberían quedar exentas; si no, un técnico podría **perder fotos sin sincronizar** (la regla número 1 del proyecto). Por eso la app **bloquea el uso en iOS si no está instalada** (FR-001-04). Este spike lo confirma con un iPhone real. Si fallara, el plan B es empaquetar con Capacitor (ADR nuevo, `docs/07` backlog).

## Preparación

- iPhone con la app **instalada desde Safari** (Compartir → _Agregar a pantalla de inicio_), cuenta con rol Administrador (para ver **Más → Técnico → Estado del dispositivo**).
- Elige un día de inicio ("Día 0") y **no vuelvas a abrir la app** hasta el Día 8. Pon un recordatorio.
- Para que los datos sean un **pendiente real** (no sincronizable por error), crea los servicios **sin sincronizar**.

## Pasos

**Día 0**

1. Abre la app instalada → **Más → Técnico → Estado del dispositivo**. Anota: _Plataforma_, _Navegador_, _Almacenamiento persistente_ (habilitado / no), _Uso de espacio_ (MB usados / MB de cuota).
2. Crea **3 recepciones con 3 fotos cada una** (modo avión para asegurar que no se sincronizan). Anota los **códigos** de los 3 servicios (`BAT-…`) y el número de fotos.
3. Vuelve a **Estado del dispositivo** y anota el uso de espacio después de las fotos.
4. (Opcional) **Cuota:** sigue agregando fotos hasta que la app avise («El almacenamiento del dispositivo está al … %») o diga «El almacenamiento está lleno» (95 %), y anota cuántas cupieron y a cuántos MB.
5. Cierra la app por completo (quítala de los recientes). **No la abras ni abras Safari en esta URL durante 8 días.**

**Día 8 o posterior**

6. **Con el teléfono en modo avión**, abre la app desde el ícono. Anota si carga.
7. ¿Están los **3 servicios** con sus **fotos** (abre el detalle y la galería)? ¿Siguen como _Pendiente_?
8. **Más → Técnico → Estado del dispositivo**: anota otra vez _Almacenamiento persistente_ y _Uso de espacio_.
9. Quita el modo avión y **sincroniza**: deben subir los 3 servicios sin errores.

**Android y Windows (10 minutos)**

10. Repite los pasos 1–3 en un Android (Chrome, app instalada) y en Windows (Edge, app instalada) y anota los mismos datos. No requieren los 8 días.

## Resultado

| Plataforma | SO / navegador | Persistente (Día 0) | Cuota total | Uso con 9 fotos | ¿Carga a los 8 días? | Servicios presentes | Fotos presentes | Sync posterior OK | Notas |
| ---------- | -------------- | :-----------------: | ----------: | --------------: | :------------------: | :-----------------: | :-------------: | :---------------: | ----- |
| iPhone     |                |                     |             |                 |                      |         /3          |       /9        |                   |       |
| Android    |                |                     |             |                 |          —           |          —          |        —        |         —         |       |
| Windows    |                |                     |             |                 |          —           |          —          |        —        |         —         |       |

Prueba de cuota (paso 4, opcional): fotos que cupieron ______ · MB al avisar ______ · ¿el aviso apareció? ______

## Decisión

- [ ] **Persiste y los datos sobreviven** → ADR-0008 se mantiene; pasar a `Aceptado`.
- [ ] iOS **no** concede persistencia pero los datos sobreviven → mantener, añadir al texto de Ayuda una recomendación de sincronizar a diario.
- [ ] **Se pierden datos a los 8 días** → bloqueante: abrir ADR nuevo (Capacitor u otra estrategia) antes de producción, y reforzar la advertencia de «pendientes sin sincronizar».

Notas / observaciones adicionales:
