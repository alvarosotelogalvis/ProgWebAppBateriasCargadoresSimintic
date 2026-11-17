# Spec 003 — Recepción y adjuntos offline

- **Estado**: Implementada
- **Fecha**: 2026-10-21 · **Rama**: `feature/003-recepcion-adjuntos-offline`
- **Fase**: F3 (`docs/07`) · **Depende de**: 002 (dominio y persistencia), 001 (shell de UI)
- **Fuentes**: PRD [HU-03, HU-10 parcial; RF-03, RF-04, RF-05, RF-06, RF-13; RNF-01, RNF-05, RNF-07, RNF-08] · ADR [0008, 0011, 0012, 0022] · Modelo de datos [§2.1, §2.2, §3, §5] · Sistema de diseño [`docs/10` §6: referencias 03, 07, 08]

> **Nota (2026-11-16)**: el número de solicitud (FR-003-03, ES-003-06, FR-003-12, aclaración PA-07) ya no se captura: la spec 011 / ADR-0024 lo reemplaza por un consecutivo automático asignado al sincronizar. Esta spec conserva su historia.

## 1. Resumen

Un técnico registra la llegada de una batería o un cargador con sus datos de identificación y fotos de ingreso, **sin necesitar conexión**. El registro queda guardado en el dispositivo, listo para sincronizarse después. Reemplaza las columnas C–K del Excel ("tipo", "fecha recepción", "foto ingreso", "empresa-cliente", "# solicitud", "marca", "referencia", "# serie").

## 2. Historias de usuario

### HU-003-1 — Registrar la recepción sin conexión (Prioridad P1) 🎯

Como **técnico** quiero registrar los datos de un equipo recibido aunque no tenga internet, para no depender de la cobertura en la instalación del cliente.
**Por qué P1**: es el punto de entrada de todo el ciclo; sin esto no hay app.
**Prueba independiente**: en modo avión, crear una recepción completa, cerrar la app, reabrirla y encontrar el registro "Recibido – pendiente de sincronizar".

**Escenarios de aceptación**

- **ES-003-01** — **Dado** que el dispositivo no tiene conexión y la configuración inicial está hecha, **cuando** el técnico pulsa "+ Nuevo", **entonces** se crea un borrador con la fecha de hoy y se abre el formulario de recepción.
- **ES-003-02** — **Dado** un borrador con todos los campos obligatorios y al menos el mínimo de fotos, **cuando** pulsa "Completar recepción", **entonces** el servicio pasa a **Recibido**, aparece en la lista con la marca "pendiente de sincronizar" y su código tiene la forma `CAR-1-NV4520`.
- **ES-003-03** — **Dado** un borrador al que le falta la serie y no tiene fotos, **cuando** intenta completarlo, **entonces** el botón sigue deshabilitado y la pantalla lista "Falta: serie, 1 foto de ingreso". Al pulsar sobre la lista, el foco va al primer campo pendiente.
- **ES-003-04** — **Dado** un formulario a medio llenar, **cuando** se cierra la app (o se apaga el dispositivo) y se vuelve a abrir, **entonces** el borrador conserva todo lo escrito y las fotos.

### HU-003-2 — Datos consistentes y validados (Prioridad P1)

Como **coordinador** quiero que el cliente se elija de un catálogo y que serie, referencia y solicitud tengan un formato válido, para que los reportes no tengan variantes del mismo dato.
**Prueba independiente**: intentar ingresar un cliente que no está en el catálogo, una solicitud con letras y una serie con espacios; ninguno se acepta tal cual.

- **ES-003-05** — **Dado** el campo cliente, **cuando** el técnico escribe "aris", **entonces** se sugieren "ARIS MINING SEGOVIA" y "ARIS MINING MARMATO" y solo puede elegir una opción del catálogo activo (no hay texto libre).
- **ES-003-06** — **Dado** el campo número de solicitud, **cuando** escribe "12a", **entonces** se muestra el error "Solo números" y en el celular aparece el teclado numérico.
- **ES-003-07** — **Dado** el campo serie, **cuando** escribe " nv 4520 ", **entonces** se normaliza a "NV4520" al salir del campo. Si el resultado no cumple el formato alfanumérico, se muestra el error.
- **ES-003-08** — **Dado** el campo marca, **cuando** escribe "roq", **entonces** se sugiere "ROQUET". Si escribe una marca nueva, se acepta en mayúsculas.
- **ES-003-09** — **Dado** que ya existe un servicio **abierto** con la serie "NV4520", **cuando** se ingresa esa serie en un borrador, **entonces** aparece una advertencia (no bloqueante) con un enlace al servicio existente.
- **ES-003-10** — **Dado** el campo fecha de recepción, **cuando** se elige una fecha futura, **entonces** se rechaza con el error "No puede ser posterior a hoy".

### HU-003-3 — Fotos de ingreso optimizadas (Prioridad P1)

Como **técnico** quiero tomar fotos con la cámara o elegirlas de la galería y que se optimicen solas, para documentar el estado del equipo sin llenar el teléfono ni consumir muchos datos.
**Prueba independiente**: agregar 3 fotos de 12 MP; cada una se guarda con menos de 1 MB y se ve como miniatura de inmediato.

- **ES-003-11** — **Dado** un celular o una tablet, **cuando** pulsa "Tomar foto", **entonces** se abre la cámara trasera y al confirmar la foto aparece en la galería del formulario en ≤ 2 s (gama media).
- **ES-003-12** — **Dado** cualquier dispositivo, **cuando** pulsa "Galería" (o "Archivo" en el PC) y elige 5 imágenes, **entonces** se procesan una a una con el progreso visible ("Optimizando 2 de 5…") y la interfaz sigue respondiendo.
- **ES-003-13** — **Dado** un PC con webcam, **cuando** pulsa "Webcam", **entonces** puede capturar una foto desde la cámara del equipo.
- **ES-003-14** — **Dado** que ya hay 10 fotos de ingreso (el máximo), **cuando** intenta agregar otra, **entonces** los botones de agregar se deshabilitan con el texto "Máximo 10 fotos".
- **ES-003-15** — **Dado** que se elige la misma imagen dos veces, **cuando** se procesa la segunda, **entonces** se informa "Esta foto ya fue agregada" y no se duplica.
- **ES-003-16** — **Dado** una foto agregada, **cuando** el técnico la abre, **entonces** la ve a pantalla completa con zoom. Al elegir "Eliminar" y confirmar, se quita del borrador.
- **ES-003-17** — **Dado** una imagen en un formato que el dispositivo no puede leer, **cuando** se elige, **entonces** se muestra "Formato no soportado, toma la foto con la cámara de la app" sin romper el formulario.

### HU-003-4 — Espacio del dispositivo bajo control (Prioridad P2)

Como **técnico** quiero saber si me estoy quedando sin espacio antes de perder la posibilidad de capturar.

- **ES-003-18** — **Dado** un uso de almacenamiento ≥ 80 % de la cuota, **cuando** abre la app o agrega una foto, **entonces** ve un aviso "Espacio casi lleno: sincroniza para liberar espacio".
- **ES-003-19** — **Dado** un uso ≥ 95 %, **cuando** intenta agregar una foto o un PDF, **entonces** la acción se bloquea con un mensaje y los datos ya guardados no se ven afectados.

### HU-003-5 — Consultar lo registrado (Prioridad P2)

Como **técnico** quiero buscar y ver los servicios guardados en mi dispositivo, incluso sin conexión.

- **ES-003-20** — **Dado** 200 servicios locales, **cuando** busca "NV45", **entonces** la lista filtra por serie, código, solicitud, cliente o referencia al escribir, sin trabarse.
- **ES-003-21** — **Dado** la lista, **cuando** filtra por estado "Borrador" o "Pendiente de sincronizar", **entonces** solo ve esos.
- **ES-003-22** — **Dado** un servicio, **cuando** lo abre, **entonces** ve el detalle con la línea de tiempo de etapas: la recepción completada con sus fotos y las demás como pendientes.
- **ES-003-23** — **Dado** un borrador que ya no se necesita, **cuando** elige "Descartar borrador" y confirma, **entonces** se elimina junto con sus fotos. Esta opción **no** existe para servicios ya recibidos.

## 3. Casos borde

- La app se cierra **mientras** se optimiza una foto: la foto en proceso se pierde (no estaba guardada), pero las anteriores y los campos permanecen. Al volver se muestra el estado real.
- Cambio de orientación o pantalla dividida durante la captura: el formulario conserva los valores.
- El catálogo de clientes está vacío (no se completó la descarga): el formulario muestra "No hay clientes descargados. Conéctate y refresca los catálogos" y no permite completar.
- Un cliente usado en un borrador se desactiva después en el catálogo: el borrador conserva el cliente elegido, pero no se puede completar con un cliente inactivo (aviso para elegir otro).
- Una foto de 48 MP o una panorámica muy alargada: se redimensiona respetando la proporción (lado mayor ≤ 1920 px).
- Foto girada por los metadatos de orientación: se guarda derecha.
- Dos pestañas o ventanas abiertas editando el mismo borrador: gana la última escritura y la otra vista se actualiza en vivo.
- Fecha y hora del dispositivo incorrectas: la fecha de recepción por defecto puede ser errónea. El técnico puede corregirla (validación ≤ hoy según el reloj del dispositivo).

## 4. Requisitos funcionales

| ID        | El sistema debe…                                                                                                                                                                        | Traza           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| FR-003-01 | Crear un servicio en estado **Borrador** con un identificador único generado en el dispositivo, la fecha de hoy y el usuario y dispositivo que capturan                                 | [RF-03]         |
| FR-003-02 | Guardar automáticamente cada cambio del formulario en el dispositivo en < 1 s, sin acción del usuario, e indicar "Guardado en el dispositivo"                                           | [RF-03, RNF-01] |
| FR-003-03 | Pedir: tipo de equipo (Batería/Cargador), fecha de recepción, cliente, número de solicitud, marca, referencia y serie, con las reglas de `docs/03` §2.2                                 | [RF-06]         |
| FR-003-04 | Ofrecer el cliente solo desde el catálogo local de clientes activos, con búsqueda por texto parcial                                                                                     | [RF-06]         |
| FR-003-05 | Normalizar marca, referencia y serie (mayúsculas y recorte de espacios; sin espacios internos en referencia y serie)                                                                    | [RF-06]         |
| FR-003-06 | Advertir sin bloquear cuando exista otro servicio abierto con la misma serie                                                                                                            | [RF-06]         |
| FR-003-07 | Permitir agregar fotos de ingreso desde la cámara, la galería o los archivos y, en escritorio, la webcam                                                                                | [RF-04]         |
| FR-003-08 | Optimizar cada foto (lado mayor ≤ 1920 px, JPEG, calidad configurable), corregir la orientación, eliminar los metadatos de ubicación, generar una miniatura y evitar duplicados exactos | [RF-04, RNF-05] |
| FR-003-09 | Aplicar los límites mínimo y máximo de fotos de ingreso según la configuración (por defecto 1–5)                                                                                        | [RF-04]         |
| FR-003-10 | Pasar el servicio a **Recibido** solo cuando se cumplan los requisitos de la transición, mostrando la lista de lo que falta                                                             | [RF-07]         |
| FR-003-11 | Marcar el servicio Recibido como **pendiente de sincronizar**                                                                                                                           | [RF-10]         |
| FR-003-12 | Generar el código legible `{BAT\|CAR}-{solicitud}-{serie}` y recalcularlo si cambian esos campos                                                                                        | [RF-03]         |
| FR-003-13 | Listar los servicios locales con búsqueda, filtros por estado, tipo, cliente y "pendientes", y una marca de estado de sincronización                                                    | [RF-13]         |
| FR-003-14 | Mostrar el detalle del servicio con la línea de tiempo de etapas                                                                                                                        | [RF-13]         |
| FR-003-15 | Permitir descartar **solo** borradores, con confirmación, eliminando también sus fotos                                                                                                  | [RF-03]         |
| FR-003-16 | Avisar al llegar al 80 % de la cuota de almacenamiento y bloquear nuevas capturas al 95 %                                                                                               | [RNF-07]        |
| FR-003-17 | Funcionar completo sin conexión                                                                                                                                                         | [RNF-03]        |

## 5. Entidades clave

- **Servicio**: un equipo recibido bajo una solicitud. Atributos de esta spec: identificador, código, tipo de equipo, estado, fecha de recepción, cliente, número de solicitud, marca, referencia, serie, quién y cuándo lo capturó, estado de sincronización.
- **Adjunto (foto de ingreso)**: imagen optimizada + miniatura, asociada a un servicio y a la etapa de recepción, con huella para detectar duplicados y estado de sincronización.
- **Cliente** (catálogo, solo lectura): nombre y si está activo.
- **Marca** (catálogo, sugerencias): nombre.

## 6. Criterios de éxito

- **CE-003-01**: un técnico completa una recepción con 3 fotos en ≤ 3 min (PRD O4).
- **CE-003-02**: el 100 % de los servicios recibidos tiene un cliente del catálogo (PRD O2).
- **CE-003-03**: 0 registros o fotos perdidos tras cerrar la app, reiniciar el dispositivo o quedarse sin batería después de ver "Guardado" (RNF-01).
- **CE-003-04**: una foto de 12 MP queda guardada en ≤ 2 s en gama media y pesa < 1 MB (RNF-05).
- **CE-003-05**: la búsqueda responde en < 200 ms con 500 servicios locales.

## 7. Fuera de alcance

- Sincronizar con SharePoint (spec 005).
- Etapas posteriores a la recepción (spec 007).
- Crear o editar clientes desde la app.
- Lectura de código de barras o QR de la serie (backlog).
- Fotos de salida y PDFs (los componentes de adjuntos se construyen aquí de forma reutilizable, pero su uso está en la spec 007).

## 8. Aclaraciones

| Fecha      | Pregunta                                                                                                                                          | Respuesta                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 2026-10-22 | [NECESITA ACLARACIÓN: ¿el número de solicitud es único por servicio? — por defecto: no único; advertencia si se repite serie + solicitud (PA-07)] | No único; se advierte si se repite serie + solicitud (PA-07). |
| 2026-10-22 | [NECESITA ACLARACIÓN: ¿la marca es una lista cerrada? — por defecto: texto libre con sugerencias (PA-08)]                                         | Texto libre con sugerencias del catálogo de marcas (PA-08).   |
| 2026-10-22 | [NECESITA ACLARACIÓN: ¿límite de fotos de ingreso? — por defecto: 1–10 (PA-09)]                                                                   | Entre 1 y 5 fotos por servicio.                               |
| 2026-10-22 | [NECESITA ACLARACIÓN: ¿baterías y cargadores tienen campos distintos? — por defecto: los mismos (PA-12)]                                          | Los mismos campos de recepción para ambos tipos (PA-12).      |
| 2026-10-22 | ¿`DateChip` y el filtro de rango usan el calendario de la referencia 08 o el `input type="date"` nativo?                                          | Input nativo con `max=hoy`; cumple ES-003-10 y accesibilidad. |
| 2026-10-22 | ¿Se versionan fixtures binarios de imágenes (12 MP, EXIF, HEIC) para las pruebas?                                                                 | No; los E2E generan las imágenes en runtime.                  |

> Cierre 2026-10-22: código y pruebas completos. T047 (verificación en Android instalada y modo avión) y T048 (mediciones CE-003-04/05) quedan como verificación manual pendiente, aceptada por el usuario.
