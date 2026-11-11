import { describe, expect, it } from 'vitest'
import { novoProjeto } from './storage'
import { aplicarCenario, calcCenarios, cenarioNovo, sensibilidade, simularPlano } from './plan'

function proj() {
  const p = novoProjeto('T')
  p.par.soil = 'Franco'
  p.agro.plantDate = '2026-05-01'
  p.hid.segs[0].L = '10'; p.hid.segs[1].L = '300'; p.hid.segs[2].L = '400'
  return p
}

describe('planeamento', () => {
  it('simula regas e respeita a reserva do solo', () => {
    const s = simularPlano(proj())
    expect(s.ok).toBe(true)
    expect(s.regas.length).toBeGreaterThan(5)
    expect(s.regas[0].data).toMatch(/^2026-0[56]-/)
    s.dias.forEach((d) => expect(d.dr).toBeLessThanOrEqual(s.taw! + 1e-9))
    s.regas.forEach((r) => expect(r.bruta * 0.85).toBeCloseTo(r.liq, 6))
  })
  it('modo fixo respeita o intervalo', () => {
    const p = proj(); p.plan.modo = 'fixo'; p.plan.intervalo = '4'
    const s = simularPlano(p)
    for (let i = 1; i < s.regas.length; i++) expect(s.regas[i].dia - s.regas[i - 1].dia).toBeGreaterThanOrEqual(4)
  })
  it('dotação máxima limita a rega', () => {
    const p = proj(); p.plan.dotMax = '10'
    simularPlano(p).regas.forEach((r) => expect(r.bruta).toBeLessThanOrEqual(10 + 1e-9))
  })
  it('cenário ET0 +20 % aumenta o caudal 20 %', () => {
    const p = proj(); p.sim.cen = [cenarioNovo('B'), cenarioNovo('S', { et0: '120' })]
    const r = calcCenarios(p)
    expect(r.lista[1].Q! / r.lista[0].Q!).toBeCloseTo(1.2, 2)
    expect(aplicarCenario(p, p.sim.cen[1]).hid.qman).toBe('')
  })
  it('sensibilidade: menos eficiência → mais caudal', () => {
    const ef = sensibilidade(proj()).find((x) => x.nome === 'Eficiência')!
    expect(ef.menos.dQ!).toBeGreaterThan(0)
    expect(ef.mais.dQ!).toBeLessThan(0)
  })
})
