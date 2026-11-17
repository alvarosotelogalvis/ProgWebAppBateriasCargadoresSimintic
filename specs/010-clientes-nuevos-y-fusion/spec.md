# Spec 010 — Clientes nuevos desde el formulario y fusión de clientes

- **Estado**: Implementada
- **Fecha**: 2026-11-16 · **Rama**: `feature/010-clientes-nuevos-y-fusion`
- **Fase**: posterior a F10 (cambio solicitado por el dueño del producto) · **Depende de**: 003, 006, 009
- **Fuentes**: PRD [RF-06] · ADR [0023, 0009, 0010] · Modelo de datos [§6.1] · Spec 003 [ES-003-05, FR-003-04]

> Describe **qué** y **por qué**. Sin tecnologías ni nombres de archivos de código (eso va en `plan.md`).

## 1. Resumen

El técnico puede **agregar un cliente nuevo** al registrar un servicio aunque no tenga conexión ni el cliente exista aún en su catálogo. El cliente queda como un cliente normal y permanente. Un administrador puede **fusionar dos clientes** cuando son el mismo o se creó uno por error, sin perder historial.

## 2. Historias de usuario

### HU-010-1 — Agregar un cliente nuevo al registrar un servicio (Prioridad P1) 🎯

Como **técnico** quiero agregar el cliente en el momento si no aparece en la lista, para no quedar bloqueado en campo sin conexión.
**Por qué P1**: hoy un cliente desconocido para el dispositivo impide registrar el servicio.
**Prueba independiente**: sin conexión, registrar un servicio con un cliente nuevo; al sincronizar, el cliente existe una sola vez en SharePoint y el servicio queda asociado.

**Escenarios de aceptación**

- **ES-010-01** — **Dado** que el cliente no aparece al buscar, **cuando** el técnico elige «Agregar cliente nuevo» y escribe «Minera Los Andes», **entonces** queda seleccionado como un cliente más, sin aviso de «provisional».
- **ES-010-02** — **Dado** que existe «ARIS MINING SEGOVIA», **cuando** el técnico intenta agregar «aris mining segovía», **entonces** la app lo detecta como el mismo nombre y propone usar el existente en vez de crear uno.
- **ES-010-03** — **Dado** un servicio con un cliente nuevo creado sin conexión, **cuando** se sincroniza, **entonces** el cliente se crea primero en SharePoint, el servicio queda asociado a él y no se duplica al reintentar.
- **ES-010-04** — **Dado** que dos dispositivos crearon sin conexión el mismo cliente, **cuando** ambos sincronizan, **entonces** existe un solo cliente y los dos servicios apuntan a él.
- **ES-010-05** — **Dado** un cliente nuevo todavía sin sincronizar, **cuando** el técnico registra otro servicio, **entonces** puede elegirlo de la lista.

### HU-010-2 — Fusionar dos clientes (Prioridad P2)

Como **administrador** quiero fusionar dos clientes, para corregir duplicados o nombres distintos del mismo cliente sin perder el historial.
**Por qué P2**: los duplicados se corrigen después; no bloquean la operación.
**Prueba independiente**: con dos clientes con servicios, fusionar uno en otro y comprobar que todos los servicios quedan con el destino y el origen deja de ofrecerse.

**Escenarios de aceptación**

- **ES-010-06** — **Dado** los clientes A y B con servicios, **cuando** el administrador fusiona A en B, **entonces** todos los servicios de A pasan a B, A deja de aparecer en el selector y se conserva como historial.
- **ES-010-07** — **Dado** una fusión interrumpida a la mitad, **cuando** se repite, **entonces** continúa con los servicios que faltan y termina sin duplicar ni perder nada.
- **ES-010-08** — **Dado** un dispositivo con un servicio pendiente del cliente A, **cuando** A se fusionó en B y el dispositivo sincroniza, **entonces** el servicio se asocia a B sin conflicto y sin perder datos.
- **ES-010-09** — **Dado** un usuario que no es administrador, **cuando** abre la app, **entonces** no ve la opción de fusionar.
- **ES-010-10** — **Dado** que el administrador no tiene conexión, **cuando** intenta fusionar, **entonces** la app lo explica y no hace nada.

## 3. Casos borde

- Nombre vacío, con solo espacios o de más de 100 caracteres: no se acepta.
- Dos clientes creados sin red con nombres que solo difieren en mayúsculas, tildes o espacios: se tratan como el mismo.
- Se intenta fusionar un cliente consigo mismo, o en uno ya fusionado: no se permite (se sigue la cadena hasta el cliente vigente).
- El cliente destino se desactiva después de fusionar: los servicios conservan su asociación y se avisa al administrador.
- Se crea un cliente sin conexión y el dispositivo se borra antes de sincronizar: el cliente se pierde junto con su servicio pendiente (cubierto por el respaldo de la spec 009).

## 4. Requisitos funcionales

| ID        | El sistema debe…                                                                                                            | Traza    |
| --------- | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-010-01 | Permitir agregar un cliente nuevo desde el campo cliente cuando la búsqueda no encuentra coincidencia, con o sin conexión   | [RF-06]  |
| FR-010-02 | Normalizar el nombre (mayúsculas, sin tildes, espacios colapsados) y sugerir el cliente existente si coincide               | [RF-06]  |
| FR-010-03 | Tratar el cliente nuevo como permanente: sin estado provisional ni aprobación                                               | [RF-06]  |
| FR-010-04 | Crear los clientes nuevos en SharePoint antes de subir los servicios que los usan, de forma idempotente                     | [RF-12]  |
| FR-010-05 | Resolver la creación simultánea del mismo cliente desde dos dispositivos dejando uno solo                                   | [RF-12]  |
| FR-010-06 | Permitir al administrador, con conexión, fusionar un cliente origen en un cliente destino                                   | —        |
| FR-010-07 | Conservar el cliente origen como inactivo y fusionado (sin borrarlo) y reasignar sus servicios al destino                   | —        |
| FR-010-08 | Hacer la fusión reanudable e idempotente                                                                                    | —        |
| FR-010-09 | Reasignar al destino los servicios pendientes locales que apunten a un cliente fusionado, sin conflicto ni pérdida de datos | [RNF-07] |
| FR-010-10 | Registrar cada fusión en la bitácora (quién, cuándo, origen, destino, cantidad de servicios)                                | [RF-19]  |
| FR-010-11 | Mostrar la opción de fusionar solo al rol Administrador                                                                     | [RF-27]  |
| FR-010-12 | Mantener textos externalizados, accesibilidad AA y funcionamiento sin conexión del alta de clientes                         | [RNF]    |

## 5. Entidades clave

- **Cliente**: nombre, nombre normalizado (único), identificador generado en el dispositivo (único), activo, fusionado con (cliente destino, opcional), creado desde la app.
- **Fusión**: operación del administrador con origen, destino, fecha, usuario y cantidad de servicios reasignados.

## 6. Criterios de éxito

- **CE-010-01**: registrar un servicio con un cliente nuevo sin conexión no exige red ni pasos extra frente a elegir un cliente existente.
- **CE-010-02**: tras sincronizar desde N dispositivos, no hay clientes duplicados por nombre normalizado.
- **CE-010-03**: fusionar un cliente con 100 servicios termina y deja 0 servicios en el origen; repetir la fusión no cambia nada.
- **CE-010-04**: ningún dato local pendiente se pierde por una fusión (regla no negociable 1).

## 7. Fuera de alcance

- Edición del nombre, NIT o correo de un cliente existente desde la app (se hace en SharePoint).
- Deshacer una fusión desde la app (se corrige en SharePoint, el origen se conserva por eso).
- Número de solicitud automático (spec 011, ADR-0024).

## 8. Aclaraciones

| Fecha      | Pregunta                                       | Respuesta                                                                                                                |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 2026-11-16 | ¿El cliente nuevo es provisional o permanente? | Permanente. Si luego se quieren unir dos clientes, debe poderse (fusión).                                                |
| 2026-11-16 | ¿Qué roles pueden agregar clientes nuevos?     | Cualquier usuario que cree un servicio: se le muestran los clientes existentes y, si no está, puede escribirlo él mismo. |
| 2026-11-16 | ¿La fusión es solo del Administrador?          | Se mantiene el valor por defecto (solo Administrador); el usuario no lo objetó.                                          |
