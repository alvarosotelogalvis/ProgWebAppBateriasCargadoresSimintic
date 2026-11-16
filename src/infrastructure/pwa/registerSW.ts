const INTERVALO_MINUTOS = 60;

interface Opciones {
  readonly onNuevaVersion: () => void;
  readonly intervaloMs?: number;
}

export interface RegistroSW {
  aplicar(): Promise<void>;
}

let intervaloId: number | undefined;

/**
 * Registra el service worker con actualizacion controlada (registerType 'prompt').
 * La app no se recarga sola: avisa al usuario y espera a que no haya trabajo en curso.
 */
export function registrarServiceWorker({ onNuevaVersion, intervaloMs }: Opciones): RegistroSW {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { aplicar: async () => undefined };
  }

  void navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registro) => {
    if (registro.waiting) {
      onNuevaVersion();
    }

    registro.addEventListener('updatefound', () => {
      const nuevo = registro.installing;
      if (!nuevo) return;
      nuevo.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
          onNuevaVersion();
        }
      });
    });

    void registro.update();
    iniciarActualizacionPeriodica(registro, intervaloMs);
  });

  return { aplicar: aplicarNuevaVersion };
}

/**
 * Aplica la versión nueva (ES-001-20). Con `skipWaiting: false` el service worker nuevo queda
 * «en espera» y un simple reload NO lo activa: se le pide que tome el control (`SKIP_WAITING`) y
 * la página se recarga cuando lo hace. Sin service worker en espera, solo recarga.
 */
export async function aplicarNuevaVersion(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    window.location.reload();
    return;
  }

  const registro = await navigator.serviceWorker.getRegistration();
  await registro?.update();
  const enEspera = registro?.waiting;
  if (!enEspera) {
    window.location.reload();
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
    once: true,
  });
  enEspera.postMessage({ type: 'SKIP_WAITING' });
}

function iniciarActualizacionPeriodica(
  registro: ServiceWorkerRegistration,
  intervaloMs?: number
): void {
  if (intervaloId !== undefined) {
    window.clearInterval(intervaloId);
  }
  const intervalo = intervaloMs ?? INTERVALO_MINUTOS * 60 * 1000;
  intervaloId = window.setInterval(() => {
    void registro.update();
  }, intervalo);
}

/**
 * Fuerza la búsqueda de una nueva versión (`registration.update()`, SDD §11.4).
 * Si la hay, el flujo normal del SW muestra el aviso "Hay una nueva versión".
 */
export async function buscarActualizacion(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const registro = await navigator.serviceWorker.getRegistration();
  await registro?.update();
}
