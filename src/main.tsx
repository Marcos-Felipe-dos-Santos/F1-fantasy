import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App';
import { MockPista } from './ui/MockPista';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('#root não encontrado no index.html');
}

/**
 * Rota de maquete do PR 7.1 (`?mock=pista`): portão de direção de arte, fora
 * da navegação do jogo de propósito — nenhuma tela linka pra cá e o jogo não
 * muda de comportamento sem a query string. Sai junto com `MockPista.tsx`
 * quando a direção for aprovada e o PR 7.3 substituir a maquete por dado puro.
 */
const mock = new URLSearchParams(window.location.search).get('mock');

createRoot(rootElement).render(
  <StrictMode>{mock === 'pista' ? <MockPista /> : <App />}</StrictMode>,
);
