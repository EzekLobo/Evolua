# Execução baseline 2.1

Implementados armazenamento por UID, contrato de curso, importação com prévia,
rascunhos, ativação e backup de pacotes. Leitor na Biblioteca apresenta todos os
blocos tipados, objetivos e fontes declaradas, com posição por UID/curso/revisão.
Atividades discursivas permitem comparar a resposta com a referência e retornar
às seções. Não há correção automática nem XP para essas atividades.

O leitor integra cartas de recuperação baseadas nas atividades, com retorno à
explicação e autoavaliação explícita. Registra tentativas e último resultado;
revisões vencidas têm prioridade, seguidas por dificuldades e retomada da aula.
Empates seguem a ordem do curso. Alterações de resposta invalidam o resultado
para recomendações. As cartas não atribuem XP nem certificam domínio.

O painel chama /api/tutor com token Firebase. O servidor verifica revogação e
allowlist em cada chamada. Somente NODE_ENV=development e TUTOR_DEV_MOCK=true
habilitam respostas fixas explicitamente identificadas como simulação. Produção
fica desabilitada inclusive com essa variável. Não há provedor real, quotas ou
respostas contextuais produzidas por IA.

Fixture course-example é demonstração de autoria própria em draft, sem fontes
PDF verificadas ou revisão humana. Não constitui o piloto editorial EP106.
As fontes são declarações do arquivo importado, não certificação da aplicação.

Posição e resultados integram o backup do Perfil, com validação e restauração
compensada no UID da sessão atual; backups antigos preservam esses dados.
Histórico é local e não sincroniza dispositivos. Migração legada permanece manual.
Pendências externas: configuração Firebase Admin/usuários, provedor e orçamento,
quotas compartilhadas e revisão humana de material para publicação.
