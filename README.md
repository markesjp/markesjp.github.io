# João Pedro Marques — Portfólio

[Acessar o portfólio](https://markesjp.github.io)

Portfólio estático em português, com dark mode padrão, catálogo de projetos, estudos de caso, contato e currículo para impressão.

O layout usa margens fluidas de 16 a 64 px, sem teto fixo de largura para as seções. Os parágrafos mantêm uma medida de leitura limitada. Jogos enquadrados usam 12 px de margem lateral e preservam a proporção dos cenários.

## Projetos

BugHost (contribuição colaborativa), segmentação microscópica/TCC, LinguaFlow AI, NoirFlow e Gerenciador de Disco. Os projetos sem código público são apresentados por estudos de caso ou descrições locais; nenhum link de repositório é inventado.

## Área de jogos

Corrida de obstáculos, invasores espaciais e puzzle deslizante. Cada jogo é um módulo separado, importado sob demanda. Apenas o selecionado fica montado; a troca cancela animações e remove listeners. As partidas pausam quando a área sai de vista ou a aba é ocultada.

A corrida usa cenário de deserto em camadas, personagem articulado e efeitos de aterrissagem; invasores usa órbita planetária, naves e impactos; o puzzle reúne fragmentos de uma arte topográfica com deslocamento das peças. Cenários e controles acompanham o tema, inclusive quando a partida está pausada. Efeitos decorativos respeitam movimento reduzido; os jogos de canvas usam um único ciclo de animação e o puzzle anima somente a peça movida.

Links diretos: `?jogo=runner#arcade`, `?jogo=invaders#arcade` e `?jogo=puzzle#arcade`.

O botão **Enquadrar jogo** ajusta cenário, instruções e controles à altura disponível, inclusive no celular em modo horizontal. **Sair do enquadramento** ou **Esc** volta ao portfólio preservando a partida. A navegação por teclado fica dentro do jogo enquanto ele está enquadrado.

Ao iniciar, o jogo se alinha abaixo do cabeçalho; quando a altura é insuficiente, entra automaticamente no enquadramento. Em telas verticais, o painel acompanha a proporção do cenário, sem faixas vazias excessivas. Em telas horizontais baixas, cenário e controles ficam lado a lado e as instruções aparecem em **Como jogar**. O painel acompanha mudanças de tamanho, orientação e estado da partida.

O corredor é um pequeno robô de formas arredondadas, visor e passada curta e contínua; as naves animam asas e propulsores. A passada continua visível em movimento reduzido, em ritmo mais lento e sem balanço do tronco ou partículas. **Animações ligadas/reduzidas** permite escolher os efeitos e salva a preferência localmente. Sem escolha explícita, vale a preferência de movimento reduzido do sistema.

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
