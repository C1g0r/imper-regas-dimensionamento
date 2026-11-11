import type { Estado, Projeto } from './types'
import { agroPadrao } from './agro'
import { hidPadrao } from './hydraulic'
import { emitPadrao } from './emit'
import { bombPadrao } from './pump'
import { planPadrao, simPadrao } from './plan'

// Mesma chave da versão HTML (pivot.html): os projetos já criados mantêm-se.
export const KEY = 'ir_pivot'

export const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
export const hoje = () => new Date().toISOString().slice(0, 10)

export function novoProjeto(name = 'Novo projeto'): Projeto {
  return {
    id: uid(), name, client: '', loc: '', parcel: '', areaTot: '', crop: '', water: 'Furo', tech: '',
    created: hoje(), arch: 0,
    par: { len: '', wid: '', zmin: '', zmax: '', slope: '', soil: 'Franco', inf: '', ret: '', lat: '', lon: '' },
    geo: { spans: [60, 60, 60, 60, 60, 60], lb: 20, gun: false, G: 0, theta: 360, start: 0, ox: 0, oy: 0 },
    agro: agroPadrao(),
    hid: hidPadrao(),
    emit: emitPadrao(),
    bomb: bombPadrao(),
    plan: planPadrao(),
    sim: simPadrao(),
  }
}

export function normalizar(q: Projeto): Projeto {
  const n = novoProjeto()
  const geo = { ...n.geo, ...(q.geo || {}) }
  if (!Array.isArray(geo.spans) || !geo.spans.length) geo.spans = n.geo.spans
  const agro = { ...n.agro, ...(q.agro || {}) }
  if (!Array.isArray(agro.fases) || agro.fases.length !== 4) agro.fases = n.agro.fases
  const hid = { ...n.hid, ...(q.hid || {}) }
  if (!Array.isArray(hid.segs) || !hid.segs.length) hid.segs = n.hid.segs
  hid.segs = hid.segs.map((t) => ({ ...t, prices: t.prices || {} }))
  return { ...n, ...q, par: { ...n.par, ...(q.par || {}) }, geo, agro, hid, emit: { ...n.emit, ...(q.emit || {}) }, bomb: { ...n.bomb, ...(q.bomb || {}) }, plan: { ...n.plan, ...(q.plan || {}) }, sim: { cen: Array.isArray(q.sim?.cen) && q.sim.cen.length ? q.sim.cen : n.sim.cen } }
}

export function carregar(): Estado {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (d && Array.isArray(d.list) && d.list.length) {
      const list = (d.list as Projeto[]).map(normalizar)
      const cur = list.some((p) => p.id === d.cur) ? d.cur : list[0].id
      return { list, cur, mod: d.mod || '01' }
    }
  } catch { /* ignora */ }
  const p = novoProjeto('Exploração exemplo')
  return { list: [p], cur: p.id, mod: '01' }
}

export function guardar(e: Estado): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(e)); return true } catch { return false }
}
