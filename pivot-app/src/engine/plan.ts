// Planeamento da rega (balanço hídrico diário simplificado, tipo FAO-56) e cenários.
import type { Cenario, Plano, Projeto, Sim } from './types'
import { contexto } from './contexto'
import { num } from './geometry'

const rid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

export function planPadrao(): Plano {
  return { modo: 'raw', inicio: '', intervalo: '3', gatilho: '50', dotMax: '25', dr0: '0', tvolta: '20' }
}

export function cenarioNovo(nome = 'Novo cenário', o: Partial<Cenario> = {}): Cenario {
  return { id: rid(), nome, et0: '100', pe: '100', kc: '100', ef: '', horas: '', ...o }
}

export function simPadrao(): Sim {
  return { cen: [cenarioNovo('Base'), cenarioNovo('Ano seco (ET0 +20 %)', { et0: '120' }), cenarioNovo('Eficiência baixa (75 %)', { ef: '75' }), cenarioNovo('Menos horas de rega (16 h)', { horas: '16' })] }
}

export interface Rega {
  dia: number; data: string | null; fase: string
  dr: number; liq: number; bruta: number; m3: number
  horas: number; vel: number | null; kwh: number | null; custo: number | null
}
export interface DiaSim { dia: number; kc: number; etc: number; dr: number; rega: boolean }
export interface ResPlano {
  ok: boolean; falta: string[]
  dias: DiaSim[]; regas: Rega[]
  raw: number | null; taw: number | null
  totalM3: number; totalHoras: number; totalBruta: number; totalKwh: number | null; totalCusto: number | null
  intervaloMedio: number | null; dotMedia: number | null; dotMinPivot: number | null
  diasStress: number; stressMm: number
}

function somaDias(iso: string, n: number): string | null {
  const d = new Date(iso + 'T12:00:00Z')
  if (Number.isNaN(d.getTime())) return null
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function faseDoDia(p: Projeto, dia: number): string {
  let acc = 0
  for (const f of p.agro.fases) { acc += Math.max(0, Math.round(num(f.d) ?? 0)); if (dia <= acc) return f.n }
  return p.agro.fases[p.agro.fases.length - 1].n
}

/** Simula o ciclo dia a dia. A rega repõe o esgotamento até à capacidade de campo (limitada por dotMax). */
export function simularPlano(p: Projeto): ResPlano {
  const c = contexto(p)
  const a = p.agro, pl = p.plan
  const falta: string[] = []
  const et0 = num(a.et0m) ?? num(a.et0)
  const pe = num(a.pe) ?? 0
  const ef = (num(a.ef) ?? 0) / 100
  if (et0 === null) falta.push('ET0 (módulo 04)')
  if (!(ef > 0)) falta.push('eficiência (módulo 04)')
  if (!(c.geo.As > 0)) falta.push('área irrigada (módulo 03)')
  if (c.agro.raw === null || c.agro.taw === null) falta.push('reserva de água do solo (módulos 02/04)')
  if (c.Q === null || !(c.Q > 0)) falta.push('caudal (módulos 04/05)')
  const curva = c.agro.curva
  const vazio: ResPlano = { ok: false, falta, dias: [], regas: [], raw: c.agro.raw, taw: c.agro.taw, totalM3: 0, totalHoras: 0, totalBruta: 0, totalKwh: null, totalCusto: null, intervaloMedio: null, dotMedia: null, dotMinPivot: null, diasStress: 0, stressMm: 0 }
  if (falta.length || et0 === null || c.agro.raw === null || c.agro.taw === null || !c.Q || !curva.length) return vazio
  const raw = c.agro.raw, taw = c.agro.taw
  const gat = Math.min(1, Math.max(0.1, (num(pl.gatilho) ?? 100) / 100)) * raw
  const dotMax = num(pl.dotMax)
  const interv = Math.max(1, Math.round(num(pl.intervalo) ?? 3))
  const tv = num(pl.tvolta)
  const inicio = pl.inicio || a.plantDate || ''
  let dr = Math.min(taw, Math.max(0, num(pl.dr0) ?? 0))
  let ultimo = 0
  const dias: DiaSim[] = [], regas: Rega[] = []
  let diasStress = 0, stressMm = 0
  curva.forEach((kc, i) => {
    const dia = i + 1
    const etc = et0 * kc
    dr += Math.max(0, etc - pe)
    if (dr > taw) { diasStress++; stressMm += dr - taw; dr = taw }
    const dispara = pl.modo === 'raw' ? dr >= gat : dia - ultimo >= interv && dr > 0
    let rega = false
    if (dispara) {
      let liq = dr
      let bruta = liq / ef
      if (dotMax !== null && dotMax > 0 && bruta > dotMax) { bruta = dotMax; liq = bruta * ef }
      const m3 = bruta * c.geo.As * 10
      const horas = m3 / (c.Q as number)
      const kwh = c.kwhM3 !== null ? c.kwhM3 * m3 : null
      regas.push({
        dia, data: inicio ? somaDias(inicio, i) : null, fase: faseDoDia(p, dia), dr, liq, bruta, m3, horas,
        vel: tv && horas > 0 ? Math.min(100, (tv / horas) * 100) : null,
        kwh, custo: kwh !== null && c.tarifa !== null ? kwh * c.tarifa : null,
      })
      dr -= liq
      ultimo = dia
      rega = true
    }
    dias.push({ dia, kc, etc, dr, rega })
  })
  const n = regas.length
  const soma = (f: (r: Rega) => number | null) => regas.reduce((s, r) => s + (f(r) ?? 0), 0)
  return {
    ok: true, falta: [], dias, regas, raw, taw,
    totalM3: soma((r) => r.m3), totalHoras: soma((r) => r.horas), totalBruta: soma((r) => r.bruta),
    totalKwh: c.kwhM3 !== null ? soma((r) => r.kwh) : null,
    totalCusto: c.kwhM3 !== null && c.tarifa !== null ? soma((r) => r.custo) : null,
    intervaloMedio: n > 1 ? (regas[n - 1].dia - regas[0].dia) / (n - 1) : null,
    dotMedia: n ? soma((r) => r.bruta) / n : null,
    dotMinPivot: tv && tv > 0 ? (tv * c.Q) / (c.geo.As * 10) : null,
    diasStress, stressMm,
  }
}

/** Projeto modificado segundo um cenário (factores em %, ef e horas absolutos). O caudal manual é ignorado. */
export function aplicarCenario(p: Projeto, c: Cenario): Projeto {
  const f = (v: string) => (num(v) ?? 100) / 100
  const mul = (v: string, k: number) => { const n = num(v); return n === null ? v : String(n * k) }
  const q: Projeto = JSON.parse(JSON.stringify(p))
  q.agro.et0 = mul(q.agro.et0, f(c.et0))
  q.agro.et0m = mul(q.agro.et0m, f(c.et0))
  q.agro.pe = mul(q.agro.pe, f(c.pe))
  q.agro.fases = q.agro.fases.map((x) => ({ ...x, kc: mul(x.kc, f(c.kc)) }))
  if (num(c.ef) !== null) q.agro.ef = c.ef
  if (num(c.horas) !== null) q.hid.horas = c.horas
  q.hid.qman = ''
  return q
}

export interface ResCenario {
  c: Cenario; ok: boolean
  nbruta: number | null; Q: number | null; hmt: number | null; Pel: number | null; motor: number | null
  kwhM3: number | null; regas: number; m3: number; kwh: number | null; custo: number | null
  qRatio: number | null   // Q necessário ÷ Q instalado (%)
  intervaloMax: number | null
}

export function calcCenarios(p: Projeto): { lista: ResCenario[]; qInst: number | null } {
  const m = num(p.hid.qman)
  const qInst = m !== null && m > 0 ? m : contexto(p).Q
  const lista = p.sim.cen.map((c) => {
    const q = aplicarCenario(p, c)
    const x = contexto(q), s = simularPlano(q)
    const r: ResCenario = {
      c, ok: s.ok, nbruta: x.agro.nbruta, Q: x.Q, hmt: x.Q ? x.hmt.total : null, Pel: x.pot?.Pel ?? null, motor: x.pot?.motor ?? null,
      kwhM3: x.kwhM3, regas: s.regas.length, m3: s.totalM3, kwh: s.totalKwh, custo: s.totalCusto,
      qRatio: x.Q !== null && qInst ? (x.Q / qInst) * 100 : null,
      intervaloMax: x.agro.intervalo,
    }
    return r
  })
  return { lista, qInst }
}

/** Sensibilidade do caudal e da energia sazonal a variações de ±20 % em cada parâmetro. */
export function sensibilidade(p: Projeto) {
  const base = contexto({ ...p, hid: { ...p.hid, qman: '' } })
  const baseQ = base.Q
  const baseKwh = base.kwhM3 !== null && base.agro.sazM3 !== null ? base.kwhM3 * base.agro.sazM3 : null
  const vars: { nome: string; mod: (v: number) => Cenario }[] = [
    { nome: 'ET0', mod: (v) => cenarioNovo('', { et0: String(v) }) },
    { nome: 'Kc', mod: (v) => cenarioNovo('', { kc: String(v) }) },
    { nome: 'Precipitação efetiva', mod: (v) => cenarioNovo('', { pe: String(v) }) },
    { nome: 'Eficiência', mod: (v) => cenarioNovo('', { ef: String((num(p.agro.ef) ?? 0) * (v / 100)) }) },
    { nome: 'Horas por dia', mod: (v) => cenarioNovo('', { horas: String((num(p.hid.horas) ?? 0) * (v / 100)) }) },
  ]
  return vars.map((v) => {
    const r = [80, 120].map((k) => {
      const x = contexto(aplicarCenario(p, v.mod(k)))
      const kwh = x.kwhM3 !== null && x.agro.sazM3 !== null ? x.kwhM3 * x.agro.sazM3 : null
      return {
        dQ: x.Q !== null && baseQ ? ((x.Q - baseQ) / baseQ) * 100 : null,
        dE: kwh !== null && baseKwh ? ((kwh - baseKwh) / baseKwh) * 100 : null,
      }
    })
    return { nome: v.nome, menos: r[0], mais: r[1] }
  })
}
