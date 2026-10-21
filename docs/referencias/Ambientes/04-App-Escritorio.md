# Buenas Prácticas — Aplicaciones de Escritorio

> El documento base no tenía una sección dedicada a escritorio; este archivo **[Generado por Claude]** adapta los principios transversales del documento base (arquitectura, seguridad, calidad, menús) y agrega las prácticas específicas de este ambiente. Léase junto con `01-Comun-Transversal.md` y, si la app tiene backend/sincronización, `03-API-Backend.md`.

## 1. Alcance
Apps instalables en Windows, macOS y/o Linux: utilitarios, herramientas internas, POS, apps con acceso a hardware/sistema de archivos local, etc.

## 2. Decisiones clave 🔶
- Tecnología: Electron/Tauri (web-based), .NET (WPF, WinForms, MAUI), Qt/C++, JavaFX, u otra — depende de si se reutiliza stack web, se requiere rendimiento nativo, o multiplataforma real.
- ¿Necesita funcionar offline / con datos locales? → definir estrategia de sincronización con backend (ver `03-API-Backend.md`).
- ¿Un solo ejecutable por SO o instalador distribuido por tienda (Microsoft Store, Mac App Store)?
- Mecanismo de actualización: auto-update silencioso vs. notificación manual.
- SO soportados y versiones mínimas (Windows 10/11, macOS N-2, distros Linux soportadas).

### 2.1 Registro de decisiones (ADR) — obligatorio
Cada decisión anterior, una vez respondida, se registra como ADR en `docs/adr/` (proceso y plantilla en `07-ADR-Decisiones-Arquitectura.md`). Si la decisión cambia, se crea un ADR nuevo que reemplaza al anterior. ADR mínimos para una app de escritorio, además de los transversales:
- [ ] Tecnología de escritorio (Electron/Tauri, .NET WPF/WinForms/MAUI, Qt, JavaFX…).
- [ ] Sistemas operativos y versiones mínimas soportadas.
- [ ] Almacenamiento local y estrategia offline/sincronización con backend.
- [ ] Formato de empaquetado y canal de distribución (instalador, tienda, portable).
- [ ] Mecanismo de actualización (ver sección 3.0).
- [ ] Firma de código y manejo de credenciales locales (ver sección 5).
- [ ] Patrón de arquitectura de UI (MVVM, MVC, etc.).

## 3. Empaquetado y distribución

### 3.0 Mecanismo de actualización 🔶 (preguntar siempre, no asumir)
Confirmar con el usuario cómo se va a actualizar/distribuir la app (se pueden combinar según el público):

| Opción | Cuándo conviene |
|---|---|
| `git clone` / `git pull` + rebuild | Equipo técnico, uso interno, entornos de desarrollo/staging. |
| Paquete de gestor (npm/NuGet/pip/choco/winget/Homebrew) | Usuarios técnicos, CLIs, herramientas de desarrollador. |
| Instalador (MSI/MSIX/EXE en Windows, DMG/PKG en macOS, AppImage/DEB/RPM en Linux) | Usuarios finales no técnicos; instalación/actualización manual guiada. |
| Auto-actualización integrada (electron-updater, Squirrel.Windows, Sparkle) | Minimizar fricción: la app se actualiza sola en segundo plano. |
| Distribución por tienda (Microsoft Store, Mac App Store) | Cuando se quiere que la tienda gestione la actualización y la distribución. |

Ver también documento base, sección 19.1.

- [ ] Instalador por plataforma: MSI/MSIX/EXE (Windows), DMG/PKG (macOS), AppImage/DEB/RPM (Linux).
- [ ] Firma de código (code signing) para evitar advertencias de "publisher no confiable" y permitir notarización en macOS.
- [ ] Auto-actualización con verificación de firma/integridad del paquete antes de instalar (evitar actualizar con binarios no verificados).
- [ ] Versionado semántico visible en el menú "Acerca de" (ver doc. base, sección 2 — menú con versión de la app).

## 4. Arquitectura y estado local
- [ ] Separación clara entre capa de UI, lógica de negocio y acceso a datos (ver doc. base, sección 6 — Hexagonal/Clean Architecture aplican también a desktop).
- [ ] Manejo de múltiples ventanas/diálogos sin duplicar ni perder estado.
- [ ] Persistencia local: SQLite, LiteDB, archivos locales cifrados según sensibilidad del dato.
- [ ] Si sincroniza con un backend: estrategia de conflicto (last-write-wins, merge, versionado), cola de operaciones pendientes si está offline.

## 5. Seguridad específica de escritorio
- [ ] Secretos/tokens de sesión guardados en el almacén seguro del SO (Windows Credential Manager, macOS Keychain, `libsecret` en Linux) — nunca en texto plano en disco.
- [ ] Validar y sanitizar cualquier entrada que dispare comandos del sistema o acceso a archivos (evitar path traversal / command injection).
- [ ] Si empaqueta con tecnología web (Electron/Tauri): `contextIsolation` habilitado, `nodeIntegration` deshabilitado en el renderer, CSP aplicada igual que en `02-App-Web.md`.
- [ ] Principio de menor privilegio: no ejecutar la app con permisos de administrador salvo que sea estrictamente necesario.

## 6. UX y menús (doc. base, sección 2)
- [ ] Menú con información de versión de la app.
- [ ] Menú de ayuda/uso para el usuario final.
- [ ] Menú de configuración inicial (primer arranque) con transición clara a modo producción.
- [ ] Menú diferenciado para técnico/soporte vs. usuario final.
- [ ] Opción de tamaño de fuente / accesibilidad visual.

## 7. Accesibilidad y usabilidad
- [ ] Navegación completa por teclado y atajos (shortcuts) documentados.
- [ ] Soporte de lectores de pantalla del SO (labels/roles accesibles del framework UI usado).
- [ ] Feedback claro de estados: cargando, error, éxito, deshabilitado.

## 8. Rendimiento
- [ ] Tiempo de arranque (cold start) medido y optimizado.
- [ ] Uso de memoria/CPU acotado, especialmente en apps que corren en segundo plano o en bandeja del sistema (system tray).
- [ ] Liberación correcta de recursos (handles de archivos, conexiones) al cerrar.

## 9. Manejo de errores y monitoreo
- [ ] Captura global de excepciones no manejadas (evitar crash silencioso).
- [ ] Reporte de crashes con contexto (versión, SO, stack trace) hacia un sistema centralizado (ej. Sentry desktop SDK) — con consentimiento del usuario si incluye datos sensibles.
- [ ] Logs locales rotados (no crecer indefinidamente) y opción de exportarlos para soporte técnico.

## 10. Testing
- [ ] Pruebas unitarias de la lógica de negocio (independiente del framework de UI).
- [ ] Pruebas de UI automatizadas (ej. WinAppDriver, Playwright para Electron, XCUITest-equivalentes según stack).
- [ ] Pruebas manuales/exploratorias por SO objetivo antes de cada release.

## 11. Ver también
- `07-ADR-Decisiones-Arquitectura.md` (registro obligatorio de decisiones de arquitectura/diseño)
- `01-Comun-Transversal.md`
- `03-API-Backend.md` (si sincroniza con backend)
- Documento base: `../MejoresPracticasDesarrolloSoftwareYApis.md`, secciones 2, 6, 7, 23
