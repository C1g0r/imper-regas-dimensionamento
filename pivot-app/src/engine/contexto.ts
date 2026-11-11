// Cadeia de cálculo partilhada pelos módulos 08–10: geometria → agronomia → hidráulica → bombagem.
import type { Projeto } from './types'
import { AWC_TIPICO, calcAgro, type ResAgro } from './agro'
import { calcGeo, num, type ResGeo } from './geometry'
import { calcHid, caudalSistema, type ResHid } from './hydraulic'
import { calcHmt, calcPotencias, type Hmt, type Potencias } from './pump'

export interface Contexto {
  geo: ResGeo; agro: ResAgro; qAgro: number | null; hid: ResHid
  Q: number | null; perdas: number; hmt: Hmt; pot: Potencias | null
  kwhM3: number | null; tarifa: number | null; horas: number | null
}

export function contexto(p: Projeto): Contexto {
  const geo = calcGeo(p.geo)
  const agro = calcAgro(p.agro, geo.As, AWC_TIPICO[p.par.soil] ?? null)
  const horas = num(p.hid.horas)
  const qAgro = caudalSistema(agro.nbruta, geo.As, horas)
  const hid = calcHid(p.hid, qAgro)
  const Q = hid.Q
  const perdas = hid.somaHf + hid.somaHl
  const hmt = calcHmt(p.bomb, hid.pcM, perdas)
  const pot = Q !== null && Q > 0
    ? calcPotencias(Q, hmt.total, num(p.bomb.etaB) ?? 0, num(p.bomb.etaM) ?? 0, num(p.bomb.margemM) ?? 0)
    : null
  const kwhM3 = pot && Q ? pot.Pel / Q : null
  return { geo, agro, qAgro, hid, Q, perdas, hmt, pot, kwhM3, tarifa: num(p.bomb.tarifa), horas }
}
