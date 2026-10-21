import { Navigate, Outlet } from 'react-router-dom';

import { PantallaSinPermiso } from '@/shared/ui/PantallaSinPermiso';
import { useSesionStore, type Rol } from '@/shared/stores/sesionStore';

interface Props {
  readonly roles: readonly Rol[];
}

/**
 * Si el usuario no tiene ninguno de los roles indicados, muestra "Sin permiso"
 * con un enlace al inicio (ES-001-11).
 */
export function RoleGuard({ roles }: Props): React.JSX.Element {
  const rolesUsuario = useSesionStore((estado) => estado.roles);

  const permitido = rolesUsuario.some((rol) => roles.includes(rol));

  if (!permitido) {
    return <PantallaSinPermiso />;
  }

  return <Outlet />;
}

export function NavigateInicio(): React.JSX.Element {
  return <Navigate to="/" replace />;
}
