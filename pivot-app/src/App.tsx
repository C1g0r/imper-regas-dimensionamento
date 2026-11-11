import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Clock } from 'lucide-react'
import logo from './assets/logo.png'
import type { Estado, Projeto } from './engine/types'
import { carregar, guardar } from './engine/storage'
import { Card } from './components/campos'
import { Button } from '@/components/ui/button'
import { Movimento, Transicao, motion } from './components/anim'
import { Projetos } from './modules/Projetos'
import { Parcela } from './modules/Parcela'
import { Geometria } from './modules/Geometria'
import { Agronomia } from './modules/Agronomia'
import { Hidraulica } from './modules/Hidraulica'
import { Emissores } from './modules/Emissores'
import { Bombagem } from './modules/Bombagem'
import { useBiblioteca } from './engine/library'

const MODS: [string, string, string, number, string?][] = [
  ['01', 'Projetos e explorações', 'Criar, editar e gerir projetos', 1],
  ['02', 'Caracterização da parcela', 'Localização, terreno e solo', 1],
  ['03', 'Dimensionamento geométrico', 'Raio, vãos, torres e área', 1],
  ['04', 'Dimensionamento agronómico', 'Culturas, ET0, Kc', 1],
  ['05', 'Dimensionamento hidráulico', 'Caudais, tubagens, perdas', 1],
  ['06', 'Aspersores e emissores', 'Débitos e distribuição', 1],
  ['07', 'Bombagem e energia', 'HMT, potência, consumo', 1],
  ['08', 'Planeamento da rega', 'Dotações e calendários', 0, 'Fase 5'],
  ['09', 'Simulação e análise', 'Cenários e desempenho', 0, 'Fase 5'],
  ['10', 'Relatórios técnicos', 'Memória descritiva, PDF', 0, 'Fase 6'],
]

export default function App() {
  const [estado, setEstadoRaw] = useState<Estado>(carregar)
  const [bib, setBib] = useBiblioteca()
  const [msg, setMsg] = useState('')
  const t = useRef<number>()
  const setEstado = useCallback((f: (e: Estado) => Estado) => setEstadoRaw(f), [])

  useEffect(() => {
    const ok = guardar(estado)
    setMsg(ok ? 'Guardado automaticamente' : 'Sem espaço para guardar')
    window.clearTimeout(t.current)
    t.current = window.setTimeout(() => setMsg(''), 1800)
  }, [estado])

  const projeto = estado.list.find((p) => p.id === estado.cur) ?? estado.list[0]
  const editar = useCallback(
    (patch: Partial<Projeto>) => setEstado((e) => ({ ...e, list: e.list.map((p) => (p.id === e.cur ? { ...p, ...patch } : p)) })),
    [setEstado],
  )
  const ir = (mod: string) => { setEstado((e) => ({ ...e, mod })); window.scrollTo({ top: 0 }) }
  const m = MODS.find((x) => x[0] === estado.mod) ?? MODS[0]

  return (
    <Movimento>
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-4 py-2.5">
          <a href="../" className="flex items-center gap-2.5 text-navy no-underline" aria-label="Imper Regas">
            <img src={logo} alt="Imper Regas" className="h-[38px] w-auto sm:h-[46px]" />
            <span><b className="block text-[1.1rem] tracking-wide">IMPER REGAS</b><small className="block font-semibold text-brand">Pivot Engineering</small></span>
          </a>
          <div className="flex-1" />
          <span className="text-[.8rem] text-mut" aria-live="polite">{msg}</span>
          <Button asChild variant="outline"><a href="../"><ArrowLeft size={16} />Dimensionamento</a></Button>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1400px] items-start gap-4 p-3 lg:grid-cols-[260px_minmax(0,1fr)] lg:p-[18px]">
        <aside className="flex gap-1.5 overflow-x-auto rounded-2xl bg-navy p-2 text-white lg:sticky lg:top-[84px] lg:block lg:p-3.5">
          <h3 className="mx-1.5 mb-2.5 mt-0.5 hidden text-[.78rem] uppercase tracking-[.12em] opacity-70 lg:block">Módulos</h3>
          {MODS.map((x) => {
            const on = x[0] === estado.mod
            return (
              <button key={x[0]} onClick={() => ir(x[0])}
                className={`relative flex w-auto shrink-0 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left lg:w-full ${on ? 'text-navy' : 'hover:bg-white/10'} ${x[3] ? '' : 'opacity-55'}`}>
                {on && <motion.span layoutId="modulo-ativo" className="absolute inset-0 rounded-xl bg-white" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <i className={`relative grid h-[26px] min-w-[26px] place-items-center rounded-lg text-[.8rem] font-bold not-italic ${on ? 'bg-brand text-white' : 'bg-white/15'}`}>{x[0]}</i>
                <span className="relative text-sm leading-tight">{x[1]}<small className="hidden text-[.72rem] opacity-65 lg:block">{x[3] ? x[2] : `${x[4]} · em breve`}</small></span>
              </button>
            )
          })}
        </aside>
        <main className="min-w-0">
          <Transicao chave={estado.mod}>
          {estado.mod === '01' && <Projetos estado={estado} projeto={projeto} setEstado={setEstado} editar={editar} />}
          {estado.mod === '02' && <Parcela projeto={projeto} editar={editar} />}
          {estado.mod === '03' && <Geometria projeto={projeto} editar={editar} />}
          {estado.mod === '04' && <Agronomia projeto={projeto} editar={editar} />}
          {estado.mod === '05' && <Hidraulica projeto={projeto} editar={editar} />}
          {estado.mod === '06' && <Emissores projeto={projeto} editar={editar} bib={bib} setBib={setBib} />}
          {estado.mod === '07' && <Bombagem projeto={projeto} editar={editar} bib={bib} setBib={setBib} />}
          {!m[3] && (
            <Card>
              <div className="px-5 py-10 text-center">
                <h1 className="mb-1 text-2xl font-bold text-navy">{m[0]} · {m[1]}</h1>
                <p className="mb-3.5 text-mut">{m[2]}</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3effa] px-3 py-1 text-[.8rem] font-bold text-brand"><Clock size={14} />Previsto para a {m[4]}</span>
                <p className="mt-3.5 text-[.8rem] text-mut">Este módulo vai usar automaticamente a área e a geometria calculadas no módulo 03.</p>
              </div>
            </Card>
          )}
          </Transicao>
        </main>
      </div>
      <footer className="px-4 pb-8 pt-2.5 text-center text-[.78rem] text-mut">
        Imper Regas Lda · Pivot Engineering v1.2 · Os resultados são indicativos e devem ser validados por um técnico antes da instalação.
      </footer>
    </Movimento>
  )
}
