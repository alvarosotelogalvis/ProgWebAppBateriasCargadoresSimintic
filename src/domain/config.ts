import { z } from 'zod'
import type { LoggerPort } from '@/application/ports/loggerPort'

export type ConfigApp = {
  D_FINAL_POR_DEFECTO: string
  REQUIERE_SOLICITUD_UNICA: boolean
  ROLES_PERMITIDOS: string[]
  DIAGNOSTICO_OBLIGATORIO: boolean
  COTIZACION_OBLIGATORIA: boolean
  TIEMPO_ALERTA_DIAS: number
}

export const CONFIG_DEFECTO: ConfigApp = {
  D_FINAL_POR_DEFECTO: 'DESCONOCIDO',
  REQUIERE_SOLICITUD_UNICA: false,
  ROLES_PERMITIDOS: ['Tecnico', 'Comercial', 'Administrador'],
  DIAGNOSTICO_OBLIGATORIO: true,
  COTIZACION_OBLIGATORIA: true,
  TIEMPO_ALERTA_DIAS: 7,
}

const esquemaConfigRemota = z.object({
  D_FINAL_POR_DEFECTO: z.string().min(1).optional(),
  REQUIERE_SOLICITUD_UNICA: z.boolean().optional(),
  ROLES_PERMITIDOS: z.array(z.string()).optional(),
  DIAGNOSTICO_OBLIGATORIO: z.boolean().optional(),
  COTIZACION_OBLIGATORIA: z.boolean().optional(),
  TIEMPO_ALERTA_DIAS: z.number().int().positive().optional(),
})

export type ConfigRemota = z.infer<typeof esquemaConfigRemota>

export const combinarConfig = (
  remota: unknown,
  defecto: ConfigApp = CONFIG_DEFECTO,
  logger?: LoggerPort,
): ConfigApp => {
  const resultado = esquemaConfigRemota.safeParse(remota)
  if (!resultado.success) {
    if (logger) {
      logger.warn('config.remota.invalida', { issues: resultado.error.issues })
    }
    return { ...defecto }
  }

  return {
    ...defecto,
    ...resultado.data,
  }
}

export { esquemaConfigRemota }
