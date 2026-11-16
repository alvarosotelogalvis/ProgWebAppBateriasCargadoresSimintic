# S7 — Acceso Condicional con un dispositivo no administrado

> Tarea T050 · ADR-0006 · PA-10 · Estado: **⏳ guía lista, sin ejecutar** · Ejecutado por: ______ · Fecha: ______

## Pregunta

Los dispositivos de los técnicos **no están administrados** (sin Intune). ¿Las políticas de Acceso Condicional del tenant dejan que **Graph y SharePoint respondan 200** desde un teléfono personal?

**Criterio de éxito:** Graph responde 200 desde un teléfono personal.

## Por qué importa

Si una política exige _dispositivo compatible_, _unido a Entra_ o _app cliente aprobada_ para «todas las aplicaciones en la nube» o para SharePoint, **el login funciona pero Graph/SharePoint rechazan el acceso** y la sincronización falla aunque todo lo demás esté bien (`docs/06` §1.8).

## Preparación

- Un **administrador** con acceso a **Entra ID → Protección → Acceso condicional** y a **Supervisión → Registros de inicio de sesión**.
- Un **teléfono personal no administrado** (sin Intune, sin perfil de trabajo, sin Company Portal), idealmente uno **Android y un iPhone**, y un **Windows o Mac personal**.
- El **usuario A** de las cuentas de prueba (Colaborar).

## Pasos

**1. Revisar las políticas (administrador)**

1. En _Acceso condicional → Directivas_ lista las **habilitadas** y, para cada una que apunte a «Todas las aplicaciones en la nube», a **Office 365** o a **SharePoint Online** y a los usuarios de la app, anota los **controles de concesión**: MFA, _dispositivo compatible_, _dispositivo unido a Entra híbrido_, _app cliente aprobada_, _app protegida_, términos de uso.
2. Anota las **condiciones** relevantes: plataformas de dispositivo, ubicaciones, apps cliente, riesgo.

**2. Probar desde el dispositivo no administrado**

3. En el teléfono personal instala la app DEV, inicia sesión con el usuario A (con MFA si lo pide) y completa la configuración inicial. Anota si el **login** se completa.
4. Crea una recepción con 1 foto y **sincroniza**. Esto llama a Graph (ítem + archivo). Anota si responde bien (**200/201**) o si falla.
5. Entra a **Más → Técnico → Estado de SharePoint**: debe mostrar el sitio y las listas (otra llamada a Graph).
6. Repite 3–5 en cada tipo de dispositivo personal (Android, iPhone, Windows/Mac).

**3. Si falla**

7. En **Registros de inicio de sesión** de Entra busca el intento del usuario A y abre la pestaña **Acceso condicional**: anota qué política **falló** y el motivo. Los códigos típicos son `AADSTS53000` (dispositivo no compatible), `AADSTS53001`, `AADSTS53003` (bloqueado por política) y `AADSTS50076/50079` (MFA).
8. Anota el **mensaje exacto** que muestra la app y el que aparece en **Registros de eventos**.

## Resultado

Políticas que aplican a la app:

| Directiva | Alcance (apps / usuarios) | Control de concesión | ¿Exige dispositivo administrado? |
| --------- | ------------------------- | -------------------- | :------------------------------: |
|           |                           |                      |                                  |

Pruebas:

| Dispositivo (no administrado) | SO / navegador | Login | Sync (Graph 200) | Estado de SharePoint | Política que falla / código | Mensaje en la app |
| ----------------------------- | -------------- | :---: | :--------------: | :------------------: | --------------------------- | ----------------- |
| Android personal              |                |       |                  |                      |                             |                   |
| iPhone personal               |                |       |                  |                      |                             |                   |
| Windows/Mac personal          |                |       |                  |                      |                             |                   |

## Decisión

- [ ] **Todo OK** → ADR-0006 y PA-10 resueltos; MFA recomendado y soportado sin cambios.
- [ ] **Una política exige dispositivo administrado** → pedir al administrador una de las dos opciones de `docs/06` §1.8: **excluir la app `ServicioTec-PWA`** de esa política manteniendo MFA obligatorio, o una política específica (MFA + ubicación o riesgo) sin exigir dispositivo administrado. Repetir la prueba. Sin una de las dos, **no se puede usar la app en producción**.
- [ ] El mensaje de error de la app es poco claro ante un bloqueo por política → abrir tarea para mostrar un aviso específico («Tu organización bloquea este dispositivo»).

Notas / observaciones adicionales:
