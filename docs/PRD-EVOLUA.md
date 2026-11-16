# PRD — Evolua

| Metadado | Valor |
|---|---|
| Versão documental | 1.0.0 |
| Data | 16/11/2026, America/Sao_Paulo |
| Tipo | PRD principal consolidado da aplicação web |
| Estado | Em especificação; decisões confirmadas e lacunas localizadas |
| Responsável de produto | Proprietário da Evolua |
| Elaboração | Codex, a partir das decisões do proprietário e inspeção do repositório |
| Base técnica examinada | Commit bed165d e árvore de trabalho disponível nesta data |
| Aprovação | Não presumida; confirmação pontual de regras não equivale a homologação do produto |

## 1. Finalidade e leitura

Este PRD define o produto Evolua, suas jornadas, regras de negócio, restrições e critérios de aceite. A aplicação transforma cursos estruturados em estudo guiado, prática com jogos e revisão, com IA como suporte ao aprendizado. O conteúdo deve ser suficientemente desenvolvido para ensinar, e não uma coleção superficial de títulos e perguntas.

Este documento deve ser lido com:

- [Catálogo de regras de negócio](regras-negocio-evolua.md): regras identificadas, fórmulas, permissões, exceções e verificações.
- [Contratos e dados](contratos-dados-evolua.md): formatos atuais de importação, limites, persistência, APIs e proposta de banco compartilhado.
- [Diagnóstico e decisões](diagnostico-evolua.md): diferenças entre produto desejado e implementação, decisões pendentes e evidências desta revisão.

Os documentos foram criados em conjunto; não há plano de implementação novo nesta entrega. O [plano de autoria existente](plano-autoria-assistida.md) mantém seus IDs e histórico. Ele precisa ser reconciliado com este PRD antes de orientar novas entregas. Documentos anteriores não são evidência suficiente de implementação: alguns ainda descrevem visitantes, armazenamento global ou tutor simulado, comportamentos superados no código.

### 1.1 Evidência e decisão são dimensões distintas

| Classificação | Significado |
|---|---|
| Confirmado — produto | Pedido ou resposta expressa do proprietário nesta conversa |
| Confirmado — código | Comportamento identificado no código; não implica homologação visual ou validação real do provedor |
| Proposto | Recomendação de comportamento ou contrato ainda não aprovada |
| Pendente | Decisão sem resposta ou verificação ainda não realizada |

O estado de implementação de cada requisito é registrado separadamente: implementado no código, parcial ou não implementado. Regras novas aprovadas, como os 80%, não estão implementadas apenas por constarem aqui.

### 1.2 Fontes

| ID | Fonte | Uso |
|---|---|---|
| F01 | Conversa de produto, incluindo respostas de 16/11/2026 | Acesso fechado, autoria externa, estudo incremental, organização visual, banco único, armazenamento local e decisões de 80% e quotas |
| F02 | [Autorização do servidor](../web/src/lib/firebase-server.ts), [hook de autenticação](../web/src/hooks/use-auth.ts), [endpoint de acesso](../web/src/app/api/auth/access/route.ts) | Identidade, autorização, proprietário e revalidação |
| F03 | [Schema de cursos](../web/src/lib/course-schema.ts), [store](../web/src/lib/course-store.ts), [hook de cursos](../web/src/hooks/use-courses.ts) | Importação, invariantes, revisões e persistência |
| F04 | [Prompt de cursos](../web/src/lib/course-authoring.ts), [gerenciador](../web/src/components/course-manager.tsx), [prompt de jogos](../web/src/lib/game-authoring.ts) | Autoria, instruções incrementais e prévia |
| F05 | [Biblioteca](../web/src/components/library.tsx), [leitor](../web/src/components/course-reader.tsx), [acompanhamento](../web/src/lib/course-learning.ts) | Catálogo, plano, etapas e progresso de cursos |
| F06 | [Jogos](../web/src/components/games.tsx), [schema de jogos](../web/src/lib/game-content.ts), [estúdio](../web/src/components/game-pack-studio.tsx) | Modalidades, pacotes e limites |
| F07 | [Tutor](../web/src/app/api/tutor/route.ts), [geração de questões](../web/src/app/api/game-bank/route.ts) | Integrações reais no servidor e seus limites atuais |
| F08 | [Motor de aprendizado](../web/src/lib/learning-engine.ts), [sessão](../web/src/components/study-session.tsx), [painel](../web/src/components/dashboard.tsx) | XP, revisão, metas, domínio inicial e conquistas |
| F09 | [Namespace local](../web/src/lib/private-storage.ts), [progresso](../web/src/hooks/use-progress.ts), [pacotes](../web/src/hooks/use-game-packs.ts), [backup](../web/src/lib/backup.ts), [perfil](../web/src/components/profile.tsx) | Separação por conta, gravação, exclusão e recuperação |
| F10 | [Renderizador matemático](../web/src/components/math-text.tsx), [normalização matemática](../web/src/lib/math-format.ts), [estilos do curso](../web/src/app/course-reader.css) | Matemática e organização visual |
| F11 | [Aplicação](../web/src/components/evolua-app.tsx), [service worker](../web/public/sw.js), [manifest](../web/public/manifest.webmanifest) | Navegação, instalação, cache e bloqueio de acesso |
| F12 | [Testes](../web/test), [manifest web](../web/package.json), [conteúdo web](../web/content/metodologia.json) | Evidências automatizadas, stack e conteúdo incorporado |

## 2. Problema e objetivos

O estudante precisa de explicações progressivas, exemplos compreensíveis e prática que demonstre o que aprendeu. Um texto longo seguido de muitos botões não orienta o estudo. Pacotes independentes para cada jogo multiplicam autoria, repetição e inconsistências. Geração de cursos inteiros por chamadas limitadas produz risco de superficialidade e truncamento.

| ID | Objetivo | Resultado observável |
|---|---|---|
| OBJ-01 | Ensinar antes de avaliar | Conceito explicado e exemplificado antes de desafio vinculado |
| OBJ-02 | Facilitar autoria completa e importação | Usuário informa tema e objetivo; prompt define estrutura e formatos, sem montagem manual de IDs |
| OBJ-03 | Guiar uma progressão verificável | Plano informa aula atual e bloqueios; avanço exige o critério confirmado de aprendizagem |
| OBJ-04 | Reutilizar conteúdo de prática | Um item do banco alimenta todas as modalidades compatíveis do produto |
| OBJ-05 | Oferecer apoio contextual | Dúvida/analogia recebe contexto da etapa e aparece no ponto da solicitação |
| OBJ-06 | Preservar autonomia e dados do usuário | Cursos e progresso persistem localmente por UID e podem ser exportados |
| OBJ-07 | Controlar acesso e custo | Administrador autoriza usuários; chamadas pagas respeitam limites definidos no servidor |

## 3. Pessoas e acesso

**Estudante autorizado:** importa e estuda cursos pessoais, joga, revisa, solicita apoio e gerencia os próprios dados locais. Poderá gerar banco de questões com quota, conforme decisão expressa F01.

**Proprietário/administrador:** controla as contas autorizadas e configurações de acesso. A criação completa de cursos pela API deve continuar exclusiva desse perfil; a importação e preparação de prompts externos permanecem disponíveis aos estudantes. Hoje não existe console administrativo próprio na aplicação.

**Pessoa autenticada sem autorização:** pode estar logada no Firebase, mas não pode acessar a aplicação. Cadastro de uma conta Firebase e liberação da aplicação são operações distintas.

**Fornecedor de IA:** Gemini nas chamadas de servidor; IA externa escolhida pelo usuário no fluxo de autoria por prompt. A ferramenta externa não recebe credenciais da aplicação.

Matriz detalhada: RN-ACC-01 a RN-ACC-08 e RN-IA-01 a RN-IA-10 no [catálogo](regras-negocio-evolua.md).

## 4. Escopo e fronteiras

### 4.1 Produto confirmado

- Web autenticada, com autorização controlada pelo administrador.
- Entrada única em Meus cursos, reunindo catálogo incorporado e importado.
- Novo curso e importação de jogos em áreas dedicadas abertas por ação explícita.
- Plano com módulos, resumo expansível da aula e indicação de bloqueios.
- Aula em etapas de explicação, exemplos, prática e conclusão; navegação compacta e ajuda contextual.
- Questões objetivas para avaliação determinística; 80% de acertos nos desafios obrigatórios para desbloqueio.
- Banco reutilizável produzido junto da autoria do curso, com 10 itens por aula como meta editorial registrada na conversa.
- Flashcards, quizzes, pares, verdadeiro/falso e alternativas na mesma área de jogos.
- Tutor para dúvida e analogia; geração complementar de banco por API para usuários autorizados com limite de uso.
- Armazenamento no navegador por conta, backup e restauração.
- Matemática renderizada e conteúdo estruturado legível em celular e desktop.

### 4.2 Fora do escopo atual

Não estão confirmados para esta versão: sincronização entre dispositivos, banco remoto de cursos, matrícula pública, login Google, pagamentos, certificados, ranking, editor manual obrigatório de módulos, upload/leitura de PDFs e correção livre por IA como condição de aprovação. O Android original é preservado, mas este PRD não redefine suas telas nem promete sincronização com a web.

Uso offline da área autenticada não é garantido: recursos podem estar em cache, mas a autorização atual exige conexão.

## 5. Requisitos e estado real

| ID | Funcionalidade | Decisão e implementação |
|---|---|---|
| RF-01 | Login e autorização por UID | Confirmado F01/F02; implementado com divergência de provedor do proprietário, GAP-01 |
| RF-02 | Meus cursos e navegação unificada | Confirmado F01/F05/F11; parcial: catálogo original ainda tem fluxo próprio |
| RF-03 | Autoria externa incremental | Confirmado F01/F04; prompt implementado, sem orquestração de módulos persistida na aplicação |
| RF-04 | Importar, validar, revisar e ativar curso | Confirmado F03/F04; implementado no código, com falhas de mensagem e integração registradas |
| RF-05 | Plano, resumo e progressão de aulas | Confirmado F01/F05; plano implementado, progressão parcial |
| RF-06 | Aula guiada, compacta e visual | Confirmado F01/F05/F10; etapas por seção implementadas, adequação de volume ainda parcial |
| RF-07 | Avaliação objetiva e desbloqueio a 80% | Confirmado F01; não implementado no leitor de cursos |
| RF-08 | Banco comum alinhado às aulas | Confirmado F01; parcial no prompt, ausente como contrato canônico consumido pelos cinco jogos |
| RF-09 | Laboratório de jogos | Confirmado F06; modalidades reunidas visualmente, integração dos dados parcial |
| RF-10 | Importar material de jogos | Confirmado F06; implementado, separado da tela principal |
| RF-11 | Tutor para dúvidas e analogias | Confirmado F01/F07; API real implementada, contexto e confiabilidade ainda parciais |
| RF-12 | Gerar banco complementar por API | Confirmado F01/F07; apenas múltipla escolha por módulo, sem quota de negócio |
| RF-13 | Revisão e recomendação de estudo | Confirmado F08; motor legado implementado; curso novo tem mecanismo separado |
| RF-14 | XP, metas e conquistas | Confirmado F08; implementado para atividades do motor, não para respostas abertas do curso |
| RF-15 | Perfil, dados locais e isolamento por conta | Confirmado F01/F09; implementado por namespace, sem proteção contra acesso local ao navegador |
| RF-16 | Backup, restauração e remoção | Confirmado F09; implementado com escopos distintos de exclusão |
| RF-17 | Matemática e acessibilidade da interação | Confirmado F01/F10; renderização ampliada às áreas de conteúdo nesta entrega, reconhecimento automático conservador e homologação visual pendente |
| RF-18 | Operação, limites e continuidade de IA | Limite de uso confirmado F01; controle compartilhado e orçamento pendentes |

## 6. Jornadas

### JOR-01 — Entrar e receber acesso

O administrador cria a conta no Firebase e libera o UID. O estudante entra por e-mail/senha. O servidor verifica identidade e autorização; sem liberação a aplicação mostra bloqueio e orientação para contato com o administrador. Logout retira a permissão da sessão, sem apagar os dados locais. Relaciona RF-01/RF-15 e RN-ACC.

### JOR-02 — Criar e importar um curso

Meus cursos → Novo curso → informar tema, público, objetivo, nível e referência opcional → copiar prompt → autoria incremental em IA externa → importar arquivo → validar → conferir prévia e avisos → confirmar → ativar → retornar ao catálogo. Erros preservam a entrada e não substituem curso ativo. O alvo de importação conjunta do curso e banco depende de novo contrato, D-03; atualmente são arquivos separados. Relaciona RF-03/RF-04/RF-08.

### JOR-03 — Estudar com progressão

Abrir curso → plano → expandir aula → ler resumo → iniciar aula liberada → percorrer explicações e exemplos → responder desafios objetivos → receber feedback → concluir com resultado → liberar próxima aula quando atingido o critério. O resumo de aula bloqueada pode ser consultado. Revisão não deve apagar histórico. Relaciona RF-05/RF-06/RF-07.

~~~mermaid
flowchart TD
    PLANO["Abrir plano do curso"] --> RESUMO["Expandir resumo da aula"]
    RESUMO --> LIBERADA{"Aula liberada?"}
    LIBERADA -->|"Não"| BLOQUEIO["Mostrar pré-requisito pendente"]
    LIBERADA -->|"Sim"| EXPLICAR["Estudar explicações e exemplos"]
    EXPLICAR --> PRATICA["Responder desafios obrigatórios"]
    PRATICA --> NOTA{"Todos respondidos e acerto de pelo menos 80%?"}
    NOTA -->|"Sim"| AVANCO["Registrar conclusão e liberar próxima aula"]
    NOTA -->|"Não"| REVER["Mostrar dificuldades e orientar revisão"]
    REVER --> EXPLICAR
~~~

Este desenho representa o alvo de avaliação a 80%, ainda não o leitor atual com autoavaliação. Exigir todos os obrigatórios respondidos é a proposta operacional mostrada, sujeita a D-01, assim como nova tentativa e cálculo entre rodadas.

### JOR-04 — Jogar e revisar

Jogos → selecionar conteúdo e módulo → escolher modalidade disponível → responder → visualizar justificativa → finalizar rodada → acompanhar resultado. O alvo é usar o mesmo banco para as cinco modalidades, respeitando vínculos com curso e aula. Ausência de material deve explicar o motivo e oferecer importação/geração, sem fingir que o curso já tem jogos. Relaciona RF-08/RF-09/RF-13/RF-14.

### JOR-05 — Pedir suporte

Na etapa, abrir ajuda → escrever dúvida ou pedir analogia → enviar ação e contexto mínimo ao servidor autenticado → consultar Gemini → apresentar resposta ou falha no mesmo painel. A aula não perde posição por falha de IA; o tutor não altera gabarito, nota ou desbloqueio. Relaciona RF-11/RF-18.

### JOR-06 — Gerar material complementar

Escolher curso importado → consultar saldo/quota no alvo → gerar unidade pendente → validar → salvar → continuar → disponibilizar material compatível nos jogos. A implementação atual processa módulos e salva cada módulo concluído; não é um job durável de servidor. Retomada segura após revisão de curso depende de D-04. Relaciona RF-12/RF-15/RF-18.

### JOR-07 — Proteger e transferir dados

Perfil → exportar backup → guardar arquivo → em outro navegador autenticado, importar → conferir prévia → confirmar substituição. Falha de escrita tenta restaurar o estado anterior e informa se a reversão não puder ser confirmada. Relaciona RF-16.

## 7. Especificações funcionais e aceite

### RF-01 — Autenticação e acesso fechado

**Atores e gatilho:** pessoa que abre a aplicação, estudante e administrador. **Entradas:** e-mail/senha na autenticação e token Bearer no servidor. **Saída:** permissão de estudo e indicador de proprietário.

**Confirmado:** RN-ACC-01 a RN-ACC-08, fontes F01/F02. Toda chamada ao tutor e à geração deve verificar acesso no servidor. Não se concede privilégio por e-mail exibido, nome, primeiro login ou parâmetro de URL. Contas sem UID liberado não acessam o estudo. A configuração da conta não deve exigir fornecer senha no chat ou no repositório.

**Aceite:** aluno permitido entra; UID não permitido é negado; token inválido/revogado não libera; credenciais de servidor ausentes falham fechadas; remoção da allowlist afeta a próxima autorização e a revalidação da interface. Provedor do proprietário precisa de alinhamento GAP-01 antes de declarar o aceite de todos os cenários.

### RF-02 — Catálogo e navegação

**Confirmado F01:** um destino Meus cursos, cartões padronizados inspirados no visual das trilhas; criação aparece somente por Novo curso. Nome e descrição curta identificam o curso; detalhes ficam no plano. Abrir não deve despejar toda a aula no catálogo.

**Código F05/F11:** catálogo importado e um cartão agregado do conteúdo original; jogos e revisão permanecem destinos próprios. Fluxos antigos por hash não são considerados compatíveis apenas por haver um ramo condicional: GAP-09.

**Aceite:** criar/importar não ocupa a tela inicial da biblioteca; curso ativado aparece no catálogo; voltar ao plano mantém o curso; origem do conteúdo não produz cartões com hierarquias conflitantes. Busca unificada e filtros em todos os cursos são proposta, não capacidade atual garantida.

### RF-03 — Autoria externa incremental e qualidade

**Confirmado F01/F04:** usuário informa intenção pedagógica; o prompt assume estrutura técnica, IDs, limites, revisões e saída. A IA trabalha um módulo por vez, revisa e só depois consolida. Não reduzir arbitrariamente a quantidade de módulos para caber numa resposta.

**Regras:** RN-AUT-01 a RN-AUT-09. Uma seção ensina um conceito central com definição, explicação, exemplo resolvido e síntese. Analogias declaram correspondências e limites. O banco é desenvolvido com o módulo, não como perguntas desconectadas ao final. Fonte não disponível é lacuna, não oportunidade de inventar citação.

**Aceite:** prompt declara tipos e cardinalidades, inclusive constraints como lista; plano e módulos usam IDs estáveis; um conceito não está escondido entre várias definições; consolidação preserva conteúdo e questões. Arquivo de trabalho intermediário não é apresentado como importável. IA externa sem ferramenta de arquivo não tem garantia de consolidar um curso maior que seu limite de saída; GAP-12/D-03.

### RF-04 — Prévia, rascunho, ativação e versões

**Gatilho:** colar JSON ou selecionar arquivo. **Atores:** estudante autorizado/proprietário. **Pré-condição:** curso compatível com o schema, sem efeitos de gravação na validação.

**Confirmado F03/F04:** RN-IMP-01 a RN-IMP-11. Mostrar contagens, nível, revisão, avisos editoriais e substituição prevista. Salvar rascunho não ativa. Ativar exige confirmação explícita. Reimportar mesmo ID substitui o ativo, preservando data original de importação; rascunhos são identificados por ID e revisão.

**Aceite:** JSON inválido e referências desconhecidas têm caminhos de campo; tamanho no limite é aceito se as demais regras passarem; excedente é rejeitado; confirmação ausente impede ativação; falha de escrita não deve anunciar sucesso. Dados existentes e conteúdo colado são preservados até gravação bem-sucedida. Normalização estrutural de tipos ainda não existe: texto em vez de array deve ser rejeitado e explicado.

### RF-05 e RF-06 — Plano e aula guiada

**Confirmado F01/F05:** plano com módulos expansíveis, títulos de aulas, resumo inline, indicação textual e visual de atual/concluída/bloqueada. Aula bloqueada não inicia pelo botão de sua linha. Retomar deve respeitar pré-requisitos.

**Organização:** cabeçalho compacto; informação complementar sob demanda; conteúdo central; ajuda no topo; Voltar/Continuar com hierarquia clara. Não reduzir fonte a ponto de comprometer leitura nem esconder conteúdo necessário para evitar rolagem. Usar organização horizontal quando a largura permitir e empilhamento em celular.

**Código atual:** uma etapa contém todos os blocos de uma seção; prática é uma atividade por etapa; última etapa resume a autoavaliação. Posição de aula é persistida, mas etapa interna e resposta em edição não são. Divisão automática de seção longa em blocos menores é proposta para atender o objetivo de compactação, GAP-06.

**Aceite:** voltar e avançar não mistura respostas entre atividades; ajuda corresponde à etapa atual; exemplo aparece separado da definição; conteúdo completo permanece acessível em zoom e tela estreita; nenhum controle de desbloqueio permite saltar pré-requisitos por retomada obsoleta. RN-EST-01 a RN-EST-08.

### RF-07 — Avaliação objetiva e regra de 80%

**Confirmado F01, resposta expressa de 16/11/2026:** usar múltipla escolha na avaliação obrigatória e liberar próxima aula com pelo menos 80% de acertos. Perguntas abertas podem servir à reflexão, mas a declaração “acertei” não comprova aprovação.

Se N é o número de desafios obrigatórios válidos e C o número de acertos, a condição numérica é C/N ≥ 0,8; mínimo inteiro = teto(0,8 × N). N=10 exige 8; N=3 exige 3; N=0 não aprova automaticamente. A exibição arredondada não altera a comparação. Seleção da rodada, nova tentativa e critério de acumulação de acertos são D-01.

**Código F05:** usa todas as activities abertas com resultado autoatribuído correto e assinatura de expectedAnswer; exige todas corretas para desbloqueio. Isso diverge da regra confirmada. Nenhum indicador atual deve ser rotulado como avaliação objetiva de 80%.

**Proposta operacional:** exigir todos os obrigatórios respondidos para fechar a rodada, sujeita a D-01. **Aceite-alvo:** 7/10 bloqueia e 8/10 satisfaz o critério numérico; alterar a ordem visual das alternativas preserva o gabarito; informar erro explica o conceito e oferece revisão; o tutor não decide a nota. Ver RN-AVA-01 a RN-AVA-07.

### RF-08 — Banco comum do curso

**Confirmado F01:** um item inclui dados suficientes para flashcard, quiz/alternativas, pares e verdadeiro/falso, sem cinco conjuntos independentes. Meta de autoria: 10 itens por aula, 40 por módulo de 4 aulas; não confundir com 10 itens por módulo da API atual. Todo item deve apontar curso/revisão, módulo, aula e objetivo.

**Proposto:** novo contrato integrado com banco canônico e adaptadores determinísticos, descrito no [anexo](contratos-dados-evolua.md#5-banco-compartilhado-alvo). O requisito de importação integrada está confirmado; o envelope exato, versão e política de migração permanecem D-03. Os arquivos atuais não aceitam campos novos arbitrários.

**Aceite-alvo:** importar uma vez disponibiliza o mesmo item nas cinco modalidades; alteração do item é identificável; pares não possuem definições duplicadas/ambíguas; verdadeiro/falso contém afirmações revisadas, não falsas associações fabricadas em runtime; alternativas têm uma resposta correta e feedback por opção. RN-BAN-01 a RN-BAN-08.

### RF-09 e RF-10 — Jogos e importação de material

**Confirmado F01/F06:** cinco cartões na mesma grade; escolher conteúdo/módulo antes da rodada; importar material abre outra tela e retorna após ativação. Cada modalidade usa somente itens compatíveis. O material é pessoal e local, não publicação global.

**Código:** pares usa até 6 itens por rodada e exige ao menos 2 disponíveis; verdadeiro/falso e alternativas usam até 10. Flashcards/quizzes permanecem vinculados ao conteúdo incorporado e não obedecem ao módulo selecionado do pacote; isso deve ser corrigido antes de cumprir RF-08.

**Aceite:** botão indisponível explica ausência de conteúdo; selecionar outro pacote limpa a rodada anterior; alternativas embaralhadas preservam índice original; uma questão respondida não aceita segundo clique pontuável. Importação v1/v2 continua possível durante a migração. RN-JOG-01 a RN-JOG-09.

### RF-11 — Dúvida e analogia

**Confirmado F01/F07:** ação autenticada de apoio, com conteúdo da etapa enviado ao Gemini pelo servidor. Retorno e erro ficam abaixo da solicitação; carregar não bloqueia a navegação inteira. Analogia explica situação familiar, correspondências, limites e retorno à definição.

**Código:** pergunta até 1.000 caracteres, contexto até 24.000, título até 160; saída de texto renderizada com matemática. Não há memória durável da conversa. Contexto é truncado pela interface e não contém necessariamente fontes ou todos os vínculos. Requisição antiga não está protegida por ID de etapa: GAP-07.

**Aceite-alvo:** resposta da etapa A nunca aparece como resposta à dúvida da etapa B; indisponibilidade preserva pergunta; tutor não modifica conteúdo/XP/nota; segredo nunca vai ao navegador; limites são verificados no servidor. Conteúdo importado é dado não confiável, não instrução de sistema. RN-TUT-01 a RN-TUT-06.

### RF-12 e RF-18 — Geração complementar e controle de uso

**Confirmado F01, resposta expressa de 16/11/2026:** usuários autorizados podem gerar banco pela API, com limite de uso. Isso não autoriza geração completa de cursos por aluno. A chave é do servidor; o usuário não fornece uma chave própria.

**Código F06/F07:** processa sequencialmente módulos, pede 10 múltiplas escolhas/módulo, salva cada módulo validado e retoma ignorando IDs já existentes. Até 3 tentativas para falhas transitórias, com espera; timeout por tentativa de 50 segundos. Não há orçamento, contador compartilhado, reserva de quota, cancelamento durável ou vínculo robusto à revisão do curso.

**Aceite-alvo:** antes de chamar o provedor o servidor verifica autorização e saldo; limite excedido não chama Gemini; timeout/503 não publica JSON parcial; módulos salvos não são apagados; revisão alterada não reutiliza silenciosamente banco antigo; consumo e retries seguem regra de quota aprovada. Limites concretos e política de cobrança de falhas: D-02. RN-IA-01 a RN-IA-10.

### RF-13 e RF-14 — Revisão, metas, XP e conquistas

**Confirmado F08:** regras determinísticas RN-APR-01 a RN-APR-12. Revisão espaçada é heurística; não certifica retenção. Dois acertos consecutivos indicam domínio inicial. Meta diária varia no perfil; XP não representa aprovação da aula.

**Separação atual:** motor legado guarda calendário e XP; progresso de curso usa outra estrutura com posição/assinatura/resultados e nenhum XP. Revisão da interface consulta cards/quizzes incorporados; um motor capaz de guardar IDs de jogos não implica que a fila já os inclua.

**Aceite:** evento repetido não pontua; erro agenda hoje; acertos usam intervalos de 1, 3, 7, 14 e 30 dias; calendário é São Paulo; conquista já registrada não é retirada por mera mudança de meta; duplicação em cache de eventos tem horizonte de 500, não deduplicação eterna.

### RF-15 e RF-16 — Dados locais e recuperação

**Confirmado F01/F09:** persistência por UID no navegador; logout não apaga; trocar dispositivo exige backup, não há sincronização remota. Quota de localStorage é do navegador e pode ser inferior ao total permitido por vários arquivos individuais.

**Backup:** valida antes de confirmar; limite de arquivo de 24 MiB; substitui conjuntos incluídos e preserva os omitidos nos backups antigos; destino é o UID autenticado. Compensação de falha não é transação ACID e pode também falhar. Usuário deve ser informado quando reversão não for confirmada.

**Remoção:** curso removido não apaga XP/progresso; excluir pacote não remove automaticamente eventos; Reiniciar progresso restaura o progresso geral, incluindo notas, nome/meta e conquistas, mas não apaga cursos, pacotes ou progresso de cursos. Esse escopo precisa estar claro no texto da interface, GAP-10.

**Aceite:** uma conta não carrega por engano o namespace de outra; armazenamento negado informa falha sem anunciar persistência; backup inválido não altera dados; limpar dados do site é perda local; namespaces não equivalem a criptografia. RN-DAD-01 a RN-DAD-10.

### RF-17 — Apresentação e matemática

**Confirmado F01/F10:** notação matemática visual em texto, exemplos, alternativas e feedback. LaTeX explícito é preferencial; reconhecimento automático cobre padrões simples e deve preservar texto ambíguo.

**Aceite-alvo:** fração, raiz, expoente negativo, conjuntos e notação científica são legíveis; fórmula inválida preserva o texto; HTML arbitrário não executa; matemática explícita não recebe dupla transformação; leitura por teclado e indicador de foco são preservados. A ampliação de GAP-11 foi aplicada a conteúdo, alternativas e feedback dos componentes auditados; edição/JSON e seletores nativos permanecem textuais.

## 8. Qualidade e requisitos não funcionais

| ID | Regra e aceite | Estado |
|---|---|---|
| RNF-01 | Autorizar no servidor toda operação paga, sem confiar em botão oculto ou UID informado pelo cliente | Confirmado F01/F02; verificar também quotas |
| RNF-02 | Chaves somente servidor; arquivos locais de configuração ignorados; nenhuma credencial nos documentos, exportações ou logs | Confirmado F01/código |
| RNF-03 | Validar contratos antes da persistência e antes de considerar saída de IA utilizável | Confirmado F03/F06/F07 |
| RNF-04 | Preservar entrada e estado anterior em erro; se compensação falhar, declarar incerteza | Confirmado F03/F09 |
| RNF-05 | Layout responsivo, contraste legível, rótulos de ícone, foco e estado sem depender apenas de cor | Confirmado pela direção F01; homologação visual pendente |
| RNF-06 | Conteúdo longo dividido por unidade didática; permitir expansão/rolagem quando necessário sem corte de texto ou controles | Proposto como critério de execução da compactação confirmada |
| RNF-07 | API com timeout, erros distinguíveis e tentativas limitadas; nenhuma promessa de sucesso contra indisponibilidade do fornecedor | Confirmado F07, parcial |
| RNF-08 | Não repetir custo de material já validado sem intenção explícita de regeneração | Confirmado pela intenção de reutilização; invalidação depende D-04 |
| RNF-09 | Avisar quais dados seguem à IA; não enviar token Firebase, senha ou chave como conteúdo ao fornecedor | Proposto para interface; transporte por servidor implementado |
| RNF-10 | Catálogo, banco e progresso versionados; migrações preservam dados compatíveis | Confirmado pelos contratos atuais; versão integrada depende D-03 |

Não há SLO, orçamento financeiro, concorrência máxima ou meta de latência aprovada. Timeouts do código são configuração técnica atual, não promessa de desempenho. Política de retenção do fornecedor e avisos de privacidade para produção são D-05.

## 9. Arquitetura atual e alvo

### 9.1 Atual confirmado

Aplicação Next.js/React/TypeScript com componentes de interface, hooks de persistência, schemas Zod e motor determinístico de aprendizado. Firebase Authentication fornece identidade; Firebase Admin verifica token/revogação. Cursos, jogos e progresso residem no navegador. Rotas Next.js chamam o Gemini por HTTPS com segredo de servidor. Não há Firestore ou Storage de cursos implementado.

~~~mermaid
flowchart LR
    subgraph NAVEGADOR["Navegador do usuário"]
        UI["Meus cursos, aulas e jogos"]
        LOCAL[("Dados locais por UID")]
        UI -->|"Validar e gravar"| LOCAL
    end
    subgraph SERVIDOR["Servidor da aplicação"]
        API["Rotas de acesso, tutor e banco"]
        AUTH["Verificar token e allowlist"]
        ADAPTADOR["Validar pedidos e chamar IA"]
        API --> AUTH
        AUTH -->|"Somente autorizado"| ADAPTADOR
    end
    FIREBASE["Firebase Authentication"]
    GEMINI["Gemini API"]
    EXTERNA["IA externa escolhida pelo usuário"]
    UI -->|"Login"| FIREBASE
    UI -->|"HTTPS com Bearer"| API
    AUTH -->|"Verificar revogação"| FIREBASE
    ADAPTADOR -->|"HTTPS com chave do servidor"| GEMINI
    UI -->|"Copiar prompt manualmente"| EXTERNA
    EXTERNA -->|"Arquivo importado pelo usuário"| UI
~~~

O diagrama representa a comunicação atual, sem afirmar que há quota durável no servidor. O token Firebase autentica a chamada à aplicação; ele não é encaminhado como prompt para o Gemini.

### 9.2 Alvo proposto

Preservar a arquitetura vigente e acrescentar um contrato canônico de banco, adaptadores dos cinco jogos e avaliação objetiva. Um serviço de quota no servidor precisa proteger operações pagas. Mantém-se o material de estudo local por escolha confirmada; contadores de quota devem ser verificáveis pelo servidor, não apenas por localStorage. Meio de persistência desse contador: D-02. Não reintroduzir Firebase como banco de cursos sem decisão.

O anexo define fronteiras e dados atuais, e apresenta o contrato lógico futuro como proposta. Não há novo schema executável publicado por este PRD.

## 10. Operação e métricas

O ambiente precisa de configuração pública do Firebase, credenciais Firebase Admin, proprietário/allowlist e chave/modelo Gemini. Valores reais nunca compõem documentos ou commits. Alteração em configuração de hospedagem exige verificar qual ambiente a consome; teste local não comprova produção.

Registro técnico atual da geração inclui status HTTP e categoria do erro, não conteúdo integral. Auditoria de uso, contabilização de tokens, política de retenção e painel de custo ainda não existem. Geração em andamento depende da página aberta; não prometer processamento em background ou recuperação automática de resposta ainda não salva.

| Métrica | Definição e fonte possível | Estado |
|---|---|---|
| Importação válida | Arquivos aceitos / tentativas, separados por tipo de contrato | Proposta; sem coleta central |
| Conclusão objetiva | Aulas aprovadas pela regra de 80% / aulas iniciadas | Alvo; depende RF-07 |
| Cobertura do banco | Aulas com itens válidos / aulas do curso, por revisão | Alvo; depende RF-08 |
| Qualidade editorial | Erros de gabarito/ambiguidade na amostra revisada e vínculo com fonte | Proposta; conjunto de referência a definir |
| Confiabilidade de IA | Sucessos, 429, 503, timeout e rejeição estrutural separados | Proposta; respostas de erro já parcialmente distinguíveis |
| Uso e custo | Tokens/chamadas por usuário e janela, incluindo tentativas | Pendente D-02; não coletar conteúdo pessoal por conveniência |

Não há metas numéricas de negócio aprovadas além da aprovação a 80% e da meta editorial de 10 itens/aula.

## 11. Evolução e rastreabilidade

| Entrega funcional | Requisitos | Dependências e conclusão |
|---|---|---|
| Acesso e autorização consistentes | RF-01/RF-18 | Resolver GAP-01 e D-02; cobrir autorização e consumo em testes |
| Banco canônico e compatibilidade | RF-03/RF-04/RF-08/RF-10 | D-03/D-04; mesma origem de item nas cinco modalidades e migração validada |
| Avaliação objetiva na aula | RF-05/RF-06/RF-07 | Banco e D-01; exemplos 7/10 e 8/10 verificados |
| Suporte contextual confiável | RF-11/RF-17 | Corrigir vínculo de resposta e matemática; não vazar resposta de outra etapa |
| Geração retomável com quota | RF-12/RF-18 | D-02/D-04; reservar limite e evitar reaproveitamento obsoleto |
| Navegação, dados e regressões | RF-02/RF-09/RF-13 a RF-16 | Corrigir gaps de navegação, mensagens e testes existentes |

O próximo plano deverá ser único, sequencial e versionado, preservando os IDs já publicados quando aplicáveis. Cada etapa terá ID próprio do plano, escopo e aceite; uma task será detalhada quando a etapa começar. PRs devem citar ID da etapa e versão do plano. IDs RF/RN deste PRD são funcionais e não substituem IDs de etapa. Novos itens não renumeram os existentes nem apagam evidências de entregas anteriores.

## 12. Decisões e prontidão

Decisões confirmadas nesta elaboração: **80% nos desafios obrigatórios**, **geração de banco para usuários autorizados com limite de uso**. Sua origem e impacto estão registrados também no diagnóstico.

Pendências localizadas: D-01 (rodadas e novas tentativas), D-02 (quota e orçamento), D-03 (formato integrado e migração), D-04 (invalidação por revisão), D-05 (retenção/privacidade do fornecedor), D-06 (escopo de acesso offline futuro). Elas não impedem a documentação ou correções independentes, mas impedem tratar as capacidades afetadas como especificação pronta para implementação completa.

O PRD está pronto como inventário funcional consolidado e base para decisões. Banco compartilhado, avaliação objetiva e quota permanecem em especificação nos pontos acima. A aplicação atual não foi homologada por esta entrega.

## 13. Histórico e validação

| Versão | Data | Alteração |
|---|---|---|
| 1.0.0 | 16/11/2026 | Consolidação de produto, regras, contratos, decisões expressas e diagnóstico de implementação |

Conferência documental: relações entre RF/RN, fontes locais, tipos, fórmulas, estados e links relativos. Diagramas: conferir o registro real de validação no [diagnóstico](diagnostico-evolua.md#4-verificações-executadas). Testes executados nesta revisão não equivalem aos aceites futuros. A suíte inicial tinha 80 aprovações e 14 falhas; houve uma solicitação adicional de matemática global durante a elaboração, implementada e testada separadamente. O diagnóstico registra a execução final e suas limitações.
