# Testar o build integrado no computador

Requer Node 24 e dependências já instaladas (`npm ci` em um clone novo).

```powershell
npm run start:local
```

Abra http://127.0.0.1:8787. O comando compila o frontend, verifica o bundle do
Worker e serve ambos pelo Wrangler local. Não faz deploy nem exige login na
Cloudflare. A porta ocupada é erro, não uma troca silenciosa de porta.

O servidor escuta somente no computador. Para testar duas pessoas, use duas
sessões de navegador (por exemplo normal e anônima), compartilhando o link da
sala. Abas na mesma sessão compartilham a identidade salva em localStorage.

Neste modo ENVIRONMENT continua production. Só as origens locais explícitas
127.0.0.1:8787 e localhost:8787 são permitidas. A CSP do build fica ativa.
O online cria um campeonato de cinco etapas; corrida única e dez etapas são
formatos locais. F5 deve reconstruir o draft e a etapa atual.

## Conferência antes de publicar

1. Criar sala, entrar nas duas sessões, marcar pronto e concluir o draft.
2. Conferir cinco etapas e classificação iguais, incluindo F5 e reconexão.
3. Conferir sala inexistente, origens recusadas e fechamento da sala.

## Publicação futura (não executada)

O Worker usa Static Assets e serve dist/ na mesma origem de /criar-sala e
/parties/*. API nunca cai no fallback HTML da SPA. Build deve preceder o Worker
também nos testes: `npm run build` antes de `npm run test:party`.

Quando houver endereço público, definir ALLOWED_ORIGINS com a origem HTTPS
exata, sem barra final; manter ENVIRONMENT=production. Não usar VITE_WS_BASE
para outra origem sem revisar a CSP. Nenhum domínio foi inventado/configurado.
O frontend e o Worker são publicados juntos. Salas de versões antigas devem
ser encerradas antes da atualização: a versão 3.4.6 exige etapa na confirmação.

Push e deploy dependem de autorização explícita. CI não publica automaticamente.

Referência: https://developers.cloudflare.com/workers/static-assets/binding/
