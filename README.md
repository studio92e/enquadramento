# Enquadramento

Simulador de enquadramento de cinema que roda no navegador. Você coloca bonecos e elementos numa cena 3D, escolhe câmera, lente e luz, e vê o quadro como a câmera veria. Depois dá para descrever a cena e gerar a imagem final pelo Magnific, usando o quadro como referência.

**Abrir no navegador (computador ou celular):** https://studio92e.github.io/enquadramento/

A versão publicada no GitHub Pages tem tudo menos a geração de imagem, que depende de um servidor com a chave do Magnific.

## O que tem

- Personagens (homem, mulher, criança) com 18 poses e juntas ajustáveis.
- 20 elementos de cenário, mais imagem e modelo 3D (.glb) importados.
- Câmera com 15 sensores, 10 proporções, lentes de 12 a 200 mm, anamórfica, abertura e foco com desfoque.
- Enquadramento automático por tamanho de plano, direção e altura; sobre o ombro, subjetiva e holandês.
- 14 esquemas de luz e luzes avulsas (refletor, softbox, lâmpada, sol).
- Planos salvos, desfazer, salvar e abrir cena em arquivo.
- No celular: um dedo faz pan e tilt, dois dedos aproximam e deslocam.

## Rodar no computador (com geração de imagem)

Precisa do [Node.js](https://nodejs.org) 22.15 ou mais novo (por causa da opção `--use-system-ca`).

```
npm install
npm start
```

Abra http://localhost:4747. O `npm start` liga o Node com `--use-system-ca` (certificados do Windows): sem isso, em máquina com antivírus que inspeciona HTTPS, parte das chamadas ao Magnific falha com "fetch failed". No Windows, o `Abrir Enquadramento.bat` faz os dois passos finais (ligar o servidor e abrir o Chrome).

Para gerar imagem, clique em **Magnific** no topo e cole a chave da API. Ela fica no arquivo `.env` desta pasta, que não vai para o GitHub. Cada geração gasta créditos da conta.

## Pastas

| Onde | O que é |
|---|---|
| `public/` | O app (HTML, CSS e JavaScript). |
| `server.js` | Servidor local: entrega o app e faz a ponte com o Magnific. |
| `docs/` | Cópia montada do app que o GitHub Pages publica. Não edite à mão. |
| `publicar/` | Versão com servidor para o Cloudflare (com senha de acesso) e o montador do site. |

## Atualizar o site publicado

Depois de mexer em `public/`:

```
npm run docs
```

Envie a pasta `docs/` junto com a mudança. O GitHub Pages atualiza em um ou dois minutos.

## Publicar com geração de imagem (Cloudflare)

Em `publicar/`: `npx wrangler login` e depois `node publicar.mjs`. O script cria o espaço de dados, publica o Worker em `enquadramento.studio91.com.br` e sorteia a senha de acesso (fica em `publicar/.acesso.txt`). Este caminho ainda não foi rodado contra a conta.
