# Autenticação Firebase

## Direção vigente: acesso fechado (16/11/2026)

Esta seção substitui a proposta de Google e visitantes descrita no histórico abaixo. Toda a interface exige e-mail/senha e autorização do servidor. Não há criação de conta na interface, login Google ou entrada como visitante. O servidor aceita somente tokens do provedor `password`; tokens de Google são negados, inclusive para o UID proprietário.

O administrador cria as contas em Firebase Authentication → Usuários → Adicionar usuário e libera os respectivos UIDs em `FIREBASE_ALLOWED_UIDS` (separados por vírgula, variável apenas do servidor). `FIREBASE_OWNER_UID` identifica o proprietário, que também possui acesso e é o único com geração. Remover um UID da lista bloqueia seu próximo pedido de autorização; a interface revalida a cada minuto enquanto visível e ao retomar a aba. Desativar conta ou revogar sessão é verificado pelo Admin SDK. Não existe promoção automática do primeiro usuário.

Configuração obrigatória: ativar somente E-mail/senha (sem link por e-mail), desativar Google se habilitado, configurar credenciais Admin e cadastrar/liberar a conta proprietária. O acesso permanece bloqueado enquanto as credenciais não estiverem configuradas. Senhas são definidas pelo administrador em canal seguro; não devem ser enviadas pelo chat nem gravadas no repositório. Recuperação de acesso é intermediada pelo administrador nesta versão.

Ausência de tela de cadastro não desliga os endpoints públicos de criação do Firebase. Uma conta eventualmente criada diretamente nesses endpoints não entra na aplicação sem seu UID autorizado. Se for necessário impedir também a existência de registros não convidados no Firebase, configurar separadamente bloqueio de cadastro no serviço (avaliar suporte/configuração Identity Platform antes de habilitar). A lista no servidor é obrigatória independentemente disso.

O bloqueio implementado controla a navegação da aplicação e a autorização no endpoint de acesso. O conteúdo incorporado continua compilado nos recursos JavaScript e não constitui material confidencial protegido por servidor. Dados sensíveis futuros devem ser entregues por endpoints que validem autorização em cada pedido. Progresso local continua por navegador, não por conta; não presumir isolamento de dados em computadores compartilhados. Acesso offline foi bloqueado para permitir verificação de autorização; dados já existentes continuam no dispositivo e não são apagados por logout ou revogação.

Testes cobrem proprietário, aluno autorizado, UID desconhecido, Google recusado, revogação, configuração ausente, ausência de cadastro/Google na interface e bloqueio de navegação direta por hash. Testes de estudo usam autenticação simulada explicitamente autorizada; produção não tem bypass de teste.

## Histórico da primeira proposta (substituído)

Especificação da entrega: login Google opcional, sessão persistente, saída e geração de prompts exclusiva do proprietário. Estudo, importação e progresso local permanecem disponíveis para visitantes. O progresso continua compartilhado pelo navegador, sem sincronização ou separação por conta; entrar/sair não o transfere nem apaga.

O proprietário é um único UID configurado no servidor em FIREBASE_OWNER_UID. Nenhum nome, e-mail local ou parâmetro da URL concede privilégios. O servidor verifica assinatura, validade, revogação, conta desativada e e-mail verificado antes de informar a permissão. Sem configuração, a geração permanece oculta. A geração atual é um construtor local de prompts, não uma chamada paga de IA; ocultá-lo não torna seu algoritmo secreto.

Configuração:
1. No projeto evolua-323f9, registrar aplicativo Web e copiar os valores públicos para web/.env.local conforme web/.env.example.
2. Em Authentication, habilitar Google, selecionar e-mail de suporte e autorizar os domínios reais da aplicação. Para desenvolvimento, autorizar localhost e 127.0.0.1 se utilizados.
3. Configurar credenciais Admin do mesmo projeto no servidor: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY. Nunca enviar chave privada pelo chat ou versioná-la; cadastrar diretamente no ambiente local/hosting.
4. Entrar com sua conta Google; copiar o UID mostrado em Meu perfil e configurar FIREBASE_OWNER_UID somente no servidor. Reiniciar aplicação. Nenhum usuário vira proprietário automaticamente.
5. Configurar as mesmas variáveis na hospedagem e refazer o build: valores NEXT_PUBLIC são incorporados ao bundle.

Aceite: visitante e usuário comum importam, mas não veem geração; proprietário verificado vê geração; sair remove permissão imediatamente; erro de autorização falha fechado; token falso/revogado não autoriza. Login cancelado, popup bloqueado, offline e configuração ausente têm mensagens recuperáveis. Endpoints de autenticação usam no-store e não são armazenados pelo service worker. Operações futuras de API devem chamar o verificador no servidor em cada requisição.

Validação planejada: testes de autorização e de estados da interface, regressão de importação, typecheck e build; teste real com Google depende da configuração do console e das credenciais. Não é necessário Firestore, Storage ou Firebase Hosting.
