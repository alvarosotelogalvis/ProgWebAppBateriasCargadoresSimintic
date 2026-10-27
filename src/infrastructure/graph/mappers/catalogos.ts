import type { ClienteCatalogo } from '@/application/ports/remoteGateway';
import { COLUMNAS_CHOICE, type ColumnaChoice } from '@/application/setup/claves';

export interface ItemGraph {
  readonly id?: string | number;
  readonly fields?: Record<string, unknown>;
}

export interface ColumnaGraph {
  readonly name?: string;
  readonly choice?: { readonly choices?: readonly string[] };
}

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor.trim() : '');

export function mapearClientes(items: readonly ItemGraph[]): ClienteCatalogo[] {
  const clientes: ClienteCatalogo[] = [];
  for (const item of items) {
    const nombre = texto(item.fields?.Title);
    const id = Number(item.fields?.ID ?? item.id);
    if (!nombre || !Number.isFinite(id)) continue;
    if (item.fields?.Activo === false) continue;
    clientes.push({ id, nombre, activo: true });
  }
  return clientes.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function mapearMarcas(items: readonly ItemGraph[]): string[] {
  const marcas = new Set<string>();
  for (const item of items) {
    const nombre = texto(item.fields?.Title);
    if (!nombre) continue;
    if (item.fields?.Activo === false) continue;
    marcas.add(nombre);
  }
  return [...marcas].sort((a, b) => a.localeCompare(b, 'es'));
}

export function mapearConfiguracion(items: readonly ItemGraph[]): Record<string, string> {
  const config: Record<string, string> = {};
  for (const item of items) {
    const clave = texto(item.fields?.Title);
    if (!clave) continue;
    const valor = item.fields?.Valor;
    if (valor === undefined || valor === null) continue;
    config[clave] = typeof valor === 'string' ? valor : String(valor);
  }
  return config;
}

export function mapearChoices(columnas: readonly ColumnaGraph[]): Record<ColumnaChoice, string[]> {
  const resultado = Object.fromEntries(COLUMNAS_CHOICE.map((columna) => [columna, [] as string[]])) as Record<
    ColumnaChoice,
    string[]
  >;

  for (const columna of columnas) {
    if (!columna.name || !(COLUMNAS_CHOICE as readonly string[]).includes(columna.name)) continue;
    const nombre = columna.name as ColumnaChoice;
    resultado[nombre] = [...(columna.choice?.choices ?? [])].map((valor) => valor.trim()).filter(Boolean);
  }
  return resultado;
}
