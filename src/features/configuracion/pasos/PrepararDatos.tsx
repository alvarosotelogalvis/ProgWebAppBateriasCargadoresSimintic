import { useTranslation } from 'react-i18next';

import type { EstadoTarea, TareaSetup } from '@/application/setup/configuracionInicial';
import { Card } from '@/shared/ui/Card';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import styles from '../configuracionInicial.module.css';

interface Props {
  readonly estados: readonly EstadoTarea[];
  readonly completa: boolean;
  readonly ocupado: boolean;
  readonly onReintentar: (tarea: TareaSetup) => void;
  readonly onContinuar: () => void;
}

const TAREAS: readonly TareaSetup[] = ['sitio', 'catalogos', 'configuracion', 'almacenamiento'];

const iconoTarea = (estado: EstadoTarea['estado']): IconName => {
  if (estado === 'ok') return 'exito';
  if (estado === 'error') return 'error';
  if (estado === 'advertencia') return 'advertencia';
  if (estado === 'en-curso') return 'refrescar';
  return 'agenda';
};

const claseIcono = (estado: EstadoTarea['estado']): string => {
  if (estado === 'ok') return styles.iconoOk!;
  if (estado === 'error') return styles.iconoError!;
  if (estado === 'advertencia') return styles.iconoAdvertencia!;
  return '';
};

export function PrepararDatos({
  estados,
  completa,
  ocupado,
  onReintentar,
  onContinuar,
}: Props): React.JSX.Element {
  const { t } = useTranslation('configuracion');

  const porTarea = new Map(estados.map((estado) => [estado.tarea, estado]));

  return (
    <main className={styles.centrado!}>
      <div className={styles.tarjeta!}>
        <Card fill>
          <header className={styles.cabecera!}>
            <h1>{t('preparar.titulo')}</h1>
            <p>{t('preparar.descripcion')}</p>
          </header>

          <ul className={styles.tareas!} aria-live="polite">
            {TAREAS.map((tarea) => {
              const estado = porTarea.get(tarea) ?? { tarea, estado: 'pendiente' as const };
              return (
                <li key={tarea} className={styles.tarea!}>
                  <span className={`${styles.iconoTarea!} ${claseIcono(estado.estado)}`}>
                    <Icon nombre={iconoTarea(estado.estado)} tamano={24} />
                  </span>
                  <span className={styles.textosTarea!}>
                    <span className={styles.etiquetaTarea!}>{t(`preparar.tareas.${tarea}`)}</span>
                    <span className={styles.detalleTarea!}>
                      {estado.detalle ?? t(`preparar.estados.${estado.estado}`)}
                    </span>
                  </span>
                  {estado.estado === 'error' || estado.estado === 'advertencia' ? (
                    <SecondaryButton isDisabled={ocupado} onPress={() => onReintentar(tarea)}>
                      {t('preparar.reintentar')}
                    </SecondaryButton>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className={styles.acciones!}>
            <PrimaryButton isDisabled={!completa || ocupado} onPress={onContinuar}>
              {t('preparar.continuar')}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </main>
  );
}
