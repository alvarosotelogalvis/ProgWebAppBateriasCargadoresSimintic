import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import { esFinal } from '@/domain/estados';
import { useServicio } from '@/infrastructure/db/hooks';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import DialogoAnulacion from '../components/DialogoAnulacion';
import styles from './EtapaPage.module.css';

/** Anulación (HU-007-8): solo Administrador, con motivo y por el caso de uso `anular`. */
export function EtapaAnulacionPage(): React.JSX.Element {
  const { id = '' } = useParams();
  const { t } = useTranslation(['etapas', 'servicios']);
  const navigate = useNavigate();
  const { casosDeUso } = useContainer();
  const servicio = useServicio(id);
  const roles = useSesionStore((estado) => estado.roles);

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string>();

  if (!servicio) return <p role="status">{t('servicios:detalle.noEncontrado')}</p>;

  const puedeAnular =
    roles.includes('Administrador') && servicio.estado !== 'BORRADOR' && !esFinal(servicio.estado);

  const anular = async (motivo: string): Promise<void> => {
    setCargando(true);
    setError(undefined);
    try {
      await casosDeUso.anular(servicio.id, motivo, roles);
      navigate(`/servicios/${servicio.id}`, { replace: true });
    } catch {
      setError(t('etapas:anulacion.error'));
      setCargando(false);
    }
  };

  return (
    <div className={styles.formulario!}>
      <header>
        <h1>{t('etapas:anulacion.titulo')}</h1>
        <p>{t('etapas:anulacion.subtitulo')}</p>
      </header>

      {puedeAnular ? (
        <Card fill>
          <div className={styles.acciones!}>
            <SecondaryButton onPress={() => navigate(`/servicios/${servicio.id}`)}>
              {t('etapas:cancelar')}
            </SecondaryButton>
            <PrimaryButton onPress={() => setDialogoAbierto(true)} isDisabled={cargando}>
              {t('etapas:anulacion.anular')}
            </PrimaryButton>
          </div>
        </Card>
      ) : (
        <>
          <Banner tipo="info">{t('etapas:anulacion.error_permisos')}</Banner>
          <div className={styles.acciones!}>
            <SecondaryButton onPress={() => navigate(`/servicios/${servicio.id}`)}>
              {t('servicios:detalle.volver')}
            </SecondaryButton>
          </div>
        </>
      )}

      <DialogoAnulacion
        abierto={dialogoAbierto}
        cargando={cargando}
        error={error}
        onConfirmar={(motivo) => void anular(motivo)}
        onCancelar={() => {
          setError(undefined);
          setDialogoAbierto(false);
        }}
      />
    </div>
  );
}
