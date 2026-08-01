# 🔥 Tiktok Streak Automation

<p align="center">
  <a href="https://github.com/lucas-hochmann-rosa/tiktok-streak-automation">
    <img src="https://img.shields.io/badge/GitHub-tiktok--streak--automation-181717?style=for-the-badge&logo=github">
  </a>
  <a href="https://www.linkedin.com/in/lucas-hochmann-rosa">
    <img src="https://img.shields.io/badge/LinkedIn-Lucas_Hochmann_Rosa-0A66C2?style=for-the-badge&logo=linkedin">
  </a>
  <a href="#-tecnologias-utilizadas">
    <img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white">
  </a>
  <a href="#-tecnologias-utilizadas">
    <img src="https://img.shields.io/badge/Playwright-1.58-2EAD33?style=for-the-badge&logo=playwright&logoColor=white">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/Licen%C3%A7a-MIT-2ea44f?style=for-the-badge">
  </a>
</p>

<p align="center">🇧🇷 Português · <a href="README.en.md">🇺🇸 English</a></p>

> Mantém o **foguinho (streak)** do TikTok enviando a mensagem diária automaticamente para os contatos escolhidos, usando [Playwright](https://playwright.dev/).

---

## ⚡ Quick start

```bash
git clone https://github.com/lucas-hochmann-rosa/tiktok-streak-automation.git
cd tiktok-streak-automation
npm install
cp .env.example .env    # edite TIKTOK_TARGETS
npm run login            # uma vez só
npm start                # envia a mensagem diária
```

Detalhes de cada passo nas seções abaixo.

---

## 📌 Visão Geral

Ferramenta de linha de comando em Node.js que reaproveita uma sessão logada do TikTok para abrir conversas e enviar a mensagem diária sem intervenção manual. Sem senha no `.env`, sem token, sem API não oficial: a sessão vem de um login feito uma única vez pelo próprio usuário, em um perfil de navegador persistente.

O código-fonte é escrito em inglês (identificadores, funções, estrutura), com comentários em português explicando decisões que não são óbvias a partir do código.

---

## ✨ Principais Funcionalidades

- Sessão persistente via `launchPersistentContext`: login manual único, sem credenciais armazenadas.
- Detecção de sessão pelo cookie `sessionid`, em vez de textos de interface que mudam de idioma e versão.
- Envio para múltiplos destinatários, com mensagem sorteada de uma lista configurável.
- Ritmo humano: digitação caractere a caractere, pausas de leitura e intervalos variáveis entre ações — nenhum tempo é fixo.
- Print automático da tela em `logs/` sempre que um envio falha ou não pode ser confirmado.
- Nunca reenvia uma mensagem não confirmada, para evitar duplicidade.
- Script de agendamento pronto para o Agendador de Tarefas do Windows.

---

## 🧭 Sumário

- [Arquitetura](#-arquitetura)
- [Mapa dos Módulos](#-mapa-dos-módulos)
- [Tecnologias utilizadas](#-tecnologias-utilizadas)
- [Como funciona o login](#-como-funciona-o-login)
- [Regras da construção do projeto](#-regras-da-construção-do-projeto)
- [Requisitos](#-requisitos)
- [Instalação](#-instalação)
- [Configuração de Ambiente](#-configuração-de-ambiente)
- [Execução](#-execução)
- [Histórico de execuções](#-histórico-de-execuções)
- [Ritmo humano](#-ritmo-humano)
- [Agendamento diário (Windows)](#-agendamento-diário-windows)
- [Quando parar de funcionar](#-quando-parar-de-funcionar)
- [Avisos](#-avisos)
- [Autor](#-autor)
- [Licença](#-licença)

---

## 🏗️ Arquitetura

```text
tiktok-streak-automation/
├── main.js
├── package.json
├── .env.example
├── src/
│   ├── config/
│   │   └── settings.js
│   ├── core/
│   │   ├── browser-session.js
│   │   ├── history.js
│   │   ├── human.js
│   │   ├── locator.js
│   │   ├── logger.js
│   │   ├── screenshots.js
│   │   └── util.js
│   ├── flows/
│   │   └── streak-flow.js
│   └── services/
│       └── streak-service.js
└── scripts/
    └── schedule-task.ps1
```

---

## 🗺️ Mapa dos Módulos

| Arquivo | Função |
| ------ | ------ |
| `main.js` | CLI: `run` \| `login` \| `logout` \| `help`. |
| `src/config/settings.js` | Leitura e validação do `.env`. |
| `src/core/browser-session.js` | Abertura do perfil persistente e checagem de sessão via cookie. |
| `src/core/history.js` | Histórico incremental das execuções em `logs/history.jsonl`. |
| `src/core/human.js` | Digitação com ritmo humano, caractere a caractere. |
| `src/core/locator.js` | Busca resiliente de elementos, com cadeia de seletores e retry. |
| `src/core/screenshots.js` | Print de diagnóstico quando um envio falha. |
| `src/core/logger.js` | Log com horário no console. |
| `src/core/util.js` | Pausas, sorteio, escape de regex. |
| `src/flows/streak-flow.js` | Único ponto do projeto que conhece o HTML do TikTok: seletores e interação com a caixa de mensagens. |
| `src/services/streak-service.js` | Orquestra o envio para todos os destinatários e resume o resultado. |
| `scripts/schedule-task.ps1` | Registra a execução diária no Agendador de Tarefas do Windows. |

---

## 🧰 Tecnologias utilizadas

**Runtime:** Node.js 20+, ES Modules.

**Automação:** [Playwright](https://playwright.dev/) (Chromium via canal `msedge`/`chrome` ou binário próprio).

**Configuração:** `dotenv`.

---

## 🔑 Como funciona o login

O login automatizado do TikTok é frágil (captcha, verificação por e-mail/telefone, bloqueio anti-bot) e exigiria guardar a senha da conta em texto plano. Este projeto faz diferente:

1. `npm run login` abre um navegador com um **perfil persistente** próprio (pasta `.profile/`). O login é feito manualmente, como de costume.
2. A sessão fica salva nessa pasta — cookies, não senha.
3. `npm start` reabre o mesmo perfil, já autenticado, abre cada conversa e envia a mensagem.

Nenhuma credencial fica no repositório, o login só acontece uma vez (até expirar), e a execução diária leva poucos segundos.

---

## 📐 Regras da construção do projeto

- Identificadores, funções e estrutura de arquivos ficam em inglês.
- Comentários no código ficam em português, reservados para decisões não óbvias — o "porquê", não o "o quê".
- Toda interação com o HTML do TikTok fica isolada em `src/flows/streak-flow.js`, com seletores em cadeia de fallback.
- Nenhuma credencial é armazenada: a sessão vem de login manual em perfil persistente.
- Nenhum envio não confirmado é reenviado automaticamente.

---

## ⚙️ Requisitos

- Node.js 20 ou superior
- Microsoft Edge ou Google Chrome instalado (ou `npm run setup` para baixar o Chromium do Playwright)

---

## 🚀 Instalação

```bash
git clone https://github.com/lucas-hochmann-rosa/tiktok-streak-automation.git
cd tiktok-streak-automation
npm install
```

Se você **não** tem Edge nem Chrome, baixe o navegador do Playwright e deixe `BROWSER_CHANNEL` vazio no `.env`:

```bash
npm run setup
```

---

## 🔐 Configuração de Ambiente

```bash
cp .env.example .env
```

Só uma variável é obrigatória:

```env
TIKTOK_TARGETS=Maria,João Pedro
TIKTOK_MESSAGES=🔥|🔥🔥|oi|bom dia
```

`TIKTOK_TARGETS` usa o nome **exatamente como aparece na sua lista de conversas** do TikTok. `TIKTOK_MESSAGES` sorteia uma das opções a cada envio.

| Variável | Padrão | Para que serve |
| --- | --- | --- |
| `TIKTOK_TARGETS` | — | Destinatários, separados por vírgula. **Obrigatório** |
| `TIKTOK_MESSAGES` | `🔥` | Mensagens candidatas, separadas por `\|` |
| `BROWSER_CHANNEL` | `msedge` | `msedge`, `chrome` ou vazio (Chromium do Playwright) |
| `HEADLESS` | `false` | `true` roda sem abrir janela — mais rápido |
| `BROWSER_PROFILE_DIR` | `.profile` | Onde a sessão logada é guardada |
| `TIMEOUT_MS` | `45000` | Tempo máximo de espera por elemento |
| `TYPING_MIN_MS` / `TYPING_MAX_MS` | `90` / `260` | Intervalo entre cada caractere digitado |
| `READ_MIN_MS` / `READ_MAX_MS` | `1800` / `4200` | Pausa ao carregar a caixa e ao abrir a conversa |
| `PRE_SEND_MIN_MS` / `PRE_SEND_MAX_MS` | `800` / `2000` | Pausa antes de apertar Enter |
| `DELAY_MIN_MS` / `DELAY_MAX_MS` | `6000` / `18000` | Pausa entre destinatários |
| `START_JITTER_MAX_MS` | `0` | Atraso aleatório no início da execução |
| `SCREENSHOT_DIR` | `logs` | Onde salvar prints quando algo falha |
| `HISTORY_LOG_PATH` | `logs/history.jsonl` | Arquivo do histórico incremental de execuções |

---

## ▶️ Execução

```bash
npm run login   # uma vez só (e de novo se a sessão expirar)
npm start       # envia a mensagem diária
```

Comandos auxiliares:

```bash
npm run logout   # derruba a sessão salva
npm run help     # lista os comandos
```

O comando sai com código `1` se algum destinatário falhar, o que permite detectar problemas em execuções agendadas.

---

## 📜 Histórico de execuções

Toda execução — enviada com sucesso, parcial ou totalmente falha — vira uma linha em `logs/history.jsonl`. O arquivo é [JSON Lines](https://jsonlines.org/): cada linha é um objeto JSON independente, então nunca precisa reescrever o arquivo inteiro para acrescentar uma execução nova.

```json
{"timestamp":"2026-08-01T09:00:04.120Z","success":true,"results":[{"target":"Maria","status":"enviado","message":"🔥"}],"durationMs":18342}
```

Útil para responder "quando foi a última vez que rodou de verdade?" sem precisar guardar o terminal aberto. O caminho é configurável em `HISTORY_LOG_PATH`.

---

## 🐢 Ritmo humano

Toda ação instantânea é a assinatura mais óbvia de automação. Por isso o robô não corre:

- digita **caractere a caractere**, com intervalo sorteado a cada tecla;
- hesita ocasionalmente depois de um espaço, como quem pensa na próxima palavra;
- pausa ao carregar a caixa de mensagens e ao abrir a conversa, antes de começar a escrever;
- espera um intervalo variável antes de apertar Enter e entre um destinatário e outro.

Nenhum desses tempos é fixo — todos são sorteados dentro de uma faixa, para que duas execuções nunca tenham a mesma cadência. Um envio costuma levar de 10 a 20 segundos.

Para execuções agendadas, vale ativar `START_JITTER_MAX_MS` (ex.: `900000` para até 15 minutos): disparar exatamente às 09:00:00 todo dia é um padrão previsível.

---

## 📅 Agendamento diário (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\schedule-task.ps1 -Time 09:00
```

Isso registra uma tarefa diária no Agendador de Tarefas. Para conferir ou remover:

```powershell
Get-ScheduledTask -TaskName TikTokStreak
Unregister-ScheduledTask -TaskName TikTokStreak
```

Para execuções agendadas, coloque `HEADLESS=true` no `.env`.

> **Não use GitHub Actions ou outro CI para isto.** A automação depende de um perfil de navegador logado que existe apenas na sua máquina; subir esse perfil para um runner significaria expor sua sessão do TikTok.

---

## 🔧 Quando parar de funcionar

O TikTok muda a interface com frequência. Todo o acoplamento com o HTML está isolado em um único lugar: a constante `SELECTORS` em [`src/flows/streak-flow.js`](src/flows/streak-flow.js). Cada campo é uma lista de tentativas, da mais específica para a mais genérica — normalmente basta acrescentar um seletor novo no topo da lista.

Quando um envio falha, um print da tela é salvo em `logs/`, o que costuma mostrar na hora o que mudou.

Outros casos comuns:

| Sintoma | Causa provável |
| --- | --- |
| `Sessão ausente ou expirada` | Rode `npm run login` de novo |
| `Conversa com "X" não encontrada` | O nome em `TIKTOK_TARGETS` não bate com a lista de conversas |
| `O perfil já está aberto em outro processo` | Feche a janela deixada aberta por uma execução anterior |
| `não foi possível confirmar na tela` | A mensagem provavelmente foi enviada; confira antes de rodar de novo (o robô nunca reenvia sozinho, para não duplicar) |

---

## ⚠️ Avisos

Ferramenta de uso pessoal, feita para automatizar uma tarefa repetitiva na **sua própria conta**. Automatizar interações pode contrariar os [Termos de Serviço do TikTok](https://www.tiktok.com/legal/terms-of-service) e, no limite, levar a restrições na conta. Use por sua conta e risco, com moderação e apenas com pessoas que já conversam com você.

Não versione `.env`, `.profile/` nem `logs/` — todos já estão no `.gitignore`.

---

## 📄 Licença

Licenciado sob MIT. Sinta-se livre para usar, modificar e distribuir, mantendo o aviso de copyright e atribuindo crédito a **Lucas Hochmann Rosa**.

---

## 👨‍💻 Autor

**Lucas Hochmann Rosa**

- Repositório: <https://github.com/lucas-hochmann-rosa/tiktok-streak-automation>
- GitHub: <https://github.com/hrlucas>
- LinkedIn: <https://www.linkedin.com/in/lucas-hochmann-rosa>

---