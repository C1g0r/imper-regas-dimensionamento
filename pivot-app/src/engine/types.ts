export interface Parcela {
  len: string; wid: string; zmin: string; zmax: string; slope: string
  soil: string; inf: string; ret: string; lat: string; lon: string
}
export interface Geo {
  spans: (number | string)[]
  lb: number | string
  gun: boolean
  G: number | string
  theta: number | string
  start: number | string
  ox: number | string
  oy: number | string
}
export interface FaseCultura { n: string; d: string; kc: string }
export interface Agro {
  crop: string; variety: string; plantDate: string
  fase: number            // índice da fase usada no dimensionamento (0..3)
  et0: string             // ET0 de projeto (mm/dia)
  et0m: string            // ET0 média do ciclo (mm/dia); vazio = igual a et0
  pe: string              // precipitação efetiva (mm/dia)
  zr: string              // profundidade radicular (m)
  awc: string             // água disponível no solo (mm/m)
  p: string               // fração de esgotamento permitida (0–1)
  ef: string              // eficiência de aplicação (%)
  fases: FaseCultura[]
}
export type Material = 'PEAD PN10' | 'PEAD PN16' | 'Aço' | 'Personalizado'
export type TipoTroco = 'asp' | 'prin' | 'dist' | 'pivot'
export interface Troco {
  id: string; name: string; kind: TipoTroco; mat: Material
  dn: string; idc: string; L: string; dz: string; k: string; nOut: string
  prices: Record<string, string>
}
export interface Hid {
  horas: string; pc: string; pdisp: string; qman: string
  method: 'DW' | 'HW'
  segs: Troco[]
}
export interface ModeloEmissor {
  id: string; tipo: string; fab: string; modelo: string; bocal: string
  p: string      // pressão de referência / funcionamento (bar)
  q: string      // caudal à pressão de referência (L/h)
  wd: string     // diâmetro molhado (m)
  s: string      // espaçamento (m)
  h: string      // altura de instalação (m)
  reg: string    // pressão do regulador (bar), vazio = sem regulador
}
export interface Emit extends Omit<ModeloEmissor, 'id'> { libId: string; Qg: string /* caudal do canhão (m³/h) */ }
export interface PontoBomba { q: string; h: string; eta: string }
export interface ModeloBomba { id: string; fab: string; modelo: string; tipo: string; motorKw: string; pontos: PontoBomba[] }
export interface Biblioteca { emit: ModeloEmissor[]; bombas: ModeloBomba[] }
export interface Bomb {
  cotaCapt: string; cotaPivot: string; nivDin: string
  margemH: string   // margem de segurança na HMT (%)
  etaB: string; etaM: string; margemM: string
  tarifa: string    // €/kWh
  bombaSel: string
}
export interface Plano {
  modo: 'raw' | 'fixo'
  inicio: string      // data de início da simulação (vazio = data de sementeira)
  intervalo: string   // dias entre regas (modo fixo)
  gatilho: string     // % da RAW que dispara a rega (modo RAW)
  dotMax: string      // dotação bruta máxima por rega (mm); vazio = sem limite
  dr0: string         // esgotamento inicial (mm)
  tvolta: string      // horas por volta completa a 100 % de velocidade
}
export interface Cenario { id: string; nome: string; et0: string; pe: string; kc: string; ef: string; horas: string }
export interface Sim { cen: Cenario[] }
export interface Projeto {
  id: string; name: string; client: string; loc: string; parcel: string
  areaTot: string; crop: string; water: string; tech: string
  created: string; arch: number
  par: Parcela
  geo: Geo
  agro: Agro
  hid: Hid
  emit: Emit
  bomb: Bomb
  plan: Plano
  sim: Sim
}
export interface Estado { list: Projeto[]; cur: string; mod: string }
