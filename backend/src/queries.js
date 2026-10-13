export const salesOperationFilter = "('VEN', 'VES', 'VCS')";

export const queries = {
  health: `
    SELECT
      DB_NAME() AS databaseName,
      @@SERVERNAME AS serverName,
      GETDATE() AS serverTime
  `,

  tableSummary: `
    SELECT
      s.name AS [schema],
      t.name AS tableName,
      SUM(CASE WHEN p.index_id IN (0, 1) THEN p.rows ELSE 0 END) AS rowsCount,
      t.create_date AS createDate,
      t.modify_date AS modifyDate
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    LEFT JOIN sys.partitions p ON p.object_id = t.object_id
    GROUP BY s.name, t.name, t.create_date, t.modify_date
    ORDER BY s.name, t.name
  `,

  kpis: `
    WITH sales AS (
      SELECT
        m.id_movimentacao,
        m.data,
        RTRIM(o.codigo) AS operationCode,
        m.valor,
        ISNULL(items.itemValue, 0) AS itemValue,
        ISNULL(items.quantity, 0) AS quantity,
        ISNULL(payments.paymentValue, 0) AS paymentValue
      FROM Movimentacao m
      JOIN Operacao o ON o.id_operacao = m.rid_operacao
      OUTER APPLY (
        SELECT
          SUM(mp.quantidade) AS quantity,
          SUM(mp.quantidade * mp.unitario) AS itemValue
        FROM MovimentacaoProduto mp
        WHERE mp.id_movimentacaoproduto = m.id_movimentacao
      ) items
      OUTER APPLY (
        SELECT SUM(pg.valor) AS paymentValue
        FROM MovimentacaoPagamento pg
        WHERE pg.id_movimentacaopagamento = m.id_movimentacao
      ) payments
      WHERE RTRIM(o.codigo) IN ${salesOperationFilter}
        AND m.data >= @startDate
        AND (@endDate IS NULL OR m.data < DATEADD(day, 1, @endDate))
    ),
    returns AS (
      SELECT
        COUNT(DISTINCT m.id_movimentacao) AS returnCount,
        SUM(ISNULL(items.itemValue, m.valor)) AS returnValue
      FROM Movimentacao m
      JOIN Operacao o ON o.id_operacao = m.rid_operacao
      OUTER APPLY (
        SELECT SUM(mp.quantidade * mp.unitario) AS itemValue
        FROM MovimentacaoProduto mp
        WHERE mp.id_movimentacaoproduto = m.id_movimentacao
      ) items
      WHERE RTRIM(o.codigo) = 'DVE'
        AND m.data >= @startDate
        AND (@endDate IS NULL OR m.data < DATEADD(day, 1, @endDate))
    )
    SELECT
      COUNT(DISTINCT sales.id_movimentacao) AS saleCount,
      SUM(sales.itemValue) AS grossSales,
      SUM(sales.paymentValue) AS receivedValue,
      SUM(sales.quantity) AS unitsSold,
      AVG(NULLIF(sales.itemValue, 0)) AS averageTicket,
      (SELECT returnCount FROM returns) AS returnCount,
      (SELECT returnValue FROM returns) AS returnValue,
      MIN(sales.data) AS firstSaleDate,
      MAX(sales.data) AS lastSaleDate
    FROM sales
  `,

  monthlySales: `
    WITH items AS (
      SELECT
        m.id_movimentacao,
        YEAR(m.data) AS year,
        MONTH(m.data) AS month,
        RTRIM(o.codigo) AS operationCode,
        SUM(mp.quantidade) AS quantity,
        SUM(mp.quantidade * mp.unitario) AS itemValue
      FROM Movimentacao m
      JOIN Operacao o ON o.id_operacao = m.rid_operacao
      LEFT JOIN MovimentacaoProduto mp
        ON mp.id_movimentacaoproduto = m.id_movimentacao
      WHERE RTRIM(o.codigo) IN ('VEN', 'VES', 'VCS', 'DVE')
        AND m.data >= @startDate
        AND (@endDate IS NULL OR m.data < DATEADD(day, 1, @endDate))
      GROUP BY m.id_movimentacao, YEAR(m.data), MONTH(m.data), RTRIM(o.codigo)
    )
    SELECT
      year,
      month,
      SUM(CASE WHEN operationCode IN ${salesOperationFilter} THEN itemValue ELSE 0 END) AS grossSales,
      SUM(CASE WHEN operationCode = 'DVE' THEN itemValue ELSE 0 END) AS returnsValue,
      SUM(CASE WHEN operationCode IN ${salesOperationFilter} THEN itemValue ELSE -itemValue END) AS netSales,
      SUM(CASE WHEN operationCode IN ${salesOperationFilter} THEN quantity ELSE -quantity END) AS netUnits,
      COUNT(DISTINCT CASE WHEN operationCode IN ${salesOperationFilter} THEN id_movimentacao END) AS saleCount
    FROM items
    GROUP BY year, month
    ORDER BY year, month
  `,

  topProducts: `
    SELECT TOP 30
      RTRIM(p.codigo) AS code,
      RTRIM(p.descricao) AS name,
      COUNT(DISTINCT m.id_movimentacao) AS salesCount,
      SUM(mp.quantidade) AS quantity,
      SUM(mp.quantidade * mp.unitario) AS grossSales
    FROM Movimentacao m
    JOIN Operacao o ON o.id_operacao = m.rid_operacao
    JOIN MovimentacaoProduto mp ON mp.id_movimentacaoproduto = m.id_movimentacao
    LEFT JOIN Produto p ON p.id_produto = mp.rid_produto
    WHERE RTRIM(o.codigo) IN ${salesOperationFilter}
      AND m.data >= @startDate
      AND (@endDate IS NULL OR m.data < DATEADD(day, 1, @endDate))
    GROUP BY RTRIM(p.codigo), RTRIM(p.descricao)
    ORDER BY grossSales DESC
  `,

  salespeople: `
    SELECT TOP 30
      RTRIM(c.codigo) AS code,
      RTRIM(CONVERT(varchar(max), c.nomerazao)) AS name,
      COUNT(DISTINCT m.id_movimentacao) AS saleCount,
      SUM(m.valor) AS movementValue,
      SUM(mv.comissao) AS commission
    FROM Movimentacao m
    JOIN Operacao o ON o.id_operacao = m.rid_operacao
    JOIN MovimentacaoVendedor mv ON mv.id_movimentacaovendedor = m.id_movimentacao
    LEFT JOIN Conta c ON c.id_conta = mv.rid_conta_vendedor
    WHERE RTRIM(o.codigo) IN ${salesOperationFilter}
      AND m.data >= @startDate
      AND (@endDate IS NULL OR m.data < DATEADD(day, 1, @endDate))
    GROUP BY RTRIM(c.codigo), RTRIM(CONVERT(varchar(max), c.nomerazao))
    ORDER BY movementValue DESC
  `,

  paymentMethods: `
    SELECT TOP 30
      RTRIM(fp.codigo) AS code,
      RTRIM(fp.descricao) AS name,
      COUNT(*) AS installments,
      SUM(pg.valor) AS value
    FROM Movimentacao m
    JOIN Operacao o ON o.id_operacao = m.rid_operacao
    JOIN MovimentacaoPagamento pg ON pg.id_movimentacaopagamento = m.id_movimentacao
    LEFT JOIN FormaDePagamento fp ON fp.id_formadepagamento = pg.rid_formadepagamento
    WHERE RTRIM(o.codigo) IN ${salesOperationFilter}
      AND m.data >= @startDate
      AND (@endDate IS NULL OR m.data < DATEADD(day, 1, @endDate))
    GROUP BY RTRIM(fp.codigo), RTRIM(fp.descricao)
    ORDER BY value DESC
  `,

  customers: `
    SELECT TOP 30
      RTRIM(c.codigo) AS code,
      RTRIM(CONVERT(varchar(max), c.nomerazao)) AS name,
      COUNT(DISTINCT m.id_movimentacao) AS purchaseCount,
      SUM(m.valor) AS value,
      MAX(m.data) AS lastPurchaseAt
    FROM Movimentacao m
    JOIN Operacao o ON o.id_operacao = m.rid_operacao
    LEFT JOIN Conta c ON c.id_conta = m.rid_conta_destino
    WHERE RTRIM(o.codigo) IN ${salesOperationFilter}
      AND m.data >= @startDate
      AND (@endDate IS NULL OR m.data < DATEADD(day, 1, @endDate))
    GROUP BY RTRIM(c.codigo), RTRIM(CONVERT(varchar(max), c.nomerazao))
    ORDER BY value DESC
  `,

  inventory: `
    SELECT TOP 30
      RTRIM(g.codigo) AS groupCode,
      RTRIM(g.descricao) AS groupName,
      RTRIM(c.codigo) AS accountCode,
      RTRIM(CONVERT(varchar(max), c.nomerazao)) AS accountName,
      COUNT(*) AS lineCount,
      SUM(e.quantidade) AS quantity
    FROM Estoque e
    LEFT JOIN GrupoDeConta g ON g.id_grupodeconta = e.rid_grupodeconta
    LEFT JOIN Conta c ON c.id_conta = e.rid_conta
    GROUP BY
      RTRIM(g.codigo),
      RTRIM(g.descricao),
      RTRIM(c.codigo),
      RTRIM(CONVERT(varchar(max), c.nomerazao))
    ORDER BY quantity DESC
  `,

  categories: `
    SELECT TOP 30
      RTRIM(tc.codigo) AS typeCode,
      RTRIM(c.codigo) AS code,
      RTRIM(c.descricao) AS name,
      COUNT(DISTINCT mp.id_movimentacaoproduto) AS movementCount,
      SUM(mp.quantidade) AS quantity,
      SUM(mp.quantidade * mp.unitario) AS grossSales
    FROM Movimentacao m
    JOIN Operacao o ON o.id_operacao = m.rid_operacao
    JOIN MovimentacaoProduto mp ON mp.id_movimentacaoproduto = m.id_movimentacao
    JOIN ProdutoClassificacao pc ON pc.id_produtoclassificacao = mp.rid_produto
    JOIN Classificacao c ON c.id_classificacao = pc.rid_classificacao
    LEFT JOIN TipoDeClassificacao tc ON tc.id_tipodeclassificacao = pc.rid_tipodeclassificacao
    WHERE RTRIM(o.codigo) IN ${salesOperationFilter}
      AND m.data >= @startDate
      AND (@endDate IS NULL OR m.data < DATEADD(day, 1, @endDate))
    GROUP BY RTRIM(tc.codigo), RTRIM(c.codigo), RTRIM(c.descricao)
    ORDER BY grossSales DESC
  `,

  // Clientes novos x recorrentes no periodo, e taxa de recompra historica (todo o periodo de vendas).
  customerRetention: `
    WITH purchases AS (
      SELECT
        m.rid_conta_destino AS customerId,
        m.id_movimentacao,
        m.data
      FROM Movimentacao m
      JOIN Operacao o ON o.id_operacao = m.rid_operacao
      WHERE RTRIM(o.codigo) IN ${salesOperationFilter}
        AND m.rid_conta_destino IS NOT NULL
    ),
    firstPurchase AS (
      SELECT customerId, MIN(data) AS firstDate
      FROM purchases
      GROUP BY customerId
    ),
    customerTotals AS (
      SELECT customerId, COUNT(DISTINCT id_movimentacao) AS purchaseCount
      FROM purchases
      GROUP BY customerId
    ),
    periodCustomers AS (
      SELECT DISTINCT customerId
      FROM purchases
      WHERE data >= @startDate
        AND (@endDate IS NULL OR data < DATEADD(day, 1, @endDate))
    )
    SELECT
      (SELECT COUNT(*) FROM customerTotals) AS totalCustomersAllTime,
      (SELECT COUNT(*) FROM customerTotals WHERE purchaseCount > 1) AS repeatCustomersAllTime,
      (SELECT COUNT(*) FROM periodCustomers) AS activeCustomersPeriod,
      (
        SELECT COUNT(*)
        FROM periodCustomers pc
        JOIN firstPurchase fp ON fp.customerId = pc.customerId
        WHERE fp.firstDate >= @startDate
      ) AS newCustomersPeriod,
      (
        SELECT COUNT(*)
        FROM periodCustomers pc
        JOIN firstPurchase fp ON fp.customerId = pc.customerId
        WHERE fp.firstDate < @startDate
      ) AS returningCustomersPeriod
  `,

  // Cobertura de estoque: estoque atual (proprio x consignado) x media de venda mensal dos ultimos 3 meses.
  stockCoverage: `
    WITH vendas3m AS (
      SELECT
        mp.rid_produto AS productId,
        SUM(mp.quantidade) AS qty3m
      FROM Movimentacao m
      JOIN Operacao o ON o.id_operacao = m.rid_operacao
      JOIN MovimentacaoProduto mp ON mp.id_movimentacaoproduto = m.id_movimentacao
      WHERE RTRIM(o.codigo) IN ${salesOperationFilter}
        AND m.data >= DATEADD(month, -3, CAST(GETDATE() AS date))
      GROUP BY mp.rid_produto
    ),
    estoqueAtual AS (
      SELECT
        e.rid_produto AS productId,
        SUM(CASE WHEN RTRIM(g.descricao) = 'ESTOQUES' THEN e.quantidade ELSE 0 END) AS ownStock,
        SUM(CASE WHEN RTRIM(g.descricao) <> 'ESTOQUES' OR g.descricao IS NULL THEN e.quantidade ELSE 0 END) AS consignedStock
      FROM Estoque e
      LEFT JOIN GrupoDeConta g ON g.id_grupodeconta = e.rid_grupodeconta
      GROUP BY e.rid_produto
    )
    SELECT
      RTRIM(p.codigo) AS code,
      RTRIM(p.descricao) AS name,
      ISNULL(es.ownStock, 0) AS ownStock,
      ISNULL(es.consignedStock, 0) AS consignedStock,
      ISNULL(v.qty3m, 0) AS qty3m,
      p.valordecusto AS unitCost
    FROM Produto p
    LEFT JOIN vendas3m v ON v.productId = p.id_produto
    LEFT JOIN estoqueAtual es ON es.productId = p.id_produto
    WHERE ISNULL(es.ownStock, 0) > 0
       OR ISNULL(es.consignedStock, 0) > 0
       OR ISNULL(v.qty3m, 0) > 0
    ORDER BY v.qty3m DESC
  `,

  // Todos os produtos vendidos no periodo, para montar a curva ABC (representatividade acumulada).
  productAbc: `
    WITH vendas AS (
      SELECT
        RTRIM(p.codigo) AS code,
        RTRIM(p.descricao) AS name,
        SUM(mp.quantidade) AS quantity,
        SUM(mp.quantidade * mp.unitario) AS grossSales
      FROM Movimentacao m
      JOIN Operacao o ON o.id_operacao = m.rid_operacao
      JOIN MovimentacaoProduto mp ON mp.id_movimentacaoproduto = m.id_movimentacao
      LEFT JOIN Produto p ON p.id_produto = mp.rid_produto
      WHERE RTRIM(o.codigo) IN ${salesOperationFilter}
        AND m.data >= @startDate
        AND (@endDate IS NULL OR m.data < DATEADD(day, 1, @endDate))
      GROUP BY RTRIM(p.codigo), RTRIM(p.descricao)
    )
    SELECT
      code,
      name,
      quantity,
      grossSales,
      SUM(grossSales) OVER (ORDER BY grossSales DESC, code ROWS UNBOUNDED PRECEDING) AS cumulativeSales,
      SUM(grossSales) OVER () AS totalSales
    FROM vendas
    WHERE grossSales > 0
    ORDER BY grossSales DESC
  `,
};
