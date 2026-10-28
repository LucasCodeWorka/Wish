# Mapeamento WishBI para relatorios

Varredura executada em 2026-09-29 14:00:49 no banco `WishBI`, servidor `CONEXA`.

## Estado atual da carga

| Tabela | Linhas | Papel provavel |
| --- | ---: | --- |
| `Classificacao` | 228 | Atributos/classificacoes de produto |
| `Conta` | 2600 | Clientes, fornecedores, vendedoras, estoques, contas financeiras |
| `ContaEndereco` | 188 | Dados de endereco/contato |
| `Empresa` | 14 | Empresas/filiais |
| `Estoque` | 14923 | Posicao de estoque por empresa/conta/produto |
| `FormaDePagamento` | 104 | Dimensao de formas de pagamento |
| `GrupoDeConta` | 10 | Tipo da conta: cliente, fornecedor, vendedora etc. |
| `Moeda` | 0 | Dimensao vazia no momento |
| `Movimentacao` | 25940 | Cabecalho de movimentos/vendas/compras/financeiro/estoque |
| `MovimentacaoPagamento` | 27030 | Pagamentos/parcelas do movimento |
| `MovimentacaoProduto` | 45518 | Itens/produtos do movimento |
| `MovimentacaoVendedor` | 2441 | Vendedoras/comissoes do movimento |
| `Operacao` | 34 | Tipo de operacao |
| `Produto` | 6863 | Cadastro de produtos |
| `ProdutoClassificacao` | 27145 | Ponte produto x classificacao |
| `TipoDeClassificacao` | 2 | Tipos cadastrados: `METAL`, `CATEGORY` |
| `Unidade` | 0 | Dimensao vazia no momento |

Observacao: o banco ainda esta em carga. Na propria varredura, algumas tabelas de movimento ja tinham aumentado em relacao a leitura anterior.

## Chaves e indices

Nao existem PKs, FKs, UNIQUE constraints ou indices declarados visiveis no catalogo. A modelagem precisa usar chaves logicas.

Vinculos logicos confirmados:

| Origem | Destino | Observacao |
| --- | --- | --- |
| `MovimentacaoProduto.id_movimentacaoproduto` | `Movimentacao.id_movimentacao` | Confirmado pelos dados |
| `MovimentacaoPagamento.id_movimentacaopagamento` | `Movimentacao.id_movimentacao` | Confirmado pelos dados |
| `MovimentacaoVendedor.id_movimentacaovendedor` | `Movimentacao.id_movimentacao` | Confirmado pelos dados |
| `Movimentacao.rid_operacao` | `Operacao.id_operacao` | Sem orfaos |
| `Movimentacao.rid_empresa` | `Empresa.id_empresa` | Relacao provavel |
| `Movimentacao.rid_conta_origem` / `rid_conta_destino` | `Conta.id_conta` | Cliente/fornecedor/estoque conforme operacao |
| `Movimentacao.rid_grupodeconta_origem` / `rid_grupodeconta_destino` | `GrupoDeConta.id_grupodeconta` | Grupo da conta origem/destino |
| `MovimentacaoProduto.rid_produto` | `Produto.id_produto` | 65 linhas sem produto cadastrado |
| `MovimentacaoPagamento.rid_formadepagamento` | `FormaDePagamento.id_formadepagamento` | Sem orfaos |
| `MovimentacaoVendedor.rid_conta_vendedor` | `Conta.id_conta` | Sem orfaos |
| `ProdutoClassificacao.id_produtoclassificacao` | `Produto.id_produto` | Ponte usa o id do produto como id da tabela; 108 linhas sem produto correspondente |
| `ProdutoClassificacao.rid_classificacao` | `Classificacao.id_classificacao` | Sem orfaos |
| `ProdutoClassificacao.rid_tipodeclassificacao` | `TipoDeClassificacao.id_tipodeclassificacao` | Muitos tipos faltando |
| `Classificacao.rid_tipodeclassificacao` | `TipoDeClassificacao.id_tipodeclassificacao` | 197 classificacoes sem tipo cadastrado |
| `Estoque.rid_produto` | `Produto.id_produto` | Posicao por produto |
| `Estoque.rid_conta` | `Conta.id_conta` | Estoque/local/cliente/consignado |

## Colunas por tabela

### `Movimentacao`

`id_movimentacao`, `numero`, `data`, `rid_empresa`, `rid_operacao`, `rid_grupodeconta_origem`, `rid_grupodeconta_destino`, `rid_conta_origem`, `rid_conta_destino`, `valor`, `entrada`, `saida`, `atualizadoem`, `inativo`, `status`.

### `MovimentacaoProduto`

`id_movimentacaoproduto`, `nitem`, `quantidade`, `unitario`, `rid_produto`.

### `MovimentacaoPagamento`

`id_movimentacaopagamento`, `valor`, `debitocredito`, `rid_formadepagamento`.

### `MovimentacaoVendedor`

`id_movimentacaovendedor`, `comissao`, `rid_conta_vendedor`.

### `Produto`

`id_produto`, `codigo`, `descricao`, `valordecusto`, `valordevenda`, `peso`, `rid_unidade`, `rid_moeda_custo`, `rid_moeda_venda`, `atualizadoEm`, `inativo`, `status`.

### `Conta`

`id_conta`, `codigo`, `identificacao`, `nomerazao`, `rid_grupodeconta`, `atualizadoem`, `inativo`, `status`.

### Outras dimensoes

`Empresa`: `id_empresa`, `codigo`, `identificacao`, `atualizadoem`, `inativo`, `status`.

`GrupoDeConta`: `id_grupodeconta`, `codigo`, `descricao`, `atualizadoem`, `inativo`, `status`.

`FormaDePagamento`: `id_formadepagamento`, `codigo`, `descricao`, `titulo`, `cartao`, `cheque`, `rid_tipodeformadepagamento`, `baixaourecebimento`.

`Operacao`: `id_operacao`, `codigo`, `descricao`, `rid_tipodeformadepagamento`.

`Classificacao`: `id_classificacao`, `rid_tipodeclassificacao`, `codigo`, `descricao`, `atualizadoem`, `inativo`, `status`.

`TipoDeClassificacao`: `id_tipodeclassificacao`, `codigo`, `descricao`, `atualizadoem`, `inativo`, `status`.

`ProdutoClassificacao`: `id_produtoclassificacao`, `rid_tipodeclassificacao`, `rid_classificacao`.

`Estoque`: `rid_empresa`, `rid_grupodeconta`, `rid_conta`, `rid_produto`, `quantidade`.

`ContaEndereco`: `id_contaendereco`, `endereco`, `bairro`, `cidade`, `estado`, `cep`, `pais`, `telefone1`, `telefone2`, `telefone3`, `telefone4`, `email`.

`Moeda`: `id_moeda`, `codigo`, `descricao`.

`Unidade`: `id_unidade`, `codigo`, `descricao`.

## Operacoes principais

| Codigo | Operacao | Movimentos | Valor movimento | Itens | Valor itens | Pagamentos | Valor pagamentos | Vendedores |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `REC` | CONTAS A RECEBER | 11380 | 0 | 0 | 0 | 11497 | 18873624 | 0 |
| `PAG` | CONTAS A PAGAR | 5245 | 0 | 0 | 0 | 4870 | 20263832 | 0 |
| `VEN` | VENDA | 3198 | 23156477 | 5843 | 23156515 | 8781 | 15566538 | 2173 |
| `IET` | IMPRESSAO DE ETIQUETAS | 2014 | 103607780 | 12060 | 102664700 | 0 | 0 | 0 |
| `EIN` | ENTRADA DE ESTOQUE | 721 | 3212776 | 2235 | 3215853 | 0 | 0 | 0 |
| `COM` | COMPRA | 717 | 13081143 | 5370 | 13081365 | 1237 | 12853615 | 0 |
| `TRA` | ROMANEIO | 650 | 44212106 | 6689 | 44212131 | 0 | 0 | 0 |
| `DVE` | DEVOLUCAO DE VENDA | 389 | 2433872 | 483 | 2433874 | 283 | 1819392 | 241 |
| `SCS` | CONSIGNACAO | 296 | 21726650 | 2190 | 21726650 | 0 | 0 | 0 |
| `VCS` | VENDA DE CONSIGNACAO | 50 | 1249600 | 243 | 1249589 | 0 | 0 | 0 |
| `VES` | VENDA SEM FINANCEIRO | 63 | 537358 | 71 | 537358 | 0 | 0 | 0 |
| `PVE` | PEDIDO DE VENDA | 74 | 547350 | 83 | 547351 | 138 | 308796 | 27 |

Para relatorio de venda realizada, o melhor filtro inicial e `Operacao.codigo IN ('VEN', 'VES', 'VCS')`. Para devolucoes, usar `DVE` separado e subtrair quando o relatorio pedir venda liquida.

## Datas

`Movimentacao.data` vai de `2020-01-01 17:26:49` ate `2026-09-30 00:00:00`.

Existe 1 movimento futuro em relacao a 2026-09-29:

| Periodo | Movimentos | Min data | Max data |
| --- | ---: | --- | --- |
| ate hoje | 25939 | 2020-01-01 17:26:49 | 2026-09-28 18:51:32 |
| futuro | 1 | 2026-09-30 00:00:00 | 2026-09-30 00:00:00 |

## Grupos de conta

| Grupo | Contas |
| --- | ---: |
| CONTAS DE CLIENTES | 1886 |
| CONTAS DE FORNECEDORES | 287 |
| CONTAS DE DESPESAS | 213 |
| CONTAS DE VENDEDORES | 84 |
| CONTAS CONTABEIS | 74 |
| CONTAS DE FUNCIONARIOS | 23 |
| CONTAS DE BANCOS E CAIXAS | 14 |
| ESTOQUES | 11 |
| CONTAS DE RECEITAS | 6 |
| CONTAS DE SOCIAS | 2 |

## Top vendas por produto

Filtro usado: `Operacao.codigo IN ('VEN', 'VES', 'VCS')`.

| Codigo | Produto | Vendas | Qtd | Valor bruto |
| --- | --- | ---: | ---: | ---: |
| TN0304 | 18KW - 13.510G DIA: 5.0CT FLOATING NECKLACE | 20 | 20 | 235114 |
| TN0142 | 18KW-13.398G D: 0.90CT EM: 4.71CT FLOATING NECKLAC | 23 | 23 | 187686 |
| NE0574 | 14KY 16.62g 14+3L F/C (S.Q) 32RDDW.85 NECKLACE | 36 | 38 | 181357 |
| EA2346 | 10.02ct Diamond Studs 18K Gold | 1 | 1 | 170000 |
| EA1722 | 18KW 4.61G ROUND 10.02CT DIA STUD - 6 PRONG | 1 | 1 | 158000 |
| NE0887 | 18KY 49.56g Arizona Turq. 114.45cts Emer 68.35cs | 3 | 3 | 156740 |
| NE0015 | 18KW 9.50g Diamond 4.0ct Station Necklace | 20 | 20 | 154062 |
| TN0392 | 18KY - 14.240G DIA: 5.0CT FLOATING NECKLACE | 12 | 12 | 133453 |
| TN0534 | 18KW 34.31g 20Inches - 0.50ct Each Diamond 39.0CT | 1 | 1 | 120000 |
| TN0001 | 18KW - 11.644G DIA: 1.53CT GRADUATED NECKLACE | 21 | 23 | 106208 |

## Top vendedoras

Filtro usado: `Operacao.codigo IN ('VEN', 'VES', 'VCS')`.

| Codigo | Vendedora | Movimentos | Valor movimento | Comissao |
| --- | --- | ---: | ---: | ---: |
| 004 | Vanessa Guimaraes | 1473 | 10343109 | 8286 |
| 005 | Tathyana Zabo | 108 | 1056927 | 772 |
| 015 | Susana Mejia | 30 | 843313 | 582 |
| 016 | Maura Lopez | 33 | 572767 | 310 |
| 009 | Luana Girao | 215 | 423154 | 1081 |
| 014 | Laura Pelerano | 11 | 397180 | 250 |
| 017 | Jackie Molina | 27 | 286648 | 270 |
| 034 | Dezirre Cavalcante | 10 | 274001 | 221 |
| 030 | Alina de La Vega | 11 | 197290 | 120 |
| 029 | Mia's Miracle | 43 | 172315 | 605 |

## Top formas de pagamento em vendas

Filtro usado: `Operacao.codigo IN ('VEN', 'VES', 'VCS')`.

| Codigo | Parcelas | Valor |
| --- | ---: | ---: |
| Credit card | 6348 | 8879363 |
| Cash | 486 | 1706816 |
| CartaoCorp | 470 | 1318083 |
| Transferencia | 85 | 1218211 |
| Zelle | 503 | 706651 |
| Brasil | 173 | 545998 |
| Check | 156 | 470788 |
| Shopify | 171 | 213110 |
| Venmo | 238 | 168993 |
| CartaoLLC | 48 | 93819 |

## Top clientes em vendas

Filtro usado: `Operacao.codigo IN ('VEN', 'VES', 'VCS')`, usando `Movimentacao.rid_conta_destino`.

| Codigo | Cliente | Compras | Valor |
| --- | --- | ---: | ---: |
| 000775 | Michelle Farmer | 18 | 2156765 |
| 000033 | Maria Helena Longhi | 29 | 853057 |
| 000190 | AT JEWELRY | 31 | 734683 |
| 000625 | COLOMBIA | 19 | 697223 |
| 001108 | Sofia Torquato | 18 | 673546 |
| 000130 | Dzrre Conceito | 33 | 573757 |
| 000624 | Republica Domenicana | 12 | 403270 |
| 000126 | Daniela D Alessandro | 26 | 342175 |
| 000041 | Norma Henriquez | 16 | 311323 |
| 001107 | Denise Pontes | 6 | 256895 |

## Classificacoes de produto

Tipos cadastrados:

| Tipo | Classificacoes |
| --- | ---: |
| CATEGORY | 17 |
| METAL | 14 |

Ha classificacoes usadas que apontam para tipos ausentes no cadastro atual. Exemplos fortes:

| `rid_tipodeclassificacao` | Codigo | Classificacao | Produtos |
| ---: | --- | --- | ---: |
| 9000000453 | 04 | Diamond | 3212 |
| 9000000453 | 06 | Gold | 873 |
| 9000000453 | 05 | Emerald | 787 |
| 9000000453 | 07 | More Gems | 366 |
| 505 | 206 | Hoops | 341 |
| 505 | 027 | Others | 327 |

Top classificacoes em vendas:

| Tipo | Codigo | Classificacao | Movimentos | Qtd | Valor |
| --- | --- | --- | ---: | ---: | ---: |
|  | 04 | Diamond | 2067 | 3373 | 15881571 |
| METAL | 18KW | 18 WHITE GOLD | 1708 | 2538 | 12462123 |
| CATEGORY | EA | EARRINGS | 1610 | 2335 | 7954868 |
| METAL | 18KY | 18 YELLOW GOLD | 1102 | 1570 | 5131129 |
| CATEGORY | NE | NECKLACES | 738 | 964 | 4584474 |
| CATEGORY | TN | TENNIS NECKLACES | 251 | 291 | 4017035 |
| METAL | 14KY | 14 YELLOW GOLD | 737 | 1181 | 3609313 |
| CATEGORY | RI | RINGS | 635 | 857 | 3399827 |
|  | 05 | Emerald | 555 | 715 | 3208371 |
| CATEGORY | BR | BRACELETS | 274 | 407 | 2047169 |

## Estoque

Top posicoes por conta/local:

| Grupo | Conta | Nome | Linhas | Quantidade |
| --- | --- | --- | ---: | ---: |
| ESTOQUES | E00001 |  | 8245 | 2284 |
| ESTOQUES | E00004 |  | 1114 | 443 |
| CONTAS DE CLIENTES | 001108 | Sofia Torquato | 523 | 228 |
| ESTOQUES | E00002 |  | 807 | 170 |
| ESTOQUES | E00008 |  | 456 | 138 |
| CONTAS DE CLIENTES | 000130 | Dzrre Conceito | 295 | 86 |
| CONTAS DE CLIENTES | 000190 | AT JEWELRY | 237 | 85 |

Top produtos em estoque:

| Codigo | Produto | Quantidade |
| --- | --- | ---: |
| AC0028 | TARRACHAS | 28 |
| CU0203 | 18KW 1.08g DIA 0.26cts EARCUFF | 15 |
| EA1662 | 18KW 1.75g DIA 0.28ct Amour One Side Earrings | 14 |
| CU0312 | 18KW 3.18g 0.70ct Diamond Pave Cuff | 13 |
| EA0148 | 18KW-1.25GM DIA-0.17CT "LOVE" LETTER EARRINGS | 12 |

## Alertas de qualidade

| Teste | Quantidade |
| --- | ---: |
| `Classificacao.rid_tipodeclassificacao` sem `TipoDeClassificacao` | 197 |
| `ProdutoClassificacao.rid_tipodeclassificacao` sem `TipoDeClassificacao` | 13346 |
| `ProdutoClassificacao.id_produtoclassificacao` sem `Produto.id_produto` | 108 |
| `MovimentacaoProduto.rid_produto` sem `Produto` | 65 |
| `Movimentacao.rid_operacao` sem `Operacao` | 0 |
| `MovimentacaoVendedor.rid_conta_vendedor` sem `Conta` | 0 |
| `MovimentacaoPagamento.rid_formadepagamento` sem `FormaDePagamento` | 0 |

Os valores monetarios estao em campos `numeric(18,0)`. Alguns valores parecem armazenados em centavos ou sem casas decimais; antes de publicar relatorio financeiro, confirmar regra de escala visual: dividir por 100 ou mostrar inteiro.

## Relatorios recomendados

1. Vendas por periodo
   - Base: `Movimentacao` + `Operacao`.
   - Filtro: `Operacao.codigo IN ('VEN', 'VES', 'VCS')`.
   - Devolucao: `DVE` separado para venda liquida.
   - Metricas: movimentos, valor bruto, valor liquido, ticket medio, quantidade de itens.

2. Analise de produto
   - Base: `MovimentacaoProduto` + `Movimentacao` + `Produto`.
   - Metricas: quantidade vendida, valor vendido, preco medio, movimentos distintos, ranking.
   - Filtros: periodo, operacao, categoria, metal, classificacao.

3. Vendedoras
   - Base: `MovimentacaoVendedor` + `Movimentacao` + `Conta`.
   - Metricas: venda atribuida, quantidade de vendas, comissao, ticket medio, participacao.
   - Cuidado: movimentos podem ter mais de uma vendedora; decidir rateio se houver duplicidade.

4. Clientes
   - Base: `Movimentacao.rid_conta_destino` para vendas.
   - Metricas: compras, valor, recorrencia, ultima compra, ticket medio.

5. Formas de pagamento
   - Base: `MovimentacaoPagamento` + `FormaDePagamento`.
   - Metricas: valor recebido, quantidade de parcelas, mix de pagamento.

6. Estoque e consignado
   - Base: `Estoque` + `Produto` + `Conta` + `GrupoDeConta`.
   - Metricas: quantidade em estoque, quantidade em cliente/consignado, produto parado, giro.

7. Compras
   - Base: operacoes `COM`, `CCS`, `DCO`.
   - Metricas: compras, devolucoes, fornecedor, produto, custo medio.

## SQL base para venda por produto

```sql
SELECT
  m.id_movimentacao,
  m.data,
  RTRIM(o.codigo) AS operacao,
  RTRIM(p.codigo) AS produto_codigo,
  RTRIM(p.descricao) AS produto,
  mp.quantidade,
  mp.unitario,
  mp.quantidade * mp.unitario AS valor_item
FROM Movimentacao m
JOIN Operacao o
  ON o.id_operacao = m.rid_operacao
JOIN MovimentacaoProduto mp
  ON mp.id_movimentacaoproduto = m.id_movimentacao
LEFT JOIN Produto p
  ON p.id_produto = mp.rid_produto
WHERE RTRIM(o.codigo) IN ('VEN', 'VES', 'VCS');
```

## SQL base para vendedoras

```sql
SELECT
  m.id_movimentacao,
  m.data,
  RTRIM(o.codigo) AS operacao,
  RTRIM(c.codigo) AS vendedora_codigo,
  RTRIM(CONVERT(varchar(max), c.nomerazao)) AS vendedora,
  m.valor,
  mv.comissao
FROM Movimentacao m
JOIN Operacao o
  ON o.id_operacao = m.rid_operacao
JOIN MovimentacaoVendedor mv
  ON mv.id_movimentacaovendedor = m.id_movimentacao
LEFT JOIN Conta c
  ON c.id_conta = mv.rid_conta_vendedor
WHERE RTRIM(o.codigo) IN ('VEN', 'VES', 'VCS');
```

## SQL base para pagamentos

```sql
SELECT
  m.id_movimentacao,
  m.data,
  RTRIM(o.codigo) AS operacao,
  RTRIM(fp.codigo) AS forma_pagamento,
  pg.debitocredito,
  pg.valor
FROM Movimentacao m
JOIN Operacao o
  ON o.id_operacao = m.rid_operacao
JOIN MovimentacaoPagamento pg
  ON pg.id_movimentacaopagamento = m.id_movimentacao
LEFT JOIN FormaDePagamento fp
  ON fp.id_formadepagamento = pg.rid_formadepagamento
WHERE RTRIM(o.codigo) IN ('VEN', 'VES', 'VCS');
```

