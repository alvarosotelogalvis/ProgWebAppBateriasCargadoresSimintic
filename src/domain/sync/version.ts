export function compararSemver(v1: string, v2: string): number {
  const a = v1.split('.').map((x) => parseInt(x, 10) || 0);
  const b = v2.split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const na = a[i] || 0;
    const nb = b[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export function esVersionMinimaSuficiente(actual: string, minima: string): boolean {
  return compararSemver(actual, minima) >= 0;
}
