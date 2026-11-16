/**
 * Calcula la proyección de vida útil agregando meses a una fecha.
 * Maneja años bisiestos y fin de mes correctamente.
 * @example
 * sugerirVidaUtil('2026-11-07', 12) => '2027-11-07'
 * sugerirVidaUtil('2026-01-31', 1) => '2026-02-28'
 */
export function sugerirVidaUtil(fechaEntrega: string, meses: number): string {
  const [anio = '0', mes = '0', dia = '0'] = fechaEntrega.split('-');
  const day = Number(dia);

  // Mes en base 0 para repartir los meses sumados entre año y mes sin bucles.
  const total = Number(mes) - 1 + meses;
  const newYear = Number(anio) + Math.floor(total / 12);
  const newMonth = (total % 12) + 1;

  // Ajustar día si es fin de mes (31-ene + 1 mes → 28/29-feb)
  const ultimoDia = new Date(newYear, newMonth, 0).getDate();
  const newDay = Math.min(day, ultimoDia);

  return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
}
