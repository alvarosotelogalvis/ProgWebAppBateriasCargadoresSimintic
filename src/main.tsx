import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import '@/shared/ui/global.css';

import { App } from '@/app/App';
import { AppDB } from '@/infrastructure/db/dexie';
import { prepararAutenticacion } from '@/infrastructure/auth/arranque';
import { instalarManejadoresGlobales, LoggerDexie } from '@/infrastructure/logging/logger';
import { leerIntencionVigente } from '@/application/sync/intencionSync';
import { IntencionSyncSessionStorage } from '@/infrastructure/sync/intencionSync';

instalarManejadoresGlobales(new LoggerDexie(new AppDB()));

const contenedor = document.getElementById('root');
if (!contenedor) {
  throw new Error('No se encontro el elemento #root en index.html');
}

/** Tras el redirect del login, retoma la sincronización ya confirmada (ES-005-03). */
function reanudarSincronizacionSiCorresponde(): void {
  const intenciones = new IntencionSyncSessionStorage();
  const intencion = leerIntencionVigente(intenciones, Date.now());
  if (!intencion) return;

  intenciones.limpiar();
  const destino = intencion.returnUrl ?? '/sincronizacion?reanudar=1';
  const actual = `${window.location.pathname}${window.location.search}`;
  if (actual !== destino) window.history.replaceState(null, '', destino);
}

void prepararAutenticacion()
  .then((rechazo) => {
    if (!rechazo) reanudarSincronizacionSiCorresponde();
  })
  .catch(() => undefined)
  .finally(() => {
    createRoot(contenedor).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
