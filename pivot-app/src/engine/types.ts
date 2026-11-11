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
export interface Projeto {
  id: string; name: string; client: string; loc: string; parcel: string
  areaTot: string; crop: string; water: string; tech: string
  created: string; arch: number
  par: Parcela
  geo: Geo
}
export interface Estado { list: Projeto[]; cur: string; mod: string }
