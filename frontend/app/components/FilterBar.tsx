"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import type { Periodo, PresetId } from "../lib/api";
import { formatRangeLabel } from "../lib/format";

const PRESETS: { id: PresetId; label: string; hint: string }[] = [
  { id: "12m", label: "Últimos 12 meses", hint: "Os 12 meses fechados mais recentes" },
  { id: "ano", label: "Ano corrente", hint: "De janeiro até o último mês fechado" },
  { id: "anoAnterior", label: "Ano anterior", hint: "Ano civil completo anterior" },
  { id: "completo", label: "Período completo", hint: "Desde o primeiro movimento da base" },
];

// O periodo e o preset vem prontos do server component: assim a barra nao precisa de
// useSearchParams, que exigiria Suspense, e a pagina continua renderizando no servidor.
export function FilterBar({
  periodo,
  preset,
  comparado,
}: {
  periodo: Periodo;
  preset: PresetId;
  comparado?: Periodo;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [custom, setCustom] = useState<Periodo>(periodo);

  function aplicar(proximo: PresetId, intervalo?: Periodo) {
    const params = new URLSearchParams({ preset: proximo });
    if (proximo === "custom" && intervalo) {
      params.set("de", intervalo.de);
      params.set("ate", intervalo.ate);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="filterBar">
      <div className="filterGroup">
        <CalendarRange size={15} />
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.hint}
            onClick={() => aplicar(item.id)}
            className={`filterChip${preset === item.id ? " active" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="filterGroup">
        <label className="filterDate">
          <span>De</span>
          <input
            type="date"
            value={custom.de}
            onChange={(event) => setCustom((prev) => ({ ...prev, de: event.target.value }))}
          />
        </label>
        <label className="filterDate">
          <span>Até</span>
          <input
            type="date"
            value={custom.ate}
            onChange={(event) => setCustom((prev) => ({ ...prev, ate: event.target.value }))}
          />
        </label>
        <button
          type="button"
          className={`filterChip${preset === "custom" ? " active" : ""}`}
          onClick={() => aplicar("custom", custom)}
        >
          Aplicar
        </button>
      </div>

      <p className="filterSummary">
        Exibindo <strong>{formatRangeLabel(periodo.de, periodo.ate)}</strong>
        {comparado ? (
          <> · comparado com {formatRangeLabel(comparado.de, comparado.ate)}</>
        ) : null}
      </p>
    </div>
  );
}
