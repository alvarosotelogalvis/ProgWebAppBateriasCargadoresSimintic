# Buenas Prácticas Transversales (aplican a TODO tipo de aplicación)

> Derivado de `../MejoresPracticasDesarrolloSoftwareYApis.md`. Este archivo se debe leer siempre, sin importar si la app es web, escritorio, móvil o un servicio en la nube. Los archivos específicos de ambiente (`02-...` a `06-...`) complementan esto, no lo repiten.

## 0. Cómo usarlo un agente de IA
Antes de escribir código, valida con el usuario cada punto marcado 🔶. Registra cada respuesta como un **ADR** en `docs/adr/` (ver `07-ADR-Decisiones-Arquitectura.md`) y un resumen en `CLAUDE.md`/`README.md`/spec del proyecto para no volver a preguntar en futuras sesiones (ver doc. base, secciones 2 y 6.4).

---

## 1. Planificación (doc. base, sección 1)
- 🔶 Requerimientos funcionales y no funcionales claros antes de codear.
- 🔶 Lenguaje, framework, stack y patrón de arquitectura (monolítico, microservicios, modular por servicios) — **no asumir por defecto**, preguntar o inferir de lo ya existente en el repo.
- Definir un skill/prompt base para agentes de IA que asistan en el desarrollo de este proyecto en particular (si aplica).

## 2. Documentación y menús (doc. base, sección 2)
- Mantener y **actualizar constantemente**: `CLAUDE.md`, `README.md`, plan/spec del proyecto.
- Si la app tiene UI con menús, considerar: versión de la app, ayuda/uso, configuración inicial → paso a producción, menú técnico vs. menú de usuario, tamaño de fuente, información de la app.
- Documentar la arquitectura del sistema (diagramas y decisiones).
- **ADR obligatorios** en `docs/adr/` como documento de arquitectura y diseño: un ADR por decisión, índice en `docs/adr/README.md`, y ante un cambio de decisión se crea un ADR nuevo que reemplaza al anterior (nunca se reescribe). ADR mínimos transversales y proceso completo en `07-ADR-Decisiones-Arquitectura.md`.

## 3. Seguridad transversal (doc. base, secciones 4.2–4.7, 4.23, 7, 8)

### 3.0 Mecanismo de login 🔶 (doc. base, sección 7.1 — **preguntar siempre, no asumir**)
Antes de implementar cualquier login, pregúntale al usuario cuál(es) de estas opciones quiere (se pueden combinar):

| Opción | Descripción |
|---|---|
| Usuario y contraseña | Login clásico. |
| Usuario y contraseña + OTP por correo | Código de un solo uso enviado al correo tras validar la contraseña. |
| Usuario y contraseña + token (JWT) | Se emite un token tras el login para las siguientes peticiones. |
| OTP por SMS | Código de un solo uso por mensaje de texto. |
| Autenticador TOTP (Google Authenticator/Authy) | Segundo factor por app, sin depender de red. |
| Social login / OAuth 2.0 (Google, Microsoft, Apple) | Autenticación delegada a un proveedor externo. |
| SSO / SAML / OpenID Connect empresarial | Integración con el IdP corporativo (Entra ID, Okta). |
| Magic link por correo | Enlace de un solo uso, sin contraseña. |
| Passwordless / WebAuthn (passkeys, FIDO2) | Sin contraseña, con llave del dispositivo o biometría. |
| Biometría nativa (Face ID/Touch ID, huella) | Segundo factor o desbloqueo local en móvil/escritorio. |

Detalle completo de cada opción y cuándo conviene: ver documento base, sección 7.1.

- Autenticación (mecanismo backend/API): OAuth 2.0, OpenID Connect, JWT firmado, API Keys, mTLS para integraciones B2B críticas.
- Autorización: definir qué puede **consultar**, qué puede **modificar** y qué información **le pertenece** a cada rol (RBAC, y ABAC si se necesita granularidad por atributos).
- Validación de entradas: tipos, longitudes, formatos, regex; usar JSON Schema donde aplique.
- Protección contra inyección: SQL Injection, NoSQL Injection, Command Injection.
- Protección contra XSS, CSRF y vulnerabilidades conocidas (OWASP).
- Gestión de secretos: Azure Key Vault, AWS Secrets Manager, HashiCorp Vault — **nunca** secretos en código ni en control de versiones.
- Cifrado: TLS en tránsito; AES-256 en reposo para contraseñas, tokens, PII y datos financieros.
- JWT seguros: validar siempre firma, issuer, audience y expiración.
- Gestión de vulnerabilidades propias y de dependencias de terceros (escaneo periódico).

## 4. Base de datos (doc. base, sección 9)
- 🔶 Motor y modelo de datos (relacional, documental, híbrido, SharePoint/Dataverse si aplica).
- Definir restricciones de integridad (constraints, claves foráneas, validaciones a nivel de esquema).
- Estrategia de caché: Redis, Memory Cache, CDN.
- Si hay operaciones asíncronas entre local y remoto, considerar una base de datos híbrida.
- Backups: frecuencia, almacenamiento y prueba periódica de restauración (sección 21).

## 5. Variables de entorno y secretos (doc. base, sección 10)
- Separar configuración por ambiente (dev, staging, QA, producción) vía `.env` o archivos de configuración JSON.
- Nunca commitear archivos `.env` con valores reales; usar `.env.example`.

## 6. Webhooks y servicios externos (doc. base, secciones 11–12)
- Diseño seguro de webhooks entrantes/salientes: validación de firma/origen, idempotencia, reintentos controlados.
- Consumo de APIs externas y envío de correos: manejar timeouts, reintentos con backoff y errores de forma explícita.

## 7. CI/CD (doc. base, sección 13)
- Integración continua: build + pruebas automáticas en cada push/PR.
- Despliegue continuo con control de versiones (Git Flow, Trunk-Based Development, u otro modelo definido — 🔶 definir cuál usa el equipo).
- Code review obligatorio antes de merge, linters y formatters.
- Feature flags para despliegues progresivos (canary, rollback rápido sin redeploy).

### 7.1 Manejo de cambios y fixes en git si el desarrollo es colaborativo 🔶 (doc. base, sección 25 — preguntar siempre, no asumir)
Si más de una persona/agente va a tocar el mismo repositorio, confirmar antes de crear ramas o PRs:

| Modelo | Cuándo conviene |
|---|---|
| Git Flow (`develop`, `feature/*`, `release/*`, `hotfix/*`, `main`) | Releases programados o varias versiones soportadas en paralelo. |
| GitHub Flow (`feature/*` corta desde `main` → PR → merge) | Despliegue continuo, una sola versión "viva". |
| Trunk-Based Development (ramas muy cortas o commits directos a `main` + feature flags) | Equipos maduros en CI/CD, despliegues muy frecuentes. |
| GitLab Flow (con ramas por ambiente/release) | Se necesita trazabilidad por ambiente además de entrega continua. |

Reglas recomendadas independientemente del modelo:
- Nomenclatura de ramas por tipo (`feature/`, `fix/`, `hotfix/`, `chore/`, `docs/`) con referencia al ticket.
- Convención de commits (ej. Conventional Commits) para changelog y versionado semántico automáticos.
- PR obligatorio con al menos 1 revisor y CI en verde antes de mergear a `main`/`develop`.
- Ramas protegidas: sin push directo ni force-push.
- Hotfix de producción: rama desde el commit/tag en producción, fix mínimo, merge a `main` **y** back-merge a `develop`/ramas activas, tag de versión patch.
- Ramas de vida corta, actualizadas frecuentemente contra la rama base para minimizar conflictos.

Detalle completo: ver documento base, sección 25.

## 8. Pruebas (doc. base, sección 14)
- Unitarias, integración, end-to-end (E2E), carga y seguridad — adaptadas al tipo de app (ver archivo de ambiente específico para el detalle de herramientas).

## 9. Monitoreo y observabilidad (doc. base, sección 15, y 4.14–4.17)
- Logging: registrar usuario, endpoint/acción, IP, tiempo, resultado.
- Métricas: requests/segundo, latencia, error rate, CPU, memoria.
- Trazabilidad: Correlation ID (`X-Correlation-Id`) que viaje entre servicios/llamadas.
- Alertas cuando: latencia > 2s, error rate > 5%, CPU > 80% (ajustar umbrales al SLA real del proyecto).

## 10. Rendimiento y compatibilidad general (sección 17)
- Rendimiento general, compatibilidad de dispositivos/entornos, accesibilidad, analítica de uso.

## 11. Términos, licencias y mantenimiento (secciones 18–19)
- Contrato de términos y condiciones, licencia de software.
- Actualización periódica de dependencias; documentar SO/plataformas soportadas.

### 11.1 Mecanismo de actualización de la app 🔶 (doc. base, sección 19.1 — preguntar siempre, no asumir)

| Opción | Cuándo conviene |
|---|---|
| `git clone` / `git pull` | Servidores propios, herramientas internas, equipo técnico administra su propio despliegue. |
| Paquete (npm, NuGet, pip, apt/choco, imagen de contenedor) | Librerías, CLIs, servicios instalados vía gestor de paquetes estándar. |
| Instalador (MSI/EXE, DMG/PKG, AppImage/DEB/RPM) | Apps de escritorio para usuarios no técnicos. |
| Auto-actualización integrada (electron-updater, Squirrel, Sparkle) | Apps de escritorio que buscan minimizar fricción de actualización manual. |
| Distribución por tienda (Store/Play/App Store) | Apps de escritorio/móvil publicadas en tiendas oficiales. |
| Pipeline de CI/CD | Apps web/servicios backend con despliegue automático. |
| Imagen de contenedor versionada (Docker) | Servicios cloud-native/microservicios. |

Detalle completo: ver documento base, sección 19.1, y `04-App-Escritorio.md` (sección 3) si aplica a una app de escritorio.

## 12. Reportes, backups y gestión de usuarios (secciones 20–22)
- Reportes/informes generados por la app: formato, periodicidad, destinatarios.
- Backups: frecuencia, almacenamiento, prueba de restauración.
- Gestión de usuarios, roles y logs de acciones; diferenciar colaboradores/administradores de usuarios finales.

## 13. Atributos de calidad (ISO/IEC 25010) — doc. base, sección 23
Usar como checklist de no-funcionales al planear cualquier app:
- Funcionalidad (adecuación, exactitud, interoperabilidad).
- Fiabilidad (madurez, disponibilidad/SLA, tolerancia a fallos, recuperabilidad).
- Usabilidad (aprendizaje, protección de errores del usuario, estética, accesibilidad).
- Eficiencia de desempeño (tiempos de respuesta, uso de recursos, capacidad/throughput).
- Mantenibilidad (modularidad, reusabilidad, analizabilidad, testabilidad).
- Portabilidad (adaptabilidad a entornos, facilidad de instalación, reemplazo de componentes).
- Compatibilidad (coexistencia, interoperabilidad de datos/protocolos).
- Seguridad como atributo transversal (CIA: confidencialidad, integridad, disponibilidad; no repudio; autenticidad/trazabilidad).

## 14. SDLC (doc. base, sección 24)
- 🔶 Metodología: Waterfall (requerimientos estables) vs. Ágil (Scrum/Kanban/XP) vs. Lean vs. DevOps/DevSecOps.
- Definition of Ready / Definition of Done por historia.
- Trazabilidad requerimiento → diseño → código → prueba.
- Gestión de riesgos y de cambios (change requests).

## 15. Recomendaciones adicionales (doc. base, sección 25)
- Manejo centralizado de errores/excepciones; nunca filtrar stack traces ni rutas internas al cliente.
- Idempotencia en operaciones críticas (pagos, creación de recursos) con idempotency keys.
- Gestión de deuda técnica: revisión y refactorización planificada.
- Plan de recuperación ante desastres (DRP/BCP): definir RTO/RPO, no solo backups.
- FinOps: monitoreo de costos de infraestructura por servicio.
- Contratos de API y pruebas de contrato (ej. Pact) si hay microservicios.
- Graceful shutdown en despliegues; circuit breakers y retries con backoff exponencial para llamadas externas.

---

## Ver también
- Documento base: `../MejoresPracticasDesarrolloSoftwareYApis.md`
- API/Backend: `03-API-Backend.md`
- Registro de decisiones (ADR): `07-ADR-Decisiones-Arquitectura.md`
- Archivo específico del tipo de app que se está construyendo (`02`, `04`, `05` o `06`).
