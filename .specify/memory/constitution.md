# Constitución del proyecto — Servicio Técnico de Baterías y Cargadores (PWA)

> Principios **no negociables** que toda especificación (`specs/*/spec.md`), plan (`plan.md`) y tarea (`tasks.md`) debe respetar. Cada `plan.md` incluye una sección "Verificación de la constitución" que revisa uno por uno estos artículos.
> Versión: 1.1.0 (Art. VIII ampliado con el sistema de diseño, ADR-0022) · Ratificada: 2026-10-21 · Fuente: ADR-0001…0022 y `docs/referencias/Ambientes/` (guía de buenas prácticas del usuario).

## Artículo I — Offline primero
Toda funcionalidad de captura y consulta funciona **sin conexión** usando los datos locales. La red solo se usa en la configuración inicial, la sincronización, la consulta de adjuntos remotos y la actualización de la app. Una funcionalidad que no puede operar offline debe declararlo en su spec y justificarlo.

## Artículo II — Cero pérdida de datos
Ningún flujo (migración, purga, logout, actualización, error, cancelación) puede eliminar un registro o archivo con `syncState ≠ 'synced'`. Cada spec que toque persistencia incluye un criterio de aceptación de no-pérdida, y cada plan, una prueba que lo verifique.

## Artículo III — Sin backend y sin secretos
No se crean servidores, funciones, proxies ni bases de datos fuera de SharePoint. El cliente solo contiene valores públicos (`tenantId`, `clientId`, URLs). Se prohíben los secretos, certificados y el flujo *client credentials*. Las automatizaciones del servidor se hacen solo con Power Automate (ADR-0013).

## Artículo IV — Identidad confirmada al subir
Ningún dato se escribe en SharePoint sin una sesión Entra ID vigente **y** una confirmación explícita del usuario en ese momento (ADR-0006). La escritura usa siempre el token delegado del usuario.

## Artículo V — Idempotencia
Toda operación remota es reintentable sin duplicar efectos: IDs generados en el dispositivo (UUID v4), `ServicioId` único, nombres de archivo deterministas con `conflictBehavior=replace` y búsqueda antes de crear.

## Artículo VI — Dominio puro y capas
Las reglas de negocio viven en `src/domain` (sin React, Dexie, MSAL ni `fetch`) y se orquestan en `src/application` mediante puertos. Toda E/S está en `src/infrastructure`. Las reglas de ESLint lo hacen cumplir (ADR-0004).

## Artículo VII — Pruebas primero en lo crítico
Para `domain/` y `application/` las pruebas se escriben **antes** de la implementación (las tareas de prueba preceden a las de código en `tasks.md`). Cobertura ≥ 90 % en esas capas, 100 % en la máquina de estados y ≥ 70 % global. Toda historia tiene al menos un escenario E2E o de integración.

## Artículo VIII — Accesible, responsive y en español
Mobile-first, WCAG 2.2 AA, objetivos táctiles ≥ 44 px, tamaño de fuente escalable. Ningún texto de UI va escrito directamente en el código (i18n `es-CO`). Toda pantalla usa **solo** los tokens y componentes del sistema de diseño (`docs/10-Sistema-de-Diseno.md`, ADR-0022), sigue su pantalla de referencia y se adapta a los breakpoints compacto, medio y expandido. Se verifica con axe y capturas en 360, 768 y 1280 px.

## Artículo IX — Seguridad del cliente
CSP estricta, sin scripts de terceros en tiempo de ejecución, sin `dangerouslySetInnerHTML`, permisos mínimos (`Sites.Selected`), datos sensibles fuera de los logs y `npm audit` limpio antes de cada release.

## Artículo X — Simplicidad
Sin dependencias nuevas, capas o abstracciones que no exija una spec. Toda dependencia nueva o desviación de un ADR requiere un ADR nuevo y una entrada en "Seguimiento de complejidad" del plan correspondiente.

## Artículo XI — Trazabilidad y decisiones
Cada requisito de una spec referencia su RF/RNF del PRD. Cada decisión de arquitectura nueva genera un ADR. Un ADR `Aceptado` nunca se edita: se reemplaza.

## Gobernanza
- Esta constitución prevalece sobre specs, planes y tareas. En caso de conflicto, se corrige el artefacto, no la constitución.
- Enmiendas: solo el dueño del producto, con un ADR que la justifique y un aumento de versión (MAJOR si se elimina o redefine un artículo, MINOR si se agrega uno, PATCH si es redacción).
- Flujo de trabajo de cada funcionalidad: **specify → clarify → plan → tasks → implement → verify** (ver `specs/README.md`).
