# Evolua — Catálogo de regras de negócio

Versão 1.0.0 · 16/11/2026 · Complemento normativo do [PRD principal](PRD-EVOLUA.md).

Os IDs são estáveis. As fontes F01–F12 estão definidas no PRD. **Produto confirmado** significa decisão expressa; **Código confirmado** descreve o comportamento observado; **Proposto** não é decisão aprovada. A coluna de situação explicita divergências. Critérios futuros de aceite não são testes já executados. Valores técnicos atuais são detalhados no [anexo de dados](contratos-dados-evolua.md).

## 1. Identidade, autorização e permissões — RF-01

| ID | Regra, gatilho e efeito | Evidência e situação |
|---|---|---|
| RN-ACC-01 | Ao abrir a área de estudo, exigir identidade autenticada e UID autorizado. Somente autenticar no Firebase não libera a aplicação. | Produto F01 e código F02/F11 |
| RN-ACC-02 | Administrador cria as contas e libera UIDs; não há cadastro público ou login Google na interface. Recuperação de acesso passa pelo administrador nesta versão. | Produto F01; interface confirmada. Não afirmar que os endpoints públicos do Firebase impedem cadastro de contas. |
| RN-ACC-03 | Proprietário é exclusivamente o UID configurado no servidor. Aluno comum precisa do UID na allowlist e provedor password. | Código F02. Proprietário é aceito antes da checagem de provedor; diverge da intenção de e-mail/senha exclusivo, GAP-01. |
| RN-ACC-04 | Cada pedido protegido exige Bearer válido, verificado pelo Firebase Admin com verificação de revogação. Token inválido/revogado não autoriza. | Código F02; conta desativada e revogação dependem do Firebase |
| RN-ACC-05 | Não configurar credenciais administrativas, falhar ao verificar sessão ou ficar offline bloqueia acesso; não promover primeiro usuário nem aceitar privilégio enviado pelo cliente. | Produto F01 e código F02 |
| RN-ACC-06 | Interface revalida acesso a cada 60 segundos quando visível, ao retomar visibilidade e ao reconectar. Remoção da allowlist nega a próxima chamada protegida. | Código F02; não é revogação instantânea de dados baixados |
| RN-ACC-07 | Logout retira permissão da interface e encerra sessão; cursos e progresso permanecem no navegador. UI é remontada por UID ao trocar de conta. | Código F09/F11 |
| RN-ACC-08 | Estudante pode preparar prompt externo e importar/estudar. Criação completa de curso pela API deve ser exclusiva do proprietário; geração de questões é permitida a autorizados com quota. | Produto F01. Não há endpoint de geração integral de curso; quota de questões ainda ausente. |

**Matriz por operação**

| Operação | Não autenticado | Autenticado não liberado | Aluno autorizado | Proprietário |
|---|---|---|---|---|
| Abrir aplicação de estudo | Negar | Negar | Permitir | Permitir |
| Importar curso/pacote e preparar prompt externo | Negar | Negar | Permitir | Permitir |
| Dados locais, exportação e restauração | Negar na UI | Negar na UI | Namespace do próprio UID | Namespace do próprio UID |
| Tutor por API | Negar | Negar | Permitir, sujeito à quota-alvo | Permitir, sujeito à política de quota |
| Gerar banco por API | Negar | Negar | Permitir com quota confirmada; implementação pendente do limite | Permitir; eventual exceção à quota não foi aprovada |
| Gerar curso inteiro por API | Negar | Negar | Negar | Permissão de produto; funcionalidade não implementada |
| Autorizar outras contas | Negar | Negar | Negar | Procedimento externo no Firebase/configuração; sem tela própria |

Namespaces locais não protegem contra inspeção pelo dono do navegador ou por scripts da mesma origem. Autorização de interface não torna confidencial o conteúdo incorporado no bundle.

## 2. Autoria e qualidade pedagógica — RF-03

| ID | Regra, gatilho e efeito | Evidência e situação |
|---|---|---|
| RN-AUT-01 | Usuário descreve tema, objetivo, público e referência opcional; a IA assume a construção de estrutura, IDs e JSON. Não exigir que o aluno monte módulos técnicos manualmente. | Produto F01 e prompt F04 |
| RN-AUT-02 | Elaborar plano geral, gerar/revisar um módulo por vez, aguardar PRÓXIMO MÓDULO e consolidar após MONTAR PACOTE FINAL. | Produto F01; protocolo textual F04, sem motor de orquestração local |
| RN-AUT-03 | Preservar módulos e profundidade na consolidação. Preferir criação e união de arquivos pela IA quando a ferramenta permitir; nunca apresentar truncamento como arquivo pronto. | Produto F01 e prompt F04; capacidade da IA externa não é garantia da aplicação |
| RN-AUT-04 | Um conceito central por seção; definição, desenvolvimento, exemplo e síntese separados. Tópicos independentes, como intervalos e conjuntos, não compartilham um parágrafo extenso. | Produto F01 e prompt F04 |
| RN-AUT-05 | Exemplo resolvido explicita enunciado, ao menos dois passos com ação/justificativa e conclusão. A atividade avalia conteúdo já explicado; quantidade de texto não comprova profundidade. | Produto F01; mínimos do schema F03 |
| RN-AUT-06 | Não inventar fontes, localizadores, revisão humana ou evidência. Limitação factual é registrada, não preenchida com texto plausível. Fonte existente não significa fonte pertinente. | Produto F01 e prompt F04 |
| RN-AUT-07 | Analogia traz situação familiar, conceito, correspondências, limites, retorno ao conceito formal e pergunta. Não substitui definição formal. | Produto F01 e schema F03 |
| RN-AUT-08 | Gerar banco com o módulo, meta de 10 itens/aula, cobrindo compreensão, aplicação e transferência. Revisar todos os gabaritos e representações do item antes da consolidação. | Produto F01 e prompt F04; integração comum ainda parcial |
| RN-AUT-09 | Prompt deve explicitar tipos, cardinalidades, variantes e revisão de cada ocorrência, não só do primeiro exemplo. Resultado de IA permanece draft sem revisão humana real. | Produto F01 e prompt F04 |

**Verificações:** conceito sem exemplo próprio exige reorganização editorial; saída parcial não ativa curso; constraints como string não é considerado equivalente a array; referência inventada deve impedir revisão editorial, mesmo se o schema aceitar seus campos.

## 3. Importação, revisão editorial e versões — RF-04/RF-10

| ID | Regra, gatilho e efeito | Evidência e situação |
|---|---|---|
| RN-IMP-01 | Validar sintaxe, schema, versão, tamanho, campos permitidos, tipos e referências antes de gravar. Prévia não altera o catálogo. | Código F03/F04/F06 |
| RN-IMP-02 | Curso v1: 2 MiB por arquivo; jogo v1/v2: 1 MiB. Limite de coleção de jogos: 20 pacotes personalizados. Limites agregados de cursos constam no anexo. | Código F03/F06; limite do navegador pode impedir gravação antes de atingir todos esses tetos |
| RN-IMP-03 | Todos os IDs de um curso são únicos globalmente, incluindo passos e mappings. Ordem de módulos, aulas e seções começa em 1 e segue sem saltos na coleção. | Código F03 |
| RN-IMP-04 | Cada objetivo do curso aparece em pelo menos uma seção e uma atividade. Referências apontam a IDs existentes. Código atual permite sectionIds de atividade de outra aula do mesmo curso; restringir à aula é proposta GAP-15. | Código F03; ausência de fonte ou objetivo referenciado é erro |
| RN-IMP-05 | Normalização ajusta Unicode NFKC, espaços, quebras de linha e trim; não muda string em lista nem inventa campo ausente. Textos rejeitam HTML/script/handlers pelo filtro atual. | Código F03; proteção não é validação factual |
| RN-IMP-06 | Prévia apresenta módulos, aulas, blocos, atividades, nível, estado editorial e revisão/substituição. Ativação exige reconhecimento explícito. | Código F04 |
| RN-IMP-07 | Salvar rascunho não troca ativo. Permitir várias revisões de rascunho por ID; apenas um ativo por ID. Ativar nova revisão remove o ativo anterior e o rascunho do mesmo ID/revisão. | Código F03 |
| RN-IMP-08 | Reimportação de mesmo ativo mantém importedAt e atualiza updatedAt. Data editorial declarada não autentica revisor. Progresso de curso usa ID e revisão, sem migração automática entre revisões. | Código F03/F05 |
| RN-IMP-09 | draft pode ser estudado pessoalmente após confirmação; reviewed/approved exigem nome de revisor e data. Inclusão no catálogo incorporado exige revisão humana segundo direção editorial; ainda sem workflow de publicação. | Schema F03 e direção F01/plano; não atribuir selo de verificação automática |
| RN-IMP-10 | Na falha, preservar arquivo/texto e estado anterior; mostrar caminho preciso. Escrita de ativos e rascunhos tenta reversão compensada; se reversão falhar, informar incerteza. | Código F03/F04 |
| RN-IMP-11 | Jogos v2 exigem revisão, fontes, objetivos, dificuldade, vínculo por item e feedback por alternativa. v1 continua aceito. ID do pacote oficial é reservado e não pode ser importado como personalizado. | Código F06 |

**Estados editoriais**

| Estado | Uso permitido | Evidência necessária |
|---|---|---|
| draft | Uso pessoal com aviso | Conteúdo estruturalmente válido; não alegar revisão humana |
| reviewed | Revisão declarada no arquivo | reviewer e reviewedAt; declaração ainda não verificada pela aplicação |
| approved | Aprovação declarada no arquivo | Mesmos campos obrigatórios; publicação oficial não é automática |

Editor do arquivo pode alterar os metadados; o sistema não valida identidade editorial criptograficamente.

## 4. Plano, etapas e progressão — RF-05/RF-06

| ID | Regra, gatilho e efeito | Evidência e situação |
|---|---|---|
| RN-EST-01 | Meus cursos é entrada única; Novo curso abre autoria/importação separada. Ao ativar, retornar ao catálogo pessoal. | Produto F01 e código F05 |
| RN-EST-02 | Abrir curso apresenta plano. Clicar aula expande resumo abaixo dela; conteúdo só inicia por ação explícita. Consultar resumo de aula bloqueada não a desbloqueia. | Produto F01 e código F05 |
| RN-EST-03 | Identificar aula atual, concluída e bloqueada por texto além de cor. Primeira começa liberada; demais dependem das anteriores. | Produto F01; critério de conclusão atual diverge do alvo |
| RN-EST-04 | Explicar antes da prática; mostrar uma etapa por vez, com progresso e Voltar/Continuar. No código a unidade explicativa é uma seção inteira. | Produto F01; divisão mais fina ainda não implementada |
| RN-EST-05 | Retomar respeita pré-requisitos; revisão de aula liberada não apaga histórico. Não oferecer seletor que salte a sequência. | Produto F01; botão de retomada exige correção GAP-05 |
| RN-EST-06 | Respostas em edição e ajuda pertencem à etapa atual; não carregar resposta de outra atividade. Posição de aula é salva; etapa/resposta em edição ainda não persistem. | Código F05; persistir etapa é proposta |
| RN-EST-07 | Dificuldade deve oferecer retorno à explicação vinculada. Conclusão mostra resultado e próximo passo, sem acumular ações redundantes ao final de toda a aula. | Produto F01; código parcial |
| RN-EST-08 | Compactação preserva legibilidade e conteúdo. Metadados secundários podem ser recolhidos; explicações essenciais não podem desaparecer por CSS. Garantir uso em tela estreita e zoom. | Produto F01; layout atual carece homologação visual |

## 5. Avaliação objetiva — RF-07

| ID | Regra, gatilho e efeito | Evidência e situação |
|---|---|---|
| RN-AVA-01 | Avaliações obrigatórias devem ser objetivas, com alternativas e gabarito, não autoavaliação de resposta aberta. | Produto F01; leitor atual ainda discursivo |
| RN-AVA-02 | Próxima aula exige pelo menos 80% de acertos nos desafios obrigatórios. A regra aplica-se ao estudo incremental, não ao XP total. | Produto confirmado em resposta expressa de 16/11/2026; não implementado |
| RN-AVA-03 | Para N desafios válidos, mínimo de acertos é teto(0,8 × N). Comparar fração real, não percentual arredondado. N=0 não pode concluir por divisão indefinida. | Formalização da decisão F01; tratamento de curso sem banco depende migração D-03 |
| RN-AVA-04 | Só uma alternativa é correta. Embaralhar mantém referência ao índice/ID original; bloquear segundo envio da mesma questão na mesma tentativa. | Produto F01 e implementação em jogos F06; ausente no leitor |
| RN-AVA-05 | Erro informa gabarito e feedback pedagógico, sem humilhar aluno. Tutor oferece apoio, mas não altera a correção ou aprova respostas abertas. | Produto F01 |
| RN-AVA-06 | Flashcard autoavaliado, texto aberto e XP não substituem resultado objetivo obrigatório. Mostrar natureza da avaliação nos dados/indicadores. | Produto F01; política de pontuação do flashcard legado é distinta |
| RN-AVA-07 | Proposta: responder todos os obrigatórios antes de concluir; tentativa registrada por rodada e revisão do banco. Composição da rodada, novo sorteio e uso do melhor/último resultado são D-01. | Proposto para operacionalizar 80%; não apresentar política de rodadas como já aprovada |

**Fronteiras:** 7/10 reprova; 8/10 aprova; 2/3 não chega a 80%; 3/3 chega. Uma nota exibida como 80% por arredondamento não aprova um valor real inferior. Aprovação antiga e edição de gabarito exigem política D-04.

## 6. Banco reutilizável — RF-08

| ID | Regra, gatilho e efeito | Evidência e situação |
|---|---|---|
| RN-BAN-01 | Manter item canônico comum às modalidades, com conceito/habilidade específico e suas representações. Não criar quantidades independentes por jogo. | Produto F01; contrato alvo ainda proposto |
| RN-BAN-02 | Cada item vincula curso/revisão, módulo, aula, objetivo e fonte pertinente; dificuldade declarada. | Produto F01; detalhes da versão dependem D-03 |
| RN-BAN-03 | Meta editorial: 10 itens por aula; módulo de 4 aulas resulta em 40; curso de 8 desses módulos resulta em 320. Reuso em cinco jogos não transforma 320 itens em 1.600 conhecimentos independentes. | Direção F01 incorporada ao prompt |
| RN-BAN-04 | Representação de escolha: pergunta, quatro opções distintas, índice correto, explicação e feedback por opção. Demais quantidades aceitas em pacotes antigos não devem ser rejeitadas retroativamente. | Produto F01; contrato proposto diferencia novo banco de jogos legados |
| RN-BAN-05 | Representação de pares: conceito e definição curtos, inequívocos e únicos no conjunto jogável. Não usar letra do gabarito como definição. | Produto F01 e prompt F04 |
| RN-BAN-06 | Representação verdadeiro/falso: afirmações verdadeira e falsa revisadas e justificativas correspondentes. Não fabricar falsidade apenas trocando respostas de dois conceitos. | Produto F01; conteúdo oficial já evita geração não revisada desse tipo |
| RN-BAN-07 | Flashcard apresenta pergunta/resposta/explicação; quiz e rodada de alternativas reutilizam o mesmo gabarito. Modo de sessão pode variar, a fonte não deve ser duplicada. | Produto F01; adaptação atual parcial |
| RN-BAN-08 | Validar todas as representações antes de considerar item universal. Itens incompletos legados podem permanecer disponíveis só nos jogos suportados, com indicação explícita. Atualização não apaga questões existentes. | Direção F01 e proposta de migração D-03 |

## 7. Jogos e sessões — RF-09/RF-10

| ID | Regra, gatilho e efeito | Evidência e situação |
|---|---|---|
| RN-JOG-01 | Cinco modalidades aparecem na mesma grade com padrão visual comum. Seleção de pacote/módulo deve controlar o conteúdo efetivo em todas no alvo. | Produto F01; flashcards/quizzes ainda usam catálogo original |
| RN-JOG-02 | Pares requer pelo menos 2 itens e seleciona até 6 por rodada. Embaralha perguntas e respostas; acerto conecta, erro mantém disponível e registra tentativa. | Código F06 |
| RN-JOG-03 | Verdadeiro/falso seleciona até 10 afirmações aleatórias; uma resposta por item na rodada; mostra explicação antes da próxima. | Código F06 |
| RN-JOG-04 | Alternativas seleciona até 10 questões aleatórias e embaralha opções preservando índice original; após resposta mostra correção e explicações. | Código F06 |
| RN-JOG-05 | Resumo de pares usa acertos/total de conexões tentadas; V/F e alternativas usam acertos/questões da rodada. XP ganho é diferença entre total final e inicial da sessão. | Código F06; denominadores são diferentes e precisam de rótulo claro |
| RN-JOG-06 | Sessões legadas de cards/quizzes usam todos os itens do assunto selecionado; modo exam usa até 10 quizzes. Revisão inclui apenas itens incorporados praticados e vencidos/errados. | Código F08; não é revisão unificada dos cursos novos |
| RN-JOG-07 | Modalidade sem material fica indisponível e informa motivo; não substitui silenciosamente por conteúdo de outro curso. | Produto F01; estado desabilitado implementado |
| RN-JOG-08 | Importar material abre tela dedicada; validar, apresentar prévia, confirmar e salvar antes de retornar à seleção. Mudar pacote reinicia seleção de módulo e jogo. | Produto F01 e código F06 |
| RN-JOG-09 | Eventos de jogo usam ID composto com pacote/modalidade/item. O mesmo conteúdo repetido entre modalidades hoje tem históricos separados; unificação por item é decisão técnica de migração D-04. | Código F06/F08 |

## 8. Tutor contextual — RF-11

| ID | Regra, gatilho e efeito | Evidência e situação |
|---|---|---|
| RN-TUT-01 | Tirar dúvida exige texto na interface; analogia pode ser solicitada sem pergunta, usando contexto da etapa. Ambas passam pelo servidor autenticado. | Código F05/F07 |
| RN-TUT-02 | Enviar apenas pergunta, título e contexto pertinente; não enviar senha, token Firebase ou chave como material da IA. Referências são declarações do arquivo, não fontes certificadas. | Código e direção F01 |
| RN-TUT-03 | Entrada da IA é dado não confiável; não pode redefinir instruções, permissões ou ações do tutor. O servidor limita tamanhos; resposta não executa código. | Código F07/F10 |
| RN-TUT-04 | Resposta, carregamento e erro devem aparecer junto à solicitação e corresponder à mesma etapa; troca de etapa deve invalidar retorno antigo. | Produto F01; posição corrigida, invalidação pendente GAP-07 |
| RN-TUT-05 | Analogia contém correspondências e limites; explicação é curta, rigorosa, contextual e reconhece lacunas. Em desafio oferecer pistas; não mudar nota/gabarito/XP. | Produto F01; instrução no servidor, sem validador semântico automático |
| RN-TUT-06 | Falha de provedor, quota ou sessão mantém o material e permite recuperar o fluxo. Não comunicar simulação como resposta real. | Produto F01; mock antigo foi removido, testes ainda desatualizados |

## 9. Geração por API, custo e retomada — RF-12/RF-18

| ID | Regra, gatilho e efeito | Evidência e situação |
|---|---|---|
| RN-IA-01 | Usuário autorizado pode gerar questões com limite de uso. Criação integral de curso por API permanece reservada ao administrador. | Produto confirmado em 16/11/2026 |
| RN-IA-02 | Verificar token e autorização no servidor antes do provedor. O botão desabilitado no cliente não é controle suficiente de custo. | Código F07 |
| RN-IA-03 | Quota deve ser verificada/reservada por servidor antes de cada etapa paga; definir janela, quantidade, retries e concorrência em D-02. Saldo em localStorage não é controle confiável. | Limite confirmado; mecanismo proposto e ausente |
| RN-IA-04 | Geração atual pede 10 questões de alternativas por módulo, usando texto local do módulo. Não prometer 10 por aula ou todos os jogos nesta rota. | Código F06/F07; diverge do banco alvo |
| RN-IA-05 | Validar saída estruturada, número/tipo de alternativas, índice e explicações antes de salvar. Rejeitar JSON truncado e resposta MAX_TOKENS. Schema não comprova correção factual. | Código F07 |
| RN-IA-06 | Processar módulos sequencialmente e gravar cada unidade validada. Falha no módulo seguinte preserva os já salvos; retomada atual ignora IDs de módulos existentes. | Código F06; sem revisão/hash na chave, GAP-04 |
| RN-IA-07 | Repetir falhas 502/503/504 até 3 tentativas, com intervalos de 1 e 2 segundos; cada tentativa até 50 segundos. Erros de rede também entram no limite de tentativas. | Código F07; não garante disponibilidade ou cancelamento de processamento remoto |
| RN-IA-08 | Não repetir automaticamente erro permanente de acesso/modelo/parâmetro. 429 deve orientar aguardar; 503 deve ser identificado como dependência indisponível, sem culpar o conteúdo. | Código F07, com diferenças entre tutor e geração |
| RN-IA-09 | Geração usa página aberta e requisições HTTP; sair/recarregar não inicia job durável. Próximo clique retoma somente unidades persistidas; não afirmar retomada de resposta em trânsito. | Código F06/F07 |
| RN-IA-10 | Atualização/regeneração deve identificar fonte e revisão do banco e seu impacto no progresso; não substituir histórico ou cobrar novamente sem necessidade. | Produto F01; política D-04 e garantia de idempotência ainda propostas |

## 10. Aprendizado, XP e revisão — RF-13/RF-14

| ID | Regra, fórmula e efeito | Evidência e situação |
|---|---|---|
| RN-APR-01 | Eventos cujo ID conste em processed não alteram progresso. Guardar os últimos 500 IDs; IDs mais antigos deixam de ter essa proteção. | Código F08 |
| RN-APR-02 | Acerto efetivo em quiz usa event.correct; em card exige também confidence ≥ 2, assumindo 2 quando omitida. Confiança aceita de 0 a 3. | Código F08 |
| RN-APR-03 | Primeiro evento do item no dia dá 12 XP se correto ou 4 se errado. Segundo e terceiro eventos dão 2 XP cada. Quarto e seguintes dão zero XP. | Código F08; não confundir primeiro evento com primeiro acerto |
| RN-APR-04 | Toda tentativa não duplicada incrementa reviews e attempts; correct só sobe com acerto efetivo. Erro reinicia consecutive; acerto incrementa. | Código F08 |
| RN-APR-05 | Erro agenda hoje. Acertos consecutivos 1,2,3,4,≥5 agendam respectivamente 1,3,7,14,30 dias. Vencido é due ≤ hoje, desde que item já tenha progresso. | Código F08 |
| RN-APR-06 | Domínio inicial significa consecutive ≥ 2, uma heurística de estudo; não é certificação ou aprovação automática de curso. | Código F08 |
| RN-APR-07 | Dias são calculados em America/Sao_Paulo. Streak conta dias consecutivos com reviews > 0, começando hoje se houver atividade, caso contrário ontem. | Código F08 |
| RN-APR-08 | Meta padrão é 15 atividades/dia. Schema aceita inteiro de 5 a 50; UI oferece 5,10,15,20,30,50. Nome tem até 40 caracteres; notas até 20.000. | Código F08/F09 |
| RN-APR-09 | Nível exibido = piso(XP/200)+1; restante para próximo = 200−(XP mod 200). Acerto geral = arredondar(100 × acertos diários / tentativas diárias), zero sem tentativas. | Código F08/F11 |
| RN-APR-10 | Conquistas: primeira atividade; 10 atividades; 3 dias seguidos; 10 cards com domínio inicial; atingir meta em algum dia; 500 XP. Uma vez em earned, manter. | Código F08; reset explícito apaga earned |
| RN-APR-11 | Progresso de curso é separado por ID/revisão e atividade; guarda último resultado, tentativas, due e assinatura de expectedAnswer. Acerto atual agenda 24h; erro, agora. Não usa os intervalos do motor legado. | Código F05; nenhum XP para a autoavaliação de curso |
| RN-APR-12 | Resultado de curso com assinatura diferente da resposta atual não vale como conclusão válida. A recomendação existente prioriza vencidos, depois erros e depois aula salva, mas não é a fila global unificada. | Código F05; helper não significa exibição ativa dessa recomendação no leitor |

**Exemplo de XP:** quatro tentativas no mesmo dia para o mesmo item, todas corretas, rendem 12+2+2+0=16 XP. Se a primeira for erro, rendem 4+2+2+0=8. Reinício de sessão não reinicia esse limite diário.

## 11. Dados, backup e exclusão — RF-15/RF-16

| ID | Regra, gatilho e efeito | Evidência e situação |
|---|---|---|
| RN-DAD-01 | Dados pessoais de estudo usam namespace do UID autenticado; não há fallback silencioso para chave global antiga. Conteúdo incorporado não é duplicado nesse namespace. | Código F09 |
| RN-DAD-02 | Navegador é a fonte persistente; não há sincronização remota. Fechar/reabrir preserva enquanto dados do site existirem; trocar navegador/dispositivo não transfere. | Produto F01 e código F09 |
| RN-DAD-03 | Logout/revogação não apaga dados locais. Limpar dados do site pode perder tudo; administrador não recupera material que nunca foi exportado. | Código F02/F09 |
| RN-DAD-04 | Alterações entre abas do mesmo UID podem ser recarregadas por evento storage. Escritas simultâneas não têm lock/transação distribuída; última gravação pode prevalecer. | Código F09 |
| RN-DAD-05 | Falha de leitura não deve apagar imediatamente o valor inválido. Algumas operações posteriores podem sobrescrever progresso inválido, conforme comportamento atual; não prometer recuperação automática. | Código F09; registrar como limitação |
| RN-DAD-06 | Exportar inclui progresso, pacotes personalizados, ativos, rascunhos e progresso de cursos. Não inclui senha, tokens, chave Gemini ou credenciais administrativas. | Código F09 |
| RN-DAD-07 | Backup deve ter app evolua e estruturas válidas; arquivo até 24 MiB. Importar pede confirmação e substitui recursos presentes; campos opcionais ausentes preservam recursos atuais. | Código F09 |
| RN-DAD-08 | Restauração grava no UID da sessão atual, sem confiar em UID do arquivo. Falha tenta restaurar valores anteriores; rollback não confirmado exige alerta explícito. Não mescla históricos. | Código F09 |
| RN-DAD-09 | Remover curso exige confirmação e preserva XP/progresso. Remover pacote preserva eventos históricos. Rascunho/ativo são removidos conforme ID/revisão alvo. | Código F03/F06 |
| RN-DAD-10 | Reiniciar progresso restaura apenas Progress geral, incluindo nome/meta/notas/conquistas. Não remove cursos, pacotes e course-progress. Interface não deve prometer exclusão mais ampla que a executada. | Código F09, texto atual requer correção GAP-10 |

## 12. Apresentação, matemática e estados — RF-06/RF-17

| ID | Regra, gatilho e efeito | Evidência e situação |
|---|---|---|
| RN-VIS-01 | Mesma hierarquia de cartões para conteúdos originais/importados; descrições curtas no catálogo e completas no plano. | Produto F01, código parcial F05 |
| RN-VIS-02 | Separar definição, desenvolvimento, exemplo, síntese e desafio. Use texto e exemplos próprios para cada conceito; não apenas colorir um parágrafo extenso. | Produto F01 e prompt F04 |
| RN-VIS-03 | Conteúdo matemático exibido deve usar renderização comum em aulas, catálogo, fontes, prévias, jogos e sessões, inclusive alternativas e feedback. | Produto confirmado na solicitação mais recente; expansão aplicada durante esta entrega |
| RN-VIS-04 | LaTeX explícito prevalece. Reconhecimento automático cobre expressões numéricas simples: frações, potências, raízes, operações e notação científica. Não é um parser universal de linguagem natural. | Código F10 com testes específicos; fórmulas complexas exigem delimitadores |
| RN-VIS-05 | Preservar datas, URLs e texto sem expressão; fórmula inválida deve continuar visível como texto. Não executar HTML ou confiar em comandos externos do TeX. | Código F10; renderização KaTeX com trust false |
| RN-VIS-06 | Campos de edição, JSON bruto, valores de formulário e rótulos nativos de select permanecem texto para preservar edição/seleção; não injetar spans em option. | Limitação técnica atual explícita; notação Unicode é alternativa de rótulo, não fração diagramada |
| RN-VIS-07 | Ícone acionável precisa de nome acessível; teclado, foco e mensagens locais devem orientar ações. Erro de API aparece junto ao painel que o originou. | Produto F01; homologação visual/assistiva pendente |
| RN-VIS-08 | Adaptar colunas ao espaço; botões curtos alinhados ao campo; não truncar fórmula para caber nem usar largura fixa que impeça leitura em celular. | Produto F01; casos de zoom e conteúdo longo precisam de validação visual |

## 13. Dependências e verificação

Regras-alvo RN-AVA dependem de D-01/D-03/D-04. Controle RN-IA-03 depende de D-02. Banco comum depende de novo contrato D-03; schema atual rejeita campos extras. Nenhuma alteração neste documento ativa essas funcionalidades.

Critérios por jornada constam no PRD; exemplos de fronteira estão neste catálogo; formatos e limites estão no anexo. Evidências executadas e lacunas de qualidade estão no [diagnóstico](diagnostico-evolua.md). Para mudança de regra, atualizar os três pontos afetados sem renumerar IDs existentes.
