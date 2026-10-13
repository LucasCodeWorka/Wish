import Link from "next/link";
import { Gem, Layers, ReceiptText, WalletCards } from "lucide-react";
import { getResumoData, periodoDaUrl } from "../../lib/api";
import {
  formatDecimal,
  formatDelta,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRangeLabel,
  variacao,
} from "../../lib/format";
import { CategoryBars, SalesTrend } from "../../components/charts";
import { FilterBar } from "../../components/FilterBar";
import {
  Insights,
  Metric,
  PageHeader,
  RankingTable,
  classifyCoverage,
  numeric,
  text,
} from "../../components/ui";

export default async function ResumoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { periodo, preset } = periodoDaUrl(await searchParams);

  let data: Awaited<ReturnType<typeof getResumoData>> | null = null;
  let error: string | null = null;

  try {
    data = await getResumoData(periodo);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Falha ao carregar dados";
  }

  if (!data) {
    return (
      <main className="shell">
        <PageHeader
          eyebrow="Wish BI"
          title="Resumo executivo"
          lede="Inicie o backend e configure o .env com a senha do SQL Server para conectar ao WishBI."
          error={error}
        />
      </main>
    );
  }

  const { kpis, retention, anterior } = data;
  const rotuloAnterior = `vs. ${formatRangeLabel(anterior.periodo.de, anterior.periodo.ate)}`;

  const liquido = Number(kpis.grossSales || 0) - Number(kpis.returnValue || 0);
  const liquidoAnterior =
    Number(anterior.kpis.grossSales || 0) - Number(anterior.kpis.returnValue || 0);
  const deltaLiquido = variacao(liquido, liquidoAnterior);

  const atendimentos = Number(kpis.saleCount || 0);
  const atendimentosAnterior = Number(anterior.kpis.saleCount || 0);
  const deltaAtendimentos = variacao(atendimentos, atendimentosAnterior);

  const tkm = Number(kpis.averageTicket || 0);
  const tkmAnterior = Number(anterior.kpis.averageTicket || 0);
  const deltaTkm = variacao(tkm, tkmAnterior);

  const pa = atendimentos ? Number(kpis.unitsSold || 0) / atendimentos : 0;
  const paAnterior = atendimentosAnterior
    ? Number(anterior.kpis.unitsSold || 0) / atendimentosAnterior
    : 0;

  const devolucaoPct = Number(kpis.grossSales || 0)
    ? Number(kpis.returnValue || 0) / Number(kpis.grossSales || 0)
    : 0;
  const devolucaoPctAnterior = Number(anterior.kpis.grossSales || 0)
    ? Number(anterior.kpis.returnValue || 0) / Number(anterior.kpis.grossSales || 0)
    : 0;

  const retornoClientes = retention.activeCustomersPeriod
    ? retention.returningCustomersPeriod / retention.activeCustomersPeriod
    : 0;

  const rupturas = data.coverage.filter(
    (row) => classifyCoverage(Number(row.ownStock || 0), Number(row.qty3m || 0) / 3) === "ruptura",
  ).length;

  // Leitura do periodo: as frases saem dos mesmos numeros ja carregados. A primeira e a que
  // explica DE ONDE veio o crescimento, que e a pergunta que o numero de topo nao responde.
  const leitura: string[] = [];

  if (deltaLiquido !== null && deltaTkm !== null && deltaAtendimentos !== null) {
    const direcao = deltaLiquido >= 0 ? "cresceu" : "caiu";
    const motor =
      Math.abs(deltaTkm) >= Math.abs(deltaAtendimentos) ? "ticket médio" : "volume de atendimentos";
    leitura.push(
      `Faturamento ${direcao} ${formatDelta(Math.abs(deltaLiquido))} ${rotuloAnterior}, com ticket médio em ${formatDelta(deltaTkm)} e atendimentos em ${formatDelta(deltaAtendimentos)}: o movimento veio principalmente de ${motor}.`,
    );
  }

  leitura.push(
    `Devoluções representam ${formatPercent(devolucaoPct)} da venda bruta, contra ${formatPercent(devolucaoPctAnterior)} no período comparado.`,
  );

  leitura.push(
    `${formatNumber(retention.activeCustomersPeriod)} clientes compraram no período, sendo ${formatPercent(retornoClientes)} recorrentes` +
      (rupturas > 0 ? `. ${formatNumber(rupturas)} produtos estão em ruptura com venda recente.` : "."),
  );

  const totalAtribuido = data.salespeople.reduce(
    (soma, row) => soma + numeric(row, "movementValue"),
    0,
  );
  const vendedoras = data.salespeople.map((row) => ({
    ...row,
    participacao: totalAtribuido ? numeric(row, "movementValue") / totalAtribuido : 0,
  }));

  return (
    <main className="shell">
      <PageHeader
        eyebrow="Wish Fine Jewelry"
        title="Resumo executivo"
        lede="Como o período fechou, contra o mesmo período do ano anterior."
        lastSaleDate={kpis.lastSaleDate}
      >
        <FilterBar periodo={periodo} preset={preset} comparado={anterior.periodo} />
      </PageHeader>

      <section className="metricsGrid">
        <Metric
          label="Faturamento líquido"
          value={formatMoney(liquido)}
          delta={deltaLiquido}
          deltaLabel={rotuloAnterior}
          detail={`${formatMoney(kpis.grossSales)} bruto · ${formatMoney(kpis.returnValue)} devolvido`}
          icon={<Gem size={18} />}
        />
        <Metric
          label="Ticket médio (TKM)"
          value={formatMoney(tkm)}
          delta={deltaTkm}
          deltaLabel={rotuloAnterior}
          detail={`Anterior: ${formatMoney(tkmAnterior)}`}
          icon={<WalletCards size={18} />}
        />
        <Metric
          label="PA (peças/atendimento)"
          value={formatDecimal(pa, 2)}
          delta={variacao(pa, paAnterior)}
          deltaLabel={rotuloAnterior}
          detail={`${formatNumber(kpis.unitsSold)} peças vendidas`}
          icon={<Layers size={18} />}
        />
        <Metric
          label="Atendimentos"
          value={formatNumber(atendimentos)}
          delta={deltaAtendimentos}
          deltaLabel={rotuloAnterior}
          detail={`${formatNumber(retention.activeCustomersPeriod)} clientes ativos`}
          icon={<ReceiptText size={18} />}
        />
      </section>

      <Insights itens={leitura} />

      <section className="grid one">
        <article className="panel wide">
          <div className="panelHead">
            <div>
              <h2>Venda mensal</h2>
              <p>Líquida de devoluções, com o período anterior como referência</p>
            </div>
            <Link className="panelLink" href="/vendas">
              Ver análise de vendas
            </Link>
          </div>
          <SalesTrend rows={data.monthlySales} rowsAnterior={anterior.monthlySales} />
        </article>
      </section>

      <section className="grid two">
        <article className="panel wide">
          <div className="panelHead">
            <div>
              <h2>Participação por vendedora</h2>
              <p>Top 10 por valor atribuído no período</p>
            </div>
            <Link className="panelLink" href="/vendas">
              Detalhar
            </Link>
          </div>
          <CategoryBars
            rows={vendedoras.map((row) => ({
              name: text(row, "name"),
              grossSales: numeric(row, "movementValue"),
            }))}
          />
        </article>

        <article className="panel">
          <div className="panelHead">
            <div>
              <h2>Mix de pagamento</h2>
              <p>Como o período foi recebido</p>
            </div>
            <Link className="panelLink" href="/vendas">
              Detalhar
            </Link>
          </div>
          <RankingTable
            rows={data.paymentMethods}
            limit={8}
            columns={[
              { key: "code", label: "Forma" },
              { key: "value", label: "Valor", type: "money" },
            ]}
          />
        </article>
      </section>
    </main>
  );
}
