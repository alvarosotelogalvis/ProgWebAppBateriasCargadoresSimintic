import { useTranslation } from 'react-i18next';

import type { ResumenSync } from '@/application/sync/eventosSync';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { ResponsiveDialog } from '@/shared/ui/ResponsiveDialog';

import styles from './ResumenSyncDialog.module.css';

interface Props {
  readonly resumen: ResumenSync | null;
  readonly onCerrar: () => void;
}

/** Resumen al terminar (ES-005-19) o aviso de sync en otra ventana (ES-005-20). */
export function ResumenSyncDialog({ resumen, onCerrar }: Props): React.JSX.Element {
  const { t } = useTranslation('sync');

  const cifras = resumen
    ? [
        { clave: 'subidos', valor: resumen.subidos },
        { clave: 'archivos', valor: resumen.archivos },
        { clave: 'errores', valor: resumen.errores },
        { clave: 'conflictos', valor: resumen.conflictos },
      ]
    : [];

  return (
    <ResponsiveDialog
      titulo={t('resumenFinal.titulo')}
      abierto={resumen !== null}
      onCerrar={onCerrar}
    >
      {resumen ? (
        <div className={styles.contenido!}>
          {resumen.ocupado ? (
            <p className={styles.texto!} role="status">
              {t('resumenFinal.ocupado')}
            </p>
          ) : (
            <>
              <p className={styles.resultado!} role="status">
                {t(`resumenFinal.resultado.${resumen.resultado}`)}
              </p>
              <dl className={styles.cifras!}>
                {cifras.map(({ clave, valor }) => (
                  <div key={clave} className={styles.cifra!}>
                    <dt>{t(`resumenFinal.${clave}`)}</dt>
                    <dd>{valor}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          <PrimaryButton onPress={onCerrar}>{t('resumenFinal.cerrar')}</PrimaryButton>
        </div>
      ) : null}
    </ResponsiveDialog>
  );
}
