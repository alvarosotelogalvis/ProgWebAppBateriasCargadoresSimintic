import type { SVGProps } from 'react';

import BatteryFull from '@material-symbols/svg-500/rounded/battery_full-fill.svg?react';
import MoreHoriz from '@material-symbols/svg-500/rounded/more_horiz-fill.svg?react';
import ChevronRight from '@material-symbols/svg-500/rounded/chevron_right-fill.svg?react';
import ChevronLeft from '@material-symbols/svg-500/rounded/chevron_left-fill.svg?react';
import ArrowForward from '@material-symbols/svg-500/rounded/arrow_forward-fill.svg?react';
import PhotoCamera from '@material-symbols/svg-500/rounded/photo_camera-fill.svg?react';
import Wifi from '@material-symbols/svg-500/rounded/wifi-fill.svg?react';
import WifiOff from '@material-symbols/svg-500/rounded/wifi_off-fill.svg?react';
import CheckCircle from '@material-symbols/svg-500/rounded/check_circle-fill.svg?react';
import FilterList from '@material-symbols/svg-500/rounded/filter_list-fill.svg?react';
import ArrowBack from '@material-symbols/svg-500/rounded/arrow_back-fill.svg?react';
import Build from '@material-symbols/svg-500/rounded/build-fill.svg?react';
import LocalShipping from '@material-symbols/svg-500/rounded/local_shipping-fill.svg?react';
import PendingActions from '@material-symbols/svg-500/rounded/pending_actions-fill.svg?react';
import SupportAgent from '@material-symbols/svg-500/rounded/support_agent-fill.svg?react';
import MedicalServices from '@material-symbols/svg-500/rounded/medical_services-fill.svg?react';
import ShoppingCart from '@material-symbols/svg-500/rounded/shopping_cart-fill.svg?react';
import PriceCheck from '@material-symbols/svg-500/rounded/price_check-fill.svg?react';
import DataUsage from '@material-symbols/svg-500/rounded/data_usage-fill.svg?react';
import Home from '@material-symbols/svg-500/rounded/home-fill.svg?react';
import Sync from '@material-symbols/svg-500/rounded/sync-fill.svg?react';
import Settings from '@material-symbols/svg-500/rounded/settings-fill.svg?react';
import Help from '@material-symbols/svg-500/rounded/help-fill.svg?react';
import Info from '@material-symbols/svg-500/rounded/info-fill.svg?react';
import Add from '@material-symbols/svg-500/rounded/add-fill.svg?react';
import Person from '@material-symbols/svg-500/rounded/person-fill.svg?react';
import Logout from '@material-symbols/svg-500/rounded/logout-fill.svg?react';
import Warning from '@material-symbols/svg-500/rounded/warning-fill.svg?react';
import Error from '@material-symbols/svg-500/rounded/error-fill.svg?react';
import Edit from '@material-symbols/svg-500/rounded/edit-fill.svg?react';
import Delete from '@material-symbols/svg-500/rounded/delete-fill.svg?react';
import Search from '@material-symbols/svg-500/rounded/search-fill.svg?react';
import Close from '@material-symbols/svg-500/rounded/close-fill.svg?react';
import Verified from '@material-symbols/svg-500/rounded/verified-fill.svg?react';
import Backup from '@material-symbols/svg-500/rounded/backup-fill.svg?react';
import Refresh from '@material-symbols/svg-500/rounded/refresh-fill.svg?react';
import Computer from '@material-symbols/svg-500/rounded/computer-fill.svg?react';
import Label from '@material-symbols/svg-500/rounded/label-fill.svg?react';
import Tag from '@material-symbols/svg-500/rounded/tag-fill.svg?react';
import Description from '@material-symbols/svg-500/rounded/description-fill.svg?react';
import Storage from '@material-symbols/svg-500/rounded/storage-fill.svg?react';
import Notifications from '@material-symbols/svg-500/rounded/notifications-fill.svg?react';
import Download from '@material-symbols/svg-500/rounded/download-fill.svg?react';
import Share from '@material-symbols/svg-500/rounded/share-fill.svg?react';
import Lock from '@material-symbols/svg-500/rounded/lock-fill.svg?react';
import Schedule from '@material-symbols/svg-500/rounded/schedule-fill.svg?react';
import Image from '@material-symbols/svg-500/rounded/image-fill.svg?react';

export const ICONOS = {
  inicio: Home,
  servicios: BatteryFull,
  bateria: BatteryFull,
  sincronizar: Sync,
  mas: MoreHoriz,
  chevronDerecha: ChevronRight,
  chevronIzquierda: ChevronLeft,
  avanzar: ArrowForward,
  camara: PhotoCamera,
  imagen: Image,
  wifi: Wifi,
  wifiOff: WifiOff,
  exito: CheckCircle,
  filtro: FilterList,
  atras: ArrowBack,
  herramientas: Build,
  envio: LocalShipping,
  pendiente: PendingActions,
  soporte: SupportAgent,
  servicioMedico: MedicalServices,
  carrito: ShoppingCart,
  precio: PriceCheck,
  datos: DataUsage,
  nuevo: Add,
  persona: Person,
  cerrarSesion: Logout,
  advertencia: Warning,
  error: Error,
  editar: Edit,
  eliminar: Delete,
  buscar: Search,
  cerrar: Close,
  verificado: Verified,
  respaldo: Backup,
  refrescar: Refresh,
  computador: Computer,
  etiqueta: Label,
  marca: Tag,
  descripcion: Description,
  almacenamiento: Storage,
  notificaciones: Notifications,
  descargar: Download,
  compartir: Share,
  seguridad: Lock,
  agenda: Schedule,
  ayuda: Help,
  acerca: Info,
  configuracion: Settings,
} as const;

export type IconName = keyof typeof ICONOS;

export type TamanoIcono = 20 | 24 | 28 | 72;

interface Props {
  readonly nombre: IconName;
  readonly tamano?: TamanoIcono;
  readonly className?: string;
}

export function Icon({ nombre, tamano = 24, className }: Props): React.JSX.Element {
  const Componente = ICONOS[nombre];

  return (
    <Componente
      aria-hidden="true"
      focusable="false"
      width={tamano}
      height={tamano}
      fill="currentColor"
      className={className}
      {...({} as SVGProps<SVGSVGElement>)}
    />
  );
}
