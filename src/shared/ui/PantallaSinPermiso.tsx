import { Link } from 'react-router-dom';

import styles from './PantallaSinPermiso.module.css';

export function PantallaSinPermiso(): React.JSX.Element {
  return (
    <div role="alert" className={styles.pantalla!}>
      <h1 className={styles.titulo!}>Sin permiso</h1>
      <p className={styles.descripcion!}>
        Tu rol no tiene acceso a esta seccion. Habla con el administrador si necesitas habilitarla.
      </p>
      <Link to="/" className={styles.boton!}>
        Volver al inicio
      </Link>
    </div>
  );
}
