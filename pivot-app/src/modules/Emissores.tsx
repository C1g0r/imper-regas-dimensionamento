import { useMemo } from 'react'
import { Save, Trash2 } from 'lucide-react'
import type { Biblioteca, Emit, ModeloEmissor, Projeto } from '../engine/types'
import { AWC_TIPICO, calcAgro } from '../engine/agro'
import { calcGeo, fmt, num } from '../engine/geometry'
import { MATERIAIS, calcHid, caudalSistema, diametroInterno } from '../engine/hydraulic'
import { TIPOS_EMISSOR, calcEmit } from '../engine/emit'
import { Alertas, Card, Field, Kpi } from '../components/campos'
import { Grafico } from '../components/Grafico'
import { uid } from '../engine/storage'
import { Button } from '@/components/ui/button'

interface Props {
  projeto: Projeto
  editar: (patch: Partial<Projeto>) => void
  bib: Biblioteca
  setBib: (f: (b: Biblioteca) => Biblioteca) => void
}

export function Emissores({ projeto: p, editar, bib, setBib }: Props) {
  const e = p.emit
  const geo = useMemo(() => calcGeo(p.geo), [p.geo])
  const agro = useMemo(() => calcAgro(p.agro, geo.As, AWC_TIPICO[p.par.soil] ?? null), [p.agro, geo.As, p.par.soil])
  const qAgro = caudalSistema(agro.nbruta, geo.As, num(p.hid.horas))
  const hid = useMemo(() => calcHid(p.hid, qAgro), [p.hid, qAgro])
  const piv = p.hid.segs.find((t) => t.kind === 'pivot')
  const D = piv ? diametroInterno(piv) : null
  const eps = piv ? (piv.mat === 'Personalizado' ? 0.05 : MATERIAIS[piv.mat].eps) : 0.15
  const r = useMemo(() => calcEmit(e, geo.L, hid.Q, D, hid.pcM, eps, num(p.par.inf)), [e, geo.L, hid.Q, D, hid.pcM, eps, p.par.inf])
  const set = (patch: Partial<Emit>) => editar({ emit: { ...e, ...patch } })
  const usar = (id: string) => {
    const m = bib.emit.find((x) => x.id === id)
    if (!m) { set({ libId: '' }); return }
    set({ libId: id, tipo: m.tipo, fab: m.fab, modelo: m.modelo, bocal: m.bocal, p: m.p, q: m.q, wd: m.wd, s: m.s, h: m.h, reg: m.reg })
  }
  const guardar = () => {
    if (!e.modelo.trim()) { window.alert('Indique o modelo antes de guardar na biblioteca.'); return }
    const m: ModeloEmissor = { id: e.libId || uid(), tipo: e.tipo, fab: e.fab, modelo: e.modelo, bocal: e.bocal, p: e.p, q: e.q, wd: e.wd, s: e.s, h: e.h, reg: e.reg }
    setBib((b) => ({ ...b, emit: b.emit.some((x) => x.id === m.id) ? b.emit.map((x) => (x.id === m.id ? m : x)) : [...b.emit, m] }))
    set({ libId: m.id })
  }
  const apagar = () => {
    if (!e.libId || !window.confirm('Apagar este modelo da biblioteca?')) return
    setBib((b) => ({ ...b, emit: b.emit.filter((x) => x.id !== e.libId) }))
    set({ libId: '' })
  }
  const ps = r.pontos
  const passo = Math.max(1, Math.floor(ps.length / 40))
  const amostra = ps.filter((_, i) => i % passo === 0 || i === ps.length - 1)

  return (
    <>
      <Card>
        <h1 className="mb-1 text-2xl font-bold text-navy">Aspersores e emissores</h1>
        <p className="mb-3.5 text-mut">Distribuição de caudal e pressão ao longo do pivot · Projeto: <b>{p.name}</b></p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Nº de emissores" value={r.ok ? String(r.N) : '—'} />
          <Kpi label="Caudal por emissor" value={r.ok ? `${fmt(r.qMin, 0)}–${fmt(r.qMax, 0)}` : '—'} unit="L/h" />
          <Kpi label="Pressão (centro → ponta)" value={r.ok ? `${fmt(r.pMax, 2)}–${fmt(r.pMin, 2)}` : '—'} unit="bar" />
          <Kpi label="Taxa de pico" value={fmt(r.imax, 0)} unit="mm/h" dim={r.imax === null} />
        </div>
      </Card>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(300px,440px)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Card title="Emissor e biblioteca">
            <label className="lbl">Modelo da biblioteca
              <select className="inp" value={e.libId} onChange={(ev) => usar(ev.target.value)}>
                <option value="">— a introduzir manualmente —</option>
                {bib.emit.map((m) => <option key={m.id} value={m.id}>{m.tipo} · {m.fab} {m.modelo}{m.bocal ? ` (${m.bocal})` : ''}</option>)}
              </select>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="lbl">Tipo de emissor
                <select className="inp" value={e.tipo} onChange={(ev) => set({ tipo: ev.target.value })}>{TIPOS_EMISSOR.map((t) => <option key={t}>{t}</option>)}</select>
              </label>
              <Field label="Fabricante" value={e.fab} onChange={(v) => set({ fab: v })} />
              <Field label="Modelo" value={e.modelo} onChange={(v) => set({ modelo: v })} />
              <Field label="Diâmetro do bocal" value={e.bocal} placeholder="ex.: 4,5 mm" onChange={(v) => set({ bocal: v })} />
              <Field label="Pressão de referência (bar)" type="number" value={e.p} onChange={(v) => set({ p: v })} />
              <Field label="Caudal à pressão de ref. (L/h)" type="number" value={e.q} onChange={(v) => set({ q: v })} />
              <Field label="Diâmetro molhado (m)" type="number" value={e.wd} onChange={(v) => set({ wd: v })} />
              <Field label="Espaçamento (m)" type="number" value={e.s} onChange={(v) => set({ s: v })} />
              <Field label="Altura de instalação (m)" type="number" value={e.h} onChange={(v) => set({ h: v })} />
              <Field label="Regulador de pressão (bar)" type="number" value={e.reg} placeholder="sem regulador" onChange={(v) => set({ reg: v })} />
              <Field label="Caudal do canhão (m³/h)" type="number" value={e.Qg} onChange={(v) => set({ Qg: v })} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 print:hidden">
              <Button size="sm" onClick={guardar}><Save size={13} />Guardar na biblioteca</Button>
              {e.libId && <Button variant="danger" size="sm" onClick={apagar}><Trash2 size={13} />Apagar modelo</Button>}
            </div>
            <p className="mt-2 text-[.8rem] text-mut">A biblioteca é partilhada por todos os projetos e fica guardada neste navegador. Introduza os dados do catálogo do fabricante; a aplicação não traz valores de fabricantes.</p>
          </Card>
          <Card title="Critérios">
            <p className="text-[.8rem] leading-7 text-mut">Caudal do emissor i: q<sub>i</sub> = Q<sub>emissores</sub> · r<sub>i</sub> ÷ Σr (aplicação uniforme em mm)<br />Pressão: p<sub>i</sub> = p<sub>centro</sub> − h<sub>f</sub>(r<sub>i</sub>), com Darcy-Weisbach e caudal decrescente<br />Caudal de catálogo necessário: q<sub>cat</sub> = q<sub>i</sub> · √(p<sub>ref</sub> ÷ p<sub>i</sub>)<br />Taxa de pico (padrão elíptico): I = (4/π) · q ÷ (π·D<sub>m</sub>²/4)</p>
          </Card>
        </div>
        <div className="min-w-0">
          <Card title="Distribuição ao longo do pivot">
            {r.ok ? (
              <>
                <Grafico xLabel="distância ao centro (m)" yLabel="caudal por emissor (L/h)" series={[{ nome: 'Caudal de projeto (L/h)', cor: '#1677C8', x: ps.map((x) => x.r), y: ps.map((x) => x.qDes) }]} />
                <div className="mt-3"><Grafico xLabel="distância ao centro (m)" yLabel="pressão (bar)" h={200} series={[{ nome: 'Pressão disponível (bar)', cor: '#d98a00', x: ps.map((x) => x.r), y: ps.map((x) => x.pBar) }, ...(num(e.reg) ? [{ nome: 'Regulador (bar)', cor: '#1d9a5b', tracejado: true, x: [ps[0].r, ps[ps.length - 1].r], y: [num(e.reg) as number, num(e.reg) as number] }] : [])]} /></div>
              </>
            ) : <p className="text-sm text-mut">{r.alertas[0]?.texto}</p>}
          </Card>
          <Card title="Tabela de emissores">
            {r.ok ? (
              <>
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white"><tr><th className="text-right">Nº</th><th className="text-right">r (m)</th><th className="text-right">q projeto (L/h)</th><th className="text-right">Caudal acum. (m³/h)</th><th className="text-right">p (bar)</th><th className="text-right">q catálogo nec. (L/h)</th></tr></thead>
                    <tbody>{amostra.map((x) => <tr key={x.i}><td className="text-right">{x.i}</td><td className="text-right">{fmt(x.r, 1)}</td><td className="text-right">{fmt(x.qDes, 0)}</td><td className="text-right">{fmt(x.acum, 1)}</td><td className="text-right">{fmt(x.pOp, 2)}</td><td className="text-right">{fmt(x.qCat, 0)}</td></tr>)}</tbody>
                  </table>
                </div>
                {passo > 1 && <p className="mt-2 text-[.8rem] text-mut">Mostrado 1 em cada {passo} emissores (total {r.N}).</p>}
              </>
            ) : <p className="text-sm text-mut">Complete os dados para ver a tabela.</p>}
          </Card>
          <Card title="Alertas e validações"><Alertas lista={r.alertas} /></Card>
        </div>
      </div>
    </>
  )
}
