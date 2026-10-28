import { Gem, Layers, PackageSearch, ReceiptText, Store, TrendingDown, TrendingUp, Truck, Users, WalletCards } from "lucide-react";
import { getChannelData, getSalesData, periodoDaUrl } from "../../lib/api";
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
import { Insights, Metric, PageHeader, RankingTable, numeric, text } from "../../components/ui";

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

  try {
    [data, canais] = await Promise.all([getSalesData(periodo), getChannelData(periodo)]);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Falha ao carregar dados";
  }

  if (!data) {
    return (
      <main className="shell">
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
    .sort((a, b) => b.atendimentos - a.atendimentos);

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
    <main className="shell">
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

      <section className="grid three">
        <article className="panel">
          <div className="panelHead">
            <div>
              <h2>Top vendedoras</h2>
              <p>Por valor atribuído</p>
            </div>
            <Users size={18} />
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

        <article className="panel">
          <div className="panelHead">
            <div>
              <h2>Top produtos</h2>
              <p>Por valor vendido</p>
            </div>
            <PackageSearch size={18} />
          </div>
          <CategoryBars
            rows={data.topProducts.map((row) => ({
              name: text(row, "name"),
              grossSales: numeric(row, "grossSales"),
            }))}
          />
        </article>
      </section>

      <section className="grid one">
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
      </section>

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
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.name}</div>
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

      {comparativoCanais.length > 0 && (
        <section className="grid one">
          <article className="panel wide">
            <div className="panelHead">
              <div>
                <h2>Comparativo por canal</h2>
                <p>
                  As 14 &quot;empresas&quot; cadastradas não são lojas físicas — são canal de
                  venda (loja principal, site, showroom, país, parceria, pessoa). Só entram
                  canais com venda no período.
                </p>
              </div>
              <Store size={18} />
            </div>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Canal</th>
                    <th>Atendimentos</th>
                    <th>TKM atual</th>
                    <th>TKM ano anterior</th>
                    <th>Var. TKM</th>
                    <th>PA atual</th>
                    <th>PA ano anterior</th>
                    <th>Var. PA</th>
                    <th>Estoque</th>
                    <th>Melhores produtos</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativoCanais.map((row) => (
                    <tr key={row.code}>
                      <td>
                        <strong>{row.name}</strong>
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.code}</div>
                      </td>
                      <td>{formatNumber(row.atendimentos)}</td>
                      <td>{formatMoney(row.tkm)}</td>
                      <td>{formatMoney(row.tkmAnterior)}</td>
                      <td>
                        <VarCell value={row.varTkm} />
                      </td>
                      <td>{formatDecimal(row.pa, 2)}</td>
                      <td>{formatDecimal(row.paAnterior, 2)}</td>
                      <td>
                        <VarCell value={row.varPa} />
                      </td>
                      <td>{formatNumber(row.estoque)}</td>
                      <td style={{ fontSize: 12 }}>{row.melhoresProdutos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="panel note">
              TKM e PA do ano anterior comparam o mesmo canal no mesmo recorte de datas do
              ano passado. &quot;Estoque&quot; é a posição própria de hoje (grupo ESTOQUES),
              não do período. &quot;Melhores produtos&quot; são os 3 de maior valor vendido no
              canal, no período selecionado.
            </p>
          </article>
        </section>
      )}

      <section className="grid two">
        <article className="panel">
          <div className="panelHead">
            <div>
              <h2>Clientes</h2>
              <p>
                {formatNumber(retention.activeCustomersPeriod)} ativos no período ·{" "}
                {formatNumber(retention.newCustomersPeriod)} novos ·{" "}
                {formatNumber(retention.returningCustomersPeriod)} recorrentes (
                {formatPercent(retornoClientes)})
              </p>
            </div>
          </div>
          <RankingTable
            rows={data.customers}
            columns={[
              { key: "code", label: "Código" },
              { key: "name", label: "Cliente" },
              { key: "purchaseCount", label: "Compras", type: "number" },
              { key: "value", label: "Valor", type: "money" },
            ]}
          />
        </article>

        <article className="panel">
          <div className="panelHead">
            <div>
              <h2>Pagamentos</h2>
              <p>Mix por forma de pagamento</p>
            </div>
            <WalletCards size={18} />
          </div>
          <RankingTable
            rows={data.paymentMethods}
            columns={[
              { key: "code", label: "Forma" },
              { key: "installments", label: "Parc.", type: "number" },
              { key: "value", label: "Valor", type: "money" },
            ]}
          />
        </article>
      </section>
    </main>
  );
}
