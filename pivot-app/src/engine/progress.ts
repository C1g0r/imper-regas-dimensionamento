import type { Projeto } from './types'
import { num } from './geometry'

export function progresso(p: Projeto) {
  const g = p.geo
  const gOk = [
    g.spans.length > 0, num(g.lb) !== null, !!num(g.theta), !g.gun || num(g.G) !== null,
    g.spans.every((s) => (num(s) ?? 0) > 0),
  ].filter(Boolean).length
  const pf = ['len', 'wid', 'zmin', 'zmax', 'slope', 'soil', 'inf', 'ret'] as const
  const pOk = pf.filter((k) => String(p.par[k]).trim() !== '').length
  const jf = ['name', 'client', 'loc', 'parcel', 'areaTot', 'crop', 'water', 'tech'] as const
  const jOk = jf.filter((k) => String(p[k]).trim() !== '').length
  return { geo: Math.round((gOk / 5) * 100), par: Math.round((pOk / pf.length) * 100), proj: Math.round((jOk / jf.length) * 100) }
}
