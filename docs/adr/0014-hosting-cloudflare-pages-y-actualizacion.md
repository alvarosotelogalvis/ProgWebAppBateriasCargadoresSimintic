# ADR-0014 — Hosting en Cloudflare Pages con despliegue manual y actualización de la app vía service worker

- **Estado**: Aceptado (familia GitHub Pages / Cloudflare Pages elegida por el usuario) · Propuesto (Cloudflare sobre GitHub Pages)
- **Fecha**: 2026-10-21
- **Decisores**: Álvaro Sotelo (eligió "GitHub Pages / Cloudflare Pages"); Claude recomienda Cloudflare Pages
- **Origen en la guía**: `01-Comun` §11.1 (mecanismo de actualización), doc. base §19.1, `02-App-Web.md` §4 (cabeceras)

## Contexto

La PWA necesita HTTPS, una URL fija (Redirect URI de Entra ID), fallback de SPA, **cabeceras de seguridad propias** (CSP, HSTS) y control de caché del `sw.js`. El código no debería ser público. No hay CI/CD.

## Opciones consideradas

1. **GitHub Pages**. Pros: gratis y simple. Contras: **no permite cabeceras HTTP propias** (la CSP solo vía `<meta>`, sin `frame-ancestors` ni HSTS propio), Pages desde un repo privado requiere un plan de pago, y el fallback de SPA necesita el truco de `404.html`.
2. **Cloudflare Pages**. Pros: gratis, repos privados o subida directa, archivo `_headers` (CSP, HSTS, caché), fallback de SPA automático, despliegues de preview por rama (DEV), rollback con un clic y despliegue manual con `wrangler pages deploy` (sin CI/CD). Contras: otra cuenta (de la empresa) que administrar.
3. Azure Static Web Apps. Descartada por el usuario.

## Decisión

- **Cloudflare Pages**, proyecto `servicio-tecnico-pwa`, despliegue **manual** con Wrangler desde el PC del desarrollador: rama `dev` (preview = ambiente DEV) y `main` (producción).
- Cabeceras en `public/_headers` (SDD §14.2). `sw.js` e `index.html` con `Cache-Control: no-cache`.
- **Actualización de la app** (mecanismo de la guía §19.1 = "pipeline/estático + auto-actualización integrada"): `vite-plugin-pwa` con `registerType: 'prompt'`, aviso "Nueva versión" sin interrumpir formularios, comprobación al iniciar y cada 60 min, y `VersionMinimaApp` remota para forzar la actualización antes de sincronizar.
- Cloudflare solo sirve archivos estáticos: **ningún dato de negocio pasa por Cloudflare**.

## Consecuencias

- **Positivas**: CSP real, sin costo y rollback inmediato.
- **Negativas**: la cuenta de Cloudflare debe ser corporativa (PA-11) para no depender de una persona.
- **Riesgos**: cambio de URL (dominio propio) → hay que agregar el Redirect URI nuevo en Entra ID **antes** de cambiar.

## Cumplimiento / verificación

Checklist de release (`docs/09` §3). Verificar las cabeceras con `curl -I` o DevTools tras cada despliegue.

## Referencias

- `docs/09` · SDD §11, §14.2
