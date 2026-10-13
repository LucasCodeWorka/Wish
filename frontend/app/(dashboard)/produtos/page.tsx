import { Layers, PackageSearch, Sparkles } from "lucide-react";
import { getProductData, periodoDaUrl } from "../../lib/api";
import {
  formatMoney,
  formatNumber,
  formatPercent,
  formatRangeLabel,
  variacao,
} from "../../lib/format";
import { AbcRepresentativity, CategoryBars } from "../../components/charts";
import { AbcBadge, Metric, PageHeader, RankingTable } from "../../components/ui";
import { FilterBar } from "../../components/FilterBar";
import type { AbcRow } from "../../lib/api";

function classify(cumulativeShare: number): "A" | "B" | "C" {
  if (cumulativeShare <= 0.8) return "A";
  if (cumulativeShare <= 0.95) return "B";
  return "C";
}

function buildAbc(rows: AbcRow[]) {
  const total = rows.length;
  return rows.map((row, index) => {
    const totalSales = Number(row.totalSales || 0);
    const revenueShare = totalSales > 0 ? Number(row.grossSales || 0) / totalSales : 0;
    const cumulativeShare = totalSales > 0 ? Number(row.cumulativeSales || 0) / totalSales : 0;

    return {
      ...row,
      rank: index + 1,
      total,
      revenueShare,
      cumulativeShare,
      cls: classify(cumulativeShare),
    };
  });
}

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { periodo, preset } = periodoDaUrl(
    process.env.WISHBI_STATIC_EXPORT === "true" ? {} : await searchParams,
  );

  let data: Awaited<ReturnType<typeof getProductData>> | null = null;
  let error: string | null = null;

  try {
    data = await getProductData(periodo);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Falha ao carregar dados";
  }

  if (!data) {
    return (
      <main className="shell">
        <PageHeader
          eyebrow="Wish BI"
          title="Análise de produto"
          lede="Inicie o backend e configure o .env com a senha do SQL Server para conectar ao WishBI."
          error={error}
        />
      </main>
    );
  }

  const abc = buildAbc(data.abc);
  const totalSkus = abc.length;

  const byClass = { A: 0, B: 0, C: 0 };
  const revenueByClass = { A: 0, B: 0, C: 0 };
  abc.forEach((row) => {
    byClass[row.cls] += 1;
    revenueByClass[row.cls] += row.revenueShare;
  });

  const chartData = (["A", "B", "C"] as const).map((cls) => ({
    cls: `Classe ${cls}`,
    revenueShare: revenueByClass[cls],
    skuShare: totalSkus > 0 ? byClass[cls] / totalSkus : 0,
  }));

  const topRows = abc.slice(0, 40);
  const rotuloAnterior = `vs. ${formatRangeLabel(data.anterior.periodo.de, data.anterior.periodo.ate)}`;
  const receitaPeriodo = Number(data.kpis.grossSales || 0);
  const receitaAnterior = Number(data.anterior.kpis.grossSales || 0);

  return (
    <main className="shell">
      <PageHeader
        eyebrow="Wish Fine Jewelry"
        title="Análise de produto"
        lede="Ranking de venda por produto e curva ABC de representatividade sobre a receita."
        lastSaleDate={data.kpis.lastSaleDate}
      >
        {process.env.WISHBI_STATIC_EXPORT !== "true" && (
          <FilterBar periodo={periodo} preset={preset} comparado={data.anterior.periodo} />
        )}
      </PageHeader>

      <section className="metricsGrid">
        <Metric
          label="Receita bruta do período"
          value={formatMoney(receitaPeriodo)}
          delta={variacao(receitaPeriodo, receitaAnterior)}
          deltaLabel={rotuloAnterior}
          detail={`Distribuída em ${formatNumber(totalSkus)} SKUs vendidos`}
          icon={<PackageSearch size={18} />}
        />
        <Metric
          label="Classe A"
          value={formatNumber(byClass.A)}
          detail={`${formatPercent(revenueByClass.A)} da receita em ${formatPercent(totalSkus ? byClass.A / totalSkus : 0)} dos SKUs`}
          icon={<Sparkles size={18} />}
        />
        <Metric
          label="Classe B"
          value={formatNumber(byClass.B)}
          detail={`${formatPercent(revenueByClass.B)} da receita`}
          icon={<Layers size={18} />}
        />
        <Metric
          label="Classe C"
          value={formatNumber(byClass.C)}
          detail={`${formatPercent(revenueByClass.C)} da receita, cauda longa`}
          icon={<Layers size={18} />}
        />
      </section>

      <section className="grid two">
        <article className="panel wide">
          <div className="panelHead">
            <div>
              <h2>Ranking de produtos</h2>
              <p>Top 40 por valor vendido, com representatividade e curva ABC</p>
            </div>
            <PackageSearch size={18} />
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Produto</th>
                  <th>Qtd.</th>
                  <th>Valor</th>
                  <th>% receita</th>
                  <th>% acumulado</th>
                  <th>Classe</th>
                </tr>
              </thead>
              <tbody>
                {topRows.map((row) => (
                  <tr key={row.code}>
                    <td>{row.rank}</td>
                    <td>
                      <strong>{row.code}</strong>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.name}</div>
                    </td>
                    <td>{formatNumber(row.quantity)}</td>
                    <td>{formatMoney(row.grossSales)}</td>
                    <td>{formatPercent(row.revenueShare)}</td>
                    <td>{formatPercent(row.cumulativeShare)}</td>
                    <td>
                      <AbcBadge cls={row.cls} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panelHead">
            <div>
              <h2>Curva ABC</h2>
              <p>% da receita x % dos SKUs por classe</p>
            </div>
          </div>
          <AbcRepresentativity data={chartData} />
        </article>
      </section>

      <section className="grid one">
        <article className="panel">
          <div className="panelHead">
            <div>
              <h2>Categorias e classificações</h2>
              <p>Top categorias, gemas e metais por valor vendido</p>
            </div>
          </div>
          <div className="grid two" style={{ marginTop: 0 }}>
            <CategoryBars rows={data.categories} />
            <RankingTable
              rows={data.categories}
              limit={10}
              columns={[
                { key: "typeCode", label: "Tipo" },
                { key: "name", label: "Classificação" },
                { key: "quantity", label: "Qtd.", type: "number" },
                { key: "grossSales", label: "Valor", type: "money" },
              ]}
            />
          </div>
        </article>
      </section>
    </main>
  );
}
