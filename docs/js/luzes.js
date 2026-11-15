// Luzes de set. O corpo do refletor fica na camada 1: aparece na vista de cena e na planta, nunca na câmera do filme.
import * as THREE from 'three';

export const TIPOS_LUZ = {
  spot: { nome: 'Refletor', base: 52, en: 'hard spotlight' },
  softbox: { nome: 'Softbox', base: 40, en: 'large soft source' },
  ponto: { nome: 'Lâmpada', base: 18, en: 'practical bulb' },
  sol: { nome: 'Sol / Lua', base: 3.2, en: 'sun' },
};

export const PADRAO_LUZ = {
  spot: { kelvin: 5600, gel: null, intensidade: 1, angulo: 40, suavidade: 0.15, sombra: true, ligada: true },
  softbox: { kelvin: 5600, gel: null, intensidade: 1, angulo: 95, suavidade: 1, sombra: true, ligada: true },
  ponto: { kelvin: 2900, gel: null, intensidade: 1, angulo: 0, suavidade: 0.4, sombra: true, ligada: true },
  sol: { kelvin: 5600, gel: null, intensidade: 1, angulo: 0, suavidade: 0.1, sombra: true, ligada: true },
};

// Temperatura de cor (K) -> cor. Aproximação de Tanner Helland.
export function kelvinParaCor(k, alvo = new THREE.Color()) {
  const t = Math.min(40000, Math.max(1000, k)) / 100;
  let r, g, b;
  if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307; }
  else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); b = 255; }
  const c = (x) => Math.min(255, Math.max(0, x)) / 255;
  return alvo.setRGB(c(r), c(g), c(b), THREE.SRGBColorSpace);
}

export function nomeTemperatura(k) {
  if (k < 2400) return 'vela';
  if (k < 3500) return 'tungstênio';
  if (k < 4600) return 'branco quente';
  if (k < 6200) return 'luz do dia';
  if (k < 8000) return 'nublado';
  return 'sombra azul';
}

function camada1(o) { o.traverse((n) => n.layers.set(1)); return o; }

export function criarLuz(forma) {
  const root = new THREE.Group();
  const alvo = new THREE.Object3D(); alvo.position.set(0, 0, 1); root.add(alvo);
  let luz;
  if (forma === 'ponto') luz = new THREE.PointLight(0xffffff, 1, 0, 2);
  else if (forma === 'sol') luz = new THREE.DirectionalLight(0xffffff, 1);
  else luz = new THREE.SpotLight(0xffffff, 1, 0, 0.5, 0.2, 2);
  if (luz.target) luz.target = alvo;
  luz.position.set(0, 0, 0); // o three cria refletor e sol em (0,1,0); aqui a luz fica no centro do corpo
  root.add(luz);

  { const tam = forma === 'ponto' || forma === 'softbox' ? 1024 : 2048; luz.shadow.mapSize.set(tam, tam); }
  luz.shadow.bias = -0.0004; luz.shadow.normalBias = 0.03;
  if (forma === 'sol') { const c = luz.shadow.camera; c.left = -12; c.right = 12; c.top = 12; c.bottom = -12; c.near = 0.5; c.far = 60; c.updateProjectionMatrix(); }
  else { luz.shadow.camera.near = 0.15; luz.shadow.camera.far = 40; }

  // corpo visível
  const corpo = new THREE.Group(); root.add(corpo);
  const casco = new THREE.MeshBasicMaterial({ color: 0x2b2d33, toneMapped: false });
  const face = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  if (forma === 'spot') {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.26, 20), casco); c.rotation.x = Math.PI / 2; corpo.add(c);
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), face); d.position.z = 0.132; corpo.add(d);
  } else if (forma === 'softbox') {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.06, 0.3, 4, 1, true), casco); c.rotation.set(Math.PI / 2, Math.PI / 4, 0); c.material.side = THREE.DoubleSide; corpo.add(c);
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.58), face); d.position.z = 0.152; corpo.add(d);
  } else if (forma === 'ponto') {
    corpo.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), face));
  } else {
    corpo.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), face));
    const anel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.012, 6, 32), face); corpo.add(anel);
  }
  // área de clique generosa e seta de direção
  const pega = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); corpo.add(pega);
  let seta = null;
  if (forma !== 'ponto') {
    seta = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.15), new THREE.Vector3(0, 0, 1.6)]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, toneMapped: false }));
    seta.raycast = () => {};
    corpo.add(seta);
  }
  camada1(corpo);

  const cor = new THREE.Color(), tinta = new THREE.Color();
  function aplicar(p) {
    kelvinParaCor(p.kelvin, cor);
    if (p.gel) cor.multiply(tinta.set(p.gel));
    luz.color.copy(cor);
    luz.intensity = p.ligada === false ? 0 : TIPOS_LUZ[forma].base * p.intensidade;
    if (luz.isSpotLight) { luz.angle = THREE.MathUtils.degToRad(Math.min(170, p.angulo) / 2); luz.penumbra = forma === 'softbox' ? 1 : p.suavidade; }
    luz.castShadow = !!p.sombra && p.ligada !== false;
    luz.shadow.radius = 1 + p.suavidade * (forma === 'softbox' ? 2.2 : 1.6);
    const visivel = p.ligada === false ? 0.25 : 1;
    face.color.copy(cor).multiplyScalar(visivel);
    if (seta) seta.material.color.copy(cor);
  }

  return { root, luz, forma, aplicar, dispose() { corpo.traverse((o) => o.geometry && o.geometry.dispose()); luz.dispose && luz.dispose(); } };
}

// Esquemas de luz. az = ângulo em volta do personagem a partir do eixo da câmera (+ = direita da câmera);
// el = elevação; dist em metros. amb = luz ambiente e fundo.
const L = (forma, nome, az, el, dist, extra = {}) => ({ forma, nome, az, el, dist, ...PADRAO_LUZ[forma], ...extra });
export const PRESETS_LUZ = [
  { id: 'tres', nome: 'Três pontos', desc: 'Principal, preenchimento e contraluz', en: 'classic three-point lighting',
    amb: { intensidade: 0.22, ceu: '#aab4c8', solo: '#3a3632', fundo: '#15171b', neblina: 0 },
    luzes: [L('spot', 'Principal', 40, 32, 3.6, { intensidade: 1.1, angulo: 46 }), L('softbox', 'Preenchimento', -48, 12, 3.6, { intensidade: 0.32, sombra: false }), L('spot', 'Contraluz', 155, 45, 3.4, { intensidade: 1.2, angulo: 38 })] },
  { id: 'rembrandt', nome: 'Rembrandt', desc: 'Lateral alta, triângulo de luz no rosto', en: 'Rembrandt lighting with a triangle of light on the shadowed cheek',
    amb: { intensidade: 0.07, ceu: '#8a8f9c', solo: '#2a2622', fundo: '#0c0d10', neblina: 0 },
    luzes: [L('spot', 'Principal', 52, 42, 3.2, { intensidade: 1.25, angulo: 36, kelvin: 4300 })] },
  { id: 'borboleta', nome: 'Borboleta', desc: 'Frontal alta, glamour', en: 'butterfly (Paramount) beauty lighting from high front',
    amb: { intensidade: 0.2, ceu: '#b4bac8', solo: '#4a4640', fundo: '#1a1c21', neblina: 0 },
    luzes: [L('softbox', 'Principal', 0, 48, 2.8, { intensidade: 1.0 }), L('spot', 'Contraluz', 180, 50, 3.2, { intensidade: 0.8, angulo: 34 })] },
  { id: 'lateral', nome: 'Lateral (split)', desc: 'Metade do rosto na sombra', en: 'split lighting, half of the face in deep shadow',
    amb: { intensidade: 0.07, ceu: '#7c8290', solo: '#201e1c', fundo: '#08090b', neblina: 0 },
    luzes: [L('spot', 'Principal', 82, 10, 3.2, { intensidade: 1.3, angulo: 40 })] },
  { id: 'silhueta', nome: 'Contraluz / silhueta', desc: 'Fundo aceso, figura em silhueta', en: 'strong backlight, subjects in near silhouette with a glowing rim',
    amb: { intensidade: 0.03, ceu: '#8c96aa', solo: '#1c1c1e', fundo: '#2a3140', neblina: 0.2 },
    luzes: [L('softbox', 'Luz do fundo', 180, -8, 0.7, { intensidade: 2.4, angulo: 140, sombra: false, mira: 'fundo' }), L('spot', 'Contraluz', 168, 42, 2.0, { intensidade: 0.9, angulo: 70 })] },
  { id: 'noir', nome: 'Noir', desc: 'Dura, baixa, sombras recortadas', en: 'film noir low-key lighting, hard shadows, high contrast',
    amb: { intensidade: 0.025, ceu: '#6c7280', solo: '#161616', fundo: '#050506', neblina: 0.12 },
    luzes: [L('spot', 'Principal dura', 68, 28, 4.2, { intensidade: 1.7, angulo: 26, suavidade: 0 }), L('spot', 'Recorte', -150, 38, 3.6, { intensidade: 0.9, angulo: 30, suavidade: 0 })] },
  { id: 'dourada', nome: 'Hora dourada', desc: 'Sol baixo e quente, sombra azulada', en: 'golden hour, low warm sunlight raking across the scene with cool blue shadows',
    amb: { intensidade: 0.42, ceu: '#8fb0e0', solo: '#6a4a30', fundo: '#e0a060', neblina: 0.18 },
    luzes: [L('sol', 'Sol baixo', 68, 12, 14, { intensidade: 1.1, kelvin: 3000 })] },
  { id: 'meiodia', nome: 'Meio-dia', desc: 'Sol alto e duro', en: 'harsh midday sun from high overhead, hard short shadows',
    amb: { intensidade: 0.6, ceu: '#a8c8f4', solo: '#7a705c', fundo: '#8fb4e6', neblina: 0.04 },
    luzes: [L('sol', 'Sol', 30, 72, 14, { intensidade: 1.5, kelvin: 5600 })] },
  { id: 'nublado', nome: 'Dia nublado', desc: 'Luz difusa, sem sombra marcada', en: 'soft overcast daylight, diffuse and shadowless',
    amb: { intensidade: 1.6, ceu: '#d5dbe4', solo: '#6c6c6a', fundo: '#b9c0ca', neblina: 0.1 },
    luzes: [L('sol', 'Céu', 20, 70, 14, { intensidade: 0.28, kelvin: 6800, suavidade: 1 })] },
  { id: 'noite', nome: 'Noite azul', desc: 'Luar frio e uma prática quente', en: 'night exterior, cold blue moonlight with a small warm practical light',
    amb: { intensidade: 0.09, ceu: '#3a56a0', solo: '#101624', fundo: '#070b16', neblina: 0.14 },
    luzes: [L('sol', 'Luar', 105, 46, 14, { intensidade: 0.6, kelvin: 9500 }), L('ponto', 'Prática', -62, 2, 1.7, { intensidade: 0.22, kelvin: 2500 })] },
  { id: 'baixo', nome: 'Luz de baixo', desc: 'Terror, lanterna no queixo', en: 'eerie underlighting from below the face, horror mood',
    amb: { intensidade: 0.03, ceu: '#60687a', solo: '#141414', fundo: '#060607', neblina: 0.1 },
    luzes: [L('spot', 'De baixo', 12, -52, 1.7, { intensidade: 0.3, angulo: 80, kelvin: 4000 })] },
  { id: 'topo', nome: 'Luz de topo', desc: 'Interrogatório, olhos na sombra', en: 'single hard top light directly overhead, eyes in shadow',
    amb: { intensidade: 0.03, ceu: '#70788a', solo: '#161616', fundo: '#060607', neblina: 0.16 },
    luzes: [L('spot', 'Topo', 0, 86, 2.6, { intensidade: 1.1, angulo: 44, kelvin: 4200 })] },
  { id: 'neon', nome: 'Neon bicolor', desc: 'Magenta de um lado, ciano do outro', en: 'neon-lit night scene, magenta light from one side and cyan from the other',
    amb: { intensidade: 0.05, ceu: '#4a3a8a', solo: '#14101c', fundo: '#0a0714', neblina: 0.2 },
    luzes: [L('softbox', 'Magenta', 70, 14, 2.8, { intensidade: 1.6, gel: '#ff2d95', kelvin: 6500 }), L('softbox', 'Ciano', -105, 18, 2.8, { intensidade: 1.6, gel: '#1fd6ff', kelvin: 6500 })] },
  { id: 'janela', nome: 'Luz de janela', desc: 'Grande fonte lateral suave', en: 'soft window light from the side, gentle falloff into shadow',
    amb: { intensidade: 0.16, ceu: '#b6c2d6', solo: '#4c4640', fundo: '#22252b', neblina: 0.03 },
    luzes: [L('softbox', 'Janela', 72, 14, 2.8, { intensidade: 1.15, kelvin: 6200 })] },
];
