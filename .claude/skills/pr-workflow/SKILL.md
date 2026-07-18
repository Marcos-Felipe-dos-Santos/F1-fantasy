---
name: pr-workflow
description: Regras de PR, commit, merge e tag do projeto. Use ao finalizar uma unidade de trabalho, preparar commit, ou quando o assunto for versionamento/git. Garante PRs pequenos, aprovação antes de push, e tags corretas (só pós-merge).
---

# Workflow de PR e git

## PRs
- **Pequenos, testáveis, reversíveis.** Uma mudança lógica por PR. Se o diff está grande, quebre.
- Cada PR tem: descrição do "o que" e "por quê", como testar, e (se tocou balanceamento) o antes/depois das métricas do `balance-harness`.
- Antes de "pronto": testes passando + revisão do `senior-reviewer` + diff pequeno.

## Commits
- Estilo convencional: `feat:`, `fix:`, `test:`, `refactor:`, `chore:`, `docs:`.
- Mensagem no imperativo, curta e específica.

## Git — regras invioláveis
- **NUNCA `git push` sem aprovação explícita do dev.** Preparar o commit local e pedir o "ok". O mesmo vale para abrir PR remoto.
- Trabalhar em branch por PR (`feat/...`, `fix/...`), nunca direto na main.

## Tags (erro recorrente a evitar)
- **Só criar tag DEPOIS do merge na main.** A tag deve apontar pro commit de merge, nunca pra um commit pré-merge da branch.
- Sequência correta: abrir PR → revisar → **merge na main** → checar out da main atualizada → então `git tag`.
- Antes de taggear, confirmar: `git log --oneline -1` na main mostra o merge esperado.

## Checklist de "pronto pra push" (após aprovação do dev)
1. Testes verdes localmente.
2. `balance-harness` rodado, se aplicável.
3. `senior-reviewer` aprovou.
4. Branch correta, diff pequeno.
5. Dev deu "ok" explícito. ⇒ só então push/PR remoto.
6. Tag (se for release) só após o merge.
