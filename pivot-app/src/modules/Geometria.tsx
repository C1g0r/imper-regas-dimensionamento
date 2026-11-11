import { useMemo } from 'react'
import type { Geo, Projeto } from '../engine/types'
import { alertasGeo, calcGeo, calcParcela, fmt, num } from '../engine/geometry'
import { Alertas, Card, Field, Kpi } from '../components/campos'
import { PivotDrawing } from '../components/PivotDrawing'
import { Button } from '@/components/ui/button'

export function Geometria({ projeto: p, editar }: { projeto: Projeto; editar: (patch: Partial<Projeto>) => void }) {
  const g = p.geo
  const c = useMemo(() => calcGeo(g), [g])
  const pc = useMemo(() => calcParcela(p.par, g, c), [p.par, g, c])
  const set = (patch: Partial<Geo>) => editar({ geo: { ...g, ...patch } })
  const setN = (n: number) => {
    const m = Math.max(1, Math.min(30, Math.round(n) || 1))
    const sp = [...g.spans]
    while (sp.length < m) sp.push(sp[sp.length - 1] ?? 60)
    sp.length = m
    set({ spans: sp })
  }
  const setSpan = (i: number, v: string) => set({ spans: g.spans.map((s, k) => (k === i ? v : s)) })
  let acc = 0
  const rows = [
    ['Comprimento físico da estrutura (L)', `${fmt(c.L, 1)} m`], ['Raio efetivo de rega (R)', `${fmt(c.R, 1)} m`],
    ['Área circular teórica', `${fmt(c.Afull, 2)} ha`], ['Diâmetro da área circular', `${fmt(c.D, 1)} m`],
    ['Perímetro', `${fmt(c.P, 1)} m`], ['Ângulo de funcionamento', `${fmt(c.th, 1)} °`],
    ['Área do setor irrigado', `${fmt(c.As, 2)} ha`], ['Área do setor sem canhão (raio físico)', `${fmt(c.ApL, 2)} ha`],
    ['Nº de torres', String(c.n)], ['Distância média entre torres', `${fmt(c.avgT, 1)} m`],
    ...(pc ? [
      ['Área da parcela', `${fmt(pc.area, 2)} ha`], ['Área irrigada dentro da parcela', `${fmt(pc.inside, 2)} ha (${fmt(pc.pct, 1)} %)`],
      ['Área da parcela não irrigada', `${fmt(pc.uncov, 2)} ha`], ['Área irrigada fora da parcela', `${fmt(pc.outside, 2)} ha`],
    ] : []),
  ]
  return (
    <>
      <Card>
        <h1 className="mb-1 text-2xl font-bold text-navy">Dimensionamento geométrico</h1>
        <p className="mb-3.5 text-mut">Configuração à esquerda · desenho técnico interativo à direita · Projeto: <b>{p.name}</b></p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Comprimento físico" value={fmt(c.L, 1)} to={c.L} dec={1} unit="m" /><Kpi label="Raio efetivo" value={fmt(c.R, 1)} to={c.R} dec={1} unit="m" />
          <Kpi label="Área irrigada (setor)" value={fmt(c.As, 2)} to={c.As} dec={2} unit="ha" /><Kpi label="Nº de torres" value={String(c.n)} />
        </div>
      </Card>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Card title="3.1 Configuração do equipamento">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nº de vãos" type="number" value={g.spans.length} onChange={(v) => setN(num(v) ?? 1)} />
              <Field label="Comprimento do balanço (m)" type="number" value={g.lb} onChange={(v) => set({ lb: v })} />
              <Field label="Ângulo de funcionamento (°)" type="number" value={g.theta} onChange={(v) => set({ theta: v })} />
              <Field label="Orientação do início (° do Norte)" type="number" value={g.start} onChange={(v) => set({ start: v })} />
              <label className="lbl mt-2 flex items-center gap-2">
                <input type="checkbox" checked={g.gun} onChange={(e) => set({ gun: e.target.checked, G: e.target.checked && !(num(g.G) ?? 0) ? 30 : g.G })} /> Canhão terminal
              </label>
              <Field label="Alcance do canhão (m)" type="number" value={g.G} onChange={(v) => set({ G: v })} />
            </div>
            <h3 className="mb-2 mt-4 text-[.95rem] font-bold text-navy">Vãos (cada um configurável)</h3>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => setN(g.spans.length + 1)}>+ Vão</Button>
              <Button variant="outline" size="sm" onClick={() => setN(g.spans.length - 1)}>− Vão</Button>
              <TodosVaos onApply={(v) => set({ spans: g.spans.map(() => v) })} />
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><th>Vão</th><th className="text-right">Comprimento (m)</th><th className="text-right">Torre a (m)</th></tr></thead>
                <tbody>
                  {g.spans.map((s, i) => { acc += num(s) ?? 0; return (
                    <tr key={i}><td>Vão {i + 1}</td>
                      <td className="text-right"><input className="w-[90px] rounded-lg border border-line px-2 py-1.5 text-right" type="number" step="any" inputMode="decimal" value={s} onChange={(e) => setSpan(i, e.target.value)} /></td>
                      <td className="text-right">{fmt(acc, 1)}</td></tr>) })}
                </tbody>
              </table>
            </div>
            <h3 className="mb-2 mt-4 text-[.95rem] font-bold text-navy">Posição do pivot na parcela</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desvio E–O do centro (m)" type="number" value={g.ox} onChange={(v) => set({ ox: v })} />
              <Field label="Desvio N–S do centro (m)" type="number" value={g.oy} onChange={(v) => set({ oy: v })} />
            </div>
            <p className="mt-2 text-[.8rem] text-mut">Também pode arrastar o centro (ponto laranja) no desenho. A parcela é definida no módulo 02.</p>
          </Card>
          <Card title="3.2 Fórmulas utilizadas">
            <p className="text-[.8rem] leading-7 text-mut">Comprimento físico: L = Σ Lᵢ + L<sub>b</sub><br />Raio efetivo: R = L + alcance do canhão (se existir)<br />Área circular: A = π·R² ÷ 10 000 (ha)<br />Diâmetro: D = 2R · Perímetro: P = 2πR<br />Área do setor: A<sub>s</sub> = θ/360 × π·R² ÷ 10 000</p>
          </Card>
        </div>
        <div className="min-w-0">
          <Card title="3.4 Desenho técnico">
            <PivotDrawing p={p} c={c} onMove={(ox, oy) => set({ ox, oy })} />
            <p className="mt-2 text-[.8rem] text-mut">Roda do rato / pinça para zoom · arrastar para mover · arrastar o ponto laranja para deslocar o pivot.</p>
          </Card>
          <Card title="3.3 Resultados geométricos">
            <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>{rows.map((r) => <tr key={r[0]}><td>{r[0]}</td><td className="text-right"><b>{r[1]}</b></td></tr>)}</tbody></table></div>
            <h3 className="mb-2 mt-4 text-[.95rem] font-bold text-navy">Secções do pivot</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><th>Secção</th><th className="text-right">De (m)</th><th className="text-right">Até (m)</th><th className="text-right">Comp. (m)</th><th className="text-right">Área (ha)</th></tr></thead>
                <tbody>{c.secs.map((s) => <tr key={s.n}><td>{s.n}</td><td className="text-right">{fmt(s.r0, 1)}</td><td className="text-right">{fmt(s.r1, 1)}</td><td className="text-right">{fmt(s.len, 1)}</td><td className="text-right">{fmt(s.area, 2)}</td></tr>)}</tbody>
              </table>
            </div>
          </Card>
          <Card title="Alertas e validações"><Alertas lista={alertasGeo(g, p.par, c, pc)} /></Card>
        </div>
      </div>
    </>
  )
}

function TodosVaos({ onApply }: { onApply: (v: number) => void }) {
  return (
    <form className="flex items-center gap-1.5" onSubmit={(e) => {
      e.preventDefault()
      const v = num(new FormData(e.currentTarget).get('t'))
      if (v && v > 0) onApply(v)
    }}>
      <label className="lbl flex items-center gap-1.5">Aplicar a todos (m)
        <input name="t" type="number" step="any" className="w-20 rounded-lg border border-line px-2 py-1" />
      </label>
      <Button variant="outline" size="sm" type="submit">Aplicar</Button>
    </form>
  )
}
