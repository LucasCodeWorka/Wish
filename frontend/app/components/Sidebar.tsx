"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ChevronLeft, ChevronRight, Gem, LineChart, Repeat } from "lucide-react";

// "Resumo executivo" foi descontinuado: acabou duplicando quase tudo que ja existe em
// Vendas (mesmos KPIs, mesmo grafico mensal, mesma participacao por vendedora). A unica
// parte exclusiva dele (as frases de leitura do periodo) foi para o topo de Vendas. A
// rota continua em app/(dashboard)/_resumo (prefixo "_" tira do roteamento do Next sem
// apagar o codigo) caso precise voltar.
const NAV_ITEMS = [
  {
    href: "/vendas",
    label: "Vendas",
    description: "PA, ticket médio e retenção",
    icon: LineChart,
  },
  {
    href: "/estoque",
    label: "Estoque",
    description: "Cobertura e reposição",
    icon: Boxes,
  },
  {
    href: "/produtos",
    label: "Produtos",
    description: "Ranking e curva ABC",
    icon: Gem,
  },
  {
    href: "/consignacao",
    label: "Consignação",
    description: "Ciclo e consignatários",
    icon: Repeat,
  },
];

const STORAGE_KEY = "wishbi_sidebar_collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Le a preferencia salva apos montar: o servidor nao tem acesso a localStorage, entao o
  // primeiro render sempre abre expandido e so recolhe depois, se for o caso.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* localStorage indisponivel (modo privado etc.): mantem expandido */
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignora falha ao persistir */
      }
      return next;
    });
  }

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebarBrand">
        {!collapsed && (
          <div>
            <p className="eyebrow">Wish BI</p>
            <strong>Wish Fine Jewelry</strong>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          className="sidebarToggle"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <nav className="sidebarNav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebarLink${active ? " active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} />
              {!collapsed && (
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
