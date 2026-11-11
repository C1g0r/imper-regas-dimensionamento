import { useMemo } from 'react'
import { Download } from 'lucide-react'
import type { Plano, Projeto } from '../engine/types'
import { fmt, num, type Alerta } from '../engine/geometry'
import { simularPlano } from '../engine/plan'
import { Alertas, Card, Field, Kpi, Select } from '../components/campos'
import { GraficoRega } from '../components/GraficoRega'
import { Button } from '@/components/ui/button'

const dataPT = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—')

export function csvRegas(p: Projeto): string {
  const s = simularPlano(p)
  const l = ['Rega;Dia do ciclo;Data;Fase;Esgotamento (mm);Dotação líquida (mm);Dotação bruta (mm);Volume (m3);Horas;Velocidade (%);Energia (kWh);Custo (EUR)']
  const n = (v: number | null, d = 1) => (v === null ? '' : v.toFixed(d).replace('.', ','))
  s.regas.forEach((r, i) => l.push([i + 1, r.dia, dataPT(r.data), r.fase, n(r.dr), n(r.liq), n(r.bruta), n(r.m3, 0), n(r.horas), n(r.vel, 0), n(r.kwh, 0), n(r.custo, 2)].join(';')))
  return '﻿' + l.join('\r\n')
}

export function Planeamento({ projeto: p, editar }: { projeto: Projeto; editar: (patch: Partial<Projeto>) => void }) {
  const pl = p.plan
  const s = useMemo(() => simularPlano(p), [p])
  const set = (patch: Partial<Plano>) => editar({ plan: { ...pl, ...patch } })
  const al: Alerta[] = []
  if (!s.ok) al.push({ nivel: 'i', texto: `Informação em falta: ${s.falta.join(', ')}.` })
  else {
    if (s.regas.length === 0) al.push({ nivel: 'i', texto: 'Nenhuma rega necessária no ciclo com os parâmetros atuais (a precipitação efetiva cobre a necessidade ou o gatilho nunca é atingido).' })
    if (s.dotMedia !== null && s.dotMinPivot !== null && s.dotMedia < s.dotMinPivot) al.push({ nivel: 'w', texto: `A dotação média (${fmt(s.dotMedia, 1)} mm) é inferior à dotação mínima do pivot a 100 % de velocidade (${fmt(s.dotMinPivot, 1)} mm): o pivot não consegue aplicar tão pouco por volta; aumente o gatilho ou o intervalo.` })
    const dispo = s.dias.length * (num(p.hid.horas) ?? 24)
    if (s.totalHoras > dispo) al.push({ nivel: 'b', texto: `O plano exige ${fmt(s.totalHoras, 0)} h de funcionamento, mais do que as ${fmt(dispo, 0)} h disponíveis no ciclo (${p.hid.horas} h/dia): o caudal não chega. Aumente o caudal ou as horas por dia.` })
    else if (s.totalHoras > 0.9 * dispo) al.push({ nivel: 'w', texto: `O plano usa ${fmt((s.totalHoras / dispo) * 100, 0)} % das horas disponíveis: sem folga para avarias ou dias de vento.` })
    if (pl.modo === 'fixo' && s.intervaloMedio !== null && p.agro.fases && s.raw !== null && s.regas.some((r) => r.dr > s.raw! * 1.0001)) al.push({ nivel: 'w', texto: 'Com o intervalo fixo escolhido o esgotamento ultrapassa a RAW: a cultura sofre algum stress hídrico entre regas. Reduza o intervalo.' })
    if (s.diasStress > 0) al.push({ nivel: 'b', texto: `Em ${s.diasStress} dia(s) o esgotamento atingiu a reserva total (TAW): ${fmt(s.stressMm, 0)} mm de défice acumulado. A rega é insuficiente.` })
    if (!al.some((x) => x.nivel === 'b' || x.nivel === 'w')) al.push({ nivel: 'ok', texto: 'Plano de rega coerente: sem stress hídrico previsto e dotações compatíveis com o pivot. Simulação simplificada (ET0 e precipitação constantes).' })
  }
  const datas = !!s.regas[0]?.data
  const exportar = () => {
    const blob = new Blob([csvRegas(p)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `plano-rega-${p.name.replace(/[^\w-]+/g, '_')}.csv`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  return (
    <>
      <Card>
        <h1 className="mb-1 text-2xl font-bold text-navy">Planeamento da rega</h1>
        <p className="mb-3.5 text-mut">Dotações, calendário e funcionamento do pivot · Projeto: <b>{p.name}</b></p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Regas no ciclo" value={s.ok ? String(s.regas.length) : '—'} />
          <Kpi label="Dotação média bruta" value={fmt(s.dotMedia, 1)} unit="mm" />
          <Kpi label="Volume total" value={s.ok ? fmt(s.totalM3, 0) : '—'} unit="m³" />
          <Kpi label="Custo de energia" value={s.totalCusto !== null ? fmt(s.totalCusto, 0) : '—'} unit="€" />
        </div>
      </Card>
      <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="min-w-0">
          <Card title="Estratégia de rega">
            <div className="grid gap-3">
              <Select label="Critério" value={pl.modo === 'raw' ? 'Por esgotamento do solo (RAW)' : 'Intervalo fixo'} options={['Por esgotamento do solo (RAW)', 'Intervalo fixo']} onChange={(v) => set({ modo: v.startsWith('Intervalo') ? 'fixo' : 'raw' })} />
              {pl.modo === 'raw'
                ? <Field label="Gatilho (% da RAW)" type="number" value={pl.gatilho} onChange={(v) => set({ gatilho: v })} />
                : <Field label="Intervalo entre regas (dias)" type="number" value={pl.intervalo} onChange={(v) => set({ intervalo: v })} />}
              <Field label="Dotação bruta máxima (mm)" type="number" value={pl.dotMax} placeholder="sem limite" onChange={(v) => set({ dotMax: v })} />
              <Field label="Data de início (opcional, para o calendário)" type="date" value={pl.inicio || p.agro.plantDate} onChange={(v) => set({ inicio: v })} />
              <Field label="Esgotamento inicial (mm)" type="number" value={pl.dr0} onChange={(v) => set({ dr0: v })} />
              <Field label="Horas por volta a 100 % de velocidade" type="number" value={pl.tvolta} onChange={(v) => set({ tvolta: v })} />
            </div>
            <p className="mt-2 text-[.8rem] text-mut">RAW {fmt(s.raw, 0)} mm · TAW {fmt(s.taw, 0)} mm (módulo 04). Dotação mínima do pivot a 100 %: {fmt(s.dotMinPivot, 1)} mm.</p>
          </Card>
          <Card title="Resumo do ciclo">
            <table className="w-full text-sm"><tbody>
              {([
                ['Horas totais de funcionamento', s.ok ? `${fmt(s.totalHoras, 0)} h` : '—'],
                ['Intervalo médio entre regas', s.intervaloMedio !== null ? `${fmt(s.intervaloMedio, 1)} dias` : '—'],
                ['Energia elétrica', s.totalKwh !== null ? `${fmt(s.totalKwh, 0)} kWh` : '—'],
                ['Dias com stress hídrico', s.ok ? String(s.diasStress) : '—'],
              ] as [string, string][]).map((x) => <tr key={x[0]}><td>{x[0]}</td><td className="text-right"><b>{x[1]}</b></td></tr>)}
            </tbody></table>
          </Card>
          <Card title="Alertas e validações"><Alertas lista={al} /></Card>
        </div>
        <div className="min-w-0">
          {s.ok && s.raw !== null && s.taw !== null && <Card title="Esgotamento do solo e dias de rega"><GraficoRega dias={s.dias} raw={s.raw} taw={s.taw} /></Card>}
          <Card>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-navy">Calendário de regas</h2>
              <Button size="sm" variant="outline" className="print:hidden" onClick={exportar} disabled={!s.regas.length}><Download size={13} />Exportar CSV</Button>
            </div>
            {s.regas.length ? (
              <div className="max-h-[520px] overflow-auto print:max-h-none">
                <table className="w-full text-sm">
                  <thead><tr><th>#</th>{datas && <th>Data</th>}<th>Dia</th><th>Fase</th><th className="text-right">Bruta (mm)</th><th className="text-right">m³</th><th className="text-right">Horas</th><th className="text-right">Veloc.</th></tr></thead>
                  <tbody>
                    {s.regas.map((r, i) => (
                      <tr key={i}><td>{i + 1}</td>{datas && <td>{dataPT(r.data)}</td>}<td>{r.dia}</td><td>{r.fase}</td>
                        <td className="text-right">{fmt(r.bruta, 1)}</td><td className="text-right">{fmt(r.m3, 0)}</td>
                        <td className="text-right">{fmt(r.horas, 1)}</td>
                        <td className="text-right">{r.vel !== null ? `${fmt(r.vel, 0)} %` : '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-mut">Sem regas para mostrar.</p>}
            <p className="mt-2 text-[.8rem] text-mut">Balanço diário simplificado: esgotamento += ETc − Pe; rega repõe o esgotamento até à capacidade de campo. Horas = volume ÷ caudal do sistema. Velocidade = horas por volta a 100 % ÷ horas necessárias (limitada a 100 %).{num(p.hid.qman) ? ' Caudal manual do módulo 05 em uso.' : ''}</p>
          </Card>
        </div>
      </div>
    </>
  )
}
