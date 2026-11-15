// Enquadramento — servidor local.
// Serve o app no navegador e faz a ponte com a API do Magnific (a chave fica só neste PC, no .env).
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
const PUB = path.join(RAIZ, 'public');
const THREE_DIR = path.join(RAIZ, 'node_modules', 'three');
const GER = path.join(RAIZ, 'geracoes');
const ENV = path.join(RAIZ, '.env');
const HIST = path.join(GER, 'historico.json');
const PORTA = Number(process.env.PORTA) || 4747;
const API = 'https://api.magnific.com';

fs.mkdirSync(GER, { recursive: true });

// ---------- chave ----------
function lerChave() {
  if (process.env.MAGNIFIC_API_KEY) return process.env.MAGNIFIC_API_KEY.trim();
  try {
    const m = fs.readFileSync(ENV, 'utf8').match(/^\s*MAGNIFIC_API_KEY\s*=\s*(.+)\s*$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  } catch { return ''; }
}
function salvarChave(chave) {
  let txt = '';
  try { txt = fs.readFileSync(ENV, 'utf8'); } catch {}
  const linha = `MAGNIFIC_API_KEY=${chave}`;
  txt = /^\s*MAGNIFIC_API_KEY\s*=.*$/m.test(txt) ? txt.replace(/^\s*MAGNIFIC_API_KEY\s*=.*$/m, linha) : (txt ? txt.replace(/\n?$/, '\n') : '') + linha + '\n';
  fs.writeFileSync(ENV, txt);
}

// ---------- modelos do Magnific ----------
const PROP_GPT = { square_1_1: 1, classic_4_3: 4 / 3, traditional_3_4: 3 / 4, widescreen_16_9: 16 / 9, social_story_9_16: 9 / 16, film_horizontal_21_9: 21 / 9, standard_3_2: 3 / 2, portrait_2_3: 2 / 3, horizontal_2_1: 2, banner_3_1: 3 };
const PROP_MYSTIC = { square_1_1: 1, classic_4_3: 4 / 3, traditional_3_4: 3 / 4, widescreen_16_9: 16 / 9, social_story_9_16: 9 / 16, smartphone_horizontal_20_9: 20 / 9, smartphone_vertical_9_20: 9 / 20, standard_3_2: 3 / 2, portrait_2_3: 2 / 3, horizontal_2_1: 2, vertical_1_2: 1 / 2, social_5_4: 5 / 4, social_post_4_5: 4 / 5 };
function maisProxima(tabela, proporcao) {
  let melhor = 'square_1_1', d = Infinity;
  for (const [k, v] of Object.entries(tabela)) {
    const dd = Math.abs(Math.log(v / proporcao));
    if (dd < d) { d = dd; melhor = k; }
  }
  return melhor;
}
const lim = (v, a, b, padrao) => { v = Number(v); return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : padrao; };
const um = (v, lista, padrao) => (lista.includes(v) ? v : padrao);

const MODELOS = {
  gemini: {
    caminho: '/v1/ai/gemini-2-5-flash-image-preview',
    corpo: (p) => ({ prompt: p.prompt, reference_images: [p.b64] }),
  },
  gpt2: {
    caminho: '/v1/ai/text-to-image/gpt-image-2-edit',
    corpo: (p) => ({
      prompt: p.prompt,
      reference_images: [p.b64],
      aspect_ratio: maisProxima(PROP_GPT, p.proporcao),
      resolution: um(p.opcoes.resolucao, ['1k', '2k', '4k'], '1k'),
      quality: um(p.opcoes.qualidade, ['low', 'medium', 'high'], 'medium'),
      num_images: lim(p.opcoes.quantidade, 1, 4, 1),
      output_format: 'png',
    }),
  },
  mystic: {
    caminho: '/v1/ai/mystic',
    corpo: (p) => ({
      prompt: p.prompt,
      structure_reference: p.b64,
      structure_strength: lim(p.opcoes.forca, 0, 100, 65),
      aspect_ratio: maisProxima(PROP_MYSTIC, p.proporcao),
      model: um(p.opcoes.mystic, ['realism', 'fluid', 'zen', 'flexible', 'super_real', 'editorial_portraits'], 'realism'),
      resolution: um(p.opcoes.resolucao, ['1k', '2k', '4k'], '2k'),
      filter_nsfw: true,
    }),
  },
};

async function magnific(caminho, { metodo = 'GET', corpo } = {}) {
  const chave = lerChave();
  if (!chave) throw Object.assign(new Error('Chave da API do Magnific não configurada.'), { status: 428, codigo: 'sem_chave' });
  // A conexão com o Magnific às vezes cai antes de a resposta chegar ("fetch failed"): tenta de novo antes de desistir.
  let r, falha;
  for (let tentativa = 0; tentativa < 3 && !r; tentativa++) {
    if (tentativa) await new Promise((ok) => setTimeout(ok, 800 * tentativa));
    try {
      r = await fetch(API + caminho, {
        method: metodo,
        headers: { 'x-magnific-api-key': chave, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: corpo ? JSON.stringify(corpo) : undefined,
      });
    } catch (e) { falha = e; }
  }
  if (!r) throw Object.assign(new Error('Não consegui falar com o Magnific (a conexão caiu três vezes). Confira a internet e tente de novo.'), { status: 502, causa: falha && falha.message });
  const txt = await r.text();
  let j;
  try { j = JSON.parse(txt); } catch { j = { message: txt.slice(0, 400) }; }
  if (!r.ok) {
    const params = Array.isArray(j.invalid_params) ? ' — ' + j.invalid_params.map((x) => `${x.field || x.name}: ${x.reason}`).join('; ') : '';
    throw Object.assign(new Error((j.message || j.detail || j.title || `Erro ${r.status} no Magnific`) + params), { status: r.status });
  }
  return j;
}

// ---------- histórico ----------
function lerHist() { try { return JSON.parse(fs.readFileSync(HIST, 'utf8')); } catch { return []; } }
function gravarHist(h) { fs.writeFileSync(HIST, JSON.stringify(h, null, 1)); }

const tarefas = new Map(); // id local -> { modelo, tarefa, prompt, ref, quando, pronto }

function carimbo() {
  const d = new Date(), z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
}

async function baixar(url, base) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Não consegui baixar a imagem gerada (${r.status}).`);
  const tipo = r.headers.get('content-type') || '';
  const ext = tipo.includes('jpeg') ? 'jpg' : tipo.includes('webp') ? 'webp' : 'png';
  const nome = `${base}.${ext}`;
  fs.writeFileSync(path.join(GER, nome), Buffer.from(await r.arrayBuffer()));
  return '/geracoes/' + nome;
}

// ---------- http ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function lerCorpo(req, limite = 40 * 1024 * 1024) {
  return new Promise((ok, erro) => {
    const partes = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > limite) { erro(Object.assign(new Error('Envio grande demais.'), { status: 413 })); req.destroy(); } else partes.push(c); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(partes).toString('utf8') || '{}')); } catch { erro(Object.assign(new Error('JSON inválido.'), { status: 400 })); } });
    req.on('error', erro);
  });
}
function estatico(res, base, rel) {
  const arq = path.normalize(path.join(base, rel));
  if (!arq.startsWith(base)) { res.writeHead(403); return res.end(); }
  fs.readFile(arq, (e, dados) => {
    if (e) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(arq).toLowerCase()] || 'application/octet-stream', 'Cache-Control': base === THREE_DIR ? 'max-age=86400' : 'no-cache' });
    res.end(dados);
  });
}

async function api(req, res, url) {
  const rota = url.pathname;

  if (rota === '/api/config' && req.method === 'GET') return json(res, 200, { temChave: !!lerChave() });

  if (rota === '/api/config' && req.method === 'POST') {
    const { chave } = await lerCorpo(req, 4096);
    if (typeof chave !== 'string' || !/^[\w\-.:~+/=]{8,200}$/.test(chave.trim())) return json(res, 400, { erro: 'Chave em formato inesperado.' });
    salvarChave(chave.trim());
    return json(res, 200, { temChave: true });
  }

  if (rota === '/api/gerar' && req.method === 'POST') {
    const { modelo, prompt, imagem, proporcao, opcoes } = await lerCorpo(req);
    const M = MODELOS[modelo];
    if (!M) return json(res, 400, { erro: 'Modelo desconhecido.' });
    if (!prompt || !String(prompt).trim()) return json(res, 400, { erro: 'Escreva o prompt da cena.' });
    const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(imagem || '');
    if (!m) return json(res, 400, { erro: 'Quadro de referência ausente.' });
    if (!lerChave()) return json(res, 428, { erro: 'Chave da API do Magnific não configurada.', codigo: 'sem_chave' });
    const id = carimbo() + '-' + Math.random().toString(36).slice(2, 6);
    const ref = `${id}-quadro.${m[1] === 'jpeg' ? 'jpg' : 'png'}`;
    fs.writeFileSync(path.join(GER, ref), Buffer.from(m[2], 'base64'));
    const r = await magnific(M.caminho, { metodo: 'POST', corpo: M.corpo({ prompt: String(prompt), b64: m[2], proporcao: Number(proporcao) || 16 / 9, opcoes: opcoes || {} }) });
    const tarefa = r?.data?.task_id;
    if (!tarefa) return json(res, 502, { erro: 'O Magnific não devolveu o número da tarefa.' });
    tarefas.set(id, { modelo, tarefa, prompt: String(prompt), ref: '/geracoes/' + ref, quando: new Date().toISOString() });
    return json(res, 200, { id });
  }

  if (rota.startsWith('/api/tarefa/') && req.method === 'GET') {
    const id = rota.slice('/api/tarefa/'.length);
    const t = tarefas.get(id);
    if (!t) return json(res, 404, { erro: 'Tarefa não encontrada (o servidor foi reiniciado?).' });
    if (t.pronto) return json(res, 200, t.pronto);
    const r = await magnific(`${MODELOS[t.modelo].caminho}/${t.tarefa}`);
    const status = r?.data?.status || 'IN_PROGRESS';
    if (status === 'FAILED') {
      t.pronto = { status: 'FAILED', erro: 'O Magnific não conseguiu gerar essa imagem (pode ter sido barrada pelo filtro de conteúdo).' };
      return json(res, 200, t.pronto);
    }
    if (status !== 'COMPLETED') return json(res, 200, { status });
    if (t.baixando) return json(res, 200, { status: 'IN_PROGRESS' });
    t.baixando = true;
    try {
      const urls = (r.data.generated || []).filter((u) => typeof u === 'string');
      const imagens = [];
      for (let i = 0; i < urls.length; i++) imagens.push(await baixar(urls[i], `${id}-${i + 1}`));
      const item = { id, quando: t.quando, modelo: t.modelo, prompt: t.prompt, quadro: t.ref, imagens };
      const h = lerHist(); h.unshift(item); gravarHist(h);
      t.pronto = { status: 'COMPLETED', item };
      return json(res, 200, t.pronto);
    } finally { t.baixando = false; }
  }

  if (rota === '/api/melhorar' && req.method === 'POST') {
    const { texto, idioma } = await lerCorpo(req, 64 * 1024);
    const t = String(texto || '').trim();
    if (!t) return json(res, 400, { erro: 'Escreva ou narre a cena antes de melhorar.' });
    const r = await magnific('/v1/ai/improve-prompt', { metodo: 'POST', corpo: { prompt: t.slice(0, 2500), type: 'image', language: /^[a-z]{2}$/.test(idioma || '') ? idioma : 'pt' } });
    const tarefa = r?.data?.task_id;
    if (!tarefa) return json(res, 502, { erro: 'O Magnific não devolveu o número da tarefa.' });
    for (let i = 0; i < 45; i++) {
      await new Promise((ok) => setTimeout(ok, 1000));
      const g = await magnific('/v1/ai/improve-prompt/' + tarefa);
      const status = g?.data?.status;
      if (status === 'FAILED') return json(res, 502, { erro: 'O Magnific não conseguiu melhorar esse texto.' });
      if (status === 'COMPLETED') {
        const novo = String((g.data.generated || [])[0] || '').trim();
        if (!novo) return json(res, 502, { erro: 'O Magnific devolveu um texto vazio.' });
        return json(res, 200, { texto: novo });
      }
    }
    return json(res, 504, { erro: 'O Magnific demorou demais para melhorar o texto. Tente de novo.' });
  }

  if (rota === '/api/historico' && req.method === 'GET') return json(res, 200, lerHist().slice(0, 60));

  return json(res, 404, { erro: 'Rota não encontrada.' });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname.startsWith('/vendor/three/')) return estatico(res, THREE_DIR, decodeURIComponent(url.pathname.slice('/vendor/three/'.length)));
    if (url.pathname.startsWith('/geracoes/')) return estatico(res, GER, decodeURIComponent(url.pathname.slice('/geracoes/'.length)));
    return estatico(res, PUB, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1)));
  } catch (e) {
    json(res, e.status && e.status >= 400 ? e.status : 500, { erro: e.message || 'Erro interno.', codigo: e.codigo });
  }
});

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`Enquadramento aberto em http://localhost:${PORTA}`);
  console.log(lerChave() ? 'Magnific: chave encontrada.' : 'Magnific: sem chave (configure pelo botão "Magnific" dentro do app).');
});
