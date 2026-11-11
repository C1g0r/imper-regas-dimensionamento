interface Props { curva: number[]; et0: number | null; fases: number[]; atual: number }

/** Curva de Kc (e ETc, se houver ET0) ao longo do ciclo, em SVG. */
export function CurvaKc({ curva, et0, fases, atual }: Props) {
  const W = 640, H = 220, ml = 44, mr = 44, mt = 14, mb = 30
  if (!curva.length) return <p className="text-sm text-mut">Indique a duração das fases para ver a curva.</p>
  const kmax = Math.max(1.4, ...curva) * 1.05
  const n = curva.length
  const x = (i: number) => ml + (i / Math.max(1, n - 1)) * (W - ml - mr)
  const yk = (k: number) => mt + (1 - k / kmax) * (H - mt - mb)
  const path = curva.map((k, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${yk(k).toFixed(1)}`).join(' ')
  const etcMax = et0 ? kmax * et0 : null
  const ye = (e: number) => mt + (1 - e / (etcMax as number)) * (H - mt - mb)
  const pathE = et0 ? curva.map((k, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${ye(k * et0).toFixed(1)}`).join(' ') : ''
  let acc = 0
  const lim = fases.map((d) => (acc += d))
  const nomes = ['Inicial', 'Desenv.', 'Intermédia', 'Final']
  const ini = [0, ...lim.slice(0, 3)]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Curva de Kc e ETc ao longo do ciclo">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}><line x1={ml} x2={W - mr} y1={mt + f * (H - mt - mb)} y2={mt + f * (H - mt - mb)} stroke="#e3ebf3" />
          <text x={ml - 6} y={mt + f * (H - mt - mb) + 4} textAnchor="end" fontSize={10} fill="#5d7389">{(kmax * (1 - f)).toFixed(1)}</text>
          {etcMax && <text x={W - mr + 6} y={mt + f * (H - mt - mb) + 4} fontSize={10} fill="#d98a00">{(etcMax * (1 - f)).toFixed(0)}</text>}
        </g>
      ))}
      {ini.map((i0, k) => fases[k] > 0 && (
        <g key={k}>
          <rect x={x(i0)} y={mt} width={Math.max(0, x(Math.min(n - 1, lim[k])) - x(i0))} height={H - mt - mb} fill={k === atual ? '#36A9D6' : 'transparent'} fillOpacity={0.14} />
          <text x={(x(i0) + x(Math.min(n - 1, lim[k]))) / 2} y={H - 12} textAnchor="middle" fontSize={10} fill="#5d7389">{nomes[k]}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#1677C8" strokeWidth={2.4} />
      {pathE && <path d={pathE} fill="none" stroke="#d98a00" strokeWidth={2} strokeDasharray="5 3" />}
      <text x={ml} y={10} fontSize={10} fill="#1677C8">Kc</text>
      {etcMax && <text x={W - mr + 6} y={10} fontSize={10} fill="#d98a00">ETc (mm/dia)</text>}
      <text x={W / 2} y={H - 1} textAnchor="middle" fontSize={10} fill="#5d7389">dias do ciclo ({n})</text>
    </svg>
  )
}
