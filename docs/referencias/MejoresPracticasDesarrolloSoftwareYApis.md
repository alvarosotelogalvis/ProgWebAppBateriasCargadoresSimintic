# Mejores Prácticas de Desarrollo de Software y APIs

> Compilado y organizado a partir de notas tomadas durante varios proyectos.
> Las secciones marcadas con **[Añadido por Claude]** no estaban en las notas originales; se agregaron como recomendaciones complementarias (ver detalle al final del documento).

---

## 1. Planificación y Requerimientos

- Requerimientos funcionales y no funcionales.
- Selección de lenguaje de programación, framework, stack, patrones de arquitectura(Monolitico, microservicios, modular orientada a servicios) y patrones de diseño.
- Skill / prompt base para agentes de IA que asistan en el desarrollo.

---

## 2. Documentación y Menús de la Aplicación

- Menú con contenido de la versión de la app.
- Menú con contenido sobre el uso de la app para el usuario.
- Menú con contenido sobre configuración para que la app se ejecute (configuración inicial).
- Menú para el técnico.
- Menú para el usuario.
- Documentación y arquitectura del sistema.
- Opciones de menú a considerar:
  - Tamaño de fuente.
  - Ayuda.
  - Información de la app.
  - Configuración inicial → paso a producción.
- Crear y **actualizar constantemente** el `CLAUDE.md`, el `README.md`, así como el plan o spec del proyecto, si existen.
- Mantener los **ADR (Architecture Decision Records)** en `docs/adr/` como documentos de arquitectura y diseño obligatorios, actualizados con cada cambio de decisión (ver sección 6.4). **[Añadido por Claude]**

---

## 3. Frontend **[Sección ampliada por Claude — en las notas originales solo aparecía el título, sin detalle]**

### 3.1 Arquitectura Frontend
- Enfoque basado en componentes reutilizables (component-based).
- Elegir el modelo de renderizado: SPA, MPA, SSR (Server-Side Rendering), SSG (Static Site Generation) o CSR según el caso de uso.
- Organización por features/módulos vs. organización por tipo de archivo.

### 3.2 Gestión de Estado
- Estado local vs. estado global (Redux, Zustand, Context API, Signals, etc.).
- Evitar estado duplicado o desincronizado entre componentes.

### 3.3 Enrutamiento (Routing)
- Definición clara de rutas públicas y privadas.
- Lazy loading de rutas/módulos para reducir el bundle inicial.
- Guards de navegación según autenticación/autorización.

### 3.4 Formularios y Validación
- Validación en cliente como complemento (nunca reemplazo) de la validación en backend.
- Mensajes de error claros y accesibles.
- Manejo de estados: loading, error, éxito, deshabilitado durante el envío.

### 3.5 Consumo de APIs
- Manejo consistente de estados de carga (loading), error y datos vacíos.
- Reintentos controlados y cancelación de solicitudes (abort controller) al desmontar componentes o cambiar de vista.
- Capa de servicios/cliente HTTP centralizada (no llamadas dispersas por todo el código).

### 3.6 Rendimiento
- Code splitting y lazy loading de componentes pesados.
- Memoización de componentes y cálculos costosos.
- Virtualización de listas largas.
- Optimización de imágenes (formatos modernos, lazy loading de imágenes, tamaños responsivos).
- Medición con herramientas como Lighthouse / Core Web Vitals (LCP, FID/INP, CLS).

### 3.7 Accesibilidad (a11y)
- Cumplimiento de estándares WCAG.
- Uso correcto de atributos ARIA y HTML semántico.
- Navegación completa por teclado.
- Contraste de colores adecuado.

### 3.8 Diseño Responsivo y Compatibilidad
- Enfoque mobile-first y uso de breakpoints.
- Pruebas de compatibilidad entre navegadores (cross-browser testing).
- Compatibilidad con distintos tamaños y tipos de dispositivo.

### 3.9 Internacionalización (i18n) y Localización (l10n)
- Textos externalizados (sin strings "hardcodeados") para soportar múltiples idiomas.
- Formato de fechas, monedas y números según la localización del usuario.

### 3.10 Seguridad en Frontend
- Protección contra XSS (sanitización de datos renderizados, evitar `innerHTML` sin control).
- Content Security Policy (CSP).
- No almacenar tokens sensibles en `localStorage` sin protección adicional; preferir cookies `HttpOnly` + `Secure` cuando aplique.
- Evitar exponer claves/API keys sensibles en el código del cliente.

### 3.11 SEO (si aplica al proyecto)
- Meta tags, etiquetas Open Graph, sitemap.xml y robots.txt.
- Renderizado que permita indexación (SSR/SSG cuando el SEO es crítico).

### 3.12 Testing Frontend
- Pruebas unitarias de componentes (Jest, Vitest).
- Pruebas de integración de componentes (Testing Library).
- Pruebas end-to-end (Cypress, Playwright).
- Pruebas de regresión visual cuando aplique.

### 3.13 Build y Bundling
- Herramientas de build (Vite, Webpack, etc.) con tree-shaking y minificación.
- Variables de entorno diferenciadas por ambiente (dev, staging, producción).

### 3.14 Manejo de Errores y Monitoreo en Cliente
- Error boundaries para evitar que un error rompa toda la aplicación.
- Logging y monitoreo de errores en producción (ej. Sentry).
- Analítica de uso e interacción del usuario.

---

## 4. Backend / Diseño de APIs

### 4.1 Endpoints, Nomenclatura REST y Verbos HTTP **[Sección ampliada por Claude]**

- Definición clara de los endpoints de la API.

#### 4.1.1 Principios REST / RESTful
- **Recursos, no acciones**: la URL identifica un recurso (sustantivo), no una acción (verbo). La acción la define el verbo HTTP.
- **Sin estado (stateless)**: cada request debe contener toda la información necesaria; el servidor no guarda contexto de sesión entre llamadas (ver sección 4.11).
- **Interfaz uniforme**: mismos verbos y convenciones de respuesta para todos los recursos.
- **Cacheable**: las respuestas deben indicar explícitamente si pueden cachearse (cabeceras `Cache-Control`, `ETag`).
- **Sistema en capas**: el cliente no necesita saber si habla directo con el servidor o a través de un gateway/proxy (ver 4.12).
- **HATEOAS** (opcional, nivel más estricto de REST): las respuestas pueden incluir enlaces a acciones/recursos relacionados.

#### 4.1.2 Buenas Prácticas de Nombrado de Endpoints

| Práctica | Descripción | Ejemplo |
|---|---|---|
| Usar sustantivos, no verbos | El recurso va en la URL; la acción la expresa el verbo HTTP, no el path. | ✅ `GET /users` &nbsp;&nbsp; ❌ `GET /getUsers` |
| Sustantivos en plural para colecciones | Mantiene consistencia entre "listar" y "obtener uno". | ✅ `GET /orders` / `GET /orders/123` &nbsp;&nbsp; ❌ `GET /order` |
| kebab-case para nombres compuestos | Mejora legibilidad y evita problemas de codificación en URLs. | ✅ `/order-items` &nbsp;&nbsp; ❌ `/orderItems` u `/order_items` |
| Minúsculas siempre | Las URLs son case-sensitive en muchos servidores; usar minúsculas evita duplicados accidentales. | ✅ `/users/123/orders` &nbsp;&nbsp; ❌ `/Users/123/Orders` |
| Anidar para relaciones jerárquicas | Expresa pertenencia de un recurso a otro (máximo 2-3 niveles). | ✅ `GET /users/123/orders` (pedidos del usuario 123) |
| Query params para filtros, orden y paginación | No se filtra/ordena en el path; se usa la query string. | ✅ `GET /orders?status=pending&sort=-createdAt&page=2&limit=20` |
| Acciones que no son CRUD, como sub-recurso/verbo | Para operaciones de negocio que no mapean a un CRUD simple. | ✅ `POST /orders/123/cancel` &nbsp;&nbsp; ❌ `POST /cancelOrder?id=123` |
| Sin barra final (trailing slash) | Evita tratar `/users` y `/users/` como recursos distintos. | ✅ `/users` &nbsp;&nbsp; ❌ `/users/` |
| Versionado explícito en la URL o en cabecera | Permite evolucionar la API sin romper clientes existentes (ver 4.18). | ✅ `/api/v1/users` |
| IDs opacos y no secuenciales cuando aplique | Evita exponer volumen de datos o permitir enumeración (IDOR/BOLA, ver 4.5). | ✅ `/users/9f1c2e4a-...` en vez de `/users/1`, `/users/2`... |

#### 4.1.3 Verbos HTTP según el Estándar

| Verbo | Descripción | Idempotente | Seguro (sin efectos secundarios) | Ejemplo |
|---|---|---|---|---|
| **GET** | Obtiene un recurso o una colección. No debe modificar estado en el servidor. | Sí | Sí | `GET /api/v1/users/123` → devuelve el usuario 123 |
| **POST** | Crea un nuevo recurso dentro de una colección, o ejecuta una acción/proceso que no encaja en CRUD. | No | No | `POST /api/v1/users` con body `{"name":"Ana","email":"ana@mail.com"}` → crea un usuario y responde `201 Created` |
| **PUT** | Reemplaza **completamente** un recurso existente (o lo crea si el cliente define el ID). Se debe enviar el recurso íntegro. | Sí | No | `PUT /api/v1/users/123` con el objeto completo del usuario → sobrescribe el recurso 123 |
| **PATCH** | Actualiza **parcialmente** un recurso, enviando solo los campos a modificar. | Recomendable que lo sea, aunque no obligatorio por spec | No | `PATCH /api/v1/users/123` con body `{"phone":"3001234567"}` → actualiza solo el teléfono |
| **DELETE** | Elimina un recurso existente. | Sí | No | `DELETE /api/v1/users/123` → elimina el usuario 123, responde `204 No Content` |
| **HEAD** | Igual que `GET` pero sin cuerpo de respuesta; útil para verificar existencia o metadata (cabeceras) de un recurso. | Sí | Sí | `HEAD /api/v1/users/123` → responde `200 OK` o `404 Not Found` sin body |
| **OPTIONS** | Devuelve los métodos y cabeceras permitidos para un recurso; usado por el navegador en preflight de CORS. | Sí | Sí | `OPTIONS /api/v1/users` → responde con cabecera `Allow: GET, POST, OPTIONS` |

> **Nota:** "Idempotente" significa que ejecutar la misma operación varias veces produce el mismo resultado final que ejecutarla una sola vez (ej. `DELETE /users/123` dos veces sigue dejando el usuario eliminado). "Seguro" significa que la operación no cambia el estado del servidor.

#### 4.1.4 Ejemplo Completo de un Recurso REST Bien Diseñado

```
GET    /api/v1/orders              → Lista paginada de órdenes
GET    /api/v1/orders/456          → Detalle de la orden 456
POST   /api/v1/orders              → Crea una nueva orden
PUT    /api/v1/orders/456          → Reemplaza la orden 456 completa
PATCH  /api/v1/orders/456          → Actualiza campos puntuales de la orden 456
DELETE /api/v1/orders/456          → Elimina la orden 456
POST   /api/v1/orders/456/cancel   → Acción de negocio: cancelar la orden 456
GET    /api/v1/orders/456/items    → Ítems (sub-recurso) de la orden 456
```

### 4.2 Autenticación
- OAuth 2.0.
- OpenID Connect.
- JWT firmado.
- API Keys.
- mTLS para integraciones críticas B2B.

### 4.3 Autorización
- Definir qué puede **consultar** cada rol.
- Definir qué puede **modificar** cada rol.
- Definir qué información **le pertenece** a cada usuario.
- RBAC (Role Based Access Control).
- ABAC (Attribute Based Access Control) si se necesita algo más granular.
- Roles típicos: Admin, Operador, Cliente, Auditor.

### 4.4 Validación de Entradas
- Validar tipos, longitudes, formatos, regex.
- Uso de JSON Schema.

### 4.5 Protección contra OWASP API Security Top 10
- BOLA (Broken Object Level Authorization).
- Broken Authentication.
- Excessive Data Exposure.
- Security Misconfiguration.
- SSRF (Server-Side Request Forgery).
- Injection.
- Rate Limit Bypass.

### 4.6 Gestión de Secretos (Secrets Management)
- Azure Key Vault.
- AWS Secrets Manager.
- HashiCorp Vault.

### 4.7 Cifrado
- Datos sensibles a cifrar: contraseñas, tokens, PII, datos financieros.
- En tránsito: TLS.
- En reposo: AES-256.

### 4.8 Paginación, Filtros y Cabeceras
- Paginación y filtros en los listados.
- Uso correcto de cabeceras HTTP.
- Compresión de respuestas para reducir tráfico.

### 4.9 Asincronía / Mensajería
- Azure Service Bus, RabbitMQ, SQS, Kafka, etc.

### 4.10 Timeouts
- Base de datos: 5 segundos.
- API externa: 10 segundos.

### 4.11 Escalabilidad (Stateless)
- No almacenar sesión en memoria.
- Usar JWT y/o Redis para manejo de estado/sesión.

### 4.12 API Gateway
- Beneficios: rate limiting, autenticación, monitoreo, versionado, transformación de respuestas.
- Opciones: Azure API Management, AWS API Gateway, Kong, Apigee.

### 4.13 Load Balancer
- Distribución de carga entre instancias (api1, api2, …).

### 4.14 Logging
- Registrar: usuario, endpoint, IP, tiempo, código HTTP.

### 4.15 Métricas
- Monitorear: requests/segundo, latencia, error rate, CPU, memoria.

### 4.16 Trazabilidad
- Correlation ID (cabecera `X-Correlation-Id`).

### 4.17 Alertas
- Generar alertas cuando:
  - Latencia > 2 segundos.
  - Error rate > 5%.
  - CPU > 80%.

### 4.18 Versionado
- Ejemplo: `/api/v1/clientes`.

### 4.19 Documentación de la API
- OpenAPI / Swagger.

### 4.20 Respuestas Consistentes
- Formato estándar, ej.: `{"success": true, "data": *}`.

### 4.21 Códigos HTTP Correctos
- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 429 Too Many Requests
- 500 Internal Server Error

### 4.22 CORS
- Evitar configuraciones inseguras como `Access-Control-Allow-Origin: *`.

### 4.23 JWT Seguros
- Validar siempre: firma, issuer, audience y expiración.

---

## 5. Checklist Antes de Publicar una API en Producción

- [ ] HTTPS obligatorio
- [ ] JWT / OAuth2
- [ ] RBAC
- [ ] Rate limiting
- [ ] Validación de entrada
- [ ] Logs centralizados
- [ ] Métricas
- [ ] Swagger
- [ ] Versionado
- [ ] Paginación
- [ ] Caché
- [ ] Timeout
- [ ] Retries controlados
- [ ] Secrets fuera del código
- [ ] Escaneo OWASP
- [ ] Pruebas de carga
- [ ] API Gateway
- [ ] Alertas operativas
- [ ] Correlation ID
- [ ] Cifrado de datos sensibles
- [ ] Validar comunicación TLS
- [ ] ADR de las decisiones de arquitectura creados y actualizados (ver sección 6.4)

---

## 6. Arquitectura de Software

### 6.1 Reglas de Negocio
- Documentar y validar las reglas de negocio del sistema.

### 6.2 Patrones de Arquitectura
- Hexagonal.
- Arquitectura Limpia (Clean Architecture).
- MVC y otros patrones.
- Colas de procesamiento.
- Tareas en segundo plano (background jobs).

### 6.3 Ambientes
- Desarrollo.
- Staging.
- QA.
- Producción (PDN).

### 6.4 Registro de Decisiones de Arquitectura (ADR) **[Añadido por Claude]**
- **Obligatorio en todo proyecto**, sin importar el tipo de aplicación (web, API, escritorio, móvil, nube).
- Un ADR por decisión de arquitectura/diseño relevante: contexto, opciones consideradas, decisión y consecuencias.
- Ubicación: `docs/adr/NNNN-titulo-en-kebab-case.md`, con numeración secuencial y un índice en `docs/adr/README.md`.
- Estados: `Propuesto`, `Aceptado`, `Rechazado`, `Obsoleto`, `Reemplazado por ADR-NNNN`.
- **Actualización con los cambios de decisión**: un ADR `Aceptado` no se reescribe; cuando la decisión cambia se crea un ADR nuevo que lo reemplaza, se marca el anterior como `Reemplazado por ...` y se actualizan el índice y el `CLAUDE.md`/`README.md`.
- Toda decisión marcada con 🔶 en este documento debe quedar registrada en un ADR una vez respondida.
- Proceso detallado, ADR mínimos por tipo de aplicación y plantillas: `Ambientes/07-ADR-Decisiones-Arquitectura.md` y `Ambientes/Plantillas/`.

---

## 7. Seguridad

### 7.1 Autenticación y Sesiones **[Sección ampliada por Claude]**

- Tipo de login: se debe **preguntar siempre al usuario/equipo** qué mecanismo(s) usar antes de implementar (se pueden combinar varios). Opciones más comunes:

| Opción | Descripción | Cuándo conviene |
|---|---|---|
| Usuario y contraseña | Login clásico. | Casos simples/bajo riesgo, o como base combinada con otro factor. |
| Usuario y contraseña + OTP enviado al correo | Tras validar la contraseña, se envía un código de un solo uso (OTP) al correo registrado. | Capa extra de verificación sin exigir SMS ni app externa. |
| Usuario y contraseña + token (JWT) tras el login | Se valida usuario/contraseña y el servidor emite un token (JWT u opaco) para las siguientes peticiones. | Prácticamente cualquier API/backend stateless (ver 4.2, 4.11, 4.23). |
| OTP por SMS | Código de un solo uso enviado por mensaje de texto. | Cuando el correo no es confiable o se exige verificación por número telefónico. |
| Autenticador TOTP (Google Authenticator, Authy, etc.) | Segundo factor generado por app, sin depender de red para recibir el código. | MFA robusto sin depender de SMS/correo. |
| Social login / OAuth 2.0 (Google, Microsoft, Apple, etc.) | El usuario se autentica con un proveedor externo. | Reduce fricción y evita gestionar contraseñas propias. |
| SSO / SAML / OpenID Connect empresarial | Integración con el proveedor de identidad corporativo (Azure AD/Entra ID, Okta, etc.). | Apps internas/B2B donde la empresa ya tiene un IdP. |
| Magic link (enlace mágico por correo) | Sin contraseña; se envía un enlace de un solo uso para iniciar sesión. | Apps de bajo riesgo u onboarding simplificado. |
| Passwordless / WebAuthn (passkeys, FIDO2) | Autenticación sin contraseña usando la llave del dispositivo o biometría. | Máxima seguridad y UX moderna, si el público objetivo lo soporta. |
| Biometría nativa (Face ID/Touch ID, huella) | Como segundo factor o desbloqueo local en apps móviles/escritorio. | Complementa el login remoto en apps móviles/desktop. |

  > 🔶 **Decisión requerida**: un agente de IA que vaya a implementar el login debe **preguntarle explícitamente al usuario** cuál(es) de estas opciones aplican, en vez de asumir una por defecto.

- Autenticación y autorización (ver también 4.2–4.3).
- Manejo de sesiones (ver 4.11 — diseño stateless con JWT y/o Redis).
- Recuperación de contraseñas: flujo seguro con enlace/token de un solo uso y expiración corta, sin revelar si el correo existe en el sistema.

### 7.2 Almacenamiento y Validación
- Almacenamiento seguro de credenciales.
- Cifrado de datos sensibles.
- Validación de entradas.
- Protección contra SQL Injection, XSS, CSRF y vulnerabilidades conocidas.
- Gestión de vulnerabilidades propias y de terceros (dependencias).

### 7.3 Inyección
- SQL Injection.
- NoSQL Injection.
- Command Injection.
- Ejemplo clásico: `' OR 1=1 --`.

---

## 8. Cifrado de Datos (General)

- Definir qué datos van a ir cifrados y con qué método (en reposo y en tránsito).

---

## 9. Base de Datos

### 9.1 SharePoint / Dataverse
- Tablas, entidades y relaciones.
- Listas.
- Dataverse.
- Restricciones de integridad.
- Almacenamiento de backups.
- Caché.

### 9.2 Caché
- Redis, Memory Cache, CDN.

### 9.3 Base de Datos Híbrida
- Combinación local y remota para manejar operaciones asíncronas.

---

## 10. Variables de Entorno y Secretos

- Archivos `.env`.
- Archivos de configuración JSON.

---

## 11. Webhooks

- Diseño y manejo seguro de webhooks entrantes/salientes.

---

## 12. Servicios Externos

- Envío de correos.
- Consulta de APIs externas.

---

## 13. CI/CD

- Integración continua.
- Despliegue continuo.
- Control de versiones.

---

## 14. Pruebas

- Unitarias.
- Integración.
- End-to-end (E2E).
- Pruebas de carga.
- Pruebas de seguridad.

---

## 15. Monitoreo y Observabilidad

- Alertas.
- Métricas.
- Trazabilidad.
- Análisis de errores.
- Observabilidad general.

---

## 16. Pasarela de Pagos

- Procesamiento de pagos.
- Conciliación.
- Reembolsos.
- Manejo de transacciones fallidas.

---

## 17. Rendimiento y Compatibilidad

- Rendimiento general de la aplicación.
- Compatibilidad en dispositivos.
- Sensibilidad (responsive / accesibilidad).
- Analítica de uso.

---

## 18. Términos, Condiciones y Licencias

- Contrato de términos y condiciones.
- Licencia de software.

---

## 19. Mantenimiento **[Sección ampliada por Claude]**

- Actualización de dependencias.
- Consideraciones sobre sistemas operativos soportados.

### 19.1 Mecanismo de actualización/distribución de la app
Se debe **preguntar siempre al usuario/equipo** cómo se va a actualizar la aplicación en el entorno donde corre, antes de asumir un mecanismo. Opciones más comunes:

| Opción | Descripción | Cuándo conviene |
|---|---|---|
| `git clone` / `git pull` | Se actualiza el código directamente desde el repositorio y se reinicia el servicio. | Herramientas internas, servidores propios, entornos donde el equipo técnico administra su propio despliegue. |
| Paquete (npm, NuGet, pip, apt/choco, imagen de contenedor, etc.) | Se distribuye como paquete versionado a través de un gestor de paquetes o registry. | Librerías, CLIs, servicios que se instalan/actualizan con el gestor estándar del ecosistema. |
| Instalador (MSI/EXE, DMG/PKG, AppImage/DEB/RPM) | El usuario final instala/actualiza mediante un instalador gráfico. | Apps de escritorio para usuarios no técnicos. |
| Auto-actualización integrada (electron-updater, Squirrel, Sparkle, etc.) | La app se actualiza sola en segundo plano (con o sin notificación al usuario). | Apps de escritorio que quieren minimizar la fricción de actualizar manualmente. |
| Distribución por tienda (Microsoft Store, Mac App Store, Google Play, App Store) | La actualización la gestiona la tienda. | Apps de escritorio/móvil publicadas en tiendas oficiales. |
| Pipeline de CI/CD (build + deploy automático) | Cada cambio en el repo dispara build y despliegue a servidor/contenedor. | Apps web/servicios backend, especialmente en la nube. |
| Imagen de contenedor versionada (Docker) | Se actualiza reemplazando el contenedor por una nueva imagen/tag. | Servicios cloud-native/microservicios. |

  > 🔶 **Decisión requerida**: confirmar con el usuario cuál(es) de estas opciones aplican para este proyecto (pueden combinarse, ej. `git pull` en desarrollo + instalador con auto-update para el usuario final) antes de definir el flujo de release.

---

## 20. Reportes e Informes

- Manejo de reportes e informes generados por la aplicación.

---

## 21. Backups

- Manejo de backups (frecuencia, almacenamiento, restauración).

---

## 22. Gestión de Usuarios, Roles y Logs

- Autenticación, autorización, roles y acciones permitidas.
- Logs de acciones realizadas por los usuarios.
- Usuarios permitidos como colaboradores o administradores de la aplicación.
- Usuarios finales que serán atendidos o que usarán los servicios de la aplicación.

---

## 23. Atributos de Calidad de Software **[Añadido por Claude]**

Basado en el modelo ISO/IEC 25010, útil como checklist de requerimientos no funcionales:

### 23.1 Funcionalidad
- Adecuación funcional (cubre las necesidades reales del usuario).
- Exactitud/corrección de los resultados.
- Interoperabilidad con otros sistemas.

### 23.2 Fiabilidad (Reliability)
- Madurez (frecuencia de fallos bajo uso normal).
- Disponibilidad (uptime, SLA — ej. 99.9%).
- Tolerancia a fallos (degradación controlada, fallback).
- Capacidad de recuperación (recuperabilidad ante caídas).

### 23.3 Usabilidad
- Facilidad de aprendizaje y operación.
- Protección contra errores del usuario.
- Estética de la interfaz.
- Accesibilidad (ya mencionada en la sección 22, aplica aquí como atributo formal).

### 23.4 Eficiencia de Desempeño
- Comportamiento temporal (tiempos de respuesta).
- Uso de recursos (CPU, memoria, red, disco).
- Capacidad (throughput máximo soportado).

### 23.5 Mantenibilidad
- Modularidad y bajo acoplamiento.
- Reusabilidad de componentes.
- Analizabilidad (facilidad para diagnosticar problemas).
- Capacidad de modificación sin introducir defectos.
- Capacidad de prueba (testabilidad del código).

### 23.6 Portabilidad
- Adaptabilidad a distintos entornos (SO, nube, on-premise).
- Facilidad de instalación/despliegue.
- Capacidad de reemplazo de componentes.

### 23.7 Compatibilidad
- Coexistencia con otros sistemas sin conflictos.
- Interoperabilidad de datos y protocolos.

### 23.8 Seguridad (como atributo de calidad transversal)
- Confidencialidad, integridad, disponibilidad (tríada CIA).
- No repudio (evidencia de que una acción ocurrió y quién la hizo).
- Autenticidad y responsabilidad (trazabilidad de acciones a un usuario).

---

## 24. Ciclo de Vida de Desarrollo de Software (SDLC) **[Añadido por Claude]**

### 24.1 Fases del Ciclo de Vida
- Levantamiento y análisis de requerimientos.
- Diseño (arquitectura, UX/UI, modelo de datos).
- Implementación / desarrollo.
- Pruebas (ver sección 14).
- Despliegue (ver CI/CD, sección 13).
- Mantenimiento y soporte post-producción.
- Retiro/decomisión del sistema (end-of-life).

### 24.2 Metodologías de Desarrollo
- Cascada (Waterfall) — cuando los requerimientos son estables y bien definidos.
- Ágiles: Scrum, Kanban, Extreme Programming (XP).
- Lean Software Development.
- DevOps / DevSecOps — integración de desarrollo, operaciones y seguridad.

### 24.3 Prácticas de Gestión Ágil
- Definition of Ready (DoR) y Definition of Done (DoD) por historia/tarea.
- Sprint planning, daily standup, sprint review, retrospectiva.
- Gestión y priorización del backlog (MoSCoW, RICE, valor vs. esfuerzo).
- Estimación (story points, planning poker, t-shirt sizing).
- Métricas ágiles: velocity, burndown/burnup chart, lead time, cycle time.

### 24.4 Gestión del Cambio y Trazabilidad
- Control de cambios sobre requerimientos (change requests).
- Trazabilidad entre requerimiento → diseño → código → prueba.
- Trazabilidad de decisiones de arquitectura mediante ADR: cada cambio de decisión genera un ADR nuevo que reemplaza al anterior (ver sección 6.4).
- Gestión de riesgos del proyecto (identificación, mitigación, seguimiento).

---

## 25. Recomendaciones Adicionales **[Añadido por Claude]**

Estos puntos no estaban en las notas originales, pero son prácticas comunes que complementan lo ya documentado:

- **Manejo de errores y excepciones**: estrategia centralizada de manejo de errores, mensajes de error consistentes y sin filtrar información sensible (stack traces, rutas internas) al cliente.
- **Idempotencia**: diseñar endpoints críticos (pagos, creación de recursos) para que soporten reintentos seguros sin duplicar efectos (idempotency keys).
- **Feature flags**: uso de banderas de características para despliegues progresivos (canary releases, rollback rápido sin redeploy).
- **Gestión de la deuda técnica**: revisión periódica de código legado, refactorización planificada.
- **Code review y estándares de código**: linters, formatters, guías de estilo, revisión obligatoria antes de merge.
- **Estrategia de branching y manejo de cambios/fixes en equipo (desarrollo colaborativo)**: si el desarrollo es colaborativo (más de una persona/agente tocando el mismo repositorio), se debe **preguntar y definir explícitamente** cómo se van a manejar los cambios y los fixes en git. Opciones más comunes:

  | Modelo | Descripción | Cuándo conviene |
  |---|---|---|
  | Git Flow | Ramas `develop`, `feature/*`, `release/*`, `hotfix/*` y `main`. Un fix de producción sale de una rama `hotfix/*` creada desde `main` y se mergea de vuelta a `main` **y** a `develop`. | Releases programados, o cuando se soportan varias versiones en paralelo. |
  | GitHub Flow | Ramas `feature/*`/`fix/*` cortas desde `main`, Pull Request con revisión, merge a `main`, despliegue continuo. | Equipos con despliegue continuo y una sola versión "viva". |
  | Trunk-Based Development | Ramas muy cortas (horas/1-2 días) o commits directos a `main`, usando feature flags para código incompleto (ver más abajo). | Equipos maduros en CI/CD con despliegues muy frecuentes. |
  | GitLab Flow | Similar a GitHub Flow, pero con ramas adicionales por ambiente (`staging`, `production`) o de release. | Cuando se necesita trazabilidad por ambiente además de entrega continua. |

  > 🔶 **Decisión requerida**: confirmar con el usuario/equipo cuál de estos modelos usan (o si ya tienen uno definido en su repo/CLAUDE.md) antes de crear ramas o abrir PRs.

  Independiente del modelo elegido, en desarrollo colaborativo se recomienda:
  - **Nomenclatura de ramas**: prefijo por tipo de cambio, ej. `feature/`, `fix/`, `hotfix/`, `chore/`, `docs/`, idealmente con referencia al ticket (`feature/JIRA-123-nombre-corto`).
  - **Convención de commits** (ej. Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`) para poder generar changelog y versión semántica automáticamente.
  - **Pull/Merge Request obligatorio** para todo cambio a `main`/`develop`: mínimo 1 revisor (idealmente 2 en cambios críticos), pipeline de CI (build + pruebas + linter) en verde antes de poder mergear.
  - **Ramas protegidas** (`main`, `develop`, `release/*`): sin push directo ni force-push; solo vía PR aprobado.
  - **Manejo de fixes urgentes en producción (hotfix)**: crear la rama desde el commit/tag que está en producción (no desde `develop`), aplicar el fix mínimo necesario, PR con revisión acelerada, mergear a `main` y hacer *back-merge* a `develop`/otras ramas activas para no perder el fix en el siguiente release, y taggear la nueva versión (patch).
  - **Ramas de vida corta**: actualizar (`rebase`/`merge`) frecuentemente contra la rama base para minimizar conflictos; evitar ramas que vivan semanas sin integrarse.
  - **Versionado semántico (SemVer)** y changelog generado a partir de los commits convencionales.
- **Plan de recuperación ante desastres (DRP) y continuidad del negocio (BCP)**: no solo backups, sino tiempos de recuperación (RTO/RPO) definidos.
- **Costos e infraestructura (FinOps)**: monitoreo de costos en la nube asociados a cada servicio.
- **Contratos de API (API contracts) y pruebas de contrato**: para evitar romper integraciones entre microservicios (ej. Pact).
- **Graceful shutdown**: manejo correcto del cierre de procesos para no perder solicitudes en curso durante despliegues.
- **Circuit breakers y retries con backoff exponencial**: para llamadas a servicios externos, complementando los timeouts ya mencionados.
