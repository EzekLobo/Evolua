# Plano de implementação — autoria fundamentada com Gemini

## 1. Objetivo da entrega

Adicionar à Evolua um fluxo de autoria no qual o Gemini gera atividades a partir de fontes autorizadas, mas a publicação depende de evidências verificáveis, validações automáticas e aprovação humana.

O primeiro objetivo não é automatizar toda a produção. É provar que o pipeline consegue gerar um pacote pequeno de Metodologia Científica com rastreabilidade até a página original e sem aceitar afirmações não sustentadas.

## 2. Resultado funcional esperado

Um editor poderá:

1. cadastrar uma fonte e confirmar autorização de uso;
2. extrair unidades de evidência com página e trecho;
3. definir público, dificuldade e objetivos;
4. pedir ao Gemini um pacote candidato;
5. validar estrutura, vínculos e cobertura;
6. executar uma verificação independente das afirmações;
7. revisar atividade e evidência lado a lado;
8. aprovar ou rejeitar cada atividade;
9. exportar um `evolua-game-pack` v2 somente quando todos os gates forem atendidos.

## 3. Decisões arquiteturais

### 3.1 Separar três artefatos

- **Manifesto de fontes e evidências:** descreve documentos, hashes, páginas e trechos.
- **Candidato editorial:** contém atividades geradas, vínculos e pareceres ainda não aprovados.
- **Pacote jogável:** contrato v2 atual, contendo apenas dados necessários ao jogo.

O relatório editorial não deve ser incorporado integralmente ao pacote jogável. Isso evita aumentar o `localStorage` e mantém compatibilidade com o fluxo existente.

### 3.2 Chave do Gemini somente no servidor

A aplicação cliente nunca recebe `GEMINI_API_KEY`. Chamadas ao Gemini ficam em rotas de servidor do Next.js ou em serviço equivalente. A variável deve existir somente em ambiente local seguro e nas configurações protegidas da hospedagem.

### 3.3 Começar sem armazenamento remoto

O piloto será executado por scripts locais e produzirá arquivos ignorados pelo Git. Isso permite avaliar qualidade antes de adicionar autenticação, banco e custos permanentes.

Quando o fluxo virar recurso multiusuário, trabalhos, fontes e aprovações precisarão de banco e armazenamento privado. O sistema de arquivos temporário de funções serverless não será usado como fonte de verdade.

### 3.4 Gemini não cria referências

IDs de fonte e evidência são criados pelo pipeline. O Gemini pode selecionar IDs recebidos, mas qualquer ID não cadastrado causa rejeição automática.

### 3.5 Busca web fora do corpus

Grounding com Google Search ficará desativado no piloto. Fontes externas só poderão entrar depois de cadastradas, avaliadas e aprovadas no corpus.

## 4. Estrutura de código proposta

```text
scripts/
  content-ai/
    extract-pdf.mjs
    build-evidence-manifest.mjs
    generate-candidate.mjs
    verify-candidate.mjs
    export-approved-pack.mjs

web/src/lib/content-ai/
  schemas.ts
  evidence.ts
  claims.ts
  gates.ts
  prompts.ts
  gemini-client.server.ts
  editorial-diff.ts

web/src/app/api/content-ai/
  generate/route.ts
  verify/route.ts

web/src/components/content-ai/
  source-summary.tsx
  objective-editor.tsx
  candidate-review.tsx
  evidence-viewer.tsx
  validation-report.tsx

web/test/content-ai/
  schemas.test.ts
  evidence.test.ts
  claims.test.ts
  gates.test.ts
  prompts.test.ts
  api.test.ts
  editorial-flow.test.tsx

content-ai/
  fixtures/
  gold-set/
  schemas/
```

Arquivos gerados com textos extraídos, respostas do modelo ou PDFs de trabalho não devem ser versionados por padrão. O conjunto ouro conterá somente material cuja inclusão no repositório esteja autorizada.

## 5. Contratos iniciais

### 5.1 `SourceManifest`

Campos mínimos:

- `schema` e `version`;
- `sourceId`;
- metadados bibliográficos;
- `sha256` do arquivo;
- autorização e restrições de uso;
- método e data da extração;
- lista de páginas processadas;
- status editorial da fonte.

### 5.2 `EvidenceUnit`

Campos mínimos:

- `evidenceId`;
- `sourceId` e hash da fonte;
- página e seção quando disponível;
- trecho literal curto;
- hash do trecho normalizado;
- método de extração;
- confiança do OCR, quando aplicável;
- status de conferência humana.

### 5.3 `EditorialCandidate`

Campos mínimos:

- versão do contrato editorial;
- ID e revisão desejada do pacote;
- objetivos aprovados;
- atividades candidatas;
- IDs de evidência por atividade;
- afirmações atômicas extraídas;
- resultados dos gates;
- metadados de geração;
- estado de revisão.

### 5.4 `ClaimVerdict`

```ts
type ClaimVerdict = {
  claimId: string;
  activityId: string;
  text: string;
  evidenceIds: string[];
  verdict: "supported" | "partial" | "contradicted" | "insufficient";
  explanation: string;
  verifier: {
    provider: "gemini" | "rule" | "human";
    model?: string;
    promptVersion?: string;
  };
};
```

## 6. Gates de publicação

### Gate 1 — Fonte

- arquivo identificado por hash;
- autorização registrada;
- páginas e trechos preservados;
- OCR duvidoso revisado;
- nenhuma evidência com localizador ausente.

### Gate 2 — Estrutura

- JSON aceito pelo schema;
- IDs únicos;
- somente IDs de evidência existentes;
- limites de tamanho e cardinalidade;
- contrato do pacote v2 válido.

### Gate 3 — Pedagogia

- objetivo observável por módulo;
- toda atividade vinculada a objetivo;
- cobertura mínima definida;
- alternativas distintas;
- apenas uma alternativa defensável;
- explicação para acerto e distratores;
- linguagem adequada ao público.

### Gate 4 — Fundamentação

- toda afirmação factual possui evidência;
- nenhum parecer `partial`, `contradicted` ou `insufficient`;
- resposta e explicação apoiadas pelos mesmos trechos ou por trechos compatíveis;
- evidência pertence ao conceito, contexto e edição corretos.

### Gate 5 — Aprovação

- revisor identificado;
- data e hash do conteúdo aprovado;
- alertas reconhecidos ou resolvidos;
- alterações materiais após aprovação invalidam a aprovação anterior.

## 7. Prompts versionados

Manter prompts como funções puras em `prompts.ts`. Cada um possui ID e versão imutável.

### Prompt de geração

Deve incluir:

- público, dificuldade e objetivos;
- lista fechada de evidências;
- schema de saída suportado pelo Gemini;
- rubrica por tipo de jogo;
- instrução para usar somente IDs recebidos;
- instrução de retornar insuficiência quando necessário;
- proibição de inventar páginas, URLs, referências e fatos;
- saída exclusivamente estruturada.

### Prompt de verificação

Deve receber somente:

- atividade candidata;
- afirmações a avaliar;
- evidências vinculadas;
- rubrica de suporte.

Não deve receber o parecer do gerador. A resposta também usa saída estruturada.

### Compatibilidade de schema

Como a saída estruturada do Gemini suporta apenas parte do JSON Schema, manter:

1. um schema simplificado enviado à API;
2. o schema Zod completo executado depois da resposta;
3. refinamentos semânticos implementados na aplicação.

## 8. Estratégia de modelos

Não fixar o produto em um modelo antes da avaliação. Criar configuração por função:

```ts
type GeminiRoleConfig = {
  generatorModel: string;
  verifierModel: string;
  temperature: number;
  maxOutputTokens: number;
};
```

Princípios:

- geração factual com baixa aleatoriedade;
- modelo de verificação configurável separadamente;
- nome do modelo gravado em cada artefato;
- troca de modelo exige reexecutar o conjunto ouro;
- versão `preview` não entra em produção sem avaliação e plano de substituição.

## 9. Endpoints futuros

### `POST /api/content-ai/generate`

Entrada:

- objetivos;
- evidências selecionadas;
- configuração editorial permitida.

Saída:

- candidato validado estruturalmente;
- metadados de geração;
- lista de erros ou insuficiências.

### `POST /api/content-ai/verify`

Entrada:

- candidato;
- evidências referenciadas.

Saída:

- afirmações decompostas;
- parecer por afirmação;
- alertas pedagógicos;
- resultado dos gates automáticos.

### Proteções comuns

- autenticação e autorização editorial;
- limite de tamanho e frequência;
- timeout e cancelamento;
- validação antes e depois do modelo;
- nenhuma chave ou conteúdo integral em logs;
- idempotência por hash da requisição;
- estimativa e registro de consumo;
- mensagens de erro sem dados sensíveis.

## 10. Plano por marcos

### Marco 0 — Preparação da branch

Entregas:

- consolidar e testar as correções já presentes;
- adicionar `.gitignore` para artefatos locais do pipeline;
- documentar variáveis de ambiente sem incluir valores;
- criar schemas vazios e fixtures mínimas.

Aceite:

- testes, typecheck e build atuais continuam verdes;
- nenhum segredo ou PDF temporário aparece no Git.

### Marco 1 — Corpus piloto determinístico

Entregas:

- calcular hashes dos três PDFs;
- extrair texto por página;
- gerar manifesto e unidades de evidência;
- conferir visualmente uma amostra de páginas;
- registrar problemas de OCR;
- criar conjunto ouro inicial de 20 a 30 atividades.

Aceite:

- cada trecho é localizável no PDF;
- trocar um PDF altera o hash e invalida o manifesto;
- nenhum localizador é produzido pela IA.

### Marco 2 — Gerador Gemini local

Entregas:

- cliente Gemini exclusivo de servidor/script;
- schema simplificado de saída estruturada;
- prompt de geração v1;
- importação no schema Zod completo;
- relatório de IDs inexistentes e evidência insuficiente;
- gravação de modelo, prompt e consumo.

Aceite:

- chave não aparece no cliente, log ou artefato;
- resposta fora do contrato é rejeitada;
- ID de evidência inventado é rejeitado;
- o pacote candidato não altera o conteúdo oficial.

### Marco 3 — Verificação independente

Entregas:

- decomposição de atividades em afirmações;
- prompt de verificação v1;
- classificações estruturadas;
- regras determinísticas para integridade e ambiguidade básica;
- bloqueio dos pareceres não suportados;
- relatório por atividade.

Aceite:

- casos contraditórios e insuficientes do conjunto ouro são bloqueados;
- o verificador não recebe a justificativa do gerador;
- falha do verificador não transforma candidato em aprovado.

### Marco 4 — Interface editorial local

Entregas:

- tela de objetivos;
- lista de candidatos;
- atividade e evidência lado a lado;
- filtros por alerta e estado;
- aprovar, editar, rejeitar e solicitar nova geração;
- diff entre revisões;
- exportação de pacote aprovado.

Aceite:

- não existe botão ou rota de exportação para candidato bloqueado;
- editar conteúdo factual invalida o parecer e a aprovação;
- revisão funciona por teclado e em tela móvel.

### Marco 5 — Avaliação e endurecimento

Entregas:

- execução automatizada do conjunto ouro;
- métricas de recuperação, suporte e ambiguidade;
- testes de prompt injection nos documentos;
- testes repetidos para medir variação;
- limites de custo e tamanho;
- manual editorial.

Aceite:

- 100% das afirmações aprovadas possuem evidência válida;
- nenhum ID inventado é aceito;
- nenhum caso contraditório conhecido é exportado;
- regressão abaixo dos limites definidos bloqueia mudança de modelo ou prompt.

### Marco 6 — Produção multiusuário

Somente após o piloto:

- autenticação e perfis editoriais;
- banco para fontes, trabalhos e aprovações;
- armazenamento privado dos documentos;
- fila assíncrona;
- auditoria e observabilidade;
- política de retenção e exclusão;
- canal de correção e despublicação.

Aceite:

- isolamento entre usuários testado;
- publicação exige papel editorial;
- todos os artefatos publicados têm cadeia de auditoria recuperável;
- falhas parciais não deixam estado aprovado inconsistente.

## 11. Estratégia de testes

### Unitários

- schemas e refinamentos;
- hashes e normalização;
- IDs e integridade referencial;
- decomposição de afirmações;
- regras dos gates;
- invalidação de aprovação;
- construção dos prompts.

### Contrato

- respostas Gemini válidas e inválidas gravadas como fixtures;
- compatibilidade do schema simplificado com Zod;
- timeout, bloqueio, resposta vazia e JSON truncado;
- modelo indisponível ou alterado.

### Interface

- revisão e comparação de evidência;
- bloqueio de exportação;
- edição que invalida verificação;
- navegação por teclado;
- aviso de fonte indisponível.

### Avaliação de IA

- conjunto ouro humano;
- afirmações sem suporte;
- contradições;
- questões com duas respostas plausíveis;
- evidências irrelevantes semanticamente parecidas;
- instruções maliciosas dentro do PDF;
- múltiplas execuções do mesmo caso.

Chamadas reais ao Gemini não devem fazer parte da suíte padrão. Devem ficar em avaliação separada, controlada por variável de ambiente e orçamento.

## 12. Métricas de aceite do piloto

- cobertura de evidência: 100% das afirmações aprovadas;
- referências inventadas aceitas: zero;
- contradições conhecidas exportadas: zero;
- cobertura de objetivos: 100% dos objetivos selecionados;
- precisão do verificador no conjunto ouro: meta definida antes da avaliação;
- taxa de revisão humana: 100% no piloto;
- custo e tempo por atividade registrados;
- taxa de atividades editadas ou rejeitadas monitorada.

Não usar somente média. Um único erro factual grave deve ser tratado separadamente.

## 13. Riscos e respostas

| Risco | Resposta |
| --- | --- |
| Gemini inventa referência | IDs criados pelo sistema e validação de conjunto fechado |
| PDF possui OCR incorreto | confiança, amostragem visual e revisão obrigatória |
| Evidência verdadeira aplicada ao conceito errado | gate de entidade, contexto, edição e escopo |
| Gerador e verificador repetem o mesmo erro | conjunto ouro, regras determinísticas e humano |
| Schema válido, conteúdo falso | verificação por afirmação e bloqueio editorial |
| Prompt injection no PDF | tratar fonte como dados e testar instruções adversariais |
| Custos inesperados | limites, estimativa, cache posterior e orçamento por trabalho |
| Modelo muda ou é descontinuado | configuração desacoplada e avaliação antes da troca |
| Chave exposta | cliente somente no servidor e varredura de segredos |
| Conteúdo protegido enviado indevidamente | autorização registrada antes da ingestão |

## 14. Ordem recomendada de execução

1. Marco 0 — preparação.
2. Marco 1 — corpus e conjunto ouro.
3. Revisão humana do corpus piloto.
4. Marco 2 — geração local com Gemini.
5. Avaliar resultados antes de construir interface.
6. Marco 3 — verificação.
7. Marco 4 — interface editorial.
8. Marco 5 — endurecimento.
9. Decisão explícita sobre produção multiusuário.

## 15. Primeira sprint sugerida

Escopo de uma sprint curta:

- definir os schemas `SourceManifest` e `EvidenceUnit`;
- criar cálculo de SHA-256;
- extrair texto por página dos três PDFs;
- produzir manifesto local;
- revisar manualmente dez páginas;
- selecionar 20 atividades atuais para o conjunto ouro;
- adicionar testes de integridade e localização;
- documentar achados de OCR e autorização das fontes.

Essa sprint não chama o Gemini. Ela estabelece a base que impede o modelo de fabricar a fundamentação posteriormente.
