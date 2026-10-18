# Login do painel de Segurança

Usuário de demonstração: seguranca
Senha de demonstração: EquaGuard@2026

As credenciais estão configuradas em js/seguranca-auth.js. A sessão dura 30 minutos, fica restrita à aba via sessionStorage e pode ser encerrada pelo botão Sair. Sem sessão, o painel não carrega resultados nem permite exportar CSV. Ao sair, as tabelas são limpas.

Este é um bloqueio de interface para demonstração em um projeto estático. As credenciais e o armazenamento local podem ser inspecionados pelo navegador. Para controle de acesso real, é necessário autenticar e autorizar no servidor, inclusive nas consultas e exportações. Não use dados ou senhas corporativas reais neste protótipo.
