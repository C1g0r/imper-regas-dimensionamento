// Motor de emissores — distribuição de caudal e pressão ao longo do pivot.
import type { Emit, ModeloEmissor } from './types'
import { num } from './geometry'
import { BAR_M, fatorAtrito } from './hydraulic'

export const TIPOS_EMISSOR = ['MESA', 'LESA', 'LEPA', 'Spray', 'Aspersor de impacto']

export function emitPadrao(): Emit {
  return { libId: '', tipo: 'MESA', fab: '', modelo: '', bocal: '', p: '1.4', q: '', wd: '', s: '2.5', h: '2.5', reg: '', Qg: '0' }
}

export function modeloVazio(): Omit<ModeloEmissor, 'id'> {
  return { tipo: 'MESA', fab: '', modelo: '', bocal: '', p: '1.4', q: '', wd: '', s: '2.5', h: '2.5', reg: '' }
}

export interface PontoEmissor {
  i: number; r: number
  qDes: number       // caudal de projeto do emissor (L/h)
  acum: number       // caudal acumulado desde a ponta até este ponto (m³/h)
  hf: number         // perda de carga acumulada desde o centro (m)
  pBar: number       // pressão disponível no emissor (bar)
  pOp: number        // pressão de funcionamento (bar) — regulador ou disponível
  qCat: number | null // caudal de catálogo necessário à pressão de referência (L/h)
  qAct: number | null // caudal real com o catálogo nominal (L/h), se indicado
}
export interface ResEmit {
  ok: boolean; N: number
  pontos: PontoEmissor[]
  qMin: number; qMax: number; pMin: number; pMax: number; varP: number
  qTotalEmit: number; imax: number | null; incompleto: string[]
  alertas: { nivel: 'ok' | 'i' | 'w' | 'b'; texto: string }[]
}

/**
 * L: comprimento com emissores (m); Qtot: caudal total (m³/h); D: diâmetro interno da conduta (m);
 * pcM: pressão no centro (m c.a.); eps: rugosidade (mm).
 */
export function calcEmit(e: Emit, L: number, Qtot: number | null, D: number | null, pcM: number, eps: number, inf: number | null): ResEmit {
  const falta: string[] = []
  const s = num(e.s), pref = num(e.p), qref = num(e.q), wd = num(e.wd), reg = num(e.reg)
  const Qg = Math.max(0, num(e.Qg) ?? 0)
  if (!s || s <= 0) falta.push('espaçamento')
  if (!(L > 0)) falta.push('comprimento do pivot (módulo 03)')
  if (Qtot === null || Qtot <= 0) falta.push('caudal (módulos 04/05)')
  if (D === null) falta.push('diâmetro da conduta do pivot (módulo 05)')
  if (!pref || pref <= 0) falta.push('pressão de referência do emissor')
  const vazio: ResEmit = { ok: false, N: 0, pontos: [], qMin: 0, qMax: 0, pMin: 0, pMax: 0, varP: 0, qTotalEmit: 0, imax: null, incompleto: falta, alertas: [] }
  if (falta.length || !s || !pref || Qtot === null || D === null) {
    vazio.alertas = [{ nivel: 'i', texto: `Informação em falta: ${falta.join(', ')}.` }]
    return vazio
  }
  const N = Math.floor(L / s)
  if (N < 1) { vazio.alertas = [{ nivel: 'b', texto: 'O espaçamento é maior do que o comprimento do pivot.' }]; return vazio }
  const Qe = Math.max(0, Qtot - Qg)
  const r = Array.from({ length: N }, (_, k) => L - (N - 1 - k) * s)
  const sw = r.reduce((a, b) => a + b, 0)
  const q = r.map((ri) => (Qe * 1000 * ri) / sw)            // L/h
  // caudal em cada troço entre emissores (do centro para a ponta)
  const flowAfter: number[] = new Array(N)
  let acc = Qg
  for (let k = N - 1; k >= 0; k--) { acc += q[k] / 1000; flowAfter[k] = acc }
  const A = (Math.PI * D * D) / 4
  let hf = 0
  const pontos: PontoEmissor[] = []
  let prev = 0
  for (let k = 0; k < N; k++) {
    const len = r[k] - prev
    const V = flowAfter[k] / 3600 / A
    const Re = (V * D) / 1.004e-6
    const f = V > 0 ? fatorAtrito(D, eps, Re) : 0
    hf += f * (len / D) * ((V * V) / (2 * 9.81))
    prev = r[k]
    const pAv = Math.max(0, pcM - hf)
    const pBar = pAv / BAR_M
    const pOp = reg && reg > 0 ? (pBar >= reg ? reg : pBar) : pBar
    const qCat = pOp > 0 ? q[k] * Math.sqrt(pref / pOp) : null
    const qAct = qref ? qref * Math.sqrt(pOp / pref) : null
    pontos.push({ i: k + 1, r: r[k], qDes: q[k], acum: flowAfter[k], hf, pBar, pOp, qCat, qAct })
  }
  const ps = pontos.map((x) => x.pBar)
  const pMin = Math.min(...ps), pMax = Math.max(...ps)
  const varP = pMax > 0 ? ((pMax - pMin) / pMax) * 100 : 0
  const qTip = q[N - 1]
  const imax = wd && wd > 0 ? (4 / Math.PI) * (qTip / ((Math.PI / 4) * wd * wd)) : null
  const al: ResEmit['alertas'] = []
  if (pMin <= 0) al.push({ nivel: 'b', texto: 'A pressão chega a zero na ponta: a conduta ou a pressão no centro são insuficientes.' })
  else if (pMin < 0.7) al.push({ nivel: 'w', texto: `Pressão mínima de ${pMin.toFixed(2).replace('.', ',')} bar nos emissores: baixa para um bom funcionamento.` })
  if (reg && reg > 0 && pMin < reg) al.push({ nivel: 'b', texto: `Há emissores com pressão disponível (${pMin.toFixed(2).replace('.', ',')} bar) inferior à do regulador (${reg} bar): o regulador não consegue regular.` })
  if (!reg && varP > 20) al.push({ nivel: 'w', texto: `Variação de pressão ao longo do pivot de ${varP.toFixed(0)} %: sem reguladores a uniformidade é afetada (referência: até 20 %).` })
  if (imax !== null && inf !== null) {
    if (imax > inf) al.push({ nivel: 'b', texto: `Taxa de aplicação de pico (${imax.toFixed(0)} mm/h) superior à infiltração do solo (${inf} mm/h): risco de escoamento.` })
    else if (imax > 0.8 * inf) al.push({ nivel: 'w', texto: `Taxa de aplicação de pico (${imax.toFixed(0)} mm/h) acima de 80 % da infiltração (${inf} mm/h).` })
  }
  if (imax === null) al.push({ nivel: 'i', texto: 'Informação em falta: diâmetro molhado do emissor, para calcular a taxa de aplicação de pico.' })
  if (inf === null) al.push({ nivel: 'i', texto: 'Informação em falta: infiltração do solo (módulo 02) para verificar a compatibilidade.' })
  if (Qg > 0) al.push({ nivel: 'i', texto: `O caudal do canhão (${Qg.toString().replace('.', ',')} m³/h) foi retirado ao caudal distribuído pelos emissores.` })
  if (!al.some((a) => a.nivel === 'b' || a.nivel === 'w'))
    al.push({ nivel: 'ok', texto: 'Distribuição de caudal e pressão dentro dos critérios definidos. Valores calculados: confirmar com o catálogo do fabricante.' })
  return { ok: true, N, pontos, qMin: Math.min(...q), qMax: Math.max(...q), pMin, pMax, varP, qTotalEmit: Qe, imax, incompleto: [], alertas: al }
}
