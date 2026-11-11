# Motor de cálculo do Pivot Engineering

Código-fonte (TypeScript) do motor de cálculo usado em `pivot.html`: geometria, agronomia, hidráulica,
emissores e bombagem, mais os testes (`*.test.ts`). A interface está escrita diretamente em `pivot.html`.

Para atualizar o motor dentro de `pivot.html` é preciso voltar a gerar o pacote (esbuild):

```
esbuild entry.ts --bundle --format=iife --global-name=E --target=es2018 --outfile=motor.js
```

e colar o resultado no início do script de `pivot.html`.
