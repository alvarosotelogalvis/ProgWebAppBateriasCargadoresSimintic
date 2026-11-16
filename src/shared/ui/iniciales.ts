/** Iniciales en mayúscula de las primeras `letras` palabras del nombre; «?» si no hay nombre. */
export function iniciales(nombre: string, letras: 1 | 2 = 2): string {
  const resultado = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, letras)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
  return resultado || '?';
}
