import { PublicClientApplication } from '@azure/msal-browser';

import { obtenerEnv } from '@/shared/env';

import { crearMsalConfig } from './msalConfig';

let instancia: PublicClientApplication | undefined;

export function obtenerMsalInstance(): PublicClientApplication {
  if (instancia) return instancia;

  const resultado = obtenerEnv();
  if (!resultado.ok) {
    throw new Error(`Configuracion de autenticacion invalida: ${resultado.error}`);
  }

  instancia = new PublicClientApplication(crearMsalConfig(resultado.env, window.location.origin));
  return instancia;
}
