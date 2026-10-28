import { AlertTriangle, Boxes, PackageX, TrendingDown } from "lucide-react";
import { getConsignmentData, getInventoryData, resolvePreset } from "../../lib/api";
import {
  formatDateShort,
  formatDecimal,
  formatMoney,
  formatNumber,
  formatPercent,
} from "../../lib/format";
import { StockCoverageBuckets } from "../../components/charts";
import {
  CoverageBadge,
  Metric,
  PageHeader,
  RankingTable,
  classifyCoverage,
  numeric,
  text,
} from "../../components/ui";
import type { StockCoverageRow } from "../../lib/api";

const TARGET_COVERAGE_MONTHS = 2;
const STATUS_ORDER = { ruptura: 0, baixa: 1, ideal: 2, excesso: 3 } as const;
const STATUS_LABEL = {
  ruptura: "Ruptura",
  baixa: "Cobertura baixa",
  ideal: "Cobertura ideal",
  excesso: "Excesso",
} as const;


function buildCoverage(rows: StockCoverageRow[]) {
  return rows.map((row) => {
    const avgMonthlySales = Number(row.qty3m || 0) / 3;
    const ownStock = Number(row.ownStock || 0);
    const status = classifyCoverage(ownStock, avgMonthlySales);
    const coverageMonths = avgMonthlySales > 0 ? ownStock / avgMonthlySales : null;
    const suggestedReorder =
      avgMonthlySales > 0
        ? Math.max(0, Math.round(TARGET_COVERAGE_MONTHS * avgMonthlySales - ownStock))
        : 0;

    return {
      ...row,
      avgMonthlySales,
      status,
      coverageMonths,
      suggestedReorder,
    };
  });
}

export default async function EstoquePage() {
  let data: Awaited<ReturnType<typeof getInventoryData>> | null = null;
  // Consignacao usa um periodo fixo de 12 meses: esta pagina e uma foto de posicao, sem
  // filtro proprio, entao "enviado/vendido no periodo" precisa de alguma janela — 12 meses
  // fica consistente com o padrao das outras abas sem exigir um seletor so para isto aqui.
  let consignacao: Awaited<ReturnType<typeof getConsignmentData>> | null = null;
  let error: string | null = null;

  try {
    [data, consignacao] = await Promise.all([
      getInventoryData(),
      getConsignmentData(resolvePreset("12m")),
    ]);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Falha ao carregar dados";
  }

  if (!data) {
    return (
      <main className="shell">
        <PageHeader
          eyebrow="Wish BI"
          title="Analise de estoque"
          lede="Inicie o backend e configure o .env com a senha do SQL Server para conectar ao WishBI."
          error={error}
        />
      </main>
    );
  }

  const coverage = buildCoverage(data.coverage);

  const ownStockTotal = coverage.reduce((sum, row) => sum + Number(row.ownStock || 0), 0);
  const consignedStockTotal = coverage.reduce(
    (sum, row) => sum + Number(row.consignedStock || 0),
    0,
  );
  const costValue = coverage.reduce(
    (sum, row) => sum + Number(row.ownStock || 0) * Number(row.unitCost || 0),
    0,
  );

  const withSales = coverage.filter((row) => row.avgMonthlySales > 0);
  const weightedOwnStock = withSales.reduce((sum, row) => sum + Number(row.ownStock || 0), 0);
  const weightedAvgSales = withSales.reduce((sum, row) => sum + row.avgMonthlySales, 0);
  const weightedCoverageMonths = weightedAvgSales > 0 ? weightedOwnStock / weightedAvgSales : 0;

  const bucketCounts = { ruptura: 0, baixa: 0, ideal: 0, excesso: 0 };
  coverage.forEach((row) => {
    bucketCounts[row.status] += 1;
  });
  const bucketData = (Object.keys(bucketCounts) as (keyof typeof bucketCounts)[]).map((key) => ({
    status: STATUS_LABEL[key],
    count: bucketCounts[key],
  }));

  const priorityRows = [...coverage]
    .sort((a, b) => {
      const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (statusDiff !== 0) return statusDiff;
      return b.avgMonthlySales - a.avgMonthlySales;
    })
    .slice(0, 60);

  // Consignacao: SCS tira do estoque proprio e poe na conta do consignatario; dali, DSC
  // devolve ou VCS vende. "Com ele agora" e posicao de hoje; o resto e do periodo fixo acima.
  const resumoConsignacao = consignacao?.summary;
  const decididas = resumoConsignacao
    ? resumoConsignacao.vendidoQty + resumoConsignacao.retornadoQty
    : 0;
  const taxaConversao = decididas && resumoConsignacao ? resumoConsignacao.vendidoQty / decididas : 0;
  const porConsignatario = (consignacao?.byReseller || []).map((row) => {
    const vendido = numeric(row, "vendidoQty");
    const retornado = numeric(row, "retornadoQty");
    const decididasRow = vendido + retornado;
    return { ...row, taxaConversao: decididasRow ? vendido / decididasRow : null };
  });
  const vendasConsignacao = (consignacao?.sales || []).map((row) => {
    const consignatario = text(row, "resellerName");
    const compradorCode = text(row, "buyerCode");
    const consignatarioCode = text(row, "resellerCode");
    const clienteLabel =
      compradorCode && compradorCode !== consignatarioCode
        ? `${consignatario} → ${text(row, "buyerName")}`
        : consignatario;
    return { ...row, date: formatDateShort(String(row.date || "")), clienteLabel };
  });

  return (
    <main className="shell">
      <PageHeader
        eyebrow="Wish Fine Jewelry"
        title="Análise de estoque"
        lede="Foto da posição de hoje. A cobertura usa sempre a média de venda dos últimos 3 meses e não acompanha o filtro de período das outras abas. Estoque próprio considera apenas o grupo ESTOQUES; o que está em conta de cliente (consignado) aparece à parte."
      />

      <section className="metricsGrid">
        <Metric
          label="Estoque próprio"
          value={formatNumber(ownStockTotal)}
          detail={`${formatMoney(costValue)} a custo · ${formatNumber(consignedStockTotal)} peças consignadas`}
          icon={<Boxes size={18} />}
        />
        <Metric
          label="Cobertura média ponderada"
          value={`${formatDecimal(weightedCoverageMonths, 1)} meses`}
          detail={`Base: venda média dos últimos 3 meses de ${formatNumber(withSales.length)} produtos`}
          icon={<TrendingDown size={18} />}
        />
        <Metric
          label="Produtos em ruptura"
          value={formatNumber(bucketCounts.ruptura)}
          detail="Sem estoque próprio e com venda recente"
          icon={<PackageX size={18} />}
        />
        <Metric
          label="Produtos com excesso"
          value={formatNumber(bucketCounts.excesso)}
          detail={`Cobertura acima de ${TARGET_COVERAGE_MONTHS + 1} meses ou sem giro`}
          icon={<AlertTriangle size={18} />}
        />
      </section>

      <section className="grid two">
        <article className="panel wide">
          <div className="panelHead">
            <div>
              <h2>Reposição sugerida</h2>
              <p>
                Prioridade por ruptura e cobertura baixa. A sugestão considera meta de{" "}
                {TARGET_COVERAGE_MONTHS} meses de cobertura sobre a venda média recente.
              </p>
            </div>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Estoque próprio</th>
                  <th>Consignado</th>
                  <th>Venda média/mês</th>
                  <th>Cobertura</th>
                  <th>Status</th>
                  <th>Sugestão reposição</th>
                </tr>
              </thead>
              <tbody>
                {priorityRows.map((row) => (
                  <tr key={row.code}>
                    <td>
                      <strong>{row.code}</strong>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.name}</div>
                    </td>
                    <td>{formatNumber(row.ownStock)}</td>
                    <td>{formatNumber(row.consignedStock)}</td>
                    <td>{formatDecimal(row.avgMonthlySales, 1)}</td>
                    <td>
                      {row.coverageMonths === null
                        ? "sem venda em 3m"
                        : `${formatDecimal(row.coverageMonths, 1)} meses`}
                    </td>
                    <td>
                      <CoverageBadge status={row.status} />
                    </td>
                    <td>{row.suggestedReorder > 0 ? formatNumber(row.suggestedReorder) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panelHead">
            <div>
              <h2>Distribuição por status</h2>
              <p>Qtd. de SKUs por faixa de cobertura</p>
            </div>
          </div>
          <StockCoverageBuckets data={bucketData} />
        </article>
      </section>

      <section className="grid one">
        <article className="panel">
          <div className="panelHead">
            <div>
              <h2>Posição por local</h2>
              <p>
                Cada linha é uma "conta" do WishBI: pode ser um estoque próprio (grupo{" "}
                <strong>ESTOQUES</strong>, ex. E00001) ou um cliente com peça em consignação
                (grupo <strong>CONTAS DE CLIENTES</strong>). Não existe cadastro separado de
                "local" — o local é a própria conta de destino do estoque.
              </p>
            </div>
          </div>
          <RankingTable
            rows={data.byLocation}
            limit={15}
            columns={[
              { key: "groupCode", label: "Grupo" },
              { key: "accountCode", label: "Conta" },
              { key: "accountName", label: "Nome" },
              { key: "lineCount", label: "SKUs", type: "number" },
              { key: "quantity", label: "Qtd.", type: "number" },
            ]}
          />
        </article>
      </section>

      {resumoConsignacao && (
        <section className="grid one">
          <article className="panel wide">
            <div className="panelHead">
              <div>
                <h2>Consignação</h2>
                <p>
                  Ciclo confirmado com a Wish: SCS tira do estoque próprio e põe na conta do
                  consignatário; dali, DSC devolve ou VCS vende. Números de movimento são dos
                  últimos 12 meses — &quot;com ele agora&quot; é a posição de hoje.
                </p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: 14,
                fontSize: 13,
                color: "var(--muted)",
              }}
            >
              <span>
                Em consignação hoje: <strong style={{ color: "var(--ink)" }}>{formatNumber(resumoConsignacao.estoqueAtualQty)}</strong> peças
              </span>
              <span>
                Enviado (12m): <strong style={{ color: "var(--ink)" }}>{formatNumber(resumoConsignacao.enviadoQty)}</strong> ({formatMoney(resumoConsignacao.enviadoValor)})
              </span>
              <span>
                Vendido (12m): <strong style={{ color: "var(--ink)" }}>{formatNumber(resumoConsignacao.vendidoQty)}</strong> ({formatMoney(resumoConsignacao.vendidoValor)})
              </span>
              <span>
                Taxa de conversão: <strong style={{ color: "var(--ink)" }}>{formatPercent(taxaConversao)}</strong>
              </span>
            </div>
            <RankingTable
              rows={porConsignatario}
              limit={15}
              columns={[
                { key: "code", label: "Código" },
                { key: "name", label: "Consignatário" },
                { key: "estoqueAtual", label: "Com ele agora", type: "number" },
                { key: "enviadoQty", label: "Enviado (qtd)", type: "number" },
                { key: "retornadoQty", label: "Devolvido (qtd)", type: "number" },
                { key: "vendidoQty", label: "Vendido (qtd)", type: "number" },
                { key: "vendidoValor", label: "Vendido (valor)", type: "money" },
              ]}
            />
            <p className="panel note">
              As vendas de consignação (VCS) consultadas nunca mostram um comprador final
              diferente do consignatário no sistema — origem e destino do movimento vêm
              sempre a mesma conta. Pergunta em aberto para a Wish: esse dado existe em
              algum outro lugar do ERP?
            </p>
            {vendasConsignacao.length > 0 && (
              <RankingTable
                rows={vendasConsignacao}
                limit={10}
                columns={[
                  { key: "date", label: "Data" },
                  { key: "productCode", label: "Produto" },
                  { key: "clienteLabel", label: "Cliente" },
                  { key: "value", label: "Valor", type: "money" },
                ]}
              />
            )}
          </article>
        </section>
      )}
    </main>
  );
}
