// Núcleo: cena 3D, câmera de cinema, itens, seleção, histórico e captura do quadro.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { criarBoneco, BIOTIPOS, CORES_BONECO, POSES } from './manequim.js';
import { criarElemento, CATALOGO, NOME_EN } from './elementos.js';
import { criarLuz, TIPOS_LUZ, PADRAO_LUZ, PRESETS_LUZ } from './luzes.js';
import { optica, TAMANHOS, SENSORES, SUPORTES, PROPORCOES } from './cameras.js';

export const rad = THREE.MathUtils.degToRad, grau = THREE.MathUtils.radToDeg, clamp = THREE.MathUtils.clamp;
const uid = () => Math.random().toString(36).slice(2, 9);
const CIMA = new THREE.Vector3(0, 1, 0);
const CHAVE_LOCAL = 'enquadramento.cena.v1';

// ---------- estado ----------
export const E = {
  itens: [], sel: null, junta: null, vista: 'camera', modo: 'translate', posar: false, aba: 'cam',
  cam: {}, amb: {}, guias: {}, enq: {}, planos: [], ger: {},
};
const PADRAO = () => ({
  cam: { sensor: 's35', proporcao: 2.39, focal: 35, anamorfica: 1, t: 2.8, foco: 3.4, pdc: true, ev: 0, suporte: 'livre', pos: [0, 1.42, 3.5], pan: 0, tilt: -1, roll: 0 },
  amb: { intensidade: 0.22, ceu: '#aab4c8', solo: '#3a3632', fundo: '#15171b', chao: '#5c5a56', neblina: 0, esquema: null },
  guias: { tercos: true, seguranca: false, centro: false, grade: true },
  enq: { alvo: null, tamanho: 'pm', az: 0, el: 0 },
  planos: [],
  ger: { texto: '', textoOriginal: null, estilo: 'cinema', modelo: 'gemini', tecnico: true, forca: 65, mystic: 'realism', qualidade: 'medium', quantidade: 1, resolucao: '1k', manual: null },
});
Object.assign(E, PADRAO());
export const ativos = {}; // imagens e modelos importados: id -> dataURL

// A interface registra aqui o que precisa ser redesenhado.
export const H = { tudo() {}, sel() {}, cam() {}, luz() {}, ger() {}, lista() {}, planos() {}, hud() {}, barra() {} };

// ---------- three ----------
const palco = document.getElementById('palco');
const quadro = document.getElementById('quadro');
const TOQUE = window.matchMedia('(pointer: coarse)').matches;
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch (e) { throw new Error('este navegador não conseguiu ligar o 3D (WebGL). Abra o endereço no Chrome atualizado'); }
// Alguns celulares não desenham em textura de ponto flutuante: nesses o desfoque fica desligado e o resto funciona.
const PODE_FLOAT = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const canvas = renderer.domElement;
quadro.prepend(canvas);

const scene = new THREE.Scene();
const sobre = new THREE.Scene(); // gizmo e contorno da seleção, desenhados por cima
scene.background = new THREE.Color('#15171b');
scene.fog = new THREE.FogExp2('#15171b', 0.01);
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.2);
scene.add(hemi);
const chao = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ color: '#5c5a56', roughness: 0.96 }));
chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; scene.add(chao);
const grade = new THREE.GridHelper(40, 40, 0x8a8d95, 0x4a4c53);
grade.position.y = 0.004; grade.material.transparent = true; grade.material.opacity = 0.35; grade.material.depthWrite = false;
scene.add(grade);

export const filmCam = new THREE.PerspectiveCamera(30, 2.39, 0.05, 500);
filmCam.rotation.order = 'YXZ';
scene.add(filmCam);
const dirCam = new THREE.PerspectiveCamera(42, 1, 0.05, 800);
dirCam.position.set(5.5, 4.2, 7.5); dirCam.layers.enable(1);
const topCam = new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 200);
topCam.up.set(0, 0, -1); topCam.position.set(0, 40, 0); topCam.lookAt(0, 0, 0); topCam.layers.enable(1);

// corpo da câmera e campo de visão (camada 1: só aparecem na cena e na planta)
const camModelo = new THREE.Group();
{
  const m1 = new THREE.MeshBasicMaterial({ color: 0xf2a93b, toneMapped: false });
  const m2 = new THREE.MeshBasicMaterial({ color: 0x2a2c31, toneMapped: false });
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.2, 0.34), m2); corpo.position.z = 0.2;
  const lente = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.16, 20), m1); lente.rotation.x = Math.PI / 2; lente.position.z = -0.04;
  const para = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.03), m2); para.position.z = -0.13;
  const chassi = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 20), m1); chassi.rotation.z = Math.PI / 2; chassi.position.set(0, 0.17, 0.22);
  const pega = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); pega.position.z = 0.1;
  camModelo.add(corpo, lente, para, chassi, pega);
  camModelo.userData.itemId = 'camera';
  camModelo.traverse((o) => o.layers.set(1));
  filmCam.add(camModelo);
}
const campo = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: 0.75, toneMapped: false, fog: false }));
campo.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48), 3));
campo.layers.set(1); campo.frustumCulled = false; campo.raycast = () => {};
filmCam.add(campo);

// profundidade de campo física: desfoque proporcional a |d - foco| / d
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: PODE_FLOAT ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: PODE_FLOAT && !TOQUE ? 4 : 0 }));
const passeCena = new RenderPass(scene, filmCam);
composer.addPass(passeCena);
const bokeh = new BokehPass(scene, filmCam, { focus: 3, aperture: 0.001, maxblur: 0.02 });
{
  // o fundo não pode entrar no mapa de profundidade (viraria "muito perto" e criaria halo nas bordas)
  const original = bokeh.render.bind(bokeh);
  bokeh.render = (...a) => { const fundo = scene.background; scene.background = null; original(...a); scene.background = fundo; };
}
bokeh.materialBokeh.fragmentShader = bokeh.materialBokeh.fragmentShader.replace(
  'vec2 dofblur = vec2 ( clamp( factor * aperture, -maxblur, maxblur ) );',
  'vec2 dofblur = vec2( clamp( factor * aperture / max( -viewZ, 0.05 ), -maxblur, maxblur ) );');
composer.addPass(bokeh);
composer.addPass(new OutputPass());

const orbit = new OrbitControls(dirCam, canvas);
orbit.target.set(0, 1, 0); orbit.enableDamping = true; orbit.dampingFactor = 0.12; orbit.maxPolarAngle = Math.PI * 0.495; orbit.enabled = false;

const gizmo = new TransformControls(filmCam, canvas);
gizmo.setSize(TOQUE ? 1.25 : 0.85);
sobre.add(gizmo.getHelper());
const caixaSel = new THREE.BoxHelper(new THREE.Object3D(), 0xf2a93b);
caixaSel.material.transparent = true; caixaSel.material.opacity = 0.4; caixaSel.material.depthTest = false; caixaSel.material.toneMapped = false;
caixaSel.visible = false; sobre.add(caixaSel);

// ---------- avisos ----------
export function aviso(texto, erro = false, ms = erro ? 7000 : 3200) {
  const a = document.createElement('div');
  a.className = 'aviso' + (erro ? ' erro' : ''); a.textContent = texto;
  document.getElementById('avisos').append(a);
  setTimeout(() => a.remove(), ms);
}

// ---------- itens ----------
export const item = (id) => E.itens.find((i) => i.id === id);
export const bonecos = () => E.itens.filter((i) => i.tipo === 'boneco');
const vistaCam = () => (E.vista === 'camera' ? filmCam : dirCam);

function criarItem(d) {
  const it = { ...d };
  if (d.tipo === 'boneco') {
    it.ctl = criarBoneco({ biotipo: d.biotipo, altura: d.altura, cor: d.cor });
    it.obj = it.ctl.root;
  } else if (d.tipo === 'elemento') {
    it.obj = criarElemento(d.forma, { cor: d.cor, src: d.ativo ? ativos[d.ativo] : undefined });
  } else {
    it.ctl = criarLuz(d.forma);
    it.obj = it.ctl.root;
    it.ctl.aplicar(d);
  }
  it.obj.userData.itemId = it.id;
  it.obj.position.fromArray(d.pos || [0, 0, 0]);
  it.obj.rotation.set(...(d.rot || [0, 0, 0]));
  it.obj.scale.fromArray(d.escala || [1, 1, 1]);
  it.obj.visible = d.visivel !== false;
  scene.add(it.obj);
  if (d.tipo === 'boneco') it.ctl.setPose(d.pose || {});
  E.itens.push(it);
  return it;
}
function destruir(it) {
  scene.remove(it.obj);
  if (it.ctl && it.ctl.dispose) it.ctl.dispose();
  else it.obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}
function dadosItem(it) {
  const { obj, ctl, ...d } = it;
  d.pos = obj.position.toArray().map((n) => +n.toFixed(4));
  d.rot = [obj.rotation.x, obj.rotation.y, obj.rotation.z].map((n) => +n.toFixed(5));
  d.escala = obj.scale.toArray().map((n) => +n.toFixed(4));
  d.visivel = obj.visible;
  if (it.tipo === 'boneco') d.pose = ctl.getPose();
  return d;
}

function nomeLivre(base) {
  const nomes = new Set(E.itens.map((i) => i.nome));
  if (!nomes.has(base)) return base;
  for (let n = 2; ; n++) if (!nomes.has(`${base} ${n}`)) return `${base} ${n}`;
}
const raio = new THREE.Raycaster();
const planoChao = new THREE.Plane(CIMA, 0);
function pontoNovo() {
  const p = new THREE.Vector3();
  raio.setFromCamera(new THREE.Vector2(0, -0.25), filmCam);
  if (!raio.ray.intersectPlane(planoChao, p) || p.distanceTo(filmCam.position) > 12) {
    filmCam.getWorldDirection(p).setY(0).normalize().multiplyScalar(Math.min(E.cam.foco, 6)).add(filmCam.position).setY(0);
  }
  for (let t = 0; t < 12 && E.itens.some((i) => i.tipo !== 'luz' && Math.hypot(i.obj.position.x - p.x, i.obj.position.z - p.z) < 0.5); t++) p.x += 0.7;
  return p;
}

export function adicionarBoneco(biotipo) {
  const usadas = new Set(bonecos().map((b) => b.cor));
  const cor = (CORES_BONECO.find((c) => !usadas.has(c.hex)) || CORES_BONECO[0]).hex;
  const p = pontoNovo();
  const it = criarItem({ id: uid(), tipo: 'boneco', nome: nomeLivre('Personagem'), biotipo, altura: BIOTIPOS[biotipo].altura, cor, descricao: '', poseId: 'empe', pose: POSES.empe.j, pos: [p.x, 0, p.z] });
  virarPara(it, filmCam.position, false);
  selecionar(it.id); commit();
}
export function adicionarElemento(forma, extra = {}) {
  const p = pontoNovo();
  const base = extra.nome || (CATALOGO.find((c) => c.id === forma) || {}).nome || 'Elemento';
  const it = criarItem({ id: uid(), tipo: 'elemento', forma, nome: nomeLivre(base), cor: '#8d8a84', descricao: '', pos: [p.x, 0, p.z], ...extra });
  selecionar(it.id); commit();
}
export function adicionarLuz(forma) {
  const { centro, f, r } = referenciaLuz();
  const pos = centro.clone().addScaledVector(f, 1.8).addScaledVector(r, 1.8).setY(forma === 'ponto' ? 1.6 : forma === 'sol' ? 9 : centro.y + 1.2);
  if (forma === 'sol') pos.sub(centro).normalize().multiplyScalar(14).add(centro);
  const it = criarItem({ id: uid(), tipo: 'luz', forma, nome: nomeLivre(TIPOS_LUZ[forma].nome), ...PADRAO_LUZ[forma], pos: pos.toArray() });
  it.obj.lookAt(centro);
  E.amb.esquema = null;
  selecionar(it.id); commit();
}
export function duplicar(id = E.sel) {
  const it = item(id); if (!it) return;
  const d = structuredClone(dadosItem(it));
  d.id = uid(); d.nome = nomeLivre(it.nome.replace(/ \d+$/, ''));
  d.pos[0] += 0.7;
  if (d.tipo === 'boneco') { const usadas = new Set(bonecos().map((b) => b.cor)); d.cor = (CORES_BONECO.find((c) => !usadas.has(c.hex)) || { hex: d.cor }).hex; }
  const novo = criarItem(d);
  selecionar(novo.id); commit();
}
export function remover(id = E.sel) {
  const it = item(id); if (!it) return;
  destruir(it);
  E.itens = E.itens.filter((i) => i !== it);
  if (it.tipo === 'luz') E.amb.esquema = null;
  if (E.sel === id) { E.sel = null; E.junta = null; }
  atualizarGizmo(); H.tudo(); commit();
}
export function alternarVisivel(id) {
  const it = item(id); if (!it) return;
  it.obj.visible = !it.obj.visible;
  atualizarGizmo(); H.lista(); commit();
}
// Reconstrói um item quando muda algo estrutural (biotipo).
export function reconstruir(it, mud) {
  const d = { ...dadosItem(it), ...mud };
  destruir(it);
  const i = E.itens.indexOf(it);
  E.itens.splice(i, 1);
  const novo = criarItem(d);
  E.itens.splice(i, 0, E.itens.pop());
  atualizarGizmo();
  return novo;
}

// ---------- posições úteis ----------
export function cabecaMundo(it, alvo = new THREE.Vector3()) {
  it.obj.updateWorldMatrix(true, true);
  it.ctl.juntas.cabeca.getWorldPosition(alvo);
  const cima = new THREE.Vector3(0, 1, 0).transformDirection(it.ctl.juntas.cabeca.matrixWorld);
  return alvo.addScaledVector(cima, it.ctl.alturaCabeca * it.ctl.altura * it.obj.scale.y * 0.5);
}
export function centroItem(it, alvo = new THREE.Vector3()) {
  if (it.tipo === 'boneco') return cabecaMundo(it, alvo);
  if (it.tipo === 'luz') return it.obj.getWorldPosition(alvo);
  return new THREE.Box3().setFromObject(it.obj).getCenter(alvo);
}
export function alvoPrincipal() {
  const s = item(E.sel);
  if (s && s.tipo === 'boneco') return s;
  const a = item(E.enq.alvo);
  if (a && a.tipo === 'boneco') return a;
  return bonecos()[0] || null;
}
export function virarPara(it, ponto, registrar = true) {
  it.obj.rotation.set(0, Math.atan2(ponto.x - it.obj.position.x, ponto.z - it.obj.position.z), 0);
  if (registrar) { H.sel(); commit(); }
}
export function olharPara(it, ponto) {
  const J = it.ctl.juntas;
  J.cabeca.rotation.set(0, 0, 0);
  it.obj.updateWorldMatrix(true, true);
  const v = J.pescoco.worldToLocal(ponto.clone()).sub(J.cabeca.position);
  v.y -= it.ctl.alturaCabeca * 0.55;
  J.cabeca.rotation.set(clamp(-Math.atan2(v.y, Math.hypot(v.x, v.z)), -0.7, 0.7), clamp(Math.atan2(v.x, v.z), -1.25, 1.25), 0);
  it.poseId = null;
  H.sel(); commit();
}

// ---------- câmera ----------
export const opticaAtual = () => optica(E.cam);
function lerCamera() {
  const c = E.cam;
  c.pos = filmCam.position.toArray();
  c.tilt = grau(filmCam.rotation.x); c.pan = grau(filmCam.rotation.y); c.roll = grau(filmCam.rotation.z);
}
export function aplicarCamera() {
  const c = E.cam, o = optica(c);
  filmCam.fov = o.fovV; filmCam.aspect = c.proporcao;
  filmCam.position.fromArray(c.pos);
  filmCam.rotation.set(rad(c.tilt), rad(c.pan), rad(c.roll));
  filmCam.updateProjectionMatrix(); filmCam.updateMatrixWorld(true);
  bokeh.uniforms.focus.value = c.foco;
  bokeh.uniforms.aperture.value = 1.25 * o.A;
  bokeh.uniforms.maxblur.value = 0.045;
  renderer.toneMappingExposure = Math.pow(2, c.ev);
  // campo de visão desenhado até o plano de foco
  const th = Math.tan(rad(o.fovH) / 2), tv = Math.tan(rad(o.fovV) / 2), a = campo.geometry.attributes.position.array;
  const cantos = (d) => [[-th * d, tv * d, -d], [th * d, tv * d, -d], [th * d, -tv * d, -d], [-th * d, -tv * d, -d]];
  const longe = cantos(Math.max(c.foco, 7)), foco = cantos(c.foco);
  let k = 0;
  for (let i = 0; i < 4; i++) { a[k++] = 0; a[k++] = 0; a[k++] = 0; a[k++] = longe[i][0]; a[k++] = longe[i][1]; a[k++] = longe[i][2]; }
  for (let i = 0; i < 4; i++) { const p = foco[i], q = foco[(i + 1) % 4]; a[k++] = p[0]; a[k++] = p[1]; a[k++] = p[2]; a[k++] = q[0]; a[k++] = q[1]; a[k++] = q[2]; }
  campo.geometry.attributes.position.needsUpdate = true;
  H.hud();
}
export function mudarProporcao() { layout(); aplicarCamera(); }

export function focarEm(it = item(E.sel)) {
  if (!it) return aviso('Selecione o que deve ficar em foco.');
  E.cam.foco = clamp(centroItem(it).distanceTo(filmCam.position), 0.3, 100);
  aplicarCamera(); H.cam(); commit();
}

function alvoEnq() {
  const a = item(E.enq.alvo);
  if (a) return a;
  const s = item(E.sel);
  if (s && s.tipo !== 'luz') return s;
  return bonecos()[0] || E.itens.find((i) => i.tipo === 'elemento') || null;
}
export function enquadrar(mud = {}) {
  Object.assign(E.enq, mud);
  const it = alvoEnq();
  if (!it) return aviso('Coloque um personagem na cena para enquadrar.');
  const T = TAMANHOS.find((t) => t.id === E.enq.tamanho) || TAMANHOS[4];
  const frente = new THREE.Vector3(0, 0, 1), foco = new THREE.Vector3();
  let topo, Hc, cx, cz;
  const caixa = new THREE.Box3().setFromObject(it.obj), meio = caixa.getCenter(new THREE.Vector3());
  if (it.tipo === 'boneco') {
    cabecaMundo(it, foco);
    Hc = it.ctl.altura * it.obj.scale.y;
    topo = foco.y + it.ctl.alturaCabeca * Hc * 0.5;
    const t = clamp((T.k - 0.5) / 0.7, 0, 1);
    cx = THREE.MathUtils.lerp(foco.x, meio.x, t); cz = THREE.MathUtils.lerp(foco.z, meio.z, t);
    it.ctl.juntas.cabeca.getWorldDirection(frente).setY(0);
    if (frente.lengthSq() < 0.05) it.obj.getWorldDirection(frente).setY(0);
  } else {
    foco.copy(meio); topo = caixa.max.y; Hc = Math.max(caixa.max.y - caixa.min.y, 0.3); cx = meio.x; cz = meio.z;
    it.obj.getWorldDirection(frente).setY(0);
  }
  if (frente.lengthSq() < 0.01) frente.set(0, 0, 1);
  frente.normalize();
  const yTopo = topo + T.m * Hc, yBase = topo - T.k * Hc;
  const centro = new THREE.Vector3(cx, Math.max((yTopo + yBase) / 2, 0.05), cz);
  const o = optica(E.cam);
  const d = Math.max((yTopo - yBase) / (2 * Math.tan(rad(o.fovV) / 2)), 0.25);
  const az = rad(E.enq.az), el = rad(E.enq.el);
  const dir = frente.applyAxisAngle(CIMA, az).multiplyScalar(Math.cos(el)).setY(Math.sin(el));
  const pos = centro.clone().addScaledVector(dir, d);
  if (pos.y < 0.08) pos.y = 0.08;
  filmCam.position.copy(pos); filmCam.lookAt(centro); filmCam.rotation.z = rad(E.cam.roll);
  lerCamera();
  E.cam.foco = clamp(pos.distanceTo(it.tipo === 'boneco' && T.k < 0.9 ? foco : centro), 0.3, 100);
  E.cam.suporte = 'livre';
  aplicarCamera(); H.cam(); commit();
}
export function sobreOmbro() {
  const a = alvoEnq();
  if (!a || a.tipo !== 'boneco') return aviso('Escolha o personagem que fica de frente para a câmera.');
  const pa = cabecaMundo(a);
  const outros = bonecos().filter((b) => b !== a).map((b) => ({ b, p: cabecaMundo(b) })).sort((x, y) => x.p.distanceTo(pa) - y.p.distanceTo(pa));
  if (!outros.length) return aviso('O plano sobre o ombro precisa de dois personagens.');
  const pb = outros[0].p;
  const d = pb.clone().sub(pa).setY(0).normalize();
  const lado = new THREE.Vector3().crossVectors(CIMA, d);
  const pos = pb.clone().addScaledVector(d, 0.8).addScaledVector(lado, 0.34).add(new THREE.Vector3(0, 0.05, 0));
  filmCam.position.copy(pos); filmCam.lookAt(pa.clone().lerp(pb, 0.14)); filmCam.rotation.z = rad(E.cam.roll);
  lerCamera(); E.cam.foco = pos.distanceTo(pa);
  if (E.cam.focal < 40) E.cam.focal = 50;
  aplicarCamera(); H.cam(); commit();
}
export function subjetiva() {
  const a = alvoEnq();
  if (!a || a.tipo !== 'boneco') return aviso('Escolha o personagem que empresta o olhar.');
  const p = cabecaMundo(a), f = a.ctl.juntas.cabeca.getWorldDirection(new THREE.Vector3());
  filmCam.position.copy(p).addScaledVector(f, 0.16); filmCam.lookAt(p.clone().addScaledVector(f, 5)); filmCam.rotation.z = rad(E.cam.roll);
  lerCamera(); aplicarCamera(); H.cam(); commit();
}
export function aplicarSuporte(id) {
  E.cam.suporte = id;
  const s = SUPORTES.find((x) => x[0] === id);
  if (s && s[2] != null) E.cam.pos[1] = s[2];
  aplicarCamera(); H.cam(); commit();
}

// ---------- luz ----------
export function aplicarAmbiente() {
  const a = E.amb;
  hemi.color.set(a.ceu); hemi.groundColor.set(a.solo); hemi.intensity = a.intensidade;
  scene.background.set(a.fundo); scene.fog.color.set(a.fundo);
  chao.material.color.set(a.chao);
}
const neblinaBase = () => 0.008 + E.amb.neblina * 0.085;
// Ponto que as luzes miram: o personagem selecionado ou, sem seleção, o grupo que está no quadro.
function referenciaLuz() {
  const s = item(E.sel);
  let grupo = s && s.tipo === 'boneco' ? [s] : bonecos().filter((b) => b.obj.visible && noQuadro(cabecaMundo(b)).dentro);
  if (!grupo.length) grupo = bonecos().slice(0, 1);
  const cabecas = grupo.map((b) => cabecaMundo(b));
  const centro = new THREE.Vector3(0, 1.5, 0);
  if (cabecas.length) { centro.set(0, 0, 0); for (const c of cabecas) centro.add(c); centro.divideScalar(cabecas.length); centro.y -= 0.12; }
  const raio = cabecas.reduce((m, c) => Math.max(m, Math.hypot(c.x - centro.x, c.z - centro.z)), 0);
  const f = filmCam.position.clone().sub(centro).setY(0);
  if (f.lengthSq() < 0.01) f.set(0, 0, 1);
  f.normalize();
  const r = new THREE.Vector3().crossVectors(f.clone().negate(), CIMA).normalize();
  return { centro, f, r, raio };
}
export function aplicarEsquema(id) {
  const P = PRESETS_LUZ.find((p) => p.id === id); if (!P) return;
  const { centro, f, r, raio } = referenciaLuz();
  for (const it of E.itens.filter((i) => i.tipo === 'luz')) destruir(it);
  E.itens = E.itens.filter((i) => i.tipo !== 'luz');
  if (!item(E.sel) && E.sel !== 'camera') { E.sel = null; E.junta = null; }
  Object.assign(E.amb, P.amb, { esquema: id });
  aplicarAmbiente();
  for (const l of P.luzes) {
    const { az, el, ...params } = l;
    const dist = l.dist + raio * 0.6, mira = params.mira; delete params.dist; delete params.mira;
    // abre o facho o bastante para cobrir todo o grupo
    if (params.forma === 'spot' && raio > 0.2) params.angulo = Math.max(params.angulo, Math.round(2 * grau(Math.atan((raio + 0.55) / dist))));
    const dir = f.clone().multiplyScalar(Math.cos(rad(az))).addScaledVector(r, Math.sin(rad(az))).multiplyScalar(Math.cos(rad(el))).setY(Math.sin(rad(el)));
    const pos = centro.clone().addScaledVector(dir, dist);
    if (pos.y < 0.12) pos.y = 0.12;
    const it = criarItem({ id: uid(), tipo: 'luz', ...params, pos: pos.toArray() });
    // 'fundo': a luz lava o que está atrás dos personagens, em vez de mirar neles
    it.obj.lookAt(mira === 'fundo' ? centro.clone().addScaledVector(f, -6).setY(centro.y * 0.7) : centro);
  }
  atualizarGizmo(); H.tudo(); commit();
}
export function apontarLuz(it, alvo) {
  it.obj.lookAt(centroItem(alvo));
  commit();
}

// ---------- seleção e gizmo ----------
export function selecionar(id, junta = null, trocarAba = true) {
  E.sel = id; E.junta = junta;
  if (trocarAba && id) E.aba = id === 'camera' ? 'cam' : 'sel';
  atualizarGizmo(); H.lista(); H.sel(); H.barra();
}
function atualizarGizmo() {
  gizmo.detach(); caixaSel.visible = false;
  gizmo.camera = vistaCam();
  if (E.sel === 'camera') {
    if (E.vista === 'cena') { gizmo.attach(filmCam); gizmo.setMode(E.modo === 'scale' ? 'translate' : E.modo); gizmo.setSpace('local'); }
    return;
  }
  const it = item(E.sel);
  if (!it || !it.obj.visible) return;
  if (it.tipo === 'boneco' && E.posar) {
    if (E.junta) { gizmo.attach(it.ctl.juntas[E.junta]); gizmo.setMode('rotate'); gizmo.setSpace('local'); }
    return;
  } else {
    const modo = it.tipo === 'luz' && E.modo === 'scale' ? 'translate' : E.modo;
    gizmo.attach(it.obj); gizmo.setMode(modo); gizmo.setSpace(modo === 'translate' ? 'world' : 'local');
  }
  caixaSel.setFromObject(it.obj); caixaSel.visible = true;
}
export function setModo(m) { E.modo = m; atualizarGizmo(); H.barra(); }
export function setPosar(v) {
  E.posar = v;
  if (!v) E.junta = null;
  else if (item(E.sel)?.tipo === 'boneco' && !E.junta) E.junta = 'ombroD';
  atualizarGizmo(); H.barra(); H.sel();
}
export function setVista(v) {
  E.vista = v;
  orbit.enabled = v === 'cena';
  quadro.classList.toggle('cena', v === 'cena');
  if (v === 'cena') {
    const a = alvoPrincipal();
    if (a) orbit.target.copy(a.obj.position).setY(1);
  }
  layout(); atualizarGizmo(); H.barra();
}

let arrastandoGizmo = false;
gizmo.addEventListener('dragging-changed', (e) => {
  arrastandoGizmo = e.value;
  orbit.enabled = !e.value && E.vista === 'cena';
  if (e.value) return;
  const it = item(E.sel);
  if (it && it.tipo === 'boneco' && E.posar && E.junta) { it.ctl.aterrar(); it.poseId = null; }
  H.sel(); H.cam(); commit();
});
gizmo.addEventListener('objectChange', () => {
  if (E.sel === 'camera') { lerCamera(); aplicarCamera(); camSuja = true; }
});

// ---------- ponteiro ----------
const ndc = new THREE.Vector2();
function pegar(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  const cam = vistaCam();
  raio.setFromCamera(ndc, cam); raio.layers.mask = cam.layers.mask;
  const alvos = E.itens.filter((i) => i.obj.visible).map((i) => i.obj);
  if (E.vista === 'cena') alvos.push(camModelo);
  for (const h of raio.intersectObjects(alvos, true)) {
    let o = h.object; const junta = o.userData.junta || null;
    while (o && !o.userData.itemId) o = o.parent;
    if (o) return { id: o.userData.itemId, junta };
  }
  return null;
}
function pivo() {
  const it = item(E.sel);
  if (it) return centroItem(it);
  return filmCam.getWorldDirection(new THREE.Vector3()).multiplyScalar(E.cam.foco).add(filmCam.position);
}
let pd = null, camSuja = false, timerCommit = 0;
const commitDepois = () => { clearTimeout(timerCommit); timerCommit = setTimeout(commit, 450); };

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
// dedos em contato com o quadro (dois dedos: pinça = dolly, arrastar = deslocar)
const dedos = new Map();
let gesto = null;
const medirGesto = () => { const [a, b] = [...dedos.values()]; return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1) }; };
canvas.addEventListener('pointerdown', (ev) => {
  if (ev.pointerType === 'touch') {
    dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (dedos.size === 2) { gesto = medirGesto(); if (pd) pd.movido = true; else pd = { movido: true, botao: -1 }; pd.multi = true; return; }
    if (dedos.size > 2) return;
  }
  if (gizmo.axis || arrastandoGizmo) return;
  pd = { x: ev.clientX, y: ev.clientY, ux: ev.clientX, uy: ev.clientY, botao: ev.button, alt: ev.altKey, shift: ev.shiftKey, movido: false, folga: ev.pointerType === 'touch' ? 14 : 4 };
  if (E.vista === 'camera') { try { canvas.setPointerCapture(ev.pointerId); } catch {} canvas.style.cursor = 'grabbing'; }
});
canvas.addEventListener('pointermove', (ev) => {
  if (dedos.has(ev.pointerId)) { const p = dedos.get(ev.pointerId); p.x = ev.clientX; p.y = ev.clientY; }
  if (gesto && dedos.size >= 2) {
    if (E.vista !== 'camera' || arrastandoGizmo) return;
    const g = medirGesto(), c = E.cam, o = optica(c), r = canvas.getBoundingClientRect();
    const esc = (2 * c.foco * Math.tan(rad(o.fovV) / 2)) / r.height;
    filmCam.translateX(-(g.cx - gesto.cx) * esc); filmCam.translateY((g.cy - gesto.cy) * esc);
    const passo = clamp((1 - gesto.d / g.d) * c.foco, -c.foco * 0.5, c.foco * 0.5); // abrir os dedos ao dobro traz a câmera à metade da distância
    filmCam.translateZ(-passo);
    if (filmCam.position.y < 0.05) filmCam.position.y = 0.05;
    c.pos = filmCam.position.toArray(); c.foco = clamp(c.foco - passo, 0.3, 100); c.suporte = 'livre';
    gesto = g; aplicarCamera(); camSuja = true;
    return;
  }
  if (!pd || pd.multi) return;
  const dx = ev.clientX - pd.ux, dy = ev.clientY - pd.uy;
  pd.ux = ev.clientX; pd.uy = ev.clientY;
  if (!pd.movido && Math.hypot(ev.clientX - pd.x, ev.clientY - pd.y) < pd.folga) return;
  pd.movido = true;
  if (E.vista !== 'camera') return;
  const c = E.cam, o = optica(c), r = canvas.getBoundingClientRect();
  if (pd.botao === 0 && pd.alt) {
    const p = pivo(), s = new THREE.Spherical().setFromVector3(filmCam.position.clone().sub(p));
    s.theta -= dx * 0.007; s.phi = clamp(s.phi - dy * 0.007, 0.03, Math.PI - 0.03);
    filmCam.position.copy(p).add(new THREE.Vector3().setFromSpherical(s));
    if (filmCam.position.y < 0.05) filmCam.position.y = 0.05;
    filmCam.lookAt(p); filmCam.rotation.z = rad(c.roll); lerCamera();
  } else if (pd.botao === 0 && !pd.shift) {
    c.pan += (dx * o.fovH) / r.width; c.tilt = clamp(c.tilt + (dy * o.fovV) / r.height, -89.5, 89.5);
  } else {
    const esc = (2 * c.foco * Math.tan(rad(o.fovV) / 2)) / r.height;
    filmCam.translateX(-dx * esc); filmCam.translateY(dy * esc);
    if (filmCam.position.y < 0.05) filmCam.position.y = 0.05;
    c.pos = filmCam.position.toArray();
  }
  c.suporte = 'livre';
  aplicarCamera(); camSuja = true;
});
const soltar = (ev) => {
  dedos.delete(ev.pointerId);
  if (dedos.size < 2) gesto = null;
  if (!pd) return;
  if (pd.multi && dedos.size > 0) return; // ainda há um dedo do gesto de dois dedos na tela
  const p = pd; pd = null; canvas.style.cursor = '';
  if (ev.type === 'pointercancel') return;
  if (p.movido) { if (E.vista === 'camera') commit(); return; }
  if (p.botao !== 0 || arrastandoGizmo) return;
  const alvo = pegar(ev);
  if (!alvo) return selecionar(null);
  const it = item(alvo.id);
  if (it && it.tipo === 'boneco' && E.posar) selecionar(alvo.id, alvo.junta || E.junta || 'ombroD');
  else selecionar(alvo.id);
};
canvas.addEventListener('pointerup', soltar);
canvas.addEventListener('pointercancel', soltar);
canvas.addEventListener('wheel', (ev) => {
  if (E.vista !== 'camera') return;
  ev.preventDefault();
  const c = E.cam;
  if (ev.altKey || ev.ctrlKey) c.focal = clamp(Math.round(c.focal * Math.exp(-ev.deltaY * 0.0012) * 2) / 2, 8, 400);
  else {
    const passo = -ev.deltaY * 0.0014 * Math.max(0.5, c.foco * 0.45);
    filmCam.translateZ(-passo);
    if (filmCam.position.y < 0.05) filmCam.position.y = 0.05;
    c.pos = filmCam.position.toArray();
    c.foco = clamp(c.foco - passo, 0.3, 100);
    c.suporte = 'livre';
  }
  aplicarCamera(); camSuja = true; commitDepois();
}, { passive: false });

// ---------- histórico e arquivo ----------
export function serializar() {
  return { v: 1, cam: E.cam, amb: E.amb, guias: E.guias, enq: E.enq, planos: E.planos, ger: E.ger, itens: E.itens.map(dadosItem) };
}
const hist = []; let futuro = [];
export function commit() {
  const s = JSON.stringify(serializar());
  if (hist[hist.length - 1] === s) return;
  hist.push(s); if (hist.length > 60) hist.shift();
  futuro = [];
  salvarLocal(s);
}
function salvarLocal(s) {
  try { localStorage.setItem(CHAVE_LOCAL, s); } catch {}
  try { localStorage.setItem(CHAVE_LOCAL + '.ativos', JSON.stringify(ativos)); } catch { try { localStorage.removeItem(CHAVE_LOCAL + '.ativos'); } catch {} }
}
export function desfazer() {
  if (hist.length < 2) return;
  futuro.push(hist.pop());
  carregar(JSON.parse(hist[hist.length - 1]), true);
  salvarLocal(hist[hist.length - 1]);
}
export function refazer() {
  const s = futuro.pop(); if (!s) return;
  hist.push(s); carregar(JSON.parse(s), true); salvarLocal(s);
}
export function carregar(d, manterSel = false) {
  const sel = manterSel ? E.sel : null, junta = manterSel ? E.junta : null;
  for (const it of E.itens) destruir(it);
  E.itens = [];
  const P = PADRAO();
  E.cam = { ...P.cam, ...d.cam }; E.amb = { ...P.amb, ...d.amb }; E.guias = { ...P.guias, ...d.guias };
  E.enq = { ...P.enq, ...d.enq }; E.planos = d.planos || []; E.ger = { ...P.ger, ...d.ger };
  if (!SENSORES.some((s) => s.id === E.cam.sensor)) E.cam.sensor = 's35';
  for (const i of d.itens || []) { try { criarItem(i); } catch (e) { console.warn('Item ignorado', i, e); } }
  E.sel = sel === 'camera' || item(sel) ? sel : null; E.junta = E.sel ? junta : null;
  aplicarAmbiente(); layout(); aplicarCamera(); atualizarGizmo(); H.tudo();
}
export function cenaInicial() {
  const P = PADRAO();
  carregar({ ...P, itens: [
    { id: uid(), tipo: 'boneco', nome: 'Personagem A', biotipo: 'homem', altura: 1.78, cor: CORES_BONECO[0].hex, descricao: '', poseId: 'conversando', pose: POSES.conversando.j, pos: [-0.62, 0, 0], rot: [0, rad(62), 0] },
    { id: uid(), tipo: 'boneco', nome: 'Personagem B', biotipo: 'mulher', altura: 1.65, cor: CORES_BONECO[1].hex, descricao: '', poseId: 'bracosCruzados', pose: POSES.bracosCruzados.j, pos: [0.62, 0, 0.1], rot: [0, rad(-58), 0] },
  ] });
  aplicarEsquema('tres');
  hist.length = 0; commit();
}
export function exportarArquivo() {
  const blob = new Blob([JSON.stringify({ ...serializar(), ativos }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'cena-enquadramento.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function importarArquivo(texto) {
  const d = JSON.parse(texto);
  if (!d || !Array.isArray(d.itens)) throw new Error('Esse arquivo não é uma cena do Enquadramento.');
  Object.assign(ativos, d.ativos || {});
  carregar(d); commit();
}
export function iniciar() {
  let d = null;
  try { Object.assign(ativos, JSON.parse(localStorage.getItem(CHAVE_LOCAL + '.ativos') || '{}')); d = JSON.parse(localStorage.getItem(CHAVE_LOCAL)); } catch {}
  if (d && Array.isArray(d.itens)) { try { carregar(d); hist.length = 0; commit(); } catch (e) { console.warn(e); cenaInicial(); } }
  else cenaInicial();
  setVista(E.vista);
  requestAnimationFrame(quadroAQuadro);
  const c = document.getElementById('carregando'); if (c) c.remove();
}
export function novoAtivo(dataURL) { const id = 'a' + uid(); ativos[id] = dataURL; return id; }

// ---------- planos salvos ----------
export function salvarPlano() {
  const T = classificarPlano();
  E.planos.push({ id: uid(), nome: `${E.planos.length + 1} · ${T.sigla} ${Math.round(E.cam.focal)}mm`, cam: structuredClone(E.cam), mini: capturar(320, 0.8) });
  H.planos(); commit();
}
export function aplicarPlano(id) {
  const p = E.planos.find((x) => x.id === id); if (!p) return;
  E.cam = { ...E.cam, ...structuredClone(p.cam) };
  layout(); aplicarCamera(); H.cam(); commit();
}
export function removerPlano(id) { E.planos = E.planos.filter((x) => x.id !== id); H.planos(); commit(); }

// ---------- quadro: tamanho, captura, desenho ----------
export function layout() {
  const r = palco.getBoundingClientRect();
  let w = r.width, h = r.height;
  if (E.vista === 'camera') { const m = r.width < 600 ? 6 : 26, a = E.cam.proporcao; w = Math.min(r.width - 2 * m, (r.height - 2 * m) * a); h = w / a; }
  w = Math.max(60, Math.floor(w)); h = Math.max(60, Math.floor(h));
  quadro.style.width = w + 'px'; quadro.style.height = h + 'px';
  renderer.setSize(w, h, false);
  composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h);
  dirCam.aspect = w / h; dirCam.updateProjectionMatrix();
}
new ResizeObserver(layout).observe(palco);

// Imagem limpa do que a câmera vê (sem grade, gizmo nem desfoque), para miniaturas e para o Magnific.
export function capturar(largura = 1536, qualidade = 0.92, tipo = 'image/jpeg') {
  const pr = renderer.getPixelRatio(), dens = scene.fog.density;
  const altura = Math.round(largura / E.cam.proporcao);
  renderer.setPixelRatio(1); renderer.setSize(largura, altura, false);
  composer.setPixelRatio(1); composer.setSize(largura, altura);
  grade.visible = false; scene.fog.density = neblinaBase();
  passeCena.camera = filmCam; bokeh.enabled = false;
  composer.render();
  const url = canvas.toDataURL(tipo, qualidade);
  scene.fog.density = dens; grade.visible = E.guias.grade;
  renderer.setPixelRatio(pr); layout();
  return url;
}

const pip = document.querySelector('#pip canvas'), pipCtx = pip.getContext('2d'), pipNome = document.getElementById('pipNome');
function desenharPip() {
  const film = E.vista === 'cena';
  const asp = film ? E.cam.proporcao : 4 / 3;
  const W = 520, Hh = Math.round(W / asp);
  if (pip.width !== W || pip.height !== Hh) { pip.width = W; pip.height = Hh; }
  pipNome.textContent = film ? 'Câmera' : 'Planta';
  const t = renderer.getSize(new THREE.Vector2());
  const vw = Math.min(t.x, t.y * asp), vh = vw / asp;
  let cam = filmCam;
  if (!film) {
    // planta: enquadra tudo o que está em cena
    const cx = new THREE.Box3();
    cx.expandByPoint(filmCam.position);
    for (const i of E.itens) if (i.obj.visible && i.forma !== 'sol') cx.expandByPoint(i.obj.position);
    const c = cx.getCenter(new THREE.Vector3()), s = cx.getSize(new THREE.Vector3());
    const meio = Math.max(3.2, s.x / 2 + 1.6, (s.z / 2 + 1.6) * asp);
    topCam.left = -meio; topCam.right = meio; topCam.top = meio / asp; topCam.bottom = -meio / asp;
    topCam.position.set(c.x, 40, c.z); topCam.updateProjectionMatrix(); topCam.updateMatrixWorld();
    cam = topCam; scene.fog.density = 0;
  } else scene.fog.density = neblinaBase();
  renderer.setViewport(0, 0, vw, vh); renderer.setScissor(0, 0, vw, vh); renderer.setScissorTest(true);
  renderer.render(scene, cam);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, t.x, t.y);
  const pr = renderer.getPixelRatio();
  pipCtx.drawImage(canvas, 0, canvas.height - vh * pr, vw * pr, vh * pr, 0, 0, W, Hh);
}

let n = 0;
function quadroAQuadro() {
  requestAnimationFrame(quadroAQuadro);
  if (E.vista === 'cena') orbit.update();
  if (caixaSel.visible) caixaSel.update();
  grade.visible = E.guias.grade;
  if (n++ % 3 === 0) desenharPip();
  const cam = vistaCam();
  scene.fog.density = E.vista === 'camera' ? neblinaBase() : Math.min(neblinaBase(), 0.012);
  passeCena.camera = cam; bokeh.enabled = PODE_FLOAT && E.vista === 'camera' && E.cam.pdc;
  composer.render();
  renderer.autoClear = false; renderer.clearDepth(); renderer.render(sobre, cam); renderer.autoClear = true;
  if (camSuja && n % 6 === 0 && !arrastandoGizmo) { camSuja = false; H.cam(); }
}

// ---------- leitura da cena para o prompt ----------
const POSE_EN = { empe: 'standing', andando: 'walking', correndo: 'running', sentado: 'sitting', sentadoChao: 'sitting on the floor with knees up', agachado: 'crouching', ajoelhado: 'kneeling on one knee', deitado: 'lying on the back', bracosCruzados: 'standing with arms crossed', maosCintura: 'standing with hands on hips', apontando: 'pointing forward with one arm', conversando: 'gesturing while talking', telefone: 'holding a phone to the ear', pensando: 'hand on chin, thinking', acenando: 'waving one hand', maosAoAlto: 'with both hands raised', guarda: 'in a fighting stance', tpose: 'standing' };

function noQuadro(p) {
  const v = p.clone().project(filmCam);
  const dentro = v.z < 1 && Math.abs(v.x) < 1.08 && Math.abs(v.y) < 1.25;
  return { dentro, x: v.x, posicao: v.x < -0.3 ? 'left' : v.x > 0.3 ? 'right' : 'center' };
}
export function classificarPlano() {
  const o = optica(E.cam);
  const vis = bonecos().filter((b) => b.obj.visible).map((b) => ({ b, p: cabecaMundo(b) })).map((x) => ({ ...x, q: noQuadro(x.p) })).filter((x) => x.q.dentro);
  if (!vis.length) return { sigla: 'PG', nome: 'Plano geral', en: 'wide establishing shot', n: 0 };
  vis.sort((a, b) => Math.abs(a.q.x) - Math.abs(b.q.x));
  const d = vis[0].p.distanceTo(filmCam.position);
  const razao = (2 * d * Math.tan(rad(o.fovV) / 2)) / (vis[0].b.ctl.altura * vis[0].b.obj.scale.y);
  const faixas = [[3.2, 'gpg'], [1.75, 'pg'], [1.1, 'pi'], [0.78, 'pa'], [0.5, 'pm'], [0.35, 'pmc'], [0.22, 'pp'], [0.12, 'close'], [0, 'det']];
  const id = faixas.find((f) => razao >= f[0])[1];
  return { ...TAMANHOS.find((t) => t.id === id), n: vis.length, razao };
}
function nomeCor(hex) {
  const h = { h: 0, s: 0, l: 0 }; new THREE.Color(hex).getHSL(h);
  if (h.s < 0.15) return 'white';
  const g = h.h * 360;
  return g < 15 ? 'red' : g < 45 ? 'orange' : g < 70 ? 'yellow' : g < 165 ? 'green' : g < 200 ? 'cyan' : g < 255 ? 'blue' : g < 290 ? 'purple' : g < 340 ? 'magenta' : 'red';
}
export function resumoCena() {
  const c = E.cam, o = optica(c), T = classificarPlano();
  const personagens = bonecos().filter((b) => b.obj.visible).map((b) => {
    const q = noQuadro(cabecaMundo(b));
    return { cor: (CORES_BONECO.find((x) => x.hex === b.cor) || { en: 'colored' }).en, descricao: (b.descricao || '').trim(), posicao: q.posicao, noQuadro: q.dentro, pose: POSE_EN[b.poseId] || 'in the pose shown', x: q.x };
  }).sort((a, b) => a.x - b.x);
  const elementos = E.itens.filter((i) => i.tipo === 'elemento' && i.obj.visible).map((e) => {
    const q = noQuadro(centroItem(e));
    return { forma: NOME_EN[e.forma] || 'object', descricao: (e.descricao || '').trim(), posicao: q.posicao, noQuadro: q.dentro };
  }).filter((e) => e.noQuadro);

  const angulo = c.tilt < -60 ? 'overhead top-down view' : c.tilt < -14 ? 'high angle looking down' : c.tilt > 14 ? 'low angle looking up' : c.pos[1] < 0.6 ? 'low camera near the ground, level horizon' : 'eye-level camera';
  const fundo = o.A * 0.66;
  const pdc = fundo > 0.012 ? 'very shallow depth of field with a strongly blurred background' : fundo > 0.004 ? 'shallow depth of field with a soft background' : 'deep focus, background sharp';
  const sup = SUPORTES.find((s) => s[0] === c.suporte);
  const prop = PROPORCOES.find((p) => Math.abs(p[0] - c.proporcao) < 0.01);
  const cam = {
    plano: (T.n === 2 ? 'two-shot, ' : T.n > 2 ? 'group shot, ' : '') + T.en, angulo, holandes: Math.abs(c.roll) >= 4 ? Math.round(Math.abs(c.roll)) : 0,
    sensor: o.sensor.en, focal: Math.round(c.focal), anamorfica: c.anamorfica, t: c.t, pdc, suporte: sup ? sup[3] : '', proporcao: prop ? prop[1].split(' ')[0] : c.proporcao.toFixed(2) + ':1',
  };

  const { centro, f, r } = referenciaLuz();
  const luzes = E.itens.filter((i) => i.tipo === 'luz' && i.obj.visible && i.ligada !== false && i.intensidade > 0.02).map((l) => {
    const v = l.forma === 'sol' ? l.obj.getWorldDirection(new THREE.Vector3()).negate() : l.obj.position.clone().sub(centro);
    const hz = Math.hypot(v.x, v.z), el = grau(Math.atan2(v.y, hz));
    const az = grau(Math.atan2(v.dot(r), v.dot(f)));
    const lado = az > 0 ? 'right' : 'left', a = Math.abs(az);
    let direcao = a < 22 ? 'the front, near the camera axis' : a < 68 ? `front-${lado} of camera` : a < 115 ? `camera ${lado}, side-on` : a < 158 ? `behind the subject on camera ${lado}` : 'directly behind the subject';
    if (el > 62) direcao = 'directly overhead'; else if (el > 28) direcao += ', high'; else if (el < -8) direcao += ', from below';
    const cor = l.gel ? nomeCor(l.gel) + ' gelled' : l.kelvin < 3500 ? 'warm tungsten' : l.kelvin < 4800 ? 'warm white' : l.kelvin < 6300 ? 'neutral daylight' : 'cool blue';
    const tras = a >= 115 && el < 62;
    return { az: a, tras, forca0: l.intensidade * TIPOS_LUZ[l.forma].base / (l.forma === 'sol' ? 1 : Math.max(v.lengthSq(), 0.5)) * (l.forma === 'sol' ? 4 : 1), forma: l.forma, kelvin: l.kelvin, direcao, cor, dureza: l.forma === 'softbox' || l.suavidade > 0.6 ? 'soft' : 'hard' };
  });
  const frente = luzes.filter((l) => !l.tras && l.forma !== 'ponto').sort((a, b) => b.forca0 - a.forca0);
  for (const l of luzes) {
    if (l.forma === 'ponto') l.papel = 'Practical lamp';
    else if (l.forma === 'sol') l.papel = l.kelvin > 8000 ? 'Moonlight' : 'Sunlight';
    else if (l.tras) l.papel = 'Backlight / rim';
    else l.papel = l === frente[0] ? 'Key light' : 'Fill light';
    l.forca = l.papel === 'Fill light' ? 'low intensity' : '';
  }
  const a = E.amb.intensidade;
  const ambiente = a < 0.08 ? 'Almost no ambient fill: deep, dark shadows.' : a < 0.3 ? 'Low ambient fill, shadows keep some detail.' : a < 0.8 ? 'Moderate ambient fill.' : 'Bright, even ambient light.';
  const neblina = E.amb.neblina > 0.3 ? 'Heavy haze in the air, visible light beams.' : E.amb.neblina > 0.1 ? 'Light atmospheric haze.' : '';
  const P = PRESETS_LUZ.find((p) => p.id === E.amb.esquema);
  return { cam, personagens, elementos, luzes, ambiente, neblina, esquema: P ? 'Overall: ' + P.en : '' };
}

export const _dbg = { renderer, scene, sobre, composer, bokeh, dirCam, topCam, gizmo, orbit };
