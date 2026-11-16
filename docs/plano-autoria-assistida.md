# Plano de autoria assistida e qualidade de conteúdo

## Baseline 2.0 — Cursos completos e aprendizado guiado

Atualização de direção em 16/11/2026: por solicitação do responsável, a aplicação passa a exigir conta de e-mail/senha previamente cadastrada e UID autorizado no servidor. Substitui as referências a estudo/importação por visitante e login Google das propostas anteriores. O proprietário controla acesso geral; geração permanece exclusiva do proprietário. Configuração operacional e limites documentados em `docs/firebase-auth.md`. Demais épicos pedagógicos permanecem propostos.

Data: 16/11/2026. Estado: proposto para implementação; nenhuma etapa desta baseline foi executada. Esta seção orienta a próxima evolução. As seções anteriores à baseline 2.0, mantidas abaixo como histórico, descrevem a autoria assistida já entregue; em caso de divergência de direção futura, prevalece esta baseline.

### Objetivo e decisões de produto

**Confirmado pelo pedido:** preservar a implementação de autoria, desativar temporariamente sua oferta ao usuário, priorizar importação de material, apresentar o assunto com profundidade antes da prática e oferecer suporte por API para dúvidas e analogias. O conteúdo precisa cobrir o assunto dentro de um escopo declarado, com fundamentação e progressão pedagógica.

**Confirmado no repositório:** a web usa Next.js, React, TypeScript e Zod; possui curso incorporado, jogos, biblioteca, revisão e progresso local. A autoria atual gera prompts para IA externa e importa pacotes de jogos v1/v2; não há geração de cursos por API, autenticação ou backend de tutoria. O plano abaixo propõe uma nova capacidade de curso, preservando os pacotes existentes. Não foi encontrado PRD nem checklist de segurança específico no projeto; os pedidos desta conversa são a origem funcional desta baseline.

**Proposto:** execução em duas entregas publicáveis: A, cursos explicativos importáveis e prática conectada; B, tutor contextual por API. Android, geração automática de cursos, correção automática de discursivas, pagamentos e sincronização de contas ficam fora deste plano. Contas podem tornar-se dependência da publicação do tutor conforme a decisão de controle de acesso.

### Jornada e regras compartilhadas

1. Importar arquivo JSON de curso ou pacote legado; validar, examinar prévia e confirmar ativação. Erros mantêm o conteúdo anterior e o texto informado disponíveis.
2. Escolher curso e módulo; consultar objetivos, pré-requisitos e escopo. Ler aulas em sequência sugerida, podendo navegar livremente.
3. Estudar explicações, exemplos resolvidos, aplicações e contrapontos; consultar fontes e síntese.
4. Praticar atividades vinculadas aos objetivos e às seções da aula. Após responder, receber justificativas e acesso direto a “Rever este conceito”.
5. Solicitar pista, outra explicação, exemplo, analogia ou dúvida livre. Antes da resposta, pistas e analogias respeitam o modo de tentativa; após responder, o tutor pode discutir a solução completa.
6. Retomar leituras e revisar erros. Leitura, conclusão declarada e desempenho permanecem indicadores distintos.

Não exigir leitura completa para liberar jogos. Ler, abrir o tutor ou pedir analogia não gera XP nem domínio. Preservar as regras atuais de atividades: primeiro evento do item/dia rende 12 XP no acerto ou 4 no erro; segunda e terceira tentativas rendem 2 cada; seguintes rendem zero. Evento repetido não pontua novamente. Dois acertos consecutivos indicam domínio inicial; erro reinicia a sequência e agenda hoje; acertos usam 1, 3, 7, 14 e 30 dias. Calendário America/Sao_Paulo. Não interpretar esses indicadores como certificação.

Atividades de cursos usam chaves compostas por curso, tipo e item, sem colisão com IDs legados. IDs estáveis preservam histórico; mudança material da resposta deve exigir nova revisão e explicitar o efeito sobre o progresso antes da ativação. Proposta: invalidar domínio apenas dos itens alterados, mantendo XP e histórico anteriores; definir a representação na etapa EP-103 antes de implementá-la.

### Critérios de profundidade e revisão editorial

O curso declara público, nível, pré-requisitos, objetivos observáveis, assuntos incluídos e assuntos excluídos. “Completo” significa cobrir esse escopo; não prometer esgotar uma área inteira.

Cada objetivo precisa de explicação fundamentada e atividade vinculada. Cada módulo deve conter, distribuídos em suas aulas:

- Introdução com propósito, pré-requisitos e relação com o conhecimento anterior.
- Definições precisas e desenvolvimento do porquê e do como; etapas, relações, pressupostos e limites pertinentes ao assunto.
- Exemplo resolvido, com passos e justificativas, e aplicação em situação diferente da apresentação inicial.
- Erros comuns, distinções entre conceitos próximos e contraponto ou contraexemplo quando aplicável.
- Síntese, perguntas de recuperação e referências verificáveis associadas às afirmações centrais.
- Atividades que exijam compreensão, aplicação e transferência para cenário novo; questões de reconhecimento podem complementar essa cobertura.

Analogias complementam a explicação formal. Toda analogia apresenta situação familiar, correspondências explícitas, limites da comparação, retorno ao conceito e uma pergunta curta de compreensão. O aluno pode escolher contexto, como cozinha, esporte ou cotidiano, sem fornecer dados pessoais.

Exceções pedagógicas devem ter justificativa editorial; não criar exemplos artificiais apenas para preencher campos. Texto extenso, referências presentes e validação estrutural não comprovam qualidade factual. A validação automática verifica existência e vínculos; revisão humana verifica correção, profundidade, clareza, dificuldade e fidelidade às fontes.

Gate editorial proposto: todos os objetivos cobertos por explicação e prática; nenhum erro factual crítico, fonte inventada, resposta ambígua ou lacuna essencial conhecida; exemplos e aplicações suficientes para demonstrar o raciocínio. Revisor registra responsável, data, revisão e pendências. Curso sem revisão pode ser importado como rascunho, mas precisa de reconhecimento explícito do usuário para uso pessoal; não recebe selo de qualidade. A inclusão no catálogo incorporado exige revisão editorial aprovada. Não inventar avaliação numérica automática de qualidade.

### Arquitetura e contrato propostos

Separar contrato de curso do contrato `evolua-game-pack`: novo formato `evolua-course-pack` v1, com adaptador de atividades para reutilizar jogos. Pacotes de jogos continuam aceitos e aparecem como prática avulsa, sem aulas fabricadas. Centralizar limites e geração de diagnósticos no contrato, como já ocorre com jogos.

Campos obrigatórios: schema/version, ID e revisão do curso, título, descrição, público, nível, pré-requisitos (lista pode ser vazia), escopo e exclusões, objetivos, fontes, módulos ordenados, aulas e atividades. Objetivos, fontes, módulos, aulas, seções e atividades têm IDs únicos no curso. Atividades vinculam objetivos e seções; seções vinculam fontes quando sustentam afirmações. Fontes contêm título, localizador disponível e trecho pertinente; nunca fabricar página ou URL. Revisão editorial declarada é metadado, não autenticação do revisor.

Aulas usam blocos estruturados de texto, listas, exemplos, sínteses e analogias; renderização por componentes controlados, sem HTML arbitrário ou execução de código. Imagens remotas, PDFs anexados e extração automática ficam fora da primeira versão. Não baixar URLs fornecidas nos pacotes pelo servidor.

**Pendentes antes de estabilizar EP-102:** limites de bytes, módulos, aulas, blocos, atividades e texto, definidos com amostras extensas reais; armazenamento local adequado e versionamento de backup. Os limites atuais de jogos (1 MB/pacote, 20 pacotes, 20 módulos, 50 itens por tipo/módulo, textos de 240/2.000 caracteres) continuam valendo apenas para jogos legados. Não impor o teto de 2.000 caracteres a uma aula inteira. Proposta de armazenamento: IndexedDB para cursos e estado de leitura, mantendo progresso legado compatível; confirmar em EP-102 com medição e estratégia de recuperação.

Tutoria usa endpoint de servidor e adaptador de provedor. Chaves ficam no servidor. Solicitação contém ação, pergunta, curso/revisão, aula/seção, atividade, estado da tentativa e contexto mínimo pertinente. Conteúdo importado localmente precisa acompanhar a solicitação de forma limitada; o servidor valida tudo e trata referências como declarações do pacote, sem presumir acesso a um catálogo remoto confiável.

Contexto inclui explicação formal, exemplos e fontes relevantes; não enviar apenas enunciado e gabarito. Se o contexto exceder a capacidade configurada, selecionar seções pelos vínculos e informar insuficiência em vez de truncar silenciosamente evidências essenciais. No modo anterior à resposta, servidor não envia gabarito/justificativas ao provedor, reduzindo vazamento pelo tutor; isso não transforma a aplicação local em ambiente de prova segura.

Resposta estruturada inclui explicação, referências por IDs existentes, limitação de contexto e, em analogias, correspondências/limites/pergunta. Rejeitar referências desconhecidas. Verificação de IDs não garante que a afirmação esteja sustentada; avaliar isso no corpus editorial. O tutor não altera respostas, notas, XP ou regras de correção.

### Sequência de entregas

| Ordem | Épico / PR | Resultado | Dependência | Estado |
|---|---|---|---|---|
| 1 | EP-101 | Autoria oculta e importação preservada | Nenhuma | Planejado |
| 2 | EP-102 | Contrato de curso e referência editorial | Nenhuma | Planejado |
| 3 | EP-103 | Importar, atualizar e recuperar cursos | EP-102 | Planejado |
| 4 | EP-104 | Estudar aulas e retomar leitura | EP-103 | Planejado |
| 5 | EP-105 | Jogos e revisão conectados às aulas | EP-104 | Planejado |
| 6 | EP-106 | Curso piloto completo e entrega A validada | EP-105 | Planejado |
| 7 | EP-107 | Serviço de tutor com limites e provedor simulado | EP-102 e decisões de API | Planejado |
| 8 | EP-108 | Tutor na interface, com analogias | EP-105 e EP-107 | Planejado |
| 9 | EP-109 | Avaliação pedagógica e publicação da entrega B | EP-106 e EP-108 | Planejado |

Cada épico corresponde a um PR coeso. Se o detalhamento exceder esse tamanho, acrescentar IDs sem renumerar os existentes. Desenvolvimento simulado de EP-107 pode avançar sem contratação; publicação com API real depende das decisões abaixo.

### EP-101 — Importação como entrada principal

Extrair a importação do bloco de geração em `game-pack-studio.tsx`; manter validação, correção por diagnóstico, prévia, confirmação, download e exclusão. Ocultar seleção de IA, geração de prompts e links externos por configuração desativada por padrão. Preservar implementação e testes de autoria para reativação controlada. Se existir geração via API em alterações posteriores à inspeção, também bloquear a operação no servidor.

Aceite: usuário importa v1/v2 sem passar por IA; configuração desligada não expõe atalhos de geração; reativação recupera o fluxo anterior; falhas de gravação preservam pacote existente. Evidência: testes de interface dos dois estados e regressão de importação.

### EP-102 — Contrato e modelo pedagógico

Definir schema, limites medidos, vínculos, revisão editorial, compatibilidade e armazenamento; criar arquivo de exemplo completo com um módulo que cumpra os critérios de profundidade. Mapear objetivo → explicação → fonte → atividade e validar referências, duplicações e ordem. Distinguir erro estrutural bloqueante de alerta editorial. Não aceitar versão desconhecida.

Aceite: exemplo válido e legível cobre compreensão/aplicação/transferência; arquivos com vínculos inexistentes ou campos essenciais ausentes são rejeitados com caminho preciso. Limites e decisões de armazenamento ficam incorporados nesta baseline antes de EP-103. Evidência: fixtures válidas, inválidas e nos limites; revisão editorial do exemplo.

### EP-103 — Ciclo de vida dos cursos

Implementar parsing, validação, prévia, rascunho, ativação, atualização e exclusão; incluir cursos e leitura no backup versionado, preservando leitura de backups antigos. Prévia informa substituição e itens alterados. Persistir atualização de curso e efeito sobre domínio como uma operação atômica no armazenamento escolhido. Não apagar histórico/XP ao excluir curso; oferecer recuperação por reimportação dos mesmos IDs. Definir sincronização entre abas conforme o armazenamento, notificando revisão alterada durante sessão e evitando mistura silenciosa de versões.

Aceite: falha de armazenamento não produz ativação parcial; backup exportado restaura curso, leitura e progresso; backup antigo mantém comportamento documentado; duas abas refletem ativação/exclusão. Conteúdo inválido não executa scripts. Evidência: testes de ida/volta, falha transacional, atualização de resposta e concorrência entre abas.

### EP-104 — Leitor e percurso explicativo

Criar catálogo de cursos, visão do módulo e leitor acessível de aulas. Mostrar objetivos, seções, exemplos, fontes, síntese e próxima aula. Salvar posição e conclusão declarada por revisão da aula; alteração de conteúdo sinaliza leitura a retomar. Preservar fontes e hierarquia em celular, teclado e modo offline após carregamento.

Aceite: estudante abre material extenso, navega por seções, retoma posição após recarga e consulta fonte sem perder leitura. Conclusão declarada não gera domínio/XP. Evidência: fluxo completo em navegador móvel/desktop e teste de persistência. Falha no armazenamento apresenta aviso e permite continuar a leitura.

### EP-105 — Prática conectada

Reutilizar jogos e sessões com seleção de curso/módulo, IDs compostos e vínculos de retorno. Feedback leva à seção pertinente; voltar da aula mantém a tentativa atual. Incluir atividades do curso na revisão e calcular métricas no escopo correto. Preservar prática avulsa e curso incorporado existentes.

Aceite: erro retorna ao conceito correto e entra na revisão; dois cursos com IDs locais iguais não compartilham domínio; repetição de evento não duplica XP; leitura e tutor não pontuam. Evidência: cenários de sessão, revisão, navegação e regressão das regras de XP.

### EP-106 — Curso piloto e entrega A

Selecionar com o responsável de conteúdo um assunto e público; produzir um curso piloto cobrindo integralmente seu escopo, com mais de um módulo e progressão entre conceitos. Revisar o material incorporado antes de apresentá-lo como curso completo; não converter automaticamente flashcards em aulas. Registrar autoria/licença, fontes e revisão. A extensão do piloto é decidida pelo escopo e cobertura, não por número de páginas.

Aceite: matriz de cobertura sem objetivo essencial descoberto; exemplos resolvidos e aplicações novas; avaliação humana sem falha crítica pendente; usuário importa, estuda, pratica, revisa e restaura backup com tutor desativado. Evidência: parecer editorial, arquivo do curso, roteiro manual e testes/build/typecheck. Entrega A pode ser publicada independentemente da API.

### EP-107 — Serviço de tutoria

Implementar validação do pedido/resposta, montagem de contexto, adaptador de provedor, timeout, cancelamento e limitação de uso. Provedor simulado funciona localmente sem chave e é explicitamente isolado da produção. Publicação exige controle de acesso e orçamento definidos. Rate limit e teto financeiro são aplicados no servidor; não confiar no contador do navegador. API não pode funcionar como proxy genérico de prompts.

Tratar pergunta e material como dados não confiáveis; instruções dentro de fontes não mudam o papel do tutor. Resposta não executa HTML ou ferramentas. Não buscar URLs do pacote. Evitar logs integrais de perguntas, respostas e material; registrar somente identificador de requisição, resultado, latência e consumo necessário. Respostas de tutoria não entram no cache do service worker.

Aceite: chave ausente no bundle; pedidos inválidos/excedidos negados; timeout retorna estado recuperável; resposta com fonte desconhecida rejeitada; cancelamento não dispara repetição automática. Cada envio tem identificador de requisição; evitar reenvio automático após falha ambígua, pois o provedor pode ter consumido a chamada. Política e duração de deduplicação pendentes antes de habilitar chamadas reais. Evidência: testes de contrato, abuso, contexto malicioso, simulação e verificação do bundle/cache.

### EP-108 — Dúvidas e analogias na interface

Adicionar painel contextual no leitor e nas questões com “Dê uma pista”, “Explique de outra forma”, “Dê um exemplo”, “Explique com uma analogia” e dúvida livre. Analogia permite contexto opcional e usa a estrutura definida nos critérios pedagógicos. Continuação conserva contexto limitado da mesma aula/questão; trocar atividade inicia conversa separada. Proposta: conversa efêmera em memória, sem histórico persistente nesta entrega.

Mostrar carregamento, cancelar, falha, limite de uso, ausência de contexto e indisponibilidade offline; conservar texto da pergunta para nova tentativa explícita. Curso e jogos continuam disponíveis quando tutor falhar. Antes de enviar, informar de forma breve que a dúvida e trechos pertinentes serão processados por serviço externo; não enviar nome, perfil, histórico global ou rascunhos automaticamente.

Aceite: analogia contém correspondências, limite e verificação de compreensão; pista não revela deliberadamente solução antes da tentativa; resposta completa após tentativa explica o erro específico. Painel acessível por teclado e sem ocultar a questão no celular. Evidência: testes com provedor simulado e sessões manuais com o curso piloto.

### EP-109 — Avaliação e entrega B

Construir corpus revisado de perguntas sobre o piloto: conceitos, dúvidas sobre distratores, analogias de diferentes contextos, premissas falsas, contexto insuficiente e instruções maliciosas. Avaliar correção, fidelidade às fontes, profundidade adequada, utilidade da analogia, exposição dos limites e ausência de resposta antecipada no modo pista. Bloquear liberação diante de erro factual crítico ou falha de proteção de chave/limites.

Aceite: corpus e resultados registrados por configuração de modelo/prompt; todos os casos críticos aprovados; casos restantes com decisão editorial explícita; custo/latência medidos e compatíveis com limites aprovados. Verificar testes, typecheck, build, navegador móvel, offline e acessibilidade. Habilitar gradualmente por configuração; rollback desliga tutor e mantém cursos/prática. Não prometer eliminação de alucinações.

### Decisões pendentes e responsáveis sugeridos

| Decisão | Responsável sugerido | Momento e impacto |
|---|---|---|
| Assunto, público e responsável pela revisão do piloto | Produto/conteúdo | Antes de EP-106; define o que significa cobertura completa |
| Limites do pacote, armazenamento e semântica da atualização | Engenharia/produto | Em EP-102, antes de EP-103 |
| Provedor/modelo, orçamento, limites por usuário e acesso ao tutor | Produto/engenharia | Antes de chamadas reais em EP-107; pode exigir contas ou acesso restrito |
| Retenção do provedor, dados permitidos e política de conversa | Produto/engenharia | Antes da publicação de EP-108; proposta de conversa efêmera depende desta decisão |
| Timeout, contexto máximo, deduplicação e metas de custo/latência | Engenharia/produto | Antes da ativação real de EP-107 e avaliação EP-109 |

Escolha de provedor e integração concreta exigem consultar documentação oficial vigente durante a implementação. Este plano não fixa fornecedor, modelo, preço ou endpoints. Desenvolvimento local usa mocks e amostras sem dados pessoais; publicação do tutor depende das decisões, mas não bloqueia a entrega A.

### Acompanhamento, validação e histórico

Cada PR identifica épico e baseline 2.0, resultado, aceite, evidências, pendências e rollback. A task de execução detalha arquivos e comandos depois de inspecionar o estado atual; não substitui regras deste documento. Atualizar estados manualmente após validação. Alteração de escopo incrementa a versão, preservando IDs e entregas anteriores.

Revisão documental desta baseline: conferidos jornada, profundidade, compatibilidade, dependências, falhas, limites pendentes e controles de API/importação. Não foram executados testes de código para esta alteração documental. A rodada anterior de investigação registrou 47 testes passando, typecheck e build aprovados; isso valida o código daquela rodada, não as capacidades propostas aqui.

Histórico: 2.0, 16/11/2026 — evolução proposta para importação de cursos completos, autoria temporariamente oculta e tutor contextual com analogias. Sem alteração do código ou do estado das entregas históricas.

---

## Histórico — autoria assistida entregue antes da baseline 2.0

## Resultado esperado

O usuário escolhe sua IA preferida, define o objetivo de estudo, abre a IA com o prompt copiado e retorna à Evolua para colar ou importar a resposta. A Evolua apresenta erros corrigíveis e uma prévia antes de ativar o pacote. A qualidade combina regras automáticas, referências ao material-base e revisão pedagógica; a autovalidação declarada pela IA não comprova veracidade.

Este documento registra o plano implementado. O contrato e os comportamentos atuais estão documentados em `docs/game-packs.md`. A revisão factual continua dependendo do material-base e do usuário; a restauração usa reversão em caso de falha de gravação e informa quando ela não puder ser confirmada.

## Fluxo proposto

1. Definir assunto, público, objetivo, dificuldade e quantidade de atividades.
2. Selecionar ChatGPT, Claude, Gemini ou Microsoft Copilot; salvar a preferência localmente. Oferecer “Outra IA” com cópia manual, sem exigir cadastro de URL.
3. Acionar “Copiar prompt e abrir IA”. Abrir o site oficial selecionado em nova aba e confirmar se a cópia funcionou. Disponibilizar copiar e baixar como alternativas.
4. Na IA, gerar o conteúdo, revisar as respostas e executar a lista de verificações solicitada pelo prompt antes de devolver o JSON final.
5. Retornar à Evolua e colar a resposta ou selecionar o arquivo JSON.
6. Validar e exibir os erros por campo. Se necessário, copiar um prompt de correção com o texto original e os erros encontrados.
7. Visualizar módulos, atividades, explicações e fontes. Ativar o pacote somente após confirmação da prévia.

## Etapa 1 — Escolha da IA e abertura confiável

- Criar um catálogo único de provedores com IDs estáveis e URLs HTTPS oficiais fixas. Validar os endereços no momento da implementação. Não colocar o material-base ou prompt em parâmetros de URL.
- Persistir somente a preferência de provedor; validar o valor ao carregar e tratar armazenamento indisponível.
- Abrir a nova aba diretamente no clique para reduzir bloqueios do navegador. Tratar separadamente o resultado da abertura e da cópia assíncrona, sem anunciar sucesso quando uma das operações falhar. Usar isolamento da aba de destino e não depender de um identificador de janela disponível para inferir sucesso.
- Oferecer compartilhamento nativo quando disponível, mantendo copiar/baixar como alternativa. Cancelar o compartilhamento não deve ser mostrado como erro de conteúdo.
- Não enviar automaticamente o formulário ou acessar a conta do usuário na IA. Abertura, colagem e envio dependem das capacidades oficiais de cada provedor.

Aceite: preferência restaurada após recarga; URLs limitadas ao catálogo; prompt correto na área de transferência; alternativa utilizável quando cópia ou abertura falhar; operação acessível por teclado e em celular.

## Etapa 2 — Contrato único e prompt com autovalidação

- Centralizar limites e regras hoje espalhados pelo schema e UI: tamanho de arquivo, comprimentos de texto, quantidade de módulos/itens, IDs reservados, unicidade e índices de alternativas.
- Gerar as instruções e exemplos a partir dessas regras compartilhadas. O exemplo completo deve passar pelo mesmo validador usado na importação.
- Acrescentar ao prompt uma sequência explícita: planejar cobertura dos objetivos, gerar, revisar conteúdo, conferir estrutura, corrigir falhas e retornar somente o JSON final. Solicitar resultados verificáveis, sem exigir exposição de raciocínio interno.
- Instruir a IA a verificar sintaxe com um parser e schema quando tiver ferramentas para isso; quando não tiver, não declarar que executou código.
- Especificar limites completos de texto e cardinalidade. O prompt atual precisa, por exemplo, informar os limites de 240 e 2.000 caracteres, além do ID reservado ao pacote oficial.
- Orientar a omitir conteúdo não sustentado e comunicar insuficiência do material, em vez de inventar afirmações para completar a quantidade solicitada.

Aceite: exemplos válidos; limites do prompt iguais aos do importador; versão desconhecida rejeitada; o texto gerado não trata a revisão da IA como certificação factual.

## Etapa 3 — Critérios pedagógicos e evidências

Adotar um formato v2 para novas informações pedagógicas, preservando leitura dos pacotes v1 existentes. A versão do contrato e a revisão editorial do pacote devem ser campos distintos. Manter IDs estáveis para o progresso e indicar quando o conteúdo de um item foi materialmente alterado.

Para novos pacotes, prever objetivos por módulo, referências por ID, localizador verificável (página, seção ou URL) e vínculos dos itens com seus objetivos e fontes. Não fabricar páginas ou URLs quando o material não os oferece. Trechos de referência devem ser curtos e pertinentes.

| Dimensão | Critério de revisão | Verificação da Evolua |
| --- | --- | --- |
| Cobertura | Cada objetivo possui atividades correspondentes | Conferir vínculos e apontar objetivos sem atividade |
| Fundamentação | Resposta sustentada pelo material indicado | Validar referências e localizadores; mostrar evidências para revisão humana |
| Clareza | Enunciado autocontido e sem dupla interpretação | Detectar vazios e duplicações; revisão semântica pelo usuário |
| Pares | Conceitos distinguíveis e associação única | Rejeitar prompts/respostas duplicados após normalização; avaliar ambiguidades na prévia |
| Verdadeiro/falso | Uma proposição clara por item; falsas corrigidas na explicação | Validar campos e distribuição; revisar significado e factualidade |
| Alternativas | Uma resposta correta e distratores plausíveis, com justificativa | Validar índices e unicidade; conferir explicações por alternativa no v2 |
| Dificuldade | Exigência compatível com o público e objetivo | Mostrar classificação e exemplos para revisão, sem inferir qualidade de um rótulo |

- Diferenciar “estrutura válida”, “referências declaradas” e “revisado pelo usuário”. Referências presentes não significam referências verificadas, e material oficial também pode precisar de revisão editorial.
- Não criar nota de qualidade automática que prometa medir veracidade. Erros estruturais bloqueiam ativação; alertas pedagógicos e ausência de evidências ficam visíveis na prévia, com reconhecimento explícito antes de ativar. Pacotes v1 permanecem utilizáveis com indicação de evidências não disponíveis.
- Revisar a geração atual de verdadeiro/falso a partir de respostas trocadas entre flashcards. Substituir por afirmações explicitamente revisadas ou retirar os itens cuja falsidade não pode ser estabelecida.

Aceite: nenhuma alegação de validação factual automática; referências sem destino rejeitadas no v2; evidências consultáveis; pacotes v1 continuam carregando; atividades do pacote original não são rotuladas como revisadas apenas por serem incorporadas ao app.

## Etapa 4 — Colar, validar, corrigir e pré-visualizar

- Unificar importação por arquivo e texto em uma função de parsing e validação, com o mesmo limite de tamanho.
- Aceitar JSON puro e uma cerca Markdown externa opcional. Remover somente essa cerca e BOM quando presentes; rejeitar texto extra e JSON ambíguo. Nunca executar conteúdo ou adivinhar respostas corretas.
- Mostrar erros específicos, como `modules[0].multipleChoice[2].correctOptionIndex`, associados ao caminho real do schema. Acrescentar caminhos às validações cruzadas de IDs duplicados.
- Construir o prompt de correção com os erros reais e o conteúdo original delimitado como dados. Ao abrir uma IA, enviar apenas por ação explícita do usuário, usando o mesmo mecanismo de cópia.
- Separar erros de sintaxe, versão, estrutura, limite de coleção e armazenamento cheio/bloqueado. Não atribuir falha de armazenamento ao JSON.
- Manter o pacote anterior até a confirmação e a conclusão bem-sucedida da gravação. Reimportar um ID existente exige prévia da substituição.
- Preservar o texto colado enquanto o usuário corrige os erros e oferecer download do JSON validado.

Aceite: resposta com cercas importável; resposta truncada rejeitada; erro com caminho preciso; correção revalidada; prévia sem gravação; falha de armazenamento preserva dados anteriores; nenhuma execução de HTML ou scripts.

## Etapa 5 — Persistência e ajustes da revisão anterior

- Incluir pacotes no backup e restauração, mantendo compatibilidade com backups antigos que contêm somente progresso. Tornar explícito o que será substituído e evitar restauração parcial em caso de erro.
- Sincronizar alterações de pacotes entre abas pelo evento `storage`, inclusive remoções, com validação. Documentar o limite de gravações concorrentes; não afirmar que o evento resolve conflitos sozinho.
- Corrigir o contador de perguntas para começar em 1, mantendo o progresso por atividades respondidas separado da posição atual.
- Garantir que falhas ao excluir/salvar tenham mensagem apropriada e não provoquem tela de erro.

Aceite: ida e volta de backup preserva pacotes e progresso; backup antigo funciona; outra aba reflete importação/exclusão; primeira e última pergunta exibem posições corretas.

## Etapa 6 — Verificação e entrega

- Testes unitários para limites, normalização, versões, vínculos, parsing, caminhos de erro e prompt de correção.
- Testes de interface para copiar/abrir com falhas simuladas, importar por arquivo/texto, prévia, atualização, exclusão, persistência, backup e sincronização.
- Rodadas completas dos três jogos, com acertos e erros, resumo coerente, bloqueio de respostas repetidas e XP consistente.
- Verificações em navegador para bloqueio de pop-up, permissões de clipboard, layout móvel, foco e compartilhamento. Testes simulados não substituem essas verificações; registrar o que não puder ser executado.
- Executar testes existentes, typecheck e build. Nenhuma integração com a IA deve depender de uma conta real nos testes automatizados.

## Organização da implementação

- `web/src/lib/game-content.ts`: manter como ponto de entrada dos contratos; extrair constantes compartilhadas e validações auxiliares conforme necessário.
- Novos módulos de biblioteca para catálogo de provedores, geração de prompts e parsing/diagnósticos, separados da UI.
- `web/src/components/games.tsx`: extrair o estúdio em componentes menores para escolha da IA, entrada, erros e prévia.
- `web/src/hooks/use-game-packs.ts` e perfil: persistência, sincronização e backup compatível.
- Documentação do contrato v2, exemplos e limitações, acompanhando os testes.

Ordem de entrega: contrato e critérios → prompt/seleção da IA → entrada/diagnósticos/prévia → backup/sincronização → verificação completa. Cada etapa deve manter os pacotes e fluxos atuais utilizáveis.
