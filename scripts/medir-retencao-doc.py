#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Varre um trecho do ESTADO.md procurando o que NÃO PODE ser arquivado:
decisão travada do dev, regra inviolável, obrigação e pendência aberta.

POR QUE ESTE SCRIPT EXISTE (e é rastreado):
  Mesma razão do medir-contencao-doc.py — a §Convenções manda que medição que
  vira afirmação em documento entre com o script rastreado. O número "19 contra
  80" está escrito no ESTADO.md e no HISTORICO.md desde 2026-08-31.

🔴 O ACHADO QUE ELE EXISTE PARA NÃO DEIXAR REPETIR:
  VARREDURA DE RETENÇÃO POR EMOJI SUBESTIMA. Na higiene de 2026-08-31, um
  `grep 🔒` sobre a §"Onde parei" achou 20 marcadores; a varredura por FRASE
  achou 80 linhas — 4× mais. Três decisões travadas do dev não tinham 🔒 nenhum:

  ⚠️ O número 20 é o que ESTE script devolve, e ele corrige um 19 que circulou
  na sessão (contagem manual de uma saída de `awk`, feita a olho). É a razão de
  a contagem morar num script: número conferido a olho volta errado na próxima
  citação — foi o que aconteceu com o 33/6/2 do inventário de nomes reais.

    - "➡️ DECISÃO DO DEV (2026-08-20): PR C ADIADO"        (marcado ➡️)
    - "🔁 GATILHO DE REAVALIAÇÃO, travado junto com a decisão" (marcado 🔁)
    - "Conserto aprovado pelo dev: MR sai, entra MC"        (sem marcador algum)

  O "PR C ADIADO" é justamente um dos quatro marcadores que a sessão do PR 7
  amostrou e não encontrou em NENHUM outro arquivo. Um arquivamento guiado por
  `grep 🔒` o teria levado junto.

  A regra do projeto é "ler o CONTEÚDO, não o cabeçalho" — e **o emoji é
  cabeçalho**. Este script aplica a regra ao próprio marcador.

LIMITE HONESTO, DECLARADO:
  Ele TRIA, não decide. O padrão `pendência` casa tanto uma pendência aberta
  quanto uma referência de passagem a uma já fechada; `travado` casa "decisão
  travada" e "lado travado" (metáfora). **Cada acerto tem de ser lido no
  contexto antes de virar retenção.** Nenhum bloco vai para o histórico só
  porque o script não o marcou.

USO:
  python scripts/medir-retencao-doc.py [inicio fim]
  Sem argumentos, varre a §"Onde parei" como ela estava em 2026-08-31 (557-1908).
"""

import io
import os
import re
import sys

ALVO = 'ESTADO.md'

PADRAO = re.compile(
    r'decis[aã]o do dev|palavras do dev|aprovad\w* pelo dev|ditad\w* pelo dev|'
    r'n[aã]o reabrir|travad\w|obriga[cç][aã]o|inviol[aá]vel|exig[eê]ncia do dev|'
    r'pedido do dev|decis[aã]o de plano|decidid\w* pelo dev|o dev decidiu|'
    r'gatilho de reavalia|pend[eê]ncia|adiad\w|fica de fora|veredito do dev|'
    r'aprova[cç][aã]o do dev',
    re.I,
)

LOCK = '\U0001f512'      # 🔒
SETAS = ('➡', '\U0001f501', '⬅')  # ➡️ 🔁 ⬅️


def main():
    a, b = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (557, 1908)
    linhas = io.open(ALVO, encoding='utf-8', newline='').read().split('\n')

    achados, com_lock = [], 0
    for i in range(a - 1, min(b, len(linhas))):
        ln = linhas[i]
        if PADRAO.search(ln):
            if LOCK in ln:
                marca, com_lock = 'LOCK', com_lock + 1
            elif any(s in ln for s in SETAS):
                marca = 'seta'
            else:
                marca = '-'
            achados.append((i + 1, marca, ln.strip()))

    lock_total = sum(1 for i in range(a - 1, min(b, len(linhas))) if LOCK in linhas[i])

    # Saída em preview/ (gitignored) é permitida pela §Convenções; o que não pode
    # ficar só lá é o MEIO de refazer a saída — que é este arquivo, rastreado.
    os.makedirs('preview', exist_ok=True)
    destino = os.path.join('preview', 'retencao-%d-%d.txt' % (a, b))
    out = io.open(destino, 'w', encoding='utf-8', newline='\n')
    out.write('VARREDURA DE RETENCAO — %s linhas %d-%d\n' % (ALVO, a, b))
    out.write('por FRASE: %d linhas | por emoji 🔒: %d linhas\n' % (len(achados), lock_total))
    out.write('=' * 72 + '\n')
    for n, m, t in achados:
        out.write('%5d %-5s %s\n' % (n, m, t))
    out.close()

    print('por FRASE: %d | por emoji: %d | razao: %.1fx' %
          (len(achados), lock_total, len(achados) / lock_total if lock_total else 0))
    print('gravado em %s' % destino)


if __name__ == '__main__':
    main()
