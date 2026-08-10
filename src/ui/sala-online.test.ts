/**
 * PR 3.3.2 — o link da sala (`?sala=A3F9C2`).
 *
 * Decisão do dev: link compartilhável, porque ditar código no WhatsApp e
 * redigitar no celular é o caminho mais chato e mais sujeito a erro. O custo
 * aceito é o código aparecer no histórico do navegador.
 *
 * 🔒 O que este arquivo trava: **o link passa pela MESMA validação do campo
 * digitado**. Sem isso, `?sala=<lixo>` abriria um Durable Object para entrada
 * arbitrária.
 */

import { describe, expect, it } from 'vitest';
import { montarLink, PARAM_SALA, salaDaUrl } from './sala-online';
import { normalizarCodigo } from '../net/codigo-sala';

describe('salaDaUrl', () => {
  it('lê o código do link', () => {
    expect(salaDaUrl({ search: '?sala=A3F9C2' })).toBe('A3F9C2');
  });

  it('normaliza o que veio no link, igual ao campo digitado', () => {
    // Alguém edita a URL à mão, ou o app de mensagem baixa a caixa.
    expect(salaDaUrl({ search: '?sala=a3f9c2' })).toBe('A3F9C2');
  });

  it('recusa link sem código ou com lixo — não abre sala pra qualquer coisa', () => {
    for (const search of [
      '',
      '?',
      '?outro=A3F9C2',
      '?sala=',
      '?sala=sala-1',
      '?sala=A3F9C',
      '?sala=A3F9CG',
      '?sala=../../etc',
    ]) {
      expect(salaDaUrl({ search }), search).toBeNull();
    }
  });

  it('tolera outros parâmetros no link', () => {
    expect(salaDaUrl({ search: '?utm=x&sala=A3F9C2&y=1' })).toBe('A3F9C2');
  });
});

describe('montarLink', () => {
  it('usa a origem e o caminho da página — funciona em qualquer interface', () => {
    // O link tem que valer pro amigo: se fosse fixo em localhost, nada disso
    // funcionaria no celular.
    expect(montarLink({ origin: 'http://192.168.0.13:5173', pathname: '/' }, 'A3F9C2')).toBe(
      'http://192.168.0.13:5173/?sala=A3F9C2',
    );
    expect(montarLink({ origin: 'https://jogo.exemplo.com', pathname: '/f1/' }, 'A3F9C2')).toBe(
      'https://jogo.exemplo.com/f1/?sala=A3F9C2',
    );
  });

  it('ida e volta: o link gerado é lido de volta pelo leitor', () => {
    const link = montarLink({ origin: 'http://192.168.0.13:5173', pathname: '/' }, 'A3F9C2');
    const search = link.slice(link.indexOf('?'));
    expect(salaDaUrl({ search })).toBe('A3F9C2');
  });

  it('o nome do parâmetro é o mesmo dos dois lados', () => {
    // Se `montarLink` e `salaDaUrl` divergissem, o link simplesmente não
    // funcionaria — e sem erro nenhum, o que é pior.
    expect(montarLink({ origin: 'http://x', pathname: '/' }, 'A3F9C2')).toContain(`?${PARAM_SALA}=`);
  });
});

describe('o leitor do link e o campo digitado compartilham a validação', () => {
  it('o que o campo aceita, o link aceita — e vice-versa', () => {
    for (const bruto of ['A3F9C2', 'a3f9c2', 'ZZZZZZ', 'sala-1', '']) {
      const peloCampo = normalizarCodigo(bruto);
      const peloLink = salaDaUrl({ search: `?sala=${encodeURIComponent(bruto)}` });
      expect(peloLink, `divergiram em "${bruto}"`).toBe(peloCampo);
    }
  });
});
