"use client";

import { useMemo, useState } from "react";
import { formatDecimal, formatDelta, formatMoney, formatNumber, formatPercent } from "../lib/format";

type Valor = string | number | null;
type Linha = Record<string, Valor>;
type Coluna = {
  key: string;
  label: string;
  type?: "money" | "number" | "percent" | "decimal2" | "delta" | "abc";
  subKey?: string;
};

function apresentar(valor: Valor | undefined, tipo?: Coluna["type"]) {
  if (tipo === "abc") return <span className={`badge abc-${String(valor || "C")}`}>{String(valor || "C")}</span>;
  if (tipo === "delta") return valor === null || valor === undefined ? "novo" : formatDelta(Number(valor));
  if (tipo === "money") return formatMoney(valor);
  if (tipo === "number") return formatNumber(valor);
  if (tipo === "percent") return formatPercent(valor);
  if (tipo === "decimal2") return formatDecimal(valor, 2);
  return String(valor ?? "").trim() || "—";
}

export function AnalyticTable({
  rows,
  columns,
  initialSort,
  filterLabel,
  pageSize,
}: {
  rows: Linha[];
  columns: Coluna[];
  initialSort: string;
  filterLabel: string;
  pageSize?: number;
}) {
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState(initialSort);
  const [desc, setDesc] = useState(true);
  const [limite, setLimite] = useState(pageSize ?? Infinity);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return rows
      .filter((row) => !termo || Object.values(row).some((valor) => String(valor ?? "").toLocaleLowerCase("pt-BR").includes(termo)))
      .sort((a, b) => {
        const av = a[ordem];
        const bv = b[ordem];
        if ((av === null || av === undefined) && (bv === null || bv === undefined)) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        const comparacao = typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""), "pt-BR", { numeric: true });
        return desc ? -comparacao : comparacao;
      });
  }, [rows, busca, ordem, desc]);

  return (
    <div>
      <div className="analyticToolbar">
        <label>
          <span>{filterLabel}</span>
          <input value={busca} onChange={(event) => { setBusca(event.target.value); setLimite(pageSize ?? Infinity); }} placeholder="Buscar..." />
        </label>
        <span>{formatNumber(Math.min(visiveis.length, limite))} exibidos · {formatNumber(visiveis.length)} encontrados</span>
      </div>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} aria-sort={ordem === column.key ? (desc ? "descending" : "ascending") : "none"}>
                  <button
                    type="button"
                    className="analyticSort"
                    onClick={() => {
                      if (ordem === column.key) setDesc(!desc);
                      else {
                        setOrdem(column.key);
                        setDesc(column.type !== undefined);
                      }
                      setLimite(pageSize ?? Infinity);
                    }}
                  >
                    {column.label}{ordem === column.key ? (desc ? " ↓" : " ↑") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.slice(0, limite).map((row, index) => (
              <tr key={`${String(row.code ?? index)}-${index}`}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.subKey ? (
                      <>
                        <strong>{apresentar(row[column.key], column.type)}</strong>
                        <div className="analyticSub">{apresentar(row[column.subKey])}</div>
                      </>
                    ) : apresentar(row[column.key], column.type)}
                  </td>
                ))}
              </tr>
            ))}
            {visiveis.length === 0 && <tr><td colSpan={columns.length}>Nenhum resultado encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
      {visiveis.length > limite && (
        <button type="button" className="analyticMore" onClick={() => setLimite(limite + (pageSize || 50))}>
          Mostrar mais {formatNumber(Math.min(pageSize || 50, visiveis.length - limite))} linhas
        </button>
      )}
    </div>
  );
}
