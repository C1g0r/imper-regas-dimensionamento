# Imper Regas Lda | Dimensionamento

Aplicação para a equipa comercial dimensionar **bombas**, **rega e tubagem** e **aspersão / pulverizadores e bicos**, com base nos catálogos de bombas 2025 e de rega Cudell 2026.

É um site de uma só página (`index.html`), sem servidor nem base de dados. Funciona no telemóvel, tablet e computador e, depois de aberta uma vez com internet, também **sem internet**.

> ⚠️ O ficheiro contém **preços de tabela** e códigos dos catálogos. Mantenha o repositório **privado** e partilhe apenas com colegas.

## Publicar no GitHub (uma vez)

1. Crie uma conta em <https://github.com> (se ainda não tiver).
2. Clique em **New repository** → nome `imper-regas-dimensionamento` → escolha **Private** → **Create repository**.
3. Na página do repositório, clique em **uploading an existing file** e arraste **todos os ficheiros desta pasta** (incluindo `.nojekyll`). Clique em **Commit changes**.
4. Vá a **Settings → Pages**. Em *Build and deployment*, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)` e **Save**.
   - O GitHub Pages em repositórios privados exige um plano pago (Pro/Team). Com a conta gratuita só funciona em repositórios públicos; nesse caso use a secção *Alternativa sem GitHub Pages*.
5. Passado cerca de 1 minuto, o endereço aparece em Settings → Pages, no formato  
   `https://O-SEU-UTILIZADOR.github.io/imper-regas-dimensionamento/`
6. Envie esse endereço aos colegas.

## Instalar no telemóvel ou computador

- **Android (Chrome):** abrir o endereço → menu ⋮ → *Instalar aplicação* / *Adicionar ao ecrã principal*.
- **iPhone (Safari):** abrir o endereço → botão Partilhar → *Adicionar ao ecrã principal*.
- **Computador (Chrome/Edge):** ícone de instalar na barra de endereço.

Fica com o ícone da Imper Regas e abre como uma aplicação, mesmo sem internet.

## Alternativa sem GitHub Pages (ficheiro único)

O `index.html` funciona sozinho: basta enviá-lo por e-mail, WhatsApp ou pen e abri-lo no navegador. Esta cópia não se atualiza sozinha; quando houver versão nova, envie o novo ficheiro.

## Atualizar para uma nova versão

1. No repositório, **Add file → Upload files** e substitua o `index.html`.
2. **Commit changes**. Em 1–2 minutos o endereço passa a mostrar a versão nova.
3. (Opcional) Em `sw.js`, mude `imper-regas-v1` para `imper-regas-v2`, etc., para forçar a atualização nos aparelhos que já instalaram a app.

## Conteúdo

| Ficheiro | Para que serve |
|---|---|
| `index.html` | A aplicação completa (dados, imagens e lógica) |
| `manifest.webmanifest`, `icon-192.png`, `icon-512.png` | Permitem instalar como aplicação |
| `sw.js` | Guarda a app para funcionar sem internet |
| `.nojekyll` | Diz ao GitHub Pages para servir os ficheiros tal como estão |

## Notas

- Os valores são **estimativas de apoio à venda**. Confirmar sempre a curva e o preço atuais no catálogo.
- Quatro códigos de artigos CA e dois de drenagem (DTR 200 e DM 210 monofásicos) foram deduzidos pelo padrão do catálogo, porque o PDF os mostra tapados com `*********`; a app assinala-os com "confirmar".
- A escolha feita na app (artigo escolhido para o cliente) fica guardada apenas no próprio aparelho.
