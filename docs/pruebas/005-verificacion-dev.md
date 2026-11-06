# Verificación en DEV real — Spec 005 (Sincronización: subida)

> Tareas T036 y T037 de [`specs/005-sincronizacion-push/tasks.md`](../../specs/005-sincronizacion-push/tasks.md).
> Se ejecuta contra el sitio SharePoint y el App Registration de **DEV** (ADR-0020), con cuentas reales.
> Anota los resultados en las tablas de este documento y las mediciones en la spec §8.

| Dato                            | Valor                                                                     |
| ------------------------------- | ------------------------------------------------------------------------- |
| Fecha de ejecución              |                                                                           |
| Versión de la app (`Acerca de`) |                                                                           |
| Commit                          |                                                                           |
| Ejecutado por                   |                                                                           |
| Dispositivos                    | Android (app instalada): ____ · Windows (app instalada o navegador): ____ |

---

## 1. Preparación (una sola vez)

### 1.1 SharePoint DEV

1. Las listas y la biblioteca existen según [`docs/06`](../06-Configuracion-Tenant-M365.md) §2.3 (`Servicios`, `Clientes`, `Marcas`, `ConfiguracionApp`, `LogSincronizacion`, `ServiciosAdjuntos`).
2. En `ConfiguracionApp`, la clave **`VersionMinimaApp` debe ser `0.1.0` o menor** mientras la app esté en `0.x`. Con el valor por defecto `1.0.0` la sincronización queda bloqueada.
3. Hay al menos 2 clientes activos en `Clientes` y marcas en `Marcas`.
4. Cuentas de prueba:
   - **A**: cuenta del tenant con rol `Tecnico` asignado en la Enterprise application.
   - **B**: segunda cuenta del tenant con rol (para "Usar otra cuenta").
   - **C**: cuenta del tenant **sin** rol asignado.
   - **D** (opcional): cuenta de otro tenant.

### 1.2 App Registration DEV

- Redirect URIs (plataforma _Single-page application_): la URL de Cloudflare Pages de DEV y `http://localhost:4173/`, ambas terminadas en `/` ([`docs/06`](../06-Configuracion-Tenant-M365.md) §1.2).

### 1.3 Build y despliegue con login real

`.env.development` tiene valores **simulados** porque las pruebas E2E se construyen en modo `development`. Para DEV real se usa un archivo local que Vite carga con prioridad y git ignora:

1. Crea `.env.development.local` con los datos públicos de DEV:
   ```dotenv
   VITE_AUTH_MODE=msal
   VITE_ENTRA_CLIENT_ID=<clientId de DEV>
   VITE_ENTRA_TENANT_ID=<tenantId>
   VITE_SHAREPOINT_SITE_URL=https://<tenant>.sharepoint.com/sites/ServicioTecnicoBC-DEV
   VITE_SHAREPOINT_SITE_NAME=ServicioTecnicoBC-DEV
   ```
2. `npm run build:dev` y luego `npm run deploy:dev`.
3. **Borra `.env.development.local` al terminar**. Si queda, `npm run test:e2e` se construye con el login real y falla.

Para probar en `localhost`: `npm run build:dev && npm run preview:dev` → `http://localhost:4173`.

### 1.4 En cada dispositivo

1. Instala la app desde la URL de DEV (Android: menú → _Instalar app_; Windows/Edge: ícono de instalar en la barra de direcciones).
2. Completa la configuración inicial con la cuenta **A**.
3. Ten a mano DevTools (Windows) o la depuración remota de Chrome (`chrome://inspect`, Android) para ver la consola y simular _Offline_.

---

## 2. Escenarios de aceptación (T036)

Resultado: ✅ cumple · ❌ falla (describe en Notas) · ➖ no aplica.

### HU-005-1 — Confirmar la cuenta y sincronizar

| ID        | Cómo probarlo                                                                                 | Esperado                                                                                                                                            | Android | Windows | Notas |
| --------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ----- |
| ES-005-01 | Crea 3 recepciones con fotos sin sincronizar. Abre **Sincronizar**.                           | "3 registros · N archivos (tamaño)", nombre y correo de la cuenta, botón "Confirmar como …" (la referencia 09 reemplaza "Confirmar y sincronizar"). |         |         |       |
| ES-005-02 | Con login de hace < 12 h, pulsa **Confirmar como …**.                                         | Sincroniza sin pedir contraseña.                                                                                                                    |         |         |       |
| ES-005-03 | En `ConfiguracionApp` pon `SyncModoAutenticacion = reautenticar` (o espera > 12 h). Confirma. | Abre el login de Microsoft y, al volver, la sincronización **continúa sola**. Restaura el valor al terminar.                                        |         |         |       |
| ES-005-04 | **Usar otra cuenta** → inicia con la cuenta **B** → sincroniza.                               | Se sube con B; en SharePoint el campo de quién capturó conserva a A.                                                                                |         |         |       |
| ES-005-05 | Usar otra cuenta con **C** (sin rol) y, si hay, **D** (otro tenant).                          | No se sube nada; mensaje de acceso denegado.                                                                                                        |         |         |       |
| ES-005-06 | Modo avión. Abre **Sincronizar**.                                                             | Botón deshabilitado y "Sin conexión. Tus datos están seguros en este dispositivo".                                                                  |         |         |       |

### HU-005-2 — Subida fiable

| ID        | Cómo probarlo                                                                                                                                                                 | Esperado                                                                                                                                                         | Android | Windows | Notas |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ----- |
| ES-005-07 | Recepción con 3 fotos → sincroniza.                                                                                                                                           | En `Servicios` existe el ítem con todos los datos; en `ServiciosAdjuntos` una carpeta con las 3 fotos y metadatos (servicio, tipo, fecha). Badge "Sincronizado". |         |         |       |
| ES-005-08 | Recepción con 5 fotos. Pulsa Confirmar y **corta la red** (modo avión / DevTools Offline) en cuanto empiece a subir. Vuelve la red y sincroniza otra vez.                     | Termina bien; en SharePoint **1 ítem y 5 fotos**, sin duplicados.                                                                                                |         |         |       |
| ES-005-09 | Cubierto por prueba de integración (`SyncEngine.push.int.test.ts`, 409 → búsqueda). Opcional: cerrar la app justo después de que el ítem aparezca en SharePoint y reintentar. | No se crea un segundo ítem.                                                                                                                                      |         |         |       |
| ES-005-10 | Requiere un PDF > 4 MB. **La UI aún no adjunta PDF** (llega con la spec 007). Cubierto por `uploads.int.test.ts`.                                                             | ➖ hasta la spec 007.                                                                                                                                            | ➖      | ➖      |       |
| ES-005-11 | Sincroniza un servicio, edita un campo y vuelve a sincronizar (si la UI de la etapa lo permite).                                                                              | En SharePoint solo cambia ese campo y aparece una versión nueva (Historial de versiones).                                                                        |         |         |       |
| ES-005-12 | Elimina en la app una foto ya sincronizada (etapa actual) y sincroniza.                                                                                                       | El archivo desaparece de `ServiciosAdjuntos`.                                                                                                                    |         |         |       |
| ES-005-13 | Sincroniza un servicio. Edita ese ítem **en SharePoint**. En la app edita otro campo y sincroniza junto con otro servicio pendiente.                                          | El servicio queda en **Conflictos** (no sobrescribe); el otro servicio se sube normal.                                                                           |         |         |       |

### HU-005-3 — Progreso, errores y reintentos

| ID        | Cómo probarlo                                                                                                                  | Esperado                                                                                                                                                        | Android | Windows | Notas |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ----- |
| ES-005-14 | Sincroniza 3 servicios con varias fotos (con 4G se aprecia mejor).                                                             | Cada servicio con su estado (en cola, "Archivo 3 de 5" con barra, listo, con error).                                                                            |         |         |       |
| ES-005-15 | Durante la subida pulsa **CANCELAR**.                                                                                          | Se detiene; lo ya subido queda "Sincronizado", el resto sigue pendiente. Sin duplicados al reintentar.                                                          |         |         |       |
| ES-005-16 | Difícil de provocar a mano. Cubierto por `SyncEngine.errores.int.test.ts` (429 con `Retry-After`).                             | Reintenta solo.                                                                                                                                                 |         |         |       |
| ES-005-17 | Quita temporalmente a la cuenta A el permiso del sitio (o usa una cuenta con rol pero sin permiso en SharePoint) y sincroniza. | Servicio en **Con error** con "Tu cuenta no tiene permiso en el sitio de SharePoint." y botón **REINTENTAR**. Restaura el permiso, pulsa Reintentar y confirma. |         |         |       |
| ES-005-18 | Cubierto por `SyncEngine.errores.int.test.ts` (8 fallos).                                                                      | Tras 8 fallos solo reintenta con el botón.                                                                                                                      |         |         |       |
| ES-005-19 | Al terminar cualquier sincronización.                                                                                          | Resumen: subidos, archivos, con error, en conflicto.                                                                                                            |         |         |       |
| ES-005-20 | Windows: abre la app en dos ventanas y pulsa Confirmar en ambas casi a la vez (mejor con varios pendientes).                   | Una sincroniza; la otra dice "Ya hay una sincronización en curso en otra ventana".                                                                              |         |         |       |

### HU-005-4 — Recordatorios y aviso de conexión

| ID        | Cómo probarlo                                                                                                                                                          | Esperado                                                                                                       | Android | Windows | Notas |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------- | ------- | ----- |
| ES-005-21 | Sin red, crea 2 recepciones. Con la app abierta en Inicio, vuelve la red.                                                                                              | Aviso "Tienes 2 pendientes. ¿Sincronizar ahora?" que **no** sincroniza solo. No reaparece antes de 30 min.     |         |         |       |
| ES-005-22 | Deja un pendiente más de 24 h (o baja `RecordatorioPendientesHoras` a 1 en `ConfiguracionApp`, sincroniza otro servicio para refrescar la configuración y espera 1 h). | Recordatorio en Inicio con la antigüedad y botón SINCRONIZAR.                                                  |         |         |       |
| ES-005-23 | Con pendientes.                                                                                                                                                        | Barra superior con el indicador de conexión y "N pendientes", que abre Sincronización; badge en "Sincronizar". |         |         |       |

### HU-005-5 — Versión mínima y bitácora

| ID        | Cómo probarlo                                                                   | Esperado                                                                                                                      | Android | Windows | Notas |
| --------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ----- |
| ES-005-24 | Pon `VersionMinimaApp = 9.0.0` y pulsa Confirmar. Después devuélvelo a `0.1.0`. | Aviso "Actualiza la app para sincronizar", Confirmar deshabilitado, botón BUSCAR ACTUALIZACIÓN. La captura sigue funcionando. |         |         |       |
| ES-005-25 | Tras cada sincronización revisa `LogSincronizacion`.                            | Un ítem por ejecución: usuario, dispositivo, versión, inicio, fin, resultado y totales. `Errores` es JSON válido.             |         |         |       |

### Casos borde (spec §3)

| Caso                                                                        | Esperado                                                 | Resultado | Notas |
| --------------------------------------------------------------------------- | -------------------------------------------------------- | --------- | ----- |
| Cerrar la app durante el login de Microsoft y reabrir más de 10 min después | La intención se descarta sin efectos                     |           |       |
| Un borrador con fotos                                                       | No se sube                                               |           |       |
| Editar un servicio mientras se sube                                         | Los cambios nuevos quedan pendientes para la próxima vez |           |       |

---

## 3. Mediciones (T037)

### CE-005-01 — 0 duplicados tras 20 cortes al azar

1. Prepara 20 rondas de 1 recepción con 3 a 5 fotos.
2. En cada ronda pulsa Confirmar y corta la red en un momento distinto (al inicio, a mitad de fotos, al final). Vuelve la red y sincroniza de nuevo.
3. Al final, en `Servicios` filtra por las series usadas: debe haber **exactamente 1 ítem por servicio**. En `ServiciosAdjuntos` cada carpeta debe tener las fotos esperadas, sin copias.

| Ronda | Momento del corte | ¿Terminó bien al reintentar? | Ítems en SP | Fotos esperadas / en SP |
| ----- | ----------------- | ---------------------------- | ----------- | ----------------------- |
| 1     |                   |                              |             |                         |
| …     |                   |                              |             |                         |
| 20    |                   |                              |             |                         |

**Resultado CE-005-01:** ___ duplicados (meta: 0).

### CE-005-03 — 3 servicios con 10 fotos en < 60 s con 4G

1. En Android con **4G** (Wi-Fi apagado), crea 3 recepciones con 10 fotos en total, tomadas con la cámara.
2. Cronometra desde que pulsas Confirmar hasta que aparece el resumen.

| Intento | Señal 4G (barras) | Tiempo (s) |
| ------- | ----------------- | ---------- |
| 1       |                   |            |
| 2       |                   |            |
| 3       |                   |            |

**Resultado CE-005-03:** mediana ___ s (meta: < 60 s).

### CE-005-04 y CE-005-05

- **CE-005-04**: cuenta las ejecuciones de esta sesión y compáralas con los ítems de `LogSincronizacion`: ___ de ___ (meta: 100 %).
- **CE-005-05**: ¿se perdió algún dato local en algún escenario? ___ (meta: 0).

---

## 4. Cierre

- [ ] Todas las filas con ✅ o ➖ justificado. Los ❌ tienen issue o tarea abierta.
- [ ] Mediciones anotadas en la spec 005 §8.
- [ ] `VersionMinimaApp`, `SyncModoAutenticacion`, `RecordatorioPendientesHoras` y los permisos de la cuenta A restaurados en DEV.
- [ ] `.env.development.local` borrado.
- [ ] Avisar para ejecutar T038 (DoD y spec → `Implementada`).
