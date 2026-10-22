import { describe, expect, it } from 'vitest'
import { CONFIG_DEFECTO, combinarConfig } from './config'
import { FakeLogger } from '../../tests/fakes/FakeLogger'

describe('combinarConfig', () => {
  it('usa defaults si remota inválida', () => {
    const logger = new FakeLogger()
    const resultado = combinarConfig({ D_FINAL_POR_DEFECTO: '' }, CONFIG_DEFECTO, logger)
    expect(resultado).toEqual(CONFIG_DEFECTO)
    expect(logger.advertencias.length).toBe(1)
  })

  it('sobrescribe con valores válidos', () => {
    const remota = {
      D_FINAL_POR_DEFECTO: 'CHATARRA',
      REQUIERE_SOLICITUD_UNICA: true,
      TIEMPO_ALERTA_DIAS: 14,
    }
    const resultado = combinarConfig(remota)
    expect(resultado.D_FINAL_POR_DEFECTO).toBe('CHATARRA')
    expect(resultado.REQUIERE_SOLICITUD_UNICA).toBe(true)
    expect(resultado.TIEMPO_ALERTA_DIAS).toBe(14)
    expect(resultado.ROLES_PERMITIDOS).toEqual(CONFIG_DEFECTO.ROLES_PERMITIDOS)
  })
})
