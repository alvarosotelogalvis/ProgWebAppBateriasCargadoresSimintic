import { describe, expect, it } from 'vitest';

import { detectarPlataforma, requiereInstalacion } from '@/infrastructure/pwa/plataforma';
import { esStandalone } from '@/infrastructure/pwa/standalone';

const UA_ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const UA_ANDROID_SAMSUNG =
  'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 SamsungBrowser/23.0';
const UA_IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
const UA_IOS_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1';
const UA_WINDOWS_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
const UA_WINDOWS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const UA_MACOS_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const UA_MACOS_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';
const UA_FIREFOX =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0';

describe('detectarPlataforma', () => {
  it('detecta Android con Chrome', () => {
    expect(detectarPlataforma(UA_ANDROID_CHROME)).toBe('android-chrome');
  });

  it('detecta Android con Samsung Internet', () => {
    expect(detectarPlataforma(UA_ANDROID_SAMSUNG)).toBe('android-samsung');
  });

  it('detecta iOS con Safari', () => {
    expect(detectarPlataforma(UA_IOS_SAFARI)).toBe('ios-safari');
  });

  it('detecta iOS con otro navegador (Chrome iOS)', () => {
    expect(detectarPlataforma(UA_IOS_CHROME)).toBe('ios-otro');
  });

  it('detecta Windows con Edge', () => {
    expect(detectarPlataforma(UA_WINDOWS_EDGE)).toBe('windows-edge');
  });

  it('detecta Windows con Chrome', () => {
    expect(detectarPlataforma(UA_WINDOWS_CHROME)).toBe('windows-chrome');
  });

  it('detecta macOS con Chrome', () => {
    expect(detectarPlataforma(UA_MACOS_CHROME)).toBe('macos-chrome');
  });

  it('detecta macOS con Safari', () => {
    expect(detectarPlataforma(UA_MACOS_SAFARI)).toBe('macos-safari');
  });

  it('devuelve otro para navegadores no soportados', () => {
    expect(detectarPlataforma(UA_FIREFOX)).toBe('otro');
  });
});

describe('requiereInstalacion', () => {
  it('no requiere nada si ya esta instalada', () => {
    expect(requiereInstalacion('ios-safari', true)).toBe('no');
    expect(requiereInstalacion('android-chrome', true)).toBe('no');
  });

  it('bloquea en iOS si no esta instalada', () => {
    expect(requiereInstalacion('ios-safari', false)).toBe('bloquear');
    expect(requiereInstalacion('ios-otro', false)).toBe('bloquear');
  });

  it('solo advierte en el resto de plataformas', () => {
    expect(requiereInstalacion('android-chrome', false)).toBe('advertir');
    expect(requiereInstalacion('windows-edge', false)).toBe('advertir');
    expect(requiereInstalacion('macos-safari', false)).toBe('advertir');
  });
});

describe('esStandalone', () => {
  it('detecta el modo standalone de CSS', () => {
    const ventana = {
      matchMedia: () => ({ matches: true }),
      navigator: {},
    };
    expect(esStandalone(ventana)).toBe(true);
  });

  it('detecta el estandar de iOS (navigator.standalone)', () => {
    const ventana = {
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: true },
    };
    expect(esStandalone(ventana)).toBe(true);
  });

  it('devuelve false en un navegador normal', () => {
    const ventana = {
      matchMedia: () => ({ matches: false }),
      navigator: {},
    };
    expect(esStandalone(ventana)).toBe(false);
  });
});
