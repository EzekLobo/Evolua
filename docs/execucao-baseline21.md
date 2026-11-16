# Execução baseline 2.1

Implementados armazenamento por UID, contrato de curso, importação com prévia,
rascunhos, ativação e backup de pacotes. Leitor na Biblioteca apresenta todos os
blocos tipados, objetivos e fontes declaradas, com posição por UID/curso/revisão.
Atividades discursivas permitem comparar a resposta com a referência e retornar
às seções. Não há correção automática nem XP para essas atividades.

O acompanhamento atual sugere a próxima aula ou revisão solicitada. A ordenação
por erros e revisões vencidas e a ligação aos jogos pontuados permanecem pendentes;
não se deve considerar EP105/EP111 completos.

O painel chama /api/tutor com token Firebase. O servidor verifica revogação e
allowlist em cada chamada. Somente NODE_ENV=development e TUTOR_DEV_MOCK=true
habilitam respostas fixas explicitamente identificadas como simulação. Produção
fica desabilitada inclusive com essa variável. Não há provedor real, quotas ou
respostas contextuais produzidas por IA.

Fixture course-example é demonstração de autoria própria em draft, sem fontes
PDF verificadas ou revisão humana. Não constitui o piloto editorial EP106.
As fontes são declarações do arquivo importado, não certificação da aplicação.

Limites atuais: posição do leitor usa chave privada própria e ainda não integra
backup do Perfil; acompanhamento detalhado/exportação e migração legada pendem.
Pendências externas: configuração Firebase Admin/usuários, provedor e orçamento,
quotas compartilhadas e revisão humana de material para publicação.
