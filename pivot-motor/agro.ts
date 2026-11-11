// Motor agronómico — independente da interface. Valores de referência tipo FAO-56 (editáveis).
import type { Agro, FaseCultura } from './types'
import { num } from './geometry'

export const CULTURAS: Record<string, { fases: FaseCultura[]; zr: string }> = {
  Milho: { zr: '1.0', fases: [{ n: 'Inicial', d: '25', kc: '0.30' }, { n: 'Desenvolvimento', d: '40', kc: '' }, { n: 'Intermédia', d: '45', kc: '1.20' }, { n: 'Final', d: '30', kc: '0.60' }] },
  Tomate: { zr: '0.7', fases: [{ n: 'Inicial', d: '30', kc: '0.60' }, { n: 'Desenvolvimento', d: '40', kc: '' }, { n: 'Intermédia', d: '45', kc: '1.15' }, { n: 'Final', d: '30', kc: '0.80' }] },
  Batata: { zr: '0.5', fases: [{ n: 'Inicial', d: '25', kc: '0.50' }, { n: 'Desenvolvimento', d: '30', kc: '' }, { n: 'Intermédia', d: '45', kc: '1.15' }, { n: 'Final', d: '30', kc: '0.75' }] },
  Luzerna: { zr: '1.2', fases: [{ n: 'Inicial', d: '10', kc: '0.40' }, { n: 'Desenvolvimento', d: '20', kc: '' }, { n: 'Intermédia', d: '20', kc: '1.20' }, { n: 'Final', d: '10', kc: '1.15' }] },
  Trigo: { zr: '1.0', fases: [{ n: 'Inicial', d: '20', kc: '0.40' }, { n: 'Desenvolvimento', d: '30', kc: '' }, { n: 'Intermédia', d: '40', kc: '1.15' }, { n: 'Final', d: '30', kc: '0.35' }] },
  Girassol: { zr: '0.9', fases: [{ n: 'Inicial', d: '25', kc: '0.35' }, { n: 'Desenvolvimento', d: '35', kc: '' }, { n: 'Intermédia', d: '45', kc: '1.15' }, { n: 'Final', d: '25', kc: '0.35' }] },
  Personalizada: { zr: '0.6', fases: [{ n: 'Inicial', d: '20', kc: '0.40' }, { n: 'Desenvolvimento', d: '30', kc: '' }, { n: 'Intermédia', d: '40', kc: '1.00' }, { n: 'Final', d: '20', kc: '0.60' }] },
}

/** Água disponível típica (mm/m) — indicativa, a confirmar com análise do solo. */
export const AWC_TIPICO: Record<string, number> = { Arenoso: 80, Franco: 150, Argiloso: 180 }

export function agroPadrao(): Agro {
  const c = CULTURAS.Milho
  return {
    crop: 'Milho', variety: '', plantDate: '', fase: 2, et0: '7', et0m: '', pe: '0', zr: c.zr, awc: '', p: '0.5', ef: '85',
    fases: c.fases.map((f) => ({ ...f })),
  }
}

/** Kc ao longo do ciclo (um valor por dia). Desenvolvimento e final interpolam linearmente. */
export function curvaKc(fases: FaseCultura[]): number[] {
  const d = fases.map((f) => Math.max(0, Math.round(num(f.d) ?? 0)))
  const kIni = num(fases[0].kc) ?? 0, kMid = num(fases[2].kc) ?? 0, kEnd = num(fases[3].kc) ?? 0
  const out: number[] = []
  for (let i = 0; i < d[0]; i++) out.push(kIni)
  for (let i = 0; i < d[1]; i++) out.push(kIni + ((kMid - kIni) * (i + 1)) / (d[1] + 1))
  for (let i = 0; i < d[2]; i++) out.push(kMid)
  for (let i = 0; i < d[3]; i++) out.push(kMid + ((kEnd - kMid) * (i + 1)) / d[3])
  return out
}

/** Kc representativo de uma fase (desenvolvimento e final: média dos extremos). */
export function kcFase(fases: FaseCultura[], i: number): number | null {
  const kIni = num(fases[0].kc), kMid = num(fases[2].kc), kEnd = num(fases[3].kc)
  if (i === 0) return kIni
  if (i === 2) return kMid
  if (i === 1) return kIni !== null && kMid !== null ? (kIni + kMid) / 2 : null
  return kMid !== null && kEnd !== null ? (kMid + kEnd) / 2 : null
}

export interface ResAgro {
  kc: number | null; etc: number | null; nliq: number | null; nbruta: number | null
  semanal: number | null; m3dia: number | null; m3semana: number | null
  sazMm: number | null; sazM3: number | null; ciclo: number
  taw: number | null; raw: number | null; intervalo: number | null
  curva: number[]
}

export function calcAgro(a: Agro, areaHa: number, awcSolo: number | null): ResAgro {
  const et0 = num(a.et0), pe = num(a.pe) ?? 0, ef = (num(a.ef) ?? 0) / 100
  const kc = kcFase(a.fases, a.fase)
  const etc = et0 !== null && kc !== null ? et0 * kc : null
  const nliq = etc !== null ? Math.max(0, etc - pe) : null
  const nbruta = nliq !== null && ef > 0 ? nliq / ef : null
  const curva = curvaKc(a.fases)
  const et0m = num(a.et0m) ?? et0
  let sazMm: number | null = null
  if (et0m !== null && ef > 0 && curva.length) sazMm = curva.reduce((s, k) => s + Math.max(0, et0m * k - pe), 0) / ef
  const zr = num(a.zr), p = num(a.p)
  const awc = num(a.awc) ?? awcSolo
  const taw = awc !== null && zr !== null ? awc * zr : null
  const raw = taw !== null && p !== null ? taw * p : null
  const intervalo = raw !== null && etc !== null && etc > 0 ? raw / etc : null
  const m = (mm: number | null) => (mm === null ? null : mm * areaHa * 10)
  return {
    kc, etc, nliq, nbruta, semanal: nbruta !== null ? nbruta * 7 : null,
    m3dia: m(nbruta), m3semana: nbruta !== null ? m(nbruta * 7) : null,
    sazMm, sazM3: m(sazMm), ciclo: curva.length, taw, raw, intervalo, curva,
  }
}
