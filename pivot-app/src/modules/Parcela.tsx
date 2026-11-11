import type { Parcela as TParcela, Projeto } from '../engine/types'
import { alertasParcela, fmt, num } from '../engine/geometry'
import { Alertas, Card, Field, Select } from '../components/campos'
import { Button } from '@/components/ui/button'

export function Parcela({ projeto: p, editar }: { projeto: Projeto; editar: (patch: Partial<Projeto>) => void }) {
  const a = p.par
  const set = (k: keyof TParcela, v: string) => editar({ par: { ...a, [k]: v } })
  const l = num(a.len), w = num(a.wid), la = num(a.lat), lo = num(a.lon)
  const estimar = () => {
    const m = Math.max(l ?? 0, w ?? 0), dz = (num(a.zmax) ?? 0) - (num(a.zmin) ?? 0)
    if (!m || dz < 0) { window.alert('Indique o comprimento e as cotas.'); return }
    set('slope', ((dz / m) * 100).toFixed(2))
  }
  return (
    <>
      <Card>
        <h1 className="mb-1 text-2xl font-bold text-navy">Caracterização da parcela</h1>
        <p className="mb-3.5 text-mut">Terreno e solo onde será instalado o pivot · Projeto: <b>{p.name}</b></p>
        <h3 className="mb-2 mt-3 text-[.95rem] font-bold text-navy">Dimensões e relevo</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Comprimento (m)" type="number" value={a.len} onChange={(v) => set('len', v)} />
          <Field label="Largura (m)" type="number" value={a.wid} onChange={(v) => set('wid', v)} />
          <Field label="Área" value={l && w ? `${fmt((l * w) / 10000, 2)} ha` : ''} readOnly placeholder="calculada" onChange={() => {}} />
          <Field label="Cota mínima (m)" type="number" value={a.zmin} onChange={(v) => set('zmin', v)} />
          <Field label="Cota máxima (m)" type="number" value={a.zmax} onChange={(v) => set('zmax', v)} />
          <Field label="Declive (%)" type="number" value={a.slope} onChange={(v) => set('slope', v)} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={estimar}>Estimar declive a partir das cotas e do comprimento</Button>
          <span className="text-[.8rem] text-mut">Aproximação: (cota máx. − cota mín.) ÷ maior dimensão.</span>
        </div>
        <h3 className="mb-2 mt-4 text-[.95rem] font-bold text-navy">Solo e água</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Tipo de solo" value={a.soil} options={['Arenoso', 'Franco', 'Argiloso']} onChange={(v) => set('soil', v)} />
          <Field label="Infiltração (mm/h)" type="number" value={a.inf} onChange={(v) => set('inf', v)} />
          <Field label="Capacidade de retenção (mm)" type="number" value={a.ret} onChange={(v) => set('ret', v)} />
        </div>
        <h3 className="mb-2 mt-4 text-[.95rem] font-bold text-navy">Localização</h3>
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Latitude (°)" type="number" value={a.lat} onChange={(v) => set('lat', v)} />
          <Field label="Longitude (°)" type="number" value={a.lon} onChange={(v) => set('lon', v)} />
          {la !== null && lo !== null
            ? <Button asChild variant="outline" size="sm" className="w-fit"><a target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${la},${lo}&t=k`}>Ver no mapa</a></Button>
            : <span className="text-[.8rem] text-mut">Indique latitude e longitude para ver no mapa.</span>}
        </div>
        <div className="mt-3.5"><Alertas lista={alertasParcela(a, p.areaTot)} /></div>
      </Card>
      <Card title="Próximas fases">
        <p className="text-[.8rem] text-mut">Importação de KML/GeoJSON, obstáculos e zonas não irrigáveis serão acrescentados numa fase posterior. O módulo 03 já mostra a parcela (comprimento × largura) no desenho do pivot.</p>
      </Card>
    </>
  )
}
