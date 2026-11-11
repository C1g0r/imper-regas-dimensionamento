import { describe, expect, it } from 'vitest'
import { calcGeo, calcParcela } from './geometry'
import type { Geo, Parcela } from './types'

const geo = (over: Partial<Geo> = {}): Geo => ({
  spans: [60, 60, 60, 60, 60, 60], lb: 40, gun: false, G: 0, theta: 360, start: 0, ox: 0, oy: 0, ...over,
})
const par: Parcela = { len: '1000', wid: '800', zmin: '', zmax: '', slope: '', soil: 'Franco', inf: '', ret: '', lat: '', lon: '' }

describe('geometria do pivot', () => {
  it('400 m → 50,27 ha, D 800 m, P 2513 m', () => {
    const c = calcGeo(geo())
    expect(c.L).toBe(400)
    expect(c.As).toBeCloseTo(50.265, 2)
    expect(c.D).toBe(800)
    expect(c.P).toBeCloseTo(2513.27, 1)
  })
  it('canhão aumenta o raio efetivo', () => {
    const c = calcGeo(geo({ gun: true, G: 35 }))
    expect(c.R).toBe(435)
    expect(c.L).toBe(400)
  })
  it('setor de 180° é metade da área', () => {
    const c = calcGeo(geo({ theta: 180 }))
    expect(c.As).toBeCloseTo(c.Afull / 2, 6)
  })
  it('áreas das secções somam a área do setor', () => {
    const c = calcGeo(geo({ gun: true, G: 30, theta: 270 }))
    expect(c.secs.reduce((a, s) => a + s.area, 0)).toBeCloseTo(c.As, 6)
  })
  it('parcela: círculo de 400 m dentro de 1000×800 fica todo dentro', () => {
    const g = geo(), c = calcGeo(g), pc = calcParcela(par, g, c)!
    expect(pc.inside).toBeCloseTo(c.As, 1)
    expect(pc.area).toBeCloseTo(80, 6)
  })
})
