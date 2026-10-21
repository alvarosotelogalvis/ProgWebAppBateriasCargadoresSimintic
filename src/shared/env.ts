import { z } from 'zod';

const uuid = z.string().uuid('Debe ser un UUID v4 valido');

const esquema = z.object({
  VITE_APP_ENV: z.enum(['dev', 'prd']),
  VITE_AUTH_MODE: z.enum(['mock', 'msal']),
  VITE_ENTRA_CLIENT_ID: uuid,
  VITE_ENTRA_TENANT_ID: uuid,
  VITE_SHAREPOINT_SITE_URL: z.string().url('Debe ser una URL valida'),
  VITE_SHAREPOINT_SITE_NAME: z.string().min(1),
});

export type Entorno = z.infer<typeof esquema>;

export type ResultadoEnv =
  | { ok: true; env: Entorno }
  | { ok: false; error: string; campos: string[] };

function leerBruto(): Record<string, unknown> {
  return import.meta.env as unknown as Record<string, unknown>;
}

/**
 * Valida la configuracion del build. Nunca lanza: la UI decide como mostrar el error
 * (SDD 16.1 - pantalla de error de configuracion, no pantalla en blanco).
 */
export function validarEnv(bruto: Record<string, unknown> = leerBruto()): ResultadoEnv {
  const resultado = esquema.safeParse(bruto);
  if (resultado.success) {
    return { ok: true, env: resultado.data };
  }
  const campos = resultado.error.issues.map((i) => i.path.join('.') || '(raiz)');
  const mensaje = resultado.error.issues
    .map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`)
    .join('; ');
  return { ok: false, error: mensaje, campos };
}

let cacheado: ResultadoEnv | undefined;

export function obtenerEnv(): ResultadoEnv {
  cacheado ??= validarEnv();
  return cacheado;
}

/** Lanza si la configuracion es invalida. Solo para uso en tests y scripts. */
export function envObligatorio(): Entorno {
  const resultado = obtenerEnv();
  if (!resultado.ok) {
    throw new Error(`Configuracion invalida: ${resultado.error}`);
  }
  return resultado.env;
}
