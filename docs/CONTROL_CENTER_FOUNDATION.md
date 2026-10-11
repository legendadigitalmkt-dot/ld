# Growth OS — P0 Control Center Foundation

## Auditoria anterior à implementação — 11/10/2026

Ordem: `Texto colado(20261011-190840).txt`, LD HQ → LD Dev. Auditoria às 16h de America/Sao_Paulo. Estado verificado no GitHub `legendadigitalmkt-dot/ld` main `e31bddf9b00d638d0795b579624ee22cb6cb5283`, Supabase Growth OS `cknlzuinwcdupdxilzcf` (PostgreSQL 17.11) e publicação Hostinger `product-flags-v1`. PR #22 já mergeado; os dois workflows de main aprovados. PR #26 de planos permanece aberto, sem merge, e sua migration não consta no histórico nem suas tabelas no banco. Não executar esse milestone nesta ordem.

Baseline somente leitura: 2 usuários, 1 workspace, 1 vínculo de membro, 6 contatos, 6 oportunidades, 0 tarefas e 36 atividades. Há 41 ações administrativas históricas neste momento, incluindo provisionamento explícito e consultas reais. Novos acessos legítimos podem acrescentar auditorias; não apagar registros para preservar contagens.

### Matriz prévia

| Requisito | Classificação | Evidência e lacuna |
| --- | --- | --- |
| Workspace proprietário estrutural | Existente | Registro privado por UUID, tipo platform_owner e status active; não depende de nome. |
| Platform Owner | Existente | legendadigitalmkt@gmail.com possui papel explícito; um TOTP verificado. Não recriar papel/MFA. |
| RBAC granular | Existente | Onze papéis e treze permissões vigentes; checagens no banco e servidor. Papéis futuros não ganham acesso a módulos ausentes. |
| Separação de planos arquiteturais | Existente | control_plane privado; CRM por tenant; negócio interno preservado. Portal/repositório/banco próprios intactos. |
| /control-center, layout, sidebar | Existente | Layout administrativo dedicado, Overview/Users/Workspaces/Audit Logs/Settings/Permissões; identificação PLATFORM OWNER/SUPER ADMIN. |
| Overview com números reais | Existente | Agregados de Auth/workspaces e trilha real; sem indicadores fabricados. |
| Users | Parcial | Lista, busca, status, perfil/metadados, papéis, criação/último acesso e suspensão existem. Falta filtro por workspace. Gestão de papéis já existe em Permissões. |
| Workspaces | Parcial | Busca, status, owner, criação, contagens, integração e suspensão existem. Membros aparecem somente como contagem: falta consulta nominal/paginada autorizada. Planos não existem em produção. |
| Auditoria | Parcial | Append-only, ator/sessão/ação/motivo e before/after existentes. Faltam snapshot dos papéis do ator e workspace_id explícito. Não inferir contexto histórico ausente. |
| Settings foundation | Parcial | Configurações gerais funcionais e segurança informativa. Faltam quatro seções explícitas General/Product/Security/Integrations. |
| Auth, RLS, isolamento | Existente | Dez tabelas de controle com RLS forçado e zero grants diretos; doze facades invoker, search_path vazio, anon sem EXECUTE. Sessão/MFA/papel atuais no banco; papéis de plataforma não liberam CRM de terceiros. |
| Testes e CI da fundação vigente | Existente | Suítes de Auth/RLS/CRM/Pipeline/WhatsApp e controle; workflows main 38064979956 e 38064979913 verdes. Reexecutar para qualquer correção. |
| Smoke público/anônimo atual | Existente | Health/login 200; rotas administrativas e CRM redirecionam anônimo para /login. Publicação confirma product-flags-v1. |
| Smoke completo autenticado atual | Parcial | Leituras reais e TOTP comprovados no banco; navegador do agente sem abas/sessão. Owner/usuário comum/login/logout devem ser validados com sessão pessoal, sem fabricar JWT/OTP nem suspender dados reais. |
| Documento solicitado | Ausente | Há docs/CONTROL_PLANE_FOUNDATION.md; este novo arquivo adota o nome solicitado e registra a auditoria e entrega. |

### Plano técnico limitado ao P0

1. Preservar funções/contratos existentes; adicionar RPC de Users filtrado e leitura de membros com metadados paginados. Não implementar impersonation nem nova operação interna.
2. Exigir users.read para Users; exigir workspaces.read **e** users.read para nomes/e-mails de membros. RBAC/MFA/sessões atuais continuam obrigatórios. Limitar entradas e resultados; não retornar dados de CRM ou segredos.
3. Acrescentar actor_roles e workspace_id à auditoria em migration atômica. Capturar papéis no momento de novas ações; preservar NULL dos registros históricos. Não alterar registros anteriores.
4. Completar seções informativas de Settings, mantendo apenas os campos gerais já aprovados editáveis. Reutilizar Product existente quando autorizado.
5. Testar fixtures sintéticas somente no CI descartável, validar regressões, aplicar migration Growth OS, alinhar sua versão registrada, PR/CI/merge/deploy e smoke. Documentar claramente qualquer cobertura autenticada indisponível.

## Arquitetura e autorização

Growth OS: app.legendadigital.com.br → repositório ld → Supabase cknlzuinwcdupdxilzcf → Hostinger. Portal: legendadigital.com.br → legenda-digital-portal → banco separado. Nenhuma alteração no portal ou nas tabelas históricas de portal presentes no banco de software.

Control plane: schema privado control_plane, não exposto diretamente pela Data API. Customer data plane: tabelas/RLS por workspace no schema public. Internal business plane: dados internos existentes preservados; sem novo CRM interno, sem mistura de papéis administrativos com papéis de operação.

Auth valida identidade ativa/confirmada/não anônima, sessão real vigente e pertencimento ao workspace proprietário. Exige papel/permissão do banco, sessão atual AAL2, JWT AAL2 e fator MFA verificado. Rotas, ações de servidor e RPCs conferem autorização; não usar user_metadata nem flags visuais para autorizar. Anônimo vai para login, usuário sem elegibilidade recebe 404, administrador sem MFA vai para verificação.

## Papéis e permissões vigentes

Papéis: platform_owner, super_admin, product_admin, billing_admin, sales_admin, marketing_admin, support_admin, security_admin, content_admin, analyst, viewer.

Permissões: platform.access, overview.read, users.read, users.suspend, workspaces.read, workspaces.suspend, roles.read, roles.manage, audit.read, settings.read, system.settings, product.read, feature_flags.manage. Não criar permissões fictícias para billing/impersonation/módulos não entregues. Somente Platform Owner gerencia papéis não-owner para membros confirmados do workspace proprietário; proibir autoconcessão, remoção/concessão de owner e suspensão do owner/workspace proprietário.

Matriz detalhada, bootstrap e recuperação MFA: [CONTROL_PLANE_FOUNDATION.md](./CONTROL_PLANE_FOUNDATION.md). Product/flags já entregue: [PRODUCT_ADMINISTRATION.md](./PRODUCT_ADMINISTRATION.md). Estes módulos anteriores não são reconstruídos.

## Schema e RLS

Existentes: platform_roles, platform_permissions, platform_role_permissions, platform_user_roles, platform_workspace_registry, platform_user_controls, platform_settings, admin_audit_logs; product_features/feature_rules da entrega posterior já existente. Dez tabelas privadas com RLS habilitado e forçado, sem acesso direto de anon/authenticated/service_role. Implementações privilegiadas privadas com search_path vazio e autorização explícita; facades públicas security invoker. Helpers de bootstrap/auditoria permanecem não invocáveis pelo cliente.

Suspensões bloqueiam usuário/workspace no aplicativo e RLS mantendo CRM, Pipeline, mensagens e ingestão confiável. Senhas/tokens/chaves não são exibidos ou editados; recuperação usa Auth existente. Mudanças sensíveis exigem motivo, confirmação, comparação de estado/revisão e auditoria atômica.

## Rotas vigentes

/control-center, /control-center/verify, /control-center/users, /control-center/workspaces, /control-center/permissions, /control-center/audit, /control-center/settings e /control-center/product. Audit Logs corresponde à rota /audit. Não confundir redirect de uma URL inexistente com prova de tela funcional.

## Segurança observada e limites

Advisors não apontam ERROR. Avisos preexistentes: [proteção de senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) e [políticas permissivas múltiplas](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies) em tabelas históricas. INFO de [RLS sem policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) é intencional nas tabelas privadas sem grants. Não ampliar acesso para silenciar INFO. Revisar advisors novamente após DDL.

Changelog e docs oficiais revisados antes de implementar. PostgreSQL já usa 17.11; esta correção não modifica extensões/cifras/índices afectados pelo upgrade. Não instalar providers, billing ou novas dependências de produto.

## Deploy e rollback

Branch feat/control-foundation-p0-20261011 a partir do main auditado. CI exige typecheck, lint, testes, build, reconstrução/lint do banco e pgTAP. Aplicar apenas migration aditiva aprovada no CI antes do app; fluxo GitHub/main → Hostinger permanece intacto. Não aplicar PR #26.

Rollback do app por PR de revert/CI/deploy para e31bddf9b00d638d0795b579624ee22cb6cb5283. Manter colunas de auditoria, novas RPCs, registros e dados; interfaces antigas permanecem compatíveis. Remediação do banco somente por migration posterior revisada; não dropar tabelas, resetar banco/Auth, remover owner/MFA ou apagar trilha. Não executar suspensão, alteração de papel ou mensagens reais para smoke.

## Registro da entrega

Auditoria concluída antes da implementação. Correções, migration/versionamento, PR/commit, CI e smoke atuais serão registrados aqui após validação. Aceite integral depende da comprovação das rotas privadas, login/logout e isolamento com sessões reais; não declarar concluído por health 200 ou fixtures apenas.

### Correções implementadas após a matriz

- Users usa platform_users_filtered com workspace UUID opcional, interseção de busca/status, paginação de 25 e filtro preservado nos links. Entrada de workspace inválida não dispara consulta ampla. Sugestões limitadas a 100, incluindo seleção atual; nomes só com workspaces.read. Contrato platform_users anterior permanece funcional.
- /control-center/workspaces/[id] consulta nomes/e-mails/papéis reais com paginação de 25 através de platform_workspace_members. Exige workspaces.read e users.read simultaneamente no servidor e no banco. Não abre dados de CRM, não assume identidade de cliente nem altera vínculo. Consulta registra workspace.viewed.
- Auditoria recebe actor_roles text[] como snapshot de todos os papéis atuais (equivalente multi-role ao actor_role solicitado), e workspace_id UUID como contexto opcional. Valores antigos permanecem NULL; a UI os identifica como desconhecidos. UUID/atores são snapshots sem FK que apagaria atribuição histórica; proteção append-only e grants permanecem.
- Settings oferece General/Product/Security/Integrations com âncoras, mantendo somente os campos gerais existentes editáveis e links dependentes de permissão. Não configura novos providers ou billing.
- Migration única atômica em bloco DO; mantém funções antigas e adiciona apenas duas facades públicas invoker autenticadas, sem concessões diretas de tabela. Nenhuma role/permissão de usuário real alterada.

Validação local: 79 testes de aplicação, typecheck e build passaram. Novos arquivos TS sem avisos de lint; 197 avisos globais preexistentes. Nova suíte pgTAP: 36 assertions com fixtures sintéticas descartadas. Resultado do banco/CI ainda pendente; não equivale a smoke autenticado em produção.
