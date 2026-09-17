# Corrigir câmera e leitura dos itens da nota fiscal

## Objetivo
Fazer a imagem da câmera aparecer após a permissão e reconhecer a linha de produto da nota real enviada, mantendo a revisão manual antes de atualizar o estoque.

## Diagnóstico confirmado
- A tela ativa a câmera, mas associa o fluxo de vídeo por um temporizador imediatamente após a mudança de tela. Isso pode ocorrer antes de o elemento de vídeo existir, deixando apenas a moldura vazia.
- Na imagem enviada, o OCR lê partes do cabeçalho e dos totais, mas perde a linha pequena da tabela de produtos. O analisador atual também espera formatos lineares mais simples e não reconstrói colunas de DANFE.

## Implementação
1. **Prévia da câmera**
   - Associar o fluxo ao vídeo somente quando o elemento estiver montado.
   - Aguardar o carregamento dos dados da câmera e confirmar a reprodução antes de iniciar a detecção automática.
   - Exibir uma mensagem clara se a câmera abriu, mas a imagem não pôde ser reproduzida.
   - Encerrar corretamente câmera e temporizadores ao cancelar, capturar ou sair da tela.

2. **Leitura de imagens de DANFE**
   - Preparar a imagem antes do OCR: corrigir orientação, ampliar resolução útil, aumentar contraste e reduzir ruído.
   - Fazer uma leitura geral para número da nota e uma leitura direcionada à região/tabela de produtos.
   - Reconstruir itens mesmo quando descrição, unidade, quantidade e valores forem separados em colunas ou linhas pelo OCR.
   - Evitar interpretar cabeçalhos, impostos e totais como produtos.

3. **Revisão e retorno ao usuário**
   - Manter o texto bruto disponível quando algum campo não for reconhecido.
   - Mostrar separadamente quando o número foi encontrado, mas os itens precisam de correção.
   - Preservar inclusão, edição e remoção manual antes da confirmação.

## Validação
- Usar a foto enviada como caso real e confirmar a extração do produto da tabela, sua quantidade e o número fiscal quando legível.
- Simular uma câmera em navegador para verificar vídeo visível, captura manual e captura automática.
- Validar em computador e celular, incluindo permissão negada, imagem sem itens e cancelamento.
- Confirmar ausência de erros e que os dados continuam apenas na memória da sessão.

## Limites e riscos
- Fotos desfocadas, inclinadas ou com texto muito pequeno ainda podem exigir correção manual.
- Nenhum arquivo será enviado a serviço externo ou armazenado permanentemente.
