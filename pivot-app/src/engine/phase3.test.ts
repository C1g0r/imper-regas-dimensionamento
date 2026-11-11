import { describe, expect, it } from 'vitest'
import { agroPadrao, calcAgro } from './agro'
import { caudalSistema, christiansen, comparar, diametroInterno, perdasTroco, trocoNovo } from './hydraulic'

describe('agronomia', () => {
  it('ETc = ET0 × Kc; necessidade bruta = Nliq / eficiência', () => {
    const a = agroPadrao()
    a.et0 = '7'; a.pe = '1'; a.ef = '85'
    const r = calcAgro(a, 50, null)
    expect(r.etc).toBeCloseTo(8.4, 6)
    expect(r.nliq).toBeCloseTo(7.4, 6)
    expect(r.nbruta).toBeCloseTo(7.4 / 0.85, 6)
    expect(r.m3dia).toBeCloseTo((7.4 / 0.85) * 50 * 10, 4)
  })
  it('ciclo soma os dias das fases', () => {
    expect(calcAgro(agroPadrao(), 10, null).ciclo).toBe(140)
  })
})

describe('hidráulica', () => {
  it('caudal do sistema: 8 mm/dia, 50 ha, 20 h → 200 m³/h', () => {
    expect(caudalSistema(8, 50, 20)).toBeCloseTo(200, 6)
  })
  it('diâmetro interno PEAD PN10 DN200 = 176,5 mm (SDR17)', () => {
    const t = trocoNovo('prin')
    t.dn = '200'
    expect(diametroInterno(t)! * 1000).toBeCloseTo(176.47, 1)
  })
  it('Darcy-Weisbach e Hazen-Williams do mesmo ordem de grandeza', () => {
    const t = trocoNovo('prin')
    t.dn = '200'; t.L = '1000'
    const D = diametroInterno(t)!
    const r = perdasTroco(t, 150, D, 'DW')
    expect(r.hfDW).toBeGreaterThan(0)
    expect(r.hfHW / r.hfDW).toBeGreaterThan(0.7)
    expect(r.hfHW / r.hfDW).toBeLessThan(1.4)
  })
  it('Christiansen com muitas saídas tende para 1/(m+1)', () => {
    expect(christiansen(1000, 1.852)).toBeCloseTo(1 / 2.852, 2)
    expect(christiansen(1, 1.852)).toBeCloseTo(1, 1)
  })
  it('comparador devolve todos os DN do material', () => {
    const t = trocoNovo('prin'); t.L = '500'
    expect(comparar(t, 150, 'DW').length).toBe(10)
  })
})
