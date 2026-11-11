# Pivot Engineering (React + Vite + Tailwind + shadcn/ui + Motion + GSAP)

Módulos 01–07 implementados (projetos, parcela, geometria, agronomia, hidráulica, emissores, bombagem);
08–10 preparados na navegação (`src/App.tsx`). Os dados ficam no navegador (chaves `ir_pivot` e `ir_pivot_lib`).

## Como é publicado

O GitHub compila sozinho (`.github/workflows/build-pivot.yml`) sempre que algo em `pivot-app/` muda e guarda o
resultado em `pivot/` (servido em `/pivot/`). Também pode correr à mão em Actions → Compilar Pivot Engineering → Run workflow.
A verificação de tipos e os testes correm, mas só avisam: não impedem a publicação.

## Compilar no computador (opcional, Node 18+)

```bash
cd pivot-app
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tipos
npm test           # testes dos cálculos
npm run build      # gera ../pivot/
```

## Estrutura

- `src/engine/` motor de cálculo (sem React): geometria, agronomia, hidráulica, emissores, bombagem, armazenamento
- `src/components/ui/` componentes shadcn/ui (button, card, input, label, badge, alert, progress, separator, table)
- `src/components/campos.tsx` campos, KPIs, alertas e cartões (usam o shadcn/ui)
- `src/components/anim.tsx` Motion (transição entre módulos, indicador do menu) e GSAP (contagem animada dos números)
- `src/modules/` um ficheiro por módulo
- `components.json` e `src/lib/utils.ts`: configuração do shadcn/ui (para acrescentar componentes: `npx shadcn@latest add <nome>`)
- Tokens de cor do shadcn em `src/index.css`, ligados à paleta Imper Regas
