// Interface: barra, lista da cena e os quatro painéis (Seleção, Câmera, Luz, Gerar).
import * as THREE from 'three';
import * as N from './nucleo.js';
import { BIOTIPOS, CORES_BONECO, POSES, JUNTAS } from './manequim.js';
import { CATALOGO } from './elementos.js';
import { TIPOS_LUZ, PRESETS_LUZ, kelvinParaCor, nomeTemperatura } from './luzes.js';
import { SENSORES, PROPORCOES, FOCAIS, DIAFRAGMAS, ANAMORFICAS, SUPORTES, TAMANHOS, DIRECOES, ALTURAS } from './cameras.js';
import { ESTILOS, MODELOS, montarPrompt, api, acesso } from './gerar.js';

const { E, H, rad, grau, clamp } = N;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const TOQUE = window.matchMedia('(pointer: coarse)').matches;
const CELULAR = window.matchMedia('(max-width: 820px)');

function el(tag, attrs, ...filhos) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k in e) e[k] = v;
    else e.setAttribute(k, v);
  }
  for (const f of filhos.flat(3)) if (f != null && f !== false) e.append(f.nodeType ? f : document.createTextNode(String(f)));
  return e;
}

// ---------- controles ----------
function slider(rot, o) {
  const passo = o.passo ?? 1;
  const casas = o.casas ?? (passo >= 1 ? 0 : passo >= 0.1 ? 1 : 2);
  const f = (v) => Number(v).toFixed(casas);
  const fim = o.fim || N.commit;
  let rng;
  if (o.log) {
    const k = Math.log(o.max / o.min);
    const paraV = (p) => o.min * Math.exp((k * p) / 1000), paraP = (v) => (1000 * Math.log(clamp(v, o.min, o.max) / o.min)) / k;
    rng = el('input', { type: 'range', min: 0, max: 1000, step: 1, value: paraP(o.valor), class: o.classe });
    rng.addEventListener('input', () => { const v = +paraV(+rng.value).toFixed(casas); num.value = f(v); o.mudar(v); });
    rng._por = (v) => { rng.value = paraP(v); };
  } else {
    rng = el('input', { type: 'range', min: o.min, max: o.max, step: passo, value: o.valor, class: o.classe });
    rng.addEventListener('input', () => { num.value = f(rng.value); o.mudar(+rng.value); });
    rng._por = (v) => { rng.value = v; };
  }
  const num = el('input', { type: 'number', min: o.min, max: o.max, step: passo, value: f(o.valor) });
  rng.addEventListener('change', () => fim());
  num.addEventListener('change', () => { const v = clamp(parseFloat(num.value.replace(',', '.')) || 0, o.min, o.max); num.value = f(v); rng._por(v); o.mudar(v); fim(); });
  return el('label', { class: 'campo', title: o.dica }, el('span', { class: 'rot' }, rot), rng, el('span', { class: 'numbox' }, num, o.un ? el('i', null, o.un) : null));
}
function seletor(rot, opcoes, valor, mudar) {
  const s = el('select', { onchange: () => mudar(s.value) }, opcoes.map(([v, t]) => el('option', { value: String(v), selected: String(v) === String(valor) }, t)));
  return el('label', { class: 'campo largo' }, el('span', { class: 'rot' }, rot), s);
}
function texto(rot, valor, mudar, dica) {
  const i = el('input', { type: 'text', value: valor || '', placeholder: dica || '', spellcheck: false, oninput: () => mudar(i.value), onchange: () => N.commit() });
  return el('label', { class: 'campo largo' }, el('span', { class: 'rot' }, rot), i);
}
function area(rot, valor, mudar, dica, classe) {
  const t = el('textarea', { value: valor || '', placeholder: dica || '', class: classe, oninput: () => mudar(t.value), onchange: () => N.commit() });
  return el('label', { class: 'campo bloco' }, rot ? el('span', { class: 'rot' }, rot) : null, t);
}
function check(rot, valor, mudar) {
  const c = el('input', { type: 'checkbox', checked: !!valor, onchange: () => mudar(c.checked) });
  return el('label', { class: 'check' }, c, rot);
}
function cor(rot, valor, mudar) {
  const c = el('input', { type: 'color', value: valor, oninput: () => mudar(c.value), onchange: () => N.commit() });
  return el('label', { class: 'campo largo' }, el('span', { class: 'rot' }, rot), c);
}
function chips(opcoes, valor, escolher, classe = '') {
  return el('div', { class: 'chips ' + classe }, opcoes.map(([v, t, dica]) => el('button', { class: v === valor ? 'ativo' : '', title: dica, onclick: () => escolher(v) }, t)));
}
const secao = (titulo, ...f) => el('section', null, el('h3', null, titulo), ...f);
const fila = (...f) => el('div', { class: 'fila' }, ...f);
const botao = (t, onclick, classe, dica) => el('button', { onclick, class: classe, title: dica }, t);
const nota = (t) => el('p', { class: 'nota' }, t);
const por = (p, ...f) => p.replaceChildren(...f.flat().filter((x) => x != null && x !== false));

// ---------- barra superior ----------
function renderBarra() {
  for (const b of $$('#vistas button')) b.classList.toggle('ativo', b.dataset.vista === E.vista);
  for (const b of $$('#modos button')) b.classList.toggle('ativo', b.dataset.modo === E.modo && !E.posar);
  $('#btPosar').classList.toggle('ativo', E.posar);
  for (const b of $$('#guias button')) b.classList.toggle('ativo', !!E.guias[b.dataset.guia]);
  $('#dica').innerHTML = TOQUE
    ? (E.vista === 'camera' ? '<b>Um dedo</b> pan e tilt · <b>Dois dedos</b> pinça aproxima, arrastar desloca' : '<b>Um dedo</b> gira a vista · <b>Dois dedos</b> aproxima e desloca')
    : E.vista === 'camera'
    ? '<b>Arrastar</b> pan e tilt · <b>Shift</b> ou botão direito desloca · <b>Roda</b> dolly · <b>Alt+roda</b> troca a lente · <b>Alt+arrastar</b> orbita'
    : '<b>Arrastar</b> gira a vista · <b>Botão direito</b> desloca · <b>Roda</b> aproxima · clique na câmera laranja para movê-la';
  desenharGuias();
}
function desenharGuias() {
  const g = E.guias, cam = E.vista === 'camera', p = [];
  if (cam && g.tercos) p.push('<path d="M33.333 0V100M66.667 0V100M0 33.333H100M0 66.667H100"/>');
  if (cam && g.seguranca) p.push('<rect class="seg2" x="5" y="5" width="90" height="90"/><rect class="seg2" x="10" y="10" width="80" height="80"/>');
  if (cam && g.centro) p.push('<path class="cruz" d="M48 50H52M50 46.5V53.5"/>');
  $('#guiasSvg').innerHTML = p.join('');
}
$('#vistas').addEventListener('click', (e) => e.target.dataset.vista && N.setVista(e.target.dataset.vista));
$('#modos').addEventListener('click', (e) => { if (!e.target.dataset.modo) return; if (E.posar) N.setPosar(false); N.setModo(e.target.dataset.modo); });
$('#btPosar').addEventListener('click', () => N.setPosar(!E.posar));
$('#guias').addEventListener('click', (e) => { const k = e.target.dataset.guia; if (!k) return; E.guias[k] = !E.guias[k]; renderBarra(); N.commit(); });
$('#pip').addEventListener('click', () => N.setVista(E.vista === 'camera' ? 'cena' : 'camera'));
$('#btDesfazer').addEventListener('click', N.desfazer);
$('#btRefazer').addEventListener('click', N.refazer);
$('#btNova').addEventListener('click', () => { N.cenaInicial(); N.aviso('Cena nova. Ctrl+Z traz a anterior de volta.'); });
$('#btSalvar').addEventListener('click', N.exportarArquivo);
$('#btAbrir').addEventListener('click', () => $('#arqCena').click());
$('#arqCena').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { N.importarArquivo(await f.text()); N.aviso('Cena aberta.'); } catch (err) { N.aviso(err.message, true); }
});

// ---------- coluna esquerda ----------
$('#addBonecos').append(...Object.entries(BIOTIPOS).map(([id, b]) => botao(b.nome, () => N.adicionarBoneco(id), '', 'Adicionar ' + b.nome.toLowerCase())));
$('#addElementos').append(...CATALOGO.map((c) => botao(c.nome, () => N.adicionarElemento(c.id), '', 'Adicionar ' + c.nome.toLowerCase())));
$('#addLuzes').append(...Object.entries(TIPOS_LUZ).map(([id, t]) => botao('＋ ' + t.nome, () => N.adicionarLuz(id))));
$('#btImagem').addEventListener('click', () => $('#arqImagem').click());
$('#btModelo').addEventListener('click', () => $('#arqModelo').click());
const lerURL = (f) => new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = erro; r.readAsDataURL(f); });
$('#arqImagem').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const img = new Image(); img.src = await lerURL(f); await img.decode();
  const esc = Math.min(1, 2048 / Math.max(img.width, img.height));
  const c = el('canvas', { width: Math.round(img.width * esc), height: Math.round(img.height * esc) });
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  N.adicionarElemento('imagem', { nome: f.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Imagem', ativo: N.novoAtivo(c.toDataURL(f.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9)) });
});
$('#arqModelo').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  if (f.size > 40e6) return N.aviso('Modelo grande demais (limite de 40 MB).', true);
  N.adicionarElemento('modelo', { nome: f.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Modelo', ativo: N.novoAtivo(await lerURL(f)) });
});

function renderLista() {
  const linhas = [el('div', { class: 'linha' + (E.sel === 'camera' ? ' sel' : ''), onclick: () => N.selecionar('camera') }, el('i', { class: 'tipo cam' }), el('span', { class: 'nome' }, 'Câmera'))];
  for (const it of E.itens) {
    const ponto = el('i', { class: 'tipo ' + (it.tipo === 'luz' ? 'luz' : it.tipo === 'elemento' ? 'elem' : '') });
    if (it.tipo === 'boneco') ponto.style.background = it.cor;
    if (it.tipo === 'elemento' && it.cor) ponto.style.background = it.cor;
    linhas.push(el('div', { class: 'linha' + (E.sel === it.id ? ' sel' : '') + (it.obj.visible ? '' : ' oculto'), onclick: () => N.selecionar(it.id) },
      ponto, el('span', { class: 'nome' }, it.nome),
      el('button', { class: 'olho', title: it.obj.visible ? 'Esconder' : 'Mostrar', onclick: (e) => { e.stopPropagation(); N.alternarVisivel(it.id); } }, it.obj.visible ? '◉' : '○'),
      el('button', { title: 'Excluir', onclick: (e) => { e.stopPropagation(); N.remover(it.id); } }, '✕')));
  }
  $('#lista').replaceChildren(...linhas);
}

// ---------- abas ----------
function renderAbas() {
  if (E.aba === 'add' && !CELULAR.matches) E.aba = 'sel'; // a aba "Cena" só existe no celular (no computador é a coluna da esquerda)
  document.body.classList.toggle('aba-add', E.aba === 'add');
  for (const b of $$('#abas button')) b.classList.toggle('ativo', b.dataset.aba === E.aba);
  for (const p of $$('.painel')) p.classList.toggle('ativo', p.id === 'p-' + E.aba);
}
$('#abas').addEventListener('click', (e) => {
  if (!e.target.dataset.aba) return;
  E.aba = e.target.dataset.aba; renderAbas();
  ({ add: renderLista, sel: renderSel, cam: renderCam, luz: renderLuz, ger: renderGer })[E.aba]();
});
const digitando = (p) => p.contains(document.activeElement) && document.activeElement.matches('input[type=number], input[type=text], textarea, select');

// ---------- painel: seleção ----------
function blocoPosicao(it, comAltura) {
  const o = it.obj;
  return secao('Posição',
    slider('Lado (X)', { min: -15, max: 15, passo: 0.05, valor: clamp(o.position.x, -15, 15), un: 'm', mudar: (v) => { o.position.x = v; } }),
    slider('Fundo (Z)', { min: -15, max: 15, passo: 0.05, valor: clamp(o.position.z, -15, 15), un: 'm', mudar: (v) => { o.position.z = v; } }),
    comAltura ? slider('Altura', { min: 0, max: 15, passo: 0.05, valor: clamp(o.position.y, 0, 15), un: 'm', mudar: (v) => { o.position.y = v; } }) : null,
    it.tipo !== 'luz' ? slider('Direção', { min: -180, max: 180, passo: 1, valor: Math.round(grau(o.rotation.y)), un: '°', mudar: (v) => { o.rotation.y = rad(v); } }) : null);
}
function renderSel() {
  renderAbas();
  const p = $('#p-sel');
  if (digitando(p)) return;
  const it = N.item(E.sel);
  if (E.sel === 'camera') return por(p, el('div', { class: 'vazio' }, 'A câmera está selecionada.', el('br'), 'Os ajustes dela ficam na aba Câmera.', el('br'), el('br'), 'Na vista Cena dá para arrastá-la com as setas.'));
  if (!it) return por(p, el('div', { class: 'vazio' }, 'Nada selecionado.', el('br'), el('br'), 'Clique num personagem, elemento ou luz — no quadro ou na lista à esquerda. Use os botões da esquerda para colocar coisas novas na cena.'));
  const fim = fila(botao('Duplicar', () => N.duplicar(it.id), '', 'Ctrl+D'), botao('Excluir', () => N.remover(it.id), 'perigo', 'Delete'));

  if (it.tipo === 'boneco') {
    const J = it.ctl.juntas, j = E.junta || 'ombroD', esp = j.endsWith('D') ? -1 : 1, r = J[j].rotation;
    const eixo = (nome, k, e) => slider(nome, { min: -180, max: 180, passo: 1, valor: Math.round(grau(r[k]) * e), un: '°', mudar: (v) => { r[k] = rad(v) * e; }, fim: () => { it.ctl.aterrar(); it.poseId = null; N.commit(); } });
    const outros = [['camera', 'Câmera'], ...N.bonecos().filter((b) => b !== it).map((b) => [b.id, b.nome])];
    let olhar = 'camera';
    const ponto = () => (olhar === 'camera' ? N.filmCam.position.clone() : N.cabecaMundo(N.item(olhar)));
    por(p, 
      secao('Personagem',
        texto('Nome', it.nome, (v) => { it.nome = v; renderLista(); }),
        area('Quem é (entra no prompt)', it.descricao, (v) => { it.descricao = v; }, 'Ex.: mulher de 30 anos, cabelo preso, casaco vermelho'),
        seletor('Biotipo', Object.entries(BIOTIPOS).map(([k, b]) => [k, b.nome]), it.biotipo, (v) => { N.reconstruir(it, { biotipo: v, altura: BIOTIPOS[v].altura }); N.selecionar(it.id, E.junta, false); N.commit(); }),
        slider('Altura', { min: 0.8, max: 2.2, passo: 0.01, valor: it.altura, un: 'm', mudar: (v) => { it.altura = v; it.ctl.setAltura(v); } }),
        el('div', { class: 'cores' }, CORES_BONECO.map((c) => el('button', { class: c.hex === it.cor ? 'ativo' : '', title: c.id, style: { background: c.hex }, onclick: () => { it.cor = c.hex; it.ctl.setCor(c.hex); renderSel(); renderLista(); N.commit(); } })))),
      secao('Pose',
        chips(Object.entries(POSES).map(([k, v]) => [k, v.nome]), it.poseId, (k) => { it.poseId = k; it.ctl.setPose(POSES[k].j); renderSel(); N.commit(); }, 'texto'),
        fila(botao('Espelhar', () => espelharPose(it)), botao('Virar p/ câmera', () => N.virarPara(it, N.filmCam.position), '', 'Gira o corpo inteiro na direção da câmera'))),
      secao('Olhar',
        seletor('Olhar para', outros, olhar, (v) => { olhar = v; }),
        fila(botao('Virar a cabeça', () => N.olharPara(it, ponto())), botao('Virar o corpo', () => N.virarPara(it, ponto())))),
      secao('Junta',
        seletor('Junta', JUNTAS, j, (v) => { N.selecionar(it.id, v, false); }),
        eixo('Frente/trás', 'x', 1), eixo('Torção', 'y', esp), eixo('Abrir/fechar', 'z', esp),
        fila(botao('Zerar junta', () => { r.set(0, 0, 0); it.ctl.aterrar(); it.poseId = null; renderSel(); N.commit(); }), botao(E.posar ? 'Sair do modo Posar' : 'Posar no quadro', () => N.setPosar(!E.posar), E.posar ? 'ativo' : '')),
        nota('No modo Posar, clique numa parte do corpo no quadro e gire pelos arcos coloridos.')),
      blocoPosicao(it, true), fim);
    return;
  }

  if (it.tipo === 'elemento') {
    const o = it.obj;
    por(p, 
      secao('Elemento',
        texto('Nome', it.nome, (v) => { it.nome = v; renderLista(); }),
        area('O que é (entra no prompt)', it.descricao, (v) => { it.descricao = v; }, 'Ex.: mesa de madeira gasta com papéis e um abajur'),
        o.userData.semCor ? null : cor('Cor', it.cor, (v) => { it.cor = v; o.userData.mat.color.set(v); renderLista(); })),
      secao('Tamanho',
        slider('Geral', { min: 0.1, max: 6, passo: 0.01, valor: clamp(o.scale.y, 0.1, 6), un: '×', mudar: (v) => { const k = v / o.scale.y; o.scale.multiplyScalar(k); } , fim: () => { renderSel(); N.commit(); } }),
        slider('Largura', { min: 0.05, max: 10, passo: 0.01, valor: clamp(o.scale.x, 0.05, 10), un: '×', mudar: (v) => { o.scale.x = v; } }),
        slider('Altura', { min: 0.05, max: 10, passo: 0.01, valor: clamp(o.scale.y, 0.05, 10), un: '×', mudar: (v) => { o.scale.y = v; } }),
        slider('Profund.', { min: 0.05, max: 10, passo: 0.01, valor: clamp(o.scale.z, 0.05, 10), un: '×', mudar: (v) => { o.scale.z = v; } })),
      blocoPosicao(it, true), fim);
    return;
  }

  // luz
  const ap = () => it.ctl.aplicar(it);
  const alvos = N.bonecos().concat(E.itens.filter((i) => i.tipo === 'elemento')).map((b) => [b.id, b.nome]);
  let alvo = alvos[0] && alvos[0][0];
  const amostra = el('i', { style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', marginRight: '6px', background: '#' + kelvinParaCor(it.kelvin).getHexString() } });
  const leitK = el('p', { class: 'nota' }, amostra, nomeTemperatura(it.kelvin));
  por(p, 
    secao(TIPOS_LUZ[it.forma].nome,
      texto('Nome', it.nome, (v) => { it.nome = v; renderLista(); }),
      check('Ligada', it.ligada !== false, (v) => { it.ligada = v; ap(); N.commit(); }),
      slider('Intensidade', { min: 0, max: 400, passo: 1, valor: Math.round(it.intensidade * 100), un: '%', mudar: (v) => { it.intensidade = v / 100; ap(); } }),
      slider('Temperatura', { min: 1700, max: 12000, passo: 50, valor: it.kelvin, un: 'K', classe: 'kelvin', mudar: (v) => { it.kelvin = v; ap(); amostra.style.background = '#' + kelvinParaCor(v).getHexString(); leitK.lastChild.textContent = nomeTemperatura(v); } }),
      leitK,
      el('div', { class: 'campo largo' }, el('span', { class: 'rot' }, 'Gelatina'), fila(
        el('input', { type: 'color', value: it.gel || '#ffffff', oninput: (e) => { it.gel = e.target.value; ap(); }, onchange: () => N.commit() }),
        botao('Sem gelatina', () => { it.gel = null; ap(); renderSel(); N.commit(); }))),
      it.forma === 'spot' || it.forma === 'softbox' ? slider('Abertura', { min: 5, max: 160, passo: 1, valor: it.angulo, un: '°', mudar: (v) => { it.angulo = v; ap(); }, dica: 'Ângulo do facho' }) : null,
      slider('Suavidade', { min: 0, max: 1, passo: 0.01, valor: it.suavidade, mudar: (v) => { it.suavidade = v; ap(); }, dica: 'Borda do facho e da sombra' }),
      check('Projeta sombra', it.sombra, (v) => { it.sombra = v; ap(); N.commit(); })),
    alvos.length ? secao('Mira',
      seletor('Apontar para', alvos, alvo, (v) => { alvo = v; }),
      fila(botao('Apontar', () => { N.apontarLuz(it, N.item(alvo)); }))) : null,
    blocoPosicao(it, true),
    nota(it.forma === 'sol' ? 'No sol só a direção importa: a posição define de onde ele vem.' : 'Na vista Cena, arraste a luz pelas setas ou gire com o modo Girar.'),
    fim);
}
function espelharPose(it) {
  const a = it.ctl.getPose(), b = {};
  for (const [k, v] of Object.entries(a)) {
    if (k.endsWith('E')) b[k.slice(0, -1) + 'D'] = v;
    else if (k.endsWith('D')) b[k.slice(0, -1) + 'E'] = v;
    else b[k] = [v[0], -v[1], -v[2]];
  }
  it.ctl.setPose(b); it.poseId = null; renderSel(); N.commit();
}

// ---------- painel: câmera ----------
const m2 = (n) => n.toFixed(2).replace('.', ',');
function renderCam() {
  const p = $('#p-cam');
  if (E.aba !== 'cam' || digitando(p)) return;
  const c = E.cam, o = N.opticaAtual(), topo = p.scrollTop;
  const ap = () => { N.aplicarCamera(); atualizarLeituras(); };
  const leitLente = el('div', { class: 'leitura' }), leitFoco = el('div', { class: 'leitura' }), leitSensor = el('div', { class: 'leitura' });
  function atualizarLeituras() {
    const x = N.opticaAtual();
    leitSensor.innerHTML = `Área usada <b>${x.janela.w.toFixed(1)} × ${x.janela.h.toFixed(1)} mm</b>`;
    leitLente.innerHTML = `Ângulo <b>${x.fovH.toFixed(1)}° × ${x.fovV.toFixed(1)}°</b><br>Equivale a <b>${x.equivFF.toFixed(0)} mm</b> em full frame`;
    leitFoco.innerHTML = `Nítido de <b>${m2(x.perto)} m</b> a <b>${Number.isFinite(x.longe) ? m2(x.longe) + ' m' : 'infinito'}</b><br>Hiperfocal <b>${m2(x.hiperfocal)} m</b>`;
  }
  const alvos = [['', 'Automático'], ...E.itens.filter((i) => i.tipo !== 'luz').map((i) => [i.id, i.nome])];
  por(p, 
    secao('Enquadrar',
      seletor('Em quem', alvos, E.enq.alvo || '', (v) => { E.enq.alvo = v || null; N.enquadrar(); }),
      chips(TAMANHOS.map((t) => [t.id, t.sigla, t.nome]), E.enq.tamanho, (v) => N.enquadrar({ tamanho: v })),
      chips(DIRECOES.map(([t, v]) => [v, t]), E.enq.az, (v) => N.enquadrar({ az: v }), 'texto'),
      chips(ALTURAS.map(([t, v]) => [v, t]), E.enq.el, (v) => N.enquadrar({ el: v }), 'texto'),
      fila(botao('Sobre o ombro', N.sobreOmbro, '', 'Câmera atrás do ombro do outro personagem'), botao('Subjetiva', N.subjetiva, '', 'A câmera vê o que o personagem vê'),
        botao('Holandês', () => { c.roll = Math.abs(c.roll) > 1 ? 0 : 14; N.aplicarCamera(); renderCam(); N.commit(); }, Math.abs(c.roll) > 1 ? 'ativo' : '', 'Inclina o horizonte'))),
    secao('Câmera',
      seletor('Corpo', SENSORES.map((s) => [s.id, s.nome]), c.sensor, (v) => { c.sensor = v; ap(); N.commit(); }),
      seletor('Proporção', PROPORCOES, c.proporcao, (v) => { c.proporcao = +v; N.mudarProporcao(); atualizarLeituras(); N.commit(); }),
      seletor('Suporte', SUPORTES.map((s) => [s[0], s[1]]), c.suporte, (v) => N.aplicarSuporte(v)),
      leitSensor),
    secao('Lente',
      chips(FOCAIS.map((f) => [f, String(f)]), c.focal, (v) => { c.focal = v; N.aplicarCamera(); renderCam(); N.commit(); }),
      slider('Focal', { min: 8, max: 400, log: true, casas: 0, valor: c.focal, un: 'mm', mudar: (v) => { c.focal = v; ap(); }, fim: () => { renderCam(); N.commit(); } }),
      seletor('Tipo', ANAMORFICAS, c.anamorfica, (v) => { c.anamorfica = +v; ap(); N.commit(); }),
      leitLente),
    secao('Foco e abertura',
      chips(DIAFRAGMAS.map((t) => [t, 'T' + t]), c.t, (v) => { c.t = v; N.aplicarCamera(); renderCam(); N.commit(); }),
      slider('Foco', { min: 0.3, max: 100, log: true, casas: 2, passo: 0.01, valor: c.foco, un: 'm', mudar: (v) => { c.foco = v; ap(); } }),
      fila(botao('Focar no selecionado', () => N.focarEm(), '', 'F')),
      check('Mostrar desfoque no quadro', c.pdc, (v) => { c.pdc = v; N.commit(); }),
      leitFoco),
    secao('Posição',
      slider('Altura', { min: 0.05, max: 30, log: true, casas: 2, passo: 0.01, valor: c.pos[1], un: 'm', mudar: (v) => { c.pos[1] = v; c.suporte = 'livre'; ap(); } }),
      slider('Pan', { min: -180, max: 180, passo: 0.5, casas: 1, valor: ((c.pan + 180) % 360 + 360) % 360 - 180, un: '°', mudar: (v) => { c.pan = v; ap(); } }),
      slider('Tilt', { min: -89, max: 89, passo: 0.5, casas: 1, valor: c.tilt, un: '°', mudar: (v) => { c.tilt = v; ap(); } }),
      slider('Horizonte', { min: -45, max: 45, passo: 0.5, casas: 1, valor: c.roll, un: '°', mudar: (v) => { c.roll = v; ap(); } }),
      fila(botao('Nivelar', () => { c.tilt = 0; c.roll = 0; N.aplicarCamera(); renderCam(); N.commit(); }), botao('Salvar plano', N.salvarPlano, '', 'Guarda este enquadramento na tira de planos'))),
    secao('Exposição',
      slider('Compensar', { min: -3, max: 3, passo: 0.1, valor: c.ev, un: 'EV', mudar: (v) => { c.ev = v; ap(); } })));
  atualizarLeituras();
  p.scrollTop = topo;
}

function renderHud() {
  const c = E.cam, o = N.opticaAtual(), T = N.classificarPlano();
  const prop = (PROPORCOES.find((x) => Math.abs(x[0] - c.proporcao) < 0.01) || [0, m2(c.proporcao) + ':1'])[1].split(' ')[0];
  $('#hud').innerHTML =
    `<span><b>${Math.round(c.focal)} mm</b>${c.anamorfica > 1 ? ' anam. ' + c.anamorfica + '×' : ''} · <b>T${c.t}</b></span>` +
    `<span>${o.sensor.nome.split(' · ')[0]} · ${prop}</span>` +
    `<span>ângulo <b>${o.fovH.toFixed(1)}°</b></span>` +
    `<span>foco <b>${m2(c.foco)} m</b> (${m2(o.perto)}–${Number.isFinite(o.longe) ? m2(o.longe) : '∞'})</span>` +
    `<span>altura <b>${m2(c.pos[1])} m</b> · tilt <b>${Math.round(c.tilt)}°</b>${Math.abs(c.roll) >= 1 ? ' · horizonte <b>' + Math.round(c.roll) + '°</b>' : ''}</span>` +
    `<span class="dest">${T.sigla} · ${T.nome}${T.n > 1 ? ' · ' + T.n + ' pessoas' : ''}</span>`;
}

// ---------- painel: luz ----------
function renderLuz() {
  const p = $('#p-luz');
  if (E.aba !== 'luz' || digitando(p)) return;
  const a = E.amb, topo = p.scrollTop;
  const luzes = E.itens.filter((i) => i.tipo === 'luz');
  por(p, 
    secao('Esquemas de luz',
      el('div', { class: 'cartoes' }, PRESETS_LUZ.map((s) => el('button', { class: a.esquema === s.id ? 'ativo' : '', onclick: () => N.aplicarEsquema(s.id) }, s.nome, el('small', null, s.desc)))),
      nota('O esquema troca as luzes da cena e se monta em volta do personagem selecionado, do ponto de vista da câmera.')),
    secao('Luzes na cena',
      luzes.length ? luzes.map((it) => {
        const ap = () => it.ctl.aplicar(it);
        const pt = el('i', { style: { background: it.gel || '#' + kelvinParaCor(it.kelvin).getHexString() } });
        return el('div', { class: 'luzitem' + (E.sel === it.id ? ' sel' : '') },
          el('header', { onclick: () => N.selecionar(it.id, null, false) }, pt, el('span', { class: 'nome' }, it.nome),
            el('button', { class: it.ligada !== false ? 'ativo' : '', onclick: (e) => { e.stopPropagation(); it.ligada = it.ligada === false; ap(); renderLuz(); N.commit(); } }, it.ligada !== false ? 'Ligada' : 'Desligada'),
            el('button', { title: 'Abrir todos os ajustes', onclick: (e) => { e.stopPropagation(); N.selecionar(it.id); } }, '⋯')),
          slider('Intensidade', { min: 0, max: 400, passo: 1, valor: Math.round(it.intensidade * 100), un: '%', mudar: (v) => { it.intensidade = v / 100; ap(); } }),
          slider('Temperatura', { min: 1700, max: 12000, passo: 50, valor: it.kelvin, un: 'K', classe: 'kelvin', mudar: (v) => { it.kelvin = v; ap(); if (!it.gel) pt.style.background = '#' + kelvinParaCor(v).getHexString(); } }));
      }) : el('p', { class: 'nota' }, 'Nenhuma luz. Escolha um esquema acima ou adicione uma abaixo.'),
      el('div', { class: 'grade4 topo6' }, Object.entries(TIPOS_LUZ).map(([id, t]) => botao('＋ ' + t.nome.split(' ')[0], () => N.adicionarLuz(id), '', 'Adicionar ' + t.nome.toLowerCase())))),
    secao('Ambiente',
      slider('Luz geral', { min: 0, max: 2, passo: 0.01, valor: a.intensidade, mudar: (v) => { a.intensidade = v; N.aplicarAmbiente(); }, dica: 'Preenchimento que vem de todos os lados' }),
      slider('Névoa', { min: 0, max: 1, passo: 0.01, valor: a.neblina, mudar: (v) => { a.neblina = v; } }),
      cor('Cor do céu', a.ceu, (v) => { a.ceu = v; N.aplicarAmbiente(); }),
      cor('Rebatida', a.solo, (v) => { a.solo = v; N.aplicarAmbiente(); }),
      cor('Fundo', a.fundo, (v) => { a.fundo = v; N.aplicarAmbiente(); }),
      cor('Chão', a.chao, (v) => { a.chao = v; N.aplicarAmbiente(); })));
  p.scrollTop = topo;
}

// ---------- painel: gerar ----------
let gerando = false, temChave = false, hospedado = false, semServidor = false, historico = [];
const AVISO_ESTATICO = 'Esta versão publicada não gera a imagem sozinha (a ponte com o Magnific só roda no computador do estúdio). O botão abaixo baixa o quadro e copia o prompt para você gerar em outra ferramenta.';
const modeloAtual = () => MODELOS.find((m) => m.id === E.ger.modelo) || MODELOS[0];
function promptAtual() {
  if (E.ger.manual != null) return E.ger.manual;
  return montarPrompt(N.resumoCena(), { texto: E.ger.texto, estilo: E.ger.estilo, modo: modeloAtual().modo, tecnico: E.ger.tecnico });
}
function atualizarPrompt() {
  const t = $('#promptFinal');
  if (t && E.ger.manual == null && document.activeElement !== t) t.value = promptAtual();
}
function estado(txt, tipo = '') {
  const e = $('#estadoGer'); if (!e) return;
  e.className = tipo; e.textContent = txt;
}
function renderGer() {
  const p = $('#p-ger');
  if (E.aba !== 'ger' || digitando(p)) return;
  const g = E.ger, M = modeloAtual(), topo = p.scrollTop;
  const opcoes = [];
  if (M.id === 'mystic') opcoes.push(
    slider('Fidelidade', { min: 0, max: 100, passo: 1, valor: g.forca, un: '%', mudar: (v) => { g.forca = v; }, dica: 'Quanto a imagem segue a composição do quadro' }),
    seletor('Variante', [['realism', 'Realismo'], ['super_real', 'Super real'], ['editorial_portraits', 'Retrato editorial'], ['fluid', 'Fluido'], ['zen', 'Zen'], ['flexible', 'Flexível']], g.mystic, (v) => { g.mystic = v; N.commit(); }),
    seletor('Resolução', [['1k', '1K'], ['2k', '2K'], ['4k', '4K']], g.resolucao, (v) => { g.resolucao = v; N.commit(); }));
  if (M.id === 'gpt2') opcoes.push(
    seletor('Qualidade', [['low', 'Rascunho (mais barato)'], ['medium', 'Média'], ['high', 'Alta (custa mais)']], g.qualidade, (v) => { g.qualidade = v; N.commit(); }),
    seletor('Variações', [[1, '1 imagem'], [2, '2 imagens'], [3, '3 imagens'], [4, '4 imagens']], g.quantidade, (v) => { g.quantidade = +v; N.commit(); }));
  const pers = N.bonecos();
  por(p, 
    secao('A cena',
      campoCena(),
      fila(
        el('button', { id: 'btNarrar', onclick: narrar, title: 'Liga o microfone e escreve o que você falar' }, 'Narrar a cena'),
        botao('Limpar', () => { g.texto = ''; g.textoOriginal = null; renderGer(); N.commit(); }, '', 'Apaga a descrição da cena')),
      el('p', { id: 'narrandoTexto', class: 'nota' }),
      fila(
        el('button', { id: 'btMelhorar', disabled: melhorando, onclick: melhorarTexto, title: 'Reescreve o que você narrou como uma descrição de cena caprichada' }, melhorando ? 'Melhorando…' : 'Melhorar o texto'),
        g.textoOriginal != null ? botao('Voltar ao meu texto', () => { g.texto = g.textoOriginal; g.textoOriginal = null; renderGer(); N.commit(); }, '', 'Desfaz a melhoria') : null),
      nota('"Melhorar o texto" pega o que você narrou ou escreveu, junta com quem está em quadro, o plano, a lente e a luz, e devolve uma descrição mais rica. Dá para editar depois.'),
      seletor('Estilo', ESTILOS.map((s) => [s.id, s.nome]), g.estilo, (v) => { g.estilo = v; atualizarPrompt(); N.commit(); })),
    pers.length ? secao('Quem é cada boneco',
      pers.map((b) => el('label', { class: 'pers' }, el('i', { style: { background: b.cor } }),
        el('input', { type: 'text', value: b.descricao || '', placeholder: b.nome + ': quem é, como está vestido', oninput: (e) => { b.descricao = e.target.value; atualizarPrompt(); }, onchange: () => N.commit() })))) : null,
    secao('Magnific',
      seletor('Modelo', MODELOS.map((m) => [m.id, m.nome]), g.modelo, (v) => { g.modelo = v; N.commit(); renderGer(); }),
      nota(M.nota), ...opcoes,
      check('Descrever câmera e luz no prompt', g.tecnico, (v) => { g.tecnico = v; atualizarPrompt(); N.commit(); })),
    secao('Prompt que será enviado',
      el('textarea', { id: 'promptFinal', class: 'prompt', readOnly: g.manual == null, spellcheck: false, value: promptAtual(), oninput: (e) => { if (g.manual != null) g.manual = e.target.value; } }),
      check('Editar o prompt à mão', g.manual != null, (v) => { g.manual = v ? promptAtual() : null; renderGer(); })),
    el('button', { id: 'btGerar', class: 'primario', style: { width: '100%', padding: '9px' }, disabled: gerando, onclick: gerar }, gerando ? 'Gerando…' : semServidor ? 'Baixar quadro e copiar prompt' : 'Gerar imagem'),
    fila(botao('Baixar quadro', baixarQuadro, '', 'PNG do enquadramento, sem grade nem guias'), botao('Copiar prompt', async () => { await navigator.clipboard.writeText(promptAtual()); N.aviso('Prompt copiado.'); })),
    el('div', { id: 'estadoGer' }, semServidor ? AVISO_ESTATICO : temChave ? '' : 'Falta ligar o Magnific: clique em "Magnific" no topo e cole a chave da API.'),
    historico.length ? secao('Geradas', el('div', { class: 'galeria' }, historico.flatMap((h) => h.imagens.map((src) => el('button', { onclick: () => abrirImagem(h, src) }, el('img', { src, loading: 'lazy', alt: '' })))))) : null);
  p.scrollTop = topo;
  atualizarNarracao();
}
function baixarQuadro() {
  const a = el('a', { href: N.capturar(2048, 1, 'image/png'), download: 'quadro.png' });
  a.click();
}
async function gerar() {
  if (gerando) return;
  pararNarracao();
  if (semServidor) {
    // sem servidor não dá para gerar aqui: entrega o quadro e o prompt do mesmo instante, para usar em outra ferramenta
    pararNarracao();
    const texto = promptAtual();
    baixarQuadro();
    try { await navigator.clipboard.writeText(texto); estado('Quadro baixado e prompt copiado, os dois deste mesmo enquadramento. Cole numa ferramenta de imagem ou mande para o Claude gerar.', 'ok'); }
    catch { estado('Quadro baixado. Não consegui copiar o prompt sozinho: toque em "Copiar prompt".', 'erro'); }
    return;
  }
  if (!temChave) return abrirChave();
  const g = E.ger, prompt = promptAtual();
  if (!g.texto.trim() && g.manual == null) { estado('Escreva como é a cena antes de gerar.', 'erro'); return; }
  gerando = true; renderGer();
  estado('Enviando o quadro para o Magnific…', 'girando');
  try {
    const quadro = N.capturar(1536, 0.92);
    const item = await comAcesso(() => api.gerar({ modelo: g.modelo, prompt, imagem: quadro, proporcao: E.cam.proporcao, opcoes: { forca: g.forca, mystic: g.mystic, qualidade: g.qualidade, quantidade: g.quantidade, resolucao: g.resolucao } },
      (seg) => estado(`Gerando no Magnific… ${seg}s`, 'girando')));
    if (!historico.length) await carregarHistorico();
    if (!historico.some((h) => h.id === item.id)) historico.unshift(item);
    gerando = false; renderGer();
    estado(hospedado ? 'Pronto. A imagem ficou guardada na galeria abaixo.' : 'Pronto. A imagem também ficou salva na pasta "geracoes".', 'ok');
    abrirImagem(item, item.imagens[0]);
  } catch (e) {
    gerando = false; renderGer();
    if (e.codigo === 'sem_chave' || (e.status === 401 && e.codigo !== 'senha')) { temChave = e.status === 401 ? temChave : false; estado(e.status === 401 ? 'O Magnific recusou a chave. Confira a chave no botão "Magnific".' : e.message, 'erro'); }
    else estado(e.message, 'erro');
  }
}

// ---------- narração por voz ----------
// Usa o reconhecimento de fala do próprio navegador (Chrome no computador e no Android). Precisa de internet.
let rec = null, narrando = false, parcial = '';
function campoCena() {
  const c = area('', E.ger.texto, (v) => { E.ger.texto = v; atualizarPrompt(); }, 'Descreva ou narre a cena: lugar, época, hora do dia, clima, figurino, o que está acontecendo, o que cada um sente…');
  const t = c.querySelector('textarea'); t.id = 'textoCena'; t.rows = 6;
  return c;
}
function atualizarNarracao() {
  const b = $('#btNarrar'), l = $('#narrandoTexto');
  if (b) { b.classList.toggle('gravando', narrando); b.textContent = narrando ? 'Parar de narrar' : 'Narrar a cena'; }
  if (l) { l.classList.toggle('ouvindo', narrando); l.textContent = narrando ? (parcial ? '… ' + parcial : 'Ouvindo. Pode falar, eu vou escrevendo.') : ''; }
}
function acrescentarFala(fala) {
  fala = fala.trim(); if (!fala) return;
  fala = fala.charAt(0).toUpperCase() + fala.slice(1);
  const base = E.ger.texto.trim();
  E.ger.texto = base ? base + (/[.!?…:;,]$/.test(base) ? ' ' : '. ') + fala : fala;
  const a = $('#textoCena');
  if (a) { a.value = E.ger.texto; a.scrollTop = a.scrollHeight; }
  atualizarPrompt();
}
function pararNarracao() {
  if (!narrando) return;
  narrando = false;
  try { rec.stop(); } catch {}
  atualizarNarracao(); N.commit();
}
function narrar() {
  if (narrando) return pararNarracao();
  const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Reconhecimento) return N.aviso('Este navegador não tem ditado por voz. Abra no Chrome para narrar a cena.', true);
  rec = new Reconhecimento();
  rec.lang = 'pt-BR'; rec.interimResults = true; rec.maxAlternatives = 1;
  rec.continuous = !TOQUE; // no Android o modo contínuo repete trechos; lá cada frase encerra e o ditado religa sozinho
  rec.onresult = (e) => {
    parcial = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) acrescentarFala(r[0].transcript); else parcial += r[0].transcript;
    }
    atualizarNarracao();
  };
  rec.onerror = (e) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return; // silêncio ou parada pedida: segue o fluxo normal
    narrando = false; atualizarNarracao();
    N.aviso(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'O microfone está bloqueado. Libere o microfone para este site nas permissões do navegador.'
      : e.error === 'network' ? 'O ditado por voz precisa de internet.'
      : e.error === 'audio-capture' ? 'Não achei nenhum microfone neste aparelho.' : 'O ditado parou (' + e.error + ').', true, 8000);
  };
  rec.onend = () => {
    parcial = '';
    if (narrando) { try { rec.start(); } catch { narrando = false; } } // pausa longa encerra o ditado: religa enquanto o botão estiver ligado
    atualizarNarracao();
    if (!narrando) N.commit();
  };
  narrando = true; parcial = '';
  try { rec.start(); } catch { narrando = false; N.aviso('Não consegui ligar o microfone.', true); }
  atualizarNarracao();
}

// ---------- melhorar o texto da cena ----------
let melhorando = false;
// O que vai para o melhorador: a narração e, em seguida, o que a cena 3D já define (para ele não inventar outra câmera).
function contextoDaCena(narracao) {
  const r = N.resumoCena(), T = N.classificarPlano(), c = E.cam;
  const onde = { left: 'à esquerda', center: 'no centro', right: 'à direita' };
  const linhas = [];
  const pers = r.personagens.filter((p) => p.noQuadro && p.descricao).map((p) => `${onde[p.posicao]}, ${p.descricao}`);
  if (pers.length) linhas.push('Personagens em quadro: ' + pers.join('; ') + '.');
  const angulo = c.tilt < -60 ? 'vista de cima' : c.tilt < -14 ? 'câmera alta olhando para baixo' : c.tilt > 14 ? 'câmera baixa olhando para cima' : 'câmera na altura dos olhos';
  linhas.push(`Enquadramento: ${T.nome.toLowerCase()}, lente ${Math.round(c.focal)} mm, ${angulo}.`);
  const esquema = PRESETS_LUZ.find((p) => p.id === E.amb.esquema);
  if (esquema) linhas.push(`Luz: ${esquema.nome.toLowerCase()} (${esquema.desc.toLowerCase()}).`);
  const contexto = linhas.join(' ');
  return narracao.slice(0, Math.max(200, 2480 - contexto.length)) + '\n\n' + contexto;
}
async function melhorarTexto() {
  if (melhorando) return;
  if (semServidor) return N.aviso('Melhorar o texto usa o Magnific, que só está ligado no computador do estúdio. Aqui dá para narrar e copiar o prompt.', false, 9000);
  pararNarracao();
  const g = E.ger, meu = g.texto.trim();
  if (!meu) return N.aviso('Narre ou escreva a cena primeiro.');
  if (!temChave) return abrirChave();
  melhorando = true; renderGer(); estado('Melhorando o texto no Magnific…', 'girando');
  try {
    const r = await comAcesso(() => api.melhorar(contextoDaCena(meu)));
    g.textoOriginal = meu; g.texto = r.texto;
    melhorando = false; document.activeElement && document.activeElement.blur(); renderGer(); N.commit();
    estado('Texto melhorado. Leia e ajuste o que quiser; "Voltar ao meu texto" desfaz.', 'ok');
  } catch (e) {
    melhorando = false; renderGer(); estado(e.message, 'erro');
  }
}

// ---------- senha de acesso (só na versão hospedada) ----------
const dlgAcesso = $('#dlgAcesso');
let resolverAcesso = null;
function pedirSenha(msg = '') {
  $('#inAcesso').value = ''; $('#acessoEstado').textContent = msg;
  dlgAcesso.showModal();
  return new Promise((ok) => { resolverAcesso = ok; });
}
$('#btEntrar').addEventListener('click', () => { const v = $('#inAcesso').value.trim(); if (!v) return; acesso.guardar(v); dlgAcesso.close('entrar'); });
$('#inAcesso').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#btEntrar').click(); } });
dlgAcesso.addEventListener('close', () => { const f = resolverAcesso; resolverAcesso = null; if (f) f(dlgAcesso.returnValue === 'entrar'); });
// Roda uma chamada ao servidor; se ele pedir a senha de acesso, pergunta e tenta de novo.
async function comAcesso(chamada) {
  for (let tentativa = 0; ; tentativa++) {
    try { return await chamada(); }
    catch (e) {
      if (e.status !== 401 || e.codigo !== 'senha' || tentativa >= 2) throw e;
      if (!(await pedirSenha(tentativa ? 'Senha incorreta. Tente de novo.' : ''))) throw new Error('Geração cancelada: faltou a senha de acesso.');
    }
  }
}
async function carregarHistorico() { try { historico = await api.historico(); renderGer(); } catch {} }

// ---------- diálogos ----------
const dlgImg = $('#dlgImg');
let imgAtual = null;
function abrirImagem(h, src) {
  imgAtual = { h, src, ver: 'gerada' };
  $('#imgPrompt').textContent = h.prompt;
  $('#imgMeta').textContent = `${(MODELOS.find((m) => m.id === h.modelo) || { nome: h.modelo }).nome} · ${new Date(h.quando).toLocaleString('pt-BR')}`;
  $('#imgBaixar').href = src;
  mostrarVer();
  if (!dlgImg.open) dlgImg.showModal();
}
function mostrarVer() {
  $('#imgGrande').src = imgAtual.ver === 'gerada' ? imgAtual.src : imgAtual.h.quadro;
  for (const b of $$('#imgAlterna button')) b.classList.toggle('ativo', b.dataset.ver === imgAtual.ver);
}
$('#imgAlterna').addEventListener('click', (e) => { if (e.target.dataset.ver) { imgAtual.ver = e.target.dataset.ver; mostrarVer(); } });
$('#imgFechar').addEventListener('click', () => dlgImg.close());
dlgImg.addEventListener('click', (e) => { if (e.target === dlgImg) dlgImg.close(); });

const dlgChave = $('#dlgChave');
function abrirChave() {
  if (semServidor) return N.aviso(AVISO_ESTATICO, false, 9000);
  $('#inChave').value = '';
  if (hospedado) $('#chaveOnde').textContent = 'Cole aqui a chave da API. Ela fica guardada no servidor do estúdio, protegida pela senha de acesso, e nunca aparece na página.';
  $('#chaveEstado').textContent = temChave ? 'Já existe uma chave salva neste computador. Colar outra substitui a atual.' : 'Nenhuma chave salva ainda.';
  dlgChave.showModal();
}
function marcarChave() { $('#btMagnific .led').className = 'led ' + (semServidor ? '' : temChave ? 'ok' : 'falta'); }
$('#btMagnific').addEventListener('click', abrirChave);
$('#btSalvarChave').addEventListener('click', async () => {
  const v = $('#inChave').value.trim();
  if (!v) { $('#chaveEstado').textContent = 'Cole a chave antes de salvar.'; return; }
  try { await comAcesso(() => api.salvarChave(v)); temChave = true; marcarChave(); dlgChave.close(); N.aviso(hospedado ? 'Chave do Magnific salva no servidor do estúdio.' : 'Chave do Magnific salva neste computador.'); renderGer(); }
  catch (e) { $('#chaveEstado').textContent = e.message; }
});

// ---------- planos salvos ----------
function renderPlanos() {
  $('#planos').replaceChildren(
    el('button', { class: 'novo', onclick: N.salvarPlano, title: 'Guardar o enquadramento atual' }, '＋ Salvar plano'),
    ...E.planos.map((pl) => el('div', { class: 'plano', title: 'Voltar a este enquadramento', onclick: () => N.aplicarPlano(pl.id) },
      el('img', { src: pl.mini, alt: '' }), el('span', { class: 'rot' }, pl.nome),
      el('button', { class: 'x', title: 'Remover', onclick: (e) => { e.stopPropagation(); N.removerPlano(pl.id); } }, '✕'))));
}

// ---------- teclado ----------
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select') || document.querySelector('dialog[open]')) return;
  const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? N.refazer() : N.desfazer(); }
  else if (ctrl && k === 'y') { e.preventDefault(); N.refazer(); }
  else if (ctrl && k === 'd') { e.preventDefault(); N.duplicar(); }
  else if (ctrl) return;
  else if (k === 'w') { N.setPosar(false); N.setModo('translate'); }
  else if (k === 'e') { N.setPosar(false); N.setModo('rotate'); }
  else if (k === 'r') { N.setPosar(false); N.setModo('scale'); }
  else if (k === 'p') N.setPosar(!E.posar);
  else if (k === 'f') N.focarEm();
  else if (k === 'g') { E.guias.grade = !E.guias.grade; renderBarra(); }
  else if (k === 'tab') { e.preventDefault(); N.setVista(E.vista === 'camera' ? 'cena' : 'camera'); }
  else if (k === 'delete' || k === 'backspace') { if (E.sel && E.sel !== 'camera') N.remover(); }
  else if (k === 'escape') N.selecionar(null);
});

// ---------- ligação com o núcleo ----------
H.barra = renderBarra;
H.lista = renderLista;
H.sel = () => { renderSel(); if (E.aba === 'luz') renderLuz(); };
H.cam = () => { renderCam(); if (E.aba === 'ger') atualizarPrompt(); };
H.luz = renderLuz;
H.ger = renderGer;
H.planos = renderPlanos;
H.hud = renderHud;
H.tudo = () => { renderBarra(); renderLista(); renderAbas(); renderSel(); renderCam(); renderLuz(); renderGer(); renderPlanos(); renderHud(); };

N.iniciar();
api.config().then((c) => { temChave = !!c.temChave; hospedado = !!c.hospedado; marcarChave(); renderGer(); }).catch(() => { semServidor = true; marcarChave(); renderGer(); });
carregarHistorico();
CELULAR.addEventListener('change', () => { renderAbas(); N.layout(); });
window.enq = N;
