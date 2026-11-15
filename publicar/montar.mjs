// Monta a pasta site/ que vai para o ar: copia public/ e leva do three.js só os arquivos que o app importa.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const PUB = path.join(RAIZ, 'public');
const THREE = path.join(RAIZ, 'node_modules', 'three');
const SITE = process.argv[2] ? path.resolve(process.argv[2]) : path.join(AQUI, 'site');

if (!fs.existsSync(THREE)) { console.error('Falta o three.js. Rode "npm install" na pasta do Enquadramento.'); process.exit(1); }

fs.rmSync(SITE, { recursive: true, force: true });
fs.cpSync(PUB, SITE, { recursive: true });
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');

// segue os imports a partir dos arquivos do app
const IMPORT = /(?:from\s*|import\s*)['"]([^'"]+)['"]/g;
const feitos = new Set();
function levar(relativo) { // caminho dentro de node_modules/three
  const rel = relativo.replace(/\\/g, '/');
  if (feitos.has(rel)) return;
  feitos.add(rel);
  const origem = path.join(THREE, rel);
  if (!fs.existsSync(origem)) throw new Error('Não achei no three.js: ' + rel);
  const destino = path.join(SITE, 'vendor', 'three', rel);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(origem, destino);
  seguir(fs.readFileSync(origem, 'utf8'), rel);
}
function seguir(codigo, deRel) {
  for (const m of codigo.matchAll(IMPORT)) {
    const alvo = m[1];
    if (alvo === 'three') levar('build/three.module.js');
    else if (alvo.startsWith('three/addons/')) levar('examples/jsm/' + alvo.slice('three/addons/'.length));
    else if (alvo.startsWith('.') && deRel) levar(path.posix.join(path.posix.dirname(deRel), alvo));
  }
}
for (const arq of fs.readdirSync(path.join(PUB, 'js'))) if (arq.endsWith('.js')) seguir(fs.readFileSync(path.join(PUB, 'js', arq), 'utf8'), null);

const tamanho = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? tamanho(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);
console.log(`${path.relative(RAIZ, SITE)}/ montado: ${feitos.size} arquivos do three.js, ${(tamanho(SITE) / 1048576).toFixed(1)} MB no total.`);
