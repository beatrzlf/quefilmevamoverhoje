# 🎬 Qual filme vamo ver hoje?

Uma roleta de filmes: cada pessoa busca e adiciona sugestões, a roleta sorteia uma, e o que já foi assistido sai da lista.

## Funcionalidades

- **Busca eficiente**: autocompletar com *debounce* (300 ms), cancelamento da requisição anterior, cache no navegador e cache na borda da Vercel (`s-maxage`). Navegação por teclado (↑ ↓ Enter Esc).
- **Roleta animada** com sorteio uniforme via `crypto.getRandomValues` (sem viés). Respeita `prefers-reduced-motion`.
- **Remover assistidos**: "Já assisti" move o filme para o histórico (dá pra devolver à lista); "Remover" apaga.
- **Exportar / importar** a lista em um arquivo `.json`, para levar a outro aparelho ou guardar backup. Na importação dá para juntar com a lista atual ou substituí-la.
- Títulos e sinopses em português (pt-BR), link para a página do filme no IMDb e no TMDB.

## Fonte dos dados (e por que não o IMDb direto)

O IMDb **não tem API pública gratuita**: os termos de uso proíbem *scraping*, e os dados oficiais só existem via licença paga (IMDb/AWS Data Exchange) ou os *datasets* não comerciais, que não têm pôsteres nem sinopses e não podem ser usados em app público sem licença.

Por isso o app usa o **[TMDB](https://www.themoviedb.org/)**, que tem API gratuita para uso não comercial, títulos em português, pôsteres e o **ID do IMDb** de cada filme. Assim cada sorteio leva direto à página oficial no IMDb, sem copiar dados do IMDb.

Conformidade com os termos do TMDB: a atribuição exigida está no rodapé, a chave nunca vai ao navegador, e as respostas ficam em cache para respeitar os limites da API. Se o app virar comercial, é preciso pedir licença comercial ao TMDB.

## Segurança e privacidade

- **Nenhum dado de usuário no servidor.** Não há login nem banco: a lista fica só no `localStorage` do navegador e pode ser exportada pela própria pessoa.
- **Chave do TMDB só no servidor**: as rotas `/api/search` e `/api/movie/[id]` fazem *proxy* (módulo `server-only`), sem prefixo `NEXT_PUBLIC_`.
- **Validação de entrada** nas rotas (tamanho da busca, ID numérico) e na importação (limite de 1 MB, cada campo é revalidado; links e pôsteres só aceitam formatos do IMDb/TMDB).
- **Rate limit** por IP nas rotas de API (melhor esforço por instância; para limite global use Vercel KV/Upstash).
- **Cabeçalhos de segurança**: CSP restritiva (só imagens de `image.tmdb.org`, `frame-ancestors 'none'`), HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Erros do TMDB são devolvidos como mensagens genéricas, sem vazar detalhes.

## Stack e ambiente

| Item | Escolha |
| --- | --- |
| Linguagem | TypeScript |
| Framework | Next.js 15 (App Router) + React 19 |
| Backend | Route Handlers do Next.js (funções serverless na Vercel) |
| Estilo | CSS puro, sem dependências |
| Testes | Vitest |
| Runtime | Node.js 20 ou superior |
| Hospedagem | Vercel |
| Editor sugerido | VS Code |

## Rodando localmente

1. Crie uma conta no TMDB e gere uma chave em <https://www.themoviedb.org/settings/api> (use o **API Read Access Token**).
2. Copie `.env.example` para `.env.local` e preencha `TMDB_READ_ACCESS_TOKEN`.
3. Instale e rode:

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # testes
npm run build    # build de produção
```

## Deploy na Vercel

1. Em <https://vercel.com/new>, importe o repositório `quefilmevamoverhoje` do GitHub. O framework Next.js é detectado sozinho.
2. Em **Settings → Environment Variables**, adicione `TMDB_READ_ACCESS_TOKEN` (Production e Preview).
3. Clique em **Deploy**. Cada push na `main` publica em produção, e cada PR ganha um link de preview.

## Estrutura

```
app/            página (client) e rotas de API
components/     SearchBar, Wheel (roleta), MovieCard
lib/            TMDB, validação, rate limit, sorteio, armazenamento/export
tests/          testes Vitest
```
