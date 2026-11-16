import styles from './Avatar.module.css';
import { iniciales } from './iniciales';

export type TamanoAvatar = 'pequeno' | 'normal' | 'grande';
export type VarianteAvatar = 'degradado' | 'solido';

interface Props {
  /** Nombre de la persona: de él salen las iniciales. Vacío muestra «?». */
  readonly nombre: string;
  /** Cuántas iniciales mostrar (1 o 2). */
  readonly letras?: 1 | 2;
  readonly tamano?: TamanoAvatar;
  readonly variante?: VarianteAvatar;
}

/**
 * Círculo con las iniciales de una persona (`docs/10` §2.5). Es decorativo (`aria-hidden`):
 * el nombre siempre aparece como texto junto a él.
 */
export function Avatar({
  nombre,
  letras = 1,
  tamano = 'normal',
  variante = 'degradado',
}: Props): React.JSX.Element {
  const clases = [styles.avatar!, styles[tamano], styles[variante]].join(' ');

  return (
    <span className={clases} aria-hidden="true">
      {iniciales(nombre, letras)}
    </span>
  );
}
