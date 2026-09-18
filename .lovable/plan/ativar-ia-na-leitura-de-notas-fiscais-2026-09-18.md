# Ativar IA na leitura de notas fiscais

## Objetivo
Usar Lovable AI como segunda etapa da leitura de imagens e PDFs de notas fiscais, melhorando a identificação do número da nota e dos itens quando o reconhecimento local não for suficiente.

## Fluxo
1. A pessoa captura pela câmera ou escolhe uma imagem/PDF.
2. O navegador prepara o arquivo e tenta a leitura local já existente.
3. O arquivo é enviado com segurança ao servidor para extração por IA.
4. Número, descrição e quantidade dos itens aparecem para revisão.
5. Nada entra no estoque sem confirmação humana.
6. Os dados continuam somente em memória durante esta validação.

## Alterações
- Ativar Lovable Cloud e a chave gerenciada do Lovable AI.
- Criar uma função protegida no servidor para receber somente imagem ou PDF, validar tipo e tamanho e solicitar uma resposta estruturada.
- Integrar o resultado da IA à tela atual sem remover câmera, PDF, OCR local, correção manual ou mensagens de progresso/erro.
- Exibir falhas de créditos, configuração, formato ou indisponibilidade de forma clara, preservando a leitura local e o arquivo selecionado.

## Segurança e privacidade
- A chave da IA ficará somente no servidor.
- Aceitar apenas JPEG, PNG, WebP e PDF, até 20 MB.
- Não persistir a nota nem seus dados nesta etapa.
- Enviar o documento somente após a ação explícita de escanear ou selecionar arquivo.

## Componentes técnicos
- Função de servidor tipada para extração multimodal.
- Lovable AI via chamada transmitida, com resposta estruturada: `numero` e `itens[{ nome, quantidade }]`.
- Modelo padrão `openai/gpt-6-astra`.
- Fusão defensiva entre OCR local e IA, com limite de 80 itens e normalização das quantidades.

## Validação
- Testar a foto real enviada: nota nº 111968 e seu item.
- Testar câmera simulada, imagem inválida e erro da IA.
- Verificar computador e celular, compilação e ausência de erros no navegador.

## Riscos e limites
- A leitura por IA consome créditos do workspace.
- Fotos desfocadas ou cortadas ainda podem exigir correção manual.
- O resultado será sugestão; a confirmação humana permanece obrigatória.
