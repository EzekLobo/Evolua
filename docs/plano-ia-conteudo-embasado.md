# Plano de engenharia para conteúdo educacional assistido por IA

## 1. Objetivo

Usar IA para acelerar a elaboração de trilhas, flashcards, questões e jogos sem tratar a saída do modelo como fonte de verdade. Todo conteúdo factual publicado deve ser rastreável a material autorizado, passar por validações automáticas e receber decisão editorial humana.

O sistema deve distinguir claramente quatro estados:

1. **gerado**: produzido por IA, ainda sem verificação;
2. **estruturalmente válido**: atende ao schema e aos limites técnicos;
3. **fundamentado**: cada afirmação avaliável possui evidência localizada;
4. **aprovado**: um revisor humano aceitou conteúdo, evidências e adequação pedagógica.

Nenhum estado intermediário deve ser apresentado como “conteúdo verificado”.

## 2. Princípios obrigatórios

- **Fonte antes da geração:** a IA trabalha a partir de um corpus definido, nunca a partir de memória geral quando a atividade exigir fundamentação.
- **Rastreabilidade por afirmação:** título de fonte não basta; cada resposta, explicação e correção precisa apontar para trecho e localizador.
- **Abstenção segura:** material insuficiente deve produzir `insufficient_evidence`, não conteúdo inventado.
- **Separação de funções:** geração, verificação e aprovação são etapas diferentes. Quando possível, a verificação usa outra execução ou outro modelo, sem receber a justificativa do gerador.
- **Revisão humana proporcional ao risco:** conteúdo introdutório exige revisão; temas médicos, jurídicos, financeiros ou de segurança exigem especialista e fontes normativas atualizadas.
- **Reprodutibilidade:** registrar versão do prompt, modelo, parâmetros, hash das fontes e data da geração.
- **Privacidade e direitos autorais:** somente material autorizado pode ser enviado a provedores externos. Dados pessoais e conteúdo restrito devem ser removidos ou processados em ambiente aprovado.
- **Compatibilidade:** pacotes v1 e v2 continuam legíveis enquanto o novo fluxo é introduzido.

## 3. Escopo inicial

O primeiro ciclo deve trabalhar com os PDFs de Metodologia Científica já presentes no repositório e gerar um pacote candidato separado do conteúdo oficial. Não haverá publicação automática, busca aberta na internet nem chamada silenciosa a uma IA.

Entradas:

- PDFs ou textos fornecidos pelo editor;
- metadados bibliográficos mínimos;
- público, objetivos de aprendizagem e dificuldade;
- quantidade máxima desejada por tipo de atividade.

Saídas:

- unidades de evidência extraídas;
- matriz de cobertura dos objetivos;
- pacote de atividades candidato;
- relatório de validação e divergências;
- registro de aprovação ou rejeição editorial.

## 4. Arquitetura proposta

```text
Fontes autorizadas
        ↓
Extração determinística + OCR quando necessário
        ↓
Unidades de evidência versionadas
        ↓
Planejamento de objetivos e cobertura
        ↓
Geração assistida por IA
        ↓
Validação estrutural e regras pedagógicas
        ↓
Verificação independente afirmação ↔ evidência
        ↓
Fila de revisão humana
        ↓
Pacote aprovado e versionado
```

### 4.1 Camada de fontes

Cada fonte deve possuir:

- `sourceId` estável;
- título, autoria, edição e ano quando disponíveis;
- tipo e licença ou base de autorização;
- hash SHA-256 do arquivo;
- data de ingestão;
- método de extração;
- páginas ou seções disponíveis;
- idioma;
- status editorial: `pending`, `accepted` ou `rejected`.

O arquivo original não deve ser publicado automaticamente. O hash permite detectar troca de fonte sem alterar silenciosamente a fundamentação.

### 4.2 Unidades de evidência

O texto extraído deve ser dividido em blocos pequenos, preservando contexto suficiente. Cada bloco contém:

- `evidenceId` estável;
- `sourceId` e hash da fonte;
- página, seção ou outro localizador verificável;
- trecho literal curto;
- contexto anterior e posterior quando necessário;
- hash do trecho normalizado;
- indicador de OCR e confiança da extração;
- decisão humana quando o OCR for duvidoso.

A IA recebe apenas as unidades relevantes. O sistema nunca deve permitir que o modelo invente `evidenceId`, página ou URL.

### 4.3 Matriz afirmação–evidência

Cada campo factual avaliável gera uma ou mais afirmações atômicas. Exemplos: resposta de um par, valor verdadeiro/falso, alternativa correta e explicação de alternativa.

Para cada afirmação registrar:

- texto da afirmação;
- IDs das evidências de suporte;
- classificação: `supported`, `partial`, `contradicted` ou `insufficient`;
- comentário curto e verificável do validador;
- método da classificação: regra, IA verificadora ou humano;
- versão do verificador.

Atividades com `partial`, `contradicted` ou `insufficient` ficam bloqueadas até correção ou remoção.

## 5. Pipeline de autoria

### Etapa A — Ingestão e qualidade da fonte

1. O editor cadastra o material e confirma direitos de uso.
2. O sistema calcula o hash e extrai texto por página.
3. Páginas vazias ou com baixa qualidade são marcadas para OCR/revisão.
4. Uma amostra da extração é comparada visualmente com o original.
5. Somente fontes aceitas entram no corpus de geração.

**Gate A:** fonte identificada, autorizada, extração legível e localizadores preservados.

### Etapa B — Objetivos e blueprint pedagógico

1. O editor define público, pré-requisitos e objetivos observáveis.
2. A IA propõe um mapa de conceitos usando apenas as evidências.
3. O editor ajusta o mapa e define níveis de dificuldade.
4. O sistema monta uma matriz objetivo × evidência × tipo de atividade.

**Gate B:** todo objetivo possui evidência suficiente e critério de avaliação. Objetivos sem base são removidos ou recebem novas fontes.

### Etapa C — Geração controlada

O gerador recebe:

- contrato JSON e limites;
- objetivos aprovados;
- evidências permitidas com IDs imutáveis;
- rubrica específica por tipo de atividade;
- instrução explícita de abstenção;
- proibição de criar referências, páginas, citações ou fatos externos.

O resultado deve conter apenas JSON. Temperatura baixa é preferível para conteúdo factual. Criatividade pode ser maior apenas na formulação de exemplos, quando esses exemplos forem permitidos e rotulados.

**Gate C:** JSON válido, IDs únicos, todos os vínculos existentes e nenhuma evidência fora da lista fornecida.

### Etapa D — Verificações automáticas

Aplicar, nesta ordem:

1. schema e limites de tamanho;
2. unicidade e integridade referencial;
3. cobertura de objetivos;
4. duplicação e similaridade excessiva;
5. uma única resposta defensável em múltipla escolha;
6. coerência entre resposta, explicação e explicações das alternativas;
7. afirmações compostas em verdadeiro/falso;
8. linguagem adequada ao público;
9. presença de suporte para cada afirmação factual;
10. detecção de conteúdo que contraria evidências fornecidas.

Regras determinísticas bloqueiam falhas objetivas. IA verificadora produz parecer, mas não aprova conteúdo sozinha.

### Etapa E — Verificação independente

Executar uma segunda avaliação sem mostrar a resposta ou justificativa interna do gerador. O verificador recebe atividade, evidências e rubrica e deve:

- decompor a resposta em afirmações verificáveis;
- classificar o suporte de cada afirmação;
- apontar evidência contraditória;
- identificar ambiguidade e mais de uma alternativa defensável;
- declarar insuficiência em vez de completar lacunas.

Divergências entre gerador e verificador entram em fila prioritária. Repetir a mesma pergunta ao mesmo modelo não é considerado verificação independente suficiente.

**Gate D:** nenhuma contradição ou insuficiência aberta.

### Etapa F — Revisão humana

A tela de revisão deve mostrar lado a lado:

- atividade e resposta esperada;
- explicação;
- trecho de evidência e localizador;
- fonte original acessível ao editor autorizado;
- alertas automáticos e parecer do verificador;
- diferenças em relação à revisão anterior.

O revisor pode aprovar, editar, rejeitar ou solicitar nova geração. Aprovação registra usuário, data, revisão e hash do conteúdo aprovado.

**Gate E:** aprovação explícita de conteúdo e adequação pedagógica.

### Etapa G — Publicação e monitoramento

- Publicar versão imutável do pacote; correções geram nova revisão.
- Manter IDs quando o significado não mudou; gerar novo ID quando a resposta ou competência mudou materialmente.
- Preservar histórico, relatório de validação e fonte usada.
- Permitir despublicação sem apagar auditoria.
- Coletar sinalizações de ambiguidade e erros feitas por usuários.

## 6. Evolução do contrato de dados

Antes de criar uma versão 3 do pacote, implementar um artefato editorial separado, para não misturar dados de autoria com o formato leve usado no jogo.

Estrutura sugerida:

```json
{
  "schema": "evolua-content-review",
  "version": 1,
  "packId": "metodologia-cientifica",
  "packRevision": 3,
  "sourceManifestHash": "sha256:...",
  "generation": {
    "promptVersion": "content-author-v1",
    "provider": "manual-or-configured-provider",
    "model": "recorded-at-runtime",
    "generatedAt": "ISO-8601"
  },
  "claims": [],
  "checks": [],
  "approval": {
    "status": "pending",
    "reviewer": null,
    "reviewedAt": null
  }
}
```

O pacote jogável continua contendo apenas o necessário para uso e consulta das fontes. O relatório editorial guarda proveniência, verificações e aprovação.

## 7. Estratégia de integração com IA

### Fase 1 — Assistida e local

- Reforçar prompts exportáveis existentes.
- Gerar manifesto de evidências a partir das fontes.
- Importar resposta JSON e relatório de verificação.
- Manter envio e escolha de provedor sob ação explícita do usuário.

Essa fase valida o método sem exigir backend, chaves ou custo recorrente.

### Fase 2 — Orquestração com backend

- Criar serviço autenticado de trabalhos de autoria.
- Armazenar chaves somente no servidor.
- Fixar versões de prompt e modelos permitidos.
- Aplicar limites de custo, tamanho e concorrência.
- Registrar tentativas sem armazenar raciocínio interno do modelo.
- Isolar conteúdo do usuário entre contas e aplicar política de retenção.

### Fase 3 — Recuperação de evidências

- Adicionar busca híbrida por palavras-chave e embeddings.
- Filtrar sempre por corpus, versão e permissões.
- Retornar unidades com localizadores, nunca apenas texto solto.
- Medir recall da recuperação em conjunto de perguntas conhecido.
- Manter fallback manual quando a recuperação não encontrar suporte.

RAG melhora acesso às fontes, mas não prova veracidade; os gates de evidência e revisão permanecem.

## 8. Testes e avaliação

Criar um conjunto ouro pequeno, revisado manualmente, contendo:

- atividades corretas e bem fundamentadas;
- respostas parcialmente suportadas;
- referências inventadas;
- alternativas ambíguas;
- negações e exceções;
- trechos de OCR corrompido;
- fontes que se contradizem;
- tentativas de instrução maliciosa dentro do material-base.

Métricas mínimas:

- 100% das afirmações publicadas com evidência válida;
- 0 IDs de evidência inventados aceitos;
- 0 atividades contraditórias publicadas no conjunto ouro;
- taxa de detecção de insuficiência e contradição;
- precisão da classificação de suporte;
- cobertura por objetivo;
- taxa de rejeição e edição humana;
- tempo editorial por atividade;
- custo por pacote quando houver API.

Testes automatizados devem cobrir schema, hashes, vínculos, bloqueios dos gates, versionamento, diferenças entre revisões e tentativas de prompt injection. Testes de interface devem cobrir revisão, aprovação, rejeição e fonte indisponível.

## 9. Segurança e governança

- Tratar texto das fontes como dados não confiáveis; instruções encontradas dentro de PDFs não podem alterar o pipeline.
- Não renderizar HTML fornecido por modelo ou fonte.
- Limitar tipos, tamanho e quantidade de arquivos.
- Verificar conteúdo e extensão real dos uploads.
- Aplicar controle de acesso ao corpus e aos relatórios editoriais.
- Não registrar chaves, dados pessoais ou material integral em logs.
- Definir retenção e exclusão antes de integrar um provedor.
- Registrar incidentes e permitir revogar pacotes afetados.

## 10. Plano de entrega

### Marco 1 — Fundação e corpus piloto

- inventário dos PDFs atuais e direitos de uso;
- extração por página com hashes;
- formato das unidades de evidência;
- conjunto ouro inicial;
- testes de datas, páginas e integridade.

**Aceite:** uma evidência pode ser rastreada do JSON até a página original sem busca manual ambígua.

### Marco 2 — Blueprint e geração fundamentada

- editor de objetivos;
- matriz objetivo–evidência;
- prompt versionado;
- importação de candidato;
- bloqueio de referências inexistentes.

**Aceite:** nenhum item candidato entra na revisão sem objetivo e evidência válidos.

### Marco 3 — Verificador e relatório editorial

- decomposição de afirmações;
- classificações de suporte;
- verificações pedagógicas;
- relatório versionado;
- conjunto ouro no CI.

**Aceite:** casos contraditórios ou insuficientes do conjunto ouro são bloqueados.

### Marco 4 — Revisão humana e publicação

- tela lado a lado;
- estados e permissões editoriais;
- aprovação assinada;
- diff entre revisões;
- publicação imutável e despublicação.

**Aceite:** não existe caminho técnico de publicação sem aprovação e todos os pacotes publicados têm auditoria recuperável.

### Marco 5 — Backend e automação opcional

- autenticação;
- fila de trabalhos;
- integração de provedor;
- orçamento e observabilidade;
- política de privacidade e retenção;
- recuperação híbrida avaliada.

**Aceite:** falhas, custos e uso por trabalho são auditáveis; nenhuma chave chega ao navegador.

## 11. Decisões antes da implementação

1. Quem pode aprovar conteúdo e quais temas exigem especialista?
2. Quais fontes podem ser enviadas a serviços externos?
3. O corpus será privado, público ou misto?
4. A primeira versão permanecerá manual ou terá backend?
5. Qual provedor e região atendem aos requisitos de privacidade?
6. Qual orçamento máximo por pacote e por mês?
7. Por quanto tempo artefatos de geração e relatórios serão mantidos?

## 12. Próxima ação recomendada

Começar pelo Marco 1 usando os três PDFs atuais. Antes de qualquer integração via API, criar o manifesto das fontes, extrair evidências por página e montar um conjunto ouro de 20 a 30 atividades. Isso testa a engenharia de fundamentação e os critérios editoriais sem introduzir custo, credenciais ou dependência de fornecedor.
