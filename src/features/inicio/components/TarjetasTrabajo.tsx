import { useTranslation } from 'react-i18next';

import { contarTarjetas, tarjetasPorRol, type ClaveTarjeta } from '@/domain/tarjetasInicio';
import type { Rol, Servicio } from '@/domain/servicio';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { QuickActionGrid } from '@/shared/ui/QuickActionGrid';

const ICONO: Record<ClaveTarjeta, IconName> = {
  borradores: 'editar',
  recibidos: 'servicioMedico',
  porOT: 'herramientas',
  porEntregar: 'envio',
  porCotizar: 'precio',
  cotizadosPendientes: 'pendiente',
  porFacturar: 'carrito',
};

interface Props {
  readonly servicios: readonly Pick<Servicio, 'estado' | 'cotizacionEstado'>[];
  readonly roles: readonly Rol[];
  readonly onAbrir: (clave: ClaveTarjeta) => void;
}

/** "Mis trabajos": cuántos servicios esperan la acción del usuario según su rol (HU-007-9). */
export function TarjetasTrabajo({ servicios, roles, onAbrir }: Props): React.JSX.Element | null {
  const { t } = useTranslation('inicio');
  const tarjetas = tarjetasPorRol(roles);
  if (tarjetas.length === 0) return null;
  const conteo = contarTarjetas(servicios, tarjetas);

  return (
    <section aria-labelledby="mis-trabajos">
      <h2 id="mis-trabajos">{t('tarjetas.titulo')}</h2>
      <QuickActionGrid
        acciones={tarjetas.map((tarjeta) => ({
          id: tarjeta.clave,
          etiqueta: t(`tarjetas.${tarjeta.clave}`),
          icono: <Icon nombre={ICONO[tarjeta.clave]} tamano={28} />,
          badge: conteo[tarjeta.clave],
          onClick: () => onAbrir(tarjeta.clave),
        }))}
      />
    </section>
  );
}
