# ADR-0020 — Ambientes DEV y PRD con sitio de SharePoint y App Registration separados

- **Estado**: Propuesto
- **Fecha**: 2026-10-21
- **Decisores**: Propuesto por Claude; pendiente de aprobación de Álvaro Sotelo
- **Origen en la guía**: doc. base §6.3 (ambientes), §10 (variables de entorno), `01-Comun` §5

## Contexto
Se necesita probar contra SharePoint real sin contaminar los datos de producción, y probar en iOS (que requiere HTTPS público). Un solo desarrollador: más ambientes significa más mantenimiento.

## Opciones consideradas
1. **Solo producción**. ❌ Las pruebas contaminan los datos reales.
2. **DEV + PRD** (QA y staging se fusionan con DEV). Pros: equilibrio para un solo desarrollador.
3. **DEV + QA + PRD**. Contras: triplica la configuración del tenant sin un beneficio claro hoy.

## Decisión
- **DEV**: `localhost` + `dev.<proyecto>.pages.dev`, sitio `/sites/ServicioTecnicoBC-DEV`, App Registration `ServicioTec-PWA-DEV` y flujos de Power Automate apuntando a DEV con correos de prueba.
- **PRD**: `<proyecto>.pages.dev` (o dominio propio), sitio `/sites/ServicioTecnicoBC`, App Registration `ServicioTec-PWA`.
- Configuración por `.env.development` / `.env.production` (solo valores públicos) validada con zod. `.env.test` usa auth mock y Graph simulado.
- La configuración de negocio ajustable vive en `ConfiguracionApp` de cada sitio (sin redesplegar).
- El ambiente se muestra en Acerca de, y en DEV una franja "DEV" en la barra superior.

## Consecuencias
- **Positivas**: pruebas reales en dispositivos (incluido iOS) sin riesgo para producción.
- **Negativas**: doble configuración del tenant (mitigada con el checklist de `docs/06` §4 y el script de aprovisionamiento).

## Referencias
- SDD §16 · `docs/09` §1
