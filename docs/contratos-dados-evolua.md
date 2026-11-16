# Evolua — Contratos, dados e integrações

Versão 1.0.0 · 16/11/2026 · Anexo do [PRD](PRD-EVOLUA.md). Regras normativas: [catálogo](regras-negocio-evolua.md).

As seções 1–4 e 6–8 descrevem o contrato atual confirmado no código. A seção 5 é proposta de evolução, ainda não aceita pelo importador. Exemplos usam apenas dados sintéticos. Não incluir segredos ou copiar conteúdo integral de cursos pessoais em logs.

## 1. Curso — evolua-course-pack v1

Objetos são estritos: campos extras são rejeitados. Strings são não vazias após trim, salvo listas que possam ser vazias. Normalização de importação usa Unicode NFKC, quebras LF, compactação de espaços horizontais e trim, sem coerção de tipos. IDs: 2 a 64 caracteres; padrão ^[a-z0-9][a-z0-9-]*$; unicidade global no arquivo.

### 1.1 Raiz

| Campo | Tipo/condição | Limite |
|---|---|---|
| schema | Literal evolua-course-pack | Obrigatório |
| version | Inteiro literal 1 | Obrigatório |
| id | ID estável | 2–64 caracteres |
| revision | Inteiro positivo | Obrigatório, 1 em curso novo por orientação editorial |
| title | String | 160 caracteres |
| description | String | 4.000 caracteres |
| audience | Objeto description + priorKnowledge | description até 4.000; priorKnowledge lista de 0–10 strings de até 240 |
| level | iniciante, intermediario ou avancado | Sem acentos nesses enums |
| prerequisites | Lista de objetos id/title/description | 0–12; descrição até 240 |
| scope / exclusions | Listas de strings | 0–20 por lista; 12.000 caracteres por item |
| objectives | Lista de objetivos | 1–50 |
| sources | Lista de fontes | 1–100 |
| modules | Lista ordenada de módulos | 1–20 |
| editorial | status, notes e opcionais reviewer/reviewedAt | Ver seção 1.4 |

### 1.2 Hierarquia e vínculos

| Registro | Campos obrigatórios | Coleções e tipos |
|---|---|---|
| Objetivo | id, title, description, evidenceOfLearning | evidenceOfLearning: 1–6 strings de até 240 |
| Fonte | id, title, kind, locator, excerpt | kind: book/article/pdf/web/internal/other; locator até 240; excerpt até 4.000 |
| Módulo | id, title, description, order, objectiveIds, lessons | 1–20 aulas |
| Aula | id, title, description, order, objectiveIds, sections, activities | 1–30 seções e 1–20 atividades |
| Seção | id, title, order, objectiveIds, sourceIds, blocks | 1–20 blocos |
| Listas de vínculos | objectiveIds, sourceIds ou sectionIds | 1–20 strings de IDs existentes |

order é inteiro positivo e coincide com posição+1 em cada coleção. Todo title tem até 160; description até 4.000, exceto pré-requisito. Atividade pode atualmente referenciar qualquer seção do curso, não só da sua aula; a restrição desejável está registrada como GAP-15.

### 1.3 Blocos didáticos

Todos exigem id e type. A coluna de conteúdo lista os demais campos; ausência é erro.

| type | Conteúdo obrigatório | Tipos e cardinalidade |
|---|---|---|
| text | text | String até 12.000 |
| list | ordered, items | Boolean JSON; lista de 1–20 strings até 2.000 cada |
| resolved-example | title, prompt, steps, conclusion | steps: 2–12 objetos estritos id/action/reasoning; prompt, action, reasoning, conclusion até 12.000 |
| counterexample | title, situation, commonMistake, correction, whyItMatters | Cada corpo até 12.000 |
| synthesis | keyPoints, takeaway | 2–10 strings até 12.000; takeaway até 12.000 |
| analogy | familiarSituation, concept, mappings, limits, returnToConcept, question | mappings: 2–8 objetos id/familiar/concept; limits: 1–5 strings; corpos até 12.000, question até 240 |

IDs de steps e mappings também entram na unicidade global. Objetos desconhecidos, HTML e scripts não são formato de conteúdo autorizado.

### 1.4 Atividades e editorial atuais

Atividades têm id, type, title, objectiveIds, sectionIds, prompt, expectedAnswer e feedback. prompt/expectedAnswer/feedback são strings até 12.000. **Não há options ou correctOptionIndex no schema de atividades do curso atual.**

| type | Campos adicionais |
|---|---|
| comprehension | Nenhum |
| application | scenario: string até 12.000 |
| transfer | scenario e constraints: lista de 1–8 strings de até 240 |

Exemplo válido do campo que originou falhas de importação:

~~~json
{"constraints":["Utilize apenas os dados apresentados."]}
~~~

Uma string diretamente em constraints é inválida. O teto de 8 corresponde a itens, não a caracteres; cada string tem teto próprio de 240.

Editorial: status = draft/reviewed/approved; notes = lista de até 10 strings de até 240, com padrão vazio. reviewer é string opcional até 240; reviewedAt é string no formato AAAA-MM-DD. reviewed/approved exigem ambos. O schema verifica o formato da data, não autentica pessoa/revisão nem garante calendário editorial real.

### 1.5 Limites agregados e invariantes

| Recurso | Limite |
|---|---|
| Curso serializado em UTF-8 | 2 × 1.024 × 1.024 bytes |
| Aulas totais | 200 |
| Blocos totais | 1.000 |
| Atividades totais | 300 |
| Blocos por aula | 60 |
| Texto acumulado por aula | 60.000 caracteres; implementação soma todas as strings da aula, inclusive metadados |
| Texto por corpo de bloco/atividade | 12.000 caracteres |

Cada objetivo precisa aparecer em seção explicativa e atividade. IDs e referências são conferidos. Isso comprova integridade estrutural, não que a explicação ensina o objetivo ou a fonte sustenta a afirmação. Avisos editoriais sinalizam ausência de exemplo, contraexemplo, síntese, analogia ou variedade de atividades; não são uma revisão factual automática.

Prévia por texto admite BOM e um bloco externo Markdown JSON; importação de arquivo de curso usa JSON puro. Arquivo de plano/módulo incremental tem protocolo de trabalho diferente e não é curso importável. Normalização NFKC pode alterar símbolos tipográficos; fórmulas devem preferir TeX explícito e têm validação de apresentação própria.

## 2. Jogos — evolua-game-pack v1/v2

Raiz estrita: schema literal evolua-game-pack; version 1 ou 2; id; title; description; modules; revision e sources opcionais no v1, obrigatórios por validação no v2.

| Recurso | Contrato atual |
|---|---|
| Tamanho do pacote | Até 1 MiB |
| Coleção personalizada | Até 20 pacotes; IDs distintos; metodologia-cientifica reservado |
| Módulos por pacote | 1–20 |
| Itens por modalidade/módulo | 0–50 em cada array |
| Texto curto | 1–240 caracteres |
| Texto longo | 1–2.000 caracteres |
| IDs | Mesmo formato de 2–64; unicidade global no pacote |

Módulo: id/title/description/pairs/trueFalse/multipleChoice. No v2, objectives e difficulty também exigidos. objectives tem 1–20 objetos id/description; difficulty usa **iniciante/intermediário/avançado**, com acentos diferentes do level de curso.

| Array | Campos obrigatórios do item | Invariantes |
|---|---|---|
| pairs | id, prompt, answer, explanation | prompt/answer curtos; explanation longo; prompts e respostas únicos após NFKC/trim/espaços/case |
| trueFalse | id, statement, answer, explanation | statement/explanation longos; answer boolean |
| multipleChoice | id, question, options, correctOptionIndex, explanation | 2–6 alternativas curtas e distintas; índice inteiro válido de base zero; explicação longa |

optionExplanations pode existir no v1 e é obrigatório no v2: lista de 2–6 textos longos, mesmo tamanho de options. Cada item do v2 exige objectiveId existente no módulo e sourceIds existentes, de 1–20 IDs. Esses vínculos são opcionais no v1, mas, se presentes, são validados.

Fontes de jogo: id/title/locator/excerpt; título/localizador até 240, trecho até 2.000, 1–100 fontes quando presente. Um módulo deve conter ao menos dois pares ou uma questão V/F ou alternativas. Um único par isolado não basta para tornar módulo jogável.

Pacotes antigos não têm vínculo obrigatório com ID/revisão/aula de um curso. Correspondência de título não é identidade confiável. A geração atual usa v1 e coloca somente multipleChoice; arrays pairs e trueFalse ficam vazios.

## 3. Progresso e persistência

### 3.1 Namespace

Chave atual: evolua.user.v1:{UID codificado com encodeURIComponent}:{recurso}. Recursos implementados incluem progress, game-packs, ai-preference, course-packs, course-drafts e course-progress. tutor-state e accompaniment-state são reservados no helper, não garantem persistência dessas funcionalidades.

| Recurso | Dados |
|---|---|
| progress | versão 1, nome, meta, XP, dias, itens, IDs processados, notas e conquistas |
| game-packs | Array validado de pacotes personalizados |
| course-packs / course-drafts | Objeto schema evolua-course-collection, version 1, items |
| StoredCourse | pack + importedAt/updatedAt em datetime ISO com offset |
| course-progress | Record por id:revision; lesson e results por activity.id |
| ai-preference | Identificador da IA externa escolhida pelo usuário |

Progresso geral: name até 40; goal inteiro 5–50; contadores não negativos até 100.000.000; confidence 0–3; processed até 500 strings de até 100; notes até 20.000 caracteres por entrada; earned até 100 IDs. Dias usam AAAA-MM-DD. O modelo guarda acumulados, não um ledger imutável de cada resposta.

Progresso de curso: lesson inteiro ≥0; results com correct boolean, attempts inteiro positivo, due numérico finito e signature string. Não contém ainda pontuação de rodada objetiva, revisão do banco, conclusão explícita, respostas do aluno ou etapa atual. Uma nova revisão do curso usa outra chave lógica de progresso.

### 3.2 Consistência e exclusão

Cursos ativos/rascunhos são escritos com captura do snapshot e reversão compensada em caso de falha. Não há transação de navegador entre as duas chaves. Progresso geral preserva estado em memória anterior se a gravação falhar. Eventos storage atualizam abas, sem controle de versão para impedir perda em concorrência.

Excluir curso/pacote não apaga seu progresso. Reset de Progress não limpa course-progress ou coleções. Não há exclusão remota, criptografia de conteúdo ou expurgo automático de namespaces de usuários antigos. Essas características são limites atuais, não afirmação de conformidade jurídica.

### 3.3 Backup

Arquivo: app literal evolua, progress obrigatório; packs/courses/courseDrafts/courseLearning opcionais. Perfil acrescenta exportedAt na exportação. Importador impõe 24 MiB. Validação antecede confirmação; restauração substitui apenas conjuntos presentes, no namespace do UID atual, e tenta rollback se uma escrita falhar. Nenhum UID no backup concede acesso. ai-preference e conversas de tutor não entram no backup atual.

## 4. Autoria incremental atual

O construtor local aceita subject/materialBase/audience/priorKnowledge/objective/level/scope/exclusions/depth/moduleCount/lessonsPerModule, com aliases internos para alguns campos. Nem toda opção do builder é um campo visível na interface. Padrão de planejamento: 4 módulos e 3 aulas por módulo, ajustável na UI; não é limitação de curso.

Plano de trabalho: protocol evolua-course-plan-v1, courseId, course, objectives, sources, modules. Módulo intermediário: protocol evolua-course-module-v1, courseId, module, coveredObjectiveIds, sourceIdsUsed, review. Esses envelopes constam no prompt, sem schema/importador implementado na aplicação.

Na versão atual do prompt, MONTAR PACOTE FINAL gera curso.json e GERAR ARQUIVO DE JOGOS gera jogos.json, que projeta o banco para as três modalidades aceitas pelo schema legado. Isso não cumpre ainda o alvo de importação única integrada nem faz flashcards/quizzes importados funcionarem automaticamente.

## 5. Banco compartilhado alvo

**Estado:** necessidade confirmada pelo proprietário; contrato físico proposto, dependente de D-03. Nenhum exemplo desta seção deve ser colado no importador atual esperando aceitação.

### 5.1 Modelo conceitual

| Grupo proposto | Dados necessários e razão |
|---|---|
| Identidade | ID do item e revisão; curso e revisão, módulo, aula e objetivo para impedir mistura e permitir invalidação |
| Evidência | IDs de fontes/seções; vínculo semântico precisa de revisão, além de existência estrutural |
| Aprendizagem | Conceito/habilidade, dificuldade e tipo compreensão/aplicação/transferência |
| Recuperação | Pergunta, resposta textual e explicação para flashcards |
| Escolha | Quatro alternativas, índice/ID correto e quatro feedbacks para quiz/alternativas |
| Associação | Conceito e definição curta para pares; unicidade no conjunto selecionado |
| Julgamento | Afirmação verdadeira e falsa, com justificativas próprias, sem fabricação por troca aleatória |
| Editorial | Origem declarada, versão do prompt/modelo quando gerado e estado de revisão, sem alegar revisão humana fictícia |

Não converter uma demonstração longa em par ilegível: decompor em conceitos menores durante autoria. A representação deve avaliar o mesmo conhecimento. Um item universal precisa passar na validação de todas as representações.

### 5.2 Proposta de integração e compatibilidade

Adotar um envelope versionado que contenha curso e banco vinculado; definir nome e versão em D-03 antes de implementar. O novo importador deve validar os dois conjuntos e suas referências antes de efetivar a ativação. Se qualquer parte falhar, não ativar metade sem decisão explícita do usuário. Mecanismo transacional/compensação será definido na etapa técnica; não presumir transação ACID de localStorage.

Preservar importadores de cursos v1 e jogos v1/v2. Conteúdo legado sem representações pode ser enriquecido com IA ou mantido restrito às modalidades que suporta. Não atribuir automaticamente a mesma revisão do banco a um curso editado. Avaliação de aula precisa da referência exata do gabarito usado.

**Impedimentos atuais:** course activities não aceitam alternativas; game-pack não aceita banco canônico/lessonId; flashcards/quizzes usam outra origem de dados; coleção de jogos limita arrays a 50 por módulo e pacote a 20 módulos. Um banco integrado maior não deve ser fragmentado sem definição de contrato e sem exibir a relação real com o curso.

## 6. APIs implementadas

Todas usam autenticação Bearer Firebase validada pelo servidor. Não documentar credenciais reais em exemplos.

| Endpoint POST | Entrada atual | Saída e limites |
|---|---|---|
| /api/auth/access | Token no header, sem conteúdo pedagógico necessário | allowed/canGenerate; no-store/private; Vary Authorization |
| /api/tutor | action explain/analogy; question; lesson; context como string | message; 32.000 caracteres de corpo, pergunta 1.000, título 160, contexto 24.000; timeout 30 s; até 1.800 tokens de saída |
| /api/game-bank | material como string com módulo serializado | items de múltipla escolha validados; corpo até 100.000 caracteres, material até 90.000; saída até 8.000 tokens |

Geração usa responseSchema Gemini com 10 itens e 4 opções/feedbacks por item. Validação local aceita 1–20 itens pelo schema de retorno e mantém regras do choiceGameItemSchema. Essa diferença entre solicitação e verificação não significa garantia de exatamente 10 questões em todo cenário.

Retentativas da geração: até 3, timeout de 50 s por tentativa e esperas de 1/2 s; status transitórios 502/503/504 e erros de transporte. A rota declara duração máxima de 180 s, sujeita ao limite efetivo da hospedagem. O tutor não usa esse helper de repetição.

### 6.1 Erros

| Condição | Comportamento atual/requisito |
|---|---|
| Token ausente/inválido/revogado | Negar antes da chamada paga |
| Usuário não autorizado | 403 |
| Configuração ausente | 503 de configuração; distinguir do 503 remoto |
| Pedido excede limite de corpo | 413 |
| Pedido inválido de tutor | 400; JSON malformado cai atualmente no catch genérico 502 |
| Schema de material/banco inválido | Geração responde 422 com até três caminhos de erro |
| Gemini 429 | Mensagem de quota/limite; não contar como curso inválido |
| Gemini 400/403/404 | Mensagem de parâmetro/acesso/modelo; status público geralmente 502 |
| Gemini 503 | Repetir segundo helper da geração; informar indisponibilidade se persistir |
| Timeout da geração | 504 após esgotar tentativas |
| Saída truncada/sem texto | Rejeitar, não persistir JSON parcial |

Mensagens não devem expor chave ou corpo integral do provedor. Log atual da rota de banco contém apenas status HTTP e categoria. Não há auditoria central de consumo.

### 6.2 Envio e retenção

Tutor envia pergunta/título/contexto ao Gemini; geração envia o módulo local serializado. Conteúdo pode ter dados pessoais inseridos pelo aluno; não presumir anonimização. Token Firebase é usado no servidor para autenticação e não entra no prompt ao fornecedor. Retenção contratual do fornecedor e aviso ao usuário precisam de D-05 antes de alegar política de privacidade definida.

Chave e modelo são variáveis de servidor GEMINI_API_KEY e GEMINI_MODEL. O modelo é configurável; mudança não comprova disponibilidade, quota ou qualidade. Não registrar chave ou modelo como garantia de serviço. Firebase exige configuração pública do app, credenciais Admin e UIDs de controle; Firebase não é usado como repositório de cursos.

## 7. Matemática e apresentação de conteúdo

Renderizador comum: MathText com KaTeX, output htmlAndMathml, trust false e limite de expansão. TeX explícito usa $...$, $$...$$, ou delimitadores equivalentes com parênteses/colchetes. Barras invertidas em JSON precisam ser escapadas. Fórmula inválida preserva texto.

Reconhecimento automático conservador: frações numéricas, operações, expoentes, raízes numéricas e notação científica; datas e URLs são preservadas. A expressão da interface 3/4 - (1/6 - 1/3) e as opções 11/12, 7/12, 1/2 e 5/12 integram os testes. LaTeX explícito não é reprocessado como notação informal.

Conteúdo exibido em aulas, jogos, sessões, biblioteca, fontes e prévias passa pelo componente comum. Campos de edição e JSON permanecem brutos. Elementos nativos option não suportam a mesma marcação matemática; atributos acessíveis e rótulos técnicos também não recebem HTML KaTeX. Não prometer reconhecimento de qualquer expressão ambígua em linguagem natural ou alterar dados persistidos apenas por renderização.

## 8. Operação e compatibilidade

Stack confirmada pelo manifest: Next.js 16.4.3, React 19.3.1, TypeScript, Zod, Firebase cliente/Admin e KaTeX. Números são os declarados no repositório, não recomendação de atualização. Hospedagem e disponibilidade efetivas precisam de verificação de ambiente.

Service worker ignora /api/ e métodos não GET; guarda recursos de mesma origem e tenta rede antes do cache. Cache de shell não substitui a autorização online. Conteúdo Android original e cópia web devem continuar sincronizados pelo procedimento existente; não existe importador automático de progresso Android.

Uma futura migração deve preservar conteúdo, IDs/revisões válidos e backups antigos, informar incompatibilidades e relacionar progresso ao banco correto. Controle de quota precisa ser compartilhado no servidor, mesmo com material de estudo local. Persistência exata, limites e contador são D-02; sincronização remota de cursos segue fora do escopo atual.
