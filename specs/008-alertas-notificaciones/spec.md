# Spec 008 — Alertas de vida útil y notificaciones

- **Estado**: Borrador
- **Fecha**: 2026-10-21 · **Rama**: `feature/008-alertas-notificaciones`
- **Fase**: F8 (`docs/07`) · **Depende de**: 007 (etapas: OT y entrega con vida útil), 005/006 (los datos deben estar en el repositorio central)
- **Fuentes**: PRD [HU-06 (correo), HU-12; RF-14, RF-15; O5] · ADR [0013] · Modelo de datos [§2.5, §2.6, §6.3]

## 1. Resumen

El Excel pide que la orden de trabajo interna "haga llegar un correo" y que la proyección de vida útil "arroje alertas". Esta spec cubre dos partes:

1. **En la app**: una sección de alertas que muestra, sin conexión, los equipos entregados cuya vida útil proyectada está vencida o próxima a vencer.
2. **En la organización** (sin depender de que alguien abra la app): un correo cuando se genera una OT y un correo diario con los equipos que entran en un nuevo umbral de vida útil.

## 2. Historias de usuario

### HU-008-1 — Ver las alertas de vida útil en la app (Prioridad P1) 🎯

Como **comercial** quiero ver qué equipos entregados están por terminar su vida útil, para contactar al cliente a tiempo y ofrecer el reemplazo o el mantenimiento.
**Por qué P1**: es el valor de negocio de la columna R del Excel y funciona aunque no estén configurados los correos.
**Prueba independiente**: con servicios locales con distintas fechas de vida útil, abrir Alertas sin conexión y verlos en la pestaña correcta.

**Escenarios de aceptación**

- **ES-008-01** — **Dado** servicios **Entregados** o **Facturados** con proyección de vida útil, **cuando** el usuario abre Alertas, **entonces** ve las pestañas **Vencidas**, **≤ 30 días**, **≤ 60 días** y **≤ 90 días** con su contador.
- **ES-008-02** — **Dado** un equipo con la proyección dentro de 20 días, **cuando** abre Alertas, **entonces** aparece **solo** en la pestaña ≤ 30 días (cada equipo en una única pestaña, la del umbral más próximo).
- **ES-008-03** — **Dado** un equipo con la proyección vencida hace 5 días, **cuando** abre Alertas, **entonces** aparece en Vencidas con el texto "Venció hace 5 días".
- **ES-008-04** — **Dado** la lista de una pestaña, **cuando** elige un cliente en el filtro, **entonces** solo ve los equipos de ese cliente. El filtro se mantiene al cambiar de pestaña.
- **ES-008-05** — **Dado** una fila de alerta, **cuando** la toca, **entonces** se abre el detalle del servicio.
- **ES-008-06** — **Dado** equipos **anulados**, en **disposición final** o **sin** proyección de vida útil (entrega sin reparación), **cuando** abre Alertas, **entonces** no aparecen.
- **ES-008-07** — **Dado** que el dispositivo no tiene conexión, **cuando** abre Alertas, **entonces** funciona igual, con los datos locales de la última sincronización.
- **ES-008-08** — **Dado** que la organización cambió los umbrales configurados (por ejemplo a 120, 60 y 15 días), **cuando** se sincroniza la configuración, **entonces** las pestañas y los cálculos usan los nuevos umbrales.

### HU-008-2 — Resumen de alertas en Inicio (Prioridad P2)

Como **usuario** quiero ver en Inicio si hay alertas, para no tener que entrar a buscarlas.

- **ES-008-09** — **Dado** que hay alertas, **cuando** abre Inicio, **entonces** ve la tarjeta "Alertas de vida útil: Vencidas N · ≤ 30 días M", que lleva a Alertas.
- **ES-008-10** — **Dado** que no hay alertas, **cuando** abre Inicio, **entonces** la tarjeta muestra "Sin alertas" (o no aparece, según el diseño de Inicio).

### HU-008-3 — Correo al generar la orden de trabajo (Prioridad P1)

Como **responsable de taller** quiero recibir un correo cuando se crea una OT interna, con todo lo necesario para la reparación, para preparar repuestos e insumos.
**Prueba independiente**: pasar un servicio a En reparación desde la app, sincronizar y recibir el correo una sola vez.

- **ES-008-11** — **Dado** un servicio que llega al repositorio central en estado **En reparación** con el detalle y el costo de la OT, **cuando** se procesa el cambio, **entonces** se envía **un** correo a los destinatarios configurados con: código, tipo, cliente, solicitud, marca, referencia, serie, diagnóstico, detalle de la OT, costo de reparación interna, quién capturó y enlaces al registro y a sus adjuntos.
- **ES-008-12** — **Dado** que el correo ya se envió para ese servicio, **cuando** el registro se vuelve a modificar (por ejemplo, una corrección), **entonces** **no** se envía otro correo.
- **ES-008-13** — **Dado** que el envío falla, **cuando** ocurre el error, **entonces** el responsable de la automatización recibe un aviso de fallo. El registro queda marcado como "no enviado", de modo que se puede reprocesar.

### HU-008-4 — Correo diario de alertas de vida útil (Prioridad P1)

Como **comercial** quiero recibir cada mañana un resumen de los equipos que entraron en un nuevo umbral de vida útil, aunque nadie abra la app.
**Prueba independiente**: un equipo con la proyección dentro de 20 días genera un correo con nivel "30" y no se repite al día siguiente.

- **ES-008-14** — **Dado** equipos Entregados o Facturados con la proyección dentro de los umbrales, **cuando** se ejecuta el proceso diario (07:00, hora de Colombia), **entonces** se envía **un** correo resumen con una tabla (código, cliente, serie, fecha proyectada, días restantes, nivel) a los destinatarios configurados.
- **ES-008-15** — **Dado** un equipo ya notificado en el nivel "30", **cuando** se ejecuta el proceso al día siguiente y sigue en el mismo nivel, **entonces** **no** se vuelve a incluir. Cuando pase a "Vencida", se incluye una vez más.
- **ES-008-16** — **Dado** que ningún equipo cambió de nivel, **cuando** se ejecuta el proceso, **entonces** no se envía correo.

### HU-008-5 — Responsabilidades claras entre la app y la automatización (Prioridad P1)

Como **coordinador** quiero que el control de "correo enviado" y "nivel de alerta notificado" sea exclusivo de la automatización, para evitar correos duplicados o perdidos por ediciones desde los dispositivos.

- **ES-008-17** — **Dado** cualquier sincronización desde la app, **cuando** sube un servicio, **entonces** nunca modifica los indicadores "correo de OT enviado" ni "nivel de alerta notificado".
- **ES-008-18** — **Dado** que la automatización actualizó esos indicadores, **cuando** la app descarga el servicio, **entonces** los conserva tal cual (son de solo lectura para la app y no generan conflictos).

## 3. Casos borde

- Se corrige la proyección de vida útil (Admin) a una fecha más lejana después de haber sido notificado: el equipo puede volver a "Ninguna" o a un nivel menor. [Supuesto: el proceso diario recalcula el nivel y, si **baja**, actualiza el indicador sin enviar correo; si **sube** de nuevo, notifica.]
- La fecha proyectada es hoy: cuenta como 0 días → nivel ≤ 30 (no vencida). Vencida = días < 0.
- Umbrales configurados con un formato inválido: la app usa los valores por defecto (90, 60, 30) y registra una advertencia. La automatización debe tener el mismo comportamiento.
- Un servicio pasa a En reparación sin conexión y se sincroniza días después: el correo de OT llega al sincronizar, no al capturar (se informa en la ayuda).
- El destinatario configurado no existe: el envío falla → aviso al responsable (ES-008-13).
- Más de 5000 equipos en la ventana de 90 días: el proceso debe paginar (no se trunca).
- Cambio de hora o zona horaria del dispositivo: la app calcula los días con fechas sin hora (diferencia de días calendario en la zona de Colombia).

## 4. Requisitos funcionales

| ID        | El sistema debe…                                                                                                                                                                       | Traza    |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-008-01 | Calcular, para cada servicio Entregado o Facturado con proyección de vida útil, el nivel de alerta (Vencida, o el menor umbral configurado que contenga los días restantes, o ninguno) | [RF-14]  |
| FR-008-02 | Excluir de las alertas los servicios anulados, en disposición final o sin proyección                                                                                                   | [RF-14]  |
| FR-008-03 | Mostrar las alertas agrupadas por nivel en pestañas con contador, ordenadas por días restantes ascendente                                                                              | [RF-14]  |
| FR-008-04 | Permitir filtrar las alertas por cliente                                                                                                                                               | [RF-14]  |
| FR-008-05 | Tomar los umbrales de la configuración de la organización, con valores por defecto 90, 60 y 30                                                                                         | [RF-14]  |
| FR-008-06 | Mostrar un resumen de alertas en Inicio                                                                                                                                                | [RF-14]  |
| FR-008-07 | Funcionar sin conexión con los datos locales                                                                                                                                           | [RNF-03] |
| FR-008-08 | Enviar un único correo por servicio cuando llega al repositorio central en estado En reparación, a los destinatarios configurados                                                      | [RF-15]  |
| FR-008-09 | Enviar diariamente un correo resumen con los equipos que cambiaron a un nivel de alerta más urgente, sin repetir el mismo nivel                                                        | [RF-15]  |
| FR-008-10 | Avisar al responsable de la automatización cuando un envío falle                                                                                                                       | [RF-15]  |
| FR-008-11 | Garantizar que la app nunca escriba los indicadores de correo enviado y de nivel notificado                                                                                            | [RF-15]  |
| FR-008-12 | Dejar las automatizaciones documentadas y exportadas para poder reproducirlas en otro ambiente                                                                                         | [RF-15]  |

## 5. Entidades clave

- **Servicio**: estado, cliente, proyección de vida útil, detalle y costo de la OT, indicador "correo de OT enviado" (solo automatización), "nivel de alerta notificado" (solo automatización).
- **Alerta** (derivada, no se guarda en la app): servicio, días restantes, nivel.
- **Configuración**: umbrales de alerta, destinatarios del correo de OT y destinatarios de las alertas.

## 6. Criterios de éxito

- **CE-008-01**: el 100 % de los equipos entregados con proyección recibe una alerta por correo antes de la fecha proyectada (PRD O5).
- **CE-008-02**: 0 correos de OT duplicados por servicio en el piloto.
- **CE-008-03**: el correo de OT llega en ≤ 10 min después de la sincronización.
- **CE-008-04**: la sección Alertas abre en < 1 s con 500 servicios locales.

## 7. Fuera de alcance

- Notificaciones push en el dispositivo (backlog).
- Envío de correos al cliente final.
- Correos de otras etapas (cotización, facturación).
- Edición de destinatarios o umbrales desde la app (se hace en la configuración de la organización).

## 8. Aclaraciones

| Fecha | Pregunta                                                                                                                                                                                   | Respuesta |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| —     | [NECESITA ACLARACIÓN: ¿quién recibe el correo de la OT? — por defecto: la dirección o lista configurada como destino de OT (PA-04)]                                                        | —         |
| —     | [NECESITA ACLARACIÓN: ¿quién recibe las alertas de vida útil y con qué umbrales? — por defecto: la dirección o lista configurada como destino de alertas; 90/60/30 días y vencida (PA-05)] | —         |
| —     | [NECESITA ACLARACIÓN: ¿se acepta una automatización de la organización (fuera de la app) como mecanismo de correo, aunque no haya backend propio? — por defecto: sí (ADR-0013)]            | —         |
