# Buenas Prácticas — Aplicaciones Web (Frontend)

> Derivado de `../MejoresPracticasDesarrolloSoftwareYApis.md`, sección 3 (Frontend). Léase junto con `01-Comun-Transversal.md` y, si la app tiene su propio backend, `03-API-Backend.md`.

## 1. Alcance
Aplica a apps que se consumen desde un navegador: SPA, MPA, sitios con SSR/SSG, PWA, portales internos, dashboards, e-commerce, etc.

## 2. Decisiones clave 🔶 (preguntar antes de implementar)
- Framework/librería: React, Angular, Vue, Svelte, u otro.
- Modelo de renderizado: **SPA**, **MPA**, **SSR**, **SSG** o **CSR** — depende de SEO, tiempo de carga inicial y complejidad de interacción requeridos.
- Gestión de estado: local vs. global (Redux, Zustand, Context API, Signals, etc.).
- Organización del código: por features/módulos vs. por tipo de archivo.
- ¿Requiere SEO? Si es crítico, priorizar SSR/SSG sobre CSR puro.
- ¿Requiere soporte offline / instalable? → evaluar PWA.
- Herramienta de build: Vite, Webpack, u otra.

### 2.1 Registro de decisiones (ADR) — obligatorio **[Generado por Claude]**
Cada decisión anterior, una vez respondida, se registra como ADR en `docs/adr/` (proceso y plantilla en `07-ADR-Decisiones-Arquitectura.md`). Si la decisión cambia, se crea un ADR nuevo que reemplaza al anterior. ADR mínimos para una app web, además de los transversales:
- [ ] Framework/librería frontend.
- [ ] Modelo de renderizado (SPA / MPA / SSR / SSG / CSR) y justificación (SEO, carga inicial, interactividad).
- [ ] Estrategia de gestión de estado (local vs. global y librería).
- [ ] Organización del código (por features/módulos vs. por tipo).
- [ ] Herramienta de build/bundling.
- [ ] PWA / soporte offline (sí o no, y estrategia de caché).
- [ ] Estrategia de consumo de APIs y manejo de tokens en el cliente (ver sección 3.10).
- [ ] i18n y SEO (si aplican, o registrar "No aplica").

## 3. Checklist de buenas prácticas (doc. base, sección 3)

### 3.1 Arquitectura
- [ ] Componentes reutilizables (component-based).
- [ ] Organización por features/módulos definida y consistente.

### 3.2 Gestión de estado
- [ ] Estado local vs. global bien delimitado.
- [ ] Sin estado duplicado o desincronizado entre componentes.

### 3.3 Enrutamiento
- [ ] Rutas públicas vs. privadas claramente definidas.
- [ ] Lazy loading de rutas/módulos.
- [ ] Guards de navegación según autenticación/autorización.

### 3.4 Formularios y validación
- [ ] Validación en cliente **complementa**, nunca reemplaza, la validación en backend.
- [ ] Mensajes de error claros y accesibles.
- [ ] Estados de loading/error/éxito/deshabilitado durante el envío.

### 3.5 Consumo de APIs
- [ ] Manejo consistente de loading/error/datos vacíos.
- [ ] Reintentos controlados y cancelación de solicitudes (`AbortController`) al desmontar/cambiar de vista.
- [ ] Capa de servicios/cliente HTTP centralizada (no llamadas dispersas).

### 3.6 Rendimiento
- [ ] Code splitting y lazy loading de componentes pesados.
- [ ] Memoización de componentes y cálculos costosos.
- [ ] Virtualización de listas largas.
- [ ] Optimización de imágenes (formatos modernos, lazy loading, tamaños responsivos).
- [ ] Medición con Lighthouse / Core Web Vitals (LCP, FID/INP, CLS).

### 3.7 Accesibilidad (a11y)
- [ ] Cumplimiento WCAG.
- [ ] ARIA y HTML semántico correctos.
- [ ] Navegación completa por teclado.
- [ ] Contraste de colores adecuado.

### 3.8 Responsivo y compatibilidad
- [ ] Mobile-first y breakpoints definidos.
- [ ] Pruebas cross-browser.
- [ ] Compatibilidad con distintos tamaños/tipos de dispositivo.

### 3.9 i18n / l10n (si aplica)
- [ ] Textos externalizados (sin strings hardcodeados).
- [ ] Formato de fechas, monedas y números según localización.

### 3.10 Seguridad frontend
- [ ] Protección contra XSS (sanitización, evitar `innerHTML` sin control).
- [ ] Content Security Policy (CSP).
- [ ] No guardar tokens sensibles en `localStorage` sin protección; preferir cookies `HttpOnly` + `Secure`.
- [ ] Sin claves/API keys sensibles expuestas en el código cliente.

### 3.11 SEO (si aplica)
- [ ] Meta tags, Open Graph, `sitemap.xml`, `robots.txt`.
- [ ] Renderizado que permita indexación (SSR/SSG si el SEO es crítico).

### 3.12 Testing
- [ ] Unitarias de componentes (Jest, Vitest).
- [ ] Integración (Testing Library).
- [ ] E2E (Cypress, Playwright).
- [ ] Regresión visual si aplica.

### 3.13 Build y bundling
- [ ] Tree-shaking y minificación.
- [ ] Variables de entorno diferenciadas por ambiente (dev, staging, producción).

### 3.14 Errores y monitoreo en cliente
- [ ] Error boundaries.
- [ ] Logging/monitoreo de errores en producción (ej. Sentry).
- [ ] Analítica de uso e interacción.

## 4. Consideraciones adicionales **[Generado por Claude]**
- Progressive Web App (PWA): service worker, manifest, estrategia de caché offline — solo si el usuario confirma que se necesita.
- Web Vitals y presupuesto de performance (performance budget) como parte del pipeline de CI.
- Seguridad de CORS y cabeceras (`Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`) coordinada con el backend.

## 5. Ver también
- `07-ADR-Decisiones-Arquitectura.md` (registro obligatorio de decisiones de arquitectura/diseño)
- `01-Comun-Transversal.md`
- `03-API-Backend.md` (si la app tiene backend propio)
- `06-App-Nube-CloudNative.md` (si el hosting/despliegue es cloud-native)
- Documento base: `../MejoresPracticasDesarrolloSoftwareYApis.md`, sección 3
