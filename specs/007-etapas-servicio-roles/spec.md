# Spec 007 — Etapas del servicio y roles

- **Estado**: En implementación (código y pruebas completos; pendientes T042 prueba en DEV real y T043 medición de tiempos)
- **Fecha**: 2026-10-21 · **Rama**: `feature/007-etapas-servicio-roles`
- **Fase**: F7 (`docs/07`) · **Depende de**: 003 (recepción y adjuntos), 006 (descarga y conflictos), 004 (roles)
- **Fuentes**: PRD [HU-04, HU-05, HU-06 (captura), HU-07, HU-08, HU-15; RF-05, RF-07, RF-08, RF-25, RF-26; RNF-01, RNF-08, RNF-11] · ADR [0006, 0011, 0012] · Modelo de datos [§2.3–§2.7, §3.1, §4, §5]

## 1. Resumen

Después de la recepción, cada servicio avanza por las etapas del Excel (columnas L–U): diagnóstico, cotización, orden de trabajo interna, entrega con proyección de vida útil y facturación. Si el diagnóstico es **disposición final**, se informa al cliente, se adjunta el soporte y el registro se cierra sin pasar por las demás etapas. Cada etapa la completa el rol responsable (Técnico o Comercial), **sin conexión**. El Administrador puede anular registros y corregir etapas ya cerradas.

## 2. Historias de usuario

### HU-007-1 — Diagnosticar el equipo (Prioridad P1) 🎯

Como **técnico** quiero registrar el diagnóstico con su formato en PDF y mi observación, para dejar documentado el estado real del equipo.
**Por qué P1**: es la etapa que decide todo el resto del flujo (reparar o disposición final).
**Prueba independiente**: en modo avión, sobre un servicio Recibido, completar el diagnóstico "Reparable" con un PDF; el servicio queda Diagnosticado y pendiente de sincronizar.

**Escenarios de aceptación**

- **ES-007-01** — **Dado** un servicio **Recibido** y un usuario con rol Técnico, **cuando** abre el detalle, **entonces** ve la acción "Diagnosticar" en la etapa actual.
- **ES-007-02** — **Dado** el formulario de diagnóstico, **cuando** abre la lista de diagnóstico, **entonces** ve los valores descargados del catálogo de la organización (no una lista fija de la app).
- **ES-007-03** — **Dado** un diagnóstico distinto de disposición final, una observación técnica de al menos 5 caracteres y un PDF de formato de diagnóstico, **cuando** pulsa "Completar diagnóstico", **entonces** el servicio pasa a **Diagnosticado** y queda pendiente de sincronizar.
- **ES-007-04** — **Dado** que falta el PDF de formato de diagnóstico, **cuando** intenta completar, **entonces** el botón sigue deshabilitado y la pantalla lista "Falta: formato de diagnóstico (PDF)".
- **ES-007-05** — **Dado** que el formato de diagnóstico ya está adjunto, **cuando** elige "Reemplazar" y selecciona otro PDF, **entonces** queda un único formato (el nuevo).

### HU-007-2 — Disposición final (Prioridad P1)

Como **técnico** quiero cerrar el servicio cuando el equipo no tiene reparación, dejando constancia de que se informó al cliente, para no registrar etapas que no aplican.
**Prueba independiente**: elegir el diagnóstico de disposición final, adjuntar los dos PDF y completar; el registro queda cerrado y de solo lectura.

- **ES-007-06** — **Dado** el formulario de diagnóstico, **cuando** elige el valor que representa la disposición final, **entonces** aparecen los campos "Fecha de socialización con el cliente" y "PDF de disposición final", junto con el aviso "Se cerrará el registro sin reparación".
- **ES-007-07** — **Dado** diagnóstico de disposición final, observación, formato de diagnóstico, fecha de socialización (≥ fecha de recepción, ≤ hoy) y PDF de disposición final, **cuando** pulsa "Completar disposición final" y confirma, **entonces** el servicio pasa a **Disposición final**, queda cerrado y ya no ofrece las etapas de cotización, OT, entrega ni facturación.
- **ES-007-08** — **Dado** una fecha de socialización anterior a la fecha de recepción, **cuando** sale del campo, **entonces** se muestra el error "No puede ser anterior a la recepción".

### HU-007-3 — Registrar la cotización (Prioridad P1)

Como **comercial** quiero registrar cuándo envié la cotización, su valor y la respuesta del cliente, para saber qué equipos pueden pasar a reparación.
**Prueba independiente**: sobre un servicio Diagnosticado, registrar la fecha de envío; el servicio queda Cotizado con respuesta "Pendiente". Luego, marcar "Aprobada".

- **ES-007-09** — **Dado** un servicio **Diagnosticado** y el rol Comercial, **cuando** registra la fecha de envío (≥ recepción, ≤ hoy) y pulsa "Registrar cotización", **entonces** el servicio pasa a **Cotizado** con la respuesta "Pendiente".
- **ES-007-10** — **Dado** el campo valor, **cuando** escribe `1250000` y sale del campo, **entonces** se muestra como "$ 1.250.000". Un valor negativo se rechaza.
- **ES-007-11** — **Dado** la cotización, **cuando** adjunta un PDF (opcional), **entonces** queda asociado a la etapa de cotización. Se puede completar sin PDF.
- **ES-007-12** — **Dado** un servicio **Cotizado**, **cuando** el comercial cambia la respuesta a "Aprobada", **entonces** la etapa siguiente ofrece "Crear orden de trabajo". Si la cambia a "Rechazada", ofrece "Entregar sin reparación".
- **ES-007-13** — **Dado** un usuario solo con rol Técnico y un servicio **Diagnosticado**, **cuando** abre el detalle, **entonces** ve "Pendiente de Comercial" en lugar de la acción.

### HU-007-4 — Orden de trabajo interna (Prioridad P1)

Como **técnico** quiero registrar todo lo que se necesita para la reparación y su costo interno, para que el equipo de taller lo prepare.
**Prueba independiente**: sobre un servicio Cotizado y aprobado, completar la OT; el servicio queda En reparación.

- **ES-007-14** — **Dado** un servicio **Cotizado** con respuesta **Aprobada**, **cuando** el técnico ingresa el detalle (≥ 5 caracteres) y el costo de reparación interna (≥ 0) y pulsa "Crear orden de trabajo", **entonces** el servicio pasa a **En reparación** y queda pendiente de sincronizar.
- **ES-007-15** — **Dado** un servicio **Cotizado** con respuesta **Pendiente**, **cuando** el técnico abre el detalle, **entonces** no puede crear la OT y ve "Esperando la respuesta del cliente".

### HU-007-5 — Entregar el equipo (Prioridad P1)

Como **técnico** quiero registrar la entrega con fotos de salida y la vida útil proyectada, para cerrar la parte técnica y habilitar las alertas futuras.
**Prueba independiente**: sobre un servicio En reparación, registrar la entrega con 2 fotos y la vida útil sugerida; el servicio queda Entregado.

- **ES-007-16** — **Dado** un servicio **En reparación**, **cuando** abre la entrega, **entonces** la fecha de entrega viene en hoy y la proyección de vida útil se sugiere como fecha de entrega + 12 meses (configurable), con atajos +6 m, +12 m, +18 m y +24 m.
- **ES-007-17** — **Dado** una fecha de entrega (≥ recepción, ≤ hoy), al menos 1 foto de salida y una proyección posterior a la entrega, **cuando** pulsa "Completar entrega", **entonces** el servicio pasa a **Entregado**.
- **ES-007-18** — **Dado** una proyección de vida útil igual o anterior a la fecha de entrega, **cuando** sale del campo, **entonces** se muestra el error "Debe ser posterior a la entrega".
- **ES-007-19** — **Dado** un servicio **Cotizado** con respuesta **Rechazada**, **cuando** el técnico registra la fecha de entrega y las fotos de salida, **entonces** puede completar la entrega **sin** orden de trabajo y la proyección de vida útil es opcional.
- **ES-007-20** — **Dado** las fotos de salida, **cuando** las agrega, **entonces** se comportan igual que las de ingreso (optimización, mín./máx., duplicados, visor).

### HU-007-6 — Facturar (Prioridad P1)

Como **comercial** quiero adjuntar la factura del servicio, para cerrarlo.
**Prueba independiente**: sobre un servicio Entregado, adjuntar el PDF y la fecha; el servicio queda Facturado y cerrado.

- **ES-007-21** — **Dado** un servicio **Entregado** y el rol Comercial, **cuando** adjunta el PDF de la factura, la fecha (≥ recepción, ≤ hoy) y opcionalmente el número, y pulsa "Completar facturación", **entonces** el servicio pasa a **Facturado** y queda de solo lectura.
- **ES-007-22** — **Dado** un número de factura con caracteres no permitidos (por ejemplo `FE 12#`), **cuando** sale del campo, **entonces** se muestra el error de formato.

### HU-007-7 — Adjuntar PDF válido (Prioridad P1)

Como **usuario** quiero que la app rechace archivos que no son PDF o que son demasiado grandes, para no subir documentos inservibles.

- **ES-007-23** — **Dado** un archivo con extensión `.pdf` que no es un PDF real, **cuando** se adjunta, **entonces** se rechaza con "El archivo no es un PDF válido".
- **ES-007-24** — **Dado** un PDF de más de 20 MB (configurable), **cuando** se adjunta, **entonces** se rechaza con "El PDF supera el tamaño máximo de 20 MB".
- **ES-007-25** — **Dado** un PDF adjunto, **cuando** pulsa "Ver", **entonces** se abre en el visor del dispositivo, incluso sin conexión.

### HU-007-8 — Anular y corregir (Prioridad P2)

Como **administrador** quiero anular registros erróneos con un motivo y corregir datos de etapas ya completadas, para mantener la información confiable sin borrar historia.

- **ES-007-26** — **Dado** un servicio no cerrado y el rol Administrador, **cuando** elige "Anular", escribe un motivo de al menos 10 caracteres y confirma, **entonces** el servicio pasa a **Anulado**, queda de solo lectura y registra la fecha de anulación.
- **ES-007-27** — **Dado** un usuario sin rol Administrador, **cuando** abre cualquier servicio, **entonces** no ve la opción "Anular".
- **ES-007-28** — **Dado** una etapa ya completada y el rol Administrador, **cuando** elige "Editar" en esa etapa, cambia un campo y guarda, **entonces** el valor se corrige, el estado del servicio **no** cambia y queda pendiente de sincronizar.
- **ES-007-29** — **Dado** un usuario Técnico o Comercial, **cuando** abre una etapa completada, **entonces** la ve en solo lectura.
- **ES-007-30** — **Dado** un servicio en estado final (Facturado, Disposición final o Anulado), **cuando** un Administrador lo abre, **entonces** puede corregir campos pero no existe la opción de reabrirlo.

### HU-007-9 — Mis trabajos según mi rol (Prioridad P2)

Como **usuario** quiero ver en Inicio cuántos servicios esperan mi acción, para saber qué hacer primero.

- **ES-007-31** — **Dado** el rol Técnico, **cuando** abre Inicio, **entonces** ve las tarjetas Borradores, Recibidos (por diagnosticar), Cotizados aprobados (por OT) y En reparación (por entregar), con su contador y un enlace a la lista filtrada.
- **ES-007-32** — **Dado** el rol Comercial, **cuando** abre Inicio, **entonces** ve Diagnosticados (por cotizar), Cotizados pendientes de respuesta y Entregados (por facturar).
- **ES-007-33** — **Dado** un usuario con varios roles, **cuando** abre Inicio, **entonces** ve la unión de las tarjetas sin duplicados.

## 3. Casos borde

- Se cambia el diagnóstico de disposición final a otro valor antes de completar: los campos de disposición final se ocultan, pero lo ya escrito se conserva en el borrador de la etapa hasta completar. Al completar como Diagnosticado, la fecha de socialización y el PDF de disposición final **no** se exigen. El PDF de disposición final ya adjuntado se elimina con confirmación.
- El catálogo de diagnóstico cambió en la organización y el valor guardado ya no existe: se muestra el valor guardado con la marca "valor anterior". Para completar la etapa hay que elegir uno vigente.
- El valor configurado como "disposición final" no existe en el catálogo descargado: la rama de disposición final no se ofrece y el menú técnico registra una advertencia de configuración.
- La respuesta de la cotización llega cambiada desde otro dispositivo (descarga) mientras el técnico tenía abierta la OT: la pantalla se actualiza en vivo. Si la respuesta ya no es "Aprobada", la acción se deshabilita.
- Dos usuarios completan la misma etapa en dispositivos distintos sin conexión: lo resuelve la spec 006 (conflicto por campo; el estado más avanzado gana).
- Un Administrador corrige la fecha de recepción a una posterior a la fecha de entrega ya registrada: se rechaza (las validaciones cruzadas entre fechas se aplican también en las correcciones).
- PDF protegido con contraseña: se acepta (la app no lo abre por dentro). Se informa que el cliente necesitará la contraseña.
- Se cierra la app con un formulario de etapa a medias: los campos se conservan (autoguardado), igual que en la recepción.

## 4. Requisitos funcionales

| ID        | El sistema debe…                                                                                                                                                                                       | Traza          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| FR-007-01 | Mostrar en cada servicio solo las acciones de transición permitidas por su estado y por los roles del usuario, indicando "Pendiente de <rol>" cuando corresponde a otro                                | [RF-07]        |
| FR-007-02 | Exigir para cada transición exactamente los requisitos de `docs/03` §5 y mostrar la lista de faltantes                                                                                                 | [RF-07]        |
| FR-007-03 | Ofrecer los valores de diagnóstico desde el catálogo de la organización descargado                                                                                                                     | [RF-07]        |
| FR-007-04 | Tratar como disposición final el valor configurado y, en ese caso, exigir la fecha de socialización y el PDF de disposición final y cerrar el registro                                                 | [RF-08]        |
| FR-007-05 | Registrar la cotización (fecha de envío obligatoria, valor en pesos opcional, respuesta Pendiente/Aprobada/Rechazada, PDF opcional) y permitir cambiar la respuesta mientras el servicio está Cotizado | [RF-07]        |
| FR-007-06 | Habilitar la OT solo con la cotización Aprobada y la entrega sin reparación solo con la cotización Rechazada                                                                                           | [RF-07]        |
| FR-007-07 | Registrar la OT (detalle y costo de reparación interna, ambos obligatorios)                                                                                                                            | [RF-07]        |
| FR-007-08 | Registrar la entrega (fecha, fotos de salida con los límites configurados y proyección de vida útil con sugerencia configurable)                                                                       | [RF-04, RF-07] |
| FR-007-09 | Registrar la facturación (PDF obligatorio, fecha obligatoria, número opcional con formato válido)                                                                                                      | [RF-05, RF-07] |
| FR-007-10 | Validar los PDF por contenido real (no solo por extensión) y por tamaño máximo configurable; permitir verlos y reemplazarlos sin conexión                                                              | [RF-05]        |
| FR-007-11 | Aplicar las validaciones cruzadas de fechas (≥ recepción, ≤ hoy, vida útil > entrega) también en las correcciones                                                                                      | [RF-06]        |
| FR-007-12 | Permitir al Administrador anular un servicio no final con un motivo de ≥ 10 caracteres, dejándolo de solo lectura                                                                                      | [RF-25]        |
| FR-007-13 | Permitir al Administrador corregir campos de etapas completadas o de servicios finales sin cambiar el estado ni reabrirlos                                                                             | [RF-26]        |
| FR-007-14 | Mostrar en solo lectura las etapas completadas a quien no es Administrador                                                                                                                             | [RF-07]        |
| FR-007-15 | Marcar como pendiente de sincronizar todo cambio de etapa, corrección o adjunto nuevo                                                                                                                  | [RF-10]        |
| FR-007-16 | Mostrar en Inicio las tarjetas de trabajo por rol con contadores y acceso a la lista filtrada                                                                                                          | [RF-13]        |
| FR-007-17 | Funcionar completo sin conexión                                                                                                                                                                        | [RNF-03]       |

## 5. Entidades clave

- **Servicio**: atributos de esta spec: diagnóstico, observación técnica, fecha de socialización, datos de cotización (fecha, valor, respuesta), datos de OT (detalle, costo), fecha de entrega, proyección de vida útil, datos de factura (número, fecha), motivo y fecha de anulación.
- **Adjunto**: formato de diagnóstico, disposición final, cotización, factura (PDF) y fotos de salida (imagen).
- **Catálogo de diagnóstico** (solo lectura): valores definidos por la organización.
- **Rol del usuario**: Técnico, Comercial, Administrador.

## 6. Criterios de éxito

- **CE-007-01**: un servicio recorre todas las etapas hasta Facturado entre dos usuarios de roles distintos sin intervención técnica.
- **CE-007-02**: 100 % de los servicios Diagnosticados tienen formato de diagnóstico, y el 100 % de las disposiciones finales tienen su PDF y fecha de socialización.
- **CE-007-03**: ningún usuario sin el rol correspondiente puede completar una etapa desde la app (0 casos en las pruebas de rol).
- **CE-007-04**: completar cualquier etapa sin fotos toma ≤ 1 min; la entrega con 2 fotos, ≤ 2 min.
- **CE-007-05**: 0 pérdidas de datos de etapa tras cerrar y reabrir la app.

## 7. Fuera de alcance

- El correo automático de la OT y las alertas de vida útil (spec 008).
- Generar el PDF de cotización o factura dentro de la app.
- Reabrir servicios finales.
- Grabar audio para la observación técnica (se usa el dictado del teclado, PA-13).
- La subida y descarga de estos datos (specs 005 y 006, que ya los cubren de forma genérica).

## 8. Aclaraciones

| Fecha | Pregunta                                                                                                                                                               | Respuesta |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| —     | [NECESITA ACLARACIÓN: ¿qué valores tiene la lista de diagnóstico? — por defecto: Reparable, Garantía, Sin falla, D. FINAL; la disposición final es "D. FINAL" (PA-01)] | —         |
| —     | [NECESITA ACLARACIÓN: ¿qué datos lleva la cotización? — por defecto: fecha de envío, valor, respuesta y PDF opcional (PA-02)]                                          | —         |
| —     | [NECESITA ACLARACIÓN: ¿qué pasa si el cliente rechaza la cotización? — por defecto: entrega sin reparación sin OT, luego facturación (PA-03)]                          | —         |
| —     | [NECESITA ACLARACIÓN: ¿la observación técnica "verbal" requiere audio? — por defecto: no, texto con dictado del teclado (PA-13)]                                       | —         |
