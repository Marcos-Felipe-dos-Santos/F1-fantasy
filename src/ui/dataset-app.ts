/**
 * Único ponto de I/O-de-import de dados da UI (PR 1.7a): carrega os 3 JSONs
 * de `src/data/` e monta o `Dataset` uma única vez, em nível de módulo
 * (singleton). Toda tela consome este `dataset` — nenhum outro arquivo de
 * `src/ui/` importa os JSONs de `src/data/` diretamente.
 */

import { criarDataset } from '../engine/dataset';
import equipeAnos from '../data/equipe-anos.json';
import pecas from '../data/pecas.json';
import pistas from '../data/pistas.json';

export const dataset = criarDataset(equipeAnos, pecas, pistas);
