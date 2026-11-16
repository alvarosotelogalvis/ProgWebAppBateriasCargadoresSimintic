import type { PublicClientApplication } from '@azure/msal-browser';

import { obtenerEnv } from '@/shared/env';

import { crearMsalConfig } from './msalConfig';

let instancia: Promise<PublicClientApplication> | undefined;

/**
 * Devuelve la instancia de MSAL ya inicializada. La librería (~110 KB gzip) se descarga bajo demanda
 * como un chunk aparte para que no pese en el arranque ni en el modo `mock`.
 */
export function obtenerMsalInstance(): Promise<PublicClientApplication> {
  instancia ??= crear();
  return instancia;
}

async function crear(): Promise<PublicClientApplication> {
  const resultado = obtenerEnv();
  if (!resultado.ok) {
    throw new Error(`Configuracion de autenticacion invalida: ${resultado.error}`);
  }

  const { PublicClientApplication: Cliente } = await import('@azure/msal-browser');
  const cliente = new Cliente(crearMsalConfig(resultado.env, window.location.origin));
  await cliente.initialize();
  return cliente;
}
