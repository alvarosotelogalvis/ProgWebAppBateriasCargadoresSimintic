import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useContainer } from '@/app/containerContext';
import { useAntiguedadPendientes, useServicios } from '@/infrastructure/db/hooks';
import { AvisoAlmacenamiento } from '@/shared/ui/AvisoAlmacenamiento';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Icon } from '@/shared/ui/Icon';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { QuickActionGrid } from '@/shared/ui/QuickActionGrid';

import { AvisoIniciarSesion } from './AvisoIniciarSesion';
import { RecordatorioPendientes } from './components/RecordatorioPendientes';

export function InicioPage(): React.JSX.Element {
  const { t } = useTranslation(['inicio', 'servicios', 'navegacion']);
  const navigate = useNavigate();
  const container = useContainer();
  const servicios = useServicios();
  const pendientes = useAntiguedadPendientes();
  const borradores = servicios.filter((servicio) => servicio.estado === 'BORRADOR').length;

  return (
    <div>
      <AvisoIniciarSesion />
      <AvisoAlmacenamiento />
      <RecordatorioPendientes
        cantidad={pendientes.cantidad}
        {...(pendientes.masAntiguoEn ? { masAntiguoEn: pendientes.masAntiguoEn } : {})}
        umbralHoras={container.config().recordatorioPendientesHoras}
        onSincronizar={() => navigate('/sincronizacion')}
      />
      <Card fill>
        {servicios.length === 0 ? (
          <EmptyState
            titulo={t('inicio:vacio.titulo')}
            descripcion={t('inicio:vacio.descripcion')}
            accion={
              <PrimaryButton onPress={() => navigate('/servicios/nuevo')}>
                <Icon nombre="nuevo" tamano={20} />
                {t('servicios:nuevo')}
              </PrimaryButton>
            }
          />
        ) : (
          <>
            <h1>{t('navegacion:inicio')}</h1>
            <QuickActionGrid
              acciones={[
                {
                  id: 'nuevo',
                  etiqueta: t('servicios:nuevo'),
                  icono: <Icon nombre="nuevo" tamano={28} />,
                  onClick: () => navigate('/servicios/nuevo'),
                },
                {
                  id: 'servicios',
                  etiqueta: t('navegacion:servicios'),
                  icono: <Icon nombre="servicios" tamano={28} />,
                  badge: borradores,
                  onClick: () => navigate('/servicios'),
                },
                {
                  id: 'sincronizar',
                  etiqueta: t('inicio:accesos.sincronizar'),
                  icono: <Icon nombre="sincronizar" tamano={28} />,
                  badge: pendientes.cantidad,
                  onClick: () => navigate('/sincronizacion'),
                },
              ]}
            />
          </>
        )}
      </Card>
    </div>
  );
}
