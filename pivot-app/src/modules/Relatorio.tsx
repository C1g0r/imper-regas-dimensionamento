import { useMemo, type ReactNode } from 'react'
import { Download, Printer } from 'lucide-react'
import type { Projeto } from '../engine/types'
import { fmt, num } from '../engine/geometry'
import { contexto } from '../engine/contexto'
import { MATERIAIS, TIPOS, BAR_M, diametroInterno } from '../engine/hydraulic'
import { calcEmit } from '../engine/emit'
import { calcCenarios, simularPlano } from '../engine/plan'
import { calcParcela } from '../engine/geometry'
import { csvRegas } from './Planeamento'
import { Button } from '@/components/ui/button'
import logo from '../assets/logo.png'

type Linha = [string, string]
function Sec({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return <section className="break-inside-avoid-page pt-4"><h2 className="mb-2 border-b border-line pb-1 text-lg font-bold text-navy">{n}. {titulo}</h2>{children}</section>
}
function Tab({ linhas }: { linhas: Linha[] }) {
  return <table className="w-full table-fixed text-sm"><tbody>{linhas.map((l) => <tr key={l[0]}><td className="w-[46%] break-words">{l[0]}</td><td className="break-words text-right"><b>{l[1]}</b></td></tr>)}</tbody></table>
}
const dataPT = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—')

export function Relatorio({ projeto: p }: { projeto: Projeto }) {
  const c = useMemo(() => contexto(p), [p])
  const plano = useMemo(() => simularPlano(p), [p])
  const cen = useMemo(() => calcCenarios(p), [p])
  const parc = useMemo(() => calcParcela(p.par, p.geo, c.geo), [p.par, p.geo, c.geo])
  const piv = p.hid.segs.find((t) => t.kind === 'pivot')
  const D = piv ? diametroInterno(piv) : null
  const eps = piv ? (piv.mat === 'Personalizado' ? 0.05 : MATERIAIS[piv.mat].eps) : 0.15
  const em = useMemo(() => calcEmit(p.emit, c.geo.L, c.Q, D, c.hid.pcM, eps, num(p.par.inf)), [p.emit, c.geo.L, c.Q, D, c.hid.pcM, eps, p.par.inf])
  const a = p.agro, g = c.geo

  const pendencias: string[] = []
  if (!(g.As > 0)) pendencias.push('Geometria do pivot (módulo 03).')
  if (num(a.et0) === null) pendencias.push('ET0 de projeto (módulo 04).')
  if (c.Q === null) pendencias.push('Caudal do sistema (módulos 04/05).')
  if (!p.bomb.bombaSel) pendencias.push('Bomba selecionada da biblioteca (módulo 07).')
  if (!p.emit.modelo.trim()) pendencias.push('Modelo de emissor (módulo 06).')
  if (!p.client.trim()) pendencias.push('Nome do cliente (módulo 01).')
  const alertas = [...c.hid.alertas.filter((x) => x.nivel === 'b' || x.nivel === 'w'), ...em.alertas.filter((x) => x.nivel === 'b' || x.nivel === 'w')]

  const exportarJson = () => {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' })
    const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = `${p.name.replace(/[^\w-]+/g, '_')}.json`; l.click()
    setTimeout(() => URL.revokeObjectURL(l.href), 1000)
  }
  const exportarCsv = () => {
    const blob = new Blob([csvRegas(p)], { type: 'text/csv;charset=utf-8' })
    const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = `plano-rega-${p.name.replace(/[^\w-]+/g, '_')}.csv`; l.click()
    setTimeout(() => URL.revokeObjectURL(l.href), 1000)
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-white p-4 print:hidden">
        <div><h1 className="text-2xl font-bold text-navy">Relatórios técnicos</h1><p className="text-mut">Memória descritiva e de cálculo · Projeto: <b>{p.name}</b></p></div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()}><Printer size={15} />Imprimir / guardar PDF</Button>
          <Button variant="outline" onClick={exportarCsv} disabled={!plano.regas.length}><Download size={15} />Calendário CSV</Button>
          <Button variant="outline" onClick={exportarJson}><Download size={15} />Projeto JSON</Button>
        </div>
      </div>
      <p className="mb-3 text-[.8rem] text-mut print:hidden">Em "Imprimir", escolha <b>Guardar como PDF</b> no destino da impressora. O relatório abaixo é o que será impresso.</p>

      <article className="min-w-0 overflow-hidden rounded-2xl border bg-white p-5 text-[.92rem] print:rounded-none print:border-0 print:p-0">
        <header className="flex items-center gap-4 border-b-2 border-navy pb-3">
          <img src={logo} alt="" className="h-14 w-auto" />
          <div className="flex-1">
            <div className="text-[.78rem] font-semibold uppercase tracking-widest text-brand">Imper Regas Lda · Pivot Engineering</div>
            <h1 className="text-2xl font-bold text-navy">Memória descritiva e de cálculo</h1>
            <div className="text-mut">{p.name}{p.client ? ` · ${p.client}` : ''}</div>
          </div>
          <div className="text-right text-[.8rem] text-mut">Emitido em<br /><b>{dataPT(new Date().toISOString().slice(0, 10))}</b></div>
        </header>

        <Sec n={1} titulo="Identificação do projeto">
          <Tab linhas={[['Projeto', p.name || '—'], ['Cliente', p.client || '—'], ['Localização', p.loc || '—'], ['Parcela', p.parcel || '—'], ['Área total', p.areaTot ? `${p.areaTot} ha` : '—'], ['Cultura', p.crop || a.crop || '—'], ['Origem da água', p.water || '—'], ['Técnico responsável', p.tech || '—']]} />
        </Sec>
        <Sec n={2} titulo="Caracterização da parcela">
          <Tab linhas={[['Dimensões', p.par.len && p.par.wid ? `${p.par.len} × ${p.par.wid} m` : '—'], ['Cotas (mín./máx.)', p.par.zmin || p.par.zmax ? `${p.par.zmin || '—'} / ${p.par.zmax || '—'} m` : '—'], ['Declive', p.par.slope ? `${p.par.slope} %` : '—'], ['Solo', p.par.soil], ['Infiltração', p.par.inf ? `${p.par.inf} mm/h` : '—'], ['Retenção', p.par.ret ? `${p.par.ret}` : '—'], ['Área da parcela coberta pelo pivot', parc ? `${fmt(parc.pct, 0)} % (${fmt(parc.inside, 2)} ha)` : '—']]} />
        </Sec>
        <Sec n={3} titulo="Dimensionamento geométrico">
          <Tab linhas={[['Vãos', `${g.n} (${g.sp.map((x) => fmt(x, 0)).join(' + ')} m)`], ['Balanço', `${fmt(g.lb, 0)} m`], ['Canhão final', g.G ? `${fmt(g.G, 0)} m` : 'sem canhão'], ['Comprimento do pivot L', `${fmt(g.L, 1)} m`], ['Raio irrigado R', `${fmt(g.R, 1)} m`], ['Setor', `${fmt(g.th, 0)}°`], ['Área irrigada', `${fmt(g.As, 2)} ha`]]} />
        </Sec>
        <Sec n={4} titulo="Dimensionamento agronómico">
          <Tab linhas={[['Cultura / fase de projeto', `${a.crop} · ${a.fases[a.fase]?.n ?? ''}`], ['ET0 de projeto', `${a.et0 || '—'} mm/dia`], ['Kc da fase', fmt(c.agro.kc, 2)], ['ETc', `${fmt(c.agro.etc, 2)} mm/dia`], ['Eficiência de aplicação', `${a.ef} %`], ['Necessidade bruta', `${fmt(c.agro.nbruta, 2)} mm/dia`], ['Volume diário', `${fmt(c.agro.m3dia, 0)} m³/dia`], ['Necessidade sazonal', c.agro.sazM3 !== null ? `${fmt(c.agro.sazMm, 0)} mm (${fmt(c.agro.sazM3, 0)} m³)` : '—'], ['RAW / TAW', `${fmt(c.agro.raw, 0)} / ${fmt(c.agro.taw, 0)} mm`], ['Intervalo máximo entre regas', `${fmt(c.agro.intervalo, 1)} dias`]]} />
        </Sec>
        <Sec n={5} titulo="Dimensionamento hidráulico">
          <p className="mb-2 text-sm">Caudal do sistema <b>{fmt(c.Q, 1)} m³/h</b> ({c.hid.origemQ ?? '—'}) · {p.hid.horas} h/dia · pressão no centro <b>{p.hid.pc} bar</b> · método {p.hid.method === 'DW' ? 'Darcy-Weisbach' : 'Hazen-Williams'}.</p>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr><th>Troço</th><th>Tipo</th><th>Material</th><th className="text-right">DN</th><th className="text-right">L (m)</th><th className="text-right">V (m/s)</th><th className="text-right">hf (m)</th></tr></thead>
            <tbody>{c.hid.trocos.map((r) => <tr key={r.t.id}><td>{r.t.name}</td><td>{TIPOS[r.t.kind].nome}</td><td>{r.t.mat}</td><td className="text-right">{r.t.mat === 'Personalizado' ? `Ø${r.t.idc}` : r.t.dn}</td><td className="text-right">{r.t.L || '—'}</td><td className="text-right">{r.p ? fmt(r.p.V, 2) : '—'}</td><td className="text-right">{r.p ? fmt(r.p.hf, 2) : '—'}</td></tr>)}</tbody>
          </table></div>
          <p className="mt-2 text-sm">Perdas contínuas {fmt(c.hid.somaHf, 2)} m · localizadas {fmt(c.hid.somaHl, 2)} m · necessidade de pressão da rede {c.hid.necessariaRede !== null ? `${fmt(c.hid.necessariaRede / BAR_M, 2)} bar` : '—'}{c.hid.margem !== null ? ` · margem ${fmt(c.hid.margem, 1)} m c.a.` : ''}.</p>
        </Sec>
        <Sec n={6} titulo="Aspersores e emissores">
          <Tab linhas={[['Emissor', [p.emit.tipo, p.emit.fab, p.emit.modelo, p.emit.bocal].filter(Boolean).join(' · ') || '—'], ['Espaçamento', `${p.emit.s} m`], ['Número de emissores', em.ok ? String(em.N) : '—'], ['Caudal por emissor (mín.–máx.)', em.ok ? `${fmt(em.qMin, 0)} – ${fmt(em.qMax, 0)} L/h` : '—'], ['Pressão (ponta–centro)', em.ok ? `${fmt(em.pMin, 2)} – ${fmt(em.pMax, 2)} bar` : '—'], ['Variação de pressão', em.ok ? `${fmt(em.varP, 0)} %` : '—'], ['Taxa de aplicação de pico', em.imax !== null ? `${fmt(em.imax, 0)} mm/h` : '—']]} />
        </Sec>
        <Sec n={7} titulo="Bombagem e energia">
          <Tab linhas={[['HMT total', c.Q ? `${fmt(c.hmt.total, 1)} m c.a.` : '—'], ['Potência absorvida', c.pot ? `${fmt(c.pot.Pa, 1)} kW` : '—'], ['Motor comercial', c.pot?.motor ? `${fmt(c.pot.motor, 1)} kW` : '—'], ['Potência elétrica consumida', c.pot ? `${fmt(c.pot.Pel, 1)} kW` : '—'], ['Energia específica', c.kwhM3 !== null ? `${fmt(c.kwhM3, 3)} kWh/m³` : '—'], ['Preço da energia', c.tarifa !== null ? `${fmt(c.tarifa, 3)} €/kWh` : '—']]} />
        </Sec>
        <Sec n={8} titulo="Planeamento da rega">
          {plano.ok ? (<>
            <Tab linhas={[['Critério', p.plan.modo === 'raw' ? `Esgotamento (gatilho ${p.plan.gatilho} % da RAW)` : `Intervalo fixo de ${p.plan.intervalo} dias`], ['Regas no ciclo', String(plano.regas.length)], ['Dotação média bruta', `${fmt(plano.dotMedia, 1)} mm`], ['Volume total', `${fmt(plano.totalM3, 0)} m³`], ['Horas de funcionamento', `${fmt(plano.totalHoras, 0)} h`], ['Energia / custo', plano.totalKwh !== null ? `${fmt(plano.totalKwh, 0)} kWh${plano.totalCusto !== null ? ` · ${fmt(plano.totalCusto, 0)} €` : ''}` : '—'], ['Dias com stress hídrico', String(plano.diasStress)]]} />
            <p className="mt-1 text-[.8rem] text-mut">Calendário completo disponível em CSV (módulo 08).</p></>)
            : <p className="text-sm text-mut">Informação em falta: {plano.falta.join(', ')}.</p>}
        </Sec>
        <Sec n={9} titulo="Simulação e cenários">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr><th>Cenário</th><th className="text-right">Caudal (m³/h)</th><th className="text-right">% do instalado</th><th className="text-right">Pot. elétrica (kW)</th><th className="text-right">Custo (€)</th></tr></thead>
            <tbody>{cen.lista.map((r) => <tr key={r.c.id}><td>{r.c.nome}</td><td className="text-right">{fmt(r.Q, 1)}</td><td className="text-right">{fmt(r.qRatio, 0)}</td><td className="text-right">{fmt(r.Pel, 1)}</td><td className="text-right">{fmt(r.custo, 0)}</td></tr>)}</tbody>
          </table></div>
        </Sec>
        <Sec n={10} titulo="Observações, alertas e pendências">
          {alertas.length > 0 && <ul className="mb-2 list-disc pl-5 text-sm">{alertas.map((x, i) => <li key={i}>{x.texto}</li>)}</ul>}
          {pendencias.length > 0 && <><b className="text-sm">Informação em falta:</b><ul className="list-disc pl-5 text-sm">{pendencias.map((x) => <li key={x}>{x}</li>)}</ul></>}
          {!alertas.length && !pendencias.length && <p className="text-sm">Sem alertas nem informação em falta.</p>}
          <p className="mt-3 text-[.78rem] text-mut">Os resultados são indicativos, obtidos com os dados e critérios acima, e devem ser validados por um técnico antes da instalação. Imper Regas Lda · Pivot Engineering.</p>
        </Sec>
      </article>
    </>
  )
}
