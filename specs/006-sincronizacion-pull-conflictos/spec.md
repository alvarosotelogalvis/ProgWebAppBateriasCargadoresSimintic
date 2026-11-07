# Spec 006 — Sincronización: descarga y conflictos (pull)

- **Estado**: Aprobada
- **Fecha**: 2026-10-21 · **Rama**: `feature/006-sincronizacion-pull-conflictos`
- **Fase**: F6 (`docs/07`) · **Depende de**: 005 (sincronización push), 002 (merge a 3 vías como función pura)
- **Fuentes**: PRD [HU-10, HU-11; RF-11, RF-12, RF-28; RNF-01, RNF-03] · ADR [0009, 0010, 0011] · Modelo de datos [§2, §3, §6.1–§6.3, §8]

## 1. Resumen

Después de subir sus cambios, cada dispositivo **descarga** lo que otros usuarios crearon o modificaron en SharePoint, para que el técnico y el comercial trabajen sobre el mismo servicio en etapas distintas, incluso luego sin conexión. Si dos personas cambiaron **el mismo dato**, el usuario decide cuál conservar; todo lo demás se combina solo.

## 2. Historias de usuario

### HU-006-1 — Ver servicios de otros dispositivos (Prioridad P1) 🎯

Como **usuario** quiero que, al sincronizar, aparezcan en mi dispositivo los servicios registrados por mis compañeros, para continuar su siguiente etapa aunque luego no tenga señal.
**Por qué P1**: el ciclo del Excel lo completan personas distintas; sin descarga, cada dispositivo es una isla.
**Prueba independiente**: el dispositivo A sube un servicio; el dispositivo B sincroniza, pasa a modo avión y abre el servicio con sus datos.

**Escenarios de aceptación**

- **ES-006-01** — **Dado** que otro usuario creó un servicio que está abierto, **cuando** sincronizo, **entonces** aparece en mi lista marcado como "Sincronizado", con todos sus datos y disponible sin conexión.
- **ES-006-02** — **Dado** un servicio cerrado hace menos de los meses de retención (por defecto 3), **cuando** sincronizo por primera vez, **entonces** también se descarga. Los cerrados más antiguos no se descargan.
- **ES-006-03** — **Dado** un servicio que tengo sin cambios locales, **cuando** otro usuario lo modifica en SharePoint y yo sincronizo, **entonces** mi copia se actualiza con los valores nuevos.
- **ES-006-04** — **Dado** que ya sincronicé antes, **cuando** vuelvo a sincronizar, **entonces** solo se descargan los cambios ocurridos desde la última vez, no todo de nuevo.
- **ES-006-05** — **Dado** que un administrador agregó un cliente, desactivó una marca o cambió una opción de diagnóstico o un valor de configuración, **cuando** sincronizo, **entonces** el cambio se refleja en los formularios.

### HU-006-2 — Combinar cambios y resolver conflictos (Prioridad P1)

Como **usuario** quiero que mis cambios hechos sin conexión no pisen ni sean pisados en silencio por los de otra persona.
**Prueba independiente**: B diagnostica sin conexión mientras A cambia la observación en SharePoint; al sincronizar B, solo la observación queda en conflicto y el resto se combina.

- **ES-006-06** — **Dado** que modifiqué el diagnóstico sin conexión y otra persona modificó la fecha de entrega en SharePoint, **cuando** sincronizo, **entonces** ambos cambios quedan en SharePoint y en mi dispositivo sin pedirme nada.
- **ES-006-07** — **Dado** que modifiqué la observación técnica sin conexión y otra persona también la modificó en SharePoint con un valor distinto, **cuando** sincronizo, **entonces** el servicio queda "En conflicto", con un aviso en el detalle y en Sincronización, y no se sube ese campo.
- **ES-006-08** — **Dado** un servicio en conflicto, **cuando** abro "Resolver", **entonces** veo cada campo en conflicto con "Mi valor" y "Valor en SharePoint" (con quién y cuándo, si se conoce) y elijo uno por campo.
- **ES-006-09** — **Dado** que resolví todos los campos, **cuando** pulso "Aplicar y sincronizar", **entonces** el servicio vuelve a pendiente, se sube con lo elegido y queda "Sincronizado".
- **ES-006-10** — **Dado** que ambos pusimos **el mismo** valor en el mismo campo, **cuando** sincronizo, **entonces** no hay conflicto.
- **ES-006-11** — **Dado** que yo avancé el estado del servicio y otra persona también lo cambió, **cuando** sincronizo, **entonces** se conserva el estado más avanzado del flujo. Si eso resulta incoherente con los datos, se marca como conflicto.
- **ES-006-12** — **Dado** un servicio en conflicto sin resolver, **cuando** sigo trabajando sin conexión, **entonces** puedo consultarlo, y la siguiente sincronización no lo sobrescribe ni lo pierde.

### HU-006-3 — Ver fotos y documentos de otros (Prioridad P2)

Como **usuario** quiero ver las fotos y PDFs que otros adjuntaron a un servicio, para entender su estado.

- **ES-006-13** — **Dado** un servicio abierto descargado con fotos remotas, **cuando** se sincroniza y la descarga de miniaturas está activada, **entonces** sus miniaturas quedan disponibles sin conexión (hasta 50 por sincronización).
- **ES-006-14** — **Dado** que abro el detalle con conexión, **cuando** el servicio tiene adjuntos remotos, **entonces** veo la lista de adjuntos (tipo, nombre, tamaño) con miniatura o ícono.
- **ES-006-15** — **Dado** un adjunto remoto, **cuando** pulso "Abrir en SharePoint" con conexión, **entonces** se abre el original. Sin conexión, el botón está deshabilitado con una explicación.

## 3. Casos borde

- Un servicio se eliminó en SharePoint (no debería ocurrir; se anulan): si mi copia está sincronizada, se elimina localmente; si tengo cambios pendientes, se marca como conflicto y no se pierde.
- El enlace de cambios incrementales caducó o es inválido: se hace una descarga completa una vez y se continúa en modo incremental.
- Un servicio remoto trae un valor de estado u opción desconocido: se guarda y se muestra en solo lectura como "Estado desconocido", con un registro en el log.
- Un servicio remoto llega sin identificador de servicio (creado a mano en SharePoint): se ignora y se registra una advertencia.
- La descarga se corta a la mitad: lo descargado queda guardado y la siguiente sincronización continúa desde el último punto confirmado.
- La cuota de almacenamiento está casi llena: no se descargan miniaturas, pero sí los datos.
- Un servicio descargado queda cerrado y supera la retención: lo elimina la purga (spec 009), solo si está sincronizado.

## 4. Requisitos funcionales

| ID        | El sistema debe…                                                                                                                                                                                                | Traza    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-006-01 | Descargar después del push los servicios creados o modificados en SharePoint desde la última sincronización                                                                                                     | [RF-11]  |
| FR-006-02 | En la primera sincronización, descargar los servicios abiertos y los cerrados dentro de la retención configurada                                                                                                | [RF-11]  |
| FR-006-03 | Insertar como "Sincronizado" los servicios remotos que no existen en el dispositivo, identificándolos por su identificador de servicio                                                                          | [RF-11]  |
| FR-006-04 | Sobrescribir con los valores remotos los servicios locales sin cambios pendientes                                                                                                                               | [RF-11]  |
| FR-006-05 | Combinar por campo los servicios con cambios pendientes: conservar el valor local si el remoto no cambió; tomar el remoto si el local no cambió; marcar conflicto solo si ambos cambiaron con valores distintos | [RF-12]  |
| FR-006-06 | Aplicar la regla de "estado más avanzado" cuando ambos cambiaron el estado, marcando conflicto si el resultado es incoherente                                                                                   | [RF-12]  |
| FR-006-07 | Resolver los conflictos detectados durante el push (cambio remoto concurrente) con la misma combinación por campo y reintentar la subida una vez si no hay choque                                               | [RF-12]  |
| FR-006-08 | Mostrar los servicios en conflicto en el detalle y en Sincronización, y ofrecer una pantalla para elegir el valor por campo                                                                                     | [RF-12]  |
| FR-006-09 | Tras resolver, dejar el servicio pendiente con los valores elegidos y subirlo en la siguiente sincronización                                                                                                    | [RF-12]  |
| FR-006-10 | Guardar el punto de continuación de la descarga incremental y recuperarse si caduca                                                                                                                             | [RF-11]  |
| FR-006-11 | Refrescar catálogos (clientes, marcas, opciones) y configuración remota en cada sincronización; si falla, seguir con lo guardado                                                                                | [RF-11]  |
| FR-006-12 | Descargar miniaturas de adjuntos remotos de servicios abiertos, hasta 50 por sincronización, si la configuración lo permite y hay espacio                                                                       | [RF-28]  |
| FR-006-13 | Listar los adjuntos remotos de un servicio al abrir su detalle con conexión y ofrecer abrir el original en SharePoint                                                                                           | [RF-28]  |
| FR-006-14 | Nunca perder un cambio local pendiente durante la descarga                                                                                                                                                      | [RNF-01] |

## 5. Entidades clave

- **Servicio remoto**: los campos de negocio, su versión y fecha de modificación en SharePoint, quién lo modificó.
- **Valores de referencia**: los valores del servidor en la última sincronización, base de la combinación por campo.
- **Conflicto**: campo, mi valor, valor remoto.
- **Adjunto remoto**: tipo, nombre, tamaño, enlace, miniatura opcional; sin original local.
- **Punto de continuación**: marca que permite pedir solo los cambios nuevos.

## 6. Criterios de éxito

- **CE-006-01**: el 100 % de los servicios abiertos de otros usuarios está disponible sin conexión después de una sincronización.
- **CE-006-02**: 0 cambios perdidos en los escenarios de combinación probados (tabla completa de casos).
- **CE-006-03**: solo los campos realmente en choque piden decisión al usuario (0 conflictos falsos en la suite de pruebas).
- **CE-006-04**: una sincronización incremental sin cambios remotos termina en < 5 s.

## 7. Fuera de alcance

- Descargar automáticamente los originales de fotos y PDFs remotos.
- Historial de versiones o auditoría en la app (se consulta en SharePoint).
- Edición de catálogos.
- Purga de servicios cerrados (spec 009).

## 8. Aclaraciones

| Fecha      | Pregunta                                                                                                                                 | Respuesta                                                                                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-06 | ¿6 meses de retención local de servicios cerrados es suficiente? — por defecto: 6 (`RetencionCerradosMeses`)                             | **3 meses.** Se cambia el valor por defecto a `3` en el Modelo de datos §6.3 y en `CONFIG_DEFECTO`; sigue siendo configurable en `ConfiguracionApp`. Aplica también a la purga (spec 009, ES-009-08). |
| 2026-11-06 | ¿Descargar miniaturas de otros por defecto? (consume datos y espacio) — por defecto: sí, máx. 50 por sync (`DescargarMiniaturasRemotas`) | **Sí, máximo 50 por sincronización** (valor por defecto, sin cambios).                                                                                                                                |
| 2026-11-06 | Spike S4 (delta de listas con `fields`)                                                                                                  | Pendiente: requiere el tenant DEV real. Mientras tanto se implementa con el emulador y el respaldo por `Modified` ya diseñado (plan §3, SDD §9.4).                                                    |
