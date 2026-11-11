import type { Estado, Projeto } from './types'

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
  }
}

export function normalizar(q: Projeto): Projeto {
  const n = novoProjeto()
  const geo = { ...n.geo, ...(q.geo || {}) }
  if (!Array.isArray(geo.spans) || !geo.spans.length) geo.spans = n.geo.spans
  return { ...n, ...q, par: { ...n.par, ...(q.par || {}) }, geo }
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
