# S1 — MSAL `loginRedirect` y `acquireTokenSilent` en la PWA instalada

> Tarea T044 · ADR-0006 · Estado: **⏳ guía lista, sin ejecutar** · Ejecutado por: ______ · Fecha: ______

## Pregunta

¿Funcionan el login por redirección y el token silencioso en la PWA **instalada** en iOS, Android y Windows, y la sesión persiste al cerrar y volver a abrir?

**Criterio de éxito:** login completo y token silencioso tras reabrir, en las tres plataformas. Si falla en iOS: documentar la alternativa (abrir el login en Safari) y crear un ADR nuevo.

## Por qué importa

La app guarda la caché de MSAL en `localStorage` (ADR-0018) y pide la sesión solo para sincronizar. En iOS, una PWA instalada es un contexto aislado de Safari y puede perder el retorno del redirect o bloquear las cookies de terceros que usa el renovado silencioso por iframe.

## Preparación

- DEV desplegado con **`VITE_AUTH_MODE=msal`** (no `mock`) y los identificadores reales del App Registration DEV.
- En el App Registration, **Redirect URI** de tipo _SPA_ igual a la URL de DEV (`docs/06` §1.2).
- **Usuario A** (Colaborar + rol Administrador). Para cada plataforma, desinstala la app si ya estaba y **borra los datos del sitio** antes de empezar.

## Pasos (repetir en cada plataforma)

Plataformas: **iPhone** (Safari → Compartir → _Agregar a pantalla de inicio_), **Android** (Chrome → _Instalar app_), **Windows** (Edge → _Instalar esta página como aplicación_).

1. Instala la app y ábrela **desde el ícono** (ventana propia, sin barra del navegador).
2. Recorre la configuración inicial hasta **Iniciar sesión con Microsoft**. Anota si el login se abre **dentro** de la app instalada o salta a Safari/Chrome/Edge.
3. Completa el login (con MFA si lo pide). Anota si **vuelve a la app instalada** y si el asistente continúa solo.
4. Entra a **Más → Mi cuenta**: deben verse nombre, correo y roles.
5. **Cierra la app por completo** (quítala de los recientes) y vuelve a abrirla **con red**. ¿Sigue la sesión sin pedir login? (Mi cuenta).
6. Repite el cierre y abre **sin red** (modo avión): la app debe cargar y mostrar la cuenta.
7. Con red, crea una recepción mínima y pulsa **Sincronizar → Confirmar como …**. Esto fuerza `acquireTokenSilent`. Anota si pide login otra vez.
8. **Pasada 1 hora** (el token de acceso dura ~1 h) repite el paso 7 sin haber abierto la app en ese tiempo. Anota si renueva solo o vuelve a pedir login.
9. **Solo iPhone:** repite 5 y 7 al día siguiente (≥ 24 h cerrada).

## Resultado

| Plataforma | SO / navegador (versión) | Login abre dentro de la app | Vuelve a la app tras login | Sesión tras reabrir (con red) | Sesión tras reabrir (sin red) | Silent en sync (paso 7) | Silent tras 1 h (paso 8) | Notas / error exacto |
| ---------- | ------------------------ | :-------------------------: | :------------------------: | :---------------------------: | :---------------------------: | :---------------------: | :----------------------: | -------------------- |
| iPhone     |                          |                             |                            |                               |                               |                         |                          |                      |
| Android    |                          |                             |                            |                               |                               |                         |                          |                      |
| Windows    |                          |                             |                            |                               |                               |                         |                          |                      |

Marca ✓ / ✗. Si algo falla, pega el texto del error (menú técnico → _Registros de eventos_, nivel `error`) y una captura.

## Decisión

- [ ] Funciona en las tres plataformas → **ADR-0006 se mantiene**; pasar a `Aceptado`.
- [ ] Falla solo en iOS → crear ADR nuevo con la alternativa (login en Safari y retorno a la app, o aviso «vuelve a iniciar sesión» al sincronizar) y su impacto en la spec 004.
- [ ] Falla el silent tras 1 h → documentar si basta `offline_access` / refresh token o si hay que pedir login interactivo al sincronizar.

Notas / observaciones adicionales:
