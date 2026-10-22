import { NavLink } from 'react-router-dom';

import { Icon, type IconName } from '@/shared/ui/Icon';
import { useBreakpoint } from '@/shared/hooks/useBreakpoint';
import { useSesionStore, type Rol } from '@/shared/stores/sesionStore';

import styles from './ResponsiveNav.module.css';

export interface ItemNav {
  readonly id: string;
  readonly ruta: string;
  readonly icono: IconName;
  readonly etiquetaKey: string;
  readonly roles?: readonly Rol[];
  readonly grupo: 'principal' | 'mas';
  readonly badge?: number;
}

interface Props {
  readonly items: readonly ItemNav[];
  readonly etiquetaDe: (clave: string) => string;
}

export function ResponsiveNav({ items, etiquetaDe }: Props): React.JSX.Element {
  const breakpoint = useBreakpoint();
  const roles = useSesionStore((estado) => estado.roles);

  const permitidos = items.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.some((rol) => roles.includes(rol));
  });

  const principal = permitidos.filter((item) => item.grupo === 'principal');
  const mas = permitidos.filter((item) => item.grupo === 'mas');

  if (breakpoint === 'compacto') {
    return (
      <nav className={styles['barra-inferior']!} aria-label="Navegacion principal">
        <ul className={styles.lista!}>
          {principal.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.ruta}
                end={item.ruta === '/'}
                className={({ isActive }) => `${styles.enlace!} ${isActive ? styles.activo! : ''}`}
              >
                {({ isActive }) => (
                  <>
                    <span className={styles['icono-envuelto']!}>
                      <Icon nombre={item.icono} tamano={24} />
                      {typeof item.badge === 'number' && item.badge > 0 ? (
                        <span className={styles.badge!} aria-hidden="true">
                          {item.badge}
                        </span>
                      ) : null}
                    </span>
                    <span className={styles.etiqueta!}>{etiquetaDe(item.etiquetaKey)}</span>
                    {isActive ? <span className={styles.soloLectores!}>Pagina actual</span> : null}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  if (breakpoint === 'medio') {
    return (
      <nav className={styles.riel!} aria-label="Navegacion principal">
        <ul className={styles['lista-riel']!}>
          {principal.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.ruta}
                end={item.ruta === '/'}
                className={({ isActive }) =>
                  `${styles['enlace-riel']!} ${isActive ? styles.activo! : ''}`
                }
              >
                <Icon nombre={item.icono} tamano={24} />
                <span className={styles['etiqueta-riel']!}>{etiquetaDe(item.etiquetaKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav className={styles.lateral!} aria-label="Navegacion principal">
      <ul className={styles['lista-lateral']!}>
        {principal.map((item) => (
          <li key={item.id}>
            <NavLink
              to={item.ruta}
              end={item.ruta === '/'}
              className={({ isActive }) =>
                `${styles['enlace-lateral']!} ${isActive ? styles.activo! : ''}`
              }
            >
              <Icon nombre={item.icono} tamano={24} />
              <span>{etiquetaDe(item.etiquetaKey)}</span>
            </NavLink>
          </li>
        ))}
        {mas.length > 0 ? (
          <>
            <li className={styles.separador!} aria-hidden="true" />
            {mas.map((item) => (
              <li key={item.id}>
                <NavLink
                  to={item.ruta}
                  className={({ isActive }) =>
                    `${styles['enlace-lateral']!} ${isActive ? styles.activo! : ''}`
                  }
                >
                  <Icon nombre={item.icono} tamano={24} />
                  <span>{etiquetaDe(item.etiquetaKey)}</span>
                </NavLink>
              </li>
            ))}
          </>
        ) : null}
      </ul>
    </nav>
  );
}
