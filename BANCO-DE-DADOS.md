# EquaGuard com banco de dados

Execute `INICIAR-EQUAGUARD.cmd` ou, nesta pasta, `node server.cjs`. Requer Node.js 24 ou superior; não precisa instalar pacotes. Abra http://127.0.0.1:3000. A partir desta versão, abrir o HTML diretamente não conecta o banco nem valida o login.

## Acesso ao painel

Usuário inicial: `seguranca`. Na primeira inicialização, uma senha aleatória aparece no terminal uma única vez. Guarde-a e use **Alterar minha senha**, no painel, para definir outra. A senha antiga de demonstração foi removida. Se a instalação já foi inicializada, a senha existente é preservada. Para redefinir, pare o servidor e execute `node server.cjs --reset-admin`; as sessões administrativas serão revogadas e uma nova senha aparecerá no terminal. É possível fornecer `EG_ADMIN_PASSWORD` na primeira inicialização, com pelo menos 12 caracteres; ela não é usada para sobrescrever instalações existentes.

Senhas ficam como hash scrypt com salt aleatório. Sessões são cookies HttpOnly e SameSite=Strict, com tokens aleatórios cujo hash fica no banco. O login expira em 30 minutos, o logout revoga a sessão e a troca de senha revoga todos os acessos administrativos. Tentativas inválidas são limitadas por endereço e registradas sem senha. O servidor exige sessão para consultar resultados; arquivos do banco, código do servidor e backups não são publicados.

## O que é salvo

O arquivo `data/equaguard.sqlite` contém usuários administrativos, participantes, sessões, resultados, progresso por módulo e auditoria de login. Cada resultado mantém pontos, acertos, erros, escolhas e perfil no momento da partida. Um evento reenviado não gera registro duplicado. Os dados sobrevivem ao fechamento e reinício do servidor.

Participantes continuam entrando por nome e área, sem senha individual. Um cookie permite retomar o participante neste navegador por até 30 dias. **Começar** cria outro participante; nomes iguais não juntam históricos. A consulta consolidada pertence ao painel da Segurança. Contas individuais de jogadores em outros dispositivos não fazem parte deste fluxo.

O servidor valida módulos, pré-requisitos, identidade e limites de pontuação. O jogo continua calculando as escolhas no navegador; não é uma plataforma de avaliação com proteção contra manipulação do cliente. Progresso é confirmado no banco ao receber o resultado; o cache local libera a interface enquanto a fila é enviada. Falhas de rede mantêm uma fila local, reenviada ao retornar a conexão ou reabrir o jogo.

O painel considera a última execução de cada participante por módulo. Todas as execuções ficam no banco. O botão Atualizar consulta os resultados do servidor e Exportar CSV verifica a sessão antes de gerar o arquivo.

## Dados anteriores e operação

Resultados antigos em localStorage ou Google Sheets não são importados automaticamente, pois não possuem a identidade do novo servidor. São preservados em suas origens. Os novos resultados passam a usar SQLite; não são mais enviados ao antigo endpoint da planilha.

Para backup simples, pare o servidor e copie a pasta `data` inteira. Não copie apenas o arquivo principal enquanto ele está aberto: o SQLite usa WAL. Não apague `data` ao atualizar os arquivos do aplicativo. O servidor escuta apenas em 127.0.0.1, sem exposição à rede. Hospedagem para equipe exige HTTPS, armazenamento persistente, configuração de acesso e `EG_COOKIE_SECURE=1` atrás de um servidor HTTPS.

## Verificação

Execute `npm test` ou `node --test tests/server.test.cjs`. Os testes usam banco temporário e verificam login, sessão, autorização, persistência após reinício, trilha técnica, deduplicação e troca de senha.

Referência da API utilizada: [SQLite no Node.js 24](https://nodejs.org/docs/latest-v24.x/api/sqlite.html).
