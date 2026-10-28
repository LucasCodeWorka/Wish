import { demoResponse } from "./demo";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

// Primeiro mes com movimento na base. Medido na API em 13/10/2026: consultar desde 2019
// devolve a serie comecando em jan/2024.
export const DATA_INICIO = "2024-01-01";

export type Periodo = { de: string; ate: string };
export type PresetId = "12m" | "ano" | "anoAnterior" | "completo" | "custom";

const pad = (n: number) => String(n).padStart(2, "0");

// Formatacao local de proposito: toISOString() converte para UTC e, em fuso positivo,
// devolve o dia anterior — o que faria o periodo comecar um dia antes do pretendido.
function iso(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Ultimo dia do mes ja fechado. O mes corrente fica de fora de todos os presets: ele esta
// incompleto por definicao e entraria no painel como uma queda que nao existe.
function fimDoMesAnterior(hoje: Date) {
  return new Date(hoje.getFullYear(), hoje.getMonth(), 0);
}

export function resolvePreset(preset: PresetId, hoje = new Date()): Periodo {
  const fim = fimDoMesAnterior(hoje);

  switch (preset) {
    case "ano":
      return { de: `${fim.getFullYear()}-01-01`, ate: iso(fim) };
    case "anoAnterior": {
      const ano = fim.getFullYear() - 1;
      return { de: `${ano}-01-01`, ate: `${ano}-12-31` };
    }
    case "completo":
      return { de: DATA_INICIO, ate: iso(fim) };
    case "12m":
    default: {
      const inicio = new Date(fim.getFullYear(), fim.getMonth() - 11, 1);
      return { de: iso(inicio), ate: iso(fim) };
    }
  }
}

// Comparacao sempre contra o MESMO periodo do ano anterior, nao contra a janela imediatamente
// anterior. Numa janela de 12 meses os dois dao no mesmo; num recorte menor (jan-set, por
// exemplo) o ano anterior e a leitura util, e a janela anterior cairia em outra estacao.
export function periodoAnterior(periodo: Periodo): Periodo {
  const recua = (valor: string) => {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return `${ano - 1}-${pad(mes)}-${pad(dia)}`;
  };
  return { de: recua(periodo.de), ate: recua(periodo.ate) };
}

// Le o periodo da URL. Sem parametro valido, cai no preset padrao.
export function periodoDaUrl(params: Record<string, string | string[] | undefined>): {
  periodo: Periodo;
  preset: PresetId;
} {
  const texto = (chave: string) => {
    const valor = params[chave];
    return Array.isArray(valor) ? valor[0] : valor;
  };
  const de = texto("de");
  const ate = texto("ate");
  const preset = (texto("preset") || "12m") as PresetId;

  if (preset === "custom" && de && ate) return { periodo: { de, ate }, preset: "custom" };
  if (de && ate) return { periodo: { de, ate }, preset };
  return { periodo: resolvePreset(preset), preset };
}

export type Kpis = {
  saleCount: number | null;
  grossSales: number | null;
  receivedValue: number | null;
  unitsSold: number | null;
  averageTicket: number | null;
  returnCount: number | null;
  returnValue: number | null;
  firstSaleDate: string | null;
  lastSaleDate: string | null;
};

export type MonthlySale = {
  year: number;
  month: number;
  grossSales: number;
  returnsValue: number;
  netSales: number;
  netUnits: number;
  saleCount: number;
};

export type RankingRow = Record<string, string | number | null>;

export type CustomerRetention = {
  totalCustomersAllTime: number;
  repeatCustomersAllTime: number;
  activeCustomersPeriod: number;
  newCustomersPeriod: number;
  returningCustomersPeriod: number;
};

export type StockCoverageRow = {
  code: string;
  name: string;
  ownStock: number;
  consignedStock: number;
  qty3m: number;
  unitCost: number | null;
};

export type AbcRow = {
  code: string;
  name: string;
  quantity: number;
  grossSales: number;
  cumulativeSales: number;
  totalSales: number;
};

export type HealthInfo = { serverTime: string; databaseName: string };

async function getJson<T>(path: string): Promise<T> {
  if (process.env.WISHBI_DEMO_MODE === "true") {
    return demoResponse(path) as T;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`API ${path} respondeu ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function qs(periodo: Periodo) {
  return `?startDate=${periodo.de}&endDate=${periodo.ate}`;
}

export async function getHealth() {
  const { health } = await getJson<{ health: HealthInfo }>("/api/health");
  return health;
}

// Bloco comparativo: so os dois relatorios que alimentam os indicadores de topo. Repetir as
// sete chamadas da pagina inteira para o periodo anterior dobraria o tempo de carga sem uso.
async function getComparativo(periodo: Periodo) {
  const anterior = periodoAnterior(periodo);
  const [kpis, retention, monthlySales] = await Promise.all([
    getJson<{ kpis: Kpis }>(`/api/reports/kpis${qs(anterior)}`),
    getJson<{ retention: CustomerRetention }>(`/api/reports/customer-retention${qs(anterior)}`),
    getJson<{ rows: MonthlySale[] }>(`/api/reports/monthly-sales${qs(anterior)}`),
  ]);

  return {
    periodo: anterior,
    kpis: kpis.kpis,
    retention: retention.retention,
    monthlySales: monthlySales.rows,
  };
}

export async function getSalesData(periodo: Periodo) {
  const query = qs(periodo);
  const queryAnterior = qs(periodoAnterior(periodo));
  // A leitura ABC da vitrine usa sempre os ultimos 12 meses fechados, mesmo quando o
  // filtro geral da pagina aponta para outro recorte.
  const productAbcPeriod = resolvePreset("12m");
  const productAbcQuery = qs(productAbcPeriod);

  const [
    health,
    kpis,
    monthlySales,
    salespeople,
    paymentMethods,
    customers,
    customerSellers,
    customerProducts,
    retention,
    topProducts,
    productAbc,
    topProductsAnterior,
    topSuppliers,
    anterior,
  ] = await Promise.all([
    getHealth(),
    getJson<{ kpis: Kpis }>(`/api/reports/kpis${query}`),
    getJson<{ rows: MonthlySale[] }>(`/api/reports/monthly-sales${query}`),
    getJson<{ rows: RankingRow[] }>(`/api/reports/salespeople${query}`),
    getJson<{ rows: RankingRow[] }>(`/api/reports/payment-methods${query}`),
    getJson<{ rows: RankingRow[] }>(`/api/reports/customers${query}`),
    getJson<{ rows: RankingRow[] }>(`/api/reports/customer-sellers${query}`),
    getJson<{ rows: RankingRow[] }>(`/api/reports/customer-products${query}`),
    getJson<{ retention: CustomerRetention }>(`/api/reports/customer-retention${query}`),
    getJson<{ rows: RankingRow[] }>(`/api/reports/top-products${query}`),
    getJson<{ rows: AbcRow[] }>(`/api/reports/product-abc${productAbcQuery}`),
    // So para a tabela comparativa de produto: mesmo recorte do ano anterior, nao reaproveita
    // getComparativo porque esse bloco e especifico de produto, os outros chamadores nao usam.
    getJson<{ rows: RankingRow[] }>(`/api/reports/top-products${queryAnterior}`),
    getJson<{ rows: RankingRow[] }>(`/api/reports/top-suppliers${query}`),
    getComparativo(periodo),
  ]);

  return {
    health,
    periodo,
    kpis: kpis.kpis,
    monthlySales: monthlySales.rows,
    salespeople: salespeople.rows,
    paymentMethods: paymentMethods.rows,
    customers: customers.rows,
    customerSellers: customerSellers.rows,
    customerProducts: customerProducts.rows,
    retention: retention.retention,
    topProducts: topProducts.rows,
    productAbc: productAbc.rows,
    productAbcPeriod,
    topProductsAnterior: topProductsAnterior.rows,
    topSuppliers: topSuppliers.rows,
    anterior,
  };
}

export async function getResumoData(periodo: Periodo) {
  const query = qs(periodo);

  const [health, kpis, monthlySales, retention, salespeople, paymentMethods, coverage, anterior] =
    await Promise.all([
      getHealth(),
      getJson<{ kpis: Kpis }>(`/api/reports/kpis${query}`),
      getJson<{ rows: MonthlySale[] }>(`/api/reports/monthly-sales${query}`),
      getJson<{ retention: CustomerRetention }>(`/api/reports/customer-retention${query}`),
      getJson<{ rows: RankingRow[] }>(`/api/reports/salespeople${query}`),
      getJson<{ rows: RankingRow[] }>(`/api/reports/payment-methods${query}`),
      getJson<{ rows: StockCoverageRow[] }>("/api/reports/stock-coverage"),
      getComparativo(periodo),
    ]);

  return {
    health,
    periodo,
    kpis: kpis.kpis,
    monthlySales: monthlySales.rows,
    retention: retention.retention,
    salespeople: salespeople.rows,
    paymentMethods: paymentMethods.rows,
    coverage: coverage.rows,
    anterior,
  };
}

// Estoque e uma FOTO da posicao de hoje: nao responde ao filtro de periodo, e a cobertura usa
// sempre a media dos ultimos 3 meses de venda. A propria aba avisa isso na tela.
export async function getInventoryData() {
  const [health, coverage, byLocation] = await Promise.all([
    getHealth(),
    getJson<{ rows: StockCoverageRow[] }>("/api/reports/stock-coverage"),
    getJson<{ rows: RankingRow[] }>("/api/reports/inventory"),
  ]);

  return { health, coverage: coverage.rows, byLocation: byLocation.rows };
}

export async function getProductData(periodo: Periodo) {
  const query = qs(periodo);

  const [health, abc, categories, kpis, anterior] = await Promise.all([
    getHealth(),
    getJson<{ rows: AbcRow[] }>(`/api/reports/product-abc${query}`),
    getJson<{ rows: RankingRow[] }>(`/api/reports/categories${query}`),
    getJson<{ kpis: Kpis }>(`/api/reports/kpis${query}`),
    getComparativo(periodo),
  ]);

  return {
    health,
    periodo,
    abc: abc.rows,
    categories: categories.rows,
    kpis: kpis.kpis,
    anterior,
  };
}

export type ConsignmentSummary = {
  enviadoQty: number;
  enviadoValor: number;
  retornadoQty: number;
  retornadoValor: number;
  vendidoQty: number;
  vendidoValor: number;
  estoqueAtualQty: number;
  estoqueAtualValorCusto: number;
};

export async function getConsignmentData(periodo: Periodo) {
  const query = qs(periodo);

  const [health, summary, byReseller, sales] = await Promise.all([
    getHealth(),
    getJson<{ summary: ConsignmentSummary }>(`/api/reports/consignment-summary${query}`),
    getJson<{ rows: RankingRow[] }>(`/api/reports/consignment-by-reseller${query}`),
    getJson<{ rows: RankingRow[] }>(`/api/reports/consignment-sales${query}`),
  ]);

  return {
    health,
    periodo,
    summary: summary.summary,
    byReseller: byReseller.rows,
    sales: sales.rows,
  };
}

export async function getChannelData(periodo: Periodo) {
  const query = qs(periodo);
  const queryAnterior = qs(periodoAnterior(periodo));

  const [health, kpis, kpisAnterior, stock, topProducts] = await Promise.all([
    getHealth(),
    getJson<{ rows: RankingRow[] }>(`/api/reports/channel-kpis${query}`),
    getJson<{ rows: RankingRow[] }>(`/api/reports/channel-kpis${queryAnterior}`),
    getJson<{ rows: RankingRow[] }>("/api/reports/channel-stock"),
    getJson<{ rows: RankingRow[] }>(`/api/reports/channel-top-products${query}`),
  ]);

  return {
    health,
    periodo,
    periodoAnterior: periodoAnterior(periodo),
    kpis: kpis.rows,
    kpisAnterior: kpisAnterior.rows,
    stock: stock.rows,
    topProducts: topProducts.rows,
  };
}
