# Spec 001 — Fundación PWA e interfaz base

- **Estado**: Implementada
- **Fecha**: 2026-10-21 · **Rama**: `feature/001-fundacion-pwa`
- **Fase**: F0 + F2 (`docs/07`) · **Depende de**: — (requiere el tenant DEV para los spikes S1, S2 y S7)
- **Fuentes**: PRD [HU-01, HU-14; RF-01, RF-16 parcial, RF-20, RF-21, RF-22; RNF-03, RNF-04, RNF-06, RNF-08, RNF-09, RNF-10, RNF-13, RNF-16] · ADR [0002, 0003, 0004, 0014, 0015, 0020, 0022] · UX [§1, §2, §3.1, §3.3, §4] · Sistema de diseño [`docs/10` §1–§4, §6, §8] · Referencia visual [`docs/diseno/referencia/`]

## 1. Resumen

Base sobre la que se construye todo lo demás. Al terminar esta spec:

- la app se puede **instalar** en cualquier dispositivo soportado y abre **sin conexión**;
- tiene la **identidad visual** definida por el usuario en las pantallas de referencia (mobile-first) y se **adapta** a celular, tablet y escritorio;
- tiene la navegación principal, los menús de usuario, ayuda e información, y el ajuste de tamaño de fuente;
- se actualiza sola de forma controlada.

También valida, antes de construir el resto, los riesgos técnicos principales (login en la app instalada, permisos, almacenamiento en iOS, cámara, políticas del tenant, seguridad).

## 2. Historias de usuario

### HU-001-1 — Instalar la app (Prioridad P1) 🎯

Como **usuario** quiero instalar la app en mi celular, tablet o PC, para abrirla desde un ícono y trabajar sin conexión.
**Por qué P1**: sin instalación no hay funcionamiento offline confiable, sobre todo en iOS.
**Prueba independiente**: instalar desde la URL de DEV en Android, iPhone y Windows. Activar el modo avión y abrir la app desde el ícono: carga la pantalla de inicio.

**Escenarios de aceptación**

- **ES-001-01** — **Dado** que el usuario abre la URL en Chrome o Edge (Android, Windows, macOS) sin haber instalado la app, **cuando** carga la página, **entonces** ve la pantalla "Instala la app" con las instrucciones de su plataforma y un botón **Instalar** que abre el diálogo nativo de instalación.
- **ES-001-02** — **Dado** un iPhone o iPad con Safari sin la app instalada, **cuando** abre la URL, **entonces** ve las instrucciones "Compartir → Agregar a pantalla de inicio" y **no** puede continuar sin instalar.
- **ES-001-03** — **Dado** un iPhone con un navegador distinto de Safari, **cuando** abre la URL, **entonces** ve el mensaje "Abre este enlace en Safari para instalar".
- **ES-001-04** — **Dado** un navegador de escritorio sin instalar, **cuando** elige "Continuar sin instalar", **entonces** usa la app con un banner descartable que recomienda instalarla.
- **ES-001-05** — **Dado** que la app ya está instalada y se abrió al menos una vez con conexión, **cuando** se abre desde el ícono en modo avión, **entonces** la interfaz carga completa en < 2 s y muestra el indicador "Sin conexión".
- **ES-001-06** — **Dado** que la app ya está instalada, **cuando** se abre desde el ícono, **entonces** no aparece la pantalla de instalación ni la barra del navegador.

### HU-001-2 — Navegar la app en cualquier tamaño de pantalla (Prioridad P1)

Como **usuario** quiero una navegación clara en el celular y en el PC, para llegar rápido a cada sección.
**Prueba independiente**: recorrer todas las secciones en un celular (360 px) y en un PC (1440 px), con y sin conexión.

- **ES-001-07** — **Dado** un celular (< 600 px), **cuando** abre la app, **entonces** ve una barra inferior con Inicio, Servicios, Sincronizar y Más, y el botón "+ Nuevo" flotante encima de ella.
- **ES-001-08** — **Dado** una tablet en vertical (600–1023 px), **cuando** abre la app, **entonces** ve un riel lateral angosto con íconos y etiquetas. **Dado** una pantalla de 1024 px o más, ve una barra lateral expandida con el nombre de la app, el botón "+ Nuevo" y todas las secciones, incluidas las de "Más".
- **ES-001-09** — **Dado** cualquier pantalla, **cuando** cambia la conectividad, **entonces** el indicador de la barra superior cambia entre "En línea" y "Sin conexión" en ≤ 2 s.
- **ES-001-10** — **Dado** cualquier pantalla, **cuando** hay registros pendientes de sincronizar, **entonces** la barra superior muestra el contador. Al tocarlo, lleva a Sincronizar.
- **ES-001-11** — **Dado** que el usuario entra por URL a una sección para la que su rol no tiene permiso, **cuando** carga, **entonces** ve "Sin permiso" con un botón para volver al inicio.
- **ES-001-12** — **Dado** que la configuración inicial no se ha completado, **cuando** intenta entrar a Inicio o a Servicios, **entonces** se le lleva al asistente de configuración inicial.

### HU-001-3 — Ajustar la lectura (Prioridad P2)

Como **usuario** quiero agrandar la letra, para leer bien en campo o con poca vista.

- **ES-001-13** — **Dado** Ajustes, **cuando** elige "Muy grande", **entonces** todo el texto de la app crece (vista previa en vivo), sin cortes ni desbordes horizontales en 360 px.
- **ES-001-14** — **Dado** que eligió un tamaño de fuente, **cuando** cierra y vuelve a abrir la app, **entonces** se conserva el tamaño elegido. (En v1.0 hay un solo tema visual, claro.)

### HU-001-4 — Ayuda e información de la app (Prioridad P2)

Como **usuario** quiero consultar cómo usar la app y qué versión tengo, para resolver dudas y reportar problemas.

- **ES-001-15** — **Dado** Más → Ayuda, **cuando** abre un tema (instalar, trabajar sin conexión, preguntas frecuentes), **entonces** lo lee también sin conexión.
- **ES-001-16** — **Dado** Más → Acerca de, **cuando** lo abre, **entonces** ve la versión, el identificador de build, la fecha de build, el ambiente (DEV/PRD), las novedades de la versión, la licencia y el aviso de privacidad.
- **ES-001-17** — **Dado** el ambiente DEV, **cuando** usa la app, **entonces** ve una franja "DEV" en la barra superior.

### HU-001-5 — Recibir actualizaciones sin perder trabajo (Prioridad P1)

Como **usuario** quiero que la app se actualice sola sin interrumpir lo que estoy escribiendo.

- **ES-001-18** — **Dado** que se publicó una nueva versión, **cuando** el usuario abre la app con conexión (o tras ≤ 60 min con la app abierta), **entonces** aparece "Hay una nueva versión — Actualizar".
- **ES-001-19** — **Dado** que hay un formulario con cambios sin guardar, **cuando** pulsa Actualizar, **entonces** la actualización espera ("Se actualizará al terminar") y no se recarga la app.
- **ES-001-20** — **Dado** que no hay trabajo en curso, **cuando** pulsa Actualizar, **entonces** la app se recarga con la nueva versión y Acerca de la muestra.

### HU-001-6 — Riesgos técnicos validados antes de construir (Prioridad P1)

Como **dueño del producto** quiero comprobar desde el inicio que el login, los permisos, el almacenamiento y la cámara funcionan en los dispositivos reales, para no descubrir un bloqueo al final.

- **ES-001-21** — **Dado** los 8 spikes S1–S8 (`docs/07` §F0.10), **cuando** termina la fase, **entonces** cada uno tiene un documento con el resultado, la evidencia (plataforma y versión) y la decisión. Si alguno cambia una decisión, existe su ADR nuevo.

### HU-001-7 — Identidad visual consistente y adaptable (Prioridad P1)

Como **dueño del producto** quiero que la app tenga el estilo de las pantallas de referencia y se vea bien en cualquier dispositivo, para que los usuarios la reconozcan y la usen con comodidad en el celular, la tablet o el PC.
**Prueba independiente**: comparar Inicio, Más, Ajustes e Instalar en 360, 768 y 1280 px con las pantallas de referencia (`docs/diseno/referencia/*.png`).

- **ES-001-22** — **Dado** cualquier pantalla en un celular, **cuando** se compara con la referencia, **entonces** coinciden el fondo en degradado azul-violeta con círculos decorativos, las tarjetas blancas redondeadas, el botón principal amarillo en mayúsculas, la tipografía y la barra inferior en degradado.
- **ES-001-23** — **Dado** la misma pantalla en una tablet o un PC, **cuando** se abre, **entonces** el contenido se reorganiza (más columnas, tarjetas centradas con ancho máximo, ventanas modales en lugar de hojas inferiores) sin estirarse ni dejar desplazamiento horizontal.
- **ES-001-24** — **Dado** cualquier texto o control de la interfaz, **cuando** se mide su contraste, **entonces** cumple la norma de accesibilidad AA (texto ≥ 4.5:1, controles ≥ 3:1), y todo control muestra un indicador de foco visible.
- **ES-001-25** — **Dado** que el dispositivo no tiene conexión desde la primera apertura instalada, **cuando** se abre la app, **entonces** la tipografía y los íconos se ven igual que con conexión (no dependen de servicios externos).

## 3. Casos borde

- El navegador no soporta el diálogo de instalación (Firefox o Samsung Internet antiguos): se muestran solo las instrucciones manuales.
- El usuario rechazó el diálogo de instalación: el botón sigue disponible si el navegador lo vuelve a permitir; si no, quedan las instrucciones manuales.
- Primera visita **sin** conexión: no hay nada en caché. Se muestra la página de error del navegador (inevitable). La ayuda indica que la primera apertura requiere conexión.
- La actualización llega durante una sincronización: espera a que termine.
- Una falla de una sección no debe tumbar la app: se muestra una pantalla de recuperación con "Volver al inicio".
- Tamaño de fuente "Muy grande" + zoom del navegador al 200 %: el contenido sigue usable (puede haber scroll vertical, nunca horizontal).
- Variables de configuración ausentes o inválidas en un build: pantalla de error de configuración, no una pantalla en blanco.
- Rotación del dispositivo o redimensionamiento de la ventana del PC cruzando un breakpoint: la navegación y los diálogos abiertos se adaptan sin perder lo que el usuario estaba haciendo.
- iPhone con notch o isla dinámica: la barra superior, la barra inferior y el botón flotante respetan las áreas seguras.

## 4. Requisitos funcionales

| ID        | El sistema debe…                                                                                                                                                                             | Traza                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| FR-001-01 | Poder instalarse como app en Android, iOS/iPadOS, Windows y macOS, con nombre, ícono y apertura a pantalla completa                                                                          | [RF-01]                    |
| FR-001-02 | Detectar si se ejecuta instalada y, si no, mostrar las instrucciones de instalación de la plataforma detectada                                                                               | [RF-01]                    |
| FR-001-03 | Ofrecer un botón Instalar con el diálogo nativo cuando el navegador lo permita                                                                                                               | [RF-01]                    |
| FR-001-04 | Bloquear el uso en iOS/iPadOS si no está instalada; en otras plataformas, advertir y permitir continuar                                                                                      | [RF-01, R-01]              |
| FR-001-05 | Cargar la interfaz completa sin conexión tras la primera apertura                                                                                                                            | [RNF-03, RNF-04]           |
| FR-001-06 | Proveer la navegación adaptativa (barra inferior < 600 px, riel lateral 600–1023 px, barra lateral expandida ≥ 1024 px) con las secciones de UX §2                                           | [RNF-08, ADR-0022]         |
| FR-001-07 | Mostrar siempre el estado de conexión y el número de registros pendientes                                                                                                                    | [RF-16]                    |
| FR-001-08 | Restringir secciones según la configuración inicial completada, la instalación y el rol del usuario                                                                                          | [RF-07]                    |
| FR-001-09 | Permitir elegir el tamaño de fuente (Normal, Grande, Muy grande), recordado en el dispositivo. Un solo tema visual (claro) en v1.0                                                           | [RF-20, ADR-0022]          |
| FR-001-10 | Ofrecer Ayuda consultable sin conexión y Acerca de con versión, build, fecha, ambiente, novedades, licencia y privacidad                                                                     | [RF-21]                    |
| FR-001-11 | Detectar nuevas versiones al abrir y periódicamente, avisar y aplicar la actualización solo cuando no haya trabajo sin guardar ni sincronización en curso                                    | [RF-22, RNF-16]            |
| FR-001-12 | Mostrar el ambiente (franja DEV) y una pantalla de error si la configuración del build es inválida                                                                                           | [ADR-0020]                 |
| FR-001-13 | Recuperarse de errores inesperados por sección sin perder el resto de la app                                                                                                                 | [RNF-01]                   |
| FR-001-14 | Servirse solo por HTTPS con políticas de seguridad del navegador (contenido, marcos, transporte)                                                                                             | [RNF-10]                   |
| FR-001-15 | Mostrar todos los textos en español de Colombia desde un catálogo de textos                                                                                                                  | [ADR-0022]                 |
| FR-001-16 | Documentar el resultado de los spikes S1–S8 antes de cerrar la fase                                                                                                                          | [R-02, R-03]               |
| FR-001-17 | Aplicar en todas las pantallas la identidad visual de las pantallas de referencia (colores, degradados, tipografía, íconos, formas, componentes), con los ajustes necesarios para cumplir AA | [RNF-08, RNF-09, ADR-0022] |
| FR-001-18 | Reorganizar la estructura según el ancho de pantalla: columnas de contenido, ancho máximo de tarjetas y presentación de diálogos (hoja inferior en celular, ventana modal en tablet y PC)    | [RNF-08, RNF-13, ADR-0022] |
| FR-001-19 | Ofrecer un catálogo reutilizable de componentes visuales con todos sus estados (normal, foco, deshabilitado, error), consultable en el ambiente DEV                                          | [RNF-12, ADR-0022]         |
| FR-001-20 | Funcionar con la misma apariencia sin conexión (tipografía e íconos incluidos en la app)                                                                                                     | [RNF-03]                   |

## 5. Entidades clave

- **Preferencias del usuario**: tamaño de fuente, banner de instalación descartado. Locales al dispositivo.
- **Sistema de diseño**: tokens visuales (colores, tipografía, formas, espacios) y componentes reutilizables derivados de las pantallas de referencia.
- **Información de la versión**: número de versión, identificador de build, fecha, ambiente, novedades.
- **Resultado de spike**: pregunta, plataforma y versión probadas, resultado, decisión.

## 6. Criterios de éxito

- **CE-001-01**: la app instalada abre sin conexión en < 2 s en un equipo de gama media (RNF-04).
- **CE-001-02**: Lighthouse móvil reconoce la app como instalable, con ≥ 90 en Accessibility y Best Practices.
- **CE-001-03**: el paquete inicial descargado es ≤ 350 KB comprimido (RNF-06).
- **CE-001-04**: 0 violaciones de accesibilidad serias o críticas en Inicio, Más, Ajustes, Ayuda, Acerca de e Instalar.
- **CE-001-05**: una versión publicada llega a un dispositivo de prueba en su siguiente apertura con conexión, sin intervención técnica (RNF-16).
- **CE-001-06**: 8 de 8 spikes documentados con su decisión.
- **CE-001-07**: las capturas de Inicio, Más, Ajustes, Instalar y del catálogo de componentes en 360, 768 y 1280 px están aprobadas como línea base visual por el dueño del producto, tras compararlas con la referencia.
- **CE-001-08**: 0 desplazamientos horizontales entre 320 y 1920 px de ancho.

## 7. Fuera de alcance

- Login real con Entra ID y descarga de catálogos (spec 004). Aquí los guards usan una sesión simulada.
- Datos de servicios (specs 002 y 003). Inicio muestra tarjetas vacías o un estado vacío.
- Pantalla de sincronización funcional (spec 005). Solo existe la ruta con un marcador.
- Menú técnico completo (spec 009). Solo la entrada del menú y la página del catálogo de componentes (DEV).
- Tema oscuro (backlog, ADR-0022).
- Gráficas y componentes específicos de cada funcionalidad (BarList, DonutProgress, PhotoCarousel, AmountInput, RangeCalendar…): se construyen en la spec que los usa primero, sobre los tokens y patrones definidos aquí.

## 8. Aclaraciones

| Fecha | Pregunta                                                                                                                                                                                             | Respuesta |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| —     | [NECESITA ACLARACIÓN: ¿quién es dueño de la cuenta de Cloudflare y se usará dominio propio? — por defecto: cuenta corporativa y URL `*.pages.dev` (PA-11)]                                           | —         |
| —     | [NECESITA ACLARACIÓN: ¿el tenant aplica Acceso Condicional que exija dispositivo administrado? — por defecto: no; lo confirma el spike S7 (PA-10)]                                                   | —         |
| —     | [NECESITA ACLARACIÓN: ¿logo o ícono corporativo para la app? — por defecto: ícono provisional con las iniciales "ST" en un círculo blanco sobre el degradado principal (estilo de la referencia 01)] | —         |
