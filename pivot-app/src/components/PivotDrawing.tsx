import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import type { Projeto } from '../engine/types'
import { num, type ResGeo } from '../engine/geometry'

interface View { z: number; cx: number; cy: number }

function niceStep(v: number) {
  const e = Math.pow(10, Math.floor(Math.log10(v)))
  const m = v / e
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e
}

export function PivotDrawing({ p, c, onMove }: { p: Projeto; c: ResGeo; onMove: (ox: number, oy: number) => void }) {
  const ref = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ W: 600, H: 450 })
  const [view, setView] = useState<View>({ z: 1, cx: 0, cy: 0 })
  const fitted = useRef(false)
  const pts = useRef(new Map<number, [number, number]>())
  const mode = useRef<'pan' | 'ctr' | 'pinch' | null>(null)
  const last = useRef<[number, number]>([0, 0])
  const pd = useRef(0)

  const g = p.geo
  const ox = num(g.ox) ?? 0, oy = num(g.oy) ?? 0, st = num(g.start) ?? 0
  const len = num(p.par.len), wid = num(p.par.wid)
  const R = c.R

  const bounds = useCallback(() => {
    const r = R || 50
    const xs = [ox - r, ox + r, 0], ys = [oy - r, oy + r, 0]
    if (len && wid) { xs.push(-len / 2, len / 2); ys.push(-wid / 2, wid / 2) }
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  }, [R, ox, oy, len, wid])

  const fit = useCallback(() => {
    const b = bounds()
    setView({
      cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2,
      z: Math.min(size.W / ((b.x1 - b.x0) * 1.1), size.H / ((b.y1 - b.y0) * 1.1)),
    })
  }, [bounds, size])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const upd = () => setSize({ W: el.clientWidth || 600, H: el.clientHeight || 450 })
    upd()
    const ro = new ResizeObserver(upd)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => { if (!fitted.current && size.W > 0) { fit(); fitted.current = true } }, [fit, size])

  const { W, H } = size
  const s = view.z
  const tx = (X: number) => W / 2 + (X - view.cx) * s
  const ty = (Y: number) => H / 2 - (Y - view.cy) * s

  const zoom = (k: number, px = W / 2, py = H / 2) => setView((v) => {
    const wx = v.cx + (px - W / 2) / v.z, wy = v.cy - (py - H / 2) / v.z
    const z = Math.max(0.02, Math.min(80, v.z * k))
    return { z, cx: wx - (px - W / 2) / z, cy: wy + (py - H / 2) / z }
  })

  // roda do rato (precisa de listener não passivo)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const h = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', h, { passive: false })
    return () => el.removeEventListener('wheel', h)
  })

  const xy = (e: React.PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }
  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    ref.current!.setPointerCapture(e.pointerId)
    pts.current.set(e.pointerId, xy(e))
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()]
      pd.current = Math.hypot(a[0] - b[0], a[1] - b[1]); mode.current = 'pinch'
    } else {
      mode.current = (e.target as Element).id === 'ctr' ? 'ctr' : 'pan'
      last.current = xy(e)
    }
  }
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pts.current.has(e.pointerId)) return
    const q = xy(e)
    pts.current.set(e.pointerId, q)
    if (mode.current === 'pinch' && pts.current.size === 2) {
      const [a, b] = [...pts.current.values()]
      const d = Math.hypot(a[0] - b[0], a[1] - b[1])
      if (pd.current) zoom(d / pd.current, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
      pd.current = d
      return
    }
    const dx = q[0] - last.current[0], dy = q[1] - last.current[1]
    last.current = q
    if (mode.current === 'pan') setView((v) => ({ ...v, cx: v.cx - dx / v.z, cy: v.cy + dy / v.z }))
    else if (mode.current === 'ctr') onMove(+(ox + dx / s).toFixed(1), +(oy - dy / s).toFixed(1))
  }
  const up = (e: React.PointerEvent<SVGSVGElement>) => {
    pts.current.delete(e.pointerId)
    if (!pts.current.size) mode.current = null
    else if (mode.current === 'pinch') { mode.current = 'pan'; last.current = [...pts.current.values()][0] }
  }

  const pt = (r: number, a: number): [number, number] => {
    const rad = (a * Math.PI) / 180
    return [tx(ox + r * Math.sin(rad)), ty(oy + r * Math.cos(rad))]
  }

  const step = niceStep(60 / s)
  const gx0 = Math.floor((view.cx - W / 2 / s) / step) * step, gx1 = view.cx + W / 2 / s
  const gy0 = Math.floor((view.cy - H / 2 / s) / step) * step, gy1 = view.cy + H / 2 / s
  const vx: number[] = [], vy: number[] = []
  for (let X = gx0; X <= gx1 && vx.length < 400; X += step) vx.push(X)
  for (let Y = gy0; Y <= gy1 && vy.length < 400; Y += step) vy.push(Y)

  const th = c.th
  const full = th >= 359.99
  const ang = full ? st : st + th / 2
  const sw = Math.max(3, Math.min(7, s * 3))
  const tr = Math.max(3, Math.min(6, s * 4))
  const sb = niceStep(110 / s)

  let acc = 0
  const spans = c.sp.map((sp, i) => {
    const a = pt(acc, ang), b = pt(acc + sp, ang)
    acc += sp
    return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={i % 2 ? '#1677C8' : '#123B66'} strokeWidth={sw} />
  })
  const lbLine = c.lb > 0 ? (() => { const a = pt(acc, ang), b = pt(acc + c.lb, ang); return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#8aa2b8" strokeWidth={3} strokeDasharray="6 3" /> })() : null

  let sector: JSX.Element | null = null
  if (R > 0) {
    if (full) sector = <circle cx={tx(ox)} cy={ty(oy)} r={R * s} fill="#36A9D6" fillOpacity={0.22} stroke="#1677C8" strokeWidth={2} />
    else {
      const a0 = pt(R, st), a1 = pt(R, st + th)
      sector = <path d={`M${tx(ox)} ${ty(oy)} L${a0[0]} ${a0[1]} A${R * s} ${R * s} 0 ${th > 180 ? 1 : 0} 1 ${a1[0]} ${a1[1]} Z`} fill="#36A9D6" fillOpacity={0.25} stroke="#1677C8" strokeWidth={2} />
    }
  }
  const gunPt = c.G > 0 ? pt(c.L, ang) : null

  return (
    <div className="relative touch-none overflow-hidden rounded-[14px] border border-line bg-[#f7fbff]">
      <svg
        ref={ref} viewBox={`0 0 ${W} ${H}`}
        className="block h-[min(66vh,560px)] w-full cursor-grab active:cursor-grabbing"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      >
        {vx.map((X) => <line key={'x' + X} x1={tx(X)} y1={0} x2={tx(X)} y2={H} stroke="#e3ebf3" />)}
        {vy.map((Y) => <line key={'y' + Y} x1={0} y1={ty(Y)} x2={W} y2={ty(Y)} stroke="#e3ebf3" />)}
        {len && wid && <rect x={tx(-len / 2)} y={ty(wid / 2)} width={len * s} height={wid * s} fill="#fff8e6" fillOpacity={0.55} stroke="#c99a2e" strokeWidth={2} strokeDasharray="6 4" />}
        {sector}
        {c.G > 0 && c.L > 0 && <circle cx={tx(ox)} cy={ty(oy)} r={c.L * s} fill="none" stroke="#1677C8" strokeWidth={1.2} strokeDasharray="5 4" />}
        {spans}{lbLine}
        {c.towers.map((t) => { const a = pt(t.at, ang); return <circle key={t.n} cx={a[0]} cy={a[1]} r={tr} fill="#fff" stroke="#123B66" strokeWidth={2} /> })}
        {gunPt && <circle cx={gunPt[0]} cy={gunPt[1]} r={5} fill="#2fa56b" />}
        <circle id="ctr" cx={tx(ox)} cy={ty(oy)} r={9} fill="#ff8a1f" stroke="#fff" strokeWidth={3} style={{ cursor: 'move' }} />
        <text x={W - 12} y={22} textAnchor="end" fontSize={12} fill="#5d7389">N ↑</text>
        <line x1={16} y1={H - 16} x2={16 + sb * s} y2={H - 16} stroke="#123B66" strokeWidth={3} />
        <text x={16} y={H - 23} fontSize={12} fill="#123B66">{sb} m</text>
      </svg>
      <div className="absolute right-2.5 top-2.5 flex flex-col gap-1.5">
        {[{ i: <Plus size={18} />, f: () => zoom(1.3), t: 'Aumentar' }, { i: <Minus size={18} />, f: () => zoom(1 / 1.3), t: 'Diminuir' }, { i: <Maximize2 size={16} />, f: fit, t: 'Ajustar' }].map((b) => (
          <button key={b.t} type="button" title={b.t} aria-label={b.t} onClick={b.f} className="grid h-9 w-9 place-items-center rounded-[10px] border border-line bg-white text-navy">{b.i}</button>
        ))}
      </div>
      <div className="absolute bottom-2 right-2.5 rounded-lg bg-white/85 px-2 py-0.5 text-[.74rem] text-mut">1 px ≈ {(1 / s).toFixed(2)} m · R {Math.round(R)} m</div>
    </div>
  )
}
