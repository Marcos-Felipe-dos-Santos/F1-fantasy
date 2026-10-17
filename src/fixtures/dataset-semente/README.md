# Fixture semente congelada

22 equipe/anos pré-4.5. Suas notas diferem do dataset vivo; não regenerar a
fixture a partir de src/data.

Nomes e ids originais restaurados em 2026-10-17 pelo mapa reverso de
scripts/restaurar-fixture.ts, com ensaio antes da escrita. Anos, notas e ordem
foram preservados e têm assinatura SHA-256 em restaurar-fixture.test.ts.
Os ids agora seguem idsDaEquipeAno com constructorId/driverId reais.

DATA, DERIVADO e FIXTURE continuam separados nas referências de teste: compartilhar
um id não implica compartilhar as notas. A proveniência da anonimização anterior
permanece no HISTORICO.md e nas funções puras testadas.
