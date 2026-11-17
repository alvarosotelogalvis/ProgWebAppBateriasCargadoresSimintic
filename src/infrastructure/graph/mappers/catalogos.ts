import type { ClienteRemoto } from '@/application/ports/clientesRemotos';
import type { ClienteCatalogo } from '@/application/ports/remoteGateway';
import type { ClienteFusionado } from '@/domain/cliente';
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

const textoOpcional = (valor: unknown): string | undefined => {
  const limpio = texto(valor);
  return limpio === '' ? undefined : limpio;
};

const numeroOpcional = (valor: unknown): number | undefined => {
  if (valor === undefined || valor === null || valor === '') return undefined;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : undefined;
};

/** Un ítem de `Clientes` como cliente remoto, con sus datos de alta y de fusión (ADR-0023). */
export function itemACliente(item: ItemGraph): ClienteRemoto {
  const campos = item.fields ?? {};
  const guid = textoOpcional(campos.ClienteGuid);
  const normalizado = textoOpcional(campos.NombreNormalizado);
  const fusionadoCon = numeroOpcional(campos.FusionadoConId);
  return {
    id: Number(item.id ?? campos.ID),
    nombre: texto(campos.Title),
    activo: campos.Activo !== false,
    ...(guid === undefined ? {} : { guid }),
    ...(normalizado === undefined ? {} : { normalizado }),
    ...(fusionadoCon === undefined ? {} : { fusionadoCon }),
  };
}

/** Clientes inactivos que se fusionaron en otro (origen → destino). */
export function mapearFusionados(items: readonly ItemGraph[]): ClienteFusionado[] {
  const fusionados: ClienteFusionado[] = [];
  for (const item of items) {
    const cliente = itemACliente(item);
    if (cliente.activo || cliente.fusionadoCon === undefined) continue;
    if (!Number.isFinite(cliente.id) || cliente.fusionadoCon === cliente.id) continue;
    fusionados.push({ origenId: cliente.id, destinoId: cliente.fusionadoCon });
  }
  return fusionados;
}

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
  const resultado = Object.fromEntries(
    COLUMNAS_CHOICE.map((columna) => [columna, [] as string[]])
  ) as Record<ColumnaChoice, string[]>;

  for (const columna of columnas) {
    if (!columna.name || !(COLUMNAS_CHOICE as readonly string[]).includes(columna.name)) continue;
    const nombre = columna.name as ColumnaChoice;
    resultado[nombre] = [...(columna.choice?.choices ?? [])]
      .map((valor) => valor.trim())
      .filter(Boolean);
  }
  return resultado;
}
