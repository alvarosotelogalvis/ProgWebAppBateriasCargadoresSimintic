# S2 — `Sites.Selected` delegado con el grant `write`

> Tarea T045 · ADR-0007 · Estado: **⏳ guía lista, sin ejecutar** · Ejecutado por: ______ · Fecha: ______

## Pregunta

¿`Sites.Selected` **delegado** con un grant `write` sobre el sitio DEV permite crear un ítem de lista y subir un archivo a la biblioteca con un usuario _Colaborar_, y rechaza a quien no corresponde?

**Criterio de éxito:** `POST` de ítem y `PUT` de archivo correctos con un usuario con _Colaborar_.

## Por qué importa

Con `Sites.Selected` delegado el acceso efectivo es la **intersección** del permiso de la app en el sitio **y** el permiso del usuario en SharePoint (`docs/06` §1.7). Si el tenant no lo permite, la alternativa es `Sites.ReadWrite.All` delegado (ADR-0007), que obliga a acotar con permisos de SharePoint.

## Preparación

- App Registration DEV con permisos delegados `Sites.Selected`, `User.Read`, `openid`, `profile`, `offline_access` y **admin consent** (`docs/06` §1.4).
- Grant `write` de la app sobre el sitio DEV (`docs/06` §1.7). **Comprueba que existe** (con un administrador, en Graph Explorer):

```http
GET https://graph.microsoft.com/v1.0/sites/{siteId}/permissions
```

Debe aparecer tu `CLIENT_ID_DEV` con `"roles": ["write"]`. Anota la respuesta abajo.

- Usuarios A (Colaborar), B (Leer) y C (sin asignar a la app) — ver [README](README.md).
- La prueba se hace **con la propia app**, no con Graph Explorer: Graph Explorer usa otra aplicación y no prueba _tu_ permiso.

## Pasos

1. Con el **usuario A** inicia sesión en la app DEV y completa la configuración inicial. Debe resolver el sitio y las listas (menú **Técnico → Estado de SharePoint** muestra el sitio y los ids).
2. Crea una recepción con **1 foto** y pulsa **Sincronizar → Confirmar**.
3. En SharePoint (web) verifica: aparece **1 ítem** en `Servicios` con `ServicioId`, y **1 archivo** en `ServiciosAdjuntos` (carpeta `año/ServicioId`) con sus metadatos.
4. **Usuario B (Leer):** repite el paso 2 con una recepción nueva. Esperado: la sincronización falla con un error **403** no reintentable y un mensaje claro; no se crea nada.
5. **Usuario C (sin asignar):** intenta iniciar sesión en la app. Esperado: pantalla «Sin acceso».
6. **Quita el grant** del sitio a la app (administrador) y repite el paso 2 con el usuario A. Esperado: 403. **Vuelve a conceder el grant** al terminar.

## Resultado

| Caso                             | Esperado        | Obtenido | Código HTTP | Mensaje / evidencia |
| -------------------------------- | --------------- | -------- | ----------- | ------------------- |
| Respuesta de `GET …/permissions` | App con `write` |          |             |                     |
| A (Colaborar): crear ítem        | OK              |          |             |                     |
| A (Colaborar): subir archivo     | OK              |          |             |                     |
| B (Leer): crear ítem             | 403             |          |             |                     |
| C (sin asignar): login           | «Sin acceso»    |          |             |                     |
| A sin grant en el sitio          | 403             |          |             |                     |

## Decisión

- [ ] Funciona → **ADR-0007 se mantiene** (`Sites.Selected` delegado); pasar a `Aceptado`.
- [ ] El tenant no permite `Sites.Selected` delegado → crear ADR nuevo con `Sites.ReadWrite.All` delegado y las medidas de acotación (permisos de SharePoint, §2.5).
- [ ] El 403 de B/C no se entiende en la interfaz → abrir una tarea para mejorar el mensaje.

Notas / observaciones adicionales:
