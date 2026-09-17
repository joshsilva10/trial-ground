# Leitura real de nota fiscal no protótipo

## Objetivo
Substituir os dados simulados por leitura real, executada no navegador e mantida apenas em memória durante a sessão.

## Fluxo
1. Na opção **Nota fiscal**, oferecer três entradas: câmera ao vivo, imagem existente e PDF.
2. Na câmera, localizar e ler o QR Code da nota continuamente, com opção de capturar a imagem do documento quando necessário.
3. Em imagem ou PDF, extrair o texto real do arquivo; em PDFs digitalizados, processar as páginas como imagem.
4. Identificar no conteúdo lido o número da nota fiscal e as linhas de produtos com suas quantidades.
5. Mostrar o número da nota e os itens em campos editáveis para conferência humana.
6. Só após confirmação, registrar as entradas no estoque e guardar o número da nota na origem das movimentações em memória.

## Interface e estados
- Separar claramente **Escanear QR Code**, **Selecionar imagem** e **Selecionar PDF**.
- Mostrar câmera ativa, permissão negada, arquivo inválido, processamento, leitura parcial, nenhum item encontrado e sucesso.
- Permitir corrigir o número, editar/remover itens e cancelar antes de confirmar.
- Limitar arquivos a 20 MB e indicar que a conferência é obrigatória, pois OCR pode interpretar campos incorretamente.

## Detalhes técnicos
- Usar biblioteca de leitura de QR Code no navegador, com câmera traseira quando disponível.
- Usar OCR local no navegador para JPG/PNG e páginas renderizadas de PDF; nenhum arquivo será enviado ou persistido.
- Aplicar um parser tolerante aos formatos comuns de NF-e/NFC-e para número da nota, descrição e quantidade, preservando o texto lido quando a estrutura não puder ser reconhecida.
- Associar automaticamente itens reconhecidos aos produtos existentes por nome normalizado; itens sem correspondência permanecem revisáveis e podem criar produto como já ocorre hoje.
- O QR Code normalmente contém uma URL/chave de acesso, não toda a lista de produtos. Sem serviço externo, o protótipo registrará o número/chave disponível no QR; os itens virão do OCR da imagem/PDF ou da captura do documento.

## Validação
- Testar imagem legível, PDF com texto, PDF digitalizado e QR Code.
- Testar correção manual e confirmação da entrada, verificando saldo e movimentação com o número fiscal.
- Testar arquivo inválido, leitura vazia, permissão de câmera negada e uso em desktop e celular.
- Confirmar compilação e ausência de erros no navegador.
