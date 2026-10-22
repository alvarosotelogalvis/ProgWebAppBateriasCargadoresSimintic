import type { Servicio } from './servicio'
import { ORDEN_ESTADOS } from './estados'

export type MergeInput = {
  base?: Partial<Servicio> | null
  local: Servicio
  remoto: Partial<Servicio>
}

export type MergeResult = {
  combinado: Partial<Servicio>
  conflictos: string[]
  camposSucios: string[]
}

const esMasAvanzado = (a: string, b: string): boolean => {
  const ia = ORDEN_ESTADOS.indexOf(a as any)
  const ib = ORDEN_ESTADOS.indexOf(b as any)
  if (ia === -1 || ib === -1) return ia >= ib
  return ia > ib
}

export const mergeTresVias = (input: MergeInput): MergeResult => {
  const { base, local, remoto } = input
  const combinado: any = {}
  const conflictos: string[] = []
  const camposSucios = new Set<string>(local.camposSucios || [])

  const claves = new Set<string>([
    ...Object.keys(base || {}),
    ...Object.keys(local),
    ...Object.keys(remoto),
  ])

  for (const clave of claves) {
    if (clave === 'ServicioId' || clave === 'creadoEn' || clave === 'dispositivoId' || clave === 'capturadoPor') {
      combinado[clave] = (local as any)[clave] ?? (remoto as any)[clave] ?? (base as any)[clave]
      continue
    }

    const valorBase = base ? (base as any)[clave] : undefined
    const valorLocal = (local as any)[clave]
    const valorRemoto = (remoto as any)[clave]

    const localCambio = valorBase !== undefined ? JSON.stringify(valorLocal) !== JSON.stringify(valorBase) : false
    const remotoCambio = valorBase !== undefined ? JSON.stringify(valorRemoto) !== JSON.stringify(valorBase) : false

    if (clave === 'Estado') {
      if (localCambio && remotoCambio && valorLocal !== valorRemoto) {
        // gana el más avanzado
        if (esMasAvanzado(valorLocal, valorRemoto)) {
          combinado[clave] = valorLocal
        } else if (esMasAvanzado(valorRemoto, valorLocal)) {
          combinado[clave] = valorRemoto
        } else {
          combinado[clave] = valorRemoto
          conflictos.push(clave)
        }
        continue
      }
      if (localCambio && !remotoCambio) {
        combinado[clave] = valorLocal
        continue
      }
      if (remotoCambio && !localCambio) {
        combinado[clave] = valorRemoto
        continue
      }
      combinado[clave] = valorLocal ?? valorRemoto ?? valorBase
      continue
    }

    if (localCambio && !remotoCambio) {
      combinado[clave] = valorLocal
      if (valorLocal !== valorBase) camposSucios.add(clave)
      continue
    }
    if (remotoCambio && !localCambio) {
      combinado[clave] = valorRemoto
      continue
    }
    if (localCambio && remotoCambio) {
      if (JSON.stringify(valorLocal) === JSON.stringify(valorRemoto)) {
        combinado[clave] = valorLocal
        continue
      }
      combinado[clave] = valorLocal
      conflictos.push(clave)
      if (valorLocal !== valorBase) camposSucios.add(clave)
      continue
    }
    combinado[clave] = valorLocal ?? valorRemoto ?? valorBase
  }

  return { combinado, conflictos, camposSucios: Array.from(camposSucios) }
}
