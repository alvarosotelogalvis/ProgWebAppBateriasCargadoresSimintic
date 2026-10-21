/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare const __APP_VERSION__: string;
declare const __GIT_COMMIT__: string;
declare const __BUILD_DATE__: string;

interface ImportMetaEnv {
  readonly VITE_APP_ENV: 'dev' | 'prd';
  readonly VITE_AUTH_MODE: 'mock' | 'msal';
  readonly VITE_ENTRA_CLIENT_ID: string;
  readonly VITE_ENTRA_TENANT_ID: string;
  readonly VITE_SHAREPOINT_SITE_URL: string;
  readonly VITE_SHAREPOINT_SITE_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
