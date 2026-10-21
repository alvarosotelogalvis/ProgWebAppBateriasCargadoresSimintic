import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import acerca from '@/locales/es-CO/acerca.json';
import actualizacion from '@/locales/es-CO/actualizacion.json';
import ajustes from '@/locales/es-CO/ajustes.json';
import alertas from '@/locales/es-CO/alertas.json';
import ayuda from '@/locales/es-CO/ayuda.json';
import comun from '@/locales/es-CO/common.json';
import conexion from '@/locales/es-CO/conexion.json';
import config from '@/locales/es-CO/config.json';
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
      ajustes,
      alertas,
      ayuda,
      comun,
      conexion,
      config,
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
