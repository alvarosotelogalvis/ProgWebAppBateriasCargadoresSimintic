import type { Configuration } from '@azure/msal-browser';

import type { Entorno } from '@/shared/env';

export const SCOPES_GRAPH = ['User.Read', 'https://graph.microsoft.com/Sites.Selected'];
export const SCOPES_LOGIN = ['openid', 'profile', 'offline_access', ...SCOPES_GRAPH];

export function crearMsalConfig(env: Entorno, origen: string): Configuration {
  return {
    auth: {
      clientId: env.VITE_ENTRA_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${env.VITE_ENTRA_TENANT_ID}`,
      redirectUri: `${origen}/`,
      postLogoutRedirectUri: `${origen}/`,
      navigateToLoginRequestUrl: true,
    },
    cache: { cacheLocation: 'localStorage' },
    system: { loggerOptions: { piiLoggingEnabled: false } },
  };
}
