import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import acerca from '@/locales/es-CO/acerca.json';
import actualizacion from '@/locales/es-CO/actualizacion.json';
import adjuntos from '@/locales/es-CO/adjuntos.json';
import ajustes from '@/locales/es-CO/ajustes.json';
import alertas from '@/locales/es-CO/alertas.json';
import auth from '@/locales/es-CO/auth.json';
import ayuda from '@/locales/es-CO/ayuda.json';
import common from '@/locales/es-CO/common.json';
import conexion from '@/locales/es-CO/conexion.json';
import config from '@/locales/es-CO/config.json';
import configuracion from '@/locales/es-CO/configuracion.json';
import errores from '@/locales/es-CO/errores.json';
import inicio from '@/locales/es-CO/inicio.json';
import instalacion from '@/locales/es-CO/instalacion.json';
import navegacion from '@/locales/es-CO/navegacion.json';
import servicios from '@/locales/es-CO/servicios.json';
import sync from '@/locales/es-CO/sync.json';
import tecnico from '@/locales/es-CO/tecnico.json';

export const LOCALES = ['es-CO'] as const;
export const LOCALE_POR_DEFECTO = 'es-CO';

void i18n.use(initReactI18next).init({
  resources: {
    'es-CO': {
      acerca,
      actualizacion,
      adjuntos,
      ajustes,
      alertas,
      auth,
      ayuda,
      common,
      conexion,
      config,
      configuracion,
      errores,
      inicio,
      instalacion,
      navegacion,
      servicios,
      sync,
      tecnico,
    },
  },
  lng: LOCALE_POR_DEFECTO,
  fallbackLng: LOCALE_POR_DEFECTO,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
