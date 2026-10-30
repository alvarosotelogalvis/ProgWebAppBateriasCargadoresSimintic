# Spec 004 — Autenticación y configuración inicial

- **Estado**: En implementación
- **Fecha**: 2026-10-21 · **Rama**: `feature/004-autenticacion-configuracion-inicial`
- **Fase**: F4 (`docs/07`) · **Depende de**: 001 (shell, guards, sesión mock), 002 (persistencia de catálogos y metadatos). Tenant DEV configurado (`docs/06` §1–§2)
- **Fuentes**: PRD [HU-02; RF-02, RF-09 (solo login), RF-29 (parcial); RNF-10, RNF-14] · ADR [0006, 0007, 0009, 0018, 0020] · UX [§3.2, §4 "Mi cuenta"] · Modelo de datos [§6, §8]

## 1. Resumen

Un usuario nuevo prepara la app **una sola vez con conexión**:

- inicia sesión con su cuenta de la empresa;
- la app comprueba que tenga acceso;
- se descargan los catálogos (clientes, marcas, opciones) y la configuración;
- se reserva almacenamiento.

Desde ese momento puede trabajar **sin conexión** con su cuenta recordada. También puede ver su cuenta, cambiar de cuenta o cerrar sesión sin perder nada pendiente.

La confirmación de identidad **antes de sincronizar** no es parte de esta spec (es de la 005). Esta deja lista la capacidad de iniciar sesión y obtener acceso.

## 2. Historias de usuario

### HU-004-1 — Preparar la app la primera vez (Prioridad P1) 🎯

Como **usuario nuevo** quiero un asistente que me guíe a dejar la app lista para trabajar sin conexión.
**Por qué P1**: sin catálogos ni identidad no se puede registrar nada válido.
**Prueba independiente**: en un dispositivo limpio, completar el asistente con conexión, activar el modo avión y crear una recepción eligiendo un cliente del catálogo.

**Escenarios de aceptación**

- **ES-004-01** — **Dado** la app instalada sin configurar, **cuando** se abre, **entonces** se muestra el asistente (Bienvenida → Iniciar sesión → Preparar datos → Listo) con su indicador de progreso.
- **ES-004-02** — **Dado** el paso Iniciar sesión, **cuando** el usuario pulsa "Iniciar sesión con Microsoft" e ingresa sus credenciales (con MFA si el tenant lo exige), **entonces** vuelve a la app y ve su nombre, su correo y los roles detectados.
- **ES-004-03** — **Dado** una cuenta de la empresa **sin** rol asignado en la app, **cuando** termina el login, **entonces** ve "Tu cuenta no tiene acceso a esta app. Pide acceso al administrador" y la sesión se cierra.
- **ES-004-04** — **Dado** una cuenta de **otra organización**, **cuando** intenta iniciar sesión, **entonces** se rechaza con "Esta cuenta no pertenece a la organización".
- **ES-004-05** — **Dado** el paso Preparar datos, **cuando** se ejecuta, **entonces** se ve cada tarea con su estado (conectar con SharePoint, clientes, marcas y opciones, configuración, almacenamiento) y al final el resultado del almacenamiento persistente (Sí/No) y el espacio disponible.
- **ES-004-06** — **Dado** que una tarea falla (sin red, sin permiso en el sitio, sitio inexistente), **cuando** ocurre, **entonces** se muestra un mensaje entendible con "Reintentar" y no se puede avanzar hasta que el login y los catálogos estén completos.
- **ES-004-07** — **Dado** el asistente completado, **cuando** el usuario pulsa "Ir al inicio", **entonces** no vuelve a ver el asistente en las siguientes aperturas.

> En esta spec el paso Preparar datos **no** descarga servicios abiertos: esa tarea se agrega en la 006, cuando existe la descarga incremental.

### HU-004-2 — Trabajar sin conexión con mi cuenta recordada (Prioridad P1)

Como **técnico** quiero que la app recuerde quién soy aunque no tenga conexión, para que mis registros queden a mi nombre.

- **ES-004-08** — **Dado** la app configurada, **cuando** se abre en modo avión, **entonces** muestra el nombre del usuario y sus roles, sin pedir login.
- **ES-004-09** — **Dado** la app configurada y sin conexión, **cuando** el técnico crea un borrador, **entonces** queda capturado a su nombre (correo y nombre).
- **ES-004-10** — **Dado** que se perdió la sesión guardada pero hay datos locales, **cuando** se abre sin conexión, **entonces** se puede seguir capturando con el último usuario conocido y se avisa que deberá iniciar sesión para sincronizar.
- **ES-004-11** — **Dado** la app cerrada y reabierta con conexión, dentro de la vigencia de la sesión, **cuando** se pide acceso a los datos del sitio, **entonces** se obtiene sin volver a escribir la contraseña.

### HU-004-3 — Permisos según mi rol (Prioridad P1)

Como **coordinador** quiero que cada persona vea solo las acciones de su rol.

- **ES-004-12** — **Dado** un usuario con solo el rol Técnico, **cuando** navega, **entonces** no ve las opciones reservadas a Administrador (p. ej., Restablecer la app), y si entra por URL ve "Sin permiso".
- **ES-004-13** — **Dado** que el administrador cambió los roles del usuario, **cuando** el usuario vuelve a iniciar sesión, **entonces** la app refleja los roles nuevos.

### HU-004-4 — Mi cuenta: cambiar de usuario o cerrar sesión sin perder nada (Prioridad P2)

Como **usuario de un dispositivo compartido** quiero cambiar de cuenta o cerrar sesión sin que se borren los registros pendientes.

- **ES-004-14** — **Dado** Más → Mi cuenta, **cuando** la abre, **entonces** ve su nombre, su correo, sus roles y la fecha del último inicio de sesión.
- **ES-004-15** — **Dado** que hay registros pendientes, **cuando** pulsa "Cerrar sesión", **entonces** se le advierte "Tienes N registros pendientes; seguirán guardados en este dispositivo". Al confirmar, la sesión se cierra y los registros siguen ahí.
- **ES-004-16** — **Dado** "Cambiar de cuenta", **cuando** elige otra cuenta de la empresa con rol, **entonces** la app pasa a esa cuenta y los registros capturados por la anterior conservan a su autor original.

### HU-004-5 — Repetir la configuración inicial (Prioridad P3)

- **ES-004-17** — **Dado** Más → Configuración inicial, **cuando** la repite con conexión, **entonces** se refrescan la conexión con el sitio, los catálogos y la configuración **sin borrar** ningún dato local.

## 3. Casos borde

- El login se interrumpe (el usuario cierra la ventana del proveedor o vuelve atrás): el asistente vuelve al paso Iniciar sesión sin errores colgados.
- La app se recarga a mitad del regreso del login: al abrir de nuevo se completa el login pendiente antes de mostrar la interfaz.
- MFA o una política del tenant bloquea el dispositivo no administrado: mensaje "Tu organización no permite el acceso desde este dispositivo. Contacta al administrador" (resultado esperado del spike S7).
- La cuenta tiene rol, pero el usuario no tiene permiso en el sitio de SharePoint: el paso Preparar datos falla con "Tu cuenta no tiene permiso en el sitio" (no se confunde con "sin rol").
- El catálogo de clientes está vacío en SharePoint: advertencia "No hay clientes activos; pide al administrador que los cree" (se permite terminar, pero la recepción no se podrá completar).
- Un valor inválido en la configuración remota: se usa el valor por defecto y se anota en el registro técnico.
- El navegador niega el almacenamiento persistente: se informa "No", se recomienda instalar la app o sincronizar a menudo, y se permite continuar.
- Varias cuentas de la empresa en el mismo navegador: el login ofrece elegir la cuenta.

## 4. Requisitos funcionales

| ID        | El sistema debe…                                                                                                                                                          | Traza           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| FR-004-01 | Autenticar al usuario con su cuenta de la organización mediante el proveedor de identidad corporativo, sin almacenar contraseñas ni secretos de la aplicación             | [RF-09, RNF-10] |
| FR-004-02 | Aceptar solo cuentas de la organización configurada y con al menos un rol de la app                                                                                       | [RF-09]         |
| FR-004-03 | Completar cualquier login pendiente antes de mostrar la interfaz al abrir la app                                                                                          | [RF-09]         |
| FR-004-04 | Guiar la configuración inicial en 4 pasos, con estado por tarea y reintento                                                                                               | [RF-02]         |
| FR-004-05 | Localizar el sitio y las listas de SharePoint configurados y guardar sus identificadores para usarlos sin volver a buscarlos                                              | [RF-02]         |
| FR-004-06 | Descargar y guardar los catálogos (clientes activos, marcas, valores de opciones del diagnóstico, el estado, la cotización y el tipo de equipo) y la configuración remota | [RF-02]         |
| FR-004-07 | Solicitar almacenamiento persistente e informar el resultado y el espacio disponible                                                                                      | [RF-02, RNF-07] |
| FR-004-08 | Recordar la cuenta y los roles para usarlos sin conexión                                                                                                                  | [RF-09]         |
| FR-004-09 | Obtener acceso a los datos del sitio sin pedir credenciales mientras la sesión esté vigente y pedirlas cuando no lo esté                                                  | [RF-09]         |
| FR-004-10 | Restringir acciones y secciones según los roles de la cuenta                                                                                                              | [RF-07]         |
| FR-004-11 | Mostrar Mi cuenta con cambio de cuenta y cierre de sesión que nunca eliminan datos locales                                                                                | [RF-29]         |
| FR-004-12 | Comunicar los errores de identidad, permiso, red y configuración con mensajes diferenciados y sin detalles técnicos                                                       | [RNF-10]        |
| FR-004-13 | Identificar cada solicitud al servicio de datos para poder rastrearla en caso de error                                                                                    | [RNF-15]        |
| FR-004-14 | Permitir repetir la configuración inicial sin borrar datos                                                                                                                | [RF-02]         |
| FR-004-15 | Ofrecer un modo de identidad simulada solo para pruebas, imposible de activar en producción                                                                               | [ADR-0006]      |

## 5. Entidades clave

- **Cuenta de usuario**: identificador, nombre, correo, organización, roles y fecha del último inicio de sesión interactivo.
- **Sitio resuelto**: identificadores del sitio, de cada lista y de la biblioteca.
- **Catálogos**: clientes (nombre, activo), marcas, valores de opción por columna, con su fecha de actualización.
- **Configuración remota**: pares clave/valor de `ConfiguracionApp`.
- **Estado de la configuración inicial**: completada o no, resultado del almacenamiento persistente.

## 6. Criterios de éxito

- **CE-004-01**: un usuario nuevo completa la configuración inicial en ≤ 3 min con buena conexión.
- **CE-004-02**: 100 % de los intentos con cuentas sin rol o de otra organización se rechazan.
- **CE-004-03**: tras la configuración, la app funciona en modo avión con el nombre del usuario y los catálogos (0 pantallas que requieran red para capturar).
- **CE-004-04**: cerrar sesión o cambiar de cuenta deja intactos el 100 % de los registros pendientes.
- **CE-004-05**: el login y la sesión persistente funcionan en la app instalada en Android, iOS y Windows (resultado de S1).

## 7. Fuera de alcance

- Confirmación de identidad antes de sincronizar y reautenticación por tiempo (spec 005).
- Descarga de servicios existentes durante la configuración (spec 006).
- Refresco de catálogos en cada sincronización (spec 006). Aquí solo en la configuración inicial y al repetirla.
- Administración de roles y catálogos (se hace en Entra ID y SharePoint).

## 8. Aclaraciones

| Fecha      | Pregunta                                                                                                                                                                                                 | Respuesta                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-23 | ¿se necesitan roles distintos?                                                                                                                                                                           | Sí: `Tecnico`, `Comercial` y `Administrador` como app roles (PA-06). Los roles desconocidos se filtran.                                 |
| 2026-10-23 | ¿nombre y URL de los sitios?                                                                                                                                                                             | `/sites/ServicioTecnicoBC-DEV` (DEV) y `/sites/ServicioTecnicoBC` (PRD) (PA-14).                                                        |
| 2026-10-23 | ¿Se implementa con login real o simulado mientras el tenant DEV no tenga los IDs reales?                                                                                                                 | Simulado (mock + emulador Graph). La verificación manual con cuentas reales (T031) queda pendiente hasta configurar `.env.development`. |
| —          | Resultado esperado de S1: el login por redirección funciona en la app instalada de iOS, Android y Windows y la cuenta persiste al reabrir. Si no → ADR que reemplace parte del 0006 antes de implementar | —                                                                                                                                       |
| —          | Resultado esperado de S2: el permiso de escritura limitado al sitio permite leer catálogos y escribir. Si no → ADR que reemplace al 0007 (permiso amplio delegado)                                       | —                                                                                                                                       |
| —          | Resultado esperado de S7: el tenant no bloquea los dispositivos no administrados. Si bloquea → excepción de política acordada con el administrador (PA-10)                                               | —                                                                                                                                       |
