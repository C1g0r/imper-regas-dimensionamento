import type { ReactNode } from 'react'
import type { Alerta } from '../engine/geometry'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card as ShCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { CountUp } from './anim'

export function Field(props: {
  label: string; value: string | number; onChange: (v: string) => void
  type?: string; readOnly?: boolean; placeholder?: string
}) {
  const t = props.type ?? 'text'
  return (
    <label className="block space-y-1">
      <Label asChild><span className="block">{props.label}</span></Label>
      <Input
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
    <label className="block space-y-1">
      <Label asChild><span className="block">{props.label}</span></Label>
      <select className="flex h-10 w-full rounded-[10px] border border-input bg-white px-3 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        {props.options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  )
}

/** `to` (opcional) faz o número contar até ao valor (GSAP); sem `to` mostra `value` tal como está. */
export function Kpi(props: { label: string; value: string; unit?: string; dim?: boolean; to?: number | null; dec?: number }) {
  const anim = typeof props.to === 'number' && Number.isFinite(props.to)
  return (
    <div className="rounded-[14px] border bg-gradient-to-b from-white to-[#f5f9fd] p-3.5">
      <small className="text-[.78rem] font-semibold text-muted-foreground">{props.label}</small>
      <b className={`mt-0.5 block text-2xl ${props.dim ? 'text-[#9db0c2]' : 'text-navy'}`}>
        {anim ? <CountUp to={props.to as number} dec={props.dec ?? 0} /> : props.value}{' '}
        {props.unit && <em className="text-[.85rem] font-semibold not-italic text-muted-foreground">{props.unit}</em>}
      </b>
    </div>
  )
}

const variantes = { i: 'info', w: 'warning', b: 'destructive', ok: 'success' } as const
export function Alertas({ lista }: { lista: Alerta[] }) {
  return (
    <div className="space-y-1.5">
      {lista.map((a, i) => (
        <Alert key={i} variant={variantes[a.nivel]}><AlertDescription>{a.texto}</AlertDescription></Alert>
      ))}
    </div>
  )
}

export function Card({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <ShCard>
      {title && <CardHeader><CardTitle>{title}</CardTitle></CardHeader>}
      <CardContent className={title ? 'pt-3' : undefined}>{children}</CardContent>
    </ShCard>
  )
}

export function Progresso({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="my-2 grid grid-cols-[100px_1fr_44px] items-center gap-2.5 text-sm sm:grid-cols-[130px_1fr_48px]">
      <span>{label}</span>
      <Progress value={pct} aria-label={label} />
      <b>{pct}%</b>
    </div>
  )
}
