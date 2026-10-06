# Bateria Digital — Design Contract

## Visual thesis

Bateria Digital deve parecer primeiro um **instrumento musical digital**, não uma landing page com uma drum machine dentro.

A interface combina densidade de hardware de estúdio com acabamento contemporâneo de software criativo. O usuário deve conseguir entender a hierarquia em segundos: tocar pads, selecionar som, editar 16 passos, controlar transporte e BPM.

## Público e tarefa principal

Público: pessoas que querem experimentar ritmos rapidamente no navegador, sem configuração.

Tarefa principal:
1. tocar um pad;
2. selecionar um som;
3. montar um pattern;
4. tocar/loopar e ajustar BPM.

## Dials

- **Densidade:** média-alta no instrumento, baixa no hero.
- **Eixo dominante:** vertical até o instrumento; dentro dele, pads e sequenciador formam duas zonas.
- **Hardware vs software:** 60/40. Controles devem parecer táteis sem imitar hardware realista.
- **Expressividade:** concentrada nos pads e playhead, não no background.

## Palette logic

- Fundo: preto-azulado profundo.
- Superfícies: grafite frio em camadas discretas.
- Texto: branco frio + cinzas azulados.
- Acento principal: coral para estados ativos e energia.
- Acento secundário: azul elétrico para tecnologia/status.
- Cores dos pads: funcionais, persistentes e reutilizadas nos steps.

## Type roles

- Manrope: títulos, labels principais, ações.
- DM Mono: status, metadados, índices, BPM, instruções compactas.

## Layout grammar

- Largura máxima: 1240px.
- Hero editorial compacto.
- Instrumento como bloco dominante.
- Cabeçalho do instrumento → transporte → corpo.
- Corpo em duas zonas no desktop: pads / sequenciador.
- Em tablet/mobile, empilhar mantendo transporte no topo.

## Radius / depth

- Instrumento: 30px desktop, 22px mobile.
- Painéis internos: 10–15px.
- Profundidade: bordas translúcidas + sombras largas; evitar glassmorphism forte.
- Pads: profundidade tátil curta, sem skeuomorfismo excessivo.

## Motion stance

Motion deve informar estado:
- pad pressionado;
- pad selecionado;
- playhead do step;
- status de reprodução.

Evitar motion decorativo contínuo. Respeitar `prefers-reduced-motion`.

## Signature elements

- marca PH em módulo quadrado;
- hero de duas linhas com segunda linha em cinza;
- instrumento BD—16;
- pads coloridos escuros com LED inferior;
- grupos visuais de 4 passos;
- status compacto com indicador luminoso.

## Anti-patterns

- hero ocupando mais atenção que o instrumento;
- excesso de glow;
- texto menor que 7px;
- controles importantes com contraste fraco;
- cores dos pads usadas apenas por decoração;
- adicionar features novas durante mudanças puramente visuais;
- quebrar IDs/hooks usados pelo JavaScript.


## Product controls

- Memória A/B/C/D vive entre transporte e corpo do instrumento.
- Slot ativo usa o acento coral; slot com conteúdo recebe indicador discreto verde.
- Salvar é explícito. Trocar para slot vazio não deve apagar o pattern atual.
- Demo e Tap Tempo são utilidades secundárias e não competem visualmente com Play/Stop.
- Persistência é local e silenciosa; feedback de salvar/carregar aparece no status do instrumento.
