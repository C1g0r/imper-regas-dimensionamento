import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Biblioteca, Bomb, ModeloBomba, Projeto } from '../engine/types'
import { AWC_TIPICO, calcAgro } from '../engine/agro'
import { calcGeo, fmt, num, type Alerta } from '../engine/geometry'
import { BAR_M, calcHid, caudalSistema } from '../engine/hydraulic'
import { alturaSistema, calcHmt, motivoSemPonto, calcPotencias, pontoFuncionamento, pontosValidos } from '../engine/pump'
import { Alertas, Card, Field, Kpi } from '../components/ui'
import { Grafico, type Marca, type Serie } from '../components/Grafico'
import { uid } from '../engine/storage'

interface Props {
  projeto: Projeto
  editar: (patch: Partial<Projeto>) => void
  bib: Biblioteca
  setBib: (f: (b: Biblioteca) => Biblioteca) => void
}

const CORES = ['#1677C8', '#1d9a5b', '#8b5cf6', '#e0527a', '#0f9d9d', '#a16207']

export function Bombagem({ projeto: p, editar, bib, setBib }: Props) {
  const b = p.bomb
  const geo = useMemo(() => calcGeo(p.geo), [p.geo])
  const agro = useMemo(() => calcAgro(p.agro, geo.As, AWC_TIPICO[p.par.soil] ?? null), [p.agro, geo.As, p.par.soil])
  const qAgro = caudalSistema(agro.nbruta, geo.As, num(p.hid.horas))
  const hid = useMemo(() => calcHid(p.hid, qAgro), [p.hid, qAgro])
  const Q = hid.Q
  const perdas = hid.somaHf + hid.somaHl
  const hmt = useMemo(() => calcHmt(b, hid.pcM, perdas), [b, hid.pcM, perdas])
  const etaB = num(b.etaB) ?? 0, etaM = num(b.etaM) ?? 0
  const pot = Q !== null && Q > 0 ? calcPotencias(Q, hmt.total, etaB, etaM, num(b.margemM) ?? 0) : null
  const tarifa = num(b.tarifa)
  const horas = num(p.hid.horas)
  const set = (patch: Partial<Bomb>) => editar({ bomb: { ...b, ...patch } })

  const kwhM3 = pot && Q ? pot.Pel / Q : null
  const custoHora = pot && tarifa !== null ? pot.Pel * tarifa : null
  const custoDia = custoHora !== null && horas ? custoHora * horas : null
  const custoHaDia = custoDia !== null && geo.As > 0 ? custoDia / geo.As : null
  const custoSaz = kwhM3 !== null && tarifa !== null && agro.sazM3 !== null ? kwhM3 * agro.sazM3 * tarifa : null
  const kwhSaz = kwhM3 !== null && agro.sazM3 !== null ? kwhM3 * agro.sazM3 : null

  const sel = bib.bombas.find((x) => x.id === b.bombaSel) ?? null
  const setBomba = (id: string, f: (m: ModeloBomba) => ModeloBomba) => setBib((l) => ({ ...l, bombas: l.bombas.map((m) => (m.id === id ? f(m) : m)) }))
  const nova = () => {
    const m: ModeloBomba = { id: uid(), fab: '', modelo: 'Nova bomba', tipo: 'Centrífuga', motorKw: '', pontos: [{ q: '', h: '', eta: '' }, { q: '', h: '', eta: '' }, { q: '', h: '', eta: '' }, { q: '', h: '', eta: '' }] }
    setBib((l) => ({ ...l, bombas: [...l.bombas, m] }))
    set({ bombaSel: m.id })
  }
  const apagar = () => {
    if (!sel || !window.confirm(`Apagar a bomba "${sel.modelo}" da biblioteca?`)) return
    setBib((l) => ({ ...l, bombas: l.bombas.filter((x) => x.id !== sel.id) }))
    set({ bombaSel: '' })
  }

  const est = hmt.estatica + hid.pcM
  const comp = bib.bombas.map((m, i) => {
    const f = Q ? pontoFuncionamento(m, Q, est, hid.somaHf, hid.somaHl, num(b.margemH) ?? 0) : null
    const Pel = f?.Pabs != null && etaM > 0 ? f.Pabs / (etaM / 100) : null
    return { m, f, Pel, cor: CORES[i % CORES.length], dQ: f && Q ? ((f.q - Q) / Q) * 100 : null }
  })
  const series: Serie[] = []
  const marcas: Marca[] = []
  if (Q) {
    const qs = Array.from({ length: 41 }, (_, i) => (Q * 1.6 * i) / 40)
    series.push({ nome: 'Sistema', cor: '#d98a00', tracejado: true, x: qs, y: qs.map((q) => alturaSistema(q, Q, est, hid.somaHf, hid.somaHl, num(b.margemH) ?? 0)) })
    marcas.push({ x: Q, y: hmt.total, cor: '#123B66', nome: 'Projeto' })
  }
  comp.forEach((c) => {
    const pts = pontosValidos(c.m)
    if (pts.length >= 2) series.push({ nome: `${c.m.fab} ${c.m.modelo}`.trim(), cor: c.cor, x: pts.map((x) => x.q), y: pts.map((x) => x.h) })
    if (c.f) marcas.push({ x: c.f.q, y: c.f.h, cor: c.cor, nome: '' })
  })

  const al: Alerta[] = []
  if (Q === null) al.push({ nivel: 'i', texto: 'Informação em falta: caudal (módulos 03, 04 e 05).' })
  if (hid.hmtParcial === null && Q !== null) al.push({ nivel: 'i', texto: 'Informação em falta: dados hidráulicos dos troços (módulo 05).' })
  if (Math.abs(hid.somaDz) > 0.01 && Math.abs(hmt.estatica) > 0.01) al.push({ nivel: 'w', texto: `Os desníveis dos troços (${fmt(hid.somaDz, 1)} m, módulo 05) NÃO entram na HMT daqui: aqui conta o desnível das cotas (${fmt(hmt.estatica, 1)} m). Confirme que não está a contar a mesma diferença de cota duas vezes.` })
  if (etaB <= 0 || etaB > 90) al.push({ nivel: 'w', texto: 'Rendimento da bomba fora do intervalo habitual (30–90 %).' })
  if (pot && pot.motor === null) al.push({ nivel: 'w', texto: 'Potência acima do maior motor da lista: dimensionar em grupo ou confirmar os dados.' })
  comp.forEach((c) => {
    const mv = !c.f && Q ? motivoSemPonto(c.m, Q, est, hid.somaHf, hid.somaHl, num(b.margemH) ?? 0) : null
    if (mv === 'excede') al.push({ nivel: 'i', texto: `${c.m.fab} ${c.m.modelo}: a curva fica acima da curva do sistema em todo o intervalo (bomba sobredimensionada ou curva incompleta): o ponto de funcionamento estaria além do último ponto da curva. Estrangular ou escolher uma bomba menor.` })
    else if (mv === 'insuficiente') al.push({ nivel: 'b', texto: `${c.m.fab} ${c.m.modelo}: altura insuficiente, a curva fica abaixo da curva do sistema em todo o intervalo.` })
    else if (!c.f && pontosValidos(c.m).length >= 2) al.push({ nivel: 'w', texto: `${c.m.fab} ${c.m.modelo}: não foi encontrado ponto de funcionamento.` })
    else if (c.dQ !== null && c.dQ < -5) al.push({ nivel: 'w', texto: `${c.m.fab} ${c.m.modelo}: caudal de funcionamento ${fmt(c.f?.q ?? null, 0)} m³/h, ${fmt(Math.abs(c.dQ), 0)} % abaixo do caudal de projeto.` })
    if (c.f?.eta != null && c.f.eta < 55) al.push({ nivel: 'w', texto: `${c.m.fab} ${c.m.modelo}: funciona com rendimento de ${fmt(c.f.eta, 0)} %, longe do ponto ótimo.` })
  })
  if (!bib.bombas.length) al.push({ nivel: 'i', texto: 'Biblioteca de bombas vazia: acrescente bombas com os pontos da curva do fabricante para as comparar.' })
  if (!al.some((a) => a.nivel === 'b' || a.nivel === 'w')) al.push({ nivel: 'ok', texto: 'Dimensionamento de bombagem coerente com os critérios definidos. Resultado calculado: não substitui a validação técnica do projeto.' })

  return (
    <>
      <Card>
        <h1 className="mb-1 text-2xl font-bold text-navy">Bombagem e energia</h1>
        <p className="mb-3.5 text-mut">HMT, potência, consumo e escolha da bomba · Projeto: <b>{p.name}</b></p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Caudal" value={fmt(Q, 1)} unit="m³/h" />
          <Kpi label="HMT total" value={Q ? fmt(hmt.total, 1) : '—'} unit="m c.a." />
          <Kpi label="Potência absorvida" value={fmt(pot?.Pa ?? null, 1)} unit="kW" />
          <Kpi label="Motor a selecionar" value={pot?.motor ? fmt(pot.motor, pot.motor < 10 ? 1 : 0) : '—'} unit="kW" />
        </div>
      </Card>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <Card title="Dados de entrada">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cota da captação (m)" type="number" value={b.cotaCapt} onChange={(v) => set({ cotaCapt: v })} />
              <Field label="Cota do centro do pivot (m)" type="number" value={b.cotaPivot} onChange={(v) => set({ cotaPivot: v })} />
              <Field label="Nível dinâmico abaixo da captação (m)" type="number" value={b.nivDin} onChange={(v) => set({ nivDin: v })} />
              <Field label="Margem de segurança na HMT (%)" type="number" value={b.margemH} onChange={(v) => set({ margemH: v })} />
              <Field label="Rendimento da bomba (%)" type="number" value={b.etaB} onChange={(v) => set({ etaB: v })} />
              <Field label="Rendimento do motor (%)" type="number" value={b.etaM} onChange={(v) => set({ etaM: v })} />
              <Field label="Margem na potência do motor (%)" type="number" value={b.margemM} onChange={(v) => set({ margemM: v })} />
              <Field label="Preço da energia (€/kWh)" type="number" value={b.tarifa} onChange={(v) => set({ tarifa: v })} />
            </div>
            <p className="mt-2 text-[.8rem] text-mut">Caudal e perdas vêm do módulo 05 (caudal {fmt(Q, 1)} m³/h, perdas {fmt(perdas, 2)} m c.a., pressão no centro {fmt(hid.pcM / BAR_M, 2)} bar).</p>
          </Card>
          <Card title="Resultados">
            <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>
              {([
                ['Altura estática (cotas + nível dinâmico)', `${fmt(hmt.estatica, 1)} m`], ['Pressão no centro do pivot', `${fmt(hmt.pc, 1)} m`], ['Perdas de carga (módulo 05)', `${fmt(hmt.perdas, 1)} m`],
                [`Margem de segurança (${b.margemH || 0} %)`, `${fmt(hmt.margem, 1)} m`], ['Altura manométrica total (HMT)', Q ? `${fmt(hmt.total, 1)} m c.a.` : '—'],
                ['Potência hidráulica = Q·H ÷ 367,2', pot ? `${fmt(pot.Ph, 1)} kW` : '—'], ['Potência absorvida = Ph ÷ η bomba', pot ? `${fmt(pot.Pa, 1)} kW` : '—'],
                [`Potência do motor (+${b.margemM || 0} %)`, pot?.Pm ? `${fmt(pot.Pm, 1)} kW` : '—'], ['Motor comercial seguinte', pot?.motor ? `${fmt(pot.motor, 1)} kW` : '—'],
                ['Potência elétrica consumida', pot ? `${fmt(pot.Pel, 1)} kW` : '—'], ['Energia específica', kwhM3 !== null ? `${fmt(kwhM3, 3)} kWh/m³` : '—'],
                ['Custo por hora de funcionamento', custoHora !== null ? `${fmt(custoHora, 2)} €/h` : '—'], ['Custo por dia de rega', custoDia !== null ? `${fmt(custoDia, 2)} €/dia` : '—'],
                ['Custo por hectare e por dia', custoHaDia !== null ? `${fmt(custoHaDia, 2)} €/ha/dia` : '—'],
                [`Energia sazonal (${agro.ciclo} dias)`, kwhSaz !== null ? `${fmt(kwhSaz, 0)} kWh` : '—'], ['Custo sazonal estimado', custoSaz !== null ? `${fmt(custoSaz, 0)} € (${geo.As > 0 ? fmt(custoSaz / geo.As, 0) : '—'} €/ha)` : '—'],
              ] as [string, string][]).map((x) => <tr key={x[0]}><td>{x[0]}</td><td className="text-right"><b>{x[1]}</b></td></tr>)}
            </tbody></table></div>
          </Card>
        </div>
        <div className="min-w-0">
          <Card title="Curvas características e ponto de funcionamento">
            {Q ? <Grafico xLabel="caudal (m³/h)" yLabel="altura (m)" series={series} marcas={marcas} /> : <p className="text-sm text-mut">Sem caudal de projeto.</p>}
            <p className="mt-2 text-[.8rem] text-mut">Curva do sistema = altura estática + perdas (contínuas ∝ Q<sup>1,852</sup>, localizadas ∝ Q²) + margem. Os pontos coloridos são as interseções com cada bomba.</p>
          </Card>
          <Card title="Alertas e validações"><Alertas lista={al} /></Card>
        </div>
      </div>

      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-navy">Biblioteca de bombas e comparação</h2>
          <button className="btn btn-s print:hidden" onClick={nova}><Plus size={13} />Nova bomba</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th>Bomba</th><th className="text-right">Q funcion. (m³/h)</th><th className="text-right">H (m)</th><th className="text-right">η (%)</th><th className="text-right">Potência abs. (kW)</th><th className="text-right">Motor (kW)</th><th className="text-right">kWh/m³</th><th className="text-right">Desvio de caudal</th><th /></tr></thead>
            <tbody>
              {comp.map((c) => (
                <tr key={c.m.id} className={c.m.id === b.bombaSel ? 'bg-[#eef5fc]' : ''}>
                  <td><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.cor }} /><b>{c.m.fab} {c.m.modelo}</b></td>
                  <td className="text-right">{fmt(c.f?.q ?? null, 1)}</td><td className="text-right">{fmt(c.f?.h ?? null, 1)}</td><td className="text-right">{fmt(c.f?.eta ?? null, 0)}</td>
                  <td className="text-right">{fmt(c.f?.Pabs ?? null, 1)}</td><td className="text-right">{c.m.motorKw || '—'}</td>
                  <td className="text-right">{c.f?.q && c.Pel !== null ? fmt(c.Pel / c.f.q, 3) : '—'}</td>
                  <td className="text-right">{c.dQ !== null ? `${c.dQ > 0 ? '+' : ''}${fmt(c.dQ, 0)} %` : '—'}</td>
                  <td className="print:hidden"><button className="btn btn-g btn-s" onClick={() => set({ bombaSel: c.m.id })}>Editar curva</button></td>
                </tr>
              ))}
              {!comp.length && <tr><td colSpan={9} className="p-6 text-center text-mut">Sem bombas na biblioteca.</td></tr>}
            </tbody>
          </table>
        </div>
        {sel && (
          <div className="mt-4 rounded-xl border border-line p-3.5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Fabricante" value={sel.fab} onChange={(v) => setBomba(sel.id, (m) => ({ ...m, fab: v }))} />
              <Field label="Modelo" value={sel.modelo} onChange={(v) => setBomba(sel.id, (m) => ({ ...m, modelo: v }))} />
              <Field label="Tipo" value={sel.tipo} onChange={(v) => setBomba(sel.id, (m) => ({ ...m, tipo: v }))} />
              <Field label="Motor (kW)" type="number" value={sel.motorKw} onChange={(v) => setBomba(sel.id, (m) => ({ ...m, motorKw: v }))} />
            </div>
            <h3 className="mb-2 mt-3 text-[.95rem] font-bold text-navy">Pontos da curva (do fabricante)</h3>
            <div className="overflow-x-auto">
              <table className="text-sm"><thead><tr><th>Q (m³/h)</th><th>H (m)</th><th>η (%)</th><th /></tr></thead><tbody>
                {sel.pontos.map((pt, i) => (
                  <tr key={i}>{(['q', 'h', 'eta'] as const).map((k) => (
                    <td key={k}><input className="w-24 rounded-lg border border-line px-2 py-1.5 text-right" type="number" step="any" inputMode="decimal" value={pt[k]} aria-label={`${k} ponto ${i + 1}`} onChange={(e) => setBomba(sel.id, (m) => ({ ...m, pontos: m.pontos.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) }))} /></td>))}
                    <td><button className="btn btn-d btn-s" aria-label="Remover ponto" onClick={() => setBomba(sel.id, (m) => ({ ...m, pontos: m.pontos.filter((_, j) => j !== i) }))}><Trash2 size={13} /></button></td></tr>
                ))}
              </tbody></table>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn btn-g btn-s" onClick={() => setBomba(sel.id, (m) => ({ ...m, pontos: [...m.pontos, { q: '', h: '', eta: '' }] }))}><Plus size={13} />Ponto</button>
              <button className="btn btn-d btn-s" onClick={apagar}><Trash2 size={13} />Apagar bomba</button>
              <button className="btn btn-g btn-s" onClick={() => set({ bombaSel: '' })}>Fechar</button>
            </div>
            <p className="mt-2 text-[.8rem] text-mut">Indique pelo menos 2 pontos (caudal, altura e rendimento) lidos da curva do fabricante. A interpolação entre pontos é linear. A comparação usa a curva da bomba, não só a potência nominal.</p>
          </div>
        )}
      </Card>
    </>
  )
}
