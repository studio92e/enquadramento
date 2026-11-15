// Elementos de cena (cenografia simples). Origem sempre no chão, no centro.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const CATALOGO = [
  { id: 'cubo', nome: 'Caixa', en: 'box' },
  { id: 'cilindro', nome: 'Cilindro', en: 'cylinder' },
  { id: 'esfera', nome: 'Esfera', en: 'sphere' },
  { id: 'parede', nome: 'Parede', en: 'wall' },
  { id: 'paredeJanela', nome: 'Parede c/ janela', en: 'wall with a window' },
  { id: 'paredePorta', nome: 'Parede c/ vão', en: 'wall with a doorway' },
  { id: 'porta', nome: 'Porta', en: 'door' },
  { id: 'mesa', nome: 'Mesa', en: 'table' },
  { id: 'mesaRedonda', nome: 'Mesa redonda', en: 'round table' },
  { id: 'cadeira', nome: 'Cadeira', en: 'chair' },
  { id: 'poltrona', nome: 'Poltrona', en: 'armchair' },
  { id: 'sofa', nome: 'Sofá', en: 'sofa' },
  { id: 'cama', nome: 'Cama', en: 'bed' },
  { id: 'balcao', nome: 'Balcão', en: 'counter' },
  { id: 'degraus', nome: 'Degraus', en: 'steps' },
  { id: 'carro', nome: 'Carro', en: 'car' },
  { id: 'arvore', nome: 'Árvore', en: 'tree' },
  { id: 'poste', nome: 'Poste', en: 'street lamp' },
  { id: 'fundo', nome: 'Fundo / painel', en: 'backdrop' },
  { id: 'tapete', nome: 'Tapete', en: 'rug' },
];

export const NOME_EN = Object.fromEntries(CATALOGO.map((c) => [c.id, c.en]));
NOME_EN.imagem = 'flat image card'; NOME_EN.modelo = '3D object';

export function criarElemento(forma, { cor = '#8d8a84', src } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.82 });
  const escuro = new THREE.MeshStandardMaterial({ color: 0x232428, roughness: 0.6 });
  g.userData.mat = mat;
  const m = (geo, material = mat) => { const o = new THREE.Mesh(geo, material); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  const cx = (w, h, d, x = 0, y = 0, z = 0, material) => { const o = m(new THREE.BoxGeometry(w, h, d), material); o.position.set(x, y + h / 2, z); return o; };
  const cil = (r, h, x = 0, y = 0, z = 0, material, r2 = r) => { const o = m(new THREE.CylinderGeometry(r2, r, h, 28), material); o.position.set(x, y + h / 2, z); return o; };

  switch (forma) {
    case 'cubo': cx(1, 1, 1); break;
    case 'cilindro': cil(0.4, 1); break;
    case 'esfera': m(new THREE.SphereGeometry(0.5, 32, 20)).position.y = 0.5; break;
    case 'parede': cx(4, 2.8, 0.12); break;
    case 'paredeJanela':
      cx(1.3, 2.8, 0.12, -1.35); cx(1.3, 2.8, 0.12, 1.35); cx(1.4, 0.9, 0.12, 0, 0); cx(1.4, 0.7, 0.12, 0, 2.1);
      cx(1.4, 0.04, 0.05, 0, 1.48, 0, escuro); cx(0.04, 1.2, 0.05, 0, 0.9, 0, escuro);
      break;
    case 'paredePorta': cx(1.55, 2.8, 0.12, -1.225); cx(1.55, 2.8, 0.12, 1.225); cx(0.9, 0.7, 0.12, 0, 2.1); break;
    case 'porta': {
      cx(0.06, 2.12, 0.1, -0.46); cx(0.06, 2.12, 0.1, 0.46); cx(0.98, 0.06, 0.1, 0, 2.1);
      const folha = cx(0.86, 2.08, 0.045, 0, 0, 0);
      folha.geometry.translate(0.43, 0, 0); folha.position.x = -0.43; folha.rotation.y = -0.5;
      const macaneta = cx(0.1, 0.03, 0.09, 0, 1.0, 0, escuro); folha.add(macaneta); macaneta.position.set(0.76, 0, 0);
      break;
    }
    case 'mesa':
      cx(1.6, 0.05, 0.8, 0, 0.72);
      for (const [x, z] of [[-0.72, -0.32], [0.72, -0.32], [-0.72, 0.32], [0.72, 0.32]]) cx(0.06, 0.72, 0.06, x, 0, z);
      break;
    case 'mesaRedonda': cil(0.5, 0.04, 0, 0.71); cil(0.05, 0.71); cil(0.28, 0.03); break;
    case 'cadeira':
      cx(0.44, 0.05, 0.44, 0, 0.43); cx(0.44, 0.48, 0.04, 0, 0.48, -0.2);
      for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) cx(0.04, 0.43, 0.04, x, 0, z);
      break;
    case 'poltrona': cx(0.9, 0.42, 0.85); cx(0.9, 0.5, 0.2, 0, 0.42, -0.325); cx(0.16, 0.22, 0.85, -0.37, 0.42); cx(0.16, 0.22, 0.85, 0.37, 0.42); break;
    case 'sofa': cx(2.1, 0.42, 0.9); cx(2.1, 0.48, 0.2, 0, 0.42, -0.35); cx(0.18, 0.22, 0.9, -0.96, 0.42); cx(0.18, 0.22, 0.9, 0.96, 0.42); break;
    case 'cama': cx(1.6, 0.5, 2.0); cx(1.66, 1.0, 0.08, 0, 0, -1.02); cx(0.62, 0.1, 0.38, -0.38, 0.5, -0.72); cx(0.62, 0.1, 0.38, 0.38, 0.5, -0.72); break;
    case 'balcao': cx(2.2, 1.0, 0.6); cx(2.3, 0.05, 0.7, 0, 1.0); break;
    case 'degraus': for (let i = 0; i < 4; i++) cx(1.4, 0.18 * (i + 1), 0.3, 0, 0, -i * 0.3); break;
    case 'carro': {
      cx(1.8, 0.55, 4.4, 0, 0.3); cx(1.6, 0.55, 2.2, 0, 0.85, -0.2);
      for (const [x, z] of [[-0.86, 1.4], [0.86, 1.4], [-0.86, -1.4], [0.86, -1.4]]) {
        const r = m(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 24), escuro); r.rotation.z = Math.PI / 2; r.position.set(x, 0.33, z);
      }
      break;
    }
    case 'arvore': {
      cil(0.16, 2.3, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.9 }), 0.11);
      const copa = m(new THREE.IcosahedronGeometry(1.35, 1)); copa.position.y = 3.2; copa.scale.set(1, 0.9, 1);
      break;
    }
    case 'poste': {
      cil(0.07, 4.4, 0, 0, 0, undefined, 0.05); cx(0.9, 0.06, 0.06, 0.42, 4.36);
      cx(0.36, 0.08, 0.16, 0.78, 4.26, 0, new THREE.MeshStandardMaterial({ color: 0xfff1cc, emissive: 0xffe2a0, emissiveIntensity: 2 }));
      break;
    }
    case 'fundo': { const p = cx(8, 4.5, 0.04); p.castShadow = false; break; }
    case 'tapete': { const t = cx(2, 0.015, 3); t.castShadow = false; break; }
    case 'imagem': {
      const p = m(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide, alphaTest: 0.35, transparent: false }));
      p.position.y = 1; p.scale.set(2, 2, 1); p.castShadow = true;
      if (src) new THREE.TextureLoader().load(src, (tx) => {
        tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
        p.material.map = tx; p.material.needsUpdate = true;
        p.scale.set((2 * tx.image.width) / tx.image.height, 2, 1);
      });
      g.userData.semCor = true;
      break;
    }
    case 'modelo': {
      g.userData.semCor = true;
      if (src) new GLTFLoader().load(src, (gltf) => {
        const o = gltf.scene;
        o.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
        const box = new THREE.Box3().setFromObject(o), tam = box.getSize(new THREE.Vector3());
        const maior = Math.max(tam.x, tam.y, tam.z) || 1;
        if (maior > 30 || maior < 0.05) o.scale.setScalar(1.7 / maior);
        const b2 = new THREE.Box3().setFromObject(o), c = b2.getCenter(new THREE.Vector3());
        o.position.x -= c.x; o.position.z -= c.z; o.position.y -= b2.min.y;
        g.add(o);
      });
      break;
    }
    default: cx(1, 1, 1);
  }
  return g;
}
