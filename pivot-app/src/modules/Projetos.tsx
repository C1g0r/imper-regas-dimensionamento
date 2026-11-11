import { useRef, useState } from 'react'
import { Copy, Archive, Trash2, FolderOpen, Plus, Download, Upload } from 'lucide-react'
import type { Estado, Projeto } from '../engine/types'
import { calcGeo, fmt } from '../engine/geometry'
import { hoje, normalizar, novoProjeto, uid } from '../engine/storage'
import { Card, Field, Kpi, Progresso, Select } from '../components/ui'
import { progresso } from '../engine/progress'

interface Props {
  estado: Estado
  projeto: Projeto
  setEstado: (f: (e: Estado) => Estado) => void
  editar: (patch: Partial<Projeto>) => void
}

export function Projetos({ estado, projeto: p, setEstado, editar }: Props) {
  const c = calcGeo(p.geo)
  const pg = progresso(p)
  const [arq, setArq] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const lista = estado.list.filter((q) => arq || !q.arch)

  const novo = () => {
    const n = window.prompt('Nome do novo projeto:', 'Novo projeto')
    if (n === null) return
    const q = novoProjeto(n.trim() || 'Novo projeto')
    setEstado((e) => ({ ...e, list: [q, ...e.list], cur: q.id }))
  }
  const duplicar = (q: Projeto) => {
    const d: Projeto = { ...JSON.parse(JSON.stringify(q)), id: uid(), name: q.name + ' (cópia)', created: hoje(), arch: 0 }
    setEstado((e) => { const i = e.list.findIndex((x) => x.id === q.id); const l = [...e.list]; l.splice(i + 1, 0, d); return { ...e, list: l, cur: d.id } })
  }
  const arquivar = (q: Projeto) => {
    if (!q.arch && estado.list.filter((x) => !x.arch).length < 2) { window.alert('Tem de existir pelo menos um projeto ativo.'); return }
    setEstado((e) => {
      const list = e.list.map((x) => (x.id === q.id ? { ...x, arch: x.arch ? 0 : 1 } : x))
      const cur = e.cur === q.id && !q.arch ? (list.find((x) => !x.arch) ?? list[0]).id : e.cur
      return { ...e, list, cur }
    })
  }
  const apagar = (q: Projeto) => {
    if (estado.list.length < 2) { window.alert('Tem de existir pelo menos um projeto.'); return }
    if (!window.confirm(`Apagar o projeto "${q.name}"? Esta ação não se pode desfazer.`)) return
    setEstado((e) => {
      const list = e.list.filter((x) => x.id !== q.id)
      const cur = e.cur === q.id ? (list.find((x) => !x.arch) ?? list[0]).id : e.cur
      return { ...e, list, cur }
    })
  }
  const exportar = () => {
    const b = new Blob([JSON.stringify({ app: 'imper-regas-pivot', v: 1, list: estado.list }, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b); a.download = `pivot-projetos-${hoje()}.json`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const importar = (f: File) => {
    const r = new FileReader()
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result))
        if (!Array.isArray(d.list) || !d.list.length) throw new Error('vazio')
        const novos = (d.list as Projeto[]).map((q) => ({ ...normalizar(q), id: uid() }))
        setEstado((e) => ({ ...e, list: [...e.list, ...novos] }))
      } catch { window.alert('Ficheiro inválido.') }
    }
    r.readAsText(f)
  }

  return (
    <>
      <Card>
        <h1 className="mb-1 text-2xl font-bold text-navy">Centro de dimensionamento</h1>
        <p className="mb-3.5 text-mut">Projeto ativo: <b>{p.name}</b>{p.client && ` · ${p.client}`}</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Área irrigada" value={fmt(c.As, 2)} unit="ha" />
          <Kpi label="Raio do pivot" value={fmt(c.R, 0)} unit="m" />
          <Kpi label="Caudal de projeto" value="—" unit="m³/h" dim />
          <Kpi label="Potência estimada" value="—" unit="kW" dim />
        </div>
        <h3 className="mb-2 mt-4 text-[.95rem] font-bold text-navy">Progresso do dimensionamento</h3>
        <Progresso label="Projeto" pct={pg.proj} /><Progresso label="Parcela" pct={pg.par} /><Progresso label="Geometria" pct={pg.geo} />
        <Progresso label="Agronomia" pct={0} /><Progresso label="Hidráulica" pct={0} /><Progresso label="Bombagem" pct={0} />
      </Card>

      <Card title="Ficha do projeto">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nome do projeto" value={p.name} onChange={(v) => editar({ name: v })} />
          <Field label="Cliente / exploração" value={p.client} onChange={(v) => editar({ client: v })} />
          <Field label="Localização" value={p.loc} onChange={(v) => editar({ loc: v })} />
          <Field label="Identificação da parcela" value={p.parcel} onChange={(v) => editar({ parcel: v })} />
          <Field label="Área total da exploração (ha)" type="number" value={p.areaTot} onChange={(v) => editar({ areaTot: v })} />
          <Field label="Tipo de cultura" value={p.crop} onChange={(v) => editar({ crop: v })} />
          <Select label="Fonte de abastecimento" value={p.water} options={['Furo', 'Barragem', 'Canal', 'Reservatório', 'Rede pública']} onChange={(v) => editar({ water: v })} />
          <Field label="Técnico responsável" value={p.tech} onChange={(v) => editar({ tech: v })} />
          <Field label="Data de criação" type="date" value={p.created} onChange={(v) => editar({ created: v })} />
        </div>
      </Card>

      <Card>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-navy">Projetos</h2>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button className="btn btn-s" onClick={novo}><Plus size={14} />Novo projeto</button>
            <button className="btn btn-g btn-s" onClick={() => fileRef.current?.click()}><Upload size={14} />Importar</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = '' }} />
            <button className="btn btn-g btn-s" onClick={exportar}><Download size={14} />Exportar cópia</button>
            <label className="flex items-center gap-1 text-[.8rem] text-mut"><input type="checkbox" checked={arq} onChange={(e) => setArq(e.target.checked)} />Ver arquivados</label>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th>Projeto</th><th>Cliente</th><th>Criado</th><th className="text-right">Área (ha)</th><th /></tr></thead>
            <tbody>
              {lista.map((q) => (
                <tr key={q.id} className={q.id === estado.cur ? 'bg-[#eef5fc]' : ''}>
                  <td><b>{q.name}</b>{q.arch ? <span className="ml-1.5 rounded-full bg-[#fdf0d4] px-2 py-0.5 text-[.74rem] font-bold text-[#a86b00]">arquivado</span> : null}</td>
                  <td>{q.client}</td><td>{q.created}</td>
                  <td className="text-right">{fmt(calcGeo(q.geo).As, 2)}</td>
                  <td className="print:hidden">
                    <div className="flex gap-1.5">
                      <button className="btn btn-s" onClick={() => setEstado((e) => ({ ...e, cur: q.id }))}><FolderOpen size={13} />Abrir</button>
                      <button className="btn btn-g btn-s" title="Duplicar" onClick={() => duplicar(q)}><Copy size={13} /></button>
                      <button className="btn btn-g btn-s" title={q.arch ? 'Repor' : 'Arquivar'} onClick={() => arquivar(q)}><Archive size={13} /></button>
                      <button className="btn btn-d btn-s" title="Apagar" onClick={() => apagar(q)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!lista.length && <tr><td colSpan={5} className="p-6 text-center text-mut">Sem projetos.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
