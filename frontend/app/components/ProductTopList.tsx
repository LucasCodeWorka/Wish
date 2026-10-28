import { formatMoneyCompact, formatPercent } from "../lib/format";

type Produto = { code: string; name: string; grossSales: number; revenueShare: number };

export function ProductTopList({ rows }: { rows: Produto[] }) {
  const maior = Math.max(...rows.map((row) => row.grossSales), 0);

  return (
    <ol className="productTopList">
      {rows.map((row, index) => {
        const nome = row.name && row.name !== "-" ? row.name : row.code;
        return (
          <li className="productTopRow" key={row.code || index}>
            <span className="productTopRank">{index + 1}</span>
            <span className="productTopName" title={`${row.code} · ${nome}`}>
              <strong>{nome.toLocaleUpperCase("pt-BR")}</strong>
              <small>{row.code}</small>
            </span>
            <span className="productTopTrack" aria-hidden="true">
              <span style={{ width: `${maior ? Math.max(3, row.grossSales / maior * 100) : 0}%` }} />
            </span>
            <span className="productTopValue">
              <strong>{formatMoneyCompact(row.grossSales)}</strong>
              <small>{formatPercent(row.revenueShare)} da venda</small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
