import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Hid, Material, Projeto, Troco, TipoTroco } from '../engine/types'
import { calcAgro, AWC_TIPICO } from '../engine/agro'
import { BAR_M, MATERIAIS, TIPOS, calcHid, caudalSistema, comparar, trocoNovo } from '../engine/hydraulic'
import { calcGeo, fmt, num } from '../engine/geometry'
import { Alertas, Card, Field, Kpi } from '../components/ui'

const pill: Record<string, string> = {
  ok: 'bg-[#dcf3e7] text-ok', info: 'bg-[#e3effa] text-brand', aviso: 'bg-[#fdf0d4] text-[#a86b00]', erro: 'bg-[#fbe0e0] text-bad',
}

export function Hidraulica({ projeto: p, editar }: { projeto: Projeto; editar: (patch: Partial<Projeto>) => void }) {
  const h = p.hid
  const area = useMemo(() => calcGeo(p.geo).As, [p.geo])
  const agro = useMemo(() => calcAgro(p.agro, area, AWC_TIPICO[p.par.soil] ?? null), [p.agro, area, p.par.soil])
  const qAgro = caudalSistema(agro.nbruta, area, num(h.horas))
  const r = useMemo(() => calcHid(h, qAgro), [h, qAgro])
  const set = (patch: Partial<Hid>) => editar({ hid: { ...h, ...patch } })
  const setT = (id: string, patch: Partial<Troco>) => set({ segs: h.segs.map((t) => (t.id === id ? { ...t, ...patch } : t)) })
  const mover = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= h.segs.length) return
    const s = [...h.segs]; [s[i], s[j]] = [s[j], s[i]]; set({ segs: s })
  }
  const nTorres = p.geo.spans.length

  return (
    <>
      <Card>
        <h1 className="mb-1 text-2xl font-bold text-navy">Dimensionamento hidráulico</h1>
        <p className="mb-3.5 text-mut">Caudais, tubagens, velocidades e perdas de carga · Projeto: <b>{p.name}</b></p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Caudal de projeto" value={fmt(r.Q, 1)} unit="m³/h" />
          <Kpi label="Perda de carga total" value={fmt(r.somaHf + r.somaHl, 1)} unit="m c.a." />
          <Kpi label="Pressão necessária à rede" value={r.necessariaRede !== null ? fmt(r.necessariaRede / BAR_M, 2) : '—'} unit="bar" />
          <Kpi label="HMT parcial" value={fmt(r.hmtParcial, 1)} unit="m c.a." />
        </div>
        <p className="mt-2 text-[.8rem] text-mut">{r.origemQ === 'manual' ? 'Caudal indicado manualmente.' : r.origemQ === 'agronómico' ? `Caudal = necessidade bruta × área ÷ horas de funcionamento (${fmt(agro.nbruta, 2)} mm/dia × ${fmt(area, 2)} ha × 10 ÷ ${h.horas || '—'} h).` : 'Sem caudal: complete os módulos 03 e 04.'}</p>
      </Card>

      <Card title="Parâmetros gerais">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Horas de funcionamento (h/dia)" type="number" value={h.horas} onChange={(v) => set({ horas: v })} />
          <Field label="Caudal manual (m³/h)" type="number" value={h.qman} placeholder="automático" onChange={(v) => set({ qman: v })} />
          <Field label="Pressão no centro do pivot (bar)" type="number" value={h.pc} onChange={(v) => set({ pc: v })} />
          <Field label="Pressão disponível à entrada (bar)" type="number" value={h.pdisp} placeholder="opcional" onChange={(v) => set({ pdisp: v })} />
          <label className="lbl">Fórmula de perdas
            <select className="inp" value={h.method} onChange={(e) => set({ method: e.target.value as Hid['method'] })}>
              <option value="DW">Darcy-Weisbach</option><option value="HW">Hazen-Williams</option>
            </select>
          </label>
        </div>
        <p className="mt-2 text-[.8rem] text-mut">Darcy-Weisbach: h<sub>f</sub> = f·(L/D)·V²/2g, com f de Swamee-Jain · Hazen-Williams: h<sub>f</sub> = 10,67·L·Q<sup>1,852</sup>/(C<sup>1,852</sup>·D<sup>4,871</sup>) (Q em m³/s). Na conduta do pivot aplica-se o fator de Christiansen.</p>
      </Card>

      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-navy">Troços da rede (da bomba ao pivot)</h2>
          <div className="flex flex-wrap gap-2 print:hidden">
            {(['asp', 'prin', 'dist', 'pivot'] as TipoTroco[]).map((k) => (
              <button key={k} className="btn btn-g btn-s" onClick={() => set({ segs: [...h.segs, trocoNovo(k)] })}><Plus size={13} />{TIPOS[k].nome.replace('Conduta de ', '').replace('Conduta ', '').replace('do ', '')}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th>Troço</th><th>Material</th><th className="text-right">DN / Ø int. (mm)</th><th className="text-right">Comp. (m)</th><th className="text-right">Desnível (m)</th><th className="text-right">ΣK</th><th className="text-right">Saídas</th><th className="text-right">V (m/s)</th><th className="text-right">hf (m)</th><th className="text-right">hl (m)</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {r.trocos.map(({ t, p: pr, estado }, i) => (
                <tr key={t.id}>
                  <td><input className="w-40 rounded-lg border border-line px-2 py-1.5" value={t.name} onChange={(e) => setT(t.id, { name: e.target.value })} aria-label="Nome do troço" /><div className="mt-0.5 text-[.72rem] text-mut">{TIPOS[t.kind].nome}</div></td>
                  <td><select className="rounded-lg border border-line px-2 py-1.5" value={t.mat} onChange={(e) => { const m = e.target.value as Material; const dns = MATERIAIS[m].dns; setT(t.id, { mat: m, dn: dns.includes(Number(t.dn)) ? t.dn : String(dns[Math.min(dns.length - 1, 4)] ?? '') }) }}>
                    {(Object.keys(MATERIAIS) as Material[]).map((m) => <option key={m}>{m}</option>)}</select></td>
                  <td className="text-right">{t.mat === 'Personalizado'
                    ? <input className="w-20 rounded-lg border border-line px-2 py-1.5 text-right" type="number" step="any" value={t.idc} placeholder="Ø int." onChange={(e) => setT(t.id, { idc: e.target.value })} />
                    : <select className="rounded-lg border border-line px-2 py-1.5" value={t.dn} onChange={(e) => setT(t.id, { dn: e.target.value })}>{MATERIAIS[t.mat].dns.map((d) => <option key={d}>{d}</option>)}</select>}</td>
                  <td className="text-right"><input className="w-20 rounded-lg border border-line px-2 py-1.5 text-right" type="number" step="any" value={t.L} onChange={(e) => setT(t.id, { L: e.target.value })} /></td>
                  <td className="text-right"><input className="w-16 rounded-lg border border-line px-2 py-1.5 text-right" type="number" step="any" value={t.dz} onChange={(e) => setT(t.id, { dz: e.target.value })} /></td>
                  <td className="text-right"><input className="w-14 rounded-lg border border-line px-2 py-1.5 text-right" type="number" step="any" value={t.k} onChange={(e) => setT(t.id, { k: e.target.value })} /></td>
                  <td className="text-right">{t.kind === 'pivot' ? <input className="w-16 rounded-lg border border-line px-2 py-1.5 text-right" type="number" value={t.nOut} onChange={(e) => setT(t.id, { nOut: e.target.value })} /> : '—'}</td>
                  <td className="text-right">{pr ? fmt(pr.V, 2) : '—'}</td>
                  <td className="text-right">{pr ? fmt(pr.hf, 2) : '—'}</td>
                  <td className="text-right">{pr ? fmt(pr.hl, 2) : '—'}</td>
                  <td>{estado && <span className={`rounded-full px-2 py-0.5 text-[.74rem] font-bold ${pill[estado.e]}`}>{estado.txt}</span>}</td>
                  <td className="print:hidden"><div className="flex gap-1">
                    <button className="btn btn-g btn-s" aria-label="Subir" onClick={() => mover(i, -1)}>↑</button>
                    <button className="btn btn-g btn-s" aria-label="Descer" onClick={() => mover(i, 1)}>↓</button>
                    <button className="btn btn-d btn-s" aria-label="Remover" onClick={() => set({ segs: h.segs.filter((s) => s.id !== t.id) })}><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              ))}
              {!h.segs.length && <tr><td colSpan={12} className="p-6 text-center text-mut">Sem troços. Acrescente um troço acima.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[.8rem] text-mut">Diâmetros internos: PEAD PE100 (PN10 = SDR17, PN16 = SDR11) calculados; aço com Ø interno ≈ DN (indicativo). Confirme sempre o diâmetro interno com o fabricante ou use "Personalizado". Desnível positivo = a água sobe.</p>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><tbody>
          {([
            ['Perda de carga contínua total', `${fmt(r.somaHf, 2)} m c.a.`], ['Perdas localizadas totais', `${fmt(r.somaHl, 2)} m c.a.`],
            ['Desnível total', `${fmt(r.somaDz, 1)} m`], ['Pressão no centro do pivot', `${fmt(r.pcM, 1)} m c.a.`],
            ['HMT parcial (sem perdas na bomba e nível dinâmico)', r.hmtParcial !== null ? `${fmt(r.hmtParcial, 1)} m c.a. (${fmt(r.hmtParcial / BAR_M, 2)} bar)` : '—'],
            ...(r.margem !== null ? [['Margem de pressão disponível', `${fmt(r.margem, 1)} m c.a.`]] : []),
          ] as [string, string][]).map((x) => <tr key={x[0]}><td>{x[0]}</td><td className="text-right"><b>{x[1]}</b></td></tr>)}
        </tbody></table></div>
      </Card>

      {h.segs.filter((t) => MATERIAIS[t.mat].dns.length && r.Q !== null).map((t) => {
        const cand = comparar(t, r.Q as number, h.method)
        return (
          <Card key={t.id} title={`Comparador de diâmetros · ${t.name}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><th>DN</th><th className="text-right">Ø int. (mm)</th><th className="text-right">V (m/s)</th><th className="text-right">hf (m)</th><th className="text-right">hf (m/100 m)</th><th>Estado</th><th className="text-right">Preço (€/m)</th><th className="text-right">Custo (€)</th></tr></thead>
                <tbody>
                  {cand.map((c) => (
                    <tr key={c.dn} className={c.selecionado ? 'bg-[#eef5fc]' : ''}>
                      <td><b>{c.dn}</b>{c.selecionado && <span className="ml-1.5 text-[.72rem] text-brand">selecionado</span>}</td>
                      <td className="text-right">{fmt(c.id, 1)}</td><td className="text-right">{fmt(c.V, 2)}</td><td className="text-right">{fmt(c.hf, 2)}</td>
                      <td className="text-right">{fmt(num(t.L) ? (c.hf / (num(t.L) as number)) * 100 : null, 2)}</td>
                      <td><span className={`rounded-full px-2 py-0.5 text-[.74rem] font-bold ${pill[c.estado.e]}`}>{c.estado.txt}</span></td>
                      <td className="text-right"><input className="w-20 rounded-lg border border-line px-2 py-1.5 text-right" type="number" step="any" value={t.prices[String(c.dn)] ?? ''} onChange={(e) => setT(t.id, { prices: { ...t.prices, [String(c.dn)]: e.target.value } })} aria-label={`Preço DN ${c.dn}`} /></td>
                      <td className="text-right">{c.custo !== null ? fmt(c.custo, 0) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[.8rem] text-mut">O comparador mostra as alternativas e os custos que indicar; não escolhe automaticamente o mais barato. A escolha deve respeitar velocidade, pressão nominal e critérios de projeto. Nº de torres do pivot: {nTorres}.</p>
          </Card>
        )
      })}

      <Card title="Alertas e validações"><Alertas lista={r.alertas} /></Card>
    </>
  )
}
