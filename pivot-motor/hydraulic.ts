// Motor hidráulico — Darcy-Weisbach (Swamee-Jain) e Hazen-Williams, perdas localizadas,
// fator de Christiansen para a conduta do pivot. Independente da interface.
import type { Hid, Material, Troco, TipoTroco } from './types'
import { num } from './geometry'

const g = 9.81
const NU = 1.004e-6 // viscosidade cinemática da água a 20 °C (m²/s)
export const BAR_M = 10.197 // 1 bar em m c.a.

/** Diâmetros externos nominais e internos (mm). PEAD PE100: PN10 = SDR17, PN16 = SDR11. Aço: ID ≈ DN (indicativo). */
const SDR: Record<string, number> = { 'PEAD PN10': 17, 'PEAD PN16': 11 }
const DN_PEAD = [63, 75, 90, 110, 125, 160, 200, 250, 315, 400]
const DN_ACO = [100, 125, 150, 200, 250, 300]

export interface Mat { C: number; eps: number; pn: number | null; dns: number[]; id: (dn: number) => number }
export const MATERIAIS: Record<Material, Mat> = {
  'PEAD PN10': { C: 140, eps: 0.007, pn: 10, dns: DN_PEAD, id: (dn) => dn - 2 * (dn / SDR['PEAD PN10']) },
  'PEAD PN16': { C: 140, eps: 0.007, pn: 16, dns: DN_PEAD, id: (dn) => dn - 2 * (dn / SDR['PEAD PN16']) },
  Aço: { C: 120, eps: 0.15, pn: null, dns: DN_ACO, id: (dn) => dn },
  Personalizado: { C: 130, eps: 0.05, pn: null, dns: [], id: (dn) => dn },
}

export const TIPOS: Record<TipoTroco, { nome: string; vmax: number }> = {
  asp: { nome: 'Conduta de aspiração', vmax: 1.5 },
  prin: { nome: 'Conduta principal', vmax: 2.0 },
  dist: { nome: 'Conduta de distribuição', vmax: 2.0 },
  pivot: { nome: 'Conduta do pivot', vmax: 3.0 },
}

export function trocoNovo(kind: TipoTroco, name?: string): Troco {
  return {
    id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    name: name ?? TIPOS[kind].nome, kind, mat: kind === 'pivot' ? 'Aço' : 'PEAD PN10',
    dn: kind === 'pivot' ? '150' : '200', idc: '', L: kind === 'pivot' ? '' : '100', dz: '0', k: '0', nOut: '100', prices: {},
  }
}

export function hidPadrao(): Hid {
  return {
    horas: '20', pc: '2', pdisp: '', qman: '', method: 'DW',
    segs: [trocoNovo('asp'), trocoNovo('prin'), trocoNovo('pivot')],
  }
}

/** Diâmetro interno (m) do troço, ou null se inválido. */
export function diametroInterno(t: Troco, dnOverride?: number): number | null {
  if (t.mat === 'Personalizado' && dnOverride === undefined) { const v = num(t.idc); return v && v > 0 ? v / 1000 : null }
  const dn = dnOverride ?? num(t.dn)
  if (!dn || dn <= 0) return null
  return MATERIAIS[t.mat].id(dn) / 1000
}

/** Fator de Christiansen para N saídas equidistantes (m = expoente da fórmula de perdas). */
export function christiansen(N: number, m: number): number {
  if (!(N >= 1)) return 1
  return 1 / (m + 1) + 1 / (2 * N) + Math.sqrt(m - 1) / (6 * N * N)
}

export function fatorAtrito(D: number, eps: number, Re: number): number {
  if (Re < 2000) return 64 / Re
  return 0.25 / Math.pow(Math.log10(eps / 1000 / (3.7 * D) + 5.74 / Math.pow(Re, 0.9)), 2)
}

export interface PerdaTroco { V: number; Re: number; f: number; hfDW: number; hfHW: number; hf: number; hl: number; F: number }

/** Q em m³/h, D em m, L em m. */
export function perdasTroco(t: Troco, Qh: number, D: number, method: 'DW' | 'HW'): PerdaTroco {
  const Q = Qh / 3600
  const L = Math.max(0, num(t.L) ?? 0)
  const m = MATERIAIS[t.mat]
  const C = m.C
  const eps = t.mat === 'Personalizado' ? 0.05 : m.eps
  const A = (Math.PI * D * D) / 4
  const V = Q / A
  const Re = (V * D) / NU
  const f = V > 0 ? fatorAtrito(D, eps, Re) : 0
  const F = t.kind === 'pivot' ? christiansen(num(t.nOut) ?? 1, method === 'DW' ? 2 : 1.852) : 1
  const hfDW = f * (L / D) * ((V * V) / (2 * g)) * F
  const hfHW = Q > 0 ? 10.67 * L * Math.pow(Q, 1.852) / (Math.pow(C, 1.852) * Math.pow(D, 4.871)) * F : 0
  const hl = (num(t.k) ?? 0) * ((V * V) / (2 * g))
  return { V, Re, f, hfDW, hfHW, hf: method === 'DW' ? hfDW : hfHW, hl, F }
}

export type Estado = 'ok' | 'info' | 'aviso' | 'erro'
export function estadoVelocidade(kind: TipoTroco, V: number): { e: Estado; txt: string } {
  const vmax = TIPOS[kind].vmax
  if (V > vmax * 1.25) return { e: 'erro', txt: `acima de ${String(vmax).replace('.', ',')} m/s` }
  if (V > vmax) return { e: 'aviso', txt: `acima de ${String(vmax).replace('.', ',')} m/s` }
  if (V < 0.5) return { e: 'info', txt: 'abaixo de 0,5 m/s' }
  return { e: 'ok', txt: 'dentro dos limites' }
}

export interface Candidato { dn: number; id: number; V: number; hf: number; hl: number; estado: { e: Estado; txt: string }; custo: number | null; selecionado: boolean }

export function comparar(t: Troco, Qh: number, method: 'DW' | 'HW'): Candidato[] {
  const mat = MATERIAIS[t.mat]
  const sel = num(t.dn)
  return mat.dns.map((dn) => {
    const D = mat.id(dn) / 1000
    const r = perdasTroco(t, Qh, D, method)
    const preco = num(t.prices[String(dn)])
    const L = num(t.L) ?? 0
    return { dn, id: D * 1000, V: r.V, hf: r.hf, hl: r.hl, estado: estadoVelocidade(t.kind, r.V), custo: preco !== null ? preco * L : null, selecionado: sel === dn }
  })
}

export interface ResTroco { t: Troco; D: number | null; p: PerdaTroco | null; dz: number; estado: { e: Estado; txt: string } | null; pEntrada: number | null }
export interface ResHid {
  Q: number | null; origemQ: 'manual' | 'agronómico' | null
  trocos: ResTroco[]
  somaHf: number; somaHl: number; somaDz: number
  pcM: number; hmtParcial: number | null
  necessariaRede: number | null; margem: number | null
  alertas: { nivel: 'ok' | 'i' | 'w' | 'b'; texto: string }[]
}

export function calcHid(h: Hid, qAgro: number | null): ResHid {
  const qm = num(h.qman)
  const Q = qm !== null && qm > 0 ? qm : qAgro
  const origemQ = qm !== null && qm > 0 ? 'manual' : Q !== null ? 'agronómico' : null
  const trocos: ResTroco[] = h.segs.map((t) => {
    const D = diametroInterno(t)
    const dz = num(t.dz) ?? 0
    if (Q === null || D === null) return { t, D, p: null, dz, estado: null, pEntrada: null }
    const p = perdasTroco(t, Q, D, h.method)
    return { t, D, p, dz, estado: estadoVelocidade(t.kind, p.V), pEntrada: null }
  })
  const pcM = (num(h.pc) ?? 0) * BAR_M
  // pressão à entrada de cada troço (jusante → montante); aspiração não conta para a pressão da rede
  let jus = pcM
  for (let i = trocos.length - 1; i >= 0; i--) {
    const r = trocos[i]
    if (!r.p) { r.pEntrada = null; continue }
    jus += r.p.hf + r.p.hl + r.dz
    r.pEntrada = r.t.kind === 'asp' ? null : jus
  }
  const comP = trocos.filter((r) => r.p)
  const somaHf = comP.reduce((s, r) => s + (r.p as PerdaTroco).hf, 0)
  const somaHl = comP.reduce((s, r) => s + (r.p as PerdaTroco).hl, 0)
  const somaDz = trocos.reduce((s, r) => s + r.dz, 0)
  const completo = Q !== null && trocos.length > 0 && comP.length === trocos.length
  const hmtParcial = completo ? pcM + somaHf + somaHl + somaDz : null
  const rede = trocos.filter((r) => r.t.kind !== 'asp')
  const necRede = completo ? pcM + rede.reduce((s, r) => s + (r.p as PerdaTroco).hf + (r.p as PerdaTroco).hl + r.dz, 0) : null
  const pd = num(h.pdisp)
  const margem = necRede !== null && pd !== null ? pd * BAR_M - necRede : null

  const al: ResHid['alertas'] = []
  if (Q === null) al.push({ nivel: 'i', texto: 'Informação em falta: caudal. Complete o módulo 04 (agronomia) e a geometria, ou indique um caudal manual.' })
  trocos.forEach((r) => {
    if (r.D === null) al.push({ nivel: 'i', texto: `${r.t.name}: informação em falta (diâmetro interno).` })
    if (r.estado && (r.estado.e === 'aviso' || r.estado.e === 'erro'))
      al.push({ nivel: r.estado.e === 'erro' ? 'b' : 'w', texto: `${r.t.name}: velocidade de ${(r.p as PerdaTroco).V.toFixed(2).replace('.', ',')} m/s ${r.estado.txt}.` })
    if (r.estado?.e === 'info') al.push({ nivel: 'i', texto: `${r.t.name}: velocidade baixa (${(r.p as PerdaTroco).V.toFixed(2).replace('.', ',')} m/s), risco de sedimentação.` })
    const pn = MATERIAIS[r.t.mat].pn
    if (pn && r.pEntrada !== null && r.pEntrada > pn * BAR_M)
      al.push({ nivel: 'b', texto: `${r.t.name}: pressão estimada à entrada (${(r.pEntrada / BAR_M).toFixed(1).replace('.', ',')} bar) acima da pressão nominal ${r.t.mat} (${pn} bar).` })
  })
  if (margem !== null) al.push(margem < 0
    ? { nivel: 'b', texto: `Pressão disponível insuficiente: faltam ${Math.abs(margem).toFixed(1).replace('.', ',')} m c.a.` }
    : { nivel: 'ok', texto: `Pressão disponível suficiente, com margem de ${margem.toFixed(1).replace('.', ',')} m c.a.` })
  if (!al.some((a) => a.nivel === 'b' || a.nivel === 'w' || a.nivel === 'i'))
    al.push({ nivel: 'ok', texto: 'Velocidades dentro dos critérios. Resultado calculado: não substitui a validação técnica do projeto.' })
  return { Q, origemQ, trocos, somaHf, somaHl, somaDz, pcM, hmtParcial, necessariaRede: necRede, margem, alertas: al }
}

/** Caudal do sistema (m³/h) a partir da necessidade bruta (mm/dia), área (ha) e horas de funcionamento por dia. */
export function caudalSistema(nbrutaMmDia: number | null, areaHa: number, horas: number | null): number | null {
  if (nbrutaMmDia === null || !horas || horas <= 0 || areaHa <= 0) return null
  return (nbrutaMmDia * areaHa * 10) / horas
}
