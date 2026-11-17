#!/usr/bin/env node
/**
 * Mide el peso comprimido (gzip) de lo que descarga un usuario nuevo y comprueba el presupuesto de RNF-06
 * (CE-001-03): ≤ 350 KB de JS + CSS. Se ejecuta después de `npm run build` (o `build:dev`):
 *
 *   npm run bundle:medir
 *
 * - «Carga inicial»: el JS de entrada con sus importaciones estáticas, su CSS y, en un build de producción, el
 *   trozo de MSAL, que la app descarga en paralelo al arrancar (en `VITE_AUTH_MODE=mock` no existe). Es el
 *   «paquete inicial» del presupuesto.
 * - «Pantallas»: esa base más la cadena de trozos que carga cada pantalla bajo demanda y su CSS. Es informativo:
 *   las demás pantallas las precachea el service worker; solo pesa si alguien abre esa URL en frío.
 *   No incluye las fuentes (woff2, ya comprimidas) ni lo que cada pantalla importe de forma dinámica después.
 *
 * IMPORTANTE: para medir lo que se publica hay que usar un build de producción (con `VITE_AUTH_MODE=msal`);
 * `build:dev` es de desarrollo y no incluye MSAL.
 *
 * Sale con código 1 si la carga inicial supera el presupuesto. Una pantalla por encima solo avisa, salvo con
 * `BUNDLE_ESTRICTO=1`.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const PRESUPUESTO_KB = Number(process.env.BUNDLE_PRESUPUESTO_KB ?? 350);
const AVISO_KB = PRESUPUESTO_KB - 20;
const dir = resolve(process.argv[2] ?? 'dist/assets');

if (!existsSync(dir)) {
  console.error(`No existe ${dir}. Ejecuta antes \`npm run build\`.`);
  process.exit(2);
}

const archivos = readdirSync(dir);
const kb = (nombre) => gzipSync(readFileSync(join(dir, nombre))).length / 1024;

// La entrada y su CSS son los que referencia `index.html` (puede haber otros trozos `index-*` más pequeños).
const rutaHtml = join(dir, '..', 'index.html');
if (!existsSync(rutaHtml)) {
  console.error(`No existe ${rutaHtml}.`);
  process.exit(2);
}
const html = readFileSync(rutaHtml, 'utf8');
const referenciados = [...html.matchAll(/(?:src|href)="\/assets\/([^"]+)"/g)].map((m) => m[1]);
const entrada = referenciados.find((n) => n.endsWith('.js'));
if (!entrada) {
  console.error('index.html no referencia ningún JS de entrada.');
  process.exit(2);
}

/** Importaciones estáticas de un trozo (`import … from "./x.js"`). */
const estaticas = (nombre) => {
  const texto = readFileSync(join(dir, nombre), 'utf8');
  const lista = new Set();
  for (const m of texto.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)) lista.add(m[1]);
  return [...lista];
};

const cierre = (inicio) => {
  const visto = new Set();
  const pila = [inicio];
  while (pila.length > 0) {
    const nombre = pila.pop();
    if (visto.has(nombre) || !existsSync(join(dir, nombre))) continue;
    visto.add(nombre);
    for (const dependencia of estaticas(nombre)) pila.push(dependencia);
  }
  return visto;
};

/** CSS de un trozo: `Nombre-hash.js` → `Nombre-hash.css` si existe. */
const cssDe = (nombreJs) => nombreJs.replace(/\.js$/, '.css');
const pesoDe = (trozos) => {
  let js = 0;
  let css = 0;
  for (const nombre of trozos) {
    js += kb(nombre);
    const hoja = cssDe(nombre);
    if (archivos.includes(hoja)) css += kb(hoja);
  }
  return { js, css, total: js + css };
};

// El CSS del índice no siempre se llama igual que su JS: se cuenta aparte.
const cssEntrada = referenciados.filter((n) => n.endsWith('.css'));
const cssEntradaKb = cssEntrada.reduce((suma, n) => suma + kb(n), 0);

// MSAL se importa de forma dinámica al arrancar (producción): no lo referencia index.html pero se descarga siempre.
const trozosMsal = archivos.filter((nombre) => {
  if (!nombre.endsWith('.js') || nombre === entrada) return false;
  const texto = readFileSync(join(dir, nombre), 'utf8');
  return texto.length > 100 * 1024 && /PublicClientApplication/.test(texto);
});
const base = new Set(cierre(entrada));
for (const trozo of trozosMsal) for (const nombre of cierre(trozo)) base.add(nombre);
const pesoBase = pesoDe(base);
const pesoMsal = pesoDe(new Set(trozosMsal));
const inicial = pesoBase.js + pesoBase.css + cssEntradaKb;

const formato = (valor) => valor.toFixed(1).padStart(6);
const marca = (valor) =>
  valor > PRESUPUESTO_KB
    ? '  <<< SOBRE EL PRESUPUESTO'
    : valor > AVISO_KB
      ? '  (cerca del límite)'
      : '';

console.log(`Presupuesto RNF-06: ${PRESUPUESTO_KB} KB (JS + CSS, gzip, sin fuentes)\n`);
console.log(`Carga inicial (entrada + CSS)              ${formato(inicial)} KB${marca(inicial)}`);
console.log(`  JS de entrada ${entrada}: ${formato(pesoBase.js - pesoMsal.js)} KB`);
console.log(
  trozosMsal.length > 0
    ? `  + MSAL (producción) ${trozosMsal.join(', ')}: ${formato(pesoMsal.js)} KB\n`
    : '  (sin MSAL: es un build de desarrollo/simulado; mide un build de producción para el valor real)\n'
);

const paginas = archivos
  .filter((n) => /^[A-Z][A-Za-z]*Page-[A-Za-z0-9_-]{8}\.js$/.test(n))
  .map((n) => n.replace(/-[A-Za-z0-9_-]{8}\.js$/, ''))
  // Pantalla de desarrollo (solo se enruta con VITE_APP_ENV=dev): no existe para el usuario final.
  .filter((pagina) => pagina !== 'CatalogoUiPage')
  .sort();

const filas = [];
for (const pagina of paginas) {
  const trozo = archivos.find((n) => n.startsWith(`${pagina}-`) && n.endsWith('.js'));
  const total = new Set([...base, ...cierre(trozo)]);
  const peso = pesoDe(total);
  filas.push({ pagina, total: peso.js + peso.css + cssEntradaKb });
}
console.log('Primera visita por pantalla:');
for (const fila of filas.sort((a, b) => b.total - a.total)) {
  console.log(
    `  ${fila.pagina.padEnd(30)} ${formato(fila.total)} KB${fila.total > PRESUPUESTO_KB ? '  (por encima; informativo)' : ''}`
  );
}

const peor = filas.reduce((a, b) => (b.total > a.total ? b : a), { pagina: '(ninguna)', total: 0 });
const estricto = process.env.BUNDLE_ESTRICTO === '1';
const excede = inicial > PRESUPUESTO_KB || (estricto && peor.total > PRESUPUESTO_KB);
console.log(
  `\nCarga inicial: ${inicial.toFixed(1)} KB ${inicial > PRESUPUESTO_KB ? 'SUPERA' : 'dentro del'} presupuesto de ${PRESUPUESTO_KB} KB.`
);
console.log(
  `Peor pantalla en frío: ${peor.pagina} con ${peor.total.toFixed(1)} KB${peor.total > PRESUPUESTO_KB ? ' (por encima, pero informativo: se precachea con el service worker)' : ''}.`
);
process.exit(excede ? 1 : 0);
