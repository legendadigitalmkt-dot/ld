# CRM: perfil, notas e configurações

O perfil `/app/contacts/[contactId]` reúne dados do contato, empresa, responsável, tags, oportunidades, tarefas, conversas e histórico do workspace ativo. A lista e a busca global abrem o perfil. A lista aceita um filtro de tag exata, preservado na paginação. A criação anterior de lead e oportunidade permanece disponível.

## Uso e limites

- Editores podem alterar nome, empresa, e-mail, telefone, origem, status, tags e responsável. Viewers podem consultar o perfil.
- Empresa é opcional. Tags são deduplicadas, com até 10 valores de 32 caracteres. O responsável precisa pertencer ao mesmo workspace.
- Notas de 2 a 4.000 caracteres ficam nas atividades, com autor e data. Repetir a mesma solicitação não cria outra nota. Notas são visíveis à equipe do workspace; esta entrega não oferece exclusão ou edição de notas.
- Os totais usam todos os registros relacionados. As prévias mostram até 20 oportunidades, 20 tarefas e 10 conversas; o histórico tem páginas de 30 eventos, e as notas recentes mostram até 5 entradas. Atividades com mais de uma referência ao contato aparecem uma única vez.
- Tarefas antigas ligadas apenas a uma oportunidade do contato também aparecem. Registros não relacionados e registros de outros workspaces ficam fora do perfil.
- Alterar o telefone do perfil não altera identificadores de canais ou destinatários de conversas WhatsApp existentes.
- O Inbox abre uma conversa escolhida mesmo fora da lista inicial de 100. Um identificador indisponível não seleciona outra conversa. Mostra as 300 mensagens mais recentes em ordem cronológica e informa o limite; paginação de mensagens antigas permanece pendente.

## Configurações

`/app/settings` permite que proprietários e administradores atualizem nome, segmento e fuso do workspace. O identificador permanece estável. Alterar o fuso muda a apresentação dos horários, sem deslocar os instantes já gravados para vencimentos. Vendedores, suporte e viewers não podem alterar o workspace. Os links existentes de membros e integrações continuam disponíveis.

## Banco e segurança

A migração `crm_contact_context` adiciona `contacts.company`, seis índices e quatro funções: `contact_context`, `update_contact_profile`, `add_contact_note` e `update_workspace_profile`. Todas usam `SECURITY INVOKER`, `search_path` vazio, RLS existente, acesso explícito ao workspace e permissão de execução apenas para `authenticated`. As permissões reais são verificadas dentro das funções e nas ações do servidor; ocultar um formulário não é a barreira de segurança.

Atualizações comparam `updated_at` sob bloqueio de linha para rejeitar uma versão antiga sem sobrescrever a alteração de outra pessoa. Campos controlados permanecem no formulário em erros de validação. A atualização de perfil e sua atividade são atômicas. A nota usa um UUID de solicitação e um bloqueio transacional para idempotência. Os eventos de atualização registram os nomes dos campos alterados, sem copiar valores anteriores sensíveis.

Nenhuma tabela, política, contato, oportunidade, mensagem, configuração de canal ou usuário existente é removido. Não são adicionadas dependências nem variáveis de ambiente. Portal institucional, autenticação, webhook e ação de envio de WhatsApp permanecem nos serviços existentes.

## Validação e publicação

Os testes unitários validam limites, normalização, notas e fusos. `060_crm_contact_context.test.sql` tem 41 verificações isoladas, incluindo mais de 1.000 tarefas, paginação, referências duplicadas, isolamento entre workspaces mesmo para um membro de ambos, viewer, administrador, conflitos de versão, notas repetidas e acesso anônimo negado. As fixtures estão em uma transação com rollback e devem rodar apenas no banco local de CI.

Executar TypeScript, lint, testes unitários, build, reconstrução por migrações, lint PostgreSQL e toda a suíte pgTAP antes da publicação. Aplicar a migração aditiva no Supabase do software antes de liberar o código que chama as novas funções. Alinhar somente o nome do arquivo novo à versão registrada pelo serviço, se necessário, e repetir os checks no commit final antes do merge. Confirmar o commit concluído na Hostinger e as rotas públicas/protegidas em produção.

Um rollback do código pode manter a migração aditiva e as notas existentes. Não remover a coluna ou as atividades para desfazer uma interface. Uma sessão autenticada real é necessária para confirmar visualmente o perfil e as configurações; checks de redirecionamento e metadados não substituem essa inspeção.

Importação, exportação, ações em lote, relatórios avançados, automações e IA operacional não fazem parte desta entrega.
