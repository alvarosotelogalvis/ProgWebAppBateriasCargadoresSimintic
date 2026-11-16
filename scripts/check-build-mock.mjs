// Comprueba que `vite build --mode production` FALLA cuando VITE_AUTH_MODE=mock (SDD §8.6, T-18).
// Es la guarda que impide publicar en producción una app con la autenticación simulada.
// Uso: node scripts/check-build-mock.mjs   (también corre dentro de `npm run verify`)
import { spawnSync } from 'node:child_process';

const MENSAJE_ESPERADO = 'VITE_AUTH_MODE=mock';

const resultado = spawnSync(
  process.execPath,
  ['./node_modules/vite/bin/vite.js', 'build', '--mode', 'production', '--outDir', 'dist-check-mock'],
  {
    env: { ...process.env, VITE_AUTH_MODE: 'mock' },
    encoding: 'utf-8',
    timeout: 120_000,
  }
);

const salida = `${resultado.stdout ?? ''}\n${resultado.stderr ?? ''}`;

if (resultado.status === 0) {
  console.error(
    'FALLO: el build de producción terminó bien con VITE_AUTH_MODE=mock. Debe bloquearse (SDD §8.6).'
  );
  process.exit(1);
}

if (!salida.includes(MENSAJE_ESPERADO)) {
  console.error(
    `FALLO: el build falló, pero no por la guarda del modo simulado (no aparece "${MENSAJE_ESPERADO}").\n${salida}`
  );
  process.exit(1);
}

console.log('OK: el build de producción con VITE_AUTH_MODE=mock se bloquea, como debe.');
