# Plan NNN — [Nombre de la funcionalidad]

- **Spec**: [spec.md](spec.md) · **Fecha**: AAAA-MM-DD
- **Referencias de diseño**: SDD §… · Modelo de datos §… · ADR …

## 1. Contexto técnico
| Aspecto | Valor |
|---|---|
| Lenguaje / framework | TypeScript strict · React 19 · Vite (ADR-0003) |
| Almacenamiento | … |
| Integraciones | … |
| Pruebas | … |
| Plataformas objetivo | PRD §11 |
| Restricciones de desempeño | … |

## 2. Verificación de la constitución
| Artículo | ¿Cumple? | Cómo |
|---|---|---|
| I Offline primero | ✅/⚠️ | … |
| II Cero pérdida | | |
| III Sin backend ni secretos | | |
| IV Identidad confirmada | | |
| V Idempotencia | | |
| VI Dominio puro y capas | | |
| VII Pruebas primero | | |
| VIII Accesible y es-CO | | |
| IX Seguridad del cliente | | |
| X Simplicidad | | |
| XI Trazabilidad | | |

## 3. Diseño de la funcionalidad
### 3.1 Archivos (crear / modificar)
```
src/…
```
### 3.2 Contratos e interfaces
```ts
// firmas públicas nuevas o modificadas
```
### 3.3 Flujo
[secuencia o pseudocódigo solo si no está ya en el SDD]

### 3.4 Decisiones locales
[decisiones de implementación que no ameritan ADR]

## 4. Estrategia de pruebas
| Nivel | Qué | Archivo |
|---|---|---|

## 5. Riesgos
| Riesgo | Mitigación |
|---|---|

## 6. Seguimiento de complejidad
| Desviación | Por qué es necesaria | Alternativa simple rechazada |
|---|---|---|
