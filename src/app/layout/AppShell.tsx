import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { GradientBackground } from '@/shared/ui/GradientBackground';
import { ResponsiveNav, type ItemNav } from '@/shared/ui/ResponsiveNav';
import { Toast } from '@/shared/ui/Toast';
import { AvisoActualizacion } from '@/features/actualizacion/AvisoActualizacion';
import { AvisoConexion } from '@/features/sincronizacion/components/AvisoConexion';
import { usePendientes } from '@/infrastructure/db/hooks';

import { BarraSuperior } from '@/app/layout/BarraSuperior';
import { BotonNuevo } from '@/app/layout/BotonNuevo';

import styles from './AppShell.module.css';

const ITEMS_NAV: readonly ItemNav[] = [
  {
    id: 'inicio',
    ruta: '/',
    icono: 'inicio',
    etiquetaKey: 'navegacion:inicio',
    grupo: 'principal',
  },
  {
    id: 'servicios',
    ruta: '/servicios',
    icono: 'servicios',
    etiquetaKey: 'navegacion:servicios',
    grupo: 'principal',
  },
  {
    id: 'sincronizar',
    ruta: '/sincronizacion',
    icono: 'sincronizar',
    etiquetaKey: 'navegacion:sincronizar',
    grupo: 'principal',
  },
  { id: 'mas', ruta: '/mas', icono: 'mas', etiquetaKey: 'navegacion:mas', grupo: 'principal' },
  {
    id: 'ajustes',
    ruta: '/ajustes',
    icono: 'configuracion',
    etiquetaKey: 'navegacion:ajustes',
    grupo: 'mas',
  },
  { id: 'ayuda', ruta: '/ayuda', icono: 'ayuda', etiquetaKey: 'navegacion:ayuda', grupo: 'mas' },
  {
    id: 'acerca',
    ruta: '/acerca',
    icono: 'acerca',
    etiquetaKey: 'navegacion:acerca',
    grupo: 'mas',
  },
  {
    id: 'alertas',
    ruta: '/alertas',
    icono: 'notificaciones',
    etiquetaKey: 'navegacion:alertas',
    grupo: 'mas',
  },
];

export function AppShell(): React.JSX.Element {
  const { t } = useTranslation(['navegacion', 'common']);
  // Mantiene el contador global de pendientes al día en toda la app (T030, ES-005-23).
  const pendientes = usePendientes();
  const items = ITEMS_NAV.map((item) =>
    item.id === 'sincronizar' ? { ...item, badge: pendientes } : item
  );

  return (
    <GradientBackground variante="suave">
      <div className={styles.shell!}>
        <BarraSuperior />
        <div className={styles.cuerpo!}>
          <ResponsiveNav
            items={items}
            etiquetaDe={(clave) => t(clave.startsWith('navegacion:') ? clave.slice(11) : clave)}
          />
          <main className={styles.contenido!} id="contenido-principal">
            <AvisoActualizacion />
            <AvisoConexion />
            <Outlet />
          </main>
        </div>
        <BotonNuevo etiqueta={t('navegacion:nuevo')} />
      </div>
      <Toast />
    </GradientBackground>
  );
}
