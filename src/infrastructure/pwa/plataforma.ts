export type Plataforma =
  | 'android-chrome'
  | 'android-samsung'
  | 'android-otro'
  | 'ios-safari'
  | 'ios-otro'
  | 'windows-edge'
  | 'windows-chrome'
  | 'macos-chrome'
  | 'macos-safari'
  | 'otro';

export type RequisitoInstalacion = 'bloquear' | 'advertir' | 'no';

interface DatosUA {
  readonly platform?: string;
  readonly brands?: ReadonlyArray<{ readonly brand: string }>;
}

const ES_IOS = /iPad|iPhone|iPod/i;
const ES_ANDROID = /Android/i;
const ES_SAMSUNG = /SamsungBrowser/i;
const ES_EDGE = /Edg\//i;
const ES_CHROME = /Chrome|CriOS/i;
const ES_SAFARI = /Safari/i;

/**
 * Detecta la plataforma del navegador. La deteccion es por user agent porque no hay
 * una API estandar; el orden de los analisis importa (Edge y Samsung contienen "Chrome").
 */
export function detectarPlataforma(ua: string, uaData?: DatosUA): Plataforma {
  if (ES_IOS.test(ua)) {
    return ES_SAFARI.test(ua) && !ES_CHROME.test(ua) ? 'ios-safari' : 'ios-otro';
  }

  if (ES_ANDROID.test(ua)) {
    if (ES_SAMSUNG.test(ua)) return 'android-samsung';
    if (ES_CHROME.test(ua) || ES_EDGE.test(ua)) return 'android-chrome';
    return 'android-otro';
  }

  if (/Windows/i.test(ua)) {
    if (ES_EDGE.test(ua)) return 'windows-edge';
    if (ES_CHROME.test(ua)) return 'windows-chrome';
    return 'otro';
  }

  if (/Macintosh|Mac OS X/i.test(ua)) {
    if (ES_CHROME.test(ua)) return 'macos-chrome';
    if (ES_SAFARI.test(ua)) return 'macos-safari';
    return 'otro';
  }

  // Respaldo con navigator.userAgentData (Chromium reciente) cuando el UA no aporta info.
  const marca = uaData?.brands?.find((b) => b.brand !== 'Not A Brand')?.brand;
  if (marca === 'Chromium' && /Android/i.test(ua)) {
    return 'android-chrome';
  }

  return 'otro';
}

/**
 * iOS exige instalar la PWA: sin instalarla, Safari borra los datos periodicamente
 * y no hay service worker (R-01). En el resto de plataformas se permite continuar.
 */
export function requiereInstalacion(
  plataforma: Plataforma,
  standalone: boolean
): RequisitoInstalacion {
  if (standalone) return 'no';
  if (plataforma === 'ios-safari' || plataforma === 'ios-otro') return 'bloquear';
  if (plataforma === 'otro') return 'advertir';
  return 'advertir';
}
