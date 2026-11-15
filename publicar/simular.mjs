// Roda a versão hospedada neste computador, sem Cloudflare, para conferir antes de publicar.
// Uso: node publicar/simular.mjs   → http://localhost:4748   (senha de acesso de teste: variável SENHA_ACESSO ou "teste")
// Os dados ficam só na memória e somem ao fechar.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from './src/worker.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(AQUI, 'site');
const PORTA = Number(process.env.PORTA) || 4748;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

if (!fs.existsSync(SITE)) { console.error('Rode antes: node publicar/montar.mjs'); process.exit(1); }

const kv = new Map();
const env = {
  SENHA_ACESSO: process.env.SENHA_ACESSO || 'teste',
  MAGNIFIC_API_KEY: process.env.MAGNIFIC_API_KEY || '',
  ASSETS: {
    async fetch(req) {
      const u = new URL(req.url);
      const arq = path.normalize(path.join(SITE, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname)));
      if (!arq.startsWith(SITE) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) return new Response('Não encontrado', { status: 404 });
      return new Response(fs.readFileSync(arq), { headers: { 'Content-Type': MIME[path.extname(arq)] || 'application/octet-stream' } });
    },
  },
  DADOS: {
    async get(k, tipo) { const v = kv.get(k); if (!v) return null; return tipo === 'json' ? JSON.parse(Buffer.from(v.valor).toString('utf8')) : tipo === 'arrayBuffer' ? v.valor : Buffer.from(v.valor).toString('utf8'); },
    async getWithMetadata(k, tipo) { const v = kv.get(k); return { value: v ? await this.get(k, tipo) : null, metadata: v ? v.metadata : null }; },
    async put(k, valor, o = {}) { kv.set(k, { valor: typeof valor === 'string' ? Buffer.from(valor, 'utf8') : Buffer.from(valor), metadata: o.metadata || null }); },
  },
};

http.createServer(async (req, res) => {
  const partes = [];
  for await (const c of req) partes.push(c);
  const corpo = Buffer.concat(partes);
  const pedido = new Request(`http://localhost:${PORTA}${req.url}`, { method: req.method, headers: req.headers, body: corpo.length ? corpo : undefined });
  const r = await worker.fetch(pedido, env);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(PORTA, '127.0.0.1', () => console.log(`Simulação da versão hospedada em http://localhost:${PORTA}`));
