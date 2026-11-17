// Enquadramento — versão hospedada (Cloudflare Worker).
// Serve o app (pasta site/) e faz a ponte com o Magnific. Tudo o que gasta crédito ou mostra
// imagem gerada pede a senha de acesso (segredo SENHA_ACESSO). Dados ficam no KV "DADOS".
// A lógica dos modelos espelha a do server.js local: mudou lá, mude aqui.

const API = 'https://api.magnific.com';

const PROP_GPT = { square_1_1: 1, classic_4_3: 4 / 3, traditional_3_4: 3 / 4, widescreen_16_9: 16 / 9, social_story_9_16: 9 / 16, film_horizontal_21_9: 21 / 9, standard_3_2: 3 / 2, portrait_2_3: 2 / 3, horizontal_2_1: 2, banner_3_1: 3 };
const PROP_MYSTIC = { square_1_1: 1, classic_4_3: 4 / 3, traditional_3_4: 3 / 4, widescreen_16_9: 16 / 9, social_story_9_16: 9 / 16, smartphone_horizontal_20_9: 20 / 9, smartphone_vertical_9_20: 9 / 20, standard_3_2: 3 / 2, portrait_2_3: 2 / 3, horizontal_2_1: 2, vertical_1_2: 1 / 2, social_5_4: 5 / 4, social_post_4_5: 4 / 5 };
function maisProxima(tabela, proporcao) {
  let melhor = 'square_1_1', d = Infinity;
  for (const [k, v] of Object.entries(tabela)) { const dd = Math.abs(Math.log(v / proporcao)); if (dd < d) { d = dd; melhor = k; } }
  return melhor;
}
const lim = (v, a, b, padrao) => { v = Number(v); return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : padrao; };
const um = (v, lista, padrao) => (lista.includes(v) ? v : padrao);

const MODELOS = {
  gemini: { caminho: '/v1/ai/gemini-2-5-flash-image-preview', corpo: (p) => ({ prompt: p.prompt, reference_images: [p.b64] }) },
  gpt2: {
    caminho: '/v1/ai/text-to-image/gpt-image-2-edit',
    corpo: (p) => ({ prompt: p.prompt, reference_images: [p.b64], aspect_ratio: maisProxima(PROP_GPT, p.proporcao), resolution: um(p.opcoes.resolucao, ['1k', '2k', '4k'], '1k'), quality: um(p.opcoes.qualidade, ['low', 'medium', 'high'], 'medium'), num_images: lim(p.opcoes.quantidade, 1, 4, 1), output_format: 'png' }),
  },
  mystic: {
    caminho: '/v1/ai/mystic',
    corpo: (p) => ({ prompt: p.prompt, structure_reference: p.b64, structure_strength: lim(p.opcoes.forca, 0, 100, 65), aspect_ratio: maisProxima(PROP_MYSTIC, p.proporcao), model: um(p.opcoes.mystic, ['realism', 'fluid', 'zen', 'flexible', 'super_real', 'editorial_portraits'], 'realism'), resolution: um(p.opcoes.resolucao, ['1k', '2k', '4k'], '2k'), filter_nsfw: true }),
  },
};

class Erro extends Error { constructor(status, msg, codigo) { super(msg); this.status = status; this.codigo = codigo; } }
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

function iguais(a, b) { // comparação em tempo constante
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}
function exigirAcesso(req, env) {
  if (!env.SENHA_ACESSO) throw new Erro(503, 'O servidor ainda não tem senha de acesso configurada.', 'sem_senha');
  if (!iguais(req.headers.get('x-acesso') || '', env.SENHA_ACESSO)) throw new Erro(401, 'Senha de acesso incorreta.', 'senha');
}
const lerChave = async (env) => ((env.MAGNIFIC_API_KEY || (await env.DADOS.get('chave')) || '') + '').trim();

async function magnific(env, caminho, { metodo = 'GET', corpo } = {}) {
  const chave = await lerChave(env);
  if (!chave) throw new Erro(428, 'Chave da API do Magnific não configurada.', 'sem_chave');
  let r;
  for (let tentativa = 0; tentativa < 3 && !r; tentativa++) { // a conexão às vezes cai: tenta de novo
    if (tentativa) await new Promise((ok) => setTimeout(ok, 800 * tentativa));
    try { r = await fetch(API + caminho, { method: metodo, headers: { 'x-magnific-api-key': chave, 'Content-Type': 'application/json', Accept: 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined }); } catch {}
  }
  if (!r) throw new Erro(502, 'Não consegui falar com o Magnific (a conexão caiu três vezes). Tente de novo.');
  const txt = await r.text();
  let j;
  try { j = JSON.parse(txt); } catch { j = { message: txt.slice(0, 400) }; }
  if (!r.ok) {
    const params = Array.isArray(j.invalid_params) ? ' — ' + j.invalid_params.map((x) => `${x.field || x.name}: ${x.reason}`).join('; ') : '';
    // 401 do Magnific vira 502 para não se confundir com a senha de acesso do app
    throw new Erro(r.status === 401 ? 502 : r.status, r.status === 401 ? 'O Magnific recusou a chave da API. Confira a chave no botão "Magnific".' : (j.message || j.detail || j.title || `Erro ${r.status} no Magnific`) + params);
  }
  return j;
}

function carimbo() {
  const d = new Date(Date.now() - 3 * 3600 * 1000), z = (n) => String(n).padStart(2, '0'); // horário de Brasília
  return `${d.getUTCFullYear()}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}-${z(d.getUTCHours())}${z(d.getUTCMinutes())}${z(d.getUTCSeconds())}`;
}
const aleatorio = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
function deBase64(b64) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
const lerHist = async (env) => (await env.DADOS.get('hist', 'json')) || [];

async function api(req, env, url) {
  const rota = url.pathname, metodo = req.method;

  if (rota === '/api/config' && metodo === 'GET') return json(200, { temChave: !!(await lerChave(env)), hospedado: true });

  if (rota === '/api/config' && metodo === 'POST') {
    exigirAcesso(req, env);
    const { chave } = await req.json();
    if (typeof chave !== 'string' || !/^[\w\-.:~+/=]{8,200}$/.test(chave.trim())) return json(400, { erro: 'Chave em formato inesperado.' });
    await env.DADOS.put('chave', chave.trim());
    return json(200, { temChave: true });
  }

  if (rota === '/api/gerar' && metodo === 'POST') {
    exigirAcesso(req, env);
    const { modelo, prompt, imagem, proporcao, opcoes, rotulo } = await req.json();
    const M = MODELOS[modelo];
    if (!M) return json(400, { erro: 'Modelo desconhecido.' });
    if (!prompt || !String(prompt).trim()) return json(400, { erro: 'Escreva o prompt da cena.' });
    const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(imagem || '');
    if (!m) return json(400, { erro: 'Quadro de referência ausente.' });
    if (m[2].length > 12e6) return json(413, { erro: 'Quadro de referência grande demais.' });
    const r = await magnific(env, M.caminho, { metodo: 'POST', corpo: M.corpo({ prompt: String(prompt).slice(0, 12000), b64: m[2], proporcao: Number(proporcao) || 16 / 9, opcoes: opcoes || {} }) });
    const tarefa = r && r.data && r.data.task_id;
    if (!tarefa) return json(502, { erro: 'O Magnific não devolveu o número da tarefa.' });
    const id = carimbo() + '-' + aleatorio(8);
    const ref = `${id}-quadro.${m[1] === 'jpeg' ? 'jpg' : 'png'}`;
    await env.DADOS.put('img:' + ref, deBase64(m[2]), { metadata: { tipo: 'image/' + m[1] } });
    // rotulo: nome do plano, quando o pedido vem do lote; aparece junto da imagem na galeria
    await env.DADOS.put('tarefa:' + id, JSON.stringify({ modelo, tarefa, prompt: String(prompt).slice(0, 12000), ref: '/geracoes/' + ref, quando: new Date().toISOString(), rotulo: typeof rotulo === 'string' ? rotulo.trim().slice(0, 80) : '' }), { expirationTtl: 86400 });
    return json(200, { id });
  }

  if (rota.startsWith('/api/tarefa/') && metodo === 'GET') {
    exigirAcesso(req, env);
    const id = rota.slice('/api/tarefa/'.length);
    if (!/^[\w-]{10,60}$/.test(id)) return json(400, { erro: 'Tarefa inválida.' });
    const t = await env.DADOS.get('tarefa:' + id, 'json');
    if (!t) return json(404, { erro: 'Tarefa não encontrada (pode ter expirado).' });
    if (t.pronto) return json(200, t.pronto);
    const r = await magnific(env, `${MODELOS[t.modelo].caminho}/${t.tarefa}`);
    const status = (r && r.data && r.data.status) || 'IN_PROGRESS';
    if (status === 'FAILED') {
      t.pronto = { status: 'FAILED', erro: 'O Magnific não conseguiu gerar essa imagem (pode ter sido barrada pelo filtro de conteúdo).' };
      await env.DADOS.put('tarefa:' + id, JSON.stringify(t), { expirationTtl: 86400 });
      return json(200, t.pronto);
    }
    if (status !== 'COMPLETED') return json(200, { status });
    const urls = (r.data.generated || []).filter((u) => typeof u === 'string').slice(0, 4);
    const imagens = [];
    for (let i = 0; i < urls.length; i++) {
      const g = await fetch(urls[i]);
      if (!g.ok) throw new Erro(502, `Não consegui baixar a imagem gerada (${g.status}).`);
      const tipo = g.headers.get('content-type') || 'image/png';
      const nome = `${id}-${i + 1}.${tipo.includes('jpeg') ? 'jpg' : tipo.includes('webp') ? 'webp' : 'png'}`;
      await env.DADOS.put('img:' + nome, await g.arrayBuffer(), { metadata: { tipo } });
      imagens.push('/geracoes/' + nome);
    }
    const item = { id, quando: t.quando, modelo: t.modelo, prompt: t.prompt, quadro: t.ref, imagens };
    if (t.rotulo) item.rotulo = t.rotulo;
    const h = await lerHist(env);
    h.unshift(item);
    await env.DADOS.put('hist', JSON.stringify(h.slice(0, 80)));
    t.pronto = { status: 'COMPLETED', item };
    await env.DADOS.put('tarefa:' + id, JSON.stringify(t), { expirationTtl: 86400 });
    return json(200, t.pronto);
  }

  if (rota === '/api/melhorar' && metodo === 'POST') {
    exigirAcesso(req, env);
    const { texto, idioma } = await req.json();
    const t = String(texto || '').trim();
    if (!t) return json(400, { erro: 'Escreva ou narre a cena antes de melhorar.' });
    const r = await magnific(env, '/v1/ai/improve-prompt', { metodo: 'POST', corpo: { prompt: t.slice(0, 2500), type: 'image', language: /^[a-z]{2}$/.test(idioma || '') ? idioma : 'pt' } });
    const tarefa = r && r.data && r.data.task_id;
    if (!tarefa) return json(502, { erro: 'O Magnific não devolveu o número da tarefa.' });
    for (let i = 0; i < 25; i++) {
      await new Promise((ok) => setTimeout(ok, 1000));
      const g = await magnific(env, '/v1/ai/improve-prompt/' + tarefa);
      const status = g && g.data && g.data.status;
      if (status === 'FAILED') return json(502, { erro: 'O Magnific não conseguiu melhorar esse texto.' });
      if (status === 'COMPLETED') {
        const novo = String((g.data.generated || [])[0] || '').trim();
        if (!novo) return json(502, { erro: 'O Magnific devolveu um texto vazio.' });
        return json(200, { texto: novo });
      }
    }
    return json(504, { erro: 'O Magnific demorou demais para melhorar o texto. Tente de novo.' });
  }

  if (rota === '/api/historico' && metodo === 'GET') { exigirAcesso(req, env); return json(200, (await lerHist(env)).slice(0, 60)); }

  return json(404, { erro: 'Rota não encontrada.' });
}

// As imagens não levam cabeçalho de senha (são <img>); o nome tem 64 bits aleatórios e só aparece na galeria protegida.
async function imagem(env, url) {
  const nome = decodeURIComponent(url.pathname.slice('/geracoes/'.length));
  if (!/^[\w.-]{10,90}$/.test(nome)) return new Response('Não encontrado', { status: 404 });
  const { value, metadata } = await env.DADOS.getWithMetadata('img:' + nome, 'arrayBuffer');
  if (!value) return new Response('Não encontrado', { status: 404 });
  return new Response(value, { headers: { 'Content-Type': (metadata && metadata.tipo) || 'image/png', 'Cache-Control': 'private, max-age=31536000, immutable', 'X-Robots-Tag': 'noindex' } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, env, url);
      if (url.pathname.startsWith('/geracoes/')) return await imagem(env, url);
      return env.ASSETS.fetch(req);
    } catch (e) {
      return json(e.status && e.status >= 400 ? e.status : 500, { erro: e.message || 'Erro interno.', codigo: e.codigo });
    }
  },
};
