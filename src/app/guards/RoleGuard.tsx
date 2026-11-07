import { Outlet } from 'react-router-dom';

import { PantallaSinPermiso } from '@/shared/ui/PantallaSinPermiso';
import { useRoles } from '@/shared/hooks/useRoles';
import type { Rol } from '@/shared/stores/sesionStore';

interface Props {
  readonly roles: readonly Rol[];
}

/**
 * Si el usuario no tiene ninguno de los roles indicados, muestra "Sin permiso"
 * (ES-001-11).
 */
export function RoleGuard({ roles }: Props): React.JSX.Element {
  const rolesUsuario = useRoles();

  const permitido = rolesUsuario.some((rol) => roles.includes(rol));

  if (!permitido) {
    return <PantallaSinPermiso />;
  }

  return <Outlet />;
}
