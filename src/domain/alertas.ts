export type NivelAlerta = '90' | '60' | '30' | 'VENCIDA' | null

export const calcularDiasRestantes = (fechaEntrega: string, hoy: string = new Date().toISOString().slice(0, 10)): number => {
  const entrega = new Date(fechaEntrega + 'T00:00:00Z')
  const actual = new Date(hoy + 'T00:00:00Z')
  const diffMs = entrega.getTime() - actual.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export const nivelAlerta = (diasRestantes: number, umbrales: number[] = [90, 60, 30]): NivelAlerta => {
  if (diasRestantes < 0) return 'VENCIDA'
  if (diasRestantes <= umbrales[2]!) return '30'
  if (diasRestantes <= umbrales[1]!) return '60'
  if (diasRestantes <= umbrales[0]!) return '90'
  return null
}
