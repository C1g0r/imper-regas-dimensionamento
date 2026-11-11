export interface Serie { nome: string; x: number[]; y: number[]; cor: string; tracejado?: boolean }
export interface Marca { x: number; y: number; cor: string; nome: string }

/** Gráfico de linhas simples em SVG (sem dependências). */
export function Grafico({ series, marcas = [], xLabel, yLabel, h = 240 }: { series: Serie[]; marcas?: Marca[]; xLabel: string; yLabel: string; h?: number }) {
  const W = 640, ml = 48, mr = 14, mt = 16, mb = 34
  const xs = series.flatMap((s) => s.x).concat(marcas.map((m) => m.x))
  const ys = series.flatMap((s) => s.y).concat(marcas.map((m) => m.y))
  if (!xs.length) return <p className="text-sm text-mut">Sem dados para o gráfico.</p>
  const x0 = Math.min(0, ...xs), x1 = Math.max(...xs) || 1, y0 = Math.min(0, ...ys), y1 = (Math.max(...ys) || 1) * 1.08
  const X = (v: number) => ml + ((v - x0) / (x1 - x0 || 1)) * (W - ml - mr)
  const Y = (v: number) => mt + (1 - (v - y0) / (y1 - y0 || 1)) * (h - mt - mb)
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${h}`} className="w-full" role="img" aria-label={`${yLabel} em função de ${xLabel}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={ml} x2={W - mr} y1={mt + t * (h - mt - mb)} y2={mt + t * (h - mt - mb)} stroke="#e3ebf3" />
            <text x={ml - 6} y={mt + t * (h - mt - mb) + 4} textAnchor="end" fontSize={10} fill="#5d7389">{(y1 - t * (y1 - y0)).toFixed(y1 > 20 ? 0 : 1)}</text>
            <text x={ml + t * (W - ml - mr)} y={h - 16} textAnchor="middle" fontSize={10} fill="#5d7389">{(x0 + t * (x1 - x0)).toFixed(x1 > 20 ? 0 : 1)}</text>
          </g>
        ))}
        {series.map((s) => (
          <path key={s.nome} d={s.x.map((v, i) => `${i ? 'L' : 'M'}${X(v).toFixed(1)} ${Y(s.y[i]).toFixed(1)}`).join(' ')} fill="none" stroke={s.cor} strokeWidth={2.2} strokeDasharray={s.tracejado ? '5 3' : undefined} />
        ))}
        {marcas.map((m) => <g key={m.nome}><circle cx={X(m.x)} cy={Y(m.y)} r={5.5} fill={m.cor} stroke="#fff" strokeWidth={2} /><text x={X(m.x) + 8} y={Y(m.y) - 8} fontSize={10} fill={m.cor}>{m.nome}</text></g>)}
        <text x={W / 2} y={h - 2} textAnchor="middle" fontSize={10} fill="#5d7389">{xLabel}</text>
        <text x={10} y={10} fontSize={10} fill="#5d7389">{yLabel}</text>
      </svg>
      <div className="flex flex-wrap gap-3 text-[.76rem] text-mut">
        {series.map((s) => <span key={s.nome} className="flex items-center gap-1"><i className="inline-block h-0.5 w-4" style={{ background: s.cor }} />{s.nome}</span>)}
      </div>
    </div>
  )
}
