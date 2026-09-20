# Requisições com complemento e itens não cadastrados

## Objetivo
Permitir que a equipe administrativa complemente uma liberação parcial ou reverta uma recusa, além de aceitar na requisição produtos que ainda não existem no cadastro.

## Fluxo
1. Na nova requisição, o solicitante poderá escolher um produto existente ou adicionar um item avulso com nome, unidade e quantidade.
2. Itens avulsos serão identificados como “não cadastrado” e não entrarão automaticamente no catálogo ou no estoque.
3. Na análise, requisições pendentes, parcialmente aprovadas ou rejeitadas continuarão editáveis pela equipe administrativa.
4. O administrador informará o total liberado por item. Em revisões posteriores, o sistema baixará somente a diferença positiva ainda não entregue.
5. Uma requisição ficará aprovada parcialmente enquanto houver quantidade pendente e passará a aprovada total quando tudo for liberado.
6. Cada decisão ficará no histórico com responsável, data, justificativa e quantidades acrescentadas.

## Componentes e dados
- Atualizar o modelo de item para aceitar produto cadastrado ou descrição avulsa.
- Trocar a análise única por um histórico de decisões, preservando compatibilidade com os dados demonstrativos.
- Ajustar a tela de nova requisição para incluir itens avulsos.
- Ajustar a tela de requisições para editar liberações e exibir histórico.
- Manter tudo somente em memória durante esta validação.

## Permissões
- Todos os perfis podem solicitar itens cadastrados ou avulsos.
- Apenas Desenvolvimento e Operador administrativo podem liberar, complementar ou revisar uma recusa.
- Itens avulsos sem vínculo com estoque não geram baixa automática.

## Regras e riscos
- Nunca reduzir uma quantidade já liberada, pois isso exigiria estorno de estoque.
- Nunca liberar acima da quantidade solicitada.
- Para produtos cadastrados, nunca liberar complemento acima do saldo atual.
- Evitar saída duplicada: registrar somente o complemento entre o total anterior e o novo total.
- Uma recusa revisada permanece visível no histórico.

## Testes
- Aprovação parcial seguida de complemento até aprovação total.
- Recusa seguida de liberação posterior.
- Bloqueio de redução e de quantidade acima do solicitado ou do saldo.
- Solicitação e análise de produto não cadastrado.
- Conferência do histórico e das movimentações sem duplicidade.
