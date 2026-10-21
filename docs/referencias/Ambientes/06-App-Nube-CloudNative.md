# Buenas Prácticas — Aplicaciones/Servicios en la Nube (Cloud-Native)

> El documento base no tenía una sección dedicada a "nube" como ambiente propio, pero varias secciones ya apuntan a ello (4.9 mensajería, 4.12 API Gateway, 4.13 load balancer, 25 FinOps/DRP). Este archivo **[Generado por Claude]** las reúne y agrega lo específico de arquitecturas cloud-native (contenedores, serverless, microservicios). Léase junto con `01-Comun-Transversal.md` y `03-API-Backend.md`.

## 1. Alcance
Backends/servicios pensados para ejecutarse en la nube: microservicios en contenedores, funciones serverless, PaaS, arquitecturas multi-tenant.

## 2. Decisiones clave 🔶
- Proveedor: Azure, AWS, GCP, u on-premise/híbrido.
- Modelo de cómputo: contenedores orquestados (Kubernetes/AKS/EKS/GKE), PaaS (App Service, Cloud Run), o serverless/FaaS (Azure Functions, AWS Lambda) — depende de patrones de carga, control necesario y presupuesto.
- Arquitectura: monolito, monolito modular, microservicios, o arquitectura orientada a eventos.
- Multi-tenancy: ¿aislamiento por base de datos, por esquema, o por fila (tenant_id)?
- Infraestructura como código: Terraform, Bicep, CloudFormation, Pulumi.
- Estrategia multi-región / disponibilidad: activo-activo, activo-pasivo, o single-region con backups.

### 2.1 Registro de decisiones (ADR) — obligatorio
Cada decisión anterior, una vez respondida, se registra como ADR en `docs/adr/` (proceso y plantilla en `07-ADR-Decisiones-Arquitectura.md`). Si la decisión cambia, se crea un ADR nuevo que reemplaza al anterior. ADR mínimos para un servicio cloud-native, además de los transversales:
- [ ] Proveedor cloud (o on-premise/híbrido).
- [ ] Modelo de cómputo (contenedores/Kubernetes, PaaS, serverless).
- [ ] Estilo de arquitectura (monolito modular, microservicios, orientada a eventos).
- [ ] Modelo de multi-tenancy (por base de datos, esquema o fila).
- [ ] Herramienta de infraestructura como código.
- [ ] Estrategia de disponibilidad/multi-región y objetivos RTO/RPO.
- [ ] Mensajería (broker, patrones de entrega, DLQ).
- [ ] Gestión de secretos e identidades (Key Vault/Secrets Manager, managed identities).
- [ ] Estrategia de despliegue (blue/green, canary, rolling).

## 3. Arquitectura y escalabilidad
- [ ] Servicios stateless: no guardar sesión en memoria del proceso (ver doc. base, 4.11); usar Redis o el store de sesión que corresponda.
- [ ] Auto-scaling horizontal configurado con métricas reales (CPU, memoria, longitud de cola) — no solo un número fijo de réplicas.
- [ ] Load Balancer distribuyendo tráfico entre instancias (doc. base, 4.13).
- [ ] API Gateway para rate limiting, auth, versionado y transformación de respuestas (doc. base, 4.12): Azure API Management, AWS API Gateway, Kong, Apigee.
- [ ] Si hay múltiples servicios: contratos de API y pruebas de contrato (ej. Pact) para no romper integraciones (doc. base, sección 25).

## 4. Mensajería y procesamiento asíncrono (doc. base, 4.9)
- [ ] Uso de colas/streams para desacoplar servicios: Azure Service Bus, RabbitMQ, SQS, Kafka.
- [ ] Diseño idempotente en consumidores (mismos mensajes procesados más de una vez no deben duplicar efectos).
- [ ] Dead-letter queues para mensajes que fallan repetidamente.

## 5. Resiliencia
- [ ] Timeouts explícitos en toda llamada a servicios externos/BD (doc. base, 4.10 — valores de referencia: BD 5s, API externa 10s, ajustar a SLA real).
- [ ] Circuit breakers y retries con backoff exponencial para llamadas a servicios externos (doc. base, sección 25).
- [ ] Graceful shutdown: no perder requests/mensajes en curso durante despliegues o autoscaling down (doc. base, sección 25).
- [ ] Health checks (liveness/readiness) para que el orquestador sepa cuándo reiniciar o dejar de enrutar tráfico a una instancia.

## 6. Contenedores (si aplica)
- [ ] Imágenes base mínimas (distroless/alpine) y escaneo de vulnerabilidades de imagen (Trivy, Snyk, etc.).
- [ ] Sin secretos horneados en la imagen; inyectados en runtime (ver sección 8).
- [ ] Límites de CPU/memoria definidos por contenedor (requests/limits) para evitar noisy neighbors.
- [ ] Usuario no-root dentro del contenedor.

## 7. Serverless (si aplica)
- [ ] Cold start considerado en el diseño (tamaño del paquete, dependencias mínimas).
- [ ] Funciones con una sola responsabilidad, timeouts y memoria ajustados a la carga real.
- [ ] Costos por invocación monitoreados (ver FinOps, punto 10).

## 8. Secretos y seguridad cloud-native
- [ ] Gestión de secretos vía el servicio nativo del proveedor: Azure Key Vault, AWS Secrets Manager, HashiCorp Vault (doc. base, 4.6).
- [ ] Identidades administradas (Managed Identity/IAM roles) en vez de credenciales estáticas cuando el proveedor lo permita.
- [ ] Redes: segmentación (VPC/VNet, subnets privadas), reglas de firewall/NSG mínimas necesarias.
- [ ] Cifrado en tránsito (TLS) y en reposo (AES-256) para datos sensibles (doc. base, 4.7).

## 9. Observabilidad distribuida
- [ ] Logging centralizado agregando logs de todas las instancias/servicios.
- [ ] Métricas: requests/seg, latencia, error rate, CPU, memoria por servicio (doc. base, 4.14–4.15).
- [ ] Trazabilidad distribuida: Correlation ID / tracing (OpenTelemetry, Application Insights, X-Ray) propagado entre servicios (doc. base, 4.16).
- [ ] Alertas operativas con umbrales claros: latencia > 2s, error rate > 5%, CPU > 80% (doc. base, 4.17 — ajustar a SLA real).

## 10. Costos y continuidad (FinOps y DRP)
- [ ] Monitoreo de costos por servicio/recurso (FinOps) para evitar sorpresas de facturación.
- [ ] Plan de recuperación ante desastres (DRP) con RTO/RPO definidos, no solo backups (doc. base, sección 25).
- [ ] Backups con prueba periódica de restauración (doc. base, sección 21).

## 11. Despliegue
- [ ] Infraestructura como código versionada (Terraform/Bicep/CloudFormation) — sin cambios manuales "a mano" en el portal para producción.
- [ ] Estrategia de despliegue: blue-green, canary o rolling update, combinada con feature flags para rollback rápido sin redeploy (doc. base, sección 25).
- [ ] Pipeline de CI/CD que incluya build, pruebas, escaneo de seguridad/dependencias y despliegue (ver `01-Comun-Transversal.md`, sección 7).

## 12. Ver también
- `07-ADR-Decisiones-Arquitectura.md` (registro obligatorio de decisiones de arquitectura/diseño)
- `01-Comun-Transversal.md`
- `03-API-Backend.md`
- Documento base: `../MejoresPracticasDesarrolloSoftwareYApis.md`, secciones 4.9–4.17, 21, 25
