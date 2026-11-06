# Spec 005 — Sincronización: subida (push)

- **Estado**: En implementación
- **Fecha**: 2026-10-21 · **Rama**: `feature/005-sincronizacion-push`
- **Fase**: F5 (`docs/07`) · **Depende de**: 003 (recepción y adjuntos), 004 (autenticación y configuración inicial)
- **Fuentes**: PRD [HU-09; RF-09, RF-10, RF-16, RF-23, RF-24; RNF-01, RNF-02, RNF-11, RNF-15] · ADR [0006, 0009, 0010, 0011, 0017] · Modelo de datos [§2, §3.2, §6.3, §6.4]

## 1. Resumen

Cuando hay conexión, el usuario sube a SharePoint los servicios y archivos guardados en el dispositivo, **después de confirmar su identidad** con la cuenta del tenant. La subida es reanudable, nunca duplica registros ni archivos y nunca pierde lo local si falla. Cada ejecución deja constancia en una bitácora remota.

## 2. Historias de usuario

### HU-005-1 — Confirmar identidad y sincronizar (Prioridad P1) 🎯

Como **usuario** quiero ver qué se va a subir y con qué cuenta, y confirmarlo, para tener control sobre lo que se publica a nombre mío.
**Por qué P1**: sin subida, los datos nunca llegan a la fuente oficial. La confirmación es un requisito explícito del negocio.
**Prueba independiente**: con 2 servicios pendientes y conexión, pulsar "Sincronizar", confirmar y comprobar que ambos quedan "Sincronizado".

**Escenarios de aceptación**

- **ES-005-01** — **Dado** que hay 3 servicios y 11 archivos pendientes y hay conexión, **cuando** el usuario abre Sincronización, **entonces** ve "3 registros, 11 archivos (tamaño total)", la cuenta (nombre y correo) y el botón "Confirmar y sincronizar".
- **ES-005-02** — **Dado** que el último inicio de sesión interactivo fue hace menos de la ventana configurada (por defecto 12 h), **cuando** pulsa "Confirmar y sincronizar", **entonces** la sincronización empieza sin volver a pedir la contraseña.
- **ES-005-03** — **Dado** que la ventana venció (o el modo configurado es "reautenticar siempre"), **cuando** confirma, **entonces** se abre el inicio de sesión de Microsoft. Al volver a la app, la sincronización **continúa sola** sin que el usuario repita la confirmación.
- **ES-005-04** — **Dado** que el usuario pulsa "Usar otra cuenta" e inicia sesión con otra cuenta válida, **cuando** sincroniza, **entonces** los registros se suben con la nueva cuenta y conservan quién los capturó originalmente.
- **ES-005-05** — **Dado** que la cuenta con que se inicia sesión pertenece a otro tenant o no tiene un rol de la app, **cuando** vuelve del login, **entonces** no se sube nada y se muestra el mensaje de acceso denegado.
- **ES-005-06** — **Dado** que no hay conexión, **cuando** abre Sincronización, **entonces** el botón está deshabilitado y ve "Sin conexión. Tus datos están seguros en este dispositivo".

### HU-005-2 — Subida confiable y sin duplicados (Prioridad P1)

Como **coordinador** quiero que cada servicio y cada foto aparezcan **una sola vez** en SharePoint aunque la red falle, para confiar en los datos.
**Prueba independiente**: cortar la red a mitad de la subida, reintentar y verificar en SharePoint 1 ítem por servicio y 1 archivo por adjunto.

- **ES-005-07** — **Dado** un servicio Recibido con 3 fotos, **cuando** se sincroniza con éxito, **entonces** en SharePoint existe un ítem con todos sus datos, una carpeta del servicio con las 3 fotos y sus metadatos (servicio, tipo de adjunto, fecha de captura), y el servicio queda "Sincronizado".
- **ES-005-08** — **Dado** que la conexión se corta durante la subida de la segunda foto, **cuando** vuelve la red y se sincroniza otra vez, **entonces** el proceso continúa donde quedó y el resultado final es idéntico al de una subida sin cortes (sin duplicados).
- **ES-005-09** — **Dado** que el servicio ya se había creado en SharePoint pero el dispositivo no recibió la confirmación, **cuando** se reintenta, **entonces** el sistema reconoce el ítem existente y no crea otro.
- **ES-005-10** — **Dado** un archivo grande (PDF de más de 4 MB), **cuando** la subida se interrumpe, **entonces** al reintentar se reanuda desde la parte ya enviada, incluso si la app se cerró en medio.
- **ES-005-11** — **Dado** un servicio ya sincronizado al que luego se le editó un campo, **cuando** se sincroniza, **entonces** en SharePoint solo cambia ese campo y queda una nueva versión del ítem.
- **ES-005-12** — **Dado** que un adjunto sincronizado se eliminó en la app (en la etapa actual), **cuando** se sincroniza, **entonces** el archivo se elimina en SharePoint.
- **ES-005-13** — **Dado** que alguien modificó en SharePoint el mismo servicio desde la última sincronización, **cuando** el dispositivo intenta subir sus cambios, **entonces** no sobrescribe a ciegas: el servicio se entrega al proceso de conflictos (spec 006) y el resto de servicios sigue subiéndose.

### HU-005-3 — Progreso, errores comprensibles y reintentos (Prioridad P1)

Como **usuario** quiero ver el avance y entender qué falló, para saber si debo hacer algo.

- **ES-005-14** — **Dado** una sincronización en curso, **cuando** observa la pantalla, **entonces** ve cada servicio con su estado (en cola, subiendo foto 3 de 5 con barra, listo, con error).
- **ES-005-15** — **Dado** una sincronización en curso, **cuando** pulsa "Cancelar", **entonces** se detiene de forma ordenada; lo ya subido queda sincronizado y el resto sigue pendiente.
- **ES-005-16** — **Dado** que SharePoint responde "demasiadas solicitudes" o un error temporal, **cuando** ocurre, **entonces** el sistema espera y reintenta solo, sin que el usuario intervenga.
- **ES-005-17** — **Dado** que la cuenta no tiene permiso en el sitio, **cuando** se intenta subir, **entonces** el servicio queda "Con error" con el mensaje "Tu cuenta no tiene permiso en el sitio de SharePoint" y un botón "Reintentar".
- **ES-005-18** — **Dado** un servicio que falló 8 veces seguidas por errores temporales, **cuando** llega la siguiente sincronización, **entonces** ya no se reintenta solo y espera a que el usuario pulse "Reintentar".
- **ES-005-19** — **Dado** que termina la sincronización, **cuando** finaliza, **entonces** se muestra un resumen: subidos, con error, en conflicto.
- **ES-005-20** — **Dado** dos ventanas de la app abiertas, **cuando** ambas intentan sincronizar al mismo tiempo, **entonces** solo una ejecuta la sincronización y la otra informa que ya hay una en curso.

### HU-005-4 — Recordatorios y aviso de conexión (Prioridad P2)

- **ES-005-21** — **Dado** que la app está abierta sin conexión con pendientes y una sesión vigente, **cuando** vuelve la conexión, **entonces** aparece un aviso "Tienes N pendientes. ¿Sincronizar ahora?". Nunca sincroniza sin el toque del usuario.
- **ES-005-22** — **Dado** pendientes con más de 24 h (configurable), **cuando** abre Inicio, **entonces** ve un recordatorio destacado con la antigüedad y el botón Sincronizar.
- **ES-005-23** — **Dado** que la barra superior está visible, **cuando** hay pendientes, **entonces** muestra el indicador de conexión y el contador de pendientes, que abre Sincronización.

### HU-005-5 — Versión mínima y bitácora (Prioridad P2)

- **ES-005-24** — **Dado** que la configuración remota exige una versión mínima mayor que la instalada, **cuando** el usuario intenta sincronizar, **entonces** se bloquea con "Actualiza la app para sincronizar" y un botón que busca la actualización. La captura sigue disponible.
- **ES-005-25** — **Dado** cualquier sincronización terminada (con éxito o error), **cuando** finaliza, **entonces** queda un registro en la bitácora de SharePoint con usuario, dispositivo, versión, inicio, fin, resultado y totales. Si ese registro falla, la sincronización no se considera fallida.

## 3. Casos borde

- El token vence a mitad de la sincronización: se intenta renovar en silencio una vez. Si no se puede, se detiene y pide iniciar sesión, sin marcar los servicios como error.
- El usuario cierra la app durante el redirect del login: la intención de sincronizar se descarta al abrir de nuevo, sin efectos.
- Un servicio se edita localmente **mientras** se está subiendo: los cambios nuevos no se pierden; el servicio queda pendiente otra vez al terminar.
- La sesión de subida de un archivo grande expiró (días después): se crea una nueva y se sube desde el inicio.
- Un adjunto pendiente pertenece a un servicio en Borrador: no se sube (los borradores nunca se suben).
- El sitio o una lista no existe (configuración errónea): se detiene la sincronización completa con un mensaje para soporte.
- Un cliente del servicio fue eliminado del catálogo remoto: SharePoint rechaza el valor → el servicio queda con error explicativo.
- Reloj del dispositivo desfasado: las fechas de captura reflejan el reloj local; la ventana de reautenticación se calcula con la hora del token cuando sea posible.

## 4. Requisitos funcionales

| ID        | El sistema debe…                                                                                                                                        | Traza           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| FR-005-01 | Mostrar antes de sincronizar el número de servicios y archivos pendientes, su tamaño y la cuenta con que se subirán, y exigir la confirmación explícita | [RF-09]         |
| FR-005-02 | Obtener una sesión válida: silenciosa dentro de la ventana configurable o interactiva fuera de ella o en modo "reautenticar siempre"                    | [RF-09]         |
| FR-005-03 | Retomar automáticamente la sincronización confirmada después de volver del inicio de sesión interactivo                                                 | [RF-09]         |
| FR-005-04 | Permitir cambiar de cuenta sin perder pendientes, conservando quién capturó cada registro                                                               | [RF-09, RF-29]  |
| FR-005-05 | Validar el tenant y el rol de la cuenta antes de cualquier escritura remota                                                                             | [RF-09]         |
| FR-005-06 | Subir solo servicios no-borrador con cambios pendientes, en orden de modificación                                                                       | [RF-10]         |
| FR-005-07 | Garantizar un único ítem remoto por servicio (identificador único generado en el dispositivo, búsqueda antes de crear)                                  | [RF-10, RNF-02] |
| FR-005-08 | Subir los adjuntos pendientes a la carpeta del servicio con nombre determinista y reemplazo, y registrar sus metadatos                                  | [RF-10]         |
| FR-005-09 | Reanudar la subida de archivos grandes desde la última parte confirmada, incluso tras cerrar la app                                                     | [RF-10]         |
| FR-005-10 | Enviar solo los campos modificados de un servicio existente, con control de concurrencia contra cambios remotos                                         | [RF-10]         |
| FR-005-11 | Eliminar en SharePoint los adjuntos marcados para borrado                                                                                               | [RF-10]         |
| FR-005-12 | Ante un cambio remoto concurrente, delegar el servicio al proceso de conflictos sin detener los demás                                                   | [RF-10, RF-12]  |
| FR-005-13 | Clasificar los errores (red, autenticación, permisos, configuración, conflicto, temporal, no reintentable) y actuar según la tabla del diseño           | [RF-10]         |
| FR-005-14 | Reintentar errores temporales con espera creciente, respetando la espera indicada por el servidor, y dejar de reintentar solo tras 8 fallos             | [RF-10]         |
| FR-005-15 | Ejecutar una sola sincronización a la vez en el dispositivo, aun con varias ventanas                                                                    | [RF-10]         |
| FR-005-16 | Mostrar el progreso por servicio y por archivo, permitir cancelar y mostrar un resumen final                                                            | [RF-16]         |
| FR-005-17 | Avisar al recuperar la conexión con pendientes y sesión vigente, sin sincronizar automáticamente                                                        | [RF-16]         |
| FR-005-18 | Recordar en Inicio los pendientes con antigüedad mayor a la configurada (24 h)                                                                          | [RF-16]         |
| FR-005-19 | Bloquear la sincronización si la versión instalada es menor que la versión mínima remota                                                                | [RF-23]         |
| FR-005-20 | Registrar cada ejecución en la bitácora remota sin que su fallo afecte el resultado                                                                     | [RF-24, RNF-15] |
| FR-005-21 | Registrar en cada servicio subido la versión de la app, el dispositivo y la fecha de última edición local                                               | [RNF-11]        |
| FR-005-22 | No perder ningún cambio local ante cancelación, cierre, error o cambio de cuenta                                                                        | [RNF-01]        |

## 5. Entidades clave

- **Servicio (estado de sincronización)**: campos modificados pendientes, valores remotos de referencia, datos del ítem remoto (identificador, versión), intentos, próximo intento, último error.
- **Adjunto (estado de sincronización)**: datos del archivo remoto, marca de borrado remoto, avance de la subida reanudable.
- **Ejecución de sincronización**: identificador de correlación, usuario, dispositivo, versión, inicio, fin, resultado, totales, errores resumidos.
- **Sesión del usuario**: cuenta, roles, último inicio de sesión interactivo.

## 6. Criterios de éxito

- **CE-005-01**: 0 duplicados en SharePoint tras 20 sincronizaciones interrumpidas al azar (RNF-02).
- **CE-005-02**: ≥ 98 % de ejecuciones sin error en el piloto (PRD O6).
- **CE-005-03**: 3 servicios con 10 fotos en total se suben en < 60 s con 4G.
- **CE-005-04**: el 100 % de las ejecuciones aparece en la bitácora remota cuando hay red al finalizar.
- **CE-005-05**: 0 datos locales perdidos en cualquier escenario de fallo probado (RNF-01).

## 7. Fuera de alcance

- Descargar cambios remotos y resolver conflictos (spec 006).
- Sincronización en segundo plano sin la app abierta.
- Purgas posteriores al sync (spec 009).
- Correos y alertas (spec 008).

## 8. Aclaraciones

| Fecha      | Pregunta                                                                                                                                                                               | Respuesta                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 2026-10-24 | ¿la ventana de confirmación sin contraseña de 12 h es aceptable o se exige login en cada sincronización? — por defecto: modo "confirmar" con 12 h, configurable remotamente (ADR-0006) | Se mantiene modo "confirmar" con 12 h, configurable remotamente (ADR-0006).                                     |
| 2026-10-24 | ¿roles de app requeridos? — por defecto: Tecnico, Comercial, Administrador (PA-06)                                                                                                     | Tecnico, Comercial, Administrador (PA-06).                                                                      |
| 2026-10-24 | ¿Cómo avanzar mientras el tenant real sigue pendiente?                                                                                                                                 | Implementar con `VITE_AUTH_MODE=mock` + emulador de Graph; verificación contra DEV real queda pendiente (T036). |
