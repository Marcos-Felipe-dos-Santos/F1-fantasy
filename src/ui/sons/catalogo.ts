/**
 * GERADO por `scripts/sons/integrar-sons.ts`: não editar à mão. Os sons escolhidos pelo Marcos
 * (2026-11-06), em `public/sons/`; origem e licença (CC0) em `THIRD_PARTY_NOTICES.md`.
 * `laco`: trecho que repete sem emenda (depois dele há uma guarda de 50 ms, para o decodificador
 * aparar sem cortar a emenda). `picoEmS`: onde está o pico de volume, que deve cair no evento.
 */

import type { VelocidadeReplay } from '../fluxo-corrida';

export interface SomDoCatalogo {
  /** Variação de `scripts/sons/escolhas.ts` de onde o arquivo saiu: a cerca confere com a escolha. */
  origem: string;
  arquivo: string;
  durS: number;
  md5: string;
  freesound: readonly number[];
  laco?: { inicioS: number; fimS: number };
  picoEmS?: number;
}

type PorVelocidade = Record<VelocidadeReplay, SomDoCatalogo>;

export const CATALOGO_SONS: {
  motor: SomDoCatalogo;
  lenta: SomDoCatalogo;
  pelotao: SomDoCatalogo;
  chuva: SomDoCatalogo;
  passagem: PorVelocidade;
  spray: PorVelocidade;
  largada: PorVelocidade;
  pistola: SomDoCatalogo;
  derrapagem: SomDoCatalogo;
  abandono: SomDoCatalogo;
  torcida: SomDoCatalogo;
} = {
  motor: {
    origem: 'motor-v3',
    arquivo: 'sons/motor.ogg',
    durS: 2.05,
    md5: 'e7cf324650fa6b2c25ee9004e1269cda',
    freesound: [150337],
    laco: { inicioS: 0, fimS: 2 },
  },
  lenta: {
    origem: 'lenta-v3',
    arquivo: 'sons/lenta.ogg',
    durS: 3.05,
    md5: '2e5a233295c79b4117150860dbb81958',
    freesound: [150337],
    laco: { inicioS: 0, fimS: 3 },
  },
  pelotao: {
    origem: 'pelotao-v2',
    arquivo: 'sons/pelotao.ogg',
    durS: 8.05,
    md5: 'e6835b1e8fec8a36eb95935f2185f382',
    freesound: [235261],
    laco: { inicioS: 0, fimS: 8 },
  },
  chuva: {
    origem: 'chuva-v3',
    arquivo: 'sons/chuva.ogg',
    durS: 6.05,
    md5: 'c57716c46fd4b03578591329202a56cd',
    freesound: [200272, 507902],
    laco: { inicioS: 0, fimS: 6 },
  },
  passagem: {
    lenta: {
      origem: 'passagem-v3',
      arquivo: 'sons/passagem-lenta.ogg',
      durS: 0.8,
      md5: '6b1d0ebeabbf8e260ae4966952454c9c',
      freesound: [14833],
      picoEmS: 0.36,
    },
    media: {
      origem: 'passagem-v3',
      arquivo: 'sons/passagem-media.ogg',
      durS: 0.4,
      md5: '0a6fa47021a1b671c86699c9c2640d3d',
      freesound: [14833],
      picoEmS: 0.18,
    },
    rapida: {
      origem: 'passagem-v3',
      arquivo: 'sons/passagem-rapida.ogg',
      durS: 0.3,
      md5: 'd5e124d401f048645ba80db7a3b2a05f',
      freesound: [14833],
      picoEmS: 0.135,
    },
  },
  spray: {
    lenta: {
      origem: 'spray-v2',
      arquivo: 'sons/spray-lenta.ogg',
      durS: 0.8,
      md5: 'e8d6a66de66a0e1d95a1c43d833ce970',
      freesound: [462862],
      picoEmS: 0.36,
    },
    media: {
      origem: 'spray-v2',
      arquivo: 'sons/spray-media.ogg',
      durS: 0.4,
      md5: 'ba2deb21fd2f0e5191fa45d1098d6871',
      freesound: [462862],
      picoEmS: 0.18,
    },
    rapida: {
      origem: 'spray-v2',
      arquivo: 'sons/spray-rapida.ogg',
      durS: 0.3,
      md5: 'd7902c60524543aa3bccda37db60eec6',
      freesound: [462862],
      picoEmS: 0.135,
    },
  },
  largada: {
    lenta: {
      origem: 'largada-v2',
      arquivo: 'sons/largada-lenta.ogg',
      durS: 3.5,
      md5: '9bda5cf639cd6fbc0ecf0cdad7c21956',
      freesound: [444877],
    },
    media: {
      origem: 'largada-v2',
      arquivo: 'sons/largada-media.ogg',
      durS: 1.8,
      md5: 'd1822cbf0bde08225b1380a58f1de8b0',
      freesound: [444877],
    },
    rapida: {
      origem: 'largada-v2',
      arquivo: 'sons/largada-rapida.ogg',
      durS: 1.2,
      md5: 'a68d9614438810c95ac5f978e0ed176a',
      freesound: [444877],
    },
  },
  pistola: {
    origem: 'pistola-v3',
    arquivo: 'sons/pistola.ogg',
    durS: 0.62,
    md5: 'b9cdc4ca7d93ffa4d3b60e60f9af8df5',
    freesound: [349398],
    laco: { inicioS: 0.12, fimS: 0.57 },
  },
  derrapagem: {
    origem: 'derrapagem-v1',
    arquivo: 'sons/derrapagem.ogg',
    durS: 0.7,
    md5: '0ea551c13635846d50f794b4af582f89',
    freesound: [71739],
    picoEmS: 0.098,
  },
  abandono: {
    origem: 'abandono-v3',
    arquivo: 'sons/abandono.ogg',
    durS: 0.9,
    md5: '5e7ef18475783aa5688aae8071ebc634',
    freesound: [437995],
    picoEmS: 0.099,
  },
  torcida: {
    origem: 'torcida-v2',
    arquivo: 'sons/torcida.ogg',
    durS: 10.5,
    md5: '6d03e0ba6843f50e5edf691a3abea2ab',
    freesound: [160493],
  },
};
