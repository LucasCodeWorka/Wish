"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";

type DrillCardProps = {
  titulo: string;
  numero: string;
  numeroLegenda: string;
  /** Uma linha de leitura: o que esse bloco esta dizendo. */
  frase?: string;
  /** Visual de resumo da vitrine (rosca, barra, numeros). Vem pronto do servidor. */
  resumo: React.ReactNode;
  /** Rotulo da acao no rodape do bloco. */
  acao?: string;
  modalClassName?: string;
  /** O analitico: tabela completa, tambem renderizada no servidor e encaixada no modal. */
  children: React.ReactNode;
};

// Vitrine + analitico. O conteudo dos dois lados chega como ReactNode ja renderizado pelo
// server component — este componente so controla abrir/fechar, nao busca nada.
//
// Usa <dialog> nativo com showModal(): Esc, trava de foco e backdrop saem de graca, sem
// biblioteca e sem createPortal.
export function DrillCard({ titulo, numero, numeroLegenda, frase, resumo, acao = "Ver análise", modalClassName = "", children }: DrillCardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tituloId = useId();
  const dialogId = useId();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  return (
    <>
      <article className="panel drillCard">
        <div
          className="drillTrigger"
          role="button"
          tabIndex={0}
          aria-label={`${titulo}: ${numero}. ${acao}`}
          aria-haspopup="dialog"
          aria-controls={dialogId}
          onClick={() => setAberto(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setAberto(true);
            }
          }}
        >
          <div className="drillHead">
            <h2>{titulo}</h2>
            <Maximize2 size={15} />
          </div>
          <div className="drillNumber">{numero}<small>{numeroLegenda}</small></div>
          <div className="drillResumo">{resumo}</div>
          {frase && <p className="drillFrase">{frase}</p>}
          <span className="drillAcao">{acao}</span>
        </div>
      </article>

      <dialog
        id={dialogId}
        ref={dialogRef}
        className={`drillDialog ${modalClassName}`.trim()}
        aria-labelledby={tituloId}
        // Fecha no Esc e no clique do backdrop sem deixar o estado dessincronizado.
        onClose={() => setAberto(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setAberto(false);
        }}
      >
        <div className="drillDialogInner">
          <div className="drillDialogHead">
            <h2 id={tituloId}>{titulo}</h2>
            <button
              type="button"
              className="sidebarToggle"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
