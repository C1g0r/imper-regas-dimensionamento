import { useMemo } from 'react'
import type { Agro, Projeto } from '../engine/types'
import { AWC_TIPICO, CULTURAS, calcAgro, kcFase } from '../engine/agro'
import { calcGeo, fmt, num, type Alerta } from '../engine/geometry'
import { Alertas, Card, Field, Kpi, Select } from '../components/ui'
import { CurvaKc } from '../components/CurvaKc'

export function Agronomia({ projeto: p, editar }: { projeto: Projeto; editar: (patch: Partial<Projeto>) => void }) {
  const a = p.agro
  const area = useMemo(() => calcGeo(p.geo).As, [p.geo])
  const awcSolo = AWC_TIPICO[p.par.soil] ?? null
  const r = useMemo(() => calcAgro(a, area, awcSolo), [a, area, awcSolo])
  const set = (patch: Partial<Agro>) => editar({ agro: { ...a, ...patch } })
  const setFase = (i: number, k: 'd' | 'kc', v: string) => set({ fases: a.fases.map((f, j) => (j === i ? { ...f, [k]: v } : f)) })
  const trocarCultura = (c: string) => {
    const d = CULTURAS[c]
    set({ crop: c, zr: d.zr, fases: d.fases.map((f) => ({ ...f })) })
  }
  const al: Alerta[] = []
  if (num(a.et0) === null) al.push({ nivel: 'i', texto: 'Informação em falta: ET0 de projeto.' })
  if (!(area > 0)) al.push({ nivel: 'i', texto: 'Informação em falta: área irrigada (complete o módulo 03).' })
  if ((num(a.ef) ?? 0) <= 0 || (num(a.ef) ?? 0) > 100) al.push({ nivel: 'b', texto: 'A eficiência de aplicação tem de estar entre 0 e 100 %.' })
  else if ((num(a.ef) ?? 0) > 95) al.push({ nivel: 'w', texto: 'Eficiência de aplicação superior a 95 %: valor pouco realista para aspersão.' })
  if ((num(a.p) ?? 0) <= 0 || (num(a.p) ?? 0) > 1) al.push({ nivel: 'b', texto: 'A fração de esgotamento permitida tem de estar entre 0 e 1.' })
  if (r.etc !== null && r.nliq === 0) al.push({ nivel: 'i', texto: 'A precipitação efetiva cobre a evapotranspiração: sem necessidade líquida de rega.' })
  if (r.nbruta !== null && r.nbruta > 12) al.push({ nivel: 'w', texto: 'Necessidade bruta superior a 12 mm/dia: confirmar ET0, Kc e eficiência.' })
  if (r.intervalo !== null && r.intervalo < 2) al.push({ nivel: 'w', texto: `Intervalo máximo entre regas de apenas ${fmt(r.intervalo, 1)} dias: solo de baixa retenção ou raízes curtas; exige regas frequentes.` })
  if (r.taw === null) al.push({ nivel: 'i', texto: 'Informação em falta: água disponível no solo (mm/m) ou tipo de solo no módulo 02.' })
  else if (!num(a.awc)) al.push({ nivel: 'i', texto: `Usado um valor típico de ${awcSolo} mm/m para solo ${p.par.soil.toLowerCase()}. Confirme com análise do solo.` })
  if (!al.some((x) => x.nivel !== 'ok' && x.nivel !== 'i')) al.push({ nivel: 'ok', texto: 'Parâmetros agronómicos coerentes com os critérios definidos. Os valores de Kc são de referência e devem ser ajustados à cultura e região.' })
  const fasesD = a.fases.map((f) => Math.round(num(f.d) ?? 0))
  const kcs = a.fases.map((_, i) => kcFase(a.fases, i))

  return (
    <>
      <Card>
        <h1 className="mb-1 text-2xl font-bold text-navy">Dimensionamento agronómico</h1>
        <p className="mb-3.5 text-mut">Necessidades hídricas da cultura · Projeto: <b>{p.name}</b> · Área irrigada: <b>{fmt(area, 2)} ha</b></p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="ETc de projeto" value={fmt(r.etc, 2)} unit="mm/dia" />
          <Kpi label="Necessidade líquida" value={fmt(r.nliq, 2)} unit="mm/dia" />
          <Kpi label="Necessidade bruta" value={fmt(r.nbruta, 2)} unit="mm/dia" />
          <Kpi label="Volume diário" value={fmt(r.m3dia, 0)} unit="m³/dia" />
        </div>
      </Card>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <Card title="Dados de entrada">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Cultura" value={a.crop} options={Object.keys(CULTURAS)} onChange={trocarCultura} />
              <Field label="Variedade" value={a.variety} onChange={(v) => set({ variety: v })} />
              <Field label="Data de sementeira / plantação" type="date" value={a.plantDate} onChange={(v) => set({ plantDate: v })} />
              <label className="lbl">Fase usada no dimensionamento
                <select className="inp" value={a.fase} onChange={(e) => set({ fase: Number(e.target.value) })}>
                  {a.fases.map((f, i) => <option key={i} value={i}>{f.n}{i === 2 ? ' (pico)' : ''}</option>)}
                </select>
              </label>
              <Field label="ET0 de projeto (mm/dia)" type="number" value={a.et0} onChange={(v) => set({ et0: v })} />
              <Field label="ET0 média do ciclo (mm/dia)" type="number" value={a.et0m} placeholder="igual à de projeto" onChange={(v) => set({ et0m: v })} />
              <Field label="Precipitação efetiva (mm/dia)" type="number" value={a.pe} onChange={(v) => set({ pe: v })} />
              <Field label="Eficiência de aplicação (%)" type="number" value={a.ef} onChange={(v) => set({ ef: v })} />
              <Field label="Profundidade radicular (m)" type="number" value={a.zr} onChange={(v) => set({ zr: v })} />
              <Field label="Água disponível no solo (mm/m)" type="number" value={a.awc} placeholder={awcSolo ? `típico: ${awcSolo}` : ''} onChange={(v) => set({ awc: v })} />
              <Field label="Fração de esgotamento permitida (0–1)" type="number" value={a.p} onChange={(v) => set({ p: v })} />
            </div>
          </Card>
          <Card title="Fases de desenvolvimento">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><th>Fase</th><th className="text-right">Duração (dias)</th><th className="text-right">Kc</th><th className="text-right">Kc médio da fase</th></tr></thead>
                <tbody>
                  {a.fases.map((f, i) => (
                    <tr key={i} className={i === a.fase ? 'bg-[#eef5fc]' : ''}>
                      <td>{f.n}</td>
                      <td className="text-right"><input className="w-20 rounded-lg border border-line px-2 py-1.5 text-right" type="number" inputMode="decimal" value={f.d} onChange={(e) => setFase(i, 'd', e.target.value)} /></td>
                      <td className="text-right">{i === 1 ? <span className="text-mut">interpolado</span> : <input className="w-20 rounded-lg border border-line px-2 py-1.5 text-right" type="number" step="any" inputMode="decimal" value={f.kc} onChange={(e) => setFase(i, 'kc', e.target.value)} />}</td>
                      <td className="text-right">{fmt(kcs[i], 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[.8rem] text-mut">Valores de Kc de referência (tipo FAO-56), editáveis. Em Kc da fase final indique o valor no fim do ciclo.</p>
          </Card>
        </div>
        <div className="min-w-0">
          <Card title="Curva de necessidades ao longo do ciclo">
            <CurvaKc curva={r.curva} et0={num(a.et0m) ?? num(a.et0)} fases={fasesD} atual={a.fase} />
          </Card>
          <Card title="Resultados">
            <div className="overflow-x-auto">
              <table className="w-full text-sm"><tbody>
                {([
                  ['Kc da fase selecionada', fmt(r.kc, 2), ''], ['ETc = ET0 × Kc', fmt(r.etc, 2), 'mm/dia'],
                  ['Necessidade líquida = ETc − Pe', fmt(r.nliq, 2), 'mm/dia'], ['Necessidade bruta = Nliq ÷ eficiência', fmt(r.nbruta, 2), 'mm/dia'],
                  ['Necessidade bruta semanal', fmt(r.semanal, 1), 'mm/semana'], ['Volume diário', fmt(r.m3dia, 0), 'm³/dia'],
                  ['Volume semanal', fmt(r.m3semana, 0), 'm³/semana'], [`Necessidade sazonal (${r.ciclo} dias)`, fmt(r.sazMm, 0), 'mm'],
                  ['Volume sazonal', fmt(r.sazM3, 0), 'm³'], ['Reserva total do solo (TAW)', fmt(r.taw, 0), 'mm'],
                  ['Reserva facilmente utilizável (RAW)', fmt(r.raw, 0), 'mm'], ['Intervalo máximo entre regas', fmt(r.intervalo, 1), 'dias'],
                ] as [string, string, string][]).map((x) => <tr key={x[0]}><td>{x[0]}</td><td className="text-right"><b>{x[1]}</b> <span className="text-mut">{x[2]}</span></td></tr>)}
              </tbody></table>
            </div>
            <p className="mt-2 text-[.8rem] text-mut">Fórmulas: ETc = ET0 × Kc · Nliq = ETc − Pe · Nbruta = Nliq ÷ Ef · m³ = mm × ha × 10 · RAW = awc × Zr × p. A necessidade sazonal usa a ET0 média do ciclo e a Pe diária constante.</p>
          </Card>
          <Card title="Alertas e validações"><Alertas lista={al} /></Card>
        </div>
      </div>
    </>
  )
}
