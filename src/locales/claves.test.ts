// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Guardia de i18n: toda clave literal usada con `t('…')` debe existir en
 * `src/locales/es-CO`. Evita pantallas que muestran la clave en lugar del texto.
 * Las claves construidas con plantillas (`t(\`a.${b}\`)`) no se pueden verificar aquí.
 */

const RAIZ = join(process.cwd(), 'src');
const LOCALES = join(RAIZ, 'locales', 'es-CO');
const SUFIJOS_PLURAL = ['_one', '_other', '_many', '_zero'];

const recursos: Record<string, unknown> = Object.fromEntries(
  readdirSync(LOCALES)
    .filter((archivo) => archivo.endsWith('.json'))
    .map((archivo) => [
      basename(archivo, '.json'),
      JSON.parse(readFileSync(join(LOCALES, archivo), 'utf-8').trimStart()) as unknown,
    ])
);

function existe(ns: string, clave: string): boolean {
  let nodo: unknown = recursos[ns];
  const partes = clave.split('.');
  for (const [i, parte] of partes.entries()) {
    if (typeof nodo !== 'object' || nodo === null) return false;
    const registro = nodo as Record<string, unknown>;
    if (i === partes.length - 1) {
      return (
        typeof registro[parte] === 'string' ||
        SUFIJOS_PLURAL.some((sufijo) => typeof registro[`${parte}${sufijo}`] === 'string')
      );
    }
    nodo = registro[parte];
  }
  return false;
}

function archivosFuente(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivosFuente(ruta);
    return /\.(ts|tsx)$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

function namespacesDe(codigo: string): string[] {
  const encontrados: string[] = [];
  for (const m of codigo.matchAll(/useTranslation\(\s*(\[[^\]]*\]|'[^']*')/g)) {
    const primero = /'([^']+)'/.exec(m[1] ?? '');
    if (primero?.[1]) encontrados.push(primero[1]);
  }
  return encontrados;
}

describe('claves de i18n', () => {
  it('todas las claves literales de t() existen en es-CO', () => {
    const faltantes: string[] = [];

    for (const archivo of archivosFuente(RAIZ)) {
      const codigo = readFileSync(archivo, 'utf-8');
      const namespaces = namespacesDe(codigo);
      if (namespaces.length === 0) continue;

      for (const m of codigo.matchAll(/\bt\(\s*'([^'$]+)'/g)) {
        const literal = m[1] ?? '';
        const [ns, clave] = literal.includes(':')
          ? (literal.split(':', 2) as [string, string])
          : [undefined, literal];
        const candidatos = ns ? [ns] : namespaces;
        if (!candidatos.some((n) => existe(n, clave))) {
          faltantes.push(`${relative(RAIZ, archivo)} → ${literal} (ns: ${candidatos.join(', ')})`);
        }
      }
    }

    expect(faltantes).toEqual([]);
  });
});
