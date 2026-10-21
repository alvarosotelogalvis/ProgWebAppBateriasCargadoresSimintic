# Índice — Guía para Agentes de IA por Ambiente/Tipo de Aplicación

> Este índice y los archivos de esta carpeta se derivan de `../MejoresPracticasDesarrolloSoftwareYApis.md` (documento base). Cada archivo toma del documento base lo que aplica a un tipo de aplicación específico, lo adapta y agrega lo que ese ambiente necesita puntualmente.

## 0. Instrucciones para el agente de IA

Antes de generar, diseñar o modificar código de una aplicación en este proyecto (o en cualquier proyecto donde se referencie esta carpeta):

1. **Identifica el tipo de aplicación** que se va a construir (web, escritorio, móvil, nube/backend, o una combinación).
2. **Lee el archivo `01-Comun-Transversal.md`** — aplica siempre, sin importar el tipo de app.
3. **Lee el archivo `07-ADR-Decisiones-Arquitectura.md`** — aplica siempre. Revisa `docs/adr/` del proyecto (créalo con `ADR-0001` si no existe) antes de preguntar o tomar decisiones de diseño.
4. **Lee el/los archivo(s) específico(s)** del ambiente correspondiente (ver tabla abajo). Si la app combina ambientes (ej. app móvil que consume una API en la nube), lee todos los que apliquen.
5. **No asumas las decisiones marcadas con 🔶** ("Decisión requerida"). Pregúntale al usuario explícitamente antes de elegir stack, arquitectura o patrones. Si el usuario ya definió algo en un ADR vigente, `CLAUDE.md`, `README.md` o spec del proyecto, respétalo en vez de volver a preguntar.
6. **Registra cada decisión tomada en un ADR** (`docs/adr/`) y actualiza `CLAUDE.md` / `README.md` / el spec del proyecto con un resumen y el enlace al ADR (ver secciones 2 y 6.4 del documento base). Si una decisión cambia, crea un ADR nuevo que reemplace al anterior — nunca reescribas un ADR aceptado.
7. Si el proyecto expone o consume una API, revisa también `03-API-Backend.md` — es el núcleo compartido por casi todos los ambientes.
8. Antes de dar por lista una app para producción, valida contra el checklist de la sección 5 del documento base, el checklist final de cada archivo de ambiente y el checklist ADR de `07-ADR-Decisiones-Arquitectura.md`.

## 1. Mapa de archivos

| Archivo | Cuándo usarlo | Ejemplos de stack típico |
|---|---|---|
| [01-Comun-Transversal.md](01-Comun-Transversal.md) | **Siempre**, en cualquier tipo de app | N/A (aplica a todos) |
| [02-App-Web.md](02-App-Web.md) | Apps que se consumen desde un navegador | React, Angular, Vue, Svelte, Next.js, Blazor |
| [03-API-Backend.md](03-API-Backend.md) | Cualquier app que expone o consume una API/servicio backend | Node/Express/NestJS, .NET, Java Spring, Python FastAPI/Django |
| [04-App-Escritorio.md](04-App-Escritorio.md) | Apps instalables en Windows/macOS/Linux | Electron, .NET (WPF/WinForms/MAUI), Qt, Tauri, JavaFX |
| [05-App-Movil.md](05-App-Movil.md) | Apps para iOS/Android | Swift/Kotlin nativo, React Native, Flutter, .NET MAUI |
| [06-App-Nube-CloudNative.md](06-App-Nube-CloudNative.md) | Servicios/backends pensados para la nube (microservicios, serverless, contenedores) | Kubernetes, Azure/AWS/GCP, Docker, Terraform/Bicep |
| [07-ADR-Decisiones-Arquitectura.md](07-ADR-Decisiones-Arquitectura.md) | **Siempre**, en cualquier tipo de app: registro y actualización de decisiones de arquitectura/diseño | N/A (aplica a todos) — plantillas en [Plantillas/](Plantillas/) |

## 2. Combinaciones comunes

- **App web tradicional con backend propio**: `01` + `07` + `02` + `03` (+ `06` si el backend corre en la nube con arquitectura cloud-native).
- **App móvil con backend en la nube**: `01` + `07` + `05` + `03` + `06`.
- **App de escritorio que sincroniza con un backend**: `01` + `07` + `04` + `03` (+ `06`).
- **Solo un servicio/API sin frontend propio**: `01` + `07` + `03` (+ `06` si aplica).

En combinaciones, los ADR mínimos de cada ambiente se suman en un único `docs/adr/` por repositorio (o uno por repositorio si frontend y backend viven en repos separados, enlazando entre ellos las decisiones compartidas).

## 3. Principio general

Ningún archivo de esta carpeta reemplaza el documento base (`../MejoresPracticasDesarrolloSoftwareYApis.md`); son **recortes especializados** de él. Si hay una duda o un punto no cubierto aquí, el documento base es la fuente de verdad. Las secciones marcadas **[Generado por Claude]** no estaban en las notas originales del usuario; se agregaron como recomendaciones complementarias siguiendo la misma convención del documento base.
