# Plano de autoria assistida e qualidade de conteúdo

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
