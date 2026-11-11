import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Cenario, Projeto } from '../engine/types'
import { fmt, type Alerta } from '../engine/geometry'
import { calcCenarios, cenarioNovo, sensibilidade } from '../engine/plan'
import { Alertas, Card, Kpi } from '../components/campos'
import { Button } from '@/components/ui/button'

const cel = 'w-[74px] rounded-lg border border-line px-2 py-1.5 text-right'

export function Simulacao({ projeto: p, editar }: { projeto: Projeto; editar: (patch: Partial<Projeto>) => void }) {
  const { lista, qInst } = useMemo(() => calcCenarios(p), [p])
  const sens = useMemo(() => sensibilidade(p), [p])
  const setCen = (id: string, patch: Partial<Cenario>) => editar({ sim: { cen: p.sim.cen.map((c) => (c.id === id ? { ...c, ...patch } : c)) } })
  const novo = () => editar({ sim: { cen: [...p.sim.cen, cenarioNovo()] } })
  const apagar = (id: string) => p.sim.cen.length > 1 && editar({ sim: { cen: p.sim.cen.filter((c) => c.id !== id) } })
  const base = lista[0]
  const al: Alerta[] = []
  if (!base?.Q) al.push({ nivel: 'i', texto: 'Informação em falta: complete os módulos 03, 04 e 05 para simular cenários.' })
  lista.forEach((r) => {
    if (r.qRatio !== null && r.qRatio > 100.5) al.push({ nivel: 'b', texto: `${r.c.nome}: o caudal necessário (${fmt(r.Q, 1)} m³/h) excede o caudal instalado (${fmt(qInst, 1)} m³/h) em ${fmt(r.qRatio - 100, 0)} %.` })
    else if (r.qRatio !== null && r.qRatio > 90) al.push({ nivel: 'w', texto: `${r.c.nome}: usa ${fmt(r.qRatio, 0)} % do caudal instalado, quase sem folga.` })
  })
  if (base?.Q && !al.some((x) => x.nivel === 'b' || x.nivel === 'w')) al.push({ nivel: 'ok', texto: 'Todos os cenários cabem no caudal instalado. Cenários recalculam toda a cadeia (agronomia, hidráulica, bombagem).' })
  const pior = lista.reduce<typeof base | null>((m, r) => (r.Q !== null && (m === null || (m.Q ?? 0) < r.Q) ? r : m), null)
  const maxAbs = Math.max(1, ...sens.flatMap((s) => [s.menos.dQ, s.mais.dQ].map((v) => Math.abs(v ?? 0))))

  return (
    <>
      <Card>
        <h1 className="mb-1 text-2xl font-bold text-navy">Simulação e análise</h1>
        <p className="mb-3.5 text-mut">Cenários e sensibilidade · Projeto: <b>{p.name}</b> · Caudal instalado: <b>{fmt(qInst, 1)} m³/h</b></p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Cenários" value={String(lista.length)} />
          <Kpi label="Pior caudal" value={fmt(pior?.Q ?? null, 1)} unit="m³/h" />
          <Kpi label="Utilização máxima" value={pior?.qRatio != null ? fmt(pior.qRatio, 0) : '—'} unit="%" />
          <Kpi label="Custo sazonal (base)" value={base?.custo != null ? fmt(base.custo, 0) : '—'} unit="€" />
        </div>
      </Card>
      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-navy">Cenários</h2>
          <Button size="sm" className="print:hidden" onClick={novo}><Plus size={13} />Novo cenário</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th>Cenário</th><th className="text-right">ET0 %</th><th className="text-right">Kc %</th><th className="text-right">Pe %</th><th className="text-right">Efic. %</th><th className="text-right">Horas/dia</th><th className="print:hidden" /></tr></thead>
            <tbody>
              {p.sim.cen.map((c) => (
                <tr key={c.id}>
                  <td><input className="w-full min-w-[160px] rounded-lg border border-line px-2 py-1.5" value={c.nome} onChange={(e) => setCen(c.id, { nome: e.target.value })} /></td>
                  {(['et0', 'kc', 'pe'] as const).map((k) => <td key={k} className="text-right"><input className={cel} type="number" inputMode="decimal" value={c[k]} onChange={(e) => setCen(c.id, { [k]: e.target.value })} /></td>)}
                  <td className="text-right"><input className={cel} type="number" inputMode="decimal" value={c.ef} placeholder={p.agro.ef} onChange={(e) => setCen(c.id, { ef: e.target.value })} /></td>
                  <td className="text-right"><input className={cel} type="number" inputMode="decimal" value={c.horas} placeholder={p.hid.horas} onChange={(e) => setCen(c.id, { horas: e.target.value })} /></td>
                  <td className="print:hidden"><Button size="sm" variant="ghost" aria-label="Apagar cenário" disabled={p.sim.cen.length < 2} onClick={() => apagar(c.id)}><Trash2 size={14} /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[.8rem] text-mut">ET0, Kc e Pe são fatores em % do valor do projeto (100 = igual). Eficiência e horas, se indicadas, substituem os valores do projeto. O caudal manual do módulo 05 não é aplicado aos cenários.</p>
      </Card>
      <Card title="Resultados por cenário">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th>Cenário</th><th className="text-right">N bruta (mm/dia)</th><th className="text-right">Caudal (m³/h)</th><th className="text-right">% do instalado</th><th className="text-right">HMT (m)</th><th className="text-right">Pot. elétrica (kW)</th><th className="text-right">Regas</th><th className="text-right">Volume (m³)</th><th className="text-right">Energia (kWh)</th><th className="text-right">Custo (€)</th></tr></thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.c.id} className={r.qRatio !== null && r.qRatio > 100.5 ? 'bg-[#fdecea]' : ''}>
                  <td><b>{r.c.nome}</b></td><td className="text-right">{fmt(r.nbruta, 2)}</td><td className="text-right">{fmt(r.Q, 1)}</td>
                  <td className="text-right">{fmt(r.qRatio, 0)}</td><td className="text-right">{fmt(r.hmt, 1)}</td><td className="text-right">{fmt(r.Pel, 1)}</td>
                  <td className="text-right">{r.ok ? r.regas : '—'}</td><td className="text-right">{r.ok ? fmt(r.m3, 0) : '—'}</td>
                  <td className="text-right">{fmt(r.kwh, 0)}</td><td className="text-right">{fmt(r.custo, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title="Sensibilidade do caudal (±20 %)">
          <div className="space-y-2.5">
            {sens.map((s) => (
              <div key={s.nome}>
                <div className="mb-0.5 flex justify-between text-sm"><span>{s.nome}</span><span className="text-mut">{s.menos.dQ !== null ? `${fmt(s.menos.dQ, 0)} % / +${fmt(s.mais.dQ, 0).replace('+', '')} %` : '—'}</span></div>
                <div className="relative h-3 rounded bg-[#eef3f8]" role="img" aria-label={`${s.nome}: caudal ${fmt(s.menos.dQ, 0)} % com −20 % e ${fmt(s.mais.dQ, 0)} % com +20 %`}>
                  <i className="absolute left-1/2 top-0 h-full w-px bg-[#9db0c2]" />
                  {[s.menos.dQ, s.mais.dQ].map((v, i) => v === null ? null : (
                    <i key={i} className="absolute top-0 h-full rounded" style={{ background: i ? '#1677C8' : '#d98a00', left: v < 0 ? `${50 + (v / maxAbs) * 50}%` : '50%', width: `${(Math.abs(v) / maxAbs) * 50}%`, opacity: 0.9 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[.8rem] text-mut">Cada barra mostra a variação do caudal necessário quando o parâmetro desce 20 % (laranja) ou sobe 20 % (azul). Barras maiores = maior influência.</p>
        </Card>
        <Card title="Alertas e validações"><Alertas lista={al} /></Card>
      </div>
    </>
  )
}
