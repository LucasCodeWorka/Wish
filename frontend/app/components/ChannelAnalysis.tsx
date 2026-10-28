"use client";

import { useMemo, useState } from "react";
import { formatDecimal, formatDelta, formatMoney, formatNumber } from "../lib/format";

type Canal = {
  code: string;
  name: string;
  valor: number;
  atendimentos: number;
  tkm: number;
  tkmAnterior: number;
  varTkm: number | null;
  pa: number;
  paAnterior: number;
  varPa: number | null;
  estoque: number;
  melhoresProdutos: string;
};

export function ChannelAnalysis({ rows }: { rows: Canal[] }) {
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<"valor" | "atendimentos" | "estoque" | "name">("valor");

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return rows
      .filter((row) => !termo || `${row.name} ${row.code} ${row.melhoresProdutos}`.toLocaleLowerCase("pt-BR").includes(termo))
      .sort((a, b) => ordem === "name"
        ? a.name.localeCompare(b.name, "pt-BR")
        : b[ordem] - a[ordem]);
  }, [rows, busca, ordem]);

  return (
    <div className="channelAnalysis">
      <div className="channelControls">
        <label>
          Buscar canal ou produto
          <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Digite para filtrar" />
        </label>
        <label>
          Ordenar por
          <select value={ordem} onChange={(event) => setOrdem(event.target.value as typeof ordem)}>
            <option value="valor">Maior faturamento</option>
            <option value="atendimentos">Mais atendimentos</option>
            <option value="estoque">Mais peças em estoque</option>
            <option value="name">Nome do canal</option>
          </select>
        </label>
        <span>{formatNumber(visiveis.length)} de {formatNumber(rows.length)} canais</span>
      </div>

      <div className="channelGrid">
        {visiveis.map((row) => (
          <article className="channelItem" key={row.code}>
            <div className="channelItemHead">
              <div>
                <h3>{row.name}</h3>
                <small>{row.code}</small>
              </div>
              <div className="channelRevenue">
                <strong>{formatMoney(row.valor)}</strong>
                <span>Faturamento</span>
              </div>
            </div>
            <div className="channelFacts">
              <div><span>Atendimentos</span><strong>{formatNumber(row.atendimentos)}</strong></div>
              <div><span>Estoque atual</span><strong>{formatNumber(row.estoque)} peças</strong></div>
            </div>
            <div className="channelCompare">
              <div>
                <span>Ticket médio</span>
                <strong>{formatMoney(row.tkm)}</strong>
                <small>Ano anterior {formatMoney(row.tkmAnterior)} · {row.varTkm === null ? "novo" : formatDelta(row.varTkm)}</small>
              </div>
              <div>
                <span>Peças por atendimento</span>
                <strong>{formatDecimal(row.pa, 2)}</strong>
                <small>Ano anterior {formatDecimal(row.paAnterior, 2)} · {row.varPa === null ? "novo" : formatDelta(row.varPa)}</small>
              </div>
            </div>
            <p className="channelProducts"><strong>Produtos líderes:</strong> {row.melhoresProdutos}</p>
          </article>
        ))}
        {visiveis.length === 0 && <p className="channelEmpty">Nenhum canal encontrado.</p>}
      </div>
    </div>
  );
}
