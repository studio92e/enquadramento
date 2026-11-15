// Dados de câmera: sensores, proporções, lentes e tamanhos de plano.

export const SENSORES = [
  { id: 's35', nome: 'Super 35 (4 perf.)', w: 24.89, h: 18.66, en: 'Super 35 cinema camera' },
  { id: 'alexa35', nome: 'ARRI Alexa 35 · Open Gate', w: 27.99, h: 19.22, en: 'ARRI Alexa 35' },
  { id: 'ff', nome: 'Full Frame · VistaVision', w: 36.0, h: 24.0, en: 'full-frame cinema camera' },
  { id: 'alexalf', nome: 'ARRI Alexa Mini LF · Open Gate', w: 36.7, h: 25.54, en: 'ARRI Alexa Mini LF large format' },
  { id: 'venice', nome: 'Sony Venice 2 · 8.6K', w: 35.9, h: 24.0, en: 'Sony Venice 2' },
  { id: 'raptor', nome: 'RED V-Raptor · 8K VV', w: 40.96, h: 21.6, en: 'RED V-Raptor VistaVision' },
  { id: 'alexa65', nome: 'ARRI Alexa 65', w: 54.12, h: 25.58, en: 'ARRI Alexa 65 large format' },
  { id: 'imax', nome: 'IMAX 15/70', w: 70.41, h: 52.63, en: 'IMAX 70mm film camera' },
  { id: 'bmpcc', nome: 'Blackmagic Pocket 4K', w: 18.96, h: 10.0, en: 'Blackmagic Pocket Cinema Camera' },
  { id: 'mft', nome: 'Micro 4/3', w: 17.3, h: 13.0, en: 'Micro Four Thirds camera' },
  { id: 'apsc', nome: 'APS-C', w: 23.5, h: 15.6, en: 'APS-C camera' },
  { id: 's16', nome: 'Super 16', w: 12.52, h: 7.41, en: 'Super 16mm film camera' },
  { id: '16', nome: '16 mm', w: 10.26, h: 7.49, en: '16mm film camera' },
  { id: 's8', nome: 'Super 8', w: 5.79, h: 4.01, en: 'Super 8 film camera' },
  { id: 'cel', nome: 'Celular (sensor 1/1.3")', w: 9.8, h: 7.35, en: 'smartphone camera' },
];

export const PROPORCOES = [
  [2.39, '2.39:1 · Scope'],
  [2.0, '2:1 · Univisium'],
  [1.85, '1.85:1 · Flat'],
  [1.7778, '16:9'],
  [1.5, '3:2'],
  [1.43, '1.43:1 · IMAX'],
  [1.3333, '4:3 · Academy'],
  [1.0, '1:1'],
  [0.8, '4:5'],
  [0.5625, '9:16 · Vertical'],
];

export const FOCAIS = [12, 14, 18, 21, 25, 28, 32, 35, 40, 50, 65, 75, 85, 100, 135, 200];
export const DIAFRAGMAS = [1.3, 1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
export const ANAMORFICAS = [[1, 'Esférica'], [1.33, 'Anamórfica 1.33×'], [1.5, 'Anamórfica 1.5×'], [1.8, 'Anamórfica 1.8×'], [2, 'Anamórfica 2×']];

export const SUPORTES = [
  ['livre', 'Livre', null, ''],
  ['tripe', 'Tripé', 1.5, 'locked-off tripod shot'],
  ['ombro', 'Câmera na mão', 1.6, 'handheld camera'],
  ['steadicam', 'Steadicam', 1.4, 'smooth Steadicam shot'],
  ['baixo', 'Rente ao chão', 0.25, 'camera low to the ground'],
  ['grua', 'Grua', 4.0, 'crane shot'],
  ['drone', 'Drone', 12.0, 'aerial drone shot'],
];

// k = quanto do corpo (em alturas) aparece abaixo do topo da cabeça; m = folga acima.
export const TAMANHOS = [
  { id: 'gpg', sigla: 'GPG', nome: 'Grande plano geral', k: 2.6, m: 1.1, en: 'extreme wide shot' },
  { id: 'pg', sigla: 'PG', nome: 'Plano geral', k: 1.3, m: 0.3, en: 'wide shot' },
  { id: 'pi', sigla: 'PI', nome: 'Plano inteiro', k: 1.06, m: 0.1, en: 'full shot' },
  { id: 'pa', sigla: 'PA', nome: 'Plano americano', k: 0.74, m: 0.09, en: 'cowboy shot (mid-thigh up)' },
  { id: 'pm', sigla: 'PM', nome: 'Plano médio', k: 0.48, m: 0.08, en: 'medium shot (waist up)' },
  { id: 'pmc', sigla: 'PMC', nome: 'Plano médio curto', k: 0.33, m: 0.065, en: 'medium close-up (chest up)' },
  { id: 'pp', sigla: 'PP', nome: 'Primeiro plano', k: 0.225, m: 0.05, en: 'close-up (shoulders up)' },
  { id: 'close', sigla: 'CLOSE', nome: 'Close-up', k: 0.155, m: 0.02, en: 'tight close-up of the face' },
  { id: 'det', sigla: 'DET', nome: 'Detalhe (olhos)', k: 0.1, m: -0.035, en: 'extreme close-up of the eyes' },
];

export const DIRECOES = [
  ['Frontal', 0], ['3/4 esq.', -35], ['3/4 dir.', 35], ['Perfil esq.', -90], ['Perfil dir.', 90], ['3/4 costas', 145], ['Costas', 180],
];
export const ALTURAS = [
  ['Olhos', 0], ['Plongée', 35], ['Contra-plongée', -30], ['Zenital', 88], ['Chão', -8],
];

const rad = (g) => (g * Math.PI) / 180;
const grau = (r) => (r * 180) / Math.PI;

// Área do sensor realmente usada para a proporção escolhida (em mm), com lente anamórfica.
export function janela(sensor, proporcao, squeeze = 1) {
  const alvo = proporcao / squeeze; // proporção gravada no sensor antes de "desespremer"
  const aSensor = sensor.w / sensor.h;
  return alvo > aSensor ? { w: sensor.w, h: sensor.w / alvo } : { w: sensor.h * alvo, h: sensor.h };
}

export function optica(cam) {
  const sensor = SENSORES.find((s) => s.id === cam.sensor) || SENSORES[0];
  const j = janela(sensor, cam.proporcao, cam.anamorfica);
  const fovV = 2 * Math.atan(j.h / (2 * cam.focal));
  const fovH = 2 * Math.atan((j.w * cam.anamorfica) / (2 * cam.focal));
  const equivFF = (cam.focal * 36) / (j.w * cam.anamorfica);
  // profundidade de campo
  const f = cam.focal, N = cam.t, s = cam.foco * 1000;
  const c = Math.hypot(j.w, j.h) / 1500; // círculo de confusão
  const Hf = (f * f) / (N * c) + f;
  const perto = (s * (Hf - f)) / (Hf + s - 2 * f);
  const longe = s < Hf ? (s * (Hf - f)) / (Hf - s) : Infinity;
  // desfoque na tela: fração da largura = A * |d - s| / d
  const A = (f * f) / (N * Math.max(s - f, 1)) / j.w;
  return { sensor, janela: j, fovV: grau(fovV), fovH: grau(fovH), equivFF, perto: perto / 1000, longe: longe / 1000, hiperfocal: Hf / 1000, A };
}

export { rad, grau };
