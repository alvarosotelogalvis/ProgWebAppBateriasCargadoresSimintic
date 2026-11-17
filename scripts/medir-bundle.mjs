#!/usr/bin/env node
/**
 * Mide el peso comprimido (gzip) de lo que descarga un usuario nuevo y comprueba el presupuesto de RNF-06
 * (CE-001-03): ≤ 350 KB de JS + CSS. Se ejecuta después de `npm run build` (o `build:dev`):
 *
 *   npm run bundle:medir
 *
 * - «Carga inicial»: el JS de entrada con sus importaciones estáticas y el CSS de esos trozos (lo que sirve
 *   `index.html` y la pantalla de inicio).
 * - «Pantallas»: la entrada más la cadena de trozos que carga cada pantalla bajo demanda y su CSS.
 *   No incluye las fuentes (woff2, ya comprimidas) ni lo que cada pantalla importe de forma dinámica después.
 *
 * Sale con código 1 si la carga inicial o alguna pantalla supera el presupuesto.
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

const base = cierre(entrada);
const pesoBase = pesoDe(base);
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
console.log(`  JS de entrada ${entrada}: ${formato(pesoBase.js)} KB\n`);

const paginas = archivos
  .filter((n) => /^[A-Z][A-Za-z]*Page-[A-Za-z0-9_-]{8}\.js$/.test(n))
  .map((n) => n.replace(/-[A-Za-z0-9_-]{8}\.js$/, ''))
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
  console.log(`  ${fila.pagina.padEnd(30)} ${formato(fila.total)} KB${marca(fila.total)}`);
}

const peor = filas.reduce((a, b) => (b.total > a.total ? b : a), { pagina: '(ninguna)', total: 0 });
const excede = inicial > PRESUPUESTO_KB || peor.total > PRESUPUESTO_KB;
console.log(
  `\nPeor pantalla: ${peor.pagina} con ${peor.total.toFixed(1)} KB. ${excede ? 'SUPERA el presupuesto.' : 'Dentro del presupuesto.'}`
);
process.exit(excede ? 1 : 0);
