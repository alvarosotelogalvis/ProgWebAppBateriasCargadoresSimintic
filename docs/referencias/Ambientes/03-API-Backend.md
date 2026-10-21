# Buenas Prácticas — APIs / Backend

> Derivado de `../MejoresPracticasDesarrolloSoftwareYApis.md`, sección 4 (Backend/Diseño de APIs) y sección 5 (checklist de producción). Este archivo es el **núcleo compartido**: casi toda app web, móvil, de escritorio o en la nube termina consumiendo o exponiendo una API — léelo junto con `01-Comun-Transversal.md`.

## 1. Alcance
Cualquier servicio backend/API: REST, y por extensión los mismos principios de seguridad/observabilidad aplican a GraphQL o gRPC si el proyecto los usa.

## 2. Decisiones clave 🔶
- Lenguaje/framework backend (Node/NestJS/Express, .NET, Java/Spring, Python/FastAPI/Django, etc.).
- Estilo de API: REST, GraphQL, gRPC — 🔶 confirmar con el usuario si no es obvio del contexto.
- Mecanismo de autenticación: OAuth 2.0, OpenID Connect, JWT firmado, API Keys, mTLS (B2B crítico).
- Estrategia de versionado (URL vs. cabecera).
- ¿Necesita API Gateway? (ver sección 8).

### 2.1 Registro de decisiones (ADR) — obligatorio **[Generado por Claude]**
Cada decisión anterior, una vez respondida, se registra como ADR en `docs/adr/` (proceso y plantilla en `07-ADR-Decisiones-Arquitectura.md`). Si la decisión cambia, se crea un ADR nuevo que reemplaza al anterior. ADR mínimos para una API/backend, además de los transversales:
- [ ] Lenguaje/framework backend.
- [ ] Estilo de API (REST, GraphQL, gRPC).
- [ ] Mecanismo de autenticación y autorización (OAuth2/OIDC, JWT, API Keys, mTLS; RBAC/ABAC).
- [ ] Estrategia de versionado de la API (URL vs. cabecera) y política de deprecación.
- [ ] Formato estándar de respuestas y errores (ver sección 12).
- [ ] Uso de API Gateway / load balancer.
- [ ] Estrategia de paginación, caché y rate limiting.
- [ ] Mensajería/asincronía (colas, eventos) si aplica.
- [ ] Estrategia de observabilidad (logging, métricas, trazas, correlation ID).

## 3. Principios REST/RESTful (doc. base, 4.1.1)
- Recursos (sustantivos) en la URL, no acciones; la acción la define el verbo HTTP.
- Stateless: cada request lleva toda la información necesaria.
- Interfaz uniforme entre recursos.
- Cacheable: usar `Cache-Control`, `ETag` cuando aplique.
- Sistema en capas (el cliente no necesita saber si hay gateway/proxy de por medio).
- HATEOAS opcional para el nivel más estricto de REST.

## 4. Nomenclatura de endpoints (doc. base, 4.1.2)
- Sustantivos, no verbos: ✅ `GET /users` — ❌ `GET /getUsers`.
- Plural para colecciones: ✅ `GET /orders` / `GET /orders/123`.
- kebab-case para nombres compuestos: ✅ `/order-items`.
- Siempre minúsculas.
- Anidar máximo 2-3 niveles para relaciones jerárquicas: `GET /users/123/orders`.
- Filtros/orden/paginación en query string, no en el path: `GET /orders?status=pending&sort=-createdAt&page=2&limit=20`.
- Acciones no-CRUD como sub-recurso/verbo: ✅ `POST /orders/123/cancel` — ❌ `POST /cancelOrder?id=123`.
- Sin trailing slash.
- Versionado explícito: `/api/v1/...`.
- IDs opacos/no secuenciales cuando aplique (evita IDOR/BOLA y enumeración).

## 5. Verbos HTTP (doc. base, 4.1.3)

| Verbo | Uso | Idempotente | Seguro |
|---|---|---|---|
| GET | Obtener recurso/colección, sin efectos secundarios | Sí | Sí |
| POST | Crear recurso o ejecutar acción de negocio | No | No |
| PUT | Reemplazo completo de un recurso | Sí | No |
| PATCH | Actualización parcial | Recomendable | No |
| DELETE | Eliminar recurso | Sí | No |
| HEAD | Como GET sin body (existencia/metadata) | Sí | Sí |
| OPTIONS | Métodos/cabeceras permitidos (CORS preflight) | Sí | Sí |

Ejemplo de recurso bien diseñado (doc. base, 4.1.4):
```
GET    /api/v1/orders              → Lista paginada
GET    /api/v1/orders/456          → Detalle
POST   /api/v1/orders              → Crea
PUT    /api/v1/orders/456          → Reemplaza completo
PATCH  /api/v1/orders/456          → Actualiza campos puntuales
DELETE /api/v1/orders/456          → Elimina
POST   /api/v1/orders/456/cancel   → Acción de negocio
GET    /api/v1/orders/456/items    → Sub-recurso
```

## 6. Autenticación y autorización (doc. base, 4.2–4.3, 7.1)
- 🔶 **Decisión requerida** — mecanismo de login: preguntar al usuario cuál(es) de las opciones de `01-Comun-Transversal.md` (sección 3.0) / doc. base (7.1) aplican (usuario y contraseña, usuario y contraseña + OTP por correo, usuario y contraseña + token JWT, OTP por SMS, TOTP, social login/OAuth2, SSO/SAML, magic link, passwordless/WebAuthn, biometría, etc.). No asumir una por defecto.
- Autenticación a nivel de API: OAuth 2.0, OpenID Connect, JWT firmado, API Keys, mTLS.
- Autorización: definir por rol qué se puede **consultar**, qué se puede **modificar**, y qué información **le pertenece** a cada usuario.
- RBAC (por rol) y ABAC (por atributos) si se necesita más granularidad.
- Roles típicos de referencia: Admin, Operador, Cliente, Auditor — 🔶 ajustar a los roles reales del negocio.

## 7. Validación y seguridad OWASP (doc. base, 4.4–4.5)
- Validar tipos, longitudes, formatos, regex; usar JSON Schema.
- Cubrir OWASP API Security Top 10: BOLA, Broken Authentication, Excessive Data Exposure, Security Misconfiguration, SSRF, Injection, Rate Limit Bypass.

## 8. Secretos y cifrado (doc. base, 4.6–4.7)
- Secretos en Azure Key Vault / AWS Secrets Manager / HashiCorp Vault — nunca en código.
- Cifrado en tránsito (TLS) y en reposo (AES-256) para contraseñas, tokens, PII, datos financieros.

## 9. Paginación, mensajería, timeouts, escalabilidad (doc. base, 4.8–4.11)
- Paginación y filtros en listados; cabeceras HTTP correctas; compresión de respuestas.
- Mensajería asíncrona si aplica: Azure Service Bus, RabbitMQ, SQS, Kafka.
- Timeouts de referencia: BD 5s, API externa 10s — 🔶 ajustar según SLA real.
- Diseño stateless: sin sesión en memoria; usar JWT y/o Redis para estado de sesión.

## 10. Infraestructura de entrega (doc. base, 4.12–4.13)
- API Gateway (rate limiting, autenticación, monitoreo, versionado, transformación de respuestas): Azure API Management, AWS API Gateway, Kong, Apigee.
- Load Balancer para distribuir carga entre instancias.

## 11. Observabilidad (doc. base, 4.14–4.17)
- Logging: usuario, endpoint, IP, tiempo, código HTTP.
- Métricas: requests/seg, latencia, error rate, CPU, memoria.
- Trazabilidad: Correlation ID (`X-Correlation-Id`).
- Alertas: latencia > 2s, error rate > 5%, CPU > 80% (ajustar a SLA real).

## 12. Versionado, documentación, respuestas y códigos HTTP (doc. base, 4.18–4.21)
- Versionado explícito: `/api/v1/...`.
- Documentación con OpenAPI/Swagger.
- Formato de respuesta consistente, ej.: `{"success": true, "data": *}`.
- Códigos HTTP correctos: 200, 201, 400, 401, 403, 404, 409, 429, 500.

## 13. CORS y JWT (doc. base, 4.22–4.23)
- Evitar `Access-Control-Allow-Origin: *` en configuraciones sensibles.
- Validar siempre firma, issuer, audience y expiración del JWT.

## 14. Checklist antes de publicar en producción (doc. base, sección 5)
- [ ] HTTPS obligatorio
- [ ] JWT / OAuth2
- [ ] RBAC
- [ ] Rate limiting
- [ ] Validación de entrada
- [ ] Logs centralizados
- [ ] Métricas
- [ ] Swagger/OpenAPI
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
- [ ] Comunicación TLS validada
- [ ] ADR de las decisiones de arquitectura creados y actualizados (ver `07-ADR-Decisiones-Arquitectura.md`)

## 15. Ver también
- `07-ADR-Decisiones-Arquitectura.md` (registro obligatorio de decisiones de arquitectura/diseño)
- `01-Comun-Transversal.md`
- `06-App-Nube-CloudNative.md` (si el backend corre en arquitectura cloud-native/microservicios)
- Documento base: `../MejoresPracticasDesarrolloSoftwareYApis.md`, secciones 4 y 5
