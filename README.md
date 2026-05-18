# FreakFit

Aplicação web para montar treino, dieta, progresso e análise de refeições direto no navegador.

## Como rodar

```bash
npm install
npm run dev
```

## Variáveis de ambiente

Crie um `.env.local` quando quiser ativar Supabase e IA do Base44:

```bash
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase

VITE_BASE44_APP_ID=seu_app_id_do_base44
VITE_BASE44_APP_BASE_URL=https://seu-app.base44.app
VITE_BASE44_FUNCTIONS_VERSION=prod
```

Sem essas variáveis, o app continua rodando com fallback local no navegador.

## Scripts

- `npm run dev`: inicia o Vite em modo desenvolvimento.
- `npm run build`: gera a versão de produção.
- `npm run preview`: serve a build localmente.
- `npm run lint`: executa o ESLint.

Os dados do usuário ficam salvos no `localStorage` do navegador, sem serviço externo obrigatório.
