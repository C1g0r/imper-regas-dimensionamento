import { describe, expect, it } from 'vitest'
import { calcEmit, emitPadrao } from './emit'
import { calcHmt, calcPotencias, pontoFuncionamento, proximoMotor, alturaSistema } from './pump'
import type { ModeloBomba } from './types'

describe('emissores', () => {
  const e = { ...emitPadrao(), q: '300', p: '1.4', wd: '12', s: '2.5' }
  it('soma dos caudais dos emissores = caudal distribuído', () => {
    const r = calcEmit(e, 400, 200, 0.15, 14, 0.15, null)
    expect(r.ok).toBe(true)
    const soma = r.pontos.reduce((a, p) => a + p.qDes, 0) / 1000
    expect(soma).toBeCloseTo(200, 6)
  })
  it('caudal de projeto cresce do centro para a ponta', () => {
    const r = calcEmit(e, 400, 200, 0.15, 14, 0.15, null)
    expect(r.pontos[r.N - 1].qDes).toBeGreaterThan(r.pontos[0].qDes)
    expect(r.pontos[0].pBar).toBeGreaterThan(r.pontos[r.N - 1].pBar)
  })
})

describe('bombagem', () => {
  it('potência hidráulica: 200 m³/h a 60 m ≈ 32,7 kW', () => {
    const r = calcPotencias(200, 60, 70, 92, 15)
    expect(r.Ph).toBeCloseTo(32.68, 1)
    expect(r.Pa).toBeCloseTo(46.7, 0)
  })
  it('motor comercial imediatamente acima', () => { expect(proximoMotor(38.6)).toBe(45); expect(proximoMotor(37)).toBe(37) })
  it('HMT com margem', () => {
    const h = calcHmt({ cotaCapt: '100', cotaPivot: '110', nivDin: '40', margemH: '5', etaB: '70', etaM: '92', margemM: '15', tarifa: '0.15', bombaSel: '' }, 20, 10)
    expect(h.estatica).toBe(50); expect(h.liquida).toBe(80); expect(h.total).toBeCloseTo(84, 6)
  })
  it('ponto de funcionamento é a interseção das curvas', () => {
    const b: ModeloBomba = { id: 'x', fab: '', modelo: '', tipo: '', motorKw: '', pontos: [
      { q: '0', h: '100', eta: '0' }, { q: '100', h: '90', eta: '60' }, { q: '200', h: '70', eta: '75' }, { q: '300', h: '40', eta: '65' }] }
    const f = pontoFuncionamento(b, 200, 40, 10, 2, 0)!
    expect(f).not.toBeNull()
    expect(f.h).toBeCloseTo(alturaSistema(f.q, 200, 40, 10, 2, 0), 2)
  })
})
