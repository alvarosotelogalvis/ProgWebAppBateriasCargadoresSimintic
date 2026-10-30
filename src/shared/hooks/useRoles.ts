import { useSesionStore, type Rol } from '@/shared/stores/sesionStore';

export const useRoles = (): readonly Rol[] => useSesionStore((estado) => estado.roles);

export const useTieneRol = (roles: readonly Rol[]): boolean => {
  const rolesUsuario = useRoles();
  return rolesUsuario.some((rol) => roles.includes(rol));
};
