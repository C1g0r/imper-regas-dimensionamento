// Motor de bombagem — HMT, potências, energia e ponto de funcionamento por curva característica.
import type { Bomb, ModeloBomba } from './types'
import { num } from './geometry'

export const MOTORES_KW = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250, 315]

export function bombPadrao(): Bomb {
  return { cotaCapt: '0', cotaPivot: '0', nivDin: '0', margemH: '5', etaB: '70', etaM: '92', margemM: '15', tarifa: '0.15', bombaSel: '' }
}

export function proximoMotor(kw: number): number | null {
  return MOTORES_KW.find((m) => m >= kw) ?? null
}

export interface Hmt { estatica: number; pc: number; perdas: number; liquida: number; margem: number; total: number }

/** perdas: Σhf + Σhl (m) ao caudal de projeto; pcM: pressão no centro (m c.a.). */
export function calcHmt(b: Bomb, pcM: number, perdas: number): Hmt {
  const estatica = (num(b.cotaPivot) ?? 0) - (num(b.cotaCapt) ?? 0) + (num(b.nivDin) ?? 0)
  const liquida = estatica + pcM + perdas
  const margem = liquida * ((num(b.margemH) ?? 0) / 100)
  return { estatica, pc: pcM, perdas, liquida, margem, total: liquida + margem }
}

export interface Potencias { Ph: number; Pa: number; Pm: number | null; motor: number | null; Pel: number }

export function calcPotencias(Q: number, H: number, etaB: number, etaM: number, margemM: number): Potencias {
  const Ph = (Q * H) / 367.2
  const Pa = etaB > 0 ? Ph / (etaB / 100) : NaN
  const Pel = etaM > 0 ? Pa / (etaM / 100) : NaN
  const Pm = Pa * (1 + margemM / 100)
  return { Ph, Pa, Pm: Number.isFinite(Pm) ? Pm : null, motor: Number.isFinite(Pm) ? proximoMotor(Pm) : null, Pel }
}

export interface Ponto { q: number; h: number; eta: number | null }

export function pontosValidos(m: ModeloBomba): Ponto[] {
  return m.pontos
    .map((p) => ({ q: num(p.q), h: num(p.h), eta: num(p.eta) }))
    .filter((p): p is { q: number; h: number; eta: number | null } => p.q !== null && p.h !== null && p.q >= 0)
    .sort((a, b) => a.q - b.q)
}

export function interp(pts: Ponto[], q: number, key: 'h' | 'eta'): number | null {
  if (pts.length < 2 || q < pts[0].q || q > pts[pts.length - 1].q) return null
  for (let i = 1; i < pts.length; i++) {
    if (q <= pts[i].q) {
      const a = pts[i - 1], b = pts[i]
      const va = key === 'h' ? a.h : a.eta, vb = key === 'h' ? b.h : b.eta
      if (va === null || vb === null) return null
      const t = b.q === a.q ? 0 : (q - a.q) / (b.q - a.q)
      return va + (vb - va) * t
    }
  }
  return null
}

/** Curva do sistema: parte estática + perdas contínuas (∝Q^1,852) + localizadas (∝Q²). */
export function alturaSistema(Q: number, Q0: number, estaticaPc: number, hf: number, hl: number, margemPct: number): number {
  const x = Q0 > 0 ? Q / Q0 : 0
  return (estaticaPc + hf * Math.pow(x, 1.852) + hl * x * x) * (1 + margemPct / 100)
}

export interface Funcionamento { q: number; h: number; eta: number | null; Pabs: number | null }

export function pontoFuncionamento(m: ModeloBomba, Q0: number, estaticaPc: number, hf: number, hl: number, margemPct: number): Funcionamento | null {
  const pts = pontosValidos(m)
  if (pts.length < 2) return null
  const f = (q: number) => (interp(pts, q, 'h') as number) - alturaSistema(q, Q0, estaticaPc, hf, hl, margemPct)
  const qa = pts[0].q, qb = pts[pts.length - 1].q
  const N = 400
  let prev = qa, fp = f(qa)
  for (let i = 1; i <= N; i++) {
    const q = qa + ((qb - qa) * i) / N
    const fc = f(q)
    if (fp >= 0 && fc <= 0) {
      let lo = prev, hi = q
      for (let k = 0; k < 50; k++) { const mid = (lo + hi) / 2; if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid }
      const qo = (lo + hi) / 2
      const h = interp(pts, qo, 'h') as number
      const eta = interp(pts, qo, 'eta')
      return { q: qo, h, eta, Pabs: eta && eta > 0 ? (qo * h) / 367.2 / (eta / 100) : null }
    }
    prev = q; fp = fc
  }
  return null
}

/** Porque não há ponto de funcionamento: bomba sempre acima do sistema (excede) ou sempre abaixo (insuficiente). */
export function motivoSemPonto(m: ModeloBomba, Q0: number, estaticaPc: number, hf: number, hl: number, margemPct: number): 'excede' | 'insuficiente' | null {
  const pts = pontosValidos(m)
  if (pts.length < 2) return null
  const qa = pts[0].q, qb = pts[pts.length - 1].q
  const dA = pts[0].h - alturaSistema(qa, Q0, estaticaPc, hf, hl, margemPct)
  const dB = pts[pts.length - 1].h - alturaSistema(qb, Q0, estaticaPc, hf, hl, margemPct)
  if (dB > 0) return 'excede'
  if (dA < 0) return 'insuficiente'
  return null
}
