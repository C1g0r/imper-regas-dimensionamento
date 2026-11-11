import { useCallback, useState } from 'react'
import type { Biblioteca } from './types'

// Biblioteca global (partilhada por todos os projetos) de emissores e bombas.
export const KEY_LIB = 'ir_pivot_lib'

export function carregarBib(): Biblioteca {
  try {
    const d = JSON.parse(localStorage.getItem(KEY_LIB) || 'null')
    if (d) return { emit: Array.isArray(d.emit) ? d.emit : [], bombas: Array.isArray(d.bombas) ? d.bombas : [] }
  } catch { /* ignora */ }
  return { emit: [], bombas: [] }
}

export function useBiblioteca(): [Biblioteca, (f: (b: Biblioteca) => Biblioteca) => void] {
  const [bib, setBib] = useState<Biblioteca>(carregarBib)
  const alterar = useCallback((f: (b: Biblioteca) => Biblioteca) => {
    setBib((b) => {
      const n = f(b)
      try { localStorage.setItem(KEY_LIB, JSON.stringify(n)) } catch { /* ignora */ }
      return n
    })
  }, [])
  return [bib, alterar]
}
