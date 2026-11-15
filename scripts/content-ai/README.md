# Pipeline local de fontes e evidências

O Marco 1 extrai texto de PDFs locais e cria manifestos v2. O Marco 2 acrescenta proveniência de origem, direitos, autorização e revisão humana, além de um verificador de integridade e gates locais.

O comando `--for-external-processing` verifica os requisitos locais. A geração com Gemini é acionada separadamente pela rota de desenvolvimento descrita abaixo.

## Gerar um candidato local

Configure `GEMINI_API_KEY`, `GEMINI_MODEL` e `CONTENT_AI_ENABLED=true` no ambiente do servidor. Se necessário, aponte `CONTENT_AI_PYTHON` para o Python que tem a dependência instalada. Inicie `npm.cmd run dev` na raiz.

Prepare um arquivo local `job.json` com os campos `manifest` (caminho do manifesto), `pdf` (caminho do PDF original), `id` (ID do pacote), `title`, `objective` e `excerpts` (lista de objetos com `page` e `text`). Os caminhos relativos partem da raiz do projeto. Cada trecho precisa constar literalmente na página revisada.

```powershell
curl.exe --fail-with-body -H "Content-Type: application/json" -H "x-evolua-local: generate" --data-binary "@job.json" http://127.0.0.1:3000/api/content-ai/generate
```

O piloto cria até cinco questões de verdadeiro ou falso. O arquivo em `work/content-ai/candidates/` inclui o pacote v2, as referências e os hashes, com status `pending-review`. Confira cada resposta e explicação com os trechos antes de qualquer uso.

## Requisitos

- Python 3.11 ou superior;
- `pypdf==7.1.0`, instalado com `python -m pip install -r scripts/content-ai/requirements.txt`.

O verificador compara a versão `pypdf` registrada no manifesto com a versão instalada, para repetir a extração com a mesma ferramenta.

## Gerar manifestos

Execute na raiz do repositório:

```powershell
python scripts/content-ai/build_source_manifest.py "METODOLOGIA 1.pdf"
python scripts/content-ai/build_source_manifest.py "METODOLOGIA 2.pdf"
python scripts/content-ai/build_source_manifest.py "METODOLOGIA 3.pdf"
```

O script calcula SHA-256 do PDF e do texto extraído de cada página, confere a quantidade de páginas e grava `manifest.json` e `pages/*.txt` em `work/content-ai/sources/`. Esse diretório é ignorado pelo Git. Páginas com menos de 100 caracteres ou vazias são sinalizadas para conferência. `text-present` significa que houve texto em volume suficiente, não que ele esteja correto ou revisado.

O manifesto v2 registra origem e direitos explicitamente como `unknown` até serem preenchidos. A autorização de processamento externo começa como `unreviewed`. Cada página começa com `reviewStatus: unreviewed`; `reviewer` e `reviewedAt` ficam nulos. Quando uma pessoa registrar `verified`, `rejected` ou uma decisão de autorização, deve preencher também revisor e timestamp ISO-8601 com fuso horário. Estados ainda não revisados não podem conter esses dados.

Os metadados são preenchidos manualmente no manifesto local nesta etapa. Para autorização externa, registre a origem conhecida, uma situação de direitos elegível (`licensed`, `permission-granted` ou `public-domain`) com justificativa em `source.rights.note`, e a base documental específica em `authorization.approvalBasis`. Para `licensed`, identifique a licença em `source.rights.license`. `authorization.note` descreve a decisão, mas não substitui a base documental. Não escolha um estado de direitos sem base documental.

## Verificar integridade e gates

Primeiro execute apenas as verificações de integridade:

```powershell
python scripts/content-ai/verify_source_manifest.py `
  "work/content-ai/sources/metodologia-1-<hash>/manifest.json" `
  "METODOLOGIA 1.pdf"
```

O manifesto precisa estar dentro de `work/content-ai/sources/` e se chamar `manifest.json`. O verificador confere o nome e SHA-256 do PDF original, tamanho, versão da ferramenta, número e ordem das páginas, IDs, estados, conteúdo UTF-8 de cada arquivo de texto, hash e quantidade de caracteres. Ele reextrai o PDF original em memória e compara cada página com o texto armazenado; conteúdo editado não passa só por atualizar o hash declarado.

Para verificar a preparação de páginas selecionadas para processamento externo:

```powershell
python scripts/content-ai/verify_source_manifest.py `
  "work/content-ai/sources/metodologia-1-<hash>/manifest.json" `
  "METODOLOGIA 1.pdf" `
  --for-external-processing --pages 1,4
```

O gate exige autorização externa `approved` com revisor, timestamp e `approvalBasis`; origem não desconhecida; direitos elegíveis com justificativa; e cada página selecionada marcada `verified` com revisor e timestamp. Páginas sem texto extraído não podem ser enviadas como evidência. Sem `--pages`, o gate exige revisão de todas as páginas. O manifesto completo e todos os textos são verificados mesmo quando apenas algumas páginas foram selecionadas. `--pages` exige `--for-external-processing`.

Proveniência registrada em arquivos locais não é uma assinatura digital nem comprova a identidade de quem editou o manifesto. A revisão e autorização são declarações humanas locais nesta etapa.

## Verificações

Rode os testes locais:

```powershell
python -m unittest discover -s scripts/content-ai -p "test_*.py"
npm.cmd test
npm.cmd run typecheck
```

Antes de usar evidências, confira visualmente o PDF original, incluindo figuras, tabelas e diagramas. A numeração é a página física do PDF começando em 1; ela pode diferir do número impresso no rodapé. O pypdf extrai texto selecionável, mas a ordem e o espaçamento podem variar; não faz OCR nem confirma o conteúdo visual.
