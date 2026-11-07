# Spec 009 — Soporte técnico, respaldo y purgas

- **Estado**: Borrador
- **Fecha**: 2026-10-21 · **Rama**: `feature/009-soporte-respaldo-purgas`
- **Fase**: F9 (`docs/07`) · **Depende de**: 006 (sincronización completa), 004 (roles)
- **Fuentes**: PRD [HU-13; RF-17, RF-18, RF-19, RF-27; RNF-01, RNF-07, RNF-15] · ADR [0008, 0017, 0018] · Modelo de datos [§6.3 (retenciones), §8] · UX [§4, §5]

## 1. Resumen

Da a usuarios y soporte las herramientas para diagnosticar problemas, **proteger los datos no sincronizados** con un respaldo manual y mantener el espacio del dispositivo bajo control. La limpieza automática nunca toca nada pendiente de subir.

## 2. Historias de usuario

### HU-009-1 — Respaldo manual de lo pendiente (Prioridad P1) 🎯

Como **técnico** quiero exportar en un archivo los registros que no he podido sincronizar, para enviarlos o guardarlos si la sincronización falla o voy a cambiar de dispositivo.
**Por qué P1**: es la última línea de defensa contra la pérdida de datos en dispositivos no administrados (iOS, R-01 y R-06 del PRD).
**Prueba independiente**: con 2 servicios pendientes con fotos, exportar el respaldo y comprobar que el archivo contiene sus datos y fotos.

**Escenarios de aceptación**

- **ES-009-01** — **Dado** servicios pendientes con fotos y PDFs, **cuando** el usuario elige "Exportar respaldo" → "Solo pendientes", **entonces** se genera un archivo comprimido con los datos de esos servicios, sus archivos y el registro de eventos, y el tamaño estimado se muestra antes.
- **ES-009-02** — **Dado** un dispositivo que permite compartir archivos, **cuando** el respaldo está listo, **entonces** se ofrece "Compartir" (correo, OneDrive, WhatsApp…). Si no lo permite, se ofrece "Descargar".
- **ES-009-03** — **Dado** que se elige "Todos", **cuando** se exporta, **entonces** el respaldo incluye también los servicios sincronizados guardados en el dispositivo (los archivos que ya se liberaron no se incluyen y se indica).
- **ES-009-04** — **Dado** un respaldo generado en el dispositivo A, **cuando** un administrador lo importa en el dispositivo B, **entonces** los servicios quedan como pendientes en B, se omiten los que B ya tiene y se muestra un resumen (importados, omitidos).
- **ES-009-05** — **Dado** un archivo que no es un respaldo válido o de una versión incompatible, **cuando** se intenta importar, **entonces** se rechaza con un mensaje claro y no se modifica nada.
- **ES-009-06** — **Dado** un usuario sin rol Administrador, **cuando** abre el menú técnico, **entonces** no ve "Importar respaldo".

### HU-009-2 — Limpieza segura del espacio (Prioridad P1)

Como **técnico** quiero que la app libere espacio sola con lo ya subido, para no llenar el teléfono, con la certeza de que nunca borra lo pendiente.

- **ES-009-07** — **Dado** fotos sincronizadas hace más de los días configurados (por defecto 7), **cuando** termina una sincronización exitosa, **entonces** se libera su archivo original y se conserva la miniatura.
- **ES-009-08** — **Dado** servicios cerrados y sincronizados cuya última modificación supera la retención (por defecto 3 meses), **cuando** termina una sincronización exitosa, **entonces** se eliminan del dispositivo con sus archivos (siguen en SharePoint).
- **ES-009-09** — **Dado** un servicio o un archivo con cambios pendientes, en error o en conflicto, **cuando** se ejecuta cualquier limpieza, **entonces** **no** se elimina nada de él.
- **ES-009-10** — **Dado** que el usuario elige "Liberar espacio", **cuando** confirma, **entonces** se ejecuta la misma limpieza segura de inmediato y se informa cuánto se liberó.
- **ES-009-11** — **Dado** que la sincronización terminó con errores o fue cancelada, **cuando** finaliza, **entonces** no se ejecuta la limpieza automática.

### HU-009-3 — Diagnóstico para soporte (Prioridad P2)

Como **soporte** quiero ver el estado del dispositivo, de la conexión con SharePoint y el registro de eventos, para resolver problemas sin acceso físico al equipo.

- **ES-009-12** — **Dado** el menú técnico, **cuando** se abre "Estado del dispositivo", **entonces** se ven la plataforma, el navegador, si está instalada, si el almacenamiento es persistente, el uso y la cuota, el identificador del dispositivo y la versión de la base local.
- **ES-009-13** — **Dado** el menú técnico, **cuando** se abre "Estado de SharePoint", **entonces** se ven la dirección del sitio, los identificadores de listas y biblioteca, la última sincronización, el método de descarga y el identificador de correlación de la última ejecución (copiable).
- **ES-009-14** — **Dado** el visor de registros, **cuando** se filtra por nivel "Error" y se busca un texto, **entonces** se ven solo los eventos que coinciden, del más reciente al más antiguo, y se pueden copiar o exportar.
- **ES-009-15** — **Dado** que se exportan los registros, **cuando** se revisa el archivo, **entonces** no contiene tokens, contraseñas ni contenido de archivos.

### HU-009-4 — Acciones de mantenimiento (Prioridad P2)

- **ES-009-16** — **Dado** servicios con error que ya no se reintentan solos, **cuando** se pulsa "Reintentar errores", **entonces** quedan listos para la siguiente sincronización.
- **ES-009-17** — **Dado** que hay conexión, **cuando** se pulsa "Refrescar catálogos", **entonces** se actualizan clientes, marcas, opciones y configuración. Sin conexión, el botón está deshabilitado.
- **ES-009-18** — **Dado** que se pulsa "Buscar actualización", **cuando** hay una versión nueva, **entonces** aparece el aviso de nueva versión; si no, "Tienes la última versión".
- **ES-009-19** — **Dado** un administrador sin pendientes, **cuando** elige "Restablecer la app" y confirma, **entonces** se borran los datos locales y la app vuelve a la configuración inicial.
- **ES-009-20** — **Dado** un administrador con pendientes, **cuando** elige "Restablecer la app", **entonces** se le exige primero exportar el respaldo y luego escribir "BORRAR" para confirmar. Sin ambas cosas, no se borra nada.
- **ES-009-21** — **Dado** un usuario sin rol Administrador, **cuando** abre el menú técnico, **entonces** no ve "Restablecer la app".

## 3. Casos borde

- Respaldo muy grande (cientos de MB): se avisa el tamaño antes; si el dispositivo no tiene memoria suficiente para generarlo, se informa y se sugiere "Solo pendientes".
- Importar un respaldo con un servicio que en B existe con cambios pendientes: se omite (no se sobrescriben datos locales) y aparece en "omitidos".
- Importar un respaldo con servicios ya sincronizados en SharePoint desde A: quedan pendientes en B; la sincronización los reconoce por su identificador y no duplica (idempotencia de la spec 005).
- La app se cierra durante la limpieza: lo que alcanzó a liberarse queda liberado; lo demás se reintenta en la siguiente ejecución, sin inconsistencias.
- El registro de eventos llega al límite (2000 entradas): se descartan los más antiguos.
- Compartir cancelado por el usuario: no es un error; se ofrece "Descargar".

## 4. Requisitos funcionales

| ID        | El sistema debe…                                                                                                                                                       | Traza           |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| FR-009-01 | Ofrecer un menú técnico con estado del dispositivo, estado de SharePoint, registros y acciones de mantenimiento, con las acciones destructivas solo para Administrador | [RF-17]         |
| FR-009-02 | Mostrar plataforma, instalación, persistencia, uso/cuota, identificador del dispositivo y versión de la base local                                                     | [RF-17]         |
| FR-009-03 | Mostrar sitio, identificadores remotos, última sincronización, método de descarga y correlación de la última ejecución                                                 | [RF-17, RNF-15] |
| FR-009-04 | Mostrar, filtrar, copiar y exportar el registro de eventos, sin datos sensibles                                                                                        | [RF-17, RNF-15] |
| FR-009-05 | Exportar un respaldo comprimido (solo pendientes o todos) con datos, archivos y registros, y permitir compartirlo o descargarlo                                        | [RF-18]         |
| FR-009-06 | Importar un respaldo válido (solo Administrador), dejando los servicios como pendientes y omitiendo los existentes                                                     | [RF-19]         |
| FR-009-07 | Validar el formato y la versión del respaldo antes de importar, sin efectos si es inválido                                                                             | [RF-19]         |
| FR-009-08 | Liberar los originales de archivos sincronizados hace más de los días configurados, conservando la miniatura                                                           | [RF-27, RNF-07] |
| FR-009-09 | Eliminar del dispositivo los servicios cerrados y sincronizados que superan la retención configurada                                                                   | [RF-27]         |
| FR-009-10 | Ejecutar la limpieza solo después de una sincronización exitosa, y bajo demanda con "Liberar espacio"                                                                  | [RF-27]         |
| FR-009-11 | Garantizar que ninguna limpieza, importación ni restablecimiento elimine datos no sincronizados sin respaldo y confirmación explícita                                  | [RNF-01]        |
| FR-009-12 | Permitir reintentar todos los errores, refrescar catálogos y buscar actualizaciones                                                                                    | [RF-17]         |
| FR-009-13 | Permitir restablecer la app (solo Administrador) con las salvaguardas de respaldo y confirmación escrita cuando hay pendientes                                         | [RF-17, RNF-01] |

## 5. Entidades clave

- **Respaldo**: versión de formato, versión de la app, dispositivo, fecha, servicios, adjuntos (archivos), registros.
- **Entrada de registro**: fecha, nivel, evento, mensaje, datos no sensibles, correlación.
- **Política de retención**: días para originales sincronizados, meses para servicios cerrados.

## 6. Criterios de éxito

- **CE-009-01**: 0 elementos no sincronizados eliminados en toda la suite de pruebas de limpieza, importación y restablecimiento (RNF-01).
- **CE-009-02**: un respaldo de 5 servicios con 30 fotos se genera en < 15 s en gama media.
- **CE-009-03**: tras la limpieza, el espacio usado por servicios sincronizados baja ≥ 70 % (fotos originales vs. miniaturas).
- **CE-009-04**: un respaldo exportado en A e importado en B produce, tras sincronizar B, los mismos ítems en SharePoint sin duplicados.

## 7. Fuera de alcance

- Envío automático de registros a un servicio externo (ADR-0017).
- Cifrado del respaldo (ADR-0018; revisar si se agregan datos sensibles).
- Restaurar desde SharePoint servicios purgados (se consultan en SharePoint; vuelven a descargarse si se modifican).

## 8. Aclaraciones

| Fecha | Pregunta                                                                                                                            | Respuesta |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- | --------- |
| —     | [NECESITA ACLARACIÓN: ¿7 días de retención de originales sincronizados es suficiente? — por defecto: 7 (`RetencionOriginalesDias`)] | —         |
| —     | [NECESITA ACLARACIÓN: ¿importar respaldos solo para Administrador? — por defecto: sí (UX §5)]                                       | —         |
