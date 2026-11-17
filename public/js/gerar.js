// Monta o prompt para o Magnific a partir da cena e conversa com o servidor local.

export const ESTILOS = [
  { id: 'cinema', nome: 'Cinema realista', en: 'Photorealistic live-action film still, cinematic color grade, natural skin texture, subtle film grain, believable production design.' },
  { id: 'noir', nome: 'Noir preto e branco', en: 'Black-and-white film noir still, deep blacks, crisp hard shadows, 1940s atmosphere, silver halide grain.' },
  { id: 'scifi', nome: 'Ficção científica', en: 'Photorealistic science-fiction film still, detailed futuristic production design, atmospheric haze, practical lights.' },
  { id: 'anim3d', nome: 'Animação 3D', en: 'Stylized 3D animated feature film frame, appealing character design, soft global illumination, rich materials.' },
  { id: 'anime', nome: 'Anime', en: 'Anime film frame, clean line art, cel shading, painted background, expressive lighting.' },
  { id: 'hq', nome: 'HQ / graphic novel', en: 'Graphic novel panel, bold inked lines, dramatic spot blacks, limited color palette.' },
  { id: 'storyboard', nome: 'Storyboard a lápis', en: 'Hand-drawn storyboard frame, loose pencil and gray marker, clear staging, no color.' },
  { id: 'concept', nome: 'Concept art', en: 'Painterly cinematic concept art, visible brushwork, strong shapes and atmosphere.' },
  { id: 'livre', nome: 'Sem estilo (só o prompt)', en: '' },
];

export const MODELOS = [
  { id: 'gemini', nome: 'Nano Banana (Gemini 2.5 Flash)', modo: 'edicao', nota: 'Rápido. Segue o quadro de referência e troca os bonecos pelo que você descrever.' },
  { id: 'gpt2', nome: 'GPT Image 2 (edição)', modo: 'edicao', nota: 'Mais fiel a texto e detalhe; mais lento. A qualidade muda o custo.' },
  { id: 'mystic', nome: 'Mystic (estrutura)', modo: 'estrutura', nota: 'Fotorrealismo do Magnific. Usa o quadro como estrutura; a força define o quanto segue a composição.' },
];

const lista = (itens) => itens.filter(Boolean).join(' ');

// r = resumo da cena (ver resumoCena em main.js)
export function montarPrompt(r, { texto, estilo, modo, tecnico, legivel }) {
  const est = ESTILOS.find((e) => e.id === estilo);
  const partes = [];
  const cena = (texto || '').trim();

  if (modo === 'edicao') {
    partes.push('Turn the attached 3D previs frame into a finished film still. Treat it as the exact blocking and camera reference: keep the same camera position, angle, lens perspective and framing, and keep every figure and object in the same place, at the same scale and in the same pose. Replace the plain colored mannequins and gray proxy shapes with fully rendered people, wardrobe, props and set. No mannequins, no flat untextured shapes, no grid lines, no text or labels in the final image. The reference image has priority: if any text below disagrees with what the image shows (sizes, positions, poses, how each figure is cropped), follow the image. Each person must keep exactly the orientation toward the camera that their mannequin has (facing it, in profile, or with the back to it): never turn someone to face the camera if the mannequin is seen from the side or from behind, and never reveal a face or a head that is hidden or cut off in the reference. On each mannequin the lighter chest panel and the nose mark the front; the dark stripe down the spine and the dark cap on the back of the head mark the back.'
      + (legivel ? ' The reference frame was rendered with lifted shadows so every shape stays readable; light the final image as described under Lighting, not flat like the reference.' : ''));
  }
  if (cena) partes.push(`Scene: ${cena}`);

  const pers = r.personagens.filter((p) => p.noQuadro);
  if (pers.length) {
    const linhas = pers.map((p) => {
      const quem = p.descricao ? p.descricao : 'a person fitting the scene';
      const como = [p.escala, p.virado, p.olha, p.pose].filter(Boolean).join('; ');
      return modo === 'edicao'
        ? `the ${p.cor} mannequin (${p.posicao} of frame, ${como}) is ${quem}`
        : `${quem}, on the ${p.posicao} of frame, ${como}`;
    });
    partes.push((modo === 'edicao' ? 'Characters: ' : 'Characters: ') + linhas.join('; ') + '.');
  }
  const elems = r.elementos.filter((e) => e.descricao && e.noQuadro);
  if (elems.length) partes.push('Set and props: ' + elems.map((e) => (modo === 'edicao' ? `the ${e.forma} proxy (${e.posicao} of frame) is ${e.descricao}` : e.descricao)).join('; ') + '.');

  if (tecnico) {
    const c = r.cam;
    partes.push(lista([
      'Cinematography:',
      `${c.plano}${c.alvo ? '' : ''},`,
      `${c.angulo},`,
      c.holandes ? `dutch angle tilted ${c.holandes}°,` : '',
      `shot on ${c.sensor} with a ${c.focal}mm ${c.anamorfica > 1 ? `anamorphic (${c.anamorfica}x squeeze, oval bokeh, horizontal flares)` : 'spherical'} lens at T${c.t},`,
      `${c.pdc},`,
      c.suporte ? `${c.suporte},` : '',
      `${c.proporcao} aspect ratio.`,
    ]));
    const luz = [];
    if (r.esquema) luz.push(r.esquema + '.');
    for (const l of r.luzes) luz.push(`${l.papel}: ${l.dureza} ${l.cor} light from ${l.direcao}${l.forca ? ', ' + l.forca : ''}.`);
    luz.push(r.ambiente);
    if (r.neblina) luz.push(r.neblina);
    partes.push('Lighting: ' + luz.join(' '));
  }
  if (est && est.en) partes.push('Style: ' + est.en);
  return partes.join('\n\n');
}

const CHAVE_ACESSO = 'enquadramento.acesso';
export const acesso = {
  ler() { try { return localStorage.getItem(CHAVE_ACESSO) || ''; } catch { return ''; } },
  guardar(v) { try { v ? localStorage.setItem(CHAVE_ACESSO, v) : localStorage.removeItem(CHAVE_ACESSO); } catch {} },
};

async function pedir(url, opcoes = {}) {
  const senha = acesso.ler();
  if (senha) opcoes = { ...opcoes, headers: { ...(opcoes.headers || {}), 'x-acesso': senha } };
  const r = await fetch(url, opcoes);
  let j = {};
  try { j = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error(j.erro || `Erro ${r.status}`), { status: r.status, codigo: j.codigo });
  return j;
}

export const api = {
  config: () => pedir('api/config'),
  salvarChave: (chave) => pedir('api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave }) }),
  historico: () => pedir('api/historico'),
  melhorar: (texto) => pedir('api/melhorar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto, idioma: 'pt' }) }),
  // Gerar tem dois tempos: enviar (o Magnific aceita o pedido) e acompanhar até a imagem chegar.
  // O lote usa os dois separados para saber em qual deles um pedido parou.
  enviar: async (dados) => (await pedir('api/gerar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })).id,
  async acompanhar(id, aoAndar) {
    const inicio = Date.now();
    let tropecos = 0;
    for (;;) {
      await new Promise((ok) => setTimeout(ok, 2500));
      const seg = Math.round((Date.now() - inicio) / 1000);
      let t;
      try { t = await pedir('api/tarefa/' + id); tropecos = 0; }
      catch (e) {
        // queda de conexão ou erro passageiro do servidor: o pedido já saiu, então insiste antes de desistir da imagem
        if ((e.status && e.status < 500) || ++tropecos >= 5 || seg > 420) throw e;
        continue;
      }
      if (t.status === 'COMPLETED') return t.item;
      if (t.status === 'FAILED') throw new Error(t.erro || 'A geração falhou.');
      aoAndar && aoAndar(seg);
      if (seg > 420) throw new Error('O Magnific demorou mais de 7 minutos. Tente de novo.');
    }
  },
  async gerar(dados, aoAndar) { return api.acompanhar(await api.enviar(dados), aoAndar); },
};
