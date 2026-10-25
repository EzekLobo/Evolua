# Evolua: arquitetura e evolução

## Decisões desta entrega

- A plataforma web fica em `web/`, com motor de aprendizado e schema separados dos componentes React. O Android é mantido na estrutura Gradle original, evitando quebrar scripts e projetos Android Studio existentes.
- Todo o conteúdo original é carregado e validado por Zod. O módulo `lib/content.ts` fornece um ponto único para adicionar outros cursos posteriormente.
- O estado local é versionado e validado na leitura e na importação. Respostas têm identificadores de evento para evitar pontuação duplicada por cliques repetidos. O XP por item/dia é limitado: 12 no primeiro acerto ou 4 no erro, 2 nas próximas duas tentativas e zero nas seguintes.
- Domínio inicial requer dois acertos consecutivos. Falhas reiniciam o domínio e agendam revisão para o dia atual. Esse indicador é uma heurística de estudo, não uma certificação de aprendizagem.
- O calendário usa `America/Sao_Paulo`; streak permite continuar uma sequência iniciada ontem. Uma conquista já registrada permanece desbloqueada.
- O treino discursivo e os cinco simulados usam autoavaliação com rubrica. Rascunhos não geram XP.
- O service worker armazena páginas e recursos do mesmo domínio. Uso offline depende de o aplicativo e seus recursos já terem sido carregados. A primeira visita exige conexão; fontes externas podem cair no fallback do sistema offline.
- Não há processamento de pagamentos, envio de material para IA ou distribuição dos PDFs pelo site.
- O laboratório de jogos usa um contrato JSON versionado e validado por Zod. O prompt é montado localmente e apenas copiado ou baixado pelo usuário; a aplicação não chama uma IA nem envia o material-base. Pacotes importados ficam em `evolua.game-packs.v1`, separados do progresso, e seus IDs compõem as chaves usadas pelo motor de XP.
- A autoria assistida usa contrato v2 com objetivos e evidências, preservando pacotes v1. Parsing/diagnósticos, catálogo de provedores, estúdio de autoria e persistência são separados. O perfil exporta ambos os conjuntos de dados e restaura com reversão de gravações em caso de falha. Sincronização por eventos de armazenamento usa a última escrita em conflitos simultâneos.

## Limites conhecidos

- O navegador é a fonte de verdade desta versão. Duas abas sincronizam alterações recebidas, mas escritas simultâneas usam a última gravação. Backup transfere o estado completo e substitui os dados locais após confirmação; não mescla históricos.
- O agendamento por intervalos é determinístico. Não é um algoritmo adaptativo FSRS/SM-2 nem uma medida científica de retenção.
- O progresso Android em SharedPreferences não é importado automaticamente para a web. O conteúdo foi migrado integralmente, mas o aplicativo Android ainda não possui exportador de progresso.
- As referências incluem nomes de materiais que não estão necessariamente na raiz do repositório. A web mostra a referência textual, nunca um link quebrado ou uma promessa de acesso ao PDF.

## Próxima etapa: contas e sincronização

1. Provisionar um projeto Supabase em região próxima da aplicação. Revisar plano e limites antes de qualquer contratação.
2. Adicionar autenticação por e-mail ou Google com callbacks separados para produção e preview.
3. Criar `profiles`, `study_events`, `item_progress`, `daily_progress`, `user_achievements` e `drafts`. Aplicar Row Level Security por `auth.uid()` em todas as tabelas de usuário.
4. Manter fila local de eventos para modo offline. Eventos têm UUID; o servidor deve impor unicidade `(user_id, event_id)`, validar o conteúdo e recalcular XP/revisão, sem confiar em totais enviados pelo cliente.
5. Oferecer importação do progresso de visitante para a conta com transação e chave de deduplicação. Não sobrescrever silenciosamente histórico remoto.
6. Testar autorização entre usuários, recuperação de sessão, conflitos, importação repetida e sincronização após conexão.
7. Guardar segredos apenas nas variáveis da Vercel. Chaves administrativas não devem usar prefixo público nem ser incluídas no navegador.

## Depois: catálogo e autoria

Adicionar identificador de curso e versão de conteúdo a cada evento, mantendo IDs de itens estáveis. Separar catálogo e conteúdo por curso. Criar fluxo editorial com rascunho, validação de referências e revisão humana antes da publicação. Upload de PDFs deve respeitar a licença do material e usar armazenamento privado quando necessário.
