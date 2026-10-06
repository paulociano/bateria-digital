# 🥁 Bateria Digital

Uma bateria digital interativa que roda diretamente no navegador.

Toque pelos pads da interface ou pelo teclado, combine sons em sequências e ajuste o BPM para criar pequenas batidas sem instalar nada.

## Sobre o projeto

A Bateria Digital é um experimento web de interação musical desenvolvido com HTML, CSS e JavaScript puro.

A interface funciona como uma pequena drum machine com 9 pads associados às teclas:

```text
Q W E
A S D
Z X C
```

Cada tecla dispara um sample de áudio correspondente.

Além da execução livre, o projeto possui um sequenciador simples no qual é possível escrever combinações como:

```text
qwe asd zxc
```

e reproduzi-las automaticamente de acordo com o BPM selecionado.

## Funcionalidades

- 9 pads de bateria interativos
- execução por clique ou teclado
- samples de áudio individuais
- sequenciador visual de 16 passos com edição direta
- sequenciador textual sincronizado como atalho
- controle de velocidade entre 70 e 180 BPM
- feedback visual ao pressionar cada pad
- feedback de progresso durante a reprodução da sequência
- engine baseada em Web Audio API, com fallback para HTMLAudio
- indicação de estado durante a reprodução
- controles separados para loop, interrupção e limpeza da sequência
- persistência local automática do pattern e BPM
- quatro slots locais de memória (A/B/C/D)
- Tap Tempo
- groove demo carregável
- Swing entre 50% e 75%
- volume individual por pad
- Mute e Solo por pad
- dois kits: Original e Studio CC0
- labels instrumentais reais no kit Studio CC0
- compartilhamento de pattern por URL
- gravação/exportação do master de áudio
- layout responsivo
- suporte a `prefers-reduced-motion`

## Como tocar

Você pode tocar de duas formas.

### Pelo teclado

Use:

| Pad | Tecla |
| --- | --- |
| 01 | Q |
| 02 | W |
| 03 | E |
| 04 | A |
| 05 | S |
| 06 | D |
| 07 | Z |
| 08 | X |
| 09 | C |

Cada tecla reproduz imediatamente o sample associado ao pad.

### Pelos pads

Clique ou toque diretamente em qualquer um dos nove pads da interface.

O pad recebe feedback visual enquanto o som é disparado. Durante uma sequência, o status também informa o passo atual.

## Sequenciador

O sequenciador principal possui **16 passos editáveis**. Selecione um dos nove pads e clique em qualquer passo para inserir ou substituir aquele som. Clicar novamente em um passo que já contém o som selecionado remove o evento.

O campo **Sequenciador rápido** permanece disponível como atalho textual e fica sincronizado com o grid.

Exemplo:

```text
qwe asd zxc
```

Caracteres que não correspondem aos pads são ignorados. Espaço, ponto (`.`) e hífen (`-`) representam pausas reais entre os sons.

Ao editar o texto, os primeiros 16 passos do grid são atualizados. Ao editar o grid, o texto é reescrito usando a tecla de cada pad e hífen para pausas. O controle **Loop** repete a sequência, **Parar** interrompe sem apagar o texto e **Limpar** remove apenas o conteúdo do sequenciador.

## Memória de patterns

O estado de trabalho atual é salvo automaticamente no `localStorage`, incluindo pattern e BPM. A interface também oferece quatro slots locais, **A/B/C/D**:

- selecione um slot para torná-lo ativo;
- clique em **Salvar** para gravar pattern e BPM naquele slot;
- slots já gravados podem ser carregados com um clique;
- os dados ficam somente no navegador atual.

O botão **Demo** carrega um groove de exemplo sem sobrescrever nenhum slot até que o usuário salve explicitamente.

## Tap Tempo

O botão **Tap Tempo** calcula o BPM a partir do intervalo entre os últimos toques. Após uma pausa longa, a medição reinicia para evitar que um tap antigo distorça o valor.

## Swing

O controle de **Swing** trabalha entre 50% e 75%. Em 50%, as semicolcheias ficam retas. Valores maiores atrasam os passos pares de cada par rítmico, criando um groove progressivamente mais deslocado; em torno de 66% o feel se aproxima de uma subdivisão ternária.

## Mixer por pad

O pad selecionado também define o canal exibido no mixer. Cada um dos nove pads mantém estado próprio de:

- volume de 0% a 100%;
- **Mute**;
- **Solo**.

Quando existe pelo menos um canal em Solo, somente os canais marcados como Solo permanecem audíveis. Mute sempre silencia o canal. Esses estados são persistidos localmente junto do pattern de trabalho.

## Controle de BPM

O controle de velocidade permite escolher valores entre:

```text
70 BPM → 180 BPM
```

O tempo selecionado altera o intervalo entre os sons reproduzidos pelo sequenciador.

O grid de 16 passos usa subdivisões de semicolcheia, formando um compasso 4/4 completo:

```javascript
60000 / BPM / 4
```

Assim, 16 passos correspondem a quatro tempos, e valores maiores de BPM produzem patterns mais rápidos.

## Arquitetura

O projeto é propositalmente simples e não utiliza frameworks ou processo de build.

```text
bateria-digital/
├── index.html
├── css/
│   └── main.css
├── js/
│   ├── audio-engine.js
│   └── main.js
├── music/
│   ├── keyq.wav
│   ├── keyw.wav
│   ├── keye.wav
│   ├── keya.wav
│   ├── keys.wav
│   ├── keyd.wav
│   ├── keyz.wav
│   ├── keyx.wav
│   └── keyc.wav
└── images/
```

### `index.html`

Define a interface da drum machine, incluindo:

- apresentação do projeto;
- controles de BPM;
- nove pads;
- sequenciador;
- elementos de áudio;
- status de reprodução.

### `js/audio-engine.js`

Encapsula o carregamento e a reprodução dos samples com Web Audio API, mantendo suporte a fontes simultâneas.

### `js/main.js`

Concentra o comportamento da aplicação:

- captura de eventos do teclado;
- execução dos samples;
- interação com os pads;
- edição e sincronização do grid de 16 passos;
- leitura do sequenciador textual;
- seleção de pad para edição;
- controle de BPM;
- agendamento da sequência;
- cancelamento dos timers;
- atualização do estado visual;
- persistência local e slots de pattern;
- cálculo de Tap Tempo;
- aplicação de Swing no scheduler;
- estado de mixer por pad com volume, Mute e Solo.

### `css/main.css`

Responsável pela identidade visual e responsividade.

A interface segue a direção **performance instrument** documentada em `DESIGN.md`, combinando linguagem de hardware musical com UI contemporânea. Principais elementos:

- pads coloridos;
- painel central semelhante a uma drum machine;
- tipografia Manrope e DM Mono;
- feedback visual ao tocar;
- iluminação ambiente contida;
- hierarquia clara entre transporte, pads e sequenciador;
- agrupamento visual dos 16 passos em blocos de quatro;
- layout adaptado para desktop e mobile.

## Fluxo de execução

Quando uma tecla válida é pressionada:

```text
Teclado / clique
      ↓
Identificação do pad
      ↓
playSound()
      ↓
Sample de áudio
      ↓
Feedback visual do pad
```

No modo sequenciador:

```text
Grid de 16 passos / texto sincronizado
      ↓
Pattern normalizado
      ↓
Cálculo do intervalo pelo BPM
      ↓
Agendamento dos samples
      ↓
Reprodução da sequência
```

## Executando localmente

Como o projeto não possui dependências nem build, basta clonar o repositório:

```bash
git clone https://github.com/paulociano/bateria-digital.git
cd bateria-digital
```

Depois, abra `index.html` no navegador.

Para evitar limitações de alguns navegadores com arquivos locais, também é possível usar um servidor HTTP simples:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Tecnologias

- HTML5
- CSS3
- JavaScript
- Web Audio API
- HTML Audio como fallback
- Google Fonts

Nenhuma biblioteca ou framework JavaScript é necessário.

## Responsividade

A interface possui adaptações específicas para telas menores.

Em dispositivos móveis:

- o layout passa de duas colunas para uma;
- a drum machine ocupa a largura disponível;
- o compositor reorganiza seus controles;
- pads e tipografia são redimensionados.

## Acessibilidade

O projeto inclui alguns cuidados de acessibilidade, como:

- elementos semânticos;
- `aria-label` nos controles principais;
- `aria-live` para informar o estado e o progresso da reprodução;
- estados de foco visíveis nos controles interativos;
- suporte a `prefers-reduced-motion`;
- rótulos acessíveis para identificar cada pad e sua tecla.

## Ideia central

A proposta é transformar o teclado do computador em um instrumento musical extremamente simples:

**pressione uma tecla, ouça um som, combine padrões e encontre um groove.**

Sem cadastro, sem dependências e sem configuração.

---

Desenvolvido por **Paulo Henrique**.



## Kits de bateria

A Bateria Digital possui dois kits:

### Original

Preserva os nove WAVs históricos do projeto. Como o repositório original não documentava a identidade instrumental de cada arquivo, seus rótulos permanecem neutros como **Sample 01–09**.

### Studio CC0

Kit adicional com nove one-shots CC0 importados do projeto open source Groovie:

| Tecla | Instrumento |
| --- | --- |
| Q | Kick |
| W | Snare |
| E | Closed Hat |
| A | Clap |
| S | Low Tom |
| D | Mid Tom |
| Z | High Tom |
| X | Open Hat |
| C | Crash |

A origem e o licenciamento dos arquivos estão documentados em `THIRD_PARTY_SAMPLES.md`.


## Compartilhamento

O botão **Compartilhar** serializa o estado de trabalho atual no hash da URL. O link inclui:

- pattern de 16 passos;
- BPM;
- Swing;
- kit ativo;
- volume, Mute e Solo dos nove pads.

Nenhum dado é enviado para servidor. Ao abrir um link compartilhado, o estado codificado na URL tem precedência sobre o estado local salvo naquele navegador.

## Gravação e exportação

O botão **Gravar** captura o master da Web Audio engine usando `MediaRecorder`. Enquanto a gravação está ativa, pads e playback continuam funcionando normalmente. Ao finalizar, o navegador gera um arquivo de áudio no melhor formato suportado, priorizando Opus/WebM e Opus/Ogg.

A gravação depende de Web Audio + MediaRecorder. Em navegadores sem esse suporte, o restante da drum machine continua funcionando, mas a exportação fica indisponível.

## Testes e CI

A lógica pura de parsing, normalização de pattern, estado de mixer e serialização de links compartilháveis vive em `js/core.js` e é coberta por testes nativos do Node:

```bash
node --test tests/*.test.cjs
```

O workflow `.github/workflows/test.yml` executa essa suíte em pull requests.

Para reduzir trabalho na abertura da página, a Web Audio engine não decodifica os samples no carregamento inicial. O carregamento acontece na primeira interação que realmente precisa de áudio.
