#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mede CONTENÇÃO entre um trecho do ESTADO.md e os arquivos de histórico/planos.

POR QUE ESTE SCRIPT EXISTE (e é rastreado):
  A §Convenções do ESTADO.md — regra ditada pelo dev em 2026-08-30, no fechamento
  do PR 6 — diz que "medição cujo script não fica em disco não é reproduzível".
  Os números que este script produziu viraram afirmação no ESTADO.md e no
  HISTORICO.md na higiene de 2026-08-31; então ele entra rastreado, não em
  preview/ nem em scratchpad.

O QUE ELE RESPONDE:
  "O texto deste bloco do ESTADO.md já está no HISTORICO.md?"
  NÃO por cabeçalho — por conteúdo. Casar cabeçalho foi justamente o erro que
  esta medição desmentiu: o HISTORICO.md tem uma seção ### para quase todo PR do
  ESTADO.md, e mesmo assim a contenção real do texto é de 16,7%. As entradas de
  lá foram escritas À PARTE sobre os mesmos PRs, não são cópia.

MÉTODO (é ele que faz a medida valer):
  - Normaliza: remove emoji e símbolos (categoria Unicode S), remove ênfase
    markdown (* ` ~ #), troca pontuação por espaço, colapsa espaço, minúsculas.
    Isso torna a medida imune a reformatação de quebra de linha, que difere
    entre os dois arquivos (o ESTADO.md quebra em ~100 colunas; o HISTORICO.md
    tem parágrafos em linha única).
  - Compara por SHINGLES de 8 palavras (n-gramas). Shingle é robusto a
    reordenação de frase e a edição pontual; casar linha a linha daria
    falso-órfão em massa só pela diferença de quebra.
  - Cobertura = |shingles do bloco ∩ shingles do corpus| / |shingles do bloco|.

LIMITE HONESTO, DECLARADO:
  Cobertura ALTA não prova redundância. Um bloco de RETENÇÃO pontua alto porque
  o arquivo que o arquivou CITA o que ficou retido. Foi o que aconteceu com
  §FASE 8 (75,4%) na higiene de 2026-08-31: o número sugeria duplicata e a
  LEITURA mostrou que aquilo era a retenção de 2026-08-19, com um item ainda
  aberto dentro. **Este script tria candidatos; quem decide é a leitura.**

USO:
  python scripts/medir-contencao-doc.py [inicio fim ...]
  Sem argumentos, roda a bateria da higiene de 2026-08-31.
"""

import io
import re
import sys
import unicodedata

CORPUS = ['HISTORICO.md', 'PLANOS_ATIVOS.md', 'HISTORICO_ARQUIVO.md']
ALVO = 'ESTADO.md'
N = 8

# Blocos da §"Onde parei" medidos na higiene de 2026-08-31, com o resultado que
# deram naquela data (ESTADO.md em 2863 linhas, antes do arquivamento).
BATERIA = [
    ('PR7 (corrente)', 560, 672), ('nota-convencao', 674, 687),
    ('PR6', 689, 853), ('PR-posicionamento', 855, 903),
    ('PR5 + ancoras', 905, 1007), ('PR4-narrativa', 1009, 1062),
    ('AUDIT C3 + 0(y)', 1066, 1088), ('INVENTARIO nomes reais', 1090, 1190),
    ('CUSTO da troca', 1192, 1358), ('SUPERFICIE pecas/pistas', 1362, 1434),
    ('conserto-0(s)', 1438, 1475), ('PR-C-spike', 1477, 1518),
    ('PR-3.5.4', 1520, 1537), ('PR-3.5.3', 1539, 1635),
    ('corrida-online-encerrada', 1637, 1646), ('PR-3.5.1', 1648, 1685),
    ('PR-A-spike', 1687, 1696), ('PR-B-spike', 1698, 1762),
    ('PR-3.5.2', 1764, 1908),
]


def norm(s):
    s = unicodedata.normalize('NFKC', s)
    s = ''.join(c for c in s if unicodedata.category(c)[0] != 'S')
    for c in '*`~#':
        s = s.replace(c, '')
    s = re.sub(r'[^\w\s]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip().lower()


def shingles(text, n=N):
    w = norm(text).split()
    return {tuple(w[i:i + n]) for i in range(len(w) - n + 1)} if len(w) >= n else set()


def ler(p):
    return io.open(p, encoding='utf-8', newline='').read()


# O ESTADO.md tinha 2863 linhas quando a BATERIA foi medida (2026-08-31, ANTES
# do arquivamento). Depois do move ele encolheu, e rodar a BATERIA contra o
# arquivo novo mediria faixas que apontam para outro texto — em SILÊNCIO.
# Guarda explícita: medição que não sabe que envelheceu é a classe de defeito
# que este repositório já pagou várias vezes.
LINHAS_NA_MEDICAO = 2863


def main():
    alvo = ler(ALVO).split('\n')
    corpus = set()
    for f in CORPUS:
        corpus |= shingles(ler(f))

    args = sys.argv[1:]
    if not args and len(alvo) - 1 != LINHAS_NA_MEDICAO:
        print('ABORTADO: a BATERIA foi medida com o ESTADO.md em %d linhas; ele tem %d.'
              % (LINHAS_NA_MEDICAO, len(alvo) - 1))
        print('As faixas fixas apontariam para outro texto. Passe as faixas na mao:')
        print('  python scripts/medir-contencao-doc.py <inicio> <fim> [<inicio> <fim> ...]')
        return 1

    if args:
        pares = [('%s-%s' % (args[i], args[i + 1]), int(args[i]), int(args[i + 1]))
                 for i in range(0, len(args), 2)]
    else:
        pares = BATERIA

    print('%-28s %6s %6s %7s %7s  %s' %
          ('bloco', 'linhas', 'shing', 'achados', 'orfaos', 'cobertura'))
    print('-' * 80)
    tl = ts = tf = 0
    for nome, a, b in pares:
        corpo = '\n'.join(alvo[a - 1:b])
        linhas = [l for l in alvo[a - 1:b] if l.strip() and l.strip() != '---']
        sh = shingles(corpo)
        ach = sh & corpus
        cov = 100.0 * len(ach) / len(sh) if sh else 0.0
        print('%-28s %6d %6d %7d %7d  %6.1f%%' %
              (nome, len(linhas), len(sh), len(ach), len(sh) - len(ach), cov))
        tl += len(linhas); ts += len(sh); tf += len(ach)
    print('-' * 80)
    print('%-28s %6d %6d %7d %7d  %6.1f%%' %
          ('TOTAL', tl, ts, tf, ts - tf, 100.0 * tf / ts if ts else 0.0))


if __name__ == '__main__':
    sys.exit(main() or 0)
