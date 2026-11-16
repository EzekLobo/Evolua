# Documentação da Evolua

## Definição consolidada — 16/11/2026

1. [PRD da aplicação](PRD-EVOLUA.md): objetivos, escopo, requisitos, jornadas, aceites e arquitetura.
2. [Regras de negócio](regras-negocio-evolua.md): permissões, autoria, importação, aprendizagem, avaliação, jogos, IA, dados e apresentação.
3. [Contratos e dados](contratos-dados-evolua.md): schemas atuais, limites, persistência, APIs e banco compartilhado proposto.
4. [Diagnóstico e decisões](diagnostico-evolua.md): decisões confirmadas, lacunas, pendências e validações efetivamente executadas.

O PRD distingue decisões do proprietário, comportamento observado e propostas. A regra de aprovação de 80% e o banco comum não devem ser considerados implementados só porque estão documentados.

## Planejamento e histórico

- [Plano de autoria assistida](plano-autoria-assistida.md): plano versionado com etapas EP; precisa ser reconciliado com o PRD antes da próxima execução ampla.
- [Execução baseline 2.1](execucao-baseline21.md): fotografia histórica; o tutor já recebeu integração real depois desse registro.
- [Autenticação Firebase](firebase-auth.md): procedimento e histórico; confrontar com regras e gaps atuais, especialmente o provedor do proprietário.
- [Pacotes de jogos](game-packs.md): contrato legado e autoria assistida; não representa ainda o banco canônico integrado.
- [Arquitetura web anterior](web-architecture.md): histórico; trechos sobre visitante, armazenamento global, ausência de envio para IA e Supabase não são decisões atuais deste PRD.
- [Prompts do pipeline original](content_pipeline_prompts.md): referência histórica de conteúdo.

Credenciais, chaves e arquivos .env não fazem parte da documentação de produto e não devem ser publicados.
