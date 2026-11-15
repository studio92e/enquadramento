// Publica o Enquadramento na conta Cloudflare do estúdio.
// Uso (nesta pasta):  node publicar.mjs
// Passos: monta site/ → confere o login do wrangler → cria o KV na primeira vez → deploy →
// na primeira vez, sorteia a senha de acesso, grava como segredo e deixa uma cópia em .acesso.txt.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const TOML = path.join(AQUI, 'wrangler.toml');
const ACESSO = path.join(AQUI, '.acesso.txt');

function wrangler(args, { entrada, mostrar = true } = {}) {
  const r = spawnSync('npx', ['--yes', 'wrangler@4', ...args], { cwd: AQUI, shell: true, encoding: 'utf8', input: entrada, stdio: ['pipe', 'pipe', 'pipe'] });
  const saida = (r.stdout || '') + (r.stderr || '');
  if (mostrar) process.stdout.write(saida);
  return { ok: r.status === 0, saida };
}
function parar(msg) { console.error('\n' + msg); process.exit(1); }

console.log('1/5  Montando o site…');
await import('./montar.mjs');

console.log('\n2/5  Conferindo a conta Cloudflare…');
const quem = wrangler(['whoami'], { mostrar: false });
if (!quem.ok || /not authenticated|não autenticado/i.test(quem.saida)) parar('O wrangler não está ligado a nenhuma conta. Rode "npx wrangler login" nesta pasta, entre com a conta Cloudflare do estúdio e rode este script de novo.');
console.log(quem.saida.split('\n').filter((l) => /@|Account Name|│/.test(l)).slice(0, 8).join('\n'));

let toml = fs.readFileSync(TOML, 'utf8');
if (toml.includes('COLOCAR_ID_DO_KV')) {
  console.log('\n3/5  Criando o espaço de dados (KV)…');
  const kv = wrangler(['kv', 'namespace', 'create', 'enquadramento-dados']);
  const id = /"?id"?\s*[=:]\s*"([0-9a-f]{32})"/.exec(kv.saida);
  if (!kv.ok || !id) parar('Não consegui criar o KV. Veja a mensagem acima.');
  toml = toml.replace('COLOCAR_ID_DO_KV', id[1]);
  fs.writeFileSync(TOML, toml);
} else console.log('\n3/5  Espaço de dados (KV) já configurado.');

console.log('\n4/5  Publicando…');
if (!wrangler(['deploy']).ok) parar('A publicação falhou. Veja a mensagem acima. (Se o erro for do domínio, confira se studio91.com.br está nesta mesma conta Cloudflare.)');

if (!fs.existsSync(ACESSO)) {
  console.log('\n5/5  Criando a senha de acesso…');
  const senha = crypto.randomBytes(15).toString('base64url');
  if (!wrangler(['secret', 'put', 'SENHA_ACESSO'], { entrada: senha + '\n' }).ok) parar('Não consegui gravar a senha de acesso. Veja a mensagem acima.');
  fs.writeFileSync(ACESSO, senha + '\n');
  console.log('Senha de acesso gravada no servidor. A cópia está em publicar/.acesso.txt (não vai para o GitHub).');
} else console.log('\n5/5  Senha de acesso já criada (cópia em publicar/.acesso.txt).');

console.log('\nNo ar em https://enquadramento.studio91.com.br');
console.log('Para tirar do ar:  npx wrangler delete enquadramento   (o KV sai com: npx wrangler kv namespace delete --namespace-id <id do wrangler.toml>)');
