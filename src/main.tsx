import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import '@/shared/ui/global.css';

import { App } from '@/app/App';

const contenedor = document.getElementById('root');
if (!contenedor) {
  throw new Error('No se encontro el elemento #root en index.html');
}

createRoot(contenedor).render(
  <StrictMode>
    <App />
  </StrictMode>
);
