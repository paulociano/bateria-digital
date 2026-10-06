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

## Controle de BPM

O controle de velocidade permite escolher valores entre:

```text
70 BPM → 180 BPM
```

O tempo selecionado altera o intervalo entre os sons reproduzidos pelo sequenciador.

O cálculo utilizado atualmente é baseado em subdivisões de meio tempo:

```javascript
60000 / BPM / 2
```

Assim, valores maiores de BPM produzem sequências mais rápidas.

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
- atualização do estado visual.

### `css/main.css`

Responsável pela identidade visual e responsividade.

A interface utiliza uma estética escura inspirada em equipamentos musicais, com:

- pads coloridos;
- painel central semelhante a uma drum machine;
- tipografia Manrope e DM Mono;
- feedback visual ao tocar;
- iluminação ambiente;
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

