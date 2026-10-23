import { useTranslation } from 'react-i18next';

import { normalizarMarca } from '@/domain/normalizacion';
import { useCatalogo, useServicios } from '@/infrastructure/db/hooks';
import { ComboboxField } from '@/shared/ui/ComboboxField';

interface Props {
  readonly valor: string;
  readonly onCambio: (valor: string) => void;
  readonly error?: string | undefined;
}

export function CampoMarca({ valor, onCambio, error }: Props): React.JSX.Element {
  const { t } = useTranslation('servicios');
  const catalogo = useCatalogo<string[]>('marcas') ?? [];
  const servicios = useServicios();
  const usadas = servicios.map((servicio) => servicio.marca).filter(Boolean);
  const marcas = [...new Set([...catalogo, ...usadas].map(normalizarMarca))].sort((a, b) =>
    a.localeCompare(b, 'es')
  );
  const items = marcas.map((marca) => ({ id: marca, texto: marca }));

  return (
    <ComboboxField
      etiqueta={t('recepcion.marca')}
      valor={valor}
      items={items}
      permiteTextoLibre
      placeholder={t('recepcion.marcaBuscar')}
      error={error}
      onCambio={(nuevo) => onCambio(nuevo)}
    />
  );
}
