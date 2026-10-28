import { Store } from "lucide-react";
import { getChannelData, periodoDaUrl } from "../../lib/api";
import {
  formatMoney,
  formatNumber,
  formatRangeLabel,
  variacao,
} from "../../lib/format";
import { FilterBar } from "../../components/FilterBar";
import { PageHeader, RankingTable, numeric, text } from "../../components/ui";

export default async function CanaisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { periodo, preset } = periodoDaUrl(
    process.env.WISHBI_STATIC_EXPORT === "true" ? {} : await searchParams,
  );

  let data: Awaited<ReturnType<typeof getChannelData>> | null = null;
  let error: string | null = null;

  try {
    data = await getChannelData(periodo);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Falha ao carregar dados";
  }

  if (!data) {
    return (
      <main className="shell">
        <PageHeader
          eyebrow="Wish BI"
          title="Canais"
          lede="Inicie o backend e configure o .env com a senha do SQL Server para conectar ao WishBI."
          error={error}
        />
      </main>
    );
  }

  const anteriorPorCodigo = new Map(data.kpisAnterior.map((row) => [text(row, "code"), row]));
  const estoquePorCodigo = new Map(data.stock.map((row) => [text(row, "code"), row]));
  const produtosPorCodigo = new Map<string, string[]>();
  data.topProducts.forEach((row) => {
    const codigo = text(row, "empresaCode");
    const lista = produtosPorCodigo.get(codigo) || [];
    lista.push(text(row, "code"));
    produtosPorCodigo.set(codigo, lista);
  });

  // So entram canais com movimento no periodo selecionado — das 14 empresas cadastradas,
  // a maioria e canal de evento/parceria pontual que fica meses sem vender nada.
  const canais = data.kpis
    .filter((row) => numeric(row, "saleCount") > 0)
    .map((row) => {
      const codigo = text(row, "code");
      const atendimentos = numeric(row, "saleCount");
      const valor = numeric(row, "grossSales");
      const unidades = numeric(row, "unitsSold");
      const tkm = atendimentos ? valor / atendimentos : 0;
      const pa = atendimentos ? unidades / atendimentos : 0;

      const anterior = anteriorPorCodigo.get(codigo);
      const atendimentosAnt = anterior ? numeric(anterior, "saleCount") : 0;
      const valorAnt = anterior ? numeric(anterior, "grossSales") : 0;
      const unidadesAnt = anterior ? numeric(anterior, "unitsSold") : 0;
      const tkmAnt = atendimentosAnt ? valorAnt / atendimentosAnt : 0;
      const paAnt = atendimentosAnt ? unidadesAnt / atendimentosAnt : 0;

      return {
        code: codigo,
        name: text(row, "name"),
        atendimentos,
        tkm,
        tkmAnterior: tkmAnt,
        varTkm: variacao(tkm, tkmAnt),
        pa,
        paAnterior: paAnt,
        varPa: variacao(pa, paAnt),
        estoque: estoquePorCodigo.get(codigo) ? numeric(estoquePorCodigo.get(codigo)!, "stockQty") : 0,
        melhoresProdutos: (produtosPorCodigo.get(codigo) || []).join(", ") || "—",
      };
    })
    .sort((a, b) => b.atendimentos - a.atendimentos);

  return (
    <main className="shell">
      <PageHeader
        eyebrow="Wish Fine Jewelry"
        title="Canais"
        lede={`As 14 "empresas" cadastradas não são lojas físicas — são canal de venda (loja principal, site, showroom, país, parceria, pessoa). TKM e PA variam muito entre elas; misturar tudo esconde isso.`}
      >
        {process.env.WISHBI_STATIC_EXPORT !== "true" && (
          <FilterBar periodo={periodo} preset={preset} comparado={data.periodoAnterior} />
        )}
      </PageHeader>

      <section className="grid one">
        <article className="panel wide">
          <div className="panelHead">
            <div>
              <h2>Comparativo por canal</h2>
              <p>
                {formatRangeLabel(periodo.de, periodo.ate)} vs.{" "}
                {formatRangeLabel(data.periodoAnterior.de, data.periodoAnterior.ate)} · só canais
                com venda no período
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
                {canais.map((row) => (
                  <tr key={row.code}>
                    <td>
                      <strong>{row.name}</strong>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.code}</div>
                    </td>
                    <td>{formatNumber(row.atendimentos)}</td>
                    <td>{formatMoney(row.tkm)}</td>
                    <td>{formatMoney(row.tkmAnterior)}</td>
                    <td
                      style={{
                        color:
                          row.varTkm === null
                            ? "var(--muted)"
                            : row.varTkm > 0
                              ? "var(--status-good)"
                              : row.varTkm < 0
                                ? "var(--status-critical)"
                                : "var(--muted)",
                        fontWeight: 700,
                      }}
                    >
                      {row.varTkm === null
                        ? "novo"
                        : `${row.varTkm > 0 ? "+" : ""}${Math.round(row.varTkm * 100)}%`}
                    </td>
                    <td>{row.pa.toFixed(2)}</td>
                    <td>{row.paAnterior.toFixed(2)}</td>
                    <td
                      style={{
                        color:
                          row.varPa === null
                            ? "var(--muted)"
                            : row.varPa > 0
                              ? "var(--status-good)"
                              : row.varPa < 0
                                ? "var(--status-critical)"
                                : "var(--muted)",
                        fontWeight: 700,
                      }}
                    >
                      {row.varPa === null
                        ? "novo"
                        : `${row.varPa > 0 ? "+" : ""}${Math.round(row.varPa * 100)}%`}
                    </td>
                    <td>{formatNumber(row.estoque)}</td>
                    <td style={{ fontSize: 12 }}>{row.melhoresProdutos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="panel note">
            TKM e PA do ano anterior comparam o mesmo canal no mesmo recorte de datas do ano
            passado. &quot;Estoque&quot; é a posição própria de hoje (grupo ESTOQUES), não do
            período. &quot;Melhores produtos&quot; são os 3 de maior valor vendido no canal,
            no período selecionado.
          </p>
        </article>
      </section>
    </main>
  );
}
