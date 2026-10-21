# Stack tecnológico y preparación del PC de desarrollo (paso a paso)

> Para la persona o el agente que va a implementar la app en un PC con **Windows 10/11** (hay notas para macOS al final).
> Decisiones relacionadas: ADR-0003 (stack), ADR-0014 (hosting), ADR-0015 (git).

---

## 1. Stack completo

### 1.1 Visión general
| Capa | Tecnología | Por qué |
|---|---|---|
| Lenguaje | **TypeScript** (modo `strict`) | Tipado del dominio y menos errores en la sincronización |
| UI | **React 19** | Ecosistema maduro y buen soporte de MSAL (`@azure/msal-react`) |
| Build / dev server | **Vite** | Rápido, con plugin PWA de primer nivel |
| Componentes | **Sistema de diseño propio** (CSS Modules + tokens) sobre **React Aria Components** | Fiel a las pantallas de referencia, accesible y sin CSS-in-JS (ADR-0022, `docs/10`) |
| Tipografía e íconos | **@fontsource/montserrat**, **@material-symbols/svg-500** + **vite-plugin-svgr** | Autoalojados (offline y CSP) |
| Lint de estilos | **stylelint** | Prohíbe colores literales fuera de `tokens.css` |
| PWA / offline | **vite-plugin-pwa** (Workbox) | Manifest + service worker generados y actualización con aviso |
| Base de datos local | **Dexie 4** (IndexedDB) | Guarda registros **y** archivos (Blob), con consultas reactivas |
| Estado de UI | **Zustand** | Simple para la sesión, el progreso del sync y las preferencias |
| Formularios | **react-hook-form** + **zod** | Validación tipada y compartida con el dominio |
| Router | **React Router 7** (modo librería) | Lazy routes y guards |
| Login | **@azure/msal-browser** + **@azure/msal-react** | OAuth 2.0 + PKCE con Entra ID, cliente público |
| SharePoint | **Microsoft Graph REST v1.0** con `fetch` | Sin backend, CORS permitido |
| Imágenes | **browser-image-compression** | Redimensiona y comprime en un Web Worker |
| ZIP (respaldo) | **fflate** | Ligera y rápida |
| Listas largas | **@tanstack/react-virtual** | Virtualización |
| i18n / formato | **i18next**, **react-i18next**, **date-fns** | Textos externalizados, fechas en es-CO |
| Pruebas | **Vitest**, **Testing Library**, **fake-indexeddb**, **MSW**, **Playwright**, **axe-core** | Unitarias, integración, E2E, accesibilidad |
| Calidad | **ESLint** (flat config), **Prettier**, **husky**, **lint-staged**, **commitlint** | Sustituyen al CI/CD: controles locales obligatorios |
| Hosting | **Cloudflare Pages** + **Wrangler** CLI | Estático, gratis, HTTPS, cabeceras propias (CSP) y fallback de SPA |
| Automatizaciones | **Power Automate** (M365) | Correo de OT y alertas de vida útil sin backend |
| Plataforma de datos | **SharePoint Online** + **Microsoft Entra ID** | Ya incluidos en el tenant |

### 1.2 Paquetes npm
| Paquete | Tipo | Versión de referencia mínima* | Uso |
|---|---|---|---|
| `react`, `react-dom` | dep | 19.x | UI |
| `react-router` | dep | 7.x | Rutas |
| `react-aria-components` | dep | 1.x | Base accesible de los controles (ComboBox, Select, DatePicker, RangeCalendar, Dialog…) |
| `@internationalized/date` | dep | 3.x | Fechas para los calendarios (es-CO) |
| `@fontsource/montserrat` | dep | 5.x | Fuente autoalojada |
| `@material-symbols/svg-500` | dep | 0.x | Íconos Material Symbols Rounded (SVG) |
| `vite-plugin-svgr` | dev | 4.x | Importar los SVG como componentes React |
| `stylelint`, `stylelint-config-standard`, `stylelint-config-css-modules` | dev | 16.x | Lint de CSS y tokens |
| `@azure/msal-browser` | dep | 4.x | Autenticación |
| `@azure/msal-react` | dep | 3.x | Hooks y proveedor MSAL |
| `dexie` | dep | 4.x | IndexedDB |
| `dexie-react-hooks` | dep | 1.x | `useLiveQuery` |
| `zustand` | dep | 5.x | Estado de UI |
| `react-hook-form` | dep | 7.x | Formularios |
| `@hookform/resolvers` | dep | 5.x | Puente con zod |
| `zod` | dep | 4.x | Esquemas |
| `i18next`, `react-i18next` | dep | 25.x / 15.x | i18n |
| `date-fns` | dep | 4.x | Fechas |
| `browser-image-compression` | dep | 2.x | Fotos |
| `@tanstack/react-virtual` | dep | 3.x | Listas |
| `fflate` | dep | 0.8.x | ZIP |
| `vite` | dev | 7.x | Build |
| `@vitejs/plugin-react` | dev | 5.x | React en Vite |
| `typescript` | dev | 5.9.x | Compilador |
| `vite-plugin-pwa`, `workbox-window` | dev / dep | 1.x / 7.x | PWA |
| `vitest`, `@vitest/coverage-v8`, `jsdom` | dev | 3.x | Pruebas |
| `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | dev | 16.x / 14.x / 6.x | Pruebas de componentes |
| `fake-indexeddb` | dev | 6.x | IndexedDB en pruebas |
| `msw` | dev | 2.x | Graph simulado |
| `@playwright/test`, `@axe-core/playwright` | dev | 1.5x / 4.x | E2E + accesibilidad |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y`, `eslint-plugin-boundaries`, `eslint-config-prettier` | dev | 9.x | Lint y reglas de capas |
| `prettier` | dev | 3.x | Formato |
| `husky`, `lint-staged` | dev | 9.x / 16.x | Hooks de git |
| `@commitlint/cli`, `@commitlint/config-conventional` | dev | 19.x | Mensajes de commit |
| `commit-and-tag-version` | dev | 12.x | Versionado SemVer + CHANGELOG a partir de los commits |
| `wrangler` | dev | 4.x | Despliegue a Cloudflare Pages |
| `rollup-plugin-visualizer` | dev | 6.x | Presupuesto de bundle |
| `@types/node` | dev | 24.x | Tipos para la config de Vite |

\* **Importante sobre las versiones**: son mínimos de referencia a la fecha del diseño (oct-2026). En la Fase 0 se instala la **última versión estable** de cada paquete. Si un major nuevo cambia la API (MSAL, Dexie, React Router, vite-plugin-pwa), se revisa su guía de migración. Las versiones exactas quedan fijadas en `package-lock.json` y anotadas en la tabla §6 de este documento.

---

## 2. Requisitos previos
- Windows 10 22H2 o Windows 11, con **8 GB de RAM mínimo (16 GB recomendado)** y ~10 GB libres.
- Permisos para instalar software (o la ayuda de soporte de TI).
- Cuentas necesarias:
  - Cuenta del tenant M365 con un rol de la app asignado en DEV (para probar).
  - **Cuenta de Cloudflare** (gratuita) de la empresa (PA-11).
  - **Cuenta de GitHub** (opcional, recomendada como respaldo remoto privado del repositorio).
  - Contacto con el **administrador de Entra ID / SharePoint** para lo que pide `06-Configuracion-Tenant-M365.md`.
- Dispositivos de prueba: idealmente un Android y un iPhone/iPad reales.

---

## 3. Paso 0 — Ubicar el repositorio fuera de OneDrive
Esta carpeta está dentro de **OneDrive**. `node_modules` tiene decenas de miles de archivos: OneDrive intentará sincronizarlos, ralentizará el PC y puede corromper archivos o bloquear `npm install`.

1. Crear la carpeta de trabajo: `C:\dev\`.
2. Copiar la carpeta `ProgresiveWebApp` a `C:\dev\servicio-tecnico-pwa\` (ese será el repositorio).
3. Las guías de buenas prácticas, el Excel de campos y las pantallas de referencia **ya vienen dentro** de la carpeta (`docs/referencias/` y `docs/diseno/referencia/`). No hay que copiar nada más.
4. La copia de OneDrive queda como histórico de diseño. **La fuente de verdad pasa a ser el repositorio.**

```powershell
New-Item -ItemType Directory -Force C:\dev | Out-Null
Copy-Item -Recurse "$env:OneDrive\Desktop\Proyectos\_MejoresPracticasDlloSotfware\ProgresiveWebApp" C:\dev\servicio-tecnico-pwa
```
> Si la variable `$env:OneDrive` apunta a otra ruta (OneDrive corporativo: `OneDrive - Interlan`), usa la ruta completa que ves en el Explorador.

---

## 4. Paso 1 — Git
```powershell
winget install --id Git.Git -e
```
Cerrar y abrir la terminal. Luego:
```powershell
git --version
git config --global user.name "Tu Nombre"
git config --global user.email "tu.correo@empresa.com"
git config --global init.defaultBranch main
git config --global core.autocrlf false
git config --global pull.rebase true
```
> En el repo, `.gitattributes` con `* text=auto eol=lf` normaliza los finales de línea. Lo crea la Fase 0.

---

## 5. Paso 2 — Node.js LTS (con fnm, recomendado)
Usar **Node 24 LTS** (o la LTS activa vigente en la fecha de implementación).

**Opción A — fnm (permite cambiar de versión de Node por proyecto):**
```powershell
winget install --id Schniz.fnm -e
```
Agregar al perfil de PowerShell (`notepad $PROFILE`) esta línea, guardar y reabrir la terminal:
```powershell
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
```
Luego:
```powershell
fnm install --lts
fnm default lts-latest
node -v      # v24.x
npm -v       # 11.x
```
El repo incluirá un archivo `.node-version` con la versión exacta (fnm la usa sola al entrar a la carpeta).

**Opción B — instalador directo:**
```powershell
winget install --id OpenJS.NodeJS.LTS -e
```

Configurar npm:
```powershell
npm config set fund false
npm config set audit-level high
```

---

## 6. Paso 3 — Visual Studio Code y extensiones
```powershell
winget install --id Microsoft.VisualStudioCode -e
```
Extensiones:
```powershell
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension vitest.explorer
code --install-extension ms-playwright.playwright
code --install-extension usernamehw.errorlens
code --install-extension yoavbls.pretty-ts-errors
code --install-extension streetsidesoftware.code-spell-checker
code --install-extension streetsidesoftware.code-spell-checker-spanish
code --install-extension bierner.markdown-mermaid
code --install-extension eamodio.gitlens
code --install-extension lokalise.i18n-ally
code --install-extension stylelint.vscode-stylelint
code --install-extension clinyong.vscode-css-modules
```
| Extensión | Para qué |
|---|---|
| ESLint / Prettier | Lint y formato al guardar |
| Vitest Explorer / Playwright Test | Ejecutar y depurar pruebas desde el editor |
| Error Lens / Pretty TS Errors | Errores legibles en línea |
| Code Spell Checker (+ español) | Ortografía en textos y documentación |
| Markdown Mermaid | Ver los diagramas de `docs/` |
| GitLens | Historial de git |
| i18n Ally | Ver y editar las traducciones `es-CO` en línea |

El repo incluirá `.vscode/settings.json` (formatear al guardar, ESLint como corrector) y `.vscode/extensions.json` (recomendaciones).

---

## 7. Paso 4 — Navegadores
- **Microsoft Edge**: ya viene con Windows.
- **Google Chrome**: `winget install --id Google.Chrome -e`
- Playwright instala sus propios navegadores (Chromium, WebKit, Firefox) en el paso 9.

Herramientas útiles en DevTools (F12) → **Application**: *Manifest*, *Service workers* (Update on reload, Offline), *Storage* (IndexedDB y uso de cuota) y *Network* → *Offline* para simular la falta de conexión.

---

## 8. Paso 5 — Pruebas en dispositivos reales

### 8.1 Android (USB, sin desplegar)
```powershell
winget install --id Google.PlatformTools -e
```
1. En el teléfono: Ajustes → Acerca del teléfono → tocar 7 veces "Número de compilación" → Opciones de desarrollador → **Depuración USB** activada.
2. Conectar por USB y aceptar la huella del PC.
3. Redirigir el puerto (así el teléfono ve `localhost`, que el navegador considera un contexto seguro y en el que funcionan SW, cámara y login):
   ```powershell
   adb devices
   adb reverse tcp:5173 tcp:5173
   adb reverse tcp:4173 tcp:4173
   ```
4. En Chrome del teléfono, abrir `http://localhost:5173`. Para depurar, en el PC abrir `chrome://inspect/#devices`.

### 8.2 iPhone / iPad
iOS no permite el truco de `localhost`. Para probar se despliega al ambiente **DEV (preview)** de Cloudflare (`npm run deploy:dev`) y se abre `https://dev.<proyecto>.pages.dev` en Safari. Para depurar se necesita un Mac (Safari → Desarrollo). Sin Mac, se usa el **menú técnico → Registros** de la app.

---

## 9. Paso 6 — Cloudflare (hosting)
Wrangler se instala como dependencia de desarrollo del proyecto (no globalmente). Cuando el proyecto exista:
```powershell
npx wrangler login                     # abre el navegador para autorizar
npx wrangler pages project create servicio-tecnico-pwa --production-branch main
```
Detalle del despliegue en `09-Despliegue-Operacion-y-Soporte.md`.

---

## 10. Paso 7 — GitHub (opcional, recomendado como respaldo remoto)
```powershell
winget install --id GitHub.cli -e
gh auth login
```
Repositorio **privado**. Activar *Dependabot alerts* (funciona sin CI/CD). No se configuran GitHub Actions en v1.0 (ADR-0015).

---

## 11. Paso 8 — PowerShell 7 + PnP.PowerShell (opcional, para aprovisionar SharePoint por script)
Solo si el desarrollador o el administrador va a crear las listas con el script `scripts/provision-sharepoint.ps1` (Fase 4):
```powershell
winget install --id Microsoft.PowerShell -e
pwsh
Install-Module PnP.PowerShell -Scope CurrentUser
```
> PnP.PowerShell 2.x/3.x exige **su propio App Registration** para iniciar sesión (`Register-PnPEntraIDAppForInteractiveLogin`), que debe crear un administrador. Si eso no es posible, las listas se crean a mano siguiendo `06-Configuracion-Tenant-M365.md` §3.

---

## 12. Paso 9 — Crear el proyecto (lo ejecuta la Fase 0 del plan)
Desde `C:\dev\servicio-tecnico-pwa` (que ya contiene `docs/`, `README.md` y `CLAUDE.md`):

```powershell
git init
# Andamiaje de Vite en un directorio temporal y copia al repo (para no pisar docs/README/CLAUDE)
npm create vite@latest _scaffold -- --template react-ts
Copy-Item -Recurse -Force _scaffold\* . -Exclude README.md
Remove-Item -Recurse -Force _scaffold

# Dependencias de la app
npm install react-router react-aria-components @internationalized/date `
  @fontsource/montserrat @material-symbols/svg-500 `
  @azure/msal-browser @azure/msal-react dexie dexie-react-hooks zustand `
  react-hook-form @hookform/resolvers zod i18next react-i18next date-fns `
  browser-image-compression @tanstack/react-virtual fflate workbox-window

# Dependencias de desarrollo
npm install -D vite-plugin-pwa vite-plugin-svgr stylelint stylelint-config-standard stylelint-config-css-modules vitest @vitest/coverage-v8 jsdom `
  @testing-library/react @testing-library/user-event @testing-library/jest-dom `
  fake-indexeddb msw @playwright/test @axe-core/playwright `
  eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh `
  eslint-plugin-jsx-a11y eslint-plugin-boundaries eslint-config-prettier prettier `
  husky lint-staged @commitlint/cli @commitlint/config-conventional commit-and-tag-version `
  wrangler rollup-plugin-visualizer @types/node

# Navegadores de Playwright
npx playwright install

# Hooks de git
npx husky init
```
> Si `npm create vite` hace preguntas interactivas (por ejemplo, si quieres usar una variante experimental o "instalar y arrancar ahora"), responde con la opción estándar y **No** a instalar y arrancar.

El resto de la configuración (`vite.config.ts`, ESLint con reglas de capas, scripts de `package.json`, `.env.*`, `public/_headers`, íconos) se describe en la Fase 0 de `07-Plan-de-Implementacion.md`.

---

## 13. Paso 10 — (Opcional) Agente de IA y Spec Kit
Si la implementación la hace un agente (p. ej., Claude Code):
- Abrir VS Code en `C:\dev\servicio-tecnico-pwa`. El agente debe leer primero `CLAUDE.md` y `.specify/memory/constitution.md`.
- Pedir **una spec a la vez** ("Implementa `specs/001-fundacion-pwa` siguiendo su tasks.md") y revisar el `git diff` antes de cada merge.

**GitHub Spec Kit (opcional).** La estructura `specs/` y `.specify/` ya es compatible, así que no hace falta para trabajar. Si se quieren los comandos `/speckit.specify`, `/speckit.clarify`, `/speckit.plan`, `/speckit.tasks` y `/speckit.implement` para funcionalidades nuevas:
```powershell
winget install --id astral-sh.uv -e
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
specify check
# Dentro del repo, sin sobrescribir la constitución ni las specs existentes:
specify init --here --ai claude
```
> Revisa con `git diff` lo que `specify init` cree o cambie y conserva la constitución y las specs de este repositorio. Las opciones de la CLI pueden variar entre versiones: consulta `specify --help`.

---

## 14. Verificación del entorno
Ejecutar y comprobar que todo responde:
```powershell
git --version
node -v
npm -v
code --version
adb version            # si se instaló
npx wrangler --version # dentro del proyecto
npx playwright --version
```
Lista de verificación:
- [ ] El repositorio está en `C:\dev\servicio-tecnico-pwa` (fuera de OneDrive).
- [ ] Node LTS activo y `.node-version` en el repo.
- [ ] VS Code con las extensiones.
- [ ] Chrome y Edge instalados.
- [ ] `npm run dev` abre la app en `http://localhost:5173` (después de la Fase 0).
- [ ] El teléfono Android ve la app vía `adb reverse` (opcional).
- [ ] `npx wrangler whoami` muestra la cuenta de Cloudflare de la empresa.
- [ ] Las credenciales públicas de DEV (`tenantId`, `clientId`, hostname y ruta del sitio) están en `.env.development`.

---

## 15. Notas para macOS
- Gestor de paquetes: Homebrew (`brew install git fnm`; `brew install --cask visual-studio-code google-chrome android-platform-tools`).
- Mismos pasos de Node (fnm), VS Code, extensiones y Wrangler.
- En Mac se puede depurar el iPhone por cable: iPhone → Ajustes → Safari → Avanzado → Inspector web; en el Mac, Safari → Desarrollo → [dispositivo].

---

## 16. Versiones instaladas (llenar en la Fase 0)
| Herramienta / paquete | Versión instalada | Fecha |
|---|---|---|
| Node.js | | |
| npm | | |
| react | | |
| vite | | |
| react-aria-components | | |
| @azure/msal-browser | | |
| dexie | | |
| vite-plugin-pwa | | |
| react-router | | |
| zod | | |
| vitest | | |
| @playwright/test | | |
| wrangler | | |
