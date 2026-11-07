import { useParams } from 'react-router-dom';
import { useContainer } from '@/app/containerContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRoles } from '@/shared/hooks/useRoles';
import { useTranslation } from 'react-i18next';
import FormEtapa from '../components/FormEtapa';

export function EtapaAnulacionPage() {
  const { id } = useParams<{ id: string }>();
  const container = useContainer();
  const roles = useRoles();
  const { t } = useTranslation('common');

  const servicio = useLiveQuery(async () => {
    if (!id) return undefined;
    return container.db.servicios.get(id);
  }, [id, container.db]);

  if (!servicio) return <div>{t('cargando')}</div>;

  return <FormEtapa servicio={servicio} etapa="anulacion" roles={roles} onComplete={() => {}} />;
}
