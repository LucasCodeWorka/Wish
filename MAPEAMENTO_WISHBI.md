# Mapeamento do banco WishBI

Mapeamento gerado em 2026-09-25 a partir do catalogo do SQL Server.

## Resumo

| Schema | Tabela | Tipo | Linhas |
| --- | --- | --- | ---: |
| dbo | Empresa | BASE TABLE | 14 |
| dbo | Entidade | BASE TABLE | 0 |
| dbo | GrupoDeEntidade | BASE TABLE | 0 |

## Relacionamentos e chaves

Nao foram encontradas chaves primarias, chaves estrangeiras ou constraints UNIQUE visiveis no catalogo para o usuario usado na conexao.

## dbo.Empresa

Tabela com 14 linhas.

| Posicao | Coluna | Tipo | Tamanho/Precisao | Aceita nulo |
| ---: | --- | --- | --- | --- |
| 1 | id_empresa | numeric | 18 | YES |
| 2 | codigo | nchar | 10 | YES |
| 3 | identificacao | nchar | 50 | YES |
| 4 | atualizadoem | datetime |  | YES |
| 5 | inativo | bit |  | YES |
| 6 | status | nchar | 10 | YES |

## dbo.Entidade

Tabela com 0 linhas.

| Posicao | Coluna | Tipo | Tamanho/Precisao | Aceita nulo |
| ---: | --- | --- | --- | --- |
| 1 | id_entidade | numeric | 18 | YES |
| 2 | codigo | nchar | 10 | YES |
| 3 | identificacao | nchar | 40 | YES |
| 4 | nomerazao | text | 2147483647 | YES |
| 5 | endereco | text | 2147483647 | YES |
| 6 | bairro | nchar | 30 | YES |
| 7 | cidade | nchar | 40 | YES |
| 8 | estado | nchar | 2 | YES |
| 9 | cep | nchar | 9 | YES |
| 10 | pais | nchar | 30 | YES |
| 11 | telefone1 | nchar | 12 | YES |
| 12 | telefone2 | nchar | 12 | YES |
| 13 | telefone3 | nchar | 12 | YES |
| 14 | telefone4 | nchar | 12 | YES |
| 15 | email | text | 2147483647 | YES |
| 16 | rid_grupodeentidade | numeric | 18 | YES |
| 17 | atualizadoem | datetime |  | YES |
| 18 | inativo | bit |  | YES |
| 19 | status | nchar | 10 | YES |

## dbo.GrupoDeEntidade

Tabela com 0 linhas.

| Posicao | Coluna | Tipo | Tamanho/Precisao | Aceita nulo |
| ---: | --- | --- | --- | --- |
| 1 | id_grupodeentidade | numeric | 18 | YES |
| 2 | codigo | nchar | 10 | YES |
| 3 | descricao | nchar | 30 | YES |
| 4 | atualizadoem | datetime |  | YES |
| 5 | inativo | bit |  | YES |
| 6 | status | nchar | 10 | YES |

## Observacoes

- O schema disponivel e apenas `dbo`.
- O objeto `Entidade.rid_grupodeentidade` parece ser uma referencia logica para `GrupoDeEntidade.id_grupodeentidade`, mas nao ha FK declarada no banco.
- Todos os campos aparecem como nullable no catalogo.
- Os campos `text` sao tipos legados do SQL Server; em consultas novas, normalmente vale converter para `varchar(max)` quando necessario.
- Neste ambiente, o driver ODBC legado conectou de forma estavel usando `WISHBI_SQL_SERVER=177.70.217.111`.
