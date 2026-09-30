# João Pedro Marques — Portfólio

[Acessar o portfólio](https://markesjp.github.io)

Portfólio estático em português, com dark mode padrão, catálogo de projetos, estudos de caso, contato e currículo para impressão.

## Projetos

BugHost (contribuição colaborativa), segmentação microscópica/TCC, LinguaFlow AI, NoirFlow e Gerenciador de Disco. Os projetos sem código público são apresentados por estudos de caso ou descrições locais; nenhum link de repositório é inventado.

## Área de jogos

Corrida de obstáculos, invasores espaciais e puzzle deslizante. Cada jogo é um módulo separado, importado sob demanda. Apenas o selecionado fica montado; a troca cancela animações e remove listeners. As partidas pausam quando a área sai de vista ou a aba é ocultada.

A corrida usa cenário de deserto em camadas, personagem articulado e efeitos de aterrissagem; invasores usa órbita planetária, naves e impactos; o puzzle reúne fragmentos de uma arte topográfica com deslocamento das peças. Cenários e controles acompanham o tema, inclusive quando a partida está pausada. Efeitos decorativos respeitam movimento reduzido; os jogos de canvas usam um único ciclo de animação e o puzzle anima somente a peça movida.

Links diretos: `?jogo=runner#arcade`, `?jogo=invaders#arcade` e `?jogo=puzzle#arcade`.

## Desenvolvimento

Requer Node.js. Execute `node preview.mjs` e abra http://127.0.0.1:4173. Arquivos HTML, CSS, JavaScript e SVG são servidos sem etapa de build.

- `index.html` e `styles.css`: apresentação e layout responsivo.
- `theme.js`: preferência de tema local.
- `technologies.css` e `assets/technology-icons.svg`: stack com ícones vetoriais individuais e nomes acessíveis.
- `navigation.js`: navegação contextual e transições respeitando movimento reduzido.
- `projetos/`: estudos de caso.
- `games/`: módulos independentes dos jogos.
- `curriculo.html`: currículo com impressão e exportação pelo navegador.

A publicação é feita pelo GitHub Pages a partir da branch `main`. Os ícones vetoriais Lucide têm origem registrada e licença em `assets/`.

Os símbolos das tecnologias são distribuídos localmente: Simple Icons (CC0) e Devicon (MIT), com fontes e licenças em `assets/technologies/`. Azure OpenAI e PgBouncer preservam os SVGs dos fornecedores. pgvector usa um pictograma funcional de rede vetorial Lucide, pois o projeto não disponibiliza uma marca própria; esse pictograma não representa um logotipo oficial.
