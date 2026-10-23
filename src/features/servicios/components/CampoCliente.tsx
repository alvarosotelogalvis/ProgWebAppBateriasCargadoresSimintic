import { useTranslation } from 'react-i18next';

import { useCatalogo } from '@/infrastructure/db/hooks';
import { ComboboxField } from '@/shared/ui/ComboboxField';
import { Banner } from '@/shared/ui/Banner';

interface ClienteCatalogo {
  readonly id: number;
  readonly nombre: string;
  readonly activo: boolean;
}

interface Props {
  readonly clienteId: number;
  readonly clienteNombre: string;
  readonly onCambio: (id: number, nombre: string) => void;
  readonly error?: string | undefined;
}

export function CampoCliente({
  clienteId,
  clienteNombre,
  onCambio,
  error,
}: Props): React.JSX.Element {
  const { t } = useTranslation(['servicios', 'comun']);
  const clientes = useCatalogo<ClienteCatalogo[]>('clientes') ?? [];
  const items = clientes
    .filter((cliente) => cliente.activo || cliente.id === clienteId)
    .map((cliente) => ({ id: String(cliente.id), texto: cliente.nombre }));

  if (clientes.length === 0) {
    return <Banner tipo="advertencia">{t('servicios:recepcion.clienteVacio')}</Banner>;
  }

  const inactivo = clientes.some((cliente) => cliente.id === clienteId && !cliente.activo);

  return (
    <>
      <ComboboxField
        etiqueta={t('servicios:recepcion.cliente')}
        valor={clienteNombre}
        items={items}
        placeholder={t('servicios:recepcion.clienteBuscar')}
        error={error}
        onCambio={(_, opcion) => {
          if (opcion) onCambio(Number(opcion.id), opcion.texto);
        }}
      />
      {inactivo ? (
        <Banner tipo="advertencia">{t('servicios:recepcion.clienteInactivo')}</Banner>
      ) : null}
    </>
  );
}
