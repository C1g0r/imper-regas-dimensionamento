import { useRef, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

/** Respeita "reduzir movimento" do sistema em todas as animações do Motion. */
export function Movimento({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}

/** Transição suave ao mudar de módulo (Motion). */
export function Transicao({ chave, children }: { chave: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={chave}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/** Número que "conta" até ao valor novo (GSAP). Sem movimento se o sistema o pedir. */
export function CountUp({ to, dec = 0 }: { to: number; dec?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef<number | null>(null)
  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      const fmt = (v: number) => v.toLocaleString('pt-PT', { minimumFractionDigits: dec, maximumFractionDigits: dec })
      const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduzir || prev.current === null) {
        el.textContent = fmt(to)
        prev.current = to
        return
      }
      const o = { v: prev.current }
      gsap.to(o, {
        v: to,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: () => { el.textContent = fmt(o.v) },
        onComplete: () => { prev.current = to },
      })
    },
    { dependencies: [to, dec], scope: ref },
  )
  return <span ref={ref} />
}

export { motion }
