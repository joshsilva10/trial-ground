# Leitura real de nota fiscal no protótipo

## Objetivo
Substituir os dados simulados por leitura real, executada no navegador e mantida apenas em memória durante a sessão.

## Fluxo
1. Na opção **Nota fiscal**, oferecer três entradas: câmera ao vivo, imagem existente e PDF.
2. Na câmera, analisar continuamente a imagem como um scanner de documentos, detectar o contorno de uma possível nota fiscal e capturá-la automaticamente quando estiver enquadrada e legível.
3. Em imagem ou PDF, extrair o texto real do arquivo; em PDFs digitalizados, processar as páginas como imagem.
4. Identificar no conteúdo lido o número da nota fiscal e as linhas de produtos com suas quantidades.
5. Mostrar o número da nota e os itens em campos editáveis para conferência humana.
6. Só após confirmação, registrar as entradas no estoque e guardar o número da nota na origem das movimentações em memória.

## Interface e estados
- Separar claramente **Escanear nota**, **Selecionar imagem** e **Selecionar PDF**.
- Na câmera, exibir uma moldura de enquadramento e permitir também a captura manual caso a detecção automática não aconteça.
- Mostrar câmera ativa, permissão negada, arquivo inválido, processamento, leitura parcial, nenhum item encontrado e sucesso.
- Permitir corrigir o número, editar/remover itens e cancelar antes de confirmar.
- Limitar arquivos a 20 MB e indicar que a conferência é obrigatória, pois OCR pode interpretar campos incorretamente.

## Detalhes técnicos
- Usar a câmera traseira quando disponível e detecção visual local de documento para reconhecer estabilidade, enquadramento e contorno antes da captura automática.
- Usar OCR local no navegador para JPG/PNG e páginas renderizadas de PDF; nenhum arquivo será enviado ou persistido.
- Aplicar um parser tolerante aos formatos comuns de NF-e/NFC-e para número da nota, descrição e quantidade, preservando o texto lido quando a estrutura não puder ser reconhecida.
- Associar automaticamente itens reconhecidos aos produtos existentes por nome normalizado; itens sem correspondência permanecem revisáveis e podem criar produto como já ocorre hoje.
- A identificação da nota será feita pelo conteúdo visual e textual capturado, sem depender da existência de QR Code no documento.

## Validação
- Testar detecção e captura automática pela câmera, captura manual, imagem legível, PDF com texto e PDF digitalizado.
- Testar correção manual e confirmação da entrada, verificando saldo e movimentação com o número fiscal.
- Testar arquivo inválido, leitura vazia, permissão de câmera negada e uso em desktop e celular.
- Confirmar compilação e ausência de erros no navegador.
