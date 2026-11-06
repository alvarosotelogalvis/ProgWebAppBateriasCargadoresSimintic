import { useTranslation } from 'react-i18next';

import { BarList, type ItemBarList } from '@/shared/ui/BarList';
import { Card } from '@/shared/ui/Card';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import type { FilaSync } from '../store/useSyncStore';

import styles from './ProgresoSync.module.css';

interface Props {
  readonly filas: readonly FilaSync[];
  readonly cancelando: boolean;
  readonly onCancelar: () => void;
}

const porcentaje = (enviados: number, totales: number): number =>
  totales > 0 ? (enviados / totales) * 100 : 0;

function avanceServicio(fila: FilaSync): number {
  if (fila.estado === 'listo') return 100;
  if (fila.estado !== 'subiendo' || fila.archivos.length === 0) return 0;

  const esperados = Math.max(fila.archivosEsperados ?? 0, fila.archivos.length);
  const suma = fila.archivos.reduce((total, a) => total + porcentaje(a.enviados, a.totales), 0);
  return suma / esperados;
}

const terminado = (archivo: FilaSync['archivos'][number]): boolean =>
  archivo.totales > 0 && archivo.enviados >= archivo.totales;

/**
 * Avance por servicio (barra `primary`) y por archivo en curso (barra `accent`).
 * ES-005-14 y ES-005-15.
 */
export function ProgresoSync({ filas, cancelando, onCancelar }: Props): React.JSX.Element {
  const { t } = useTranslation('sync');

  const items: ItemBarList[] = filas.flatMap((fila) => {
    const enCurso = fila.estado === 'subiendo' ? fila.archivos.filter((a) => !terminado(a)) : [];
    const listos = fila.archivos.filter(terminado).length;
    const esperados = fila.archivosEsperados ?? fila.archivos.length;

    const detalle =
      fila.estado === 'subiendo' && esperados > 0
        ? t('progreso.archivoDe', { actual: Math.min(listos + 1, esperados), total: esperados })
        : t(`progreso.estado.${fila.estado}`);

    const servicio: ItemBarList = {
      id: fila.servicioId,
      etiqueta: fila.codigo,
      valor: avanceServicio(fila),
      detalle,
      tono: fila.estado === 'error' || fila.estado === 'conflicto' ? 'peligro' : 'primary',
    };

    const archivos: ItemBarList[] = enCurso.map((archivo) => ({
      id: `${fila.servicioId}:${archivo.adjuntoId}`,
      etiqueta: archivo.nombre,
      valor: porcentaje(archivo.enviados, archivo.totales),
      tono: 'accent',
    }));

    return [servicio, ...archivos];
  });

  return (
    <Card fill className={styles.tarjeta!}>
      <h2 className={styles.titulo!}>{t('progreso.titulo')}</h2>
      <BarList items={items} etiqueta={t('progreso.etiquetaLista')} />
      <SecondaryButton isDisabled={cancelando} onPress={onCancelar} className={styles.cancelar!}>
        {cancelando ? t('progreso.cancelando') : t('progreso.cancelar')}
      </SecondaryButton>
    </Card>
  );
}
