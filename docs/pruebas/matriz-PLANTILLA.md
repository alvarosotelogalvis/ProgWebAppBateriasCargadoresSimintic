# Matriz de pruebas manuales en dispositivos — PLANTILLA

> **Cómo usarla:** copia este archivo a `docs/pruebas/matriz-AAAA-MM-DD.md` (la fecha de la ronda de pruebas) y rellénalo. No edites la plantilla.
> Origen: `docs/08-Plan-de-Pruebas.md` §5 y §6 · Tareas **T074** (spec 001: M-01, M-02, M-12, M-13 y rotación/redimensionamiento) y **F10.1** (matriz completa).

## 1. Datos de la ronda

| Dato                                        | Valor             |
| ------------------------------------------- | ----------------- |
| Fecha                                       |                   |
| Ejecutado por                               |                   |
| Ambiente y URL                              | DEV · `https://…` |
| Versión de la app (Más → Acerca de)         |                   |
| Build / commit / fecha de build (Acerca de) |                   |
| Cuenta usada y roles                        |                   |

## 2. Dispositivos

Anota **modelo, SO y navegador con su versión**, y si la app está **instalada**. Deja en blanco los que no pruebes.

| Plataforma                | Modelo | SO (versión) | Navegador (versión) | App instalada |
| ------------------------- | ------ | ------------ | ------------------- | :-----------: |
| Android Chrome (celular)  |        |              |                     |               |
| Android tablet            |        |              |                     |               |
| iPhone Safari (instalada) |        |              |                     |               |
| iPad                      |        |              |                     |               |
| Windows Edge (instalada)  |        |              |                     |               |
| macOS Chrome              |        |              |                     |               |

## 3. Matriz de resultados

Leyenda: **✓** cumple · **✗** falla (describe en §6) · **—** no aplica · **n/p** no probado · **~** cumple con reservas (anota cuáles en §6).

| #    | Escenario                                                 | Android Chrome | Android tablet | iPhone Safari | iPad | Windows Edge | macOS Chrome |
| ---- | --------------------------------------------------------- | :------------: | :------------: | :-----------: | :--: | :----------: | :----------: |
| M-01 | Instalar desde el navegador e ícono creado                |                |                |               |      |              |              |
| M-02 | Abrir sin red tras instalar                               |                |                |               |      |              |              |
| M-03 | Login redirect en la app instalada                        |                |                |               |      |              |              |
| M-04 | Sesión persiste tras cerrar y reabrir                     |                |                |               |      |              |              |
| M-05 | Foto con cámara trasera, orientación correcta             |                |                |               |      |      —       |      —       |
| M-06 | Elegir 5 fotos de la galería; tiempo de compresión        |                |                |               |      |              |              |
| M-07 | Adjuntar PDF desde Archivos / Drive                       |                |                |               |      |              |              |
| M-08 | Recepción completa en modo avión                          |                |                |               |      |              |              |
| M-09 | Sync al volver la red; aviso y confirmación               |                |                |               |      |              |              |
| M-10 | Cortar la red durante el sync; reintento sin duplicar     |                |                |               |      |              |              |
| M-11 | Datos persisten tras 8 días sin abrir (iOS)               |       —        |       —        |               |      |      —       |      —       |
| M-12 | Actualización de versión con aviso                        |                |                |               |      |              |              |
| M-13 | Tamaño de fuente «Muy grande» sin cortes                  |                |                |               |      |              |              |
| M-14 | Lector de pantalla (TalkBack / VoiceOver) en la recepción |                |                |               |      |              |              |

Además de la matriz (T074 de la spec 001):

| Verificación                                                                                                                            | Dispositivo           | Resultado | Nota |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | :-------: | ---- |
| **Rotación** de la tablet (vertical ↔ horizontal) en Inicio, lista y recepción: el diseño se reacomoda sin perder lo escrito ni la ruta | Android tablet / iPad |           |      |
| **Redimensionar la ventana** del PC de 360 a 1920 px: navegación inferior → riel → barra lateral, sin desplazamiento horizontal         | Windows Edge / macOS  |           |      |

## 4. Procedimiento y criterio de cada caso

> Antes de cada caso, **sincroniza o limpia** lo pendiente para partir de un estado conocido. Los casos que necesitan Administrador usan **Más → Técnico**.

| #    | Pasos                                                                                                                                                             | Pasa si…                                                                                                                                                                                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-01 | Abre la URL en el navegador; instala (Android/Windows: botón **INSTALAR** o menú del navegador; iPhone/iPad: Compartir → _Agregar a pantalla de inicio_).         | Aparece el ícono «ST» y la app abre en ventana propia, sin barra del navegador. En iPhone/iPad, **sin instalar no deja continuar**.                                                                                                                              |
| M-02 | Con la app instalada y abierta una vez con red, activa **modo avión**, ciérrala del todo y ábrela desde el ícono.                                                 | Carga la interfaz completa (tipografía e íconos), muestra **«Sin conexión»**, en menos de 2 s.                                                                                                                                                                   |
| M-03 | Configuración inicial → **Iniciar sesión con Microsoft** desde la app instalada (spike S1).                                                                       | El login termina y **vuelve a la app instalada**; el asistente continúa.                                                                                                                                                                                         |
| M-04 | Tras iniciar sesión, cierra la app por completo y reábrela (con y sin red).                                                                                       | Sigue la sesión: **Más → Mi cuenta** muestra tu nombre, sin pedir login.                                                                                                                                                                                         |
| M-05 | Nueva recepción → **Tomar foto** en vertical y en horizontal (spike S6).                                                                                          | Abre la cámara trasera y las fotos salen **derechas**.                                                                                                                                                                                                           |
| M-06 | Recepción → **Galería** → elegir **5 fotos** de una vez. Lee `procesadoMs` en **Técnico → Registros de eventos**.                                                 | Se adjuntan las 5; `procesadoMs` < 2 s (gama media) / < 4 s (gama baja); peso final ~200–600 KB.                                                                                                                                                                 |
| M-07 | Servicio en etapa con PDF (diagnóstico, cotización o facturación) → **Adjuntar PDF** → elegir un PDF desde Archivos/Drive.                                        | Se adjunta; un archivo que no es PDF o > 20 MB se rechaza con mensaje claro.                                                                                                                                                                                     |
| M-08 | En **modo avión**, crea una recepción completa con 3 fotos, recarga la app y abre la lista.                                                                       | Todo se guarda localmente y está tras recargar.                                                                                                                                                                                                                  |
| M-09 | Quita el modo avión.                                                                                                                                              | Aparece el **aviso de conexión** y los pendientes; **Sincronizar → Confirmar** sube todo y los servicios quedan sincronizados (✓).                                                                                                                               |
| M-10 | Inicia una sincronización con varias fotos y **corta la red a mitad**; vuelve la red y sincroniza otra vez.                                                       | El segundo intento **termina sin duplicar** ítems ni archivos en SharePoint (revísalo en la web).                                                                                                                                                                |
| M-11 | Spike S5: 8 días sin abrir en iPhone/iPad, luego abrir en modo avión.                                                                                             | Los datos siguen presentes y sincronizan.                                                                                                                                                                                                                        |
| M-12 | Con la versión N instalada, publica la N+1 en DEV (`npm run deploy:dev`) y abre/mantén abierta la app. Prueba con un formulario con cambios sin guardar y sin él. | Aparece **«Hay una nueva versión disponible.»** con el botón **ACTUALIZAR** (al abrir o en ≤ 60 min). Con el formulario abierto avisa **«Se actualizará al terminar…»** y no recarga; sin trabajo en curso recarga y **Más → Acerca de** muestra la versión N+1. |
| M-13 | **Más → Ajustes → Muy grande**; recorre Inicio, Servicios, Recepción, Sincronización. Cierra y reabre la app.                                                     | El texto crece **sin cortes ni desplazamiento horizontal** a 360 px y el tamaño **se conserva** al reabrir.                                                                                                                                                      |
| M-14 | Activa TalkBack (Android) o VoiceOver (iPhone/iPad) y recorre una **recepción completa** solo con el lector.                                                      | Cada campo anuncia su etiqueta y errores, los botones tienen nombre y se llega a «Completar recepción» y a la galería sin quedar atrapado.                                                                                                                       |

## 5. Criterios de salida (`docs/08` §6)

- [ ] **M-01…M-14 sin ✗** en **Android Chrome, iPhone Safari y Windows Edge** (las plataformas principales).
- [ ] Rotación de tablet y redimensionamiento del PC verificados.
- [ ] Cada ✗ o ~ tiene un defecto registrado en §6 y su estado.

Resumen de la ronda: ✓ ____ · ✗ ____ · ~ ____ · n/p ____ · Resultado: ☐ Aprobada ☐ Aprobada con reservas ☐ No aprobada

## 6. Defectos y observaciones

| ID   | Caso | Plataforma | Qué pasó (con el mensaje exacto) | Evidencia (captura / registro) | Gravedad                         | Estado  |
| ---- | ---- | ---------- | -------------------------------- | ------------------------------ | -------------------------------- | ------- |
| D-01 |      |            |                                  |                                | Bloqueante / Alta / Media / Baja | Abierto |
