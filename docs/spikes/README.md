# Spikes de la Fase F0 — guías de ejecución

> Los spikes S1–S7 se ejecutan **contra el ambiente DEV real** (dispositivos y tenant), por eso los hace una persona. Cada guía dice qué hacer, qué anotar y qué decidir según el resultado. S8 ya está hecho: [S8-csp.md](S8-csp.md).
> Origen: `docs/07-Plan-de-Implementacion.md` §F0.10 · Tareas T044–T050 de [`specs/001-fundacion-pwa/tasks.md`](../../specs/001-fundacion-pwa/tasks.md).

## Índice

| Spike                          | Pregunta                                                                                                                                                                                                    | Dispositivos / cuentas                | Tiempo                           | Tarea | Decisión que cierra |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------- | ----- | ------------------- |
| [S1](S1-msal-redirect-pwa.md)  | ¿Funcionan `loginRedirect` y `acquireTokenSilent` en la PWA **instalada**, y la sesión sobrevive al cerrar y abrir?                                                                                         | iPhone, Android, Windows              | 1–2 h (+ 1 h de espera de token) | T044  | ADR-0006            |
| [S2](S2-sites-selected.md)     | ¿`Sites.Selected` delegado con grant `write` permite crear ítems y subir archivos?                                                                                                                          | Un usuario _Colaborar_, uno _Lectura_ | 1 h                              | T045  | ADR-0007            |
| [S3](S3-if-match-fechas.md)    | ¿`PATCH` respeta `If-Match` (412)? ¿Cómo vuelven las fechas de solo fecha y el error de valor único?                                                                                                        | Graph Explorer                        | 1 h                              | T046  | ADR-0010            |
| [S4](S4-delta-listas.md)       | ¿`items/delta?$expand=fields` devuelve los campos y un `deltaLink` estable? **¿Trae el ítem completo?**                                                                                                     | Graph Explorer                        | 1 h                              | T047  | ADR-0010            |
| [S5](S5-almacenamiento-ios.md) | ¿`storage.persist()`, cuota y supervivencia de **8 días** en iOS instalada?                                                                                                                                 | iPhone (y 1 Android)                  | 10 min + 8 días                  | T048  | ADR-0008            |
| [S6](S6-camara-compresion.md)  | ¿Cámara con `capture` y tiempo de compresión de fotos de 12 MP?                                                                                                                                             | iPhone, Android gama media y baja     | 1 h                              | T049  | ADR-0011            |
| [S7](S7-acceso-condicional.md) | ¿Graph responde 200 desde un dispositivo **no administrado**?                                                                                                                                               | Teléfono personal                     | 30 min                           | T050  | ADR-0006 / PA-10    |
| [S9](S9-numero-solicitud.md)   | ¿SharePoint real permite un consecutivo (máximo por `orderby`, columna única)? **Hecho 2026-11-16: la unicidad llega 1–4 s tarde**                                                                          | Graph (aplicación)                    | hecho                            |
| [S10](S10-clientes.md)         | ¿Clientes nuevos y fusión en SharePoint real (columnas únicas de texto, filtro por cliente, reasignar lookup)? **Hecho 2026-11-16: la unicidad de texto es inmediata; hay que indexar `Servicios.Cliente`** | Graph (aplicación)                    | hecho                            |

Orden sugerido: **S2 → S3 → S4** (solo necesitan el tenant), **S1 y S7** en los mismos dispositivos, **S6** en el mismo día, y **S5** al final porque necesita 8 días: déjalo corriendo desde el primer día.

## Antes de empezar (una sola vez)

1. **DEV desplegado y con HTTPS** (`npm run deploy:dev`), con el App Registration DEV, el sitio `ServicioTecnicoBC-DEV` y sus listas (`docs/06`). Comprueba que `curl -I <url-dev>` devuelve la CSP y las demás cabeceras de `public/_headers`.
2. **Tres cuentas de prueba** en la Enterprise App (`docs/06` §1.6 y §2.5):
   - **Usuario A:** miembro del grupo _Usuarios ServicioTec_ (**Colaborar**) y con el app role **Administrador** (para ver el menú técnico `/tecnico`).
   - **Usuario B:** con acceso a la app pero solo **Leer** en el sitio.
   - **Usuario C:** sin asignar a la Enterprise App (para comprobar el rechazo).
3. **Una cuenta de administrador** capaz de ver los _Sign-in logs_ de Entra ID (S7) y de consentir en Graph Explorer (S3, S4).
4. **Dispositivos** (anota modelo y versión; los necesitarás para la matriz): un iPhone, un Android de gama media, un Android de gama baja (o similar), un Windows con Edge. Idealmente también un iPad y un Mac.
5. **Cómo leer lo que hace la app** (cuenta con rol Administrador): menú **Más → Técnico** tiene _Estado del dispositivo_ (plataforma, navegador, almacenamiento persistente, uso de espacio), _Estado de SharePoint_ y _Registros de eventos_ (con nivel, evento y datos).

## Cómo anotar

- Un archivo por spike, ya creado con tablas vacías. **Rellena las tablas** con ✓ / ✗, la nota y las versiones de SO y navegador. Una captura de pantalla o el texto exacto del error valen más que una descripción.
- Sección **Resultado** (qué pasó) y sección **Decisión** (qué cambia). Si el resultado contradice un ADR `Aceptado`, **no lo edites**: se crea un ADR nuevo que lo reemplace (`CLAUDE.md` §3.10).
- Al terminar un spike, marca su estado en esta tabla:

| Spike | Estado                | Fecha      | Resultado en una línea                     |
| ----- | --------------------- | ---------- | ------------------------------------------ |
| S1    | ⏳ Sin ejecutar       |            |                                            |
| S2    | ⏳ Sin ejecutar       |            |                                            |
| S3    | ⏳ Sin ejecutar       |            |                                            |
| S4    | ⏳ Sin ejecutar       |            |                                            |
| S5    | ⏳ Sin ejecutar       |            |                                            |
| S6    | ⏳ Sin ejecutar       |            |                                            |
| S7    | ⏳ Sin ejecutar       |            |                                            |
| S8    | ✅ Hecho (2026-11-16) | 2026-11-16 | 0 violaciones tras 2 arreglos de librerías |

## Cuando termines

Avisa y se consolidan los resultados en los ADR 0006, 0007, 0008, 0010, 0011 y 0022 (tarea T052), se marcan T044–T050 y se corrige lo que haya salido mal.
