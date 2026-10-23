import { useTranslation } from 'react-i18next';

import type { FiltrosServicios as Filtros } from '@/application/servicios/buscarServicios';
import { useCatalogo } from '@/infrastructure/db/hooks';
import { ComboboxField } from '@/shared/ui/ComboboxField';
import { DateRangeFilter } from '@/shared/ui/DateChip';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SelectField } from '@/shared/ui/SelectField';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';

import styles from './FiltrosServicios.module.css';

const ESTADOS = [
  'BORRADOR',
  'RECIBIDO',
  'DIAGNOSTICADO',
  'COTIZADO',
  'EN_REPARACION',
  'ENTREGADO',
  'FACTURADO',
  'DISPOSICION_FINAL',
  'ANULADO',
] as const;

interface ClienteCatalogo {
  readonly id: number;
  readonly nombre: string;
  readonly activo: boolean;
}

interface Props {
  readonly valor: Filtros;
  readonly hoy: string;
  readonly onCambio: (filtros: Filtros) => void;
  readonly onAplicar: () => void;
}

export function FiltrosServicios({ valor, hoy, onCambio, onAplicar }: Props): React.JSX.Element {
  const { t } = useTranslation(['servicios', 'comun']);
  const clientes = useCatalogo<ClienteCatalogo[]>('clientes') ?? [];
  const estado = valor.estados?.[0] ?? '';
  const clienteNombre = clientes.find((cliente) => cliente.id === valor.clienteId)?.nombre ?? '';

  const actualizar = (cambios: Record<string, unknown>): void => {
    const siguiente: Record<string, unknown> = { ...valor };
    for (const clave of Object.keys(cambios)) {
      if (cambios[clave] === undefined) delete siguiente[clave];
      else siguiente[clave] = cambios[clave];
    }
    onCambio(siguiente as Filtros);
  };

  const limpiar = (): void => {
    onCambio({});
  };

  return (
    <section className={styles.panel!} aria-label={t('servicios:filtros')}>
      <SelectField
        etiqueta={t('servicios:filtro.estado')}
        items={[
          { id: '', texto: t('servicios:filtro.todos') },
          ...ESTADOS.map((clave) => ({
            id: clave,
            texto: t(`servicios:estado.${clave}`),
          })),
        ]}
        selectedKey={estado}
        onSelectionChange={(clave) =>
          actualizar({
            estados: clave ? [String(clave) as (typeof ESTADOS)[number]] : undefined,
          })
        }
      />

      <SelectField
        etiqueta={t('servicios:filtro.tipo')}
        items={[
          { id: '', texto: t('servicios:filtro.todos') },
          { id: 'BATERIA', texto: t('servicios:recepcion.bateria') },
          { id: 'CARGADOR', texto: t('servicios:recepcion.cargador') },
        ]}
        selectedKey={valor.tipoEquipo ?? ''}
        onSelectionChange={(clave) =>
          actualizar({
            tipoEquipo: clave ? (String(clave) as 'BATERIA' | 'CARGADOR') : undefined,
          })
        }
      />

      <ComboboxField
        etiqueta={t('servicios:filtro.cliente')}
        valor={clienteNombre}
        items={clientes
          .filter((cliente) => cliente.activo)
          .map((cliente) => ({ id: String(cliente.id), texto: cliente.nombre }))}
        placeholder={t('servicios:recepcion.clienteBuscar')}
        onCambio={(_, opcion) => actualizar({ clienteId: opcion ? Number(opcion.id) : undefined })}
      />

      <DateRangeFilter
        desde={valor.fechaDesde ?? ''}
        hasta={valor.fechaHasta ?? ''}
        max={hoy}
        onCambio={(desde, hasta) =>
          actualizar({
            fechaDesde: desde || undefined,
            fechaHasta: hasta || undefined,
          })
        }
        desdeEtiqueta={t('servicios:filtro.desde')}
        hastaEtiqueta={t('servicios:filtro.hasta')}
      />

      <div className={styles.acciones!}>
        <SecondaryButton onPress={limpiar}>{t('servicios:limpiar')}</SecondaryButton>
        <PrimaryButton onPress={onAplicar}>{t('servicios:aplicar')}</PrimaryButton>
      </div>
    </section>
  );
}
