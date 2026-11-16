# Evolua — Diagnóstico, decisões e prontidão

Versão 1.0.0 · 16/11/2026 · Complemento do [PRD](PRD-EVOLUA.md).

Este documento registra diferenças confirmadas entre pedidos do proprietário e implementação observada. Não autoriza corrigir todas as lacunas como parte da entrega documental. A solicitação adicional de matemática global foi implementada separadamente durante esta elaboração.

## 1. Decisões registradas

| ID | Decisão | Origem e impacto |
|---|---|---|
| DEC-01 | Acesso fechado, liberado pelo administrador; sem cadastro/login Google na interface | Conversa F01; RF-01 |
| DEC-02 | Todos os autorizados podem importar cursos e usar prompt externo; geração integral de curso via API não é oferecida ao aluno | Conversa F01; RF-03/RF-04 |
| DEC-03 | IA apoia dúvidas e analogias; conteúdo do curso precisa ensinar antes dos jogos | Conversa F01; RF-06/RF-11 |
| DEC-04 | Meus cursos unifica trilhas e biblioteca; autoria é área separada; plano precede aula | Conversa F01; RF-02/RF-05 |
| DEC-05 | Resumo de aula expande no próprio plano; próximas aulas são bloqueadas por pré-requisito | Conversa F01; RF-05 |
| DEC-06 | Banco comum, gerado com módulos, com dados para os cinco jogos; meta de 10 itens/aula | Conversa F01 e atualização solicitada do prompt; RF-08 |
| DEC-07 | Cursos, material de jogos e progresso são locais ao navegador do usuário | Pedido expresso F01; RF-15 |
| DEC-08 | Próxima aula exige 80% nos desafios obrigatórios | Resposta expressa recebida durante este PRD em 16/11/2026; RF-07; não implementado |
| DEC-09 | Usuários autorizados podem gerar banco por API com limite de uso | Resposta expressa recebida durante este PRD em 16/11/2026; RF-12/RF-18; limite ainda sem valores |
| DEC-10 | Expressões matemáticas devem ser formatadas em todos os locais de exibição de conteúdo | Pedido adicional durante este PRD; RF-17; ampliação realizada em 8 componentes, 182 expressões JSX |

Decisão expressa não elimina dependência técnica: DEC-06 exige contrato novo e DEC-09 exige mecanismo de quota. Nenhuma chave, e-mail pessoal ou UID real é necessário para registrar essas regras.

## 2. Decisões pendentes

| ID | Pergunta e proposta disponível | Responsável sugerido | Impacto e próximo passo |
|---|---|---|---|
| D-01 | Como compor rodada obrigatória, permitir novas tentativas e considerar melhor/último resultado? Proposta: rodada explícita, todos respondidos e resultado versionado; 80% já confirmado. | Proprietário, com apoio pedagógico | Bloqueia detalhe de RF-07; decidir antes da avaliação objetiva |
| D-02 | Quantas gerações/tokens por usuário, janela, regra para retries/falhas, orçamento global e armazenamento dos contadores? Proposta: reserva atômica no servidor; material de estudo continua local. | Proprietário e responsável técnico | Bloqueia exposição paga com quota de RF-12/RF-18; não basta contador no navegador |
| D-03 | Qual envelope/versão para curso+banco, quais limites e como migrar cursos/jogos antigos? Proposta no anexo: banco canônico com adaptadores e importadores antigos preservados. | Responsável técnico com aprovação de produto | Bloqueia contrato integrado RF-04/RF-08; não inserir campos no v1 silenciosamente |
| D-04 | Como tratar progresso e regeneração ao mudar curso/gabarito? Proposta: chave por ID/revisão e assinatura de conteúdo; manter histórico e invalidar aprovação só dos itens afetados. | Proprietário e responsável técnico | Bloqueia migração segura e retomada; código atual não reconhece revisão na geração de jogos |
| D-05 | Quais avisos de envio, retenção e tratamento de dados pelo Gemini e procedimento de exclusão? Não há política completa aprovada. | Proprietário e responsável por privacidade, quando definido | Bloqueia afirmar prontidão de produção nesse tema, não a documentação ou testes sintéticos |
| D-06 | Haverá estudo offline autenticado no futuro? Hoje a autorização falha fechada sem rede. | Proprietário | Não bloqueia versão online; impede prometer PWA totalmente offline |

80% e permissão para autorizados não devem voltar a ser perguntas genéricas em próximas tarefas. Apenas seus detalhes ainda abertos exigem decisão.

## 3. Lacunas de implementação

| ID | Prioridade | Achado confirmado e consequência | Referência e direção de correção |
|---|---|---|---|
| GAP-01 | Alta | canAccess aceita o proprietário antes de exigir password; documentação e teste esperam negar Google inclusive para ele. | F02; alinhar política de provedor e teste, sem inferir aceitação de login Google |
| GAP-02 | Alta | Leitor usa respostas abertas autoatribuídas e exige todas corretas; não aplica avaliação objetiva de 80%. | F05; RF-07 e D-01/D-03 |
| GAP-03 | Alta | Banco comum não existe como entidade canônica consumida pelas cinco modalidades. Flashcards/quizzes ainda usam conteúdo original; rota gera apenas múltipla escolha. | F04/F06/F07; RF-08 e D-03 |
| GAP-04 | Alta | Pacote gerado usa ID derivado do curso truncado e módulos mod-N; retomada ignora conteúdo/revisão e apenas pula IDs existentes. Pode preservar banco obsoleto após editar curso ou colidir IDs longos. | F06; RF-12 e D-04 |
| GAP-05 | Alta | Botão geral Iniciar/Continuar apenas entra no índice salvo; não revalida isUnlocked. Se o resultado anterior foi invalidado, retomada pode abrir aula agora bloqueada. | F05; aplicar pré-requisito em toda entrada, não só nos botões de aula |
| GAP-06 | Média | Etapa explicativa é seção inteira; longos conjuntos de blocos ainda exigem rolagem e não há persistência de etapa interna. | F05; RF-06, reorganizar unidades e layout sem ocultar texto |
| GAP-07 | Média | Tutor não cancela/identifica consulta por etapa; resposta antiga pode chegar após navegação. Contexto é cortado em 24.000 caracteres sem seleção semântica nem aviso. | F05/F07; RF-11, correlacionar pedido e seção e preservar evidência pertinente |
| GAP-08 | Alta | Endpoints pagos autorizam usuário, mas não impõem limite de uso compartilhado; botão ocupa apenas uma sessão e não impede chamadas diretas/concomitantes. | F06/F07; RF-18, D-02 |
| GAP-09 | Média | Menu foi unificado, mas sincronização de hash só aceita entradas do menu/perfil. Ramos para cards/quiz/trilhas não garantem rotas antigas após hashchange. | F11; verificar navegação de Flashcards/Quizzes e atalhos do dashboard de ponta a ponta |
| GAP-10 | Média | Mensagem de reset menciona progresso/rascunhos genericamente, mas operação reinicia apenas Progress, mantendo course-progress/cursos/pacotes. Gerenciador também anuncia abrir aulas abaixo após fluxo já retornar ao catálogo. | F04/F09; tornar mensagens compatíveis com efeito real |
| GAP-11 | Média | Renderização matemática era parcial e não incluía frações simples; expansão global e testes foram feitos durante esta entrega. | RF-17; corrigido no código de exibição auditado; homologação visual ampla ainda pendente |
| GAP-12 | Média | Prompt incremental preserva módulos e pede consolidação final, mas não há garantia de contexto ou saída grande na IA externa. Não há coletor de módulos na UI. | F04; D-03; evitar promessa de garantia absoluta do prompt |
| GAP-13 | Média | Documentação histórica ainda relata visitantes, progresso global e tutor sem API. | README/docs anteriores; índice deste PRD diferencia referência histórica de estado atual |
| GAP-14 | Alta | Suíte existente falha após alterações de interface, tutor e política de autorização; typecheck sozinho não confirma regressão ausente. | F12; atualizar testes ao comportamento aprovado e corrigir bugs descobertos, sem apenas enfraquecer assertivas |
| GAP-15 | Média | Schema aceita referência de atividade a seção de outra aula e não valida semântica de fonte. Leitor procura revisão apenas na aula corrente. | F03/F05; restringir vínculo quando contrato novo definir regra e validar material editorialmente |
| GAP-16 | Média | Controles e aviso editorial foram ocultados por seletores CSS amplos, enquanto regras novas são adicionadas no mesmo arquivo em cascata. | F10; reorganizar estilos e estados explícitos, homologar desktop/celular/zoom |
| GAP-17 | Média | Condições de gerador e armazenamentos não têm estado de job persistido, cancelamento por logout ou lock entre abas; conteúdo salvo é recuperável, mas uma operação em trânsito pode continuar fora da tela. | F06/F09; D-02/D-04; não prometer processamento durável |

Esses achados vêm de código e testes, não de uma auditoria completa de segurança ou de homologação de todos os fluxos em produção. Prioridade reflete impacto potencial no produto, não um prazo aprovado.

## 4. Verificações executadas

### 4.1 Inspeção e testes

- Leitura de instruções, schemas, stores, hooks, componentes, endpoints, service worker, testes e documentos existentes, sem ler ou reproduzir valores da configuração privada.
- Base de código inicial: bed165d; alterações locais preexistentes de auth-account.tsx, vitest.config.ts e web/AGENTS.md foram preservadas.
- Typecheck: aprovado antes e depois da ampliação de matemática.
- Suíte existente: 17 arquivos, 94 testes; 80 aprovados e 14 falhas em 5 arquivos. Falhas envolvem autorização, leitor, tutor e fluxos de interface após reorganizações. A execução via script da raiz não propagou testTimeout ao Vitest; não apresentar o timeout solicitado como configuração efetivamente aplicada nessa execução.
- Novos testes de matemática: 11 aprovados, incluindo a expressão e alternativas da imagem, notação científica, potências, raiz, preservação de TeX, datas/URLs/texto e fallback/escape de HTML.
- Suíte final após a alteração matemática: 105 testes, 91 aprovados e 14 falhas nos mesmos 5 arquivos da avaliação inicial. Os 11 novos testes passaram e o fluxo de pares continuou aprovado após o ajuste de acessibilidade. As 14 falhas anteriores não foram corrigidas por este escopo.
- Build de produção aprovado, incluindo compilação, checagem TypeScript e geração das páginas. Não houve nova chamada paga à API do Gemini nesta elaboração.

### 4.2 Documentos e diagramas

Critérios de revisão: IDs de regras únicos, links relativos existentes, fontes coerentes, decisão separada de implementação, fórmulas corretas e restrições do schema atual separadas do contrato proposto. Mermaid é o formato dos dois diagramas no PRD. Validação sintática/renderização e revisão semântica são verificações distintas; não presumir renderização apenas pela existência do código.

Os dois diagramas foram renderizados com Mermaid CLI e as imagens examinadas: rótulos legíveis, decisões com saídas identificadas e fronteiras coerentes com o texto. O fluxo de aprovação representa o alvo de 80%, com a proposta de todos os obrigatórios respondidos identificada no texto; a arquitetura representa o estado atual sem inventar quota ou banco remoto. Os arquivos de conferência ficaram em diretório temporário, sem dados de usuário.

Conferência automatizada final dos documentos: 5 arquivos principais/índice, 57 links locais válidos e 106 IDs de regras sem duplicação. A matemática ampliada gerou inicialmente uma mudança de nome acessível no jogo de pares; foi corrigida com identificação acessível da fórmula, e o teste de fluxo de pares voltou a passar. Nenhuma inspeção visual completa da aplicação em navegador foi realizada; a inspeção de imagens nesta entrega refere-se aos diagramas.

## 5. Prontidão e continuidade

O inventário de regras permite localizar o que existe e o que falta. Não há homologação de produção: RF-07/RF-08/RF-18 têm dependências explícitas, a suíte não está integralmente verde e a experiência visual ainda precisa de avaliação completa.

O plano existente deve receber atualização única e versionada antes de uma execução ampla. Preservar EPs publicados e seus históricos; mapear novas entregas aos RF/RN sem considerar uma etapa concluída por já existir um texto de prompt. Priorizar autorização/quota, banco comum, avaliação objetiva e regressões de navegação.

Este diagnóstico não redefine silenciosamente regras aprovadas nem corrige todos os gaps por ser uma documentação. A alteração adicional de matemática foi autorizada pelo pedido de ampliar sua apresentação em toda a aplicação e está identificada como tal.
