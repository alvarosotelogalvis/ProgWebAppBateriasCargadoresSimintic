/**
 * Lleva un eTag de SharePoint a la forma que exige `If-Match`: entre comillas (RFC 9110).
 *
 * El `delta` de las listas entrega el eTag SIN comillas (`guid,3`), mientras que leer el ítem lo entrega
 * con ellas (`"guid,3"`). Comprobado en SharePoint real: un `If-Match` sin comillas responde 409
 * `resourceModified` aunque el eTag esté vigente, así que cada servicio descargado por delta fallaría al
 * enviarse. Los eTag débiles (`W/"…"`) y los ya entrecomillados se dejan tal cual.
 */
export function normalizarETag(etag: string): string {
  const limpio = etag.trim();
  if (limpio === '' || limpio === '*') return limpio;
  if (limpio.startsWith('"') || limpio.startsWith('W/"')) return limpio;
  return `"${limpio}"`;
}
