import { describe, expect, it } from 'vitest';
import { invalidaTokenDeReentrada } from './protocolo';
import type { ErroDraft, ErroSala } from './protocolo';

/**
 * A cerca do token de reentrada (PR H4, item S3).
 *
 * 🔒 **Este arquivo existe porque a regra saiu de dentro de um hook.** Enquanto
 * ela vivia no `aoReceber` de `src/ui/useSalaOnline.ts`, nada a alcançava: o
 * projeto não tem `jsdom` nem `@testing-library` (medido), e foi assim que a
 * mutação `M-guarda-classif` sobreviveu no 3.5.3.
 */
describe('invalidaTokenDeReentrada (S3)', () => {
  it('🔴 `comandos-demais` NÃO apaga o token — é a propriedade que o H4 trava', () => {
    // Apagar puniria com PERDA DE IDENTIDADE um jogador legítimo que só bateu
    // num rate limit. É o mesmo estrago que fez o H2 recusar reusar
    // `sala-inexistente` no `close(4403)` — pendência 0(ah).
    expect(invalidaTokenDeReentrada('comandos-demais')).toBe(false);
  });

  it('os DOIS que apagam continuam apagando — o H4 não afrouxou nada', () => {
    expect(invalidaTokenDeReentrada('token-invalido')).toBe(true);
    expect(invalidaTokenDeReentrada('sala-inexistente')).toBe(true);
  });

  it('🔴 É ALLOWLIST DO QUE APAGA — todo o resto preserva, inclusive erro futuro', () => {
    // Anti-vacuidade em duas direções: se a função virasse `() => true` o teste
    // do `comandos-demais` a pegaria; se virasse `() => false`, o de cima. Esta
    // varredura pega a terceira forma — alguém acrescentar um erro à lista sem
    // pensar. Erro novo nasce PRESERVANDO o token, que é o lado seguro.
    const preservam: (ErroSala | ErroDraft)[] = [
      'sala-cheia',
      'sala-iniciada',
      'jogador-desconhecido',
      'ja-na-sala',
      'nao-e-anfitriao',
      'jogadores-insuficientes',
      'nem-todos-prontos',
      'nome-invalido',
      'sala-nao-iniciada',
      'versao-divergente',
      'comandos-demais',
    ];
    for (const erro of preservam) {
      expect(invalidaTokenDeReentrada(erro), `${erro} apagou o token`).toBe(false);
    }
  });
});
