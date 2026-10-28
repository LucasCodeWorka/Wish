import { ArrowDownToLine, ArrowUpFromLine, HandCoins, Package } from "lucide-react";
import { getConsignmentData, periodoDaUrl } from "../../lib/api";
import {
  formatDateShort,
  formatMoney,
  formatNumber,
  formatPercent,
} from "../../lib/format";
import { FilterBar } from "../../components/FilterBar";
import { Metric, PageHeader, RankingTable, numeric, text } from "../../components/ui";

export default async function ConsignacaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { periodo, preset } = periodoDaUrl(
    process.env.WISHBI_STATIC_EXPORT === "true" ? {} : await searchParams,
  );

  let data: Awaited<ReturnType<typeof getConsignmentData>> | null = null;
  let error: string | null = null;

  try {
    data = await getConsignmentData(periodo);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Falha ao carregar dados";
  }

  if (!data) {
    return (
      <main className="shell">
        <PageHeader
          eyebrow="Wish BI"
          title="Consignação"
          lede="Inicie o backend e configure o .env com a senha do SQL Server para conectar ao WishBI."
          error={error}
        />
      </main>
    );
  }

  const { summary } = data;
  // Taxa de conversao: das pecas que ja tiveram destino DECIDIDO no periodo (vendeu ou
  // voltou), quantas viraram venda. O que ainda esta parado com o consignatario fica de
  // fora da conta — ainda nao teve desfecho, entao nao e nem acerto nem erro.
  const decididas = summary.vendidoQty + summary.retornadoQty;
  const taxaConversao = decididas ? summary.vendidoQty / decididas : 0;

  const porConsignatario = data.byReseller.map((row) => {
    const vendido = numeric(row, "vendidoQty");
    const retornado = numeric(row, "retornadoQty");
    const decididasRow = vendido + retornado;
    return {
      ...row,
      taxaConversao: decididasRow ? vendido / decididasRow : null,
    };
  });

  const vendas = data.sales.map((row) => {
    const consignatario = text(row, "resellerName");
    const compradorCode = text(row, "buyerCode");
    const consignatarioCode = text(row, "resellerCode");
    // Nos dados reais, origem e destino do VCS sao sempre a mesma conta — nao existe um
    // "cliente final" distinto gravado no sistema. Se algum dia divergir, mostra os dois.
    const clienteLabel =
      compradorCode && compradorCode !== consignatarioCode
        ? `${consignatario} → ${text(row, "buyerName")}`
        : consignatario;
    return {
      ...row,
      dataFormatada: formatDateShort(String(row.date || "")),
      clienteLabel,
    };
  });

  return (
    <main className="shell">
      <PageHeader
        eyebrow="Wish Fine Jewelry"
        title="Consignação"
        lede="Ciclo SCS (sai para o consignatário) → DSC (volta) ou VCS (venda), confirmado com a operação da Wish."
      >
        {process.env.WISHBI_STATIC_EXPORT !== "true" && (
          <FilterBar periodo={periodo} preset={preset} />
        )}
      </PageHeader>

      <section className="metricsGrid">
        <Metric
          label="Em consignação hoje"
          value={formatNumber(summary.estoqueAtualQty)}
          detail="Peças fora da casa, na mão de consignatários agora"
          icon={<Package size={18} />}
        />
        <Metric
          label="Enviado no período"
          value={formatNumber(summary.enviadoQty)}
          detail={`${formatMoney(summary.enviadoValor)} em peças (SCS)`}
          icon={<ArrowUpFromLine size={18} />}
        />
        <Metric
          label="Vendido no período"
          value={formatNumber(summary.vendidoQty)}
          detail={`${formatMoney(summary.vendidoValor)} faturado (VCS)`}
          icon={<HandCoins size={18} />}
        />
        <Metric
          label="Taxa de conversão"
          value={formatPercent(taxaConversao)}
          detail={`Entre o que já voltou ou vendeu: ${formatNumber(summary.vendidoQty)} vendidas, ${formatNumber(summary.retornadoQty)} devolvidas`}
          icon={<ArrowDownToLine size={18} />}
        />
      </section>

      <section className="grid one">
        <article className="panel wide">
          <div className="panelHead">
            <div>
              <h2>Por consignatário</h2>
              <p>Quem está com peça da Wish, quanto já girou e quanto ainda está parado</p>
            </div>
          </div>
          <RankingTable
            rows={porConsignatario}
            limit={40}
            columns={[
              { key: "code", label: "Código" },
              { key: "name", label: "Consignatário" },
              { key: "estoqueAtual", label: "Com ele agora", type: "number" },
              { key: "enviadoQty", label: "Enviado (qtd)", type: "number" },
              { key: "enviadoValor", label: "Enviado (valor)", type: "money" },
              { key: "retornadoQty", label: "Devolvido (qtd)", type: "number" },
              { key: "vendidoQty", label: "Vendido (qtd)", type: "number" },
              { key: "vendidoValor", label: "Vendido (valor)", type: "money" },
            ]}
          />
          <p className="panel note">
            &quot;Com ele agora&quot; é a posição de hoje (tabela de estoque, grupo CONTAS DE
            CLIENTES); as demais colunas são do período selecionado no filtro.
          </p>
        </article>
      </section>

      <section className="grid one">
        <article className="panel wide">
          <div className="panelHead">
            <div>
              <h2>Vendas de consignação recentes</h2>
              <p>Últimas 100 — quem comprou, ou devolveu em forma de venda, a peça consignada</p>
            </div>
          </div>
          <RankingTable
            rows={vendas.map((row) => ({ ...row, date: row.dataFormatada }))}
            limit={100}
            columns={[
              { key: "date", label: "Data" },
              { key: "productCode", label: "Produto" },
              { key: "clienteLabel", label: "Cliente" },
              { key: "quantity", label: "Qtd.", type: "number" },
              { key: "value", label: "Valor", type: "money" },
            ]}
          />
          <p className="panel note">
            O sistema não registra, nas vendas de consignação consultadas, um comprador
            final diferente do consignatário — a conta de origem e a de destino do
            movimento vêm sempre iguais. Se isso for importante para a Wish, é uma pergunta
            para devolver a eles: esse dado existe em algum outro lugar do ERP?
          </p>
        </article>
      </section>
    </main>
  );
}
