// Tudo em pt-BR: o leitor do painel e brasileiro, e misturar separadores na mesma tela
// ("$10,500,616" ao lado de "2,351 pecas") faz o segundo numero ser lido como 2,35.
// A moeda e dolar de verdade, entao sai como "US$" — que e a grafia brasileira para USD.
export function formatMoney(value: number | string | null | undefined) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(number);
}

export function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
}

const MESES_CURTOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

// "out/24". O Intl em pt-BR devolve "out. de 24", que fica longo demais em eixo de grafico
// e em etiqueta de periodo.
export function formatMonth(year: number, month: number) {
  return `${MESES_CURTOS[month - 1]}/${String(year).slice(2)}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatPercent(value: number | string | null | undefined, digits = 1) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(number);
}

export function formatDecimal(value: number | string | null | undefined, digits = 1) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(number);
}

// Escala curta para eixo de grafico e rotulo de ponto: a serie mensal passa de 1 milhao,
// e "$2.674.726" em cima de um ponto nao cabe.
export function formatMoneyCompact(value: number | string | null | undefined) {
  const number = Number(value || 0);
  const abs = Math.abs(number);
  if (abs >= 1_000_000) return `US$ ${formatDecimal(number / 1_000_000, 1)}M`;
  if (abs >= 1_000) return `US$ ${formatNumber(Math.round(number / 1_000))}k`;
  return `US$ ${formatNumber(Math.round(number))}`;
}

// Variacao percentual ja com sinal. Null quando nao ha base de comparacao: melhor nao
// mostrar delta nenhum do que mostrar "+100%" em cima de um periodo anterior vazio.
export function variacao(atual: number, anterior: number): number | null {
  if (!anterior) return null;
  return atual / anterior - 1;
}

export function formatDelta(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "-";
  const sinal = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sinal}${formatDecimal(Math.abs(value) * 100, digits)}%`;
}

export function formatDateShort(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

// Rotulo curto de intervalo, para a etiqueta do periodo comparado: "out/24 - set/25".
export function formatRangeLabel(de: string, ate: string) {
  const rotulo = (valor: string) => {
    const [ano, mes] = valor.split("-").map(Number);
    return formatMonth(ano, mes);
  };
  return `${rotulo(de)} – ${rotulo(ate)}`;
}
