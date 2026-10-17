import { SELF } from 'cloudflare:test';
import { expect, it } from 'vitest';

it('serve o frontend compilado e seus assets na origem do Worker', async () => {
  const resposta = await SELF.fetch('https://exemplo.test/');
  expect(resposta.status).toBe(200);
  expect(resposta.headers.get('content-type')).toContain('text/html');
  const html = await resposta.text();
  expect(html).toContain('Content-Security-Policy');
  const script = html.match(/src="([^"]+\.js)"/)?.[1];
  expect(script).toBeDefined();
  const asset = await SELF.fetch(`https://exemplo.test${script}`);
  expect(asset.status).toBe(200);
  expect(asset.headers.get('content-type')).toMatch(/javascript/);
});

it('recarregar link de sala recebe o HTML, sem capturar rotas da API', async () => {
  expect((await SELF.fetch('https://exemplo.test/?sala=ABCDEF')).status).toBe(200);
  const resposta = await SELF.fetch('https://exemplo.test/criar-sala');
  expect(resposta.status).toBe(404);
  expect(await resposta.text()).not.toContain('<!doctype html>');
});
