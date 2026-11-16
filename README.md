# Evolua

**Aprendizado em movimento.** Plataforma de estudo com cursos estruturados, aulas guiadas, jogos, revisão espaçada e apoio de IA para dúvidas e analogias.

O projeto nasceu como Metodologia Cards, um aplicativo Android offline. A versão web preserva o conteúdo original de Metodologia Científica e permite importar cursos pessoais.

## Funcionalidades

- **Meus cursos:** catálogo de conteúdos originais e importados, plano com módulos e resumos expansíveis das aulas.
- **Estudo guiado:** explicações, exemplos resolvidos, sínteses e prática apresentados em etapas.
- **Jogos:** flashcards, quizzes, associação de pares, verdadeiro/falso e desafio de alternativas.
- **Autoria assistida:** prompt para elaborar e revisar módulos em uma IA externa, com importação de JSON validado.
- **Tutor Gemini:** dúvidas e analogias com contexto da etapa, via API do servidor.
- **Geração complementar:** questões de múltipla escolha para cursos importados, geradas por módulo.
- **Matemática:** renderização de LaTeX e reconhecimento de expressões simples, incluindo frações, raízes e potências.
- **Acompanhamento:** XP, níveis, sequência de estudo, meta diária, conquistas e revisão espaçada do conteúdo incorporado.
- **Dados locais:** cursos, pacotes e progresso separados por conta no navegador, com backup e restauração.

## Estado atual e limitações

A aplicação exige login por e-mail/senha e autorização do administrador por UID. Não há cadastro público ou login Google na interface.

O armazenamento usa localStorage por usuário. Não há sincronização entre dispositivos ou banco remoto de cursos. Limpar os dados do site remove os dados locais; exporte um backup para transferi-los ou preservá-los.

Algumas evoluções especificadas no PRD ainda estão pendentes:

| Capacidade | Estado |
|---|---|
| Banco compartilhado pelas cinco modalidades | Ainda não integrado; a API gera apenas múltipla escolha |
| Flashcards e quizzes de cursos importados | Ainda vinculados ao conteúdo original |
| Aprovação objetiva da aula com 80% de acertos | Definida no produto; leitor atual usa autoavaliação de respostas abertas |
| Limite de uso da API por usuário | Definido como requisito; quota compartilhada ainda não implementada |
| Importação conjunta de curso e banco | Contrato futuro; atualmente curso e jogos usam arquivos separados |

A validação do arquivo verifica sua estrutura e referências, mas não garante correção factual ou revisão pedagógica. XP e autoavaliação não certificam aprendizagem.

## Executar localmente

Requisitos: Node.js 22 ou superior e npm. O workflow de CI usa Node.js 24.

1. Instale as dependências na raiz: **npm ci**.
2. Copie **web/.env.example** para **web/.env.local** e configure os valores abaixo.
3. Execute **npm run dev** na raiz.
4. Acesse [http://127.0.0.1:3000](http://127.0.0.1:3000).

O servidor de desenvolvimento usa o endereço local. Reinicie-o após alterar configurações de ambiente quando necessário.

### Configuração

| Variáveis | Finalidade |
|---|---|
| NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID | Configuração pública do aplicativo Firebase |
| FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY | Credenciais administrativas, somente no servidor |
| FIREBASE_OWNER_UID | UID do proprietário |
| FIREBASE_ALLOWED_UIDS | UIDs de alunos autorizados, separados por vírgula |
| GEMINI_API_KEY | Chave Gemini, somente no servidor |
| GEMINI_MODEL | Identificador de modelo disponível para a chave configurada |

No Firebase Authentication, habilite e-mail/senha, crie as contas e configure os UIDs autorizados. Criar uma conta no Firebase não libera automaticamente a aplicação. Sem autenticação configurada, a interface permanece bloqueada. Sem Gemini configurado, as funcionalidades locais continuam disponíveis aos usuários autorizados, mas o tutor e a geração não funcionam.

Arquivos .env estão ignorados pelo Git, exceto o modelo .env.example. Nunca coloque segredos em variáveis com prefixo NEXT_PUBLIC. A disponibilidade e a quota do modelo precisam ser verificadas no projeto do provedor.

## Como usar

### Importar um curso

**Meus cursos → Novo curso.** Informe tema, público, objetivo e referência opcional. Copie o prompt para a IA escolhida e siga a elaboração incremental. Ao receber o curso final, cole o JSON ou selecione o arquivo, valide, confira os avisos e confirme sua ativação.

O curso aparece no catálogo. Abra o plano, expanda uma aula para consultar seu resumo e inicie a aula liberada. O importador aceita o formato **evolua-course-pack v1**, com limite de 2 MiB.

### Jogar e adicionar materiais

Em **Jogos**, selecione um pacote e módulo, depois escolha uma modalidade disponível. **Importar material** abre a tela de preparação e importação de jogos.

Pacotes **evolua-game-pack v1/v2** têm limite de 1 MiB. Para cursos pessoais, **Gerar banco de questões** solicita múltipla escolha ao Gemini e salva cada módulo validado. Se houver falha, módulos já salvos permanecem disponíveis. Geração em andamento depende da página aberta.

### Apoio e backup

Na aula, abra **Precisa de ajuda nesta etapa?** para tirar dúvidas ou pedir analogias. A pergunta e o contexto pertinente são enviados ao Gemini pelo servidor.

Em **Meu perfil**, exporte ou importe um backup. Restauração exige confirmação e substitui os conjuntos incluídos no arquivo. Logout não apaga os estudos locais.

## Desenvolvimento e validação

| Comando na raiz | Ação |
|---|---|
| npm run dev | Servidor de desenvolvimento |
| npm run typecheck | Verificação TypeScript |
| npm test | Suíte Vitest |
| npm run build | Build de produção |
| npm start | Executa o build de produção |

Na última revisão documentada, build e typecheck passaram; a suíte tinha 91 testes aprovados e 14 falhas existentes em autorização, tutor e fluxos de interface. Consulte o [diagnóstico](docs/diagnostico-evolua.md) para o contexto. Esse registro não substitui executar os testes da revisão atual.

O workflow [.github/workflows/web.yml](.github/workflows/web.yml) executa testes, build e typecheck.

## Estrutura do projeto

- **web/src/app:** páginas, rotas de servidor e estilos.
- **web/src/components:** interface de cursos, sessões, jogos e perfil.
- **web/src/hooks:** autenticação e persistência.
- **web/src/lib:** contratos, validação, aprendizado e formatação matemática.
- **web/content:** conteúdo incorporado.
- **web/public:** manifesto, recursos e service worker.
- **web/test:** testes automatizados.
- **app:** aplicativo Android original.
- **docs:** PRD, regras, contratos e histórico.

O conteúdo original Android e sua cópia web devem permanecer sincronizados. Após alteração editorial, execute **node scripts/sync-web-content.mjs** e os testes.

## Implantação

O projeto web usa Next.js, com **web** como diretório raiz na hospedagem e lockfile npm na raiz do repositório. Configure as variáveis do Firebase e do Gemini no ambiente de destino; o arquivo local não é enviado pelo Git.

Confira limites de execução das rotas, acesso ao provedor e configuração Firebase do domínio publicado. Cache PWA não significa acesso offline garantido: a autorização atual exige conexão.

## Android

Abra o projeto no Android Studio e execute o módulo **app**. A compilação exige Java 17 e Android SDK e é independente do build web. Não há sincronização automática de progresso entre Android e web.

## Documentação do produto

- [PRD principal](docs/PRD-EVOLUA.md): objetivos, requisitos, jornadas e critérios de aceite.
- [Regras de negócio](docs/regras-negocio-evolua.md): permissões, avaliação, jogos, XP, dados e IA.
- [Contratos e dados](docs/contratos-dados-evolua.md): schemas, limites, APIs e evolução do banco.
- [Diagnóstico e decisões](docs/diagnostico-evolua.md): diferenças de implementação, pendências e evidências.
- [Índice da documentação](docs/README.md): planejamento e referências históricas.

Os documentos distinguem comportamento implementado, decisões confirmadas e propostas. O PRD não significa que todas as funcionalidades descritas já foram entregues.
