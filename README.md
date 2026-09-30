# João Pedro Marques — Portfólio

[Acessar o portfólio](https://markesjp.github.io)

Portfólio estático em português, com dark mode padrão, catálogo de projetos, estudos de caso, contato e currículo para impressão.

## Projetos

BugHost (contribuição colaborativa), segmentação microscópica/TCC, LinguaFlow AI, NoirFlow e Gerenciador de Disco. Os projetos sem código público são apresentados por estudos de caso ou descrições locais; nenhum link de repositório é inventado.

## Área de jogos

Corrida de obstáculos, invasores espaciais e puzzle deslizante. Cada jogo é um módulo separado, importado sob demanda. Apenas o selecionado fica montado; a troca cancela animações e remove listeners. As partidas pausam quando a área sai de vista ou a aba é ocultada.

Links diretos: `?jogo=runner#arcade`, `?jogo=invaders#arcade` e `?jogo=puzzle#arcade`.

## Desenvolvimento

Requer Node.js. Execute `node preview.mjs` e abra http://127.0.0.1:4173. Arquivos HTML, CSS, JavaScript e SVG são servidos sem etapa de build.

- `index.html` e `styles.css`: apresentação e layout responsivo.
- `theme.js`: preferência de tema local.
- `navigation.js`: navegação contextual e transições respeitando movimento reduzido.
- `projetos/`: estudos de caso.
- `games/`: módulos independentes dos jogos.
- `curriculo.html`: currículo com impressão e exportação pelo navegador.

A publicação é feita pelo GitHub Pages a partir da branch `main`. Os ícones vetoriais Lucide têm origem registrada e licença em `assets/`.
