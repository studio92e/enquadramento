// Boneco articulado. Construído com altura 1 e escalado pela altura real.
// Convenção: de frente para +Z, esquerda do boneco em +X. Poses em graus (Euler XYZ);
// as juntas do lado D recebem Y e Z espelhados, então a mesma tripla vale para os dois lados.
import * as THREE from 'three';

export const CORES_BONECO = [
  { id: 'azul', hex: '#4f8fe8', en: 'blue' },
  { id: 'vermelho', hex: '#e2574c', en: 'red' },
  { id: 'verde', hex: '#4fb477', en: 'green' },
  { id: 'amarelo', hex: '#e9c24a', en: 'yellow' },
  { id: 'roxo', hex: '#9a6fe0', en: 'purple' },
  { id: 'laranja', hex: '#ee8a3c', en: 'orange' },
  { id: 'ciano', hex: '#45c4d6', en: 'cyan' },
  { id: 'rosa', hex: '#e678b4', en: 'pink' },
  { id: 'cinza', hex: '#b9b6ae', en: 'light gray' },
];

export const BIOTIPOS = {
  homem: { nome: 'Homem', altura: 1.78, ombro: 0.128, quadril: 0.05, cabeca: 0.125, hQuadril: 0.53, tronco: 1.0, braco: 0.172, antebraco: 0.15, mao: 0.085 },
  mulher: { nome: 'Mulher', altura: 1.65, ombro: 0.108, quadril: 0.055, cabeca: 0.13, hQuadril: 0.535, tronco: 0.88, braco: 0.168, antebraco: 0.146, mao: 0.08 },
  crianca: { nome: 'Criança', altura: 1.2, ombro: 0.1, quadril: 0.048, cabeca: 0.17, hQuadril: 0.47, tronco: 0.95, braco: 0.155, antebraco: 0.135, mao: 0.08 },
};

export const JUNTAS = [
  ['quadril', 'Quadril'], ['coluna', 'Coluna'], ['peito', 'Peito'], ['pescoco', 'Pescoço'], ['cabeca', 'Cabeça'],
  ['ombroE', 'Ombro esq.'], ['cotoveloE', 'Cotovelo esq.'], ['punhoE', 'Punho esq.'],
  ['ombroD', 'Ombro dir.'], ['cotoveloD', 'Cotovelo dir.'], ['punhoD', 'Punho dir.'],
  ['pernaE', 'Coxa esq.'], ['joelhoE', 'Joelho esq.'], ['peE', 'Pé esq.'],
  ['pernaD', 'Coxa dir.'], ['joelhoD', 'Joelho dir.'], ['peD', 'Pé dir.'],
];

const A = [0, 0, 7], C = [-10, 0, 0]; // braço e cotovelo em descanso
export const POSES = {
  empe: { nome: 'Em pé', j: { ombroE: A, ombroD: A, cotoveloE: C, cotoveloD: C } },
  andando: { nome: 'Andando', j: { coluna: [3, 0, 0], pernaE: [-26, 0, 0], joelhoE: [8, 0, 0], peE: [10, 0, 0], pernaD: [20, 0, 0], joelhoD: [28, 0, 0], ombroE: [22, 0, 6], cotoveloE: [-18, 0, 0], ombroD: [-24, 0, 6], cotoveloD: [-30, 0, 0] } },
  correndo: { nome: 'Correndo', j: { coluna: [14, 0, 0], cabeca: [-8, 0, 0], pernaE: [-62, 0, 0], joelhoE: [78, 0, 0], pernaD: [28, 0, 0], joelhoD: [62, 0, 0], peD: [30, 0, 0], ombroE: [42, 0, 8], cotoveloE: [-95, 0, 0], ombroD: [-48, 0, 8], cotoveloD: [-95, 0, 0] } },
  sentado: { nome: 'Sentado', j: { pernaE: [-88, 0, 4], pernaD: [-88, 0, 4], joelhoE: [88, 0, 0], joelhoD: [88, 0, 0], ombroE: [-22, 0, 8], ombroD: [-22, 0, 8], cotoveloE: [-58, 0, 0], cotoveloD: [-58, 0, 0] } },
  sentadoChao: { nome: 'Sentado no chão', j: { coluna: [14, 0, 0], pernaE: [-118, 0, 8], pernaD: [-118, 0, 8], joelhoE: [122, 0, 0], joelhoD: [122, 0, 0], peE: [-8, 0, 0], peD: [-8, 0, 0], ombroE: [-52, 0, 10], ombroD: [-52, 0, 10], cotoveloE: [-35, 0, 0], cotoveloD: [-35, 0, 0] } },
  agachado: { nome: 'Agachado', j: { coluna: [28, 0, 0], cabeca: [-18, 0, 0], pernaE: [-112, 0, 10], pernaD: [-112, 0, 10], joelhoE: [138, 0, 0], joelhoD: [138, 0, 0], peE: [-26, 0, 0], peD: [-26, 0, 0], ombroE: [-58, 0, 10], ombroD: [-58, 0, 10], cotoveloE: [-40, 0, 0], cotoveloD: [-40, 0, 0] } },
  ajoelhado: { nome: 'Ajoelhado', j: { pernaE: [-90, 0, 0], joelhoE: [90, 0, 0], pernaD: [0, 0, 0], joelhoD: [90, 0, 0], peD: [55, 0, 0], ombroE: [-40, 0, 8], cotoveloE: [-45, 0, 0], ombroD: A, cotoveloD: C } },
  deitado: { nome: 'Deitado', j: { quadril: [-90, 0, 0], ombroE: [0, 0, 16], ombroD: [0, 0, 16], cotoveloE: C, cotoveloD: C } },
  bracosCruzados: { nome: 'Braços cruzados', j: { ombroE: [-40, 0, 10], ombroD: [-34, 0, 10], cotoveloE: [-92, 0, -80], cotoveloD: [-102, 0, -80] } },
  maosCintura: { nome: 'Mãos na cintura', j: { ombroE: [18, 0, 42], ombroD: [18, 0, 42], cotoveloE: [-28, 0, -100], cotoveloD: [-28, 0, -100] } },
  apontando: { nome: 'Apontando', j: { ombroD: [-84, 0, 4], cotoveloD: [-6, 0, 0], ombroE: A, cotoveloE: C } },
  conversando: { nome: 'Gesticulando', j: { ombroE: [-28, 0, 12], cotoveloE: [-82, 0, -12], ombroD: [-18, 0, 10], cotoveloD: [-62, 0, 10], cabeca: [0, 10, 0] } },
  telefone: { nome: 'Ao telefone', j: { ombroD: [-34, 0, 26], cotoveloD: [-148, 0, -14], cabeca: [0, 0, -8], ombroE: A, cotoveloE: C } },
  pensando: { nome: 'Pensando', j: { ombroD: [-38, 0, 8], cotoveloD: [-138, 0, -24], ombroE: [-22, 0, 8], cotoveloE: [-80, 0, -78], cabeca: [10, 0, 0] } },
  acenando: { nome: 'Acenando', j: { ombroD: [0, 0, 100], cotoveloD: [0, 0, 78], ombroE: A, cotoveloE: C } },
  maosAoAlto: { nome: 'Mãos ao alto', j: { ombroE: [0, 0, 118], ombroD: [0, 0, 118], cotoveloE: [0, 0, 55], cotoveloD: [0, 0, 55] } },
  guarda: { nome: 'Em guarda', j: { coluna: [8, 0, 0], pernaE: [-22, 0, 6], joelhoE: [24, 0, 0], pernaD: [14, 0, 6], joelhoD: [22, 0, 0], ombroE: [-58, 0, 14], cotoveloE: [-112, 0, 0], ombroD: [-42, 0, 14], cotoveloD: [-124, 0, 0] } },
  tpose: { nome: 'T', j: { ombroE: [0, 0, 90], ombroD: [0, 0, 90] } },
};

const rad = THREE.MathUtils.degToRad, grau = THREE.MathUtils.radToDeg;

export function criarBoneco({ biotipo = 'homem', altura, cor = '#4f8fe8' } = {}) {
  const B = BIOTIPOS[biotipo] || BIOTIPOS.homem;
  const root = new THREE.Group();
  const corpo = new THREE.Group();
  root.add(corpo);

  const mat = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.72, metalness: 0.0 });
  const matJ = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.6 });
  const matR = new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.5 });
  // Marcas de frente e costas: peito claro e nariz na frente; faixa escura na coluna e touca escura atrás da cabeça.
  // Sem elas o boneco é simétrico e nem o olho nem o gerador de imagem sabem para onde ele está virado.
  const matClaro = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.7 });
  const matEscuro = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8 });
  const branco = new THREE.Color(0xffffff);
  const pintar = (hex) => { mat.color.set(hex); matJ.color.set(hex).multiplyScalar(0.62); matClaro.color.set(hex).lerp(branco, 0.6); matEscuro.color.set(hex).multiplyScalar(0.28); };
  pintar(cor);

  const J = {};
  const junta = (nome, pai, x, y, z) => { const o = new THREE.Group(); o.name = nome; o.position.set(x, y, z); pai.add(o); J[nome] = o; return o; };
  const malha = (geo, m, pai, nomeJunta, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; o.userData.junta = nomeJunta; pai.add(o); return o;
  };
  const capsula = (r, comp) => new THREE.CapsuleGeometry(r, Math.max(comp - 2 * r, 0.001), 6, 16);
  const bola = (r) => new THREE.SphereGeometry(r, 20, 14);

  // medidas (fração da altura)
  const hQ = B.hQuadril, cab = B.cabeca, pesc = 0.04, tr = B.tronco;
  const tronco = 1 - cab - pesc - hQ, abd = tronco * 0.36, pei = tronco * 0.64;
  const pe = 0.04, coxa = (hQ - pe) / 2, canela = coxa;

  const quadril = junta('quadril', corpo, 0, hQ, 0);
  malha(bola(0.086), mat, quadril, 'quadril').scale.set((B.quadril / 0.05) * 1.22 * tr, 0.8, 0.9);

  const coluna = junta('coluna', quadril, 0, 0.015, 0);
  malha(capsula(0.07, abd + 0.07), mat, coluna, 'coluna', 0, abd / 2, 0).scale.set(1.22 * tr, 1, 0.86);
  malha(new THREE.BoxGeometry(0.024, abd + 0.03, 0.02), matEscuro, coluna, 'coluna', 0, abd / 2, -0.054); // coluna (costas)

  const peito = junta('peito', coluna, 0, abd, 0);
  malha(capsula(0.088, pei + 0.035), mat, peito, 'peito', 0, pei / 2 - 0.01, 0).scale.set((B.ombro / 0.128) * 1.3 * tr, 1, 0.84);
  malha(bola(0.058), matClaro, peito, 'peito', 0, pei * 0.56, 0.057).scale.set((B.ombro / 0.128) * 1.35 * tr, pei / 0.16, 0.36); // peito (frente)
  malha(new THREE.BoxGeometry(0.024, pei * 0.9, 0.02), matEscuro, peito, 'peito', 0, pei * 0.5, -0.068); // coluna (costas)

  const pescoco = junta('pescoco', peito, 0, pei - 0.005, 0);
  malha(capsula(0.027, pesc + 0.05), matJ, pescoco, 'pescoco', 0, pesc / 2, 0);

  const cabeca = junta('cabeca', pescoco, 0, pesc, 0);
  const rc = cab / 2;
  malha(bola(rc), mat, cabeca, 'cabeca', 0, rc, 0).scale.set(0.8, 1, 0.9);
  malha(bola(rc * 1.04), matEscuro, cabeca, 'cabeca', 0, rc * 1.06, -rc * 0.2).scale.set(0.82, 0.98, 0.92); // touca: topo e nuca
  malha(new THREE.BoxGeometry(0.014, 0.026, 0.022), matJ, cabeca, 'cabeca', 0, cab * 0.4, rc * 0.9);
  malha(bola(0.0085), matR, cabeca, 'cabeca', 0.022, cab * 0.55, rc * 0.8);
  malha(bola(0.0085), matR, cabeca, 'cabeca', -0.022, cab * 0.55, rc * 0.8);

  for (const [L, s] of [['E', 1], ['D', -1]]) {
    const ombro = junta('ombro' + L, peito, s * B.ombro, pei - 0.03, 0);
    malha(bola(0.037 * tr), matJ, ombro, 'ombro' + L);
    malha(capsula(0.031 * tr, B.braco), mat, ombro, 'ombro' + L, 0, -B.braco / 2, 0);
    const cot = junta('cotovelo' + L, ombro, 0, -B.braco, 0);
    malha(bola(0.029 * tr), matJ, cot, 'cotovelo' + L);
    malha(capsula(0.026 * tr, B.antebraco), mat, cot, 'cotovelo' + L, 0, -B.antebraco / 2, 0);
    const punho = junta('punho' + L, cot, 0, -B.antebraco, 0);
    malha(bola(0.022), matJ, punho, 'punho' + L);
    malha(capsula(0.021, B.mao), mat, punho, 'punho' + L, 0, -B.mao / 2, 0).scale.set(1.45, 1, 0.75);

    const perna = junta('perna' + L, quadril, s * B.quadril, -0.005, 0);
    malha(bola(0.054 * tr), matJ, perna, 'perna' + L);
    malha(capsula(0.05 * tr, coxa), mat, perna, 'perna' + L, 0, -coxa / 2, 0);
    const joelho = junta('joelho' + L, perna, 0, -coxa, 0);
    malha(bola(0.043 * tr), matJ, joelho, 'joelho' + L);
    malha(capsula(0.039 * tr, canela), mat, joelho, 'joelho' + L, 0, -canela / 2, 0);
    const tornozelo = junta('pe' + L, joelho, 0, -canela, 0);
    malha(bola(0.034), matJ, tornozelo, 'pe' + L);
    const sola = malha(capsula(0.026, 0.15), mat, tornozelo, 'pe' + L, 0, -pe + 0.027, 0.045);
    sola.rotation.x = Math.PI / 2; sola.scale.set(1.25, 1, 1);
  }

  let alturaAtual = altura || B.altura;
  corpo.scale.setScalar(alturaAtual);

  const v = new THREE.Vector3(), inv = new THREE.Matrix4(), m4 = new THREE.Matrix4();

  // Encosta o ponto mais baixo do corpo no chão do boneco (y = 0 no espaço dele).
  function aterrar() {
    quadril.position.y = hQ;
    root.updateWorldMatrix(true, true);
    inv.copy(root.matrixWorld).invert();
    let minY = Infinity;
    corpo.traverse((o) => {
      if (!o.isMesh) return;
      const p = o.geometry.attributes.position;
      m4.multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < p.count; i += 2) { v.fromBufferAttribute(p, i).applyMatrix4(m4); if (v.y < minY) minY = v.y; }
    });
    if (Number.isFinite(minY)) quadril.position.y = hQ - minY / alturaAtual;
    root.updateWorldMatrix(true, true);
  }

  function setPose(pose = {}) {
    for (const [nome] of JUNTAS) {
      const p = pose[nome] || [0, 0, 0];
      const e = nome.endsWith('D') ? -1 : 1;
      J[nome].rotation.set(rad(p[0]), rad(p[1]) * e, rad(p[2]) * e);
    }
    aterrar();
  }
  function getPose() {
    const pose = {};
    for (const [nome] of JUNTAS) {
      const r = J[nome].rotation, e = nome.endsWith('D') ? -1 : 1;
      const t = [grau(r.x), grau(r.y) * e, grau(r.z) * e].map((n) => Math.round(n * 10) / 10 + 0);
      if (t[0] || t[1] || t[2]) pose[nome] = t;
    }
    return pose;
  }

  return {
    root, corpo, juntas: J, biotipo,
    setCor: pintar,
    setAltura(h) { alturaAtual = h; corpo.scale.setScalar(h); aterrar(); },
    get altura() { return alturaAtual; },
    alturaCabeca: cab,
    setPose, getPose, aterrar,
    dispose() { corpo.traverse((o) => o.isMesh && o.geometry.dispose()); mat.dispose(); matJ.dispose(); matR.dispose(); matClaro.dispose(); matEscuro.dispose(); },
  };
}
