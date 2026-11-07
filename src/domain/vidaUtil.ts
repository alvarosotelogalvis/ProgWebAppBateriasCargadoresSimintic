/**
 * Calcula la proyección de vida útil agregando meses a una fecha.
 * Maneja años bisiestos y fin de mes correctamente.
 * @example
 * sugerirVidaUtil('2026-11-07', 12) => '2027-11-07'
 * sugerirVidaUtil('2026-01-31', 1) => '2026-02-28'
 */
export function sugerirVidaUtil(fechaEntrega: string, meses: number): string {
  const [year, month, day] = fechaEntrega.split('-').map(Number);

  let newMonth = month + meses;
  let newYear = year;

  // Ajustar año si es necesario
  while (newMonth > 12) {
    newMonth -= 12;
    newYear += 1;
  }

  // Ajustar día si es fin de mes
  const ultimoDia = new Date(newYear, newMonth, 0).getDate();
  const newDay = Math.min(day, ultimoDia);

  return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
}
