import { Gem, Layers, ReceiptText, TrendingDown, TrendingUp, Truck, Users, WalletCards } from "lucide-react";
import { getChannelData, getConsignmentData, getSalesData, periodoDaUrl } from "../../lib/api";
import {
  formatDateShort,
  formatDecimal,
  formatDelta,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPercent,
  formatRangeLabel,
  variacao,
} from "../../lib/format";
import { CategoryBars, DonutShare, SalesTrend } from "../../components/charts";
import { AnalyticTable } from "../../components/AnalyticTable";
import { ChannelAnalysis } from "../../components/ChannelAnalysis";
import { DrillCard } from "../../components/DrillCard";
import { ProductTopList } from "../../components/ProductTopList";
import { ProductAbcAnalysis } from "../../components/ProductAbcAnalysis";
import { FilterBar } from "../../components/FilterBar";
import {
  Chapter,
  Insights,
  Metric,
  PageHeader,
  RankingTable,
  numeric,
  text,
} from "../../components/ui";

function classificarAbc(acumulado: number): "A" | "B" | "C" {
  if (acumulado <= 0.8) return "A";
  if (acumulado <= 0.95) return "B";
  return "C";
}

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { periodo, preset } = periodoDaUrl(
    process.env.WISHBI_STATIC_EXPORT === "true" ? {} : await searchParams,
  );

  let data: Awaited<ReturnType<typeof getSalesData>> | null = null;
  let error: string | null = null;

  let canais: Awaited<ReturnType<typeof getChannelData>> | null = null;
  let consignacao: Awaited<ReturnType<typeof getConsignmentData>> | null = null;

  try {
    [data, canais, consignacao] = await Promise.all([
      getSalesData(periodo),
      getChannelData(periodo),
      getConsignmentData(periodo),
    ]);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Falha ao carregar dados";
  }

  if (!data) {
    return (
      <main className="shell salesPage">
        <PageHeader
          eyebrow="Wish BI"
          title="Análise de vendas"
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

  const pa = kpis.saleCount ? Number(kpis.unitsSold || 0) / Number(kpis.saleCount) : 0;
  const paAnterior = anterior.kpis.saleCount
    ? Number(anterior.kpis.unitsSold || 0) / Number(anterior.kpis.saleCount)
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

  // Leitura do periodo: antes vivia so no Resumo executivo, que foi descontinuado por
  // duplicar quase tudo desta aba. Essas frases sao a unica coisa que so existia la.
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
    `${formatNumber(retention.activeCustomersPeriod)} clientes compraram no período, sendo ${formatPercent(retornoClientes)} recorrentes.`,
  );

  // Participacao sobre o total ATRIBUIDO a vendedoras: um movimento pode ter mais de uma
  // vendedora, entao a soma daqui pode superar a venda liquida da empresa.
  const totalAtribuido = data.salespeople.reduce(
    (soma, row) => soma + numeric(row, "movementValue"),
    0,
  );
  const vendedoras = data.salespeople.map((row) => {
    const valor = numeric(row, "movementValue");
    const vendas = numeric(row, "saleCount");
    const comissao = numeric(row, "commission");
    return {
      ...row,
      ticketMedio: vendas ? valor / vendas : 0,
      comissaoPct: valor ? comissao / valor : 0,
      participacao: totalAtribuido ? valor / totalAtribuido : 0,
    };
  });

  // Comparativo por produto: top 20 do periodo atual, casado pelo codigo com o mesmo
  // produto no periodo anterior. Produto que nao vendeu no periodo anterior entra com 0,
  // nao desaparece da tabela.
  const anteriorPorCodigo = new Map(
    data.topProductsAnterior.map((row) => [text(row, "code"), row]),
  );
  const comparativoProdutos = data.topProducts.slice(0, 20).map((row) => {
    const code = text(row, "code");
    const atual = { qtd: numeric(row, "quantity"), valor: numeric(row, "grossSales") };
    const prev = anteriorPorCodigo.get(code);
    const anteriorValores = {
      qtd: prev ? numeric(prev, "quantity") : 0,
      valor: prev ? numeric(prev, "grossSales") : 0,
    };
    return {
      code,
      name: text(row, "name"),
      qtdAtual: atual.qtd,
      valorAtual: atual.valor,
      qtdAnterior: anteriorValores.qtd,
      valorAnterior: anteriorValores.valor,
      varQtd: variacao(atual.qtd, anteriorValores.qtd),
      varValor: variacao(atual.valor, anteriorValores.valor),
    };
  });

  // Comparativo por canal: as 14 "empresas" cadastradas nao sao lojas fisicas, sao canal de
  // venda (loja principal, site, showroom, pais, parceria, pessoa) — TKM e PA variam muito
  // entre elas (ex.: canal de atacado com 6 vendas e ticket de centenas de milhares,
  // escondido se somado com o resto). So entram canais com venda no periodo selecionado.
  const canaisAnteriorPorCodigo = new Map(
    (canais?.kpisAnterior || []).map((row) => [text(row, "code"), row]),
  );
  const estoquePorCanal = new Map((canais?.stock || []).map((row) => [text(row, "code"), row]));
  const produtosPorCanal = new Map<string, string[]>();
  (canais?.topProducts || []).forEach((row) => {
    const codigo = text(row, "empresaCode");
    const lista = produtosPorCanal.get(codigo) || [];
    lista.push(text(row, "code"));
    produtosPorCanal.set(codigo, lista);
  });
  const comparativoCanais = (canais?.kpis || [])
    .filter((row) => numeric(row, "saleCount") > 0)
    .map((row) => {
      const codigo = text(row, "code");
      const atendimentosCanal = numeric(row, "saleCount");
      const valorCanal = numeric(row, "grossSales");
      const unidadesCanal = numeric(row, "unitsSold");
      const tkmCanal = atendimentosCanal ? valorCanal / atendimentosCanal : 0;
      const paCanal = atendimentosCanal ? unidadesCanal / atendimentosCanal : 0;

      const ant = canaisAnteriorPorCodigo.get(codigo);
      const atendimentosAnt = ant ? numeric(ant, "saleCount") : 0;
      const valorAnt = ant ? numeric(ant, "grossSales") : 0;
      const unidadesAnt = ant ? numeric(ant, "unitsSold") : 0;
      const tkmAnt = atendimentosAnt ? valorAnt / atendimentosAnt : 0;
      const paAnt = atendimentosAnt ? unidadesAnt / atendimentosAnt : 0;

      const estoqueRow = estoquePorCanal.get(codigo);
      return {
        code: codigo,
        name: text(row, "name"),
        valor: valorCanal,
        atendimentos: atendimentosCanal,
        tkm: tkmCanal,
        tkmAnterior: tkmAnt,
        varTkm: variacao(tkmCanal, tkmAnt),
        pa: paCanal,
        paAnterior: paAnt,
        varPa: variacao(paCanal, paAnt),
        estoque: estoqueRow ? numeric(estoqueRow, "stockQty") : 0,
        melhoresProdutos: (produtosPorCanal.get(codigo) || []).join(", ") || "—",
      };
    })
    .sort((a, b) => b.valor - a.valor);

  // Consignacao: SCS tira do estoque proprio e poe na conta do consignatario; dali, DSC
  // devolve ou VCS vende (conta como venda, ja somada no faturamento liquido do topo).
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

  // Vitrine dos blocos: a rosca recebe nome/valor, e a frase destaca o lider com seu peso.
  const canaisDonut = comparativoCanais.map((row) => ({ name: row.name, value: row.valor }));
  const totalCanais = canaisDonut.reduce((soma, row) => soma + row.value, 0);
  const canalLider = canaisDonut[0];
  const fraseCanais = canalLider
    ? `${canalLider.name} concentra ${formatPercent(canalLider.value / (totalCanais || 1))} do faturamento, em ${formatNumber(comparativoCanais.length)} canais ativos.`
    : undefined;

  const pagamentosDonut = data.paymentMethods.map((row) => ({
    name: text(row, "name") === "-" ? text(row, "code") : text(row, "name"),
    value: numeric(row, "value"),
  }));
  const totalPagamentos = pagamentosDonut.reduce((soma, row) => soma + row.value, 0);
  const pagamentoLider = [...pagamentosDonut].sort((a, b) => b.value - a.value)[0];
  const frasePagamentos = pagamentoLider
    ? `${pagamentoLider.name} responde por ${formatPercent(pagamentoLider.value / (totalPagamentos || 1))} do recebido no período.`
    : undefined;
  const pagamentosDetalhe = data.paymentMethods.map((row) => ({
    ...row,
    participacao: totalPagamentos ? numeric(row, "value") / totalPagamentos : 0,
  }));

  const vendedorasPorCliente = new Map<number, string[]>();
  data.customerSellers.forEach((row) => {
    const id = numeric(row, "customerId");
    const nome = text(row, "sellerName") === "-" ? text(row, "sellerCode") : text(row, "sellerName");
    if (nome === "-") return;
    const lista = vendedorasPorCliente.get(id) || [];
    if (!lista.includes(nome)) lista.push(nome);
    vendedorasPorCliente.set(id, lista);
  });
  const produtosPorCliente = new Map<number, string[]>();
  data.customerProducts.forEach((row) => {
    const id = numeric(row, "customerId");
    const nome = text(row, "productName") === "-" ? text(row, "productCode") : text(row, "productName");
    const lista = produtosPorCliente.get(id) || [];
    if (nome !== "-" && !lista.includes(nome)) lista.push(nome);
    produtosPorCliente.set(id, lista);
  });
  const clientes = data.customers.map((row, index) => {
    const id = numeric(row, "customerId");
    const total = numeric(row, "totalValue");
    const acumulado = total ? numeric(row, "cumulativeValue") / total : 0;
    return {
      ...row,
      rank: index + 1,
      ultimaCompra: formatDateShort(String(row.lastPurchaseAt || "")),
      vendedoras: (vendedorasPorCliente.get(id) || []).join(", ") || "Sem vendedora vinculada",
      produtos: (produtosPorCliente.get(id) || []).join(" · ").toLocaleUpperCase("pt-BR") || "—",
      participacao: total ? numeric(row, "value") / total : 0,
      classe: classificarAbc(acumulado),
    };
  });

  const produtosAbc = data.productAbc.map((row, index) => {
    const total = Number(row.totalSales || 0);
    const acumulado = total ? Number(row.cumulativeSales || 0) / total : 0;
    return {
      rank: index + 1,
      code: String(row.code || ""),
      name: String(row.name || row.code || "").toLocaleUpperCase("pt-BR"),
      quantity: Number(row.quantity || 0),
      grossSales: Number(row.grossSales || 0),
      revenueShare: total ? Number(row.grossSales || 0) / total : 0,
      cumulativeShare: acumulado,
      classe: classificarAbc(acumulado),
    };
  });
  const top10Produtos = produtosAbc.slice(0, 10);
  const rotuloAbc = formatRangeLabel(data.productAbcPeriod.de, data.productAbcPeriod.ate);
  const totalSkus = produtosAbc.length;
  const top10Participacao = top10Produtos.reduce((soma, row) => soma + row.revenueShare, 0);
  const qtdVintePorCento = Math.ceil(totalSkus * 0.2);
  const participacaoVintePorCento = produtosAbc[qtdVintePorCento - 1]?.cumulativeShare || 0;
  const indiceOitenta = produtosAbc.findIndex((row) => row.cumulativeShare >= 0.8);
  const qtdParaOitenta = indiceOitenta < 0 ? 0 : indiceOitenta + 1;
  const pontosPareto = totalSkus <= 100
    ? [{ skuShare: 0, cumulativeShare: 0 }, ...produtosAbc.map((row) => ({ skuShare: row.rank / totalSkus, cumulativeShare: row.cumulativeShare }))]
    : Array.from({ length: 101 }, (_, percentual) => {
      if (percentual === 0) return { skuShare: 0, cumulativeShare: 0 };
      const index = Math.min(totalSkus - 1, Math.ceil(totalSkus * percentual / 100) - 1);
      return { skuShare: (index + 1) / totalSkus, cumulativeShare: produtosAbc[index].cumulativeShare };
    });

  function VarCell({ value }: { value: number | null }) {
    if (value === null) return <span style={{ color: "var(--muted)" }}>novo</span>;
    const subiu = value > 0;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: subiu ? "var(--status-good)" : value < 0 ? "var(--status-critical)" : "var(--muted)",
          fontWeight: 700,
        }}
      >
        {subiu ? <TrendingUp size={13} /> : value < 0 ? <TrendingDown size={13} /> : null}
        {formatDelta(value)}
      </span>
    );
  }

  return (
    <main className="shell salesPage">
      <PageHeader
        eyebrow="Wish Fine Jewelry"
        title="Análise de vendas"
        lede="Desempenho comercial do período: faturamento, ticket, peças por atendimento e mix."
        lastSaleDate={kpis.lastSaleDate}
      >
        {process.env.WISHBI_STATIC_EXPORT !== "true" && (
          <FilterBar periodo={periodo} preset={preset} comparado={anterior.periodo} />
        )}
      </PageHeader>

      <Chapter
        numero={1}
        titulo="Como foi o período"
        pergunta="Vendemos melhor ou pior que no mesmo período do ano passado?"
      />

      <section className="metricsGrid">
        <Metric
          label="Faturamento líquido"
          value={formatMoney(liquido)}
          delta={deltaLiquido}
          deltaLabel={rotuloAnterior}
          detail={`${formatMoney(kpis.grossSales)} bruto · ${formatMoney(kpis.returnValue)} em devoluções`}
          icon={<Gem size={18} />}
        />
        <Metric
          label="Ticket médio (TKM)"
          value={formatMoney(tkm)}
          delta={deltaTkm}
          deltaLabel={rotuloAnterior}
          detail={`Sobre ${formatNumber(atendimentos)} atendimentos`}
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
          detail={`${formatNumber(kpis.returnCount)} devoluções registradas`}
          icon={<ReceiptText size={18} />}
        />
      </section>

      <Insights itens={leitura} />

      <Chapter
        numero={2}
        titulo="De onde veio o movimento"
        pergunta="Qual mês, qual canal e quais produtos explicam esse resultado?"
      />

      <section className="grid one">
        <article className="panel wide">
          <div className="panelHead">
            <div>
              <h2>Venda mensal</h2>
              <p>Líquida de devoluções, com o período anterior como referência</p>
            </div>
          </div>
          <SalesTrend rows={data.monthlySales} rowsAnterior={anterior.monthlySales} />
        </article>
      </section>

      <section className="grid two summaryGrid">
        {comparativoCanais.length > 0 && (
          <DrillCard
            titulo="Canais"
            numero={formatMoneyCompact(totalCanais)}
            numeroLegenda="Faturamento por canal"
            frase={fraseCanais}
            acao="Ver TKM, PA e estoque por canal"
            resumo={<DonutShare rows={canaisDonut} maxFatias={3} />}
          >
            <p className="channelNote">
              As 14 &quot;empresas&quot; cadastradas não são lojas físicas — são canal de
              venda (loja principal, site, showroom, país, parceria, pessoa). Só entram
              canais com venda no período.
            </p>
            <ChannelAnalysis rows={comparativoCanais} />
            <p className="channelNote">
              TKM e PA do ano anterior comparam o mesmo canal no mesmo recorte de datas do
              ano passado. &quot;Estoque&quot; é a posição própria de hoje (grupo ESTOQUES),
              não do período. &quot;Melhores produtos&quot; são os 3 de maior valor vendido no
              canal, no período selecionado.
            </p>
          </DrillCard>
        )}

        <DrillCard
          titulo="Mix de pagamento"
          numero={formatMoneyCompact(totalPagamentos)}
          numeroLegenda="Recebido por forma de pagamento"
          frase={frasePagamentos}
          acao="Ver formas e parcelas"
          resumo={<DonutShare rows={pagamentosDonut} maxFatias={4} />}
        >
          <AnalyticTable
            rows={pagamentosDetalhe}
            initialSort="value"
            filterLabel="Filtrar formas de pagamento"
            columns={[
              { key: "code", label: "Forma" },
              { key: "name", label: "Descrição" },
              { key: "installments", label: "Parcelas", type: "number" },
              { key: "value", label: "Valor", type: "money" },
              { key: "participacao", label: "Participação", type: "percent" },
            ]}
          />
        </DrillCard>
      </section>

      <section className="grid two">
        <DrillCard
          titulo="Top 10 produtos"
          numero={formatPercent(top10Participacao)}
          numeroLegenda={`da venda de produtos nos 12 meses fechados (${rotuloAbc})`}
          frase={`${formatNumber(qtdParaOitenta)} de ${formatNumber(totalSkus)} produtos vendidos alcançam 80% da venda nos últimos 12 meses.`}
          acao="Ver curva ABC e análise 80/20"
          modalClassName="drillDialogWide"
          resumo={<ProductTopList rows={top10Produtos} />}
        >
          <p className="paretoExplanation">Universo: somente produtos com venda positiva nos últimos 12 meses fechados ({rotuloAbc}). Produtos sem venda nesse intervalo ficam fora da curva.</p>
          <div className="paretoStats">
            <div><span>Top 20% dos produtos</span><strong>{formatPercent(participacaoVintePorCento)}</strong><small>da venda · {formatNumber(qtdVintePorCento)} produtos</small></div>
            <div><span>Para alcançar 80% da venda</span><strong>{formatNumber(qtdParaOitenta)}</strong><small>produtos · {formatPercent(totalSkus ? qtdParaOitenta / totalSkus : 0)} dos SKUs</small></div>
            <div><span>Top 10 produtos</span><strong>{formatPercent(top10Participacao)}</strong><small>da venda dos últimos 12 meses</small></div>
          </div>
          <p className="paretoExplanation">
            Neste período, os 20% mais vendidos representam {formatPercent(participacaoVintePorCento)} da venda.
            Para alcançar 80%, são necessários {formatPercent(totalSkus ? qtdParaOitenta / totalSkus : 0)} dos produtos.
            A curva acumula a receita por ordem de valor, com referências em 20% dos produtos e 80% da receita.
            As classes seguem os cortes de 80% (A), 95% (B) e o restante (C).
          </p>
          <ProductAbcAnalysis rows={produtosAbc} points={pontosPareto} />
        </DrillCard>

        <article className="panel soft">
          <div className="panelHead">
            <div>
              <h2>Top fornecedores</h2>
              <p>Por valor vendido</p>
            </div>
            <Truck size={18} />
          </div>
          <CategoryBars
            rows={data.topSuppliers.map((row) => ({
              name: text(row, "name"),
              grossSales: numeric(row, "grossSales"),
            }))}
          />
          <p className="panel note">
            Fornecedor não é um cadastro do produto — é inferido pela última compra (COM)
            registrada daquele produto. Produto sem compra registrada aparece como
            &quot;Fornecedor não identificado&quot;.
          </p>
        </article>
      </section>

      <Chapter
        numero={3}
        titulo="Quem fez acontecer"
        pergunta="Quais vendedoras entregaram o resultado e quais clientes compraram?"
      />

      <section className="grid two">
        <article className="panel wide">
          <div className="panelHead">
            <div>
              <h2>Vendedoras</h2>
              <p>Desempenho, ticket e comissão por vendedora</p>
            </div>
            <Users size={18} />
          </div>
          <RankingTable
            rows={vendedoras}
            limit={15}
            columns={[
              { key: "code", label: "Cód." },
              { key: "name", label: "Nome" },
              { key: "saleCount", label: "Vendas", type: "number" },
              { key: "movementValue", label: "Valor", type: "money" },
              { key: "ticketMedio", label: "Ticket médio", type: "money" },
              { key: "commission", label: "Comissão", type: "money" },
              { key: "comissaoPct", label: "Com. %", type: "percent" },
              { key: "participacao", label: "Participação", type: "percent" },
            ]}
          />
          <p className="panel note">
            Participação calculada sobre o total atribuído a vendedoras no período; um
            movimento pode ter mais de uma vendedora, então a soma pode superar a venda
            líquida da empresa.
          </p>
        </article>

        <article className="panel soft">
          <div className="panelHead">
            <div>
              <h2>Participação</h2>
              <p>Top 10 por valor atribuído</p>
            </div>
          </div>
          <CategoryBars
            rows={vendedoras.map((row) => ({
              name: text(row, "name"),
              grossSales: numeric(row, "movementValue"),
            }))}
          />
        </article>
      </section>

      <section className="grid one">
        <article className="panel wide customerPanel">
          <div className="panelHead">
            <div>
              <h2>Clientes</h2>
              <p>
                {formatNumber(retention.activeCustomersPeriod)} ativos ·{" "}
                {formatNumber(retention.newCustomersPeriod)} novos ·{" "}
                {formatPercent(retornoClientes)} recorrentes. Ranking de todos os clientes do período.
              </p>
            </div>
          </div>
          <p className="panel note">A participação e a classe ABC usam a venda de todos os clientes do período; A até 80%, B até 95%, C no restante. Produtos listados: os 3 de maior valor para cada cliente.</p>
          <AnalyticTable
            rows={clientes}
            initialSort="value"
            filterLabel="Buscar cliente, vendedora ou produto"
            pageSize={50}
            columns={[
              { key: "rank", label: "#", type: "number" },
              { key: "name", label: "Cliente", subKey: "code" },
              { key: "purchaseCount", label: "Compras", type: "number" },
              { key: "value", label: "Valor", type: "money" },
              { key: "participacao", label: "% venda", type: "percent" },
              { key: "classe", label: "ABC", type: "abc" },
              { key: "ultimaCompra", label: "Última compra no período" },
              { key: "vendedoras", label: "Vendedoras" },
              { key: "produtos", label: "Produtos líderes" },
            ]}
          />
        </article>
      </section>

      <Chapter
        numero={4}
        titulo="O que precisa de atenção"
        pergunta="Onde o resultado caiu e o que está parado esperando decisão?"
        alerta
      />

      <section className="grid one">
        <article className="panel wide">
          <div className="panelHead">
            <div>
              <h2>Comparativo de produtos</h2>
              <p>Top 20 do período atual, pareado por código com {rotuloAnterior.replace("vs. ", "")}</p>
            </div>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Qtd. atual</th>
                  <th>Qtd. anterior</th>
                  <th>Var. qtd.</th>
                  <th>Valor atual</th>
                  <th>Valor anterior</th>
                  <th>Var. valor</th>
                </tr>
              </thead>
              <tbody>
                {comparativoProdutos.map((row) => (
                  <tr key={row.code}>
                    <td>
                      <strong>{row.code}</strong>
                      <div className="productDescription">{row.name}</div>
                    </td>
                    <td>{formatNumber(row.qtdAtual)}</td>
                    <td>{formatNumber(row.qtdAnterior)}</td>
                    <td>
                      <VarCell value={row.varQtd} />
                    </td>
                    <td>{formatMoney(row.valorAtual)}</td>
                    <td>{formatMoney(row.valorAnterior)}</td>
                    <td>
                      <VarCell value={row.varValor} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  consignatário; dali, DSC devolve ou VCS vende (já somada no faturamento
                  líquido do topo da página).
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
                Em consignação hoje: <strong style={{ color: "var(--ink)" }}>{formatNumber(resumoConsignacao.estoqueAtualQty)}</strong> peças ({formatMoney(resumoConsignacao.estoqueAtualValorCusto)} em custo)
              </span>
              <span>
                Enviado no período: <strong style={{ color: "var(--ink)" }}>{formatNumber(resumoConsignacao.enviadoQty)}</strong> ({formatMoney(resumoConsignacao.enviadoValor)})
              </span>
              <span>
                Vendido no período: <strong style={{ color: "var(--ink)" }}>{formatNumber(resumoConsignacao.vendidoQty)}</strong> ({formatMoney(resumoConsignacao.vendidoValor)})
              </span>
              <span>
                Taxa de conversão: <strong style={{ color: "var(--ink)" }}>{formatPercent(taxaConversao)}</strong>
              </span>
            </div>
            <div className="panelSplit">
              <div>
                <p className="panelSplitTitle">Por consignatário</p>
                <RankingTable
                  rows={porConsignatario}
                  limit={12}
                  columns={[
                    { key: "name", label: "Consignatário" },
                    { key: "estoqueAtual", label: "Com ele agora", type: "number" },
                    { key: "estoqueAtualValorCusto", label: "Valor atual (custo)", type: "money" },
                    { key: "enviadoQty", label: "Enviado", type: "number" },
                    { key: "retornadoQty", label: "Devolvido", type: "number" },
                    { key: "vendidoQty", label: "Vendido", type: "number" },
                    { key: "vendidoValor", label: "Valor vendido", type: "money" },
                  ]}
                />
              </div>

              {vendasConsignacao.length > 0 && (
                <div>
                  <p className="panelSplitTitle">Vendas recentes</p>
                  <RankingTable
                    rows={vendasConsignacao}
                    limit={12}
                    columns={[
                      { key: "date", label: "Data" },
                      { key: "productCode", label: "Produto" },
                      { key: "clienteLabel", label: "Cliente" },
                      { key: "value", label: "Valor", type: "money" },
                    ]}
                  />
                </div>
              )}
            </div>
            <p className="panel note">
              As vendas de consignação (VCS) consultadas nunca mostram um comprador final
              diferente do consignatário no sistema — origem e destino do movimento vêm
              sempre a mesma conta. Pergunta em aberto para a Wish: esse dado existe em
              algum outro lugar do ERP?
            </p>
          </article>
        </section>
      )}
    </main>
  );
}
