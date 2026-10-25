# Pacotes modulares de jogos

A Evolua aceita arquivos JSON no formato `evolua-game-pack` versões 1 e 2. O prompt gera a versão 2; a versão 1 continua legível. Os arquivos ficam no `localStorage` do navegador. A Evolua abre o site da IA escolhida e copia o prompt; o usuário cola e envia na sua conta, sem chave de API na Evolua.

## Fluxo de autoria

1. Informe assunto, público, objetivo, dificuldade e quantidade de itens.
2. Copie ou baixe o prompt gerado pela aplicação.
3. Envie o prompt à IA escolhida. Quando houver material-base, inclua-o junto do prompt e revise direitos de uso e dados pessoais antes do envio.
4. Cole a resposta na aplicação ou selecione o arquivo `.json`. Um único bloco Markdown externo é aceito; texto extra ou JSON truncado é rejeitado.
5. Valide o conteúdo e confira a prévia. Erros exibem caminhos dos campos e permitem gerar um prompt de correção. A gravação ocorre apenas após confirmar a revisão; reimportar o mesmo ID exige confirmação da substituição.
6. Revise o conteúdo gerado antes de usá-lo como material de estudo. A validação estrutural não comprova a veracidade pedagógica.

## Contrato v1 (legado)

```json
{
  "schema": "evolua-game-pack",
  "version": 1,
  "id": "biologia-celular",
  "title": "Biologia celular",
  "description": "Revisão de estruturas e processos celulares.",
  "modules": [
    {
      "id": "membrana-plasmatica",
      "title": "Membrana plasmática",
      "description": "Estrutura, transporte e funções.",
      "pairs": [
        {
          "id": "par-fosfolipidio",
          "prompt": "Fosfolipídio",
          "answer": "Molécula anfipática que forma a bicamada",
          "explanation": "A cabeça é hidrofílica e as caudas são hidrofóbicas."
        },
        {
          "id": "par-osmose",
          "prompt": "Osmose",
          "answer": "Movimento de água através de membrana semipermeável",
          "explanation": "A água se desloca em resposta ao gradiente osmótico."
        }
      ],
      "trueFalse": [
        {
          "id": "vf-bicamada",
          "statement": "A membrana plasmática possui uma bicamada de fosfolipídios.",
          "answer": true,
          "explanation": "Esse arranjo cria uma barreira seletiva entre meios aquosos."
        }
      ],
      "multipleChoice": [
        {
          "id": "quiz-transporte",
          "question": "Qual processo exige energia celular?",
          "options": ["Transporte ativo", "Difusão simples", "Osmose", "Difusão facilitada"],
          "correctOptionIndex": 0,
          "explanation": "O transporte ativo usa energia para mover substâncias contra o gradiente."
        }
      ]
    }
  ]
}
```

Regras principais:

- O arquivo pode ter até 1 MB, 20 módulos e 50 itens de cada tipo por módulo.
- IDs têm de possuir entre 2 e 64 caracteres, começar por letra ou número e usar somente letras minúsculas, números e hífens.
- Todos os IDs do pacote devem ser únicos.
- Um jogo de pares só é habilitado com ao menos duas duplas; suas respostas devem ser únicas dentro do módulo.
- Questões aceitam de duas a seis alternativas distintas. `correctOptionIndex` começa em zero e precisa apontar para uma delas.
- Textos são exibidos como conteúdo, nunca interpretados como HTML ou código.
- Um módulo pode omitir um tipo de jogo usando uma lista vazia, desde que ainda tenha conteúdo jogável.

## Versionamento e atualização

Reimporte um pacote com o mesmo `id` para atualizá-lo. Mantenha IDs de itens estáveis entre versões para preservar o histórico associado no mecanismo de XP. Alterar um ID cria uma nova atividade para fins de progresso.

## Contrato v2

Todos os campos do v1 continuam presentes. As adições obrigatórias são:

- Pacote: `version: 2`, `revision` (inteiro positivo, revisão editorial), `sources` (1 a 100 fontes).
- Fonte: `id`, `title`, `locator` (página, seção ou URL realmente disponível) e `excerpt` (trecho fiel ao material-base).
- Módulo: `difficulty` (`iniciante`, `intermediário` ou `avançado`) e `objectives` (1 a 20 objetos com `id` e `description`).
- Cada atividade: `objectiveId` existente no módulo e `sourceIds` (1 a 20 IDs existentes em `sources`).
- Múltipla escolha: `optionExplanations`, com uma explicação para cada alternativa, na mesma ordem de `options`.

IDs são únicos entre pacote, fontes, módulos, objetivos e atividades. O ID `metodologia-cientifica` é reservado. Textos curtos (títulos, localizadores, prompts/respostas de pares, alternativas) aceitam até 240 caracteres; os demais textos, até 2.000. Conceitos e respostas de pares são comparados após normalização Unicode, espaços e caixa. O exemplo completo v2 é gerado e validado pelo próprio código em `web/src/lib/game-content.ts` e pode ser obtido no prompt da interface.

## Qualidade e limites da revisão

O prompt solicita planejamento, revisão factual, validação estrutural e autocorreção. Se a IA possuir ferramentas, deve usar parser; caso contrário, não deve alegar execução. Fontes e localizadores não podem ser inventados para completar atividades.

A prévia mostra objetivos, fontes, dificuldades, respostas e justificativas. Alerta para objetivos sem atividades, perguntas repetidas, distribuição uniforme de verdadeiro/falso e pacotes legados. A confirmação registra uma decisão do usuário nesta importação, não uma certificação independente. Estrutura válida e referências declaradas não comprovam veracidade.

## Backup e armazenamento

O backup do perfil inclui progresso e pacotes importados. A restauração mostra o que será substituído e valida tudo antes de gravar. Backups antigos sem `packs` preservam os pacotes locais. Se uma gravação falhar, a restauração tenta reverter os valores anteriores e informa se a reversão não puder ser confirmada. O limite de leitura de backup é 24 MB.

Pacotes individuais podem ser baixados pelo estúdio. As abas recebem importação, atualização e remoção pelo evento de armazenamento. Gravações simultâneas ainda usam a última escrita; esse mecanismo não fornece transações entre abas.

Copiar, abrir abas e compartilhar dependem de permissões do navegador. Links explícitos e download do prompt permitem continuar quando essas operações não estiverem disponíveis. Nenhum material é incluído na URL da IA.
