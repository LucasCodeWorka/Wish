// Dados inteiramente ficticios para apresentar o painel sem acesso ao banco.
// A mesma URL de relatorio sempre produz o mesmo resultado.

type MonthRow = {
  year: number;
  month: number;
  grossSales: number;
  returnsValue: number;
  netSales: number;
  netUnits: number;
  saleCount: number;
};

const products = [
  ["AM001", "Anel Aurora", 132000],
  ["CO002", "Colar Horizonte", 108000],
  ["BR003", "Bracelete Essencia", 84000],
  ["AR004", "Brincos Luz", 63000],
  ["AN005", "Anel Jardim", 42000],
  ["CO006", "Colar Mar", 27000],
  ["BR007", "Bracelete Sol", 15000],
  ["AR008", "Brincos Brisa", 9000],
] as const;

function months(start: string, end: string): MonthRow[] {
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  const rows: MonthRow[] = [];
  for (let year = startYear, month = startMonth;
    year < endYear || (year === endYear && month <= endMonth);
    month += 1) {
    if (month > 12) {
      year += 1;
      month = 1;
    }
    const season = [0, 8, 4, 12, 10, 14, 18, 16, 9, 15, 20, 25, 38][month];
    const grossSales = (230 + (year - 2024) * 27 + season) * 1000;
    const returnsValue = Math.round(grossSales * (month % 4 === 0 ? 0.06 : 0.035));
    rows.push({
      year,
      month,
      grossSales,
      returnsValue,
      netSales: grossSales - returnsValue,
      netUnits: 68 + season,
      saleCount: 42 + Math.round(season / 2),
    });
  }
  return rows;
}

function summary(rows: MonthRow[], start: string, end: string) {
  const sum = (key: keyof MonthRow) => rows.reduce((total, row) => total + row[key], 0);
  const saleCount = sum("saleCount");
  const grossSales = sum("grossSales");
  const returnsValue = sum("returnsValue");
  return {
    saleCount,
    grossSales,
    receivedValue: Math.round(grossSales * 0.91),
    unitsSold: sum("netUnits"),
    averageTicket: saleCount ? grossSales / saleCount : 0,
    returnCount: Math.round(saleCount * 0.04),
    returnValue: returnsValue,
    firstSaleDate: start,
    lastSaleDate: end,
  };
}

function abc(scale: number) {
  const values = products.map(([, , value]) => Math.round(value * scale));
  const totalSales = values.reduce((sum, value) => sum + value, 0);
  let cumulativeSales = 0;
  return products.map(([code, name], index) => {
    const grossSales = values[index];
    cumulativeSales += grossSales;
    return {
      code,
      name,
      quantity: Math.round(grossSales / (index < 2 ? 6000 : 3000)),
      grossSales,
      cumulativeSales,
      totalSales,
    };
  });
}

const stockCoverage = products.map(([code, name], index) => ({
  code,
  name,
  ownStock: [0, 2, 5, 13, 1, 8, 21, 0][index],
  consignedStock: [3, 1, 0, 4, 2, 0, 1, 1][index],
  qty3m: [9, 12, 12, 10, 8, 5, 3, 0][index],
  unitCost: [1800, 2400, 950, 700, 520, 410, 300, 230][index],
}));

export function demoResponse(path: string): unknown {
  const url = new URL(path, "http://demo.local");
  const start = url.searchParams.get("startDate") || "2025-01-01";
  const end = url.searchParams.get("endDate") || "2025-12-31";
  const monthly = months(start, end);
  const kpis = summary(monthly, start, end);
  const scale = Math.max(0.4, monthly.length / 12);

  switch (url.pathname) {
    case "/api/health":
      return { health: { serverTime: new Date().toISOString(), databaseName: "Demonstração" } };
    case "/api/reports/kpis":
      return { kpis };
    case "/api/reports/monthly-sales":
      return { rows: monthly };
    case "/api/reports/customer-retention":
      return { retention: {
        totalCustomersAllTime: 840,
        repeatCustomersAllTime: 310,
        activeCustomersPeriod: Math.round(37 * monthly.length),
        newCustomersPeriod: Math.round(12 * monthly.length),
        returningCustomersPeriod: Math.round(25 * monthly.length),
      } };
    case "/api/reports/salespeople":
      return { rows: [
        { code: "01", name: "Consultora A", saleCount: 147, movementValue: 640000 * scale, commission: 19000 * scale },
        { code: "02", name: "Consultora B", saleCount: 119, movementValue: 520000 * scale, commission: 15600 * scale },
        { code: "03", name: "Consultora C", saleCount: 98, movementValue: 435000 * scale, commission: 13050 * scale },
        { code: "04", name: "Consultora D", saleCount: 76, movementValue: 320000 * scale, commission: 9600 * scale },
      ] };
    case "/api/reports/payment-methods":
      return { rows: [
        { code: "Cartão", installments: 360, value: 980000 * scale },
        { code: "Transferência", installments: 110, value: 640000 * scale },
        { code: "Dinheiro", installments: 72, value: 270000 * scale },
        { code: "Outros", installments: 30, value: 125000 * scale },
      ] };
    case "/api/reports/customers":
      return { rows: [
        { customerId: 1, code: "C001", name: "Cliente Exemplo A", purchaseCount: 12, value: 128000 * scale, lastPurchaseAt: end, totalValue: 373000 * scale, cumulativeValue: 128000 * scale },
        { customerId: 2, code: "C002", name: "Cliente Exemplo B", purchaseCount: 9, value: 98000 * scale, lastPurchaseAt: end, totalValue: 373000 * scale, cumulativeValue: 226000 * scale },
        { customerId: 3, code: "C003", name: "Cliente Exemplo C", purchaseCount: 8, value: 84000 * scale, lastPurchaseAt: end, totalValue: 373000 * scale, cumulativeValue: 310000 * scale },
        { customerId: 4, code: "C004", name: "Cliente Exemplo D", purchaseCount: 6, value: 63000 * scale, lastPurchaseAt: end, totalValue: 373000 * scale, cumulativeValue: 373000 * scale },
      ] };
    case "/api/reports/customer-sellers":
      return { rows: [
        { customerId: 1, sellerName: "Consultora A" },
        { customerId: 2, sellerName: "Consultora B" },
        { customerId: 3, sellerName: "Consultora C" },
        { customerId: 4, sellerName: "Consultora D" },
      ] };
    case "/api/reports/customer-products":
      return { rows: [
        { customerId: 1, productName: "Anel Exemplo" },
        { customerId: 2, productName: "Colar Exemplo" },
        { customerId: 3, productName: "Brinco Exemplo" },
        { customerId: 4, productName: "Pulseira Exemplo" },
      ] };
    case "/api/reports/stock-coverage":
      return { rows: stockCoverage };
    case "/api/reports/inventory":
      return { rows: [
        { groupCode: "ESTOQUES", accountCode: "E001", accountName: "Loja exemplo", lineCount: 72, quantity: 140 },
        { groupCode: "ESTOQUES", accountCode: "E002", accountName: "Depósito exemplo", lineCount: 38, quantity: 82 },
        { groupCode: "CLIENTES", accountCode: "C001", accountName: "Consignação exemplo", lineCount: 11, quantity: 18 },
      ] };
    case "/api/reports/product-abc":
      return { rows: abc(scale) };
    case "/api/reports/categories":
      return { rows: [
        { typeCode: "CATEGORIA", name: "Anéis", quantity: 65, grossSales: 580000 * scale },
        { typeCode: "CATEGORIA", name: "Colares", quantity: 52, grossSales: 490000 * scale },
        { typeCode: "CATEGORIA", name: "Brincos", quantity: 94, grossSales: 360000 * scale },
        { typeCode: "MATERIAL", name: "Ouro", quantity: 120, grossSales: 710000 * scale },
        { typeCode: "MATERIAL", name: "Prata", quantity: 88, grossSales: 240000 * scale },
      ] };
    default:
      throw new Error(`Rota de demonstração desconhecida: ${url.pathname}`);
  }
}
