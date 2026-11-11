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
  const af = ['crop', 'et0', 'pe', 'zr', 'p', 'ef'] as const
  const aOk = af.filter((k) => String(p.agro[k]).trim() !== '').length + (p.agro.fases.every((f, i) => i === 1 || String(f.kc).trim() !== '') ? 1 : 0)
  const hOk = [String(p.hid.horas).trim() !== '', String(p.hid.pc).trim() !== '', ...p.hid.segs.map((t) => (t.mat === 'Personalizado' ? String(t.idc).trim() !== '' : String(t.dn).trim() !== '') && String(t.L).trim() !== '')]
  const ef2 = ['p', 'q', 'wd', 's'] as const
  const eOk = ef2.filter((k) => String(p.emit[k]).trim() !== '').length
  const bf = ['cotaCapt', 'cotaPivot', 'nivDin', 'etaB', 'etaM', 'tarifa'] as const
  const bOk = bf.filter((k) => String(p.bomb[k]).trim() !== '').length + (p.bomb.bombaSel ? 1 : 0)
  return { emit: Math.round((eOk / ef2.length) * 100), bomb: Math.round((bOk / (bf.length + 1)) * 100), agro: Math.round((aOk / (af.length + 1)) * 100), hid: Math.round((hOk.filter(Boolean).length / hOk.length) * 100), geo: Math.round((gOk / 5) * 100), par: Math.round((pOk / pf.length) * 100), proj: Math.round((jOk / jf.length) * 100) }
}
