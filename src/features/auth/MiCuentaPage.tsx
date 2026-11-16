import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import { usePendientes } from '@/infrastructure/db/hooks';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { Avatar } from '@/shared/ui/Avatar';
import { Card } from '@/shared/ui/Card';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import { DialogoCerrarSesion } from './DialogoCerrarSesion';
import styles from './MiCuentaPage.module.css';

const formatearFecha = (iso: string | undefined): string => {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha);
};

export function MiCuentaPage(): React.JSX.Element {
  const { t } = useTranslation(['auth', 'configuracion']);
  const navigate = useNavigate();
  const { auth } = useContainer();
  const cuenta = useSesionStore((estado) => estado.cuenta);
  const setCuenta = useSesionStore((estado) => estado.setCuenta);
  const pendientes = usePendientes();
  const [dialogo, setDialogo] = useState(false);

  const cambiarCuenta = async (): Promise<void> => {
    await auth.cambiarCuenta();
    setCuenta(auth.cuentaActiva());
  };

  const cerrarSesion = async (): Promise<void> => {
    setDialogo(false);
    await auth.cerrarSesion();
    setCuenta(null);
    useSesionStore.getState().setConfiguracionInicialCompleta(false);
    navigate('/configuracion-inicial', { replace: true });
  };

  if (!cuenta) {
    return (
      <Card fill>
        <p>{t('miCuenta.sinCuenta')}</p>
        <SecondaryButton onPress={() => navigate('/configuracion-inicial')}>
          {t('configuracion:login.boton')}
        </SecondaryButton>
      </Card>
    );
  }

  const ultimoLogin = formatearFecha(cuenta.ultimoLoginInteractivoEn);

  return (
    <div className={styles.pantalla!}>
      <Card fill className={styles.tarjeta!}>
        <Avatar nombre={cuenta.nombre} letras={2} tamano="grande" />
        <h1 className={styles.nombre!}>{cuenta.nombre}</h1>
        <p className={styles.correo!}>{cuenta.correo}</p>

        <div className={styles.roles!} aria-label={t('miCuenta.roles')}>
          {cuenta.roles.map((rol) => (
            <span key={rol} className={styles.rol!}>
              {rol}
            </span>
          ))}
        </div>

        <p className={styles.ultimoLogin!}>
          {t('miCuenta.ultimoLogin')}: {ultimoLogin || t('miCuenta.sinUltimoLogin')}
        </p>

        <div className={styles.acciones!}>
          <PrimaryButton onPress={() => void cambiarCuenta()}>
            {t('miCuenta.cambiarCuenta')}
          </PrimaryButton>
          <SecondaryButton onPress={() => setDialogo(true)}>
            {t('miCuenta.cerrarSesion')}
          </SecondaryButton>
        </div>
      </Card>

      <DialogoCerrarSesion
        abierto={dialogo}
        pendientes={pendientes}
        onConfirmar={() => void cerrarSesion()}
        onCancelar={() => setDialogo(false)}
      />
    </div>
  );
}
