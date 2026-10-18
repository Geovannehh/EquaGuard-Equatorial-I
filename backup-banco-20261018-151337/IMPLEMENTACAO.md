# Dados de Segurança e perfil Técnico

Abra `index.html` e use **Painel de Segurança**, ou abra `seguranca.html`.
O painel usa resultados reais armazenados neste navegador, sem dados fictícios. Mostra a última execução de cada módulo por participante, filtros, conclusão de trilhas, reforços e CSV. O histórico completo continua no armazenamento local e é enviado ao endpoint configurado.

O perfil Técnico usa a imagem fornecida, faz os módulos comuns e as três situações de rede operacional. O módulo 4 exige o módulo 3 comum e, para o Técnico, as três situações operacionais. O perfil selecionado é restaurado ao voltar dos módulos.

## Planilha

Atualize o código da implantação existente com `apps-script/planilha.gs` e publique uma nova versão no Google Apps Script. Preserve a URL em `js/eg-dados.js`. O script acrescenta Perfil e ID do jogador após as colunas existentes e cria a aba Resultados com histórico detalhado e deduplicação por evento. A aba Desempenho mantém a identificação anterior por nome e setor para compatibilidade; o histórico distingue sessões por ID.

O envio existente usa `no-cors`: a resolução do fetch não confirma a gravação na planilha. A fila repete somente falhas de rede; o histórico local permite exportar resultados caso haja falha no servidor. A implantação remota não foi alterada nesta entrega.

## Limites do protótipo

O painel local não possui autenticação nem consulta resultados de outros computadores. Para uso corporativo, publique em ambiente com autenticação e controle de acesso e conecte uma API de consulta autorizada. As recomendações exigem três participantes. Repetições substituem o resultado exibido, preservando o histórico local. Acertos dos desafios de dispositivo representam sucesso sem erro inicial; tentativas erradas são registradas separadamente.
