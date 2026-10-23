import { fechaLocalHoy } from '@/domain/validaciones';
import { useServicios } from '@/infrastructure/db/hooks';

export const useConsultasServicios = () => {
  const servicios = useServicios();
  return { servicios, hoy: fechaLocalHoy() };
};
