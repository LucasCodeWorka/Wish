"use client";

import { useMemo, useState } from "react";
import { formatNumber, formatPercent } from "../lib/format";
import { AnalyticTable } from "./AnalyticTable";
import { ParetoCurve } from "./charts";

type Classe = "A" | "B" | "C";
type ProdutoAbc = {
  rank: number;
  code: string;
  name: string;
  quantity: number;
  grossSales: number;
  revenueShare: number;
  cumulativeShare: number;
  classe: Classe;
};

export function ProductAbcAnalysis({ rows, points }: { rows: ProdutoAbc[]; points: { skuShare: number; cumulativeShare: number }[] }) {
  const [filtro, setFiltro] = useState<Classe | "TODOS">("TODOS");
  const classes = useMemo(() => (["A", "B", "C"] as const).map((classe) => {
    const produtos = rows.filter((row) => row.classe === classe);
    return {
      classe,
      produtos,
      participacao: produtos.reduce((soma, row) => soma + row.revenueShare, 0),
      pecas: produtos.reduce((soma, row) => soma + Number(row.quantity || 0), 0),
      primeiro: produtos[0],
      ultimo: produtos[produtos.length - 1],
    };
  }), [rows]);
  const filtrados = filtro === "TODOS" ? rows : rows.filter((row) => row.classe === filtro);

  return (
    <section className="abcAnalysis">
      <div className="abcSectionHead">
        <div>
          <h3>Curvas A, B e C</h3>
          <p>Ranking por valor vendido, do maior para o menor. Clique em uma classe para filtrar a lista completa.</p>
        </div>
        <button type="button" className="abcShowAll" onClick={() => setFiltro("TODOS")} aria-pressed={filtro === "TODOS"}>
          Todos os produtos ({formatNumber(rows.length)})
        </button>
      </div>

      <div className="abcClassGrid">
        {classes.map((item) => (
          <button
            type="button"
            key={item.classe}
            className={`abcClassCard abcClass${item.classe}${filtro === item.classe ? " selected" : ""}`}
            onClick={() => setFiltro(item.classe)}
            aria-pressed={filtro === item.classe}
          >
            <span className="abcClassHeading">Curva {item.classe}</span>
            <strong className="abcClassShare">{formatPercent(item.participacao)} <small>da venda</small></strong>
            <span className="abcClassCount">{formatNumber(item.produtos.length)} produtos · {formatNumber(item.pecas)} peças vendidas</span>
            <span className="abcClassEdge"><b>Primeiro</b><span>{item.primeiro ? `#${item.primeiro.rank} · ${item.primeiro.code} · ${item.primeiro.name}` : "—"}</span></span>
            <span className="abcClassEdge"><b>Último</b><span>{item.ultimo ? `#${item.ultimo.rank} · ${item.ultimo.code} · ${item.ultimo.name}` : "—"}</span></span>
          </button>
        ))}
      </div>

      <h3 className="paretoTableTitle">Curva acumulada de produtos e venda</h3>
      <ParetoCurve points={points} />

      <h3 className="paretoTableTitle">{filtro === "TODOS" ? "Todos os produtos vendidos" : `Produtos da curva ${filtro}`}</h3>
      <p className="paretoExplanation">Busca por nome ou código, ordenação pelos cabeçalhos e 50 linhas por vez. Só entram produtos com venda positiva nos últimos 12 meses fechados.</p>
      <AnalyticTable
        key={filtro}
        rows={filtrados}
        initialSort="grossSales"
        filterLabel="Buscar produto"
        pageSize={50}
        columns={[
          { key: "rank", label: "#", type: "number" },
          { key: "code", label: "Código" },
          { key: "name", label: "Produto" },
          { key: "quantity", label: "Peças", type: "number" },
          { key: "grossSales", label: "Valor", type: "money" },
          { key: "revenueShare", label: "% venda", type: "percent" },
          { key: "cumulativeShare", label: "% acumulado", type: "percent" },
          { key: "classe", label: "ABC", type: "abc" },
        ]}
      />
    </section>
  );
}
