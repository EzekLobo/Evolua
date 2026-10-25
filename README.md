# Evolua

**Aprendizado em movimento.** Plataforma web gamificada para transformar estudo em hábito: trilhas, flashcards, quizzes, revisão espaçada e prática discursiva.

O projeto nasceu como **Metodologia Cards**, um app Android offline. A Evolua preserva o conteúdo e o aplicativo Android e acrescenta uma experiência web responsiva em Next.js e TypeScript.

## O que já funciona

- Dashboard com métricas reais, XP, níveis, sequência e meta diária configurável.
- Quatro trilhas de Metodologia Científica, com 43 flashcards e 28 quizzes.
- Autoavaliação de memória e explicação individual de cada alternativa.
- Revisão de cards e quizzes: erros voltam no mesmo dia; acertos consecutivos usam intervalos de 1, 3, 7, 14 e 30 dias.
- Seis conquistas, mantidas depois de desbloqueadas.
- Laboratório com três jogos: conectar pares, verdadeiro/falso e desafio de alternativas.
- Entrada modular de conteúdo: a plataforma gera um prompt, valida e importa pacotes JSON produzidos por qualquer IA compatível.
- Biblioteca com 4 guias, 22 termos, 24 relações, 32 exercícios discursivos e 5 simulados.
- Rascunhos salvos, exportação/importação validada de backup e confirmação antes de apagar dados.
- Interface para celular e desktop, teclado, referências de fonte e PWA com cache para uso offline após carregamento.

**Persistência da versão 1:** o progresso fica no navegador (`localStorage`). Esta entrega não possui login, banco remoto, ranking nem sincronização automática. Para transferir dados, use **Meu perfil → Exportar/Importar backup**. A avaliação discursiva é feita pelo estudante com roteiro e rubrica, sem correção automática.

## Executar a web

Requisito: Node.js 22 ou superior (produção configurada com Node.js 24).

```sh
npm ci
npm run dev
```

Abra `http://127.0.0.1:3000`.

```sh
npm test
npm run build
npm run typecheck
npm start
```

Os testes verificam a preservação do conteúdo Android, IDs e referências, correção das alternativas, cálculo de XP, deduplicação, revisão espaçada, calendário de São Paulo, conquistas e os fluxos de interface em DOM simulado. O workflow `.github/workflows/web.yml` executa os testes, build e checagem de tipos no GitHub.

## Criar novos jogos com um prompt

Abra **Jogos → Entrada modular**, descreva o assunto, público, objetivo e dificuldade e selecione sua IA: ChatGPT, Claude, Gemini, Microsoft Copilot ou outra. **Copiar prompt e abrir IA** abre o site escolhido e copia as instruções para você colar e enviar. Também é possível baixar ou compartilhar o prompt quando o navegador permitir.

Cole a resposta na Evolua ou importe o JSON. A plataforma aceita um bloco Markdown externo, aponta erros por campo e gera um prompt de correção. Após validação, confira a prévia e confirme a ativação. O formato `evolua-game-pack` v2 inclui objetivos, fontes e explicações por alternativa; o v1 continua aceito. Validação estrutural rejeita IDs e textos de pares duplicados e índices inválidos, mas a precisão factual e possíveis ambiguidades exigem revisão do material-base. Consulte [docs/game-packs.md](docs/game-packs.md).

Pacotes acompanham o backup do perfil, podem ser baixados individualmente e sincronizam entre abas. As afirmações de verdadeiro/falso montadas automaticamente a partir de respostas trocadas do curso original foram retiradas até revisão editorial; esse jogo fica disponível em pacotes importados com afirmações próprias.

## Organização

```text
app/                       Aplicativo Android original (Kotlin/Compose)
web/
  content/metodologia.json  Conteúdo migrado, com referências de origem
  src/app/                 Aplicação Next.js, metadados e estilos
  src/components/          Dashboard, atividades, biblioteca e perfil
  src/hooks/               Persistência e recuperação do progresso
  src/lib/                 Schema de conteúdo e motor de aprendizado
  public/                  Ícone, manifesto e service worker
  test/                    Testes de conteúdo, regras e interface
docs/                      Arquitetura e evolução planejada
```

O conteúdo Android em `app/src/main/assets/study_content.json` e a cópia web precisam permanecer iguais. Após uma alteração editorial, rode `node scripts/sync-web-content.mjs` e `npm test`. O schema Zod rejeita fontes ausentes, tópicos inexistentes, IDs repetidos e quizzes inválidos. As referências foram preservadas do original; a presença de uma referência não equivale a uma auditoria editorial das páginas. PDFs completos não são publicados pela web.

## Deploy na Vercel

Projeto: `evolua`. Framework: Next.js. **Root Directory: `web`**. Instalação e build usam os padrões do framework e o lockfile npm na raiz do repositório. Nenhuma variável de ambiente é necessária para esta versão.

```sh
vercel link --project evolua --yes
vercel deploy
vercel deploy --prod
```

Execute os comandos na raiz do repositório. A configuração remota do projeto aponta para `web`; a integração Git deve usar `main` como branch de produção. Nunca versionar `.vercel/`, `.env*` ou tokens.

## Android

Abra a raiz do repositório no Android Studio e execute o módulo `app`. A identidade foi atualizada para **Evolua**, mantendo o identificador do aplicativo e o armazenamento existente para preservar a compatibilidade com a versão anterior. A compilação e os testes Android exigem Java 17 e Android SDK e são independentes do build web.

## Próximas evoluções

Consulte [docs/web-architecture.md](docs/web-architecture.md) para autenticação, sincronização, múltiplos cursos e ferramentas editoriais.
