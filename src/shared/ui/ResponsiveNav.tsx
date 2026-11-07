import { useTranslation } from 'react-i18next';
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

function IconoConBadge({ item }: { readonly item: ItemNav }): React.JSX.Element {
  return (
    <span className={styles.iconoEnvuelto!}>
      <Icon nombre={item.icono} tamano={24} />
      {typeof item.badge === 'number' && item.badge > 0 ? (
        <span className={styles.badge!} aria-hidden="true">
          {item.badge}
        </span>
      ) : null}
    </span>
  );
}

interface Props {
  readonly items: readonly ItemNav[];
  readonly etiquetaDe: (clave: string) => string;
}

export function ResponsiveNav({ items, etiquetaDe }: Props): React.JSX.Element {
  const { t } = useTranslation('navegacion');
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
      <nav className={styles.barraInferior!} aria-label={t('navegacionPrincipal')}>
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
                    <IconoConBadge item={item} />
                    <span className={styles.etiqueta!}>{etiquetaDe(item.etiquetaKey)}</span>
                    {isActive ? (
                      <span className={styles.soloLectores!}>{t('paginaActual')}</span>
                    ) : null}
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
      <nav className={styles.riel!} aria-label={t('navegacionPrincipal')}>
        <ul className={styles.listaRiel!}>
          {principal.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.ruta}
                end={item.ruta === '/'}
                className={({ isActive }) =>
                  `${styles.enlaceRiel!} ${isActive ? styles.activo! : ''}`
                }
              >
                <IconoConBadge item={item} />
                <span className={styles.etiquetaRiel!}>{etiquetaDe(item.etiquetaKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav className={styles.lateral!} aria-label={t('navegacionPrincipal')}>
      <ul className={styles.listaLateral!}>
        {principal.map((item) => (
          <li key={item.id}>
            <NavLink
              to={item.ruta}
              end={item.ruta === '/'}
              className={({ isActive }) =>
                `${styles.enlaceLateral!} ${isActive ? styles.activo! : ''}`
              }
            >
              <IconoConBadge item={item} />
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
                    `${styles.enlaceLateral!} ${isActive ? styles.activo! : ''}`
                  }
                >
                  <IconoConBadge item={item} />
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
