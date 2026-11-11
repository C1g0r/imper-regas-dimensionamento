// Motor de cálculo geométrico do pivot — independente da interface.
import type { Geo, Parcela } from './types'

export function num(v: unknown): number | null {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function fmt(v: number | null | undefined, d = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return v.toLocaleString('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export interface Secao { n: string; r0: number; r1: number; len: number; area: number }
export interface Torre { n: number; at: number; len: number }
export interface ResGeo {
  n: number; sp: number[]; sum: number; lb: number; G: number; th: number
  L: number; R: number; D: number; P: number
  Afull: number; As: number; ApL: number
  towers: Torre[]; secs: Secao[]; avgT: number
}

const area = (r: number) => (Math.PI * r * r) / 10000

export function calcGeo(g: Geo): ResGeo {
  const sp = g.spans.map((x) => Math.max(0, num(x) ?? 0))
  const lb = Math.max(0, num(g.lb) ?? 0)
  const G = g.gun ? Math.max(0, num(g.G) ?? 0) : 0
  const th = Math.min(360, Math.max(0, num(g.theta) ?? 0))
  const sum = sp.reduce((a, b) => a + b, 0)
  const L = sum + lb
  const R = L + G
  const k = th / 360
  const towers: Torre[] = []
  const secs: Secao[] = []
  let acc = 0
  sp.forEach((s, i) => {
    const r0 = acc
    acc += s
    towers.push({ n: i + 1, at: acc, len: s })
    secs.push({ n: `Vão ${i + 1}`, r0, r1: acc, len: s, area: (area(acc) - area(r0)) * k })
  })
  if (lb > 0) {
    secs.push({ n: 'Balanço', r0: acc, r1: acc + lb, len: lb, area: (area(acc + lb) - area(acc)) * k })
    acc += lb
  }
  if (G > 0) secs.push({ n: 'Canhão', r0: acc, r1: acc + G, len: G, area: (area(acc + G) - area(acc)) * k })
  return {
    n: sp.length, sp, sum, lb, G, th, L, R, D: 2 * R, P: 2 * Math.PI * R,
    Afull: area(R), As: area(R) * k, ApL: area(L) * k,
    towers, secs, avgT: sp.length ? sum / sp.length : 0,
  }
}

export interface ResParcela { area: number; inside: number; outside: number; uncov: number; pct: number }

/** Integração polar do setor irrigado dentro do retângulo da parcela. */
export function calcParcela(par: Parcela, g: Geo, c: ResGeo): ResParcela | null {
  const len = num(par.len), wid = num(par.wid)
  if (!len || !wid || !c.R || !c.th) return null
  const ox = num(g.ox) ?? 0, oy = num(g.oy) ?? 0, st = num(g.start) ?? 0
  const hx = len / 2, hy = wid / 2
  const NR = 160, NT = Math.max(90, Math.round(c.th))
  const dr = c.R / NR, dt = c.th / NT
  let inside = 0
  for (let i = 0; i < NR; i++) {
    const r = (i + 0.5) * dr
    for (let j = 0; j < NT; j++) {
      const a = ((st + (j + 0.5) * dt) * Math.PI) / 180
      const x = ox + r * Math.sin(a), y = oy + r * Math.cos(a)
      if (Math.abs(x) <= hx && Math.abs(y) <= hy) inside += r * dr * dt * (Math.PI / 180)
    }
  }
  const ar = (len * wid) / 10000
  const ins = inside / 10000
  return { area: ar, inside: ins, outside: c.As - ins, uncov: ar - ins, pct: ar ? (ins / ar) * 100 : 0 }
}

export type Nivel = 'ok' | 'i' | 'w' | 'b'
export interface Alerta { nivel: Nivel; texto: string }

export function alertasGeo(g: Geo, par: Parcela, c: ResGeo, pc: ResParcela | null): Alerta[] {
  const al: Alerta[] = []
  c.sp.forEach((s, i) => { if (s <= 0) al.push({ nivel: 'b', texto: `Vão ${i + 1} sem comprimento válido.` }) })
  const pos = c.sp.filter((s) => s > 0)
  const mx = Math.max(0, ...c.sp), mn = pos.length ? Math.min(...pos) : Infinity
  if (mx > 65) al.push({ nivel: 'w', texto: 'Há vãos com mais de 65 m: confirmar o limite do fabricante para a tubagem e a estrutura.' })
  if (mn < 20) al.push({ nivel: 'w', texto: 'Há vãos com menos de 20 m: valor pouco habitual, confirmar.' })
  const t = num(g.theta)
  if (t === null || t > 360 || t <= 0) al.push({ nivel: 'b', texto: 'O ângulo de funcionamento tem de estar entre 0 e 360°.' })
  if (c.L > 800) al.push({ nivel: 'w', texto: 'Comprimento superior a 800 m: confirmar a viabilidade do equipamento.' })
  if (g.gun && !(c.G > 0)) al.push({ nivel: 'b', texto: 'Canhão ativo sem alcance definido.' })
  if (g.gun && c.th < 360) al.push({ nivel: 'i', texto: 'Com canhão e setor parcial, o desenho mostra o alcance do canhão a tracejado.' })
  if (!num(par.len) || !num(par.wid)) {
    al.push({ nivel: 'i', texto: 'Informação em falta: dimensões da parcela (módulo 02) para calcular a área dentro da parcela.' })
  } else if (pc) {
    if (pc.outside > 0.05 * c.As) al.push({ nivel: 'w', texto: `Mais de 5 % da área irrigada fica fora da parcela (${fmt(pc.outside, 2)} ha). Ajuste a posição do pivot.` })
    if (pc.pct < 60) al.push({ nivel: 'w', texto: `Apenas ${fmt(pc.pct, 1)} % da parcela fica irrigada; os cantos ficam por cobrir (comum em pivots circulares).` })
  }
  if (!al.some((a) => a.nivel === 'b' || a.nivel === 'w'))
    al.push({ nivel: 'ok', texto: 'Dados geométricos coerentes com os critérios definidos. Este é um cálculo geométrico: não substitui a validação técnica do projeto.' })
  return al
}

export function alertasParcela(par: Parcela, areaTot: string): Alerta[] {
  const al: Alerta[] = []
  const l = num(par.len), w = num(par.wid), zmin = num(par.zmin), zmax = num(par.zmax), s = num(par.slope), ar = num(areaTot)
  if (zmin !== null && zmax !== null && zmax < zmin) al.push({ nivel: 'b', texto: 'A cota máxima é inferior à cota mínima.' })
  if (s !== null && s > 15) al.push({ nivel: 'w', texto: 'Declive superior a 15 %: verificar a adequação de um pivot e o escoamento superficial.' })
  if (l && w && ar && Math.abs((l * w) / 10000 - ar) / ar > 0.15)
    al.push({ nivel: 'w', texto: `A área calculada (${fmt((l * w) / 10000, 2)} ha) difere mais de 15 % da área total da exploração (${fmt(ar, 2)} ha).` })
  if (!l || !w) al.push({ nivel: 'i', texto: 'Informação em falta: comprimento e largura da parcela.' })
  if (num(par.inf) === null) al.push({ nivel: 'i', texto: 'Informação em falta: taxa de infiltração do solo (necessária para verificar a intensidade de aplicação).' })
  if (!al.length) al.push({ nivel: 'ok', texto: 'Dados da parcela coerentes com os critérios definidos.' })
  return al
}
