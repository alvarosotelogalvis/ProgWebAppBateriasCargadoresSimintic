import { z } from 'zod';

/**
 * Zod 4 comprueba al primer uso si puede compilar validadores con `new Function` (JIT). Con la CSP de
 * producción (`script-src 'self'`, sin `unsafe-eval`) esa prueba falla aunque zod la captura, y el
 * navegador igualmente registra una violación en cada carga. Se desactiva el JIT: los esquemas de la app
 * son pequeños y la validación sigue siendo la misma (spike S8).
 */
z.config({ jitless: true });
