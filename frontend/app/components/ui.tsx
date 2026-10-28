import { RefreshCcw, TrendingDown, TrendingUp } from "lucide-react";
import type { RankingRow, HealthInfo } from "../lib/api";
import {
  formatDateShort,
  formatDelta,
  formatMoney,
  formatNumber,
  formatPercent,
} from "../lib/format";

export function numeric(row: RankingRow, key: string) {
  return Number(row[key] || 0);
}

export function text(row: RankingRow, key: string) {
  return String(row[key] || "-").trim() || "-";
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  error,
  lastSaleDate,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  health?: HealthInfo | null;
  error?: string | null;
  /** Data do ultimo movimento. Sem isso o leitor confunde mes sem carga com queda de venda. */
  lastSaleDate?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <section className="hero">
      <div className="heroTop">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lede">{lede}</p>
        </div>
        {error ? (
          <div className="status error">
            <RefreshCcw size={18} />
            {error}
          </div>
        ) : lastSaleDate ? (
          <div className="status">Dados até {formatDateShort(lastSaleDate)}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function Metric({
  label,
  value,
  detail,
  icon,
  delta,
  deltaLabel,
  goodDirection = "up",
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  /** Variacao contra o periodo comparado. `null` quando nao ha base: nao renderiza nada. */
  delta?: number | null;
  deltaLabel?: string;
  /** Para onde "melhor" aponta. Devolucao subindo e ruim, venda subindo e boa. */
  goodDirection?: "up" | "down";
}) {
  const temDelta = delta !== null && delta !== undefined && Number.isFinite(delta);
  const subiu = temDelta && (delta as number) > 0;
  const neutro = temDelta && Math.abs(delta as number) < 0.001;
  const bom = goodDirection === "up" ? subiu : !subiu;

  return (
    <article className="metric">
      <div className="metricIcon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      {temDelta && (
        <p className={`delta${neutro ? " neutral" : bom ? " good" : " bad"}`}>
          {subiu ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {formatDelta(delta)}
          {deltaLabel ? <em>{deltaLabel}</em> : null}
        </p>
      )}
      <small>{detail}</small>
    </article>
  );
}

// Divisor narrativo. Sem ele a pagina vira uma pilha de cards de peso igual, onde o
// faturamento do periodo e a tabela de formas de pagamento disputam a mesma atencao.
// Cada capitulo declara a PERGUNTA que as secoes abaixo dele respondem.
export function Chapter({
  numero,
  titulo,
  pergunta,
  alerta,
}: {
  numero: number;
  titulo: string;
  pergunta: string;
  /** Capitulo que pede decisao, nao so leitura — ganha marcador de atencao. */
  alerta?: boolean;
}) {
  return (
    <div className={`chapter${alerta ? " alerta" : ""}`}>
      <span className="chapterNum">{numero}</span>
      <div>
        <h2>{titulo}</h2>
        <p>{pergunta}</p>
      </div>
    </div>
  );
}

// Faixa de leitura: duas ou tres frases que dizem o que os numeros querem dizer. E o que
// separa um painel de dados de um painel de decisao.
export function Insights({ itens }: { itens: string[] }) {
  if (!itens.length) return null;
  return (
    <section className="insights">
      {itens.map((texto, index) => (
        <p key={index}>{texto}</p>
      ))}
    </section>
  );
}

export function RankingTable({
  rows,
  columns,
  limit = 10,
}: {
  rows: RankingRow[];
  columns: { key: string; label: string; type?: "money" | "number" | "percent" }[];
  limit?: number;
}) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, limit).map((row, index) => (
            <tr key={`${text(row, "code")}-${index}`}>
              {columns.map((column) => {
                const raw = row[column.key];
                const value =
                  column.type === "money"
                    ? formatMoney(Number(raw || 0))
                    : column.type === "number"
                      ? formatNumber(Number(raw || 0))
                      : column.type === "percent"
                        ? formatPercent(Number(raw || 0))
                        : String(raw || "-").trim() || "-";

                return <td key={column.key}>{value}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ABC_LABEL: Record<string, string> = {
  A: "Classe A",
  B: "Classe B",
  C: "Classe C",
};

export function AbcBadge({ cls }: { cls: "A" | "B" | "C" }) {
  return <span className={`badge abc-${cls}`}>{ABC_LABEL[cls]}</span>;
}

export type CoverageStatus = "ruptura" | "baixa" | "ideal" | "excesso";

const COVERAGE_LABEL: Record<CoverageStatus, string> = {
  ruptura: "Ruptura",
  baixa: "Cobertura baixa",
  ideal: "Cobertura ideal",
  excesso: "Excesso",
};

export function CoverageBadge({ status }: { status: CoverageStatus }) {
  return <span className={`badge status-${status}`}>{COVERAGE_LABEL[status]}</span>;
}

export function classifyCoverage(
  ownStock: number,
  avgMonthlySales: number,
): CoverageStatus {
  if (avgMonthlySales <= 0) {
    return ownStock > 0 ? "excesso" : "ideal";
  }
  const months = ownStock / avgMonthlySales;
  if (ownStock <= 0) return "ruptura";
  if (months < 1) return "baixa";
  if (months <= 3) return "ideal";
  return "excesso";
}
