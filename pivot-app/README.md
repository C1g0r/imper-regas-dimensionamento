# Pivot Engineering (React + Vite + Tailwind + Lucide)

Versão React/TypeScript do módulo Pivot Engineering v1.0. Usa os mesmos projetos guardados no navegador
(chave `ir_pivot`) que a versão `pivot.html`.

## Compilar no Mac (precisa de Node 18 ou mais recente)

```bash
cd pivot-app
npm install
npm run dev        # desenvolvimento em http://localhost:5173
npm test           # testes dos cálculos (src/engine/geometry.test.ts)
npm run build      # compila para ../pivot/
```

Depois do `npm run build`, a pasta `pivot/` na raiz do repositório contém o site compilado.
Faça commit e push dessa pasta (e das alterações) para publicar no GitHub Pages em `/pivot/`.

## Estrutura

- `src/engine/` motor de cálculo (sem React): geometria, parcela, alertas, progresso, armazenamento
- `src/components/` componentes visuais (desenho SVG do pivot, campos, alertas)
- `src/modules/` módulos 01 Projetos, 02 Parcela, 03 Geometria
- Módulos 04–10 estão preparados na navegação (`src/App.tsx`) e ainda por implementar
