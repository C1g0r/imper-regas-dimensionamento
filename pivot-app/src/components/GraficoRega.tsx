import type { DiaSim } from '../engine/plan'

/** Esgotamento do solo ao longo do ciclo, com RAW/TAW e marcas nos dias de rega (SVG). */
export function GraficoRega({ dias, raw, taw, h = 220 }: { dias: DiaSim[]; raw: number; taw: number; h?: number }) {
  const W = 640, ml = 44, mr = 12, mt = 14, mb = 28
  const n = dias.length
  if (!n) return null
  const ymax = taw * 1.08
  const X = (d: number) => ml + ((d - 1) / Math.max(1, n - 1)) * (W - ml - mr)
  const Y = (v: number) => mt + (1 - v / ymax) * (h - mt - mb)
  const linha = dias.map((d, i) => `${i ? 'L' : 'M'}${X(d.dia).toFixed(1)} ${Y(d.dr).toFixed(1)}`).join(' ')
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${h}`} className="w-full" role="img" aria-label="Esgotamento do solo ao longo do ciclo">
        {[0, 0.5, 1].map((t) => <g key={t}><line x1={ml} x2={W - mr} y1={Y(taw * t)} y2={Y(taw * t)} stroke="#e3ebf3" /><text x={ml - 6} y={Y(taw * t) + 4} textAnchor="end" fontSize={10} fill="#5d7389">{(taw * t).toFixed(0)}</text></g>)}
        <line x1={ml} x2={W - mr} y1={Y(raw)} y2={Y(raw)} stroke="#d98a00" strokeDasharray="5 3" />
        <text x={W - mr} y={Y(raw) - 4} textAnchor="end" fontSize={10} fill="#d98a00">RAW {raw.toFixed(0)} mm</text>
        <text x={W - mr} y={Y(taw) - 4} textAnchor="end" fontSize={10} fill="#b3261e">TAW {taw.toFixed(0)} mm</text>
        <path d={linha} fill="none" stroke="#1677C8" strokeWidth={2} />
        {dias.filter((d) => d.rega).map((d) => <line key={d.dia} x1={X(d.dia)} x2={X(d.dia)} y1={h - mb} y2={h - mb - 10} stroke="#1d9a5b" strokeWidth={2.5} />)}
        {[1, Math.round(n / 2), n].map((d) => <text key={d} x={X(d)} y={h - 12} textAnchor="middle" fontSize={10} fill="#5d7389">dia {d}</text>)}
        <text x={10} y={10} fontSize={10} fill="#5d7389">esgotamento (mm)</text>
      </svg>
      <div className="flex flex-wrap gap-3 text-[.76rem] text-mut">
        <span className="flex items-center gap-1"><i className="inline-block h-0.5 w-4 bg-[#1677C8]" />Esgotamento</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-0.5 bg-[#1d9a5b]" />Dia de rega</span>
      </div>
    </div>
  )
}
