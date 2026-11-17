#!/usr/bin/env node
// Aprovisiona en SharePoint (por Microsoft Graph, con una aplicación y su secreto) las listas, la biblioteca,
// las columnas, los datos iniciales y las claves de ConfiguracionApp que usa la PWA.
//
// - ENSAYO POR DEFECTO: sin `--aplicar` solo lee y muestra lo que haría. Nunca borra nada.
// - IDEMPOTENTE: lo que ya existe no se toca; solo se añaden las columnas y elementos que falten, y nunca se
//   pisa un valor de ConfiguracionApp que un administrador haya cambiado.
// - Lo que Graph NO puede hacer (versionado, datos adjuntos, vistas, permisos del grupo, renombrar `Title`,
//   indexar `Modified`) lo completa `scripts/provision-sharepoint.ps1` con una cuenta de propietario, o a mano.
//
// Uso (el secreto se lee de variables de entorno o de un archivo .env; NUNCA se pasa por línea de comandos):
//   node scripts/provision-sharepoint-graph.mjs --site siminticsas.sharepoint.com/sites/MineroIndustrial --env-file <ruta/.env>
//   node scripts/provision-sharepoint-graph.mjs --site ... --env-file ... --aplicar [--anios 2026,2027]
// Variables: SP_TENANT_ID, SP_CLIENT_ID, SP_CLIENT_SECRET. La aplicación necesita el permiso de aplicación
// `Sites.Manage.All` (o `Sites.Selected` con rol manage/owner sobre el sitio) con consentimiento de administrador.
//
// El secreto debe ser temporal: rótalo o elimínalo al terminar.

import { pathToFileURL } from 'node:url';

import {
  CAMPOS,
  CLIENTES_INICIALES,
  CONFIGURACION_POR_DEFECTO,
  LISTAS,
  MARCAS_INICIALES,
} from './esquema-sharepoint.mjs';

/**
 * Clave de comparación de un cliente (misma regla que `normalizarNombre` de `src/domain/cliente.ts`; una prueba
 * comprueba que no se desincronizan): mayúsculas, sin tildes y con los espacios colapsados.
 */
export function normalizarNombreCliente(nombre) {
  return String(nombre ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

// ----------------------------------------------------------------------------------------------------
// Columnas
// ----------------------------------------------------------------------------------------------------
/** Traduce una columna del esquema a un `columnDefinition` de Graph (validado contra un tenant real). */
export function columnaGraph(campo, ids = {}) {
  const base = { name: campo.n, displayName: campo.d, required: campo.obligatorio === true };
  if (campo.indice || campo.unico) base.indexed = true;
  if (campo.unico) base.enforceUniqueValues = true;

  switch (campo.t) {
    case 'texto':
      return { ...base, text: { maxLength: campo.max ?? 255, allowMultipleLines: false } };
    case 'nota':
      return { ...base, text: { allowMultipleLines: true, textType: 'plain', linesForEditing: 6 } };
    case 'eleccion': {
      const columna = {
        ...base,
        choice: { allowTextEntry: false, choices: [...campo.opciones], displayAs: 'dropDownMenu' },
      };
      if (campo.defecto !== undefined) columna.defaultValue = { value: String(campo.defecto) };
      return columna;
    }
    case 'fecha':
      return { ...base, dateTime: { displayAs: 'default', format: 'dateOnly' } };
    case 'fechaHora':
      return { ...base, dateTime: { displayAs: 'default', format: 'dateTime' } };
    case 'numero':
      return { ...base, number: { decimalPlaces: 'none', displayAs: 'number' } };
    case 'moneda':
      // Graph solo permite fijar la configuración regional; los decimales quedan en el valor por defecto.
      return { ...base, currency: { locale: 'es-CO' } };
    case 'si_no': {
      const columna = { ...base, boolean: {} };
      if (campo.defecto !== undefined) columna.defaultValue = { value: campo.defecto ? '1' : '0' };
      return columna;
    }
    case 'busqueda': {
      if (!ids[campo.lista])
        throw new Error(`Falta el id de la lista ${campo.lista} para la búsqueda ${campo.n}`);
      // No se pide el índice al crear la columna de búsqueda: se aplica después con PATCH (spike S10).
      delete base.indexed;
      return {
        ...base,
        lookup: {
          listId: ids[campo.lista],
          columnName: campo.campo,
          allowMultipleValues: false,
          allowUnlimitedLength: false,
        },
      };
    }
    default:
      throw new Error(`Tipo de columna desconocido: ${campo.t} (${campo.n})`);
  }
}

// ----------------------------------------------------------------------------------------------------
// Cliente de Graph (reintentos con 429/5xx, un reintento ante 401, sin escribir nunca el token)
// ----------------------------------------------------------------------------------------------------
export class ErrorGraph extends Error {
  constructor(estado, codigo, mensaje, operacion) {
    super(`${operacion} -> ${estado} ${codigo ?? ''} ${mensaje ?? ''}`.trim());
    this.name = 'ErrorGraph';
    this.estado = estado;
    this.codigo = codigo;
  }
}

export function crearGraph({
  obtenerToken,
  fetchFn = fetch,
  base = 'https://graph.microsoft.com/v1.0',
  esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms)),
}) {
  let token;

  async function llamar(metodo, ruta, cuerpo, intento = 0) {
    token ??= await obtenerToken();
    const url = ruta.startsWith('http') ? ruta : base + ruta;
    const respuesta = await fetchFn(url, {
      method: metodo,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
      signal: AbortSignal.timeout(60_000),
    });

    if (respuesta.status === 401 && intento === 0) {
      token = undefined;
      return llamar(metodo, ruta, cuerpo, intento + 1);
    }
    if ([429, 502, 503, 504].includes(respuesta.status) && intento < 5) {
      const indicada = Number(respuesta.headers?.get?.('Retry-After'));
      await esperar(
        Number.isFinite(indicada) && indicada > 0 ? indicada * 1000 : 1000 * 2 ** intento
      );
      return llamar(metodo, ruta, cuerpo, intento + 1);
    }

    const texto = await respuesta.text();
    let json;
    try {
      json = texto ? JSON.parse(texto) : undefined;
    } catch {
      json = undefined;
    }
    if (!respuesta.ok) {
      throw new ErrorGraph(
        respuesta.status,
        json?.error?.code,
        json?.error?.message?.slice(0, 200),
        `${metodo} ${ruta.split('?')[0]}`
      );
    }
    return json;
  }

  return {
    get: (ruta) => llamar('GET', ruta),
    post: (ruta, cuerpo) => llamar('POST', ruta, cuerpo),
    patch: (ruta, cuerpo) => llamar('PATCH', ruta, cuerpo),
    async getTodos(ruta) {
      const todos = [];
      let siguiente = ruta;
      while (siguiente) {
        const pagina = await llamar('GET', siguiente);
        todos.push(...(pagina?.value ?? []));
        siguiente = pagina?.['@odata.nextLink'];
      }
      return todos;
    },
  };
}

export async function obtenerTokenAplicacion({ tenant, clientId, secreto, fetchFn = fetch }) {
  const respuesta = await fetchFn(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secreto,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  const json = await respuesta.json().catch(() => ({}));
  if (!json.access_token) {
    // Nunca se incluye el secreto en el mensaje.
    throw new Error(
      `No se pudo obtener el token (${json.error ?? respuesta.status}): ${String(json.error_description ?? '').slice(0, 200)}`
    );
  }
  return json.access_token;
}

// ----------------------------------------------------------------------------------------------------
// Aprovisionamiento
// ----------------------------------------------------------------------------------------------------
async function agregarElementosPorTitulo({
  graph,
  siteId,
  lista,
  elementos,
  aplicar,
  resumen,
  log,
  etiqueta,
}) {
  const existentes = lista.id
    ? new Set(
        (
          await graph.getTodos(
            `/sites/${siteId}/lists/${lista.id}/items?$expand=fields($select=Title)&$top=999`
          )
        ).map((item) => item.fields?.Title)
      )
    : new Set();
  for (const { titulo, campos } of elementos) {
    if (existentes.has(titulo)) {
      resumen.existentes++;
      log(`  [ya existe]  ${etiqueta}: ${titulo}`);
    } else if (!aplicar || !lista.id) {
      log(`  [simulación] agregaría ${etiqueta}: ${titulo}`);
    } else {
      await graph.post(`/sites/${siteId}/lists/${lista.id}/items`, {
        fields: { Title: titulo, ...campos },
      });
      resumen.creados++;
      log(`  [creado]     ${etiqueta}: ${titulo}`);
    }
  }
}

/**
 * Crea las carpetas de año (`/{año}`) en la biblioteca de adjuntos. La carpeta de cada servicio
 * (`/{año}/{ServicioId}`) NO se crea aquí: su id nace en el dispositivo y la app la crea sola al subir
 * el primer archivo (`PUT .../root:/{ruta}:/content` crea las carpetas intermedias).
 */
export async function asegurarCarpetasAnio({
  graph,
  siteId,
  listaId,
  anios,
  aplicar,
  resumen,
  log,
}) {
  if (!anios.length) return;
  const unidad =
    listaId && !String(listaId).startsWith('(')
      ? (await graph.get(`/sites/${siteId}/lists/${listaId}/drive?$select=id`)).id
      : undefined;
  const existentes = unidad
    ? new Set(
        (await graph.getTodos(`/drives/${unidad}/root/children?$select=name,folder&$top=200`))
          .filter((e) => e.folder)
          .map((e) => e.name)
      )
    : new Set();
  for (const anio of anios.map(String)) {
    if (existentes.has(anio)) {
      resumen.existentes++;
      log(`  [ya existe]  carpeta /${anio}`);
    } else if (!aplicar || !unidad) {
      log(`  [simulación] crearía la carpeta /${anio}`);
    } else {
      await graph.post(`/drives/${unidad}/root/children`, {
        name: anio,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      });
      resumen.creados++;
      log(`  [creado]     carpeta /${anio}`);
    }
  }
}

/**
 * Concilia las columnas de una lista con el esquema: crea las que faltan (solo en una lista que ya existía) y
 * corrige con PATCH las que existen sin índice o sin valor único (spikes S9 y S10). Nunca recrea ni borra.
 */
async function conciliarColumnas({
  graph,
  siteId,
  lista,
  nombre,
  campos,
  ids,
  aplicar,
  resumen,
  log,
  crearFaltantes,
}) {
  const columnas = new Map(
    (
      await graph.getTodos(
        `/sites/${siteId}/lists/${lista.id}/columns?$select=id,name,indexed,enforceUniqueValues`
      )
    ).map((c) => [c.name, c])
  );
  for (const campo of campos) {
    const actual = columnas.get(campo.n);
    if (actual) {
      if (crearFaltantes) resumen.existentes++;
      const sinUnico = campo.unico === true && actual.enforceUniqueValues !== true;
      const sinIndice = (campo.indice === true || campo.unico === true) && actual.indexed !== true;
      if (sinUnico || sinIndice) {
        if (!aplicar) {
          log(`  [simulación] corregiría ${nombre}.${campo.n} (índice y/o valor único)`);
        } else {
          await graph.patch(`/sites/${siteId}/lists/${lista.id}/columns/${actual.id}`, {
            indexed: true,
            ...(campo.unico ? { enforceUniqueValues: true } : {}),
          });
          resumen.corregidos++;
          log(`  [corregido]  columna ${nombre}.${campo.n} (índice y valor único)`);
        }
      }
    } else if (!crearFaltantes) {
      continue;
    } else if (!aplicar) {
      log(`  [simulación] agregaría la columna ${nombre}.${campo.n}`);
    } else {
      await graph.post(`/sites/${siteId}/lists/${lista.id}/columns`, columnaGraph(campo, ids));
      resumen.creados++;
      log(`  [creado]     columna ${nombre}.${campo.n}`);
    }
  }
}

/**
 * Rellena `NombreNormalizado` en los clientes que ya existían (ADR-0023). Solo escribe esa columna y solo en
 * los que no la tienen. Si dos clientes comparten el nombre normalizado, SharePoint rechaza el segundo: se avisa
 * (se corrige fusionándolos) y se sigue con los demás.
 */
async function rellenarNombreNormalizado({ graph, siteId, lista, aplicar, resumen, log }) {
  const items = await graph.getTodos(
    `/sites/${siteId}/lists/${lista.id}/items?$expand=fields($select=Title,NombreNormalizado)&$top=999`
  );
  for (const item of items) {
    const titulo = item.fields?.Title;
    if (!titulo || item.fields?.NombreNormalizado) continue;
    if (!aplicar) {
      log(`  [simulación] rellenaría NombreNormalizado de ${titulo}`);
      continue;
    }
    try {
      await graph.patch(`/sites/${siteId}/lists/${lista.id}/items/${item.id}/fields`, {
        NombreNormalizado: normalizarNombreCliente(titulo),
      });
      resumen.corregidos++;
      log(`  [corregido]  Clientes: NombreNormalizado de ${titulo}`);
    } catch (error) {
      if (error instanceof ErrorGraph && error.estado === 400 && /unique/i.test(error.message)) {
        resumen.avisos.push(
          `El cliente «${titulo}» comparte el nombre normalizado con otro: fusiónalos desde la app (Técnico → Clientes).`
        );
      } else {
        throw error;
      }
    }
  }
}

export async function aprovisionar({
  graph,
  siteId,
  aplicar = false,
  sinDatos = false,
  correos = {},
  anios = [],
  log = console.log,
}) {
  const resumen = { creados: 0, existentes: 0, corregidos: 0, avisos: [] };
  const existentes = new Map(
    (await graph.getTodos(`/sites/${siteId}/lists?$select=id,name,displayName,list&$top=200`)).map(
      (l) => [l.name, l]
    )
  );
  const ids = {};

  for (const { nombre, plantilla } of LISTAS) {
    const campos = CAMPOS[nombre];
    log(`\n== ${nombre}`);
    let lista = existentes.get(nombre);

    if (!lista) {
      if (!aplicar) {
        log(
          `  [simulación] crearía ${plantilla === 'documentLibrary' ? 'la biblioteca' : 'la lista'} ${nombre} con ${campos.length} columnas`
        );
        lista = { name: nombre };
        ids[nombre] = `(id de ${nombre})`;
      } else {
        lista = await graph.post(`/sites/${siteId}/lists`, {
          displayName: nombre,
          list: { template: plantilla },
          columns: campos.map((c) => columnaGraph(c, ids)),
        });
        resumen.creados++;
        log(
          `  [creado]     ${plantilla === 'documentLibrary' ? 'biblioteca' : 'lista'} ${nombre} con ${campos.length} columnas`
        );
        await conciliarColumnas({
          graph,
          siteId,
          lista,
          nombre,
          campos,
          ids,
          aplicar,
          resumen,
          log,
          crearFaltantes: false,
        });
      }
    } else {
      resumen.existentes++;
      log(`  [ya existe]  ${nombre}`);
      await conciliarColumnas({
        graph,
        siteId,
        lista,
        nombre,
        campos,
        ids,
        aplicar,
        resumen,
        log,
        crearFaltantes: true,
      });
    }
    if (lista.id) ids[nombre] = lista.id;

    if (nombre === 'ServiciosAdjuntos') {
      await asegurarCarpetasAnio({
        graph,
        siteId,
        listaId: ids[nombre],
        anios,
        aplicar,
        resumen,
        log,
      });
    }

    if (sinDatos) continue;
    if (nombre === 'Clientes') {
      await agregarElementosPorTitulo({
        graph,
        siteId,
        lista,
        aplicar,
        resumen,
        log,
        etiqueta: 'Clientes',
        elementos: CLIENTES_INICIALES.map((titulo) => ({
          titulo,
          campos: { Activo: true, NombreNormalizado: normalizarNombreCliente(titulo) },
        })),
      });
      if (lista.id) {
        await rellenarNombreNormalizado({ graph, siteId, lista, aplicar, resumen, log });
      }
    } else if (nombre === 'Marcas') {
      await agregarElementosPorTitulo({
        graph,
        siteId,
        lista,
        aplicar,
        resumen,
        log,
        etiqueta: 'Marcas',
        elementos: MARCAS_INICIALES.map((titulo) => ({ titulo, campos: { Activo: true } })),
      });
    } else if (nombre === 'ConfiguracionApp') {
      const claves = Object.entries(CONFIGURACION_POR_DEFECTO).map(
        ([titulo, [valor, descripcion]]) => ({
          titulo,
          campos: { Valor: valor, Descripcion: descripcion },
        })
      );
      if (correos.ot)
        claves.push({
          titulo: 'CorreoDestinoOT',
          campos: {
            Valor: correos.ot,
            Descripcion:
              'Correo(s) destino del correo de la orden de trabajo (Power Automate), separados por ;',
          },
        });
      if (correos.alertas)
        claves.push({
          titulo: 'CorreoDestinoAlertas',
          campos: {
            Valor: correos.alertas,
            Descripcion:
              'Correo(s) destino de las alertas de vida útil (Power Automate), separados por ;',
          },
        });
      await agregarElementosPorTitulo({
        graph,
        siteId,
        lista,
        aplicar,
        resumen,
        log,
        etiqueta: 'ConfiguracionApp',
        elementos: claves,
      });
      if (!correos.ot)
        resumen.avisos.push(
          'Falta la clave CorreoDestinoOT (la usa Power Automate): créala con --correo-ot o a mano; la app la rechaza vacía.'
        );
      if (!correos.alertas)
        resumen.avisos.push(
          'Falta la clave CorreoDestinoAlertas (la usa Power Automate): créala con --correo-alertas o a mano.'
        );
    }
  }

  resumen.avisos.push(
    'Graph no puede configurar: versionado (50) y datos adjuntos de Servicios, vistas sugeridas, permisos del grupo de usuarios, renombrar Title ni indexar Modified. Complétalo con scripts/provision-sharepoint.ps1 (cuenta propietaria del sitio) o a mano (docs/06 §2.3-§2.5).'
  );
  return resumen;
}

/** Comprueba que todo lo esperado exista y tenga las propiedades que la app necesita. */
export async function verificar({ graph, siteId }) {
  const problemas = [];
  const listas = new Map(
    (await graph.getTodos(`/sites/${siteId}/lists?$select=id,name,list&$top=200`)).map((l) => [
      l.name,
      l,
    ])
  );
  for (const { nombre, plantilla } of LISTAS) {
    const lista = listas.get(nombre);
    if (!lista) {
      problemas.push(`Falta la lista o biblioteca ${nombre}`);
      continue;
    }
    if (plantilla === 'documentLibrary' && lista.list?.template !== 'documentLibrary')
      problemas.push(`${nombre} no es una biblioteca de documentos`);
    const columnas = new Map(
      (
        await graph.getTodos(
          `/sites/${siteId}/lists/${lista.id}/columns?$select=name,indexed,enforceUniqueValues,required,choice,text`
        )
      ).map((c) => [c.name, c])
    );
    for (const campo of CAMPOS[nombre]) {
      const columna = columnas.get(campo.n);
      if (!columna) {
        problemas.push(`Falta la columna ${nombre}.${campo.n}`);
        continue;
      }
      if (campo.unico && !columna.enforceUniqueValues)
        problemas.push(`${nombre}.${campo.n} no exige valores únicos`);
      if ((campo.indice || campo.unico) && !columna.indexed)
        problemas.push(`${nombre}.${campo.n} no está indexada`);
      if (campo.t === 'eleccion') {
        const reales = (columna.choice?.choices ?? []).join('|');
        if (reales !== campo.opciones.join('|'))
          problemas.push(`${nombre}.${campo.n}: opciones distintas (${reales})`);
      }
      if (campo.t === 'nota' && columna.text?.allowMultipleLines !== true)
        problemas.push(`${nombre}.${campo.n} no es de varias líneas`);
    }
  }
  return problemas;
}

// ----------------------------------------------------------------------------------------------------
// Línea de comandos
// ----------------------------------------------------------------------------------------------------
export function leerArgumentos(argv) {
  const opciones = { aplicar: false, sinDatos: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--aplicar') opciones.aplicar = true;
    else if (arg === '--sin-datos') opciones.sinDatos = true;
    else if (arg === '--site') opciones.site = argv[++i];
    else if (arg === '--env-file') opciones.envFile = argv[++i];
    else if (arg === '--correo-ot') opciones.correoOt = argv[++i];
    else if (arg === '--correo-alertas') opciones.correoAlertas = argv[++i];
    else if (arg === '--anios')
      opciones.anios = String(argv[++i])
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
    else throw new Error(`Argumento desconocido: ${arg}`);
  }
  return opciones;
}

export function partesDelSitio(site) {
  const limpio = String(site ?? '')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
  const indice = limpio.indexOf('/');
  if (indice < 1)
    throw new Error('--site debe ser como siminticsas.sharepoint.com/sites/NombreDelSitio');
  return { host: limpio.slice(0, indice), ruta: limpio.slice(indice) };
}

async function main() {
  const opciones = leerArgumentos(process.argv.slice(2));
  if (!opciones.site) throw new Error('Falta --site <host/sites/NombreDelSitio>');
  if (opciones.envFile) process.loadEnvFile(opciones.envFile);
  const { SP_TENANT_ID: tenant, SP_CLIENT_ID: clientId, SP_CLIENT_SECRET: secreto } = process.env;
  if (!tenant || !clientId || !secreto)
    throw new Error(
      'Faltan SP_TENANT_ID, SP_CLIENT_ID o SP_CLIENT_SECRET (variables de entorno o --env-file).'
    );

  const graph = crearGraph({
    obtenerToken: () => obtenerTokenAplicacion({ tenant, clientId, secreto }),
  });
  const { host, ruta } = partesDelSitio(opciones.site);
  const sitio = await graph.get(`/sites/${host}:${ruta}?$select=id,displayName,webUrl`);
  console.log(`Sitio: ${sitio.displayName} (${sitio.webUrl})`);
  console.log(
    opciones.aplicar
      ? 'MODO: APLICAR (se crearán las listas y columnas que falten)'
      : 'MODO: ENSAYO (solo lectura; usa --aplicar para crear)'
  );

  const resumen = await aprovisionar({
    graph,
    siteId: sitio.id,
    aplicar: opciones.aplicar,
    sinDatos: opciones.sinDatos,
    correos: { ot: opciones.correoOt, alertas: opciones.correoAlertas },
    anios: opciones.anios ?? [new Date().getFullYear()],
  });
  console.log(`\nResumen: ${resumen.creados} creado(s), ${resumen.existentes} que ya existían.`);
  for (const aviso of resumen.avisos) console.log(` - ${aviso}`);

  if (opciones.aplicar) {
    const problemas = await verificar({ graph, siteId: sitio.id });
    if (problemas.length === 0)
      console.log(
        '\nVerificación: todas las listas y columnas existen con las propiedades esperadas.'
      );
    else {
      console.log('\nVerificación: PROBLEMAS');
      for (const p of problemas) console.log(` [FALLO] ${p}`);
      process.exitCode = 1;
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  });
}
