import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useServicios } from '@/infrastructure/db/hooks';
import { AvisoAlmacenamiento } from '@/shared/ui/AvisoAlmacenamiento';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Icon } from '@/shared/ui/Icon';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { QuickActionGrid } from '@/shared/ui/QuickActionGrid';

import { AvisoIniciarSesion } from './AvisoIniciarSesion';

export function InicioPage(): React.JSX.Element {
  const { t } = useTranslation(['inicio', 'servicios', 'navegacion']);
  const navigate = useNavigate();
  const servicios = useServicios();
  const borradores = servicios.filter((servicio) => servicio.estado === 'BORRADOR').length;

  return (
    <div>
      <AvisoIniciarSesion />
      <AvisoAlmacenamiento />
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
              ]}
            />
          </>
        )}
      </Card>
    </div>
  );
}
