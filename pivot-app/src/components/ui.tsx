import type { ReactNode } from 'react'
import type { Alerta } from '../engine/geometry'

export function Field(props: {
  label: string; value: string | number; onChange: (v: string) => void
  type?: string; readOnly?: boolean; placeholder?: string
}) {
  const t = props.type ?? 'text'
  return (
    <label className="lbl">
      {props.label}
      <input
        className="inp"
        type={t}
        step={t === 'number' ? 'any' : undefined}
        inputMode={t === 'number' ? 'decimal' : undefined}
        value={props.value}
        readOnly={props.readOnly}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  )
}

export function Select(props: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="lbl">
      {props.label}
      <select className="inp" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        {props.options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  )
}

export function Kpi(props: { label: string; value: string; unit?: string; dim?: boolean }) {
  return (
    <div className="rounded-[14px] border border-line bg-gradient-to-b from-white to-[#f5f9fd] p-3.5">
      <small className="text-[.78rem] font-semibold text-mut">{props.label}</small>
      <b className={`mt-0.5 block text-2xl ${props.dim ? 'text-[#9db0c2]' : 'text-navy'}`}>
        {props.value} {props.unit && <em className="text-[.85rem] font-semibold not-italic text-mut">{props.unit}</em>}
      </b>
    </div>
  )
}

const cores: Record<string, string> = {
  i: 'bg-[#eef5fc] border-[#cfe2f4]', w: 'bg-[#fff7e6] border-[#f3dba7]',
  b: 'bg-[#fdeeee] border-[#f0c8c8]', ok: 'bg-[#e9f7f0] border-[#bfe5d1]',
}
export function Alertas({ lista }: { lista: Alerta[] }) {
  return <div>{lista.map((a, i) => <div key={i} className={`my-1.5 rounded-xl border px-3 py-2.5 text-sm ${cores[a.nivel]}`}>{a.texto}</div>)}</div>
}

export function Card({ children, title }: { children: ReactNode; title?: string }) {
  return <section className="card">{title && <h2 className="mb-3 text-lg font-bold text-navy">{title}</h2>}{children}</section>
}

export function Progresso({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="my-2 grid grid-cols-[100px_1fr_44px] items-center gap-2.5 text-sm sm:grid-cols-[130px_1fr_48px]">
      <span>{label}</span>
      <div className="h-[9px] overflow-hidden rounded-full bg-[#e4ecf4]">
        <i className="block h-full rounded-full bg-gradient-to-r from-brand to-sky" style={{ width: `${pct}%` }} />
      </div>
      <b>{pct}%</b>
    </div>
  )
}
