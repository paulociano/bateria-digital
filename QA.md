# Release QA Matrix

Este documento define o gate manual de qualidade antes de considerar uma versão da Bateria Digital pronta para release.

## Status values

- `PASS`: comportamento observado corresponde ao contrato.
- `FAIL`: comportamento observado viola o contrato.
- `BLOCKED`: ambiente não permite concluir a verificação.
- `N/A`: cláusula não se aplica à plataforma.

## Browsers / devices

Executar, no mínimo:

| Surface | Browser | Viewport / device |
| --- | --- | --- |
| Desktop | Chrome atual | 1440 × 900 |
| Desktop | Firefox atual | 1440 × 900 |
| Desktop | Safari atual | macOS, viewport largo |
| Mobile | Safari | iPhone atual ou equivalente |
| Mobile | Chrome | Android atual ou equivalente |

## Core flow

### 1. Load

Expected:
- página abre sem tela quebrada;
- hero, transporte, pads, mixer e sequenciador aparecem;
- nenhum sample toca sozinho;
- status inicial é `Pronto`;
- layout não produz scroll horizontal inesperado.

Evidence:
- screenshot;
- console sem erro bloqueante;
- network sem 404 de assets essenciais.

### 2. Manual pad performance

Expected:
- Q/W/E/A/S/D/Z/X/C disparam o pad correspondente;
- clique/toque produz o mesmo som do atalho;
- pad ativo recebe feedback visual;
- último pad tocado vira o canal selecionado do mixer.

Anti-false-positive:
- variar pelo menos três pads;
- repetir rapidamente o mesmo pad para confirmar sobreposição.

### 3. Kit switching

Expected:
- `Original` e `Studio CC0` carregam;
- labels mudam conforme o kit;
- pattern/BPM/Swing/mixer são preservados;
- nenhum áudio antigo permanece tocando após troca de kit.

Edge case:
- troca de kit durante gravação deve ser bloqueada.

### 4. Sequencer

Expected:
- 16 steps aparecem;
- selecionar pad + clicar step adiciona o som;
- clicar de novo no mesmo step remove;
- outro pad substitui o som do step;
- Quick Pattern sincroniza com o grid;
- espaços/ponto/hífen viram pausas;
- playhead percorre os 16 steps;
- Stop interrompe;
- Clear limpa sem assumir o papel de Stop.

### 5. BPM / Swing

Expected:
- BPM respeita 70–180;
- Tap Tempo altera BPM de forma plausível;
- Swing 50% soa reto;
- valores maiores deslocam pares sem aumentar a duração total do compasso.

### 6. Mixer

Expected:
- volume afeta somente o pad selecionado;
- volume 0 silencia;
- Mute silencia;
- Solo deixa audíveis somente canais em Solo;
- Mute continua silenciando um canal mesmo quando ele também está em Solo.

### 7. Memory

Expected:
- working pattern persiste após reload;
- slots A/B/C/D salvam pattern + BPM;
- slot vazio não destrói o working pattern;
- slot salvo recarrega corretamente.

Persistence probe:
1. salvar slot;
2. recarregar a página;
3. carregar o slot;
4. comparar pattern/BPM.

### 8. Share

Expected:
- Compartilhar gera link com hash `#p=`;
- abrir o link em aba anônima restaura pattern, BPM, Swing, kit e mixer;
- estado do link vence o localStorage existente.

Invalid probe:
- hash inválido não deve quebrar a aplicação.

### 9. Record / export

Expected:
- Gravar muda estado visual para Finalizar;
- pads e sequencer continuam funcionando durante gravação;
- Finalizar gera arquivo reproduzível;
- export reflete mixer, mute/solo, kit e performance;
- navegador sem MediaRecorder recebe mensagem clara sem quebrar o restante.

### 10. Keyboard / accessibility

Expected:
- foco visível em controles interativos;
- ordem de Tab segue a leitura visual;
- Enter/Espaço ativam botões nativos;
- range controls funcionam por teclado;
- status de playback é anunciado por live region;
- reduced motion reduz animações;
- high contrast aumenta contraste de superfícies/controles.

### 11. Mobile

Expected:
- pads continuam grandes o bastante para toque;
- nenhuma ação crítica exige hover;
- sequencer 4-col não clipa;
- mixer contextual continua operável;
- utilidades e slots não ultrapassam viewport;
- gravação e Stop permanecem acessíveis durante playback.

## Release decision

Uma versão só pode ser considerada `release-ready` quando:

1. CI automatizado está verde;
2. deploy do GitHub Pages está verde;
3. nenhum item crítico dos fluxos 1–9 está em `FAIL`;
4. itens `BLOCKED` estão documentados e não são convertidos em `PASS` por inferência;
5. regressões visuais ou de acessibilidade relevantes têm issue ou correção antes do release.

## Current automation coverage

Automated:
- parsing de pattern;
- normalização;
- portable state encode/decode;
- contratos estruturais de markup;
- reduced motion;
- breakpoints principais;
- touch targets;
- font loading contract;
- high contrast hook.

Still manual:
- áudio real;
- MediaRecorder/export;
- timing perceptual de Swing;
- keyboard traversal completo;
- Safari/iOS;
- Android Chrome;
- visual clipping/overflow;
- Core Web Vitals/Lighthouse.
