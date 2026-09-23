# Corrigir a leitura dos itens da nota fiscal

## Objetivo
Fazer o sistema reconhecer a tabela de produtos mesmo quando o OCR troca a ordem das colunas, repete trechos ou divide a descrição em várias linhas, além de impedir que mensagens técnicas em inglês sejam exibidas.

## Diagnóstico confirmado
- O texto inicial “PRODUTOS/SERVIÇOS” faz o parser considerar que a tabela começou no canhoto da nota.
- Ao encontrar “CÁLCULO IMPOSTO”, o parser encerra a busca antes de chegar à tabela real, que aparece depois de “CÓDIGO / DESCRIÇÃO”.
- Nesta leitura, quantidade, preço e descrição aparecem em linhas e ordens diferentes; o agrupamento atual não reconstrói o item.
- A análise inteligente retornou “No output generated…”. Esse tipo de falha não está entre os erros tratados atualmente e, por isso, a mensagem técnica aparece na tela. A causa anterior dentro da transmissão não está disponível nos registros atuais, então ela não será presumida.

## Implementação
1. **Delimitar corretamente a tabela**
   - Não usar menções genéricas a “produtos/serviços” como início da tabela.
   - Priorizar conjuntos de cabeçalhos reais, como “CÓDIGO”, “DESCRIÇÃO”, “QTD/QTO”, “UNID” e “VLR UNIT”.
   - Permitir mais de uma região candidata, pois o OCR pode repetir a tabela.

2. **Reconstruir itens fragmentados**
   - Agrupar linhas próximas contendo descrição, quantidade, unidade, NCM e valores, independentemente da ordem reconhecida.
   - Juntar continuações como “Conector Dc Jack…” e “512 Es1-531”.
   - Separar quantidade de preço usando contexto de coluna e formato monetário, evitando interpretar `29,0000` como quantidade.
   - Remover duplicatas produzidas pelas duas leituras da mesma tabela.

3. **Tratar corretamente a falha da IA**
   - Capturar também a falha de transmissão sem saída.
   - Exibir uma mensagem clara em português, preservar o OCR e manter o botão de nova tentativa.
   - Não marcar a IA como concluída quando não houve resposta utilizável.
   - Registrar no servidor somente dados técnicos seguros da falha, sem imagem, conteúdo da nota ou dados pessoais.

4. **Preservar o fluxo atual**
   - Manter câmera, upload de imagem/PDF, edição manual, confirmação humana e armazenamento apenas na sessão.
   - Continuar mesclando resultados locais e da IA sem apagar itens válidos.

## Escopo de verificação
Conforme solicitado anteriormente, a implementação será feita sem executar o fluxo funcional com a nota, câmera ou upload. A compilação automática da prévia continuará sendo observada; a confirmação do reconhecimento ficará para um teste posterior autorizado por você.

## Riscos
- Outros layouts de nota podem exigir regras adicionais de agrupamento.
- Sem executar a nota após a mudança, o resultado específico permanecerá não confirmado até a validação posterior.
