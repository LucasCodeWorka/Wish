"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlySale, RankingRow } from "../lib/api";
import {
  formatMoney,
  formatMoneyCompact,
  formatMonth,
  formatNumber,
  formatPercent,
} from "../lib/format";

// Acima deste numero de pontos, rotular todo mes vira borrao. Ate aqui, rotula todos.
const LIMITE_ROTULO_TOTAL = 15;

type SalesTrendProps = {
  rows: MonthlySale[];
  /** Mesma serie do periodo comparado, desenhada como linha de referencia. */
  rowsAnterior?: MonthlySale[];
};

export function SalesTrend({ rows, rowsAnterior = [] }: SalesTrendProps) {
  // Sem corte de serie: o grafico mostra exatamente o periodo que o filtro selecionou.
  const data = rows.map((row, index) => ({
    name: formatMonth(row.year, row.month),
    netSales: Number(row.netSales || 0),
    // Alinhamento por POSICAO, nao por mes: numa janela de 12 meses o indice 0 do periodo
    // anterior e o mes equivalente do ano passado.
    anterior: Number(rowsAnterior[index]?.netSales || 0) || null,
  }));

  const valores = data.map((item) => item.netSales);
  const maximo = Math.max(...valores, 0);
  const minimo = Math.min(...valores, Infinity);

  // Com serie curta rotula tudo; com serie longa rotula so os pontos que contam a historia
  // (primeiro, ultimo, pico e vale), que e o que mantem o "periodo completo" legivel.
  const rotular = (valor: number, index: number) => {
    if (data.length <= LIMITE_ROTULO_TOTAL) return true;
    return index === 0 || index === data.length - 1 || valor === maximo || valor === minimo;
  };

  return (
    <div className="chartFrame">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#b8935f" stopOpacity={0.36} />
              <stop offset="100%" stopColor="#b8935f" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eee7dc" vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tickFormatter={(value) => formatMoneyCompact(Number(value))}
            tickLine={false}
            axisLine={false}
            width={62}
          />
          <Tooltip formatter={(value) => formatMoney(Number(value))} />
          <Legend verticalAlign="top" height={28} />
          {rowsAnterior.length > 0 && (
            <Area
              dataKey="anterior"
              type="monotone"
              stroke="#b3a894"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              fill="none"
              name="Período anterior"
              connectNulls
            />
          )}
          <Area
            dataKey="netSales"
            type="monotone"
            stroke="#8c6b3f"
            strokeWidth={2.5}
            fill="url(#salesGradient)"
            name="Venda líquida"
          >
            <LabelList
              dataKey="netSales"
              position="top"
              offset={10}
              fontSize={11}
              fill="#5d5346"
              formatter={(value: number, _entry: unknown, index: number) =>
                rotular(Number(value), index) ? formatMoneyCompact(Number(value)) : ""
              }
            />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

type CategoryBarsProps = {
  rows: RankingRow[];
};

export function CategoryBars({ rows }: CategoryBarsProps) {
  const data = rows.slice(0, 10).map((row, index) => {
    const nomeBruto = String(row.name || "").trim();
    // Nome em branco ou generico ("-") nao distingue duas pessoas diferentes no eixo —
    // cai no codigo, que sempre existe, em vez de mostrar varias linhas iguais a "-".
    const name =
      nomeBruto && nomeBruto !== "-"
        ? nomeBruto.slice(0, 20)
        : row.code
          ? `Cód. ${row.code}`
          : `Item ${index + 1}`;
    return { name, grossSales: Number(row.grossSales || 0) };
  });

  // Altura cresce com o numero de linhas: 10 categorias apertadas em 280px é o que fazia
  // o Recharts pular rotulo do eixo (linha sim, linha nao) e as barras ficarem coladas.
  const altura = Math.max(260, data.length * 38 + 50);

  return (
    <div className="chartFrame compact">
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 70, top: 4 }} barCategoryGap="30%">
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={124}
            interval={0}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "var(--line-soft)" }}
            formatter={(value: number) => [formatMoney(value), "Valor"]}
          />
          <Bar dataKey="grossSales" fill="#1f4d47" radius={[0, 5, 5, 0]} maxBarSize={22}>
            <LabelList
              dataKey="grossSales"
              position="right"
              offset={8}
              fontSize={11}
              fontWeight={600}
              fill="var(--ink)"
              formatter={(value: number) => formatMoneyCompact(Number(value))}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const COVERAGE_COLORS: Record<string, string> = {
  Ruptura: "#d03b3b",
  "Cobertura baixa": "#fab219",
  "Cobertura ideal": "#0ca30c",
  Excesso: "#ec835a",
};

type StockCoverageBucketsProps = {
  data: { status: string; count: number }[];
};

export function StockCoverageBuckets({ data }: StockCoverageBucketsProps) {
  return (
    <div className="chartFrame compact">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 34 }}>
          <CartesianGrid stroke="#eee7dc" horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="status"
            tickLine={false}
            axisLine={false}
            width={118}
          />
          <Tooltip formatter={(value) => formatNumber(Number(value))} />
          <Bar dataKey="count" radius={[0, 5, 5, 0]}>
            {data.map((entry) => (
              <Cell key={entry.status} fill={COVERAGE_COLORS[entry.status] || "#8c6b3f"} />
            ))}
            <LabelList dataKey="count" position="right" formatter={(v: number) => formatNumber(v)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type AbcRepresentativityProps = {
  data: { cls: string; revenueShare: number; skuShare: number }[];
};

export function AbcRepresentativity({ data }: AbcRepresentativityProps) {
  return (
    <div className="chartFrame compact">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#eee7dc" vertical={false} />
          <XAxis dataKey="cls" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis
            tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
            tickLine={false}
            axisLine={false}
            width={46}
          />
          <Tooltip formatter={(value) => formatPercent(Number(value))} />
          <Legend />
          <Bar dataKey="revenueShare" name="% da receita" fill="#b8935f" radius={[4, 4, 0, 0]} />
          <Bar dataKey="skuShare" name="% dos SKUs" fill="#1f4d47" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
